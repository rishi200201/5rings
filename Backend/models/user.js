const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: [true, 'Please enter email'],
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: [true, 'Please enter password'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    role: {
      type: String,
      enum: ['user', 'admin', 'event_organizer', 'vendor', 'kitchen', 'coach'],
      default: 'user',
    },
    phone: {
      type: String,
    },
    age: {
      type: Number,
    },
    dob: {
      type: Date,
    },
    qualification: {
      type: String,
    },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
    },
    profileImage: {
      type: String,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isApproved: {
      type: Boolean,
      default: function() {
        return this.role === 'user' ? true : false;
      }
    },
    // Kitchen-only: assigned event/location
    assignedEvent: {
      type: require('mongoose').Schema.Types.ObjectId,
      ref: 'Event',
    },
    otp: {
      type: String,
      select: false,
    },
    otpExpire: {
      type: Date,
      select: false,
    },
    // Role-specific fields
    organizerProfile: {
      companyName: String,
      bio: String,
      eventsHosted: { type: Number, default: 0 },
      rating: { type: Number, default: 0 },
    },
    vendorProfile: {
      kitchenName: String,
      cuisine: [String],
      licenseNumber: String,
      bio: String,
      rating: { type: Number, default: 0 },
      isActive: { type: Boolean, default: true },
      totalRevenue: { type: Number, default: 0 },
      totalSold: { type: Number, default: 0 },
    },
    kitchenProfile: {
      stationName: String,
      location: String,
      specialty: [String],
      bio: String,
      isActive: { type: Boolean, default: true },
    },
    coachProfile: {
      specialization: [String],
      experience: Number,
      certifications: [String],
      bio: String,
      rating: { type: Number, default: 0 },
      hourlyRate: Number,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  });

  // Hash password before saving
  userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) {
      return next();
    }
    this.password = await bcrypt.hash(this.password, 10);
    next();
  });

  // Method to compare password
  userSchema.methods.comparePassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
  };

  const User = mongoose.model('User', userSchema);

  module.exports = User;