const User = require('../models/user');
const Event = require('../models/event');
const MenuItem = require('../models/menuItem');
const Program = require('../models/program');
const bcrypt = require('bcryptjs');
const serverError = require('../utils/serverError');

// Create special role user (Admin only)
exports.createSpecialUser = async (req, res) => {
  try {
    const { name, email, password, role, phone, isVerified, isApproved, organizerProfile, vendorProfile, coachProfile } = req.body;

    // Only allow creating special roles
    if (!['event_organizer', 'vendor', 'kitchen', 'coach'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role. Can only create event_organizer, vendor, kitchen, or coach' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User with this email already exists' });
    }

    const userData = {
      name,
      email,
      password, // Will be hashed by pre-save hook in User model
      role,
      phone,
      isVerified: isVerified !== undefined ? isVerified : true,
      isApproved: isApproved !== undefined ? isApproved : true,
    };

    // Add role-specific profiles
    if (role === 'event_organizer' && organizerProfile) {
      userData.organizerProfile = organizerProfile;
    }
    if (role === 'vendor' && vendorProfile) {
      userData.vendorProfile = {  ...vendorProfile, totalRevenue: 0, totalSold: 0 };
    }
    if (role === 'kitchen') {
      const { kitchenProfile } = req.body;
      if (kitchenProfile) userData.kitchenProfile = kitchenProfile;
    }
    if (role === 'coach' && coachProfile) {
      userData.coachProfile = coachProfile;
    }

    const user = await User.create(userData);

    res.status(201).json({
      success: true,
      message: `${role} account created successfully`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Admin Dashboard Stats
exports.getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalEvents = await Event.countDocuments();
    const totalMenuItems = await MenuItem.countDocuments();
    const totalPrograms = await Program.countDocuments();
    
    const pendingApprovals = await User.countDocuments({ 
      isApproved: false,
      role: { $in: ['event_organizer', 'vendor', 'kitchen', 'coach'] }
    });

    const totalKitchenStaff = await User.countDocuments({ role: 'kitchen' });
    const totalVendors = await User.countDocuments({ role: 'vendor' });
    
    const stats = {
      totalUsers,
      totalEvents,
      totalMenuItems,
      totalPrograms,
      pendingApprovals,
      totalKitchenStaff,
      totalVendors,
    };
    
    res.json({ success: true, stats });
  } catch (error) {
    serverError(res, error);
  }
};

// Get all users (Admin only)
exports.getAllUsers = async (req, res) => {
  try {
    const { role, isApproved } = req.query;
    const filter = {};
    
    if (role) filter.role = role;
    if (isApproved !== undefined) filter.isApproved = isApproved === 'true';
    
    const users = await User.find(filter).select('-password');
    res.json({ success: true, users });
  } catch (error) {
    serverError(res, error);
  }
};

// Approve/Reject user (Admin only)
exports.updateUserApproval = async (req, res) => {
  try {
    const { userId, isApproved } = req.body;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    user.isApproved = isApproved;
    await user.save();
    
    res.json({ success: true, message: `User ${isApproved ? 'approved' : 'rejected'} successfully`, user });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Delete user (Admin only)
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    await user.deleteOne();
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    serverError(res, error);
  }
};

// Toggle event featured status (Admin only)
exports.toggleEventFeatured = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }
    
    event.featuredEvent = !event.featuredEvent;
    await event.save();
    
    res.json({ success: true, event });
  } catch (error) {
    serverError(res, error);
  }
};
