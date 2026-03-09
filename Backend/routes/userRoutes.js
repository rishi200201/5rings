const express = require('express');
const userController = require('../controller/userController');
const { verifyToken } = require('../middleware/auth');
const { checkRole } = require('../middleware/roleAuth');

const router = express.Router();

// All user routes are protected with authentication
router.use(verifyToken);

// Route to create a new user (admin only)
router.post('/users', checkRole('admin'), userController.createUser);

// Route to get all users (admin only)
router.get('/users', checkRole('admin'), userController.getAllUsers);

// Route to get a user by ID (admin only)
router.get('/users/:id', checkRole('admin'), userController.getUserById);

module.exports = router;
