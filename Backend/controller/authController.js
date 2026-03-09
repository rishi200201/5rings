const User = require('../models/user');
const TokenBlacklist = require('../models/tokenBlacklist');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { sendOTPEmail, sendWelcomeEmail } = require('../utils/emailService');
const serverError = require('../utils/serverError');
const { hashToken } = require('../middleware/auth');

// Parse a duration string such as '7d', '24h', '3600s' into milliseconds.
// Falls back to 7 days if the format is unrecognised.
const parseDuration = (dur) => {
  const match = /^(\d+)([smhd])$/i.exec(dur || '7d');
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const [, n, unit] = match;
  const map = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return Number(n) * map[unit.toLowerCase()];
};

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
};

/**
 * sendTokenCookie — sets the HttpOnly JWT cookie.
 * Cookie maxAge is derived from JWT_EXPIRE so the two never drift apart.
 */
const sendTokenCookie = (res, token) => {
  const maxAge = parseDuration(process.env.JWT_EXPIRE);
  res.cookie('token', token, {
    httpOnly: true,
    maxAge,                                          // ms — auto-managed by browser
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  });
};

// Generate OTP
const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

// Register a new user
const registerUser = async (req, res) => {
  const { name, email, password, age, dob, qualification, phone, address } = req.body;

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ 
        success: false,
        message: 'User already exists with this email' 
      });
    }

    // Generate OTP
    const otp = generateOTP();
    const otpExpire = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Create new user with role-specific data
    const userData = {
      name,
      email,
      password,
      age,
      dob,
      qualification,
      otp,
      otpExpire,
      isVerified: false,
      role: 'user', // Always 'user'; admin creates other roles via the admin panel
      phone,
      address,
    };

    const user = await User.create(userData);

    // Send OTP email
    try {
      await sendOTPEmail(email, name, otp);
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      // Continue even if email fails
    }

    res.status(201).json({
      success: true,
      message: 'Registration successful! Please check your email for OTP verification.',
      userId: user._id,
      email: user.email,
    });
  } catch (err) {
    serverError(res, err);
  }
};

// Verify OTP
const verifyOTP = async (req, res) => {
  const { email, otp } = req.body;

  try {
    // Validate input
    if (!email || !otp) {
      return res.status(400).json({ 
        success: false,
        message: 'Please provide email and OTP' 
      });
    }

    // Find user with OTP
    const user = await User.findOne({ email }).select('+otp +otpExpire');

    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    // Check if already verified
    if (user.isVerified) {
      return res.status(400).json({ 
        success: false,
        message: 'Account already verified' 
      });
    }

    // Check if OTP expired
    if (user.otpExpire < Date.now()) {
      return res.status(400).json({ 
        success: false,
        message: 'OTP has expired. Please request a new one.' 
      });
    }

    // Verify OTP — use timingSafeEqual to prevent timing attacks
    const crypto = require('crypto');
    const otpMatch = user.otp.length === otp.length &&
      crypto.timingSafeEqual(Buffer.from(user.otp), Buffer.from(otp));
    if (!otpMatch) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid OTP' 
      });
    }

    // Update user as verified
    user.isVerified = true;
    user.otp = undefined;
    user.otpExpire = undefined;
    await user.save();

    // Send welcome email
    try {
      await sendWelcomeEmail(user.email, user.name);
    } catch (emailError) {
      console.error('Welcome email failed:', emailError);
    }

    // Generate token
    const token = generateToken(user._id);

    // Set HttpOnly cookie — lifetime mirrors JWT_EXPIRE, inaccessible to JS
    sendTokenCookie(res, token);

    res.status(200).json({
      success: true,
      message: 'Account verified successfully!',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isVerified: user.isVerified,
      },
    });
  } catch (err) {
    serverError(res, err);
  }
};

