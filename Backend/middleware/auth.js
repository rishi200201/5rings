const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const TokenBlacklist = require('../models/tokenBlacklist');

/** Compute the SHA-256 hex digest of a raw JWT string */
const hashToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');

// Verify JWT token, check it has not been revoked, and protect routes
const verifyToken = async (req, res, next) => {
  try {
    let token;

    // Check HttpOnly cookie first, then Authorization header (fallback for API clients)
    if (req.cookies?.token) {
      token = req.cookies.token;
    } else if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route',
      });
    }

    try {
      // 1. Verify signature and expiry
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // 2. Check revocation blacklist (O(1) index lookup by hash)
      const revoked = await TokenBlacklist.exists({ tokenHash: hashToken(token) });
      if (revoked) {
        return res.status(401).json({
          success: false,
          message: 'Token has been revoked. Please log in again.',
        });
      }

      // 3. Check if user still exists
      const user = await User.findById(decoded.id);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User no longer exists',
        });
      }

      // 4. Check if user is verified
      if (!user.isVerified) {
        return res.status(401).json({
          success: false,
          message: 'Please verify your account first',
        });
      }

      // Attach raw token so controllers can revoke it on logout
      req.token = token;
      req.tokenDecoded = decoded;
      req.user = user;
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

module.exports = { verifyToken, hashToken };
