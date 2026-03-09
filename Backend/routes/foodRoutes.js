const express = require('express');
const router = express.Router();
const foodController = require('../controller/foodController');
const { verifyToken: auth } = require('../middleware/auth');
const { checkRole, checkApprovalStatus } = require('../middleware/roleAuth');

// ── Public ───────────────────────────────────────────────────────────────────
router.get('/menu', foodController.getAllMenuItems);

// ── Vendor: Menu Management ──────────────────────────────────────────────────
router.post('/menu',        auth, checkRole('vendor'), checkApprovalStatus, foodController.createMenuItem);
router.get('/vendor/menu',  auth, checkRole('vendor'), foodController.getVendorMenu);
router.put('/menu/:id',     auth, checkRole('vendor', 'admin'), foodController.updateMenuItem);
router.delete('/menu/:id',  auth, checkRole('vendor', 'admin'), foodController.deleteMenuItem);

// ── Vendor: Sales Overview ───────────────────────────────────────────────────
router.get('/vendor/orders',       auth, checkRole('vendor', 'admin'), foodController.getVendorOrders);
router.get('/vendor/sales-stats',  auth, checkRole('vendor', 'admin'), foodController.getVendorSalesStats);

// ── Kitchen: Order Management ────────────────────────────────────────────────
router.get('/kitchen/orders',       auth, checkRole('kitchen', 'admin'), foodController.getKitchenOrders);
router.put('/kitchen/orders/:id/status', auth, checkRole('kitchen', 'admin'), foodController.updateOrderStatus);

// ── User: Place & View Orders ────────────────────────────────────────────────
router.post('/orders',          auth, foodController.createOrder);
router.get('/orders',           auth, foodController.getUserOrders);
router.post('/orders/:id/rate', auth, foodController.rateOrder);

module.exports = router;