// Resend OTP
const resendOTP = async (req, res) => {
  const { email } = req.body;

  try {
    if (!email) {
      return res.status(400).json({ 
        success: false,
        message: 'Please provide email' 
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    if (user.isVerified) {
      return res.status(400).json({ 
        success: false,
        message: 'Account already verified' 
      });
    }

    // Generate new OTP
    const otp = generateOTP();
    const otpExpire = new Date(Date.now() + 10 * 60 * 1000);

    user.otp = otp;
    user.otpExpire = otpExpire;
    await user.save();

    // Send OTP email
    try {
      await sendOTPEmail(email, user.name, otp);
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      return res.status(500).json({ 
        success: false,
        message: 'Failed to send OTP email' 
      });
    }

    res.status(200).json({
      success: true,
      message: 'New OTP sent to your email',
    });
  } catch (err) {
    serverError(res, err);
  }
};

// Login user
const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Validate input
    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        message: 'Please provide email and password' 
      });
    }

    // Find user and include password
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid email or password' 
      });
    }

    // Check if user is verified
    if (!user.isVerified) {
      return res.status(401).json({ 
        success: false,
        message: 'Please verify your account first. Check your email for OTP.',
        requiresVerification: true,
        email: user.email,
      });
    }

    // Check password
    const isPasswordMatched = await user.comparePassword(password);

    if (!isPasswordMatched) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid email or password' 
      });
    }

    // Check if special roles need approval (except admin and regular users)
    if (!['user', 'admin'].includes(user.role) && !user.isApproved) {
      return res.status(403).json({ 
        success: false,
        message: 'Your account is pending admin approval. Please wait for approval before logging in.',
        requiresApproval: true,
      });
    }

    // Generate token
    const token = generateToken(user._id);

    // Set HttpOnly cookie — lifetime mirrors JWT_EXPIRE, inaccessible to JS
    sendTokenCookie(res, token);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        isApproved: user.isApproved,
      },
    });
  } catch (err) {
    serverError(res, err);
  }
};

// Get current logged in user
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    res.status(200).json({
      success: true,
      user,
    });
  } catch (err) {
    serverError(res, err);
  }
};

// Logout user — revokes the token server-side then clears the auth cookie
const logoutUser = async (req, res) => {
  try {
    const token = req.token; // attached by verifyToken middleware
    const decoded = req.tokenDecoded;

    if (token && decoded?.exp) {
      // Persist the token hash in the blacklist until the JWT's own expiry
      await TokenBlacklist.create({
        tokenHash: hashToken(token),
        expiresAt: new Date(decoded.exp * 1000), // decoded.exp is Unix seconds
        revokedBy: req.user._id,
      });
    }
  } catch (err) {
    // Never block logout because of a blacklist write failure
    console.error('Token blacklist write failed on logout:', err.message);
  }

  res.cookie('token', '', {
    httpOnly: true,
    expires: new Date(0),
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  });
  res.status(200).json({ success: true, message: 'Logged out successfully' });
};

// Forgot password — sends a reset OTP to the registered email
const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });

    // Always return the same message to prevent user-enumeration attacks
    if (!user) {
      return res.status(200).json({
        success: true,
        message: 'If that email is registered, a reset code has been sent.',
      });
    }

    const otp = generateOTP();
    const otpExpire = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    user.otp = otp;
    user.otpExpire = otpExpire;
    await user.save();

    try {
      const { sendPasswordResetEmail } = require('../utils/emailService');
      await sendPasswordResetEmail(email, user.name, otp);
    } catch (emailError) {
      console.error('Password reset email failed:', emailError);
      return res.status(500).json({
        success: false,
        message: 'Failed to send reset email. Please try again.',
      });
    }

    res.status(200).json({
      success: true,
      message: 'If that email is registered, a reset code has been sent.',
    });
  } catch (err) {
    serverError(res, err);
  }
};

// Reset password — verify OTP then persist new hashed password
const resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;

  try {
    const user = await User.findOne({ email }).select('+otp +otpExpire');

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset code',
      });
    }

    // Check expiry
    if (!user.otpExpire || user.otpExpire < Date.now()) {
      return res.status(400).json({
        success: false,
        message: 'Reset code has expired. Please request a new one.',
      });
    }

    // Timing-safe comparison to prevent timing attacks
    if (
      !user.otp ||
      user.otp.length !== otp.length ||
      !crypto.timingSafeEqual(Buffer.from(user.otp), Buffer.from(otp))
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid reset code',
      });
    }

    // The pre-save hook in user.js will hash the new password
    user.password = newPassword;
    user.otp = undefined;
    user.otpExpire = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password reset successfully. You can now log in with your new password.',
    });
  } catch (err) {
    serverError(res, err);
  }
};

module.exports = {
  registerUser,
  verifyOTP,
  resendOTP,
  loginUser,
  getMe,
  logoutUser,
  forgotPassword,
  resetPassword,
};
