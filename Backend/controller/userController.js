const User = require('../models/user');
const serverError = require('../utils/serverError');

// Add a new user
const createUser = async (req, res) => {
  const { name, age, dob, qualification } = req.body;

  try {
    const newUser = new User({ name, age, dob, qualification });
    await newUser.save();
    res.status(201).json(newUser);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Fetch a single user by ID
const getUserById = async (req, res) => {
  const userId = req.params.id;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json(user);
  } catch (err) {
    serverError(res, err);
  }
};

// Fetch all users
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json(users);
  } catch (err) {
    serverError(res, err);
  }
};

module.exports = {
  createUser,
  getUserById,
  getAllUsers
};
