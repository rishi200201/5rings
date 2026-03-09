const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  description: String,
  category: {
    type: String,
    enum: ['breakfast', 'lunch', 'dinner', 'snacks', 'beverages', 'dessert'],
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  nutrition: {
    calories: Number,
    protein: Number,
    carbs: Number,
    fat: Number,
    fiber: Number,
  },
  allergens: [String],
  isVegetarian: {
    type: Boolean,
    default: false,
  },
  isVegan: {
    type: Boolean,
    default: false,
  },
  isGlutenFree: {
    type: Boolean,
    default: false,
  },
  images: [String],
  isAvailable: {
    type: Boolean,
    default: true,
  },
  preparationTime: Number, // in minutes
  soldCount: {
    type: Number,
    default: 0,
  },
  rating: {
    average: { type: Number, default: 0 },
    count: { type: Number, default: 0 },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const MenuItem = mongoose.model('MenuItem', menuItemSchema);

module.exports = MenuItem;
