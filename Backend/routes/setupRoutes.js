const express = require('express');
const router = express.Router();
const User = require('../models/user');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
};

// Setup first admin (only works if no admin exists)
router.post('/setup-admin', async (req, res) => {
  try {
    // Check if any admin exists
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Admin already exists. Use admin login instead.',
      });
    }

    const { name, email, password } = req.body;

    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email and password',
      });
    }

    // Check if user with email exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists',
      });
    }

    // Create admin user
    const admin = await User.create({
      name,
      email,
      password, // Will be hashed by pre-save hook
      role: 'admin',
      isVerified: true,
      isApproved: true,
    });

    const token = generateToken(admin._id);

    res.status(201).json({
      success: true,
      message: 'Admin account created successfully',
      token,
      user: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (error) {
    const message = process.env.NODE_ENV === 'production' ? 'Server error' : error.message;
    res.status(500).json({ success: false, message });
  }
});

// Check if admin exists (for setup page)
router.get('/check-admin', async (req, res) => {
  try {
    const adminExists = await User.findOne({ role: 'admin' });
    res.json({
      success: true,
      adminExists: !!adminExists,
    });
  } catch (error) {
    const message = process.env.NODE_ENV === 'production' ? 'Server error' : error.message;
    res.status(500).json({ success: false, message });
  }
});

module.exports = router;
