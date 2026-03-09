const MenuItem = require('../models/menuItem');
const Order = require('../models/order');
const User = require('../models/user');
const { sendNewOrderToKitchen, sendOrderConfirmedToUser } = require('../utils/emailService');
const { emitNewOrder, emitOrderStatusUpdate } = require('../utils/socket');
const serverError = require('../utils/serverError');

// ─── VENDOR: Menu Management ──────────────────────────────────────────────────

// Create menu item (Vendor only)
exports.createMenuItem = async (req, res) => {
  try {
    const menuItem = new MenuItem({
      ...req.body,
      vendor: req.user.id,
    });
    await menuItem.save();
    res.status(201).json({ success: true, menuItem });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Get all menu items (public)
exports.getAllMenuItems = async (req, res) => {
  try {
    const { vendor, category, vegetarian, vegan, glutenFree } = req.query;
    const filter = { isAvailable: true };

    if (vendor) filter.vendor = vendor;
    if (category) filter.category = category;
    if (vegetarian === 'true') filter.isVegetarian = true;
    if (vegan === 'true') filter.isVegan = true;
    if (glutenFree === 'true') filter.isGlutenFree = true;

    const menuItems = await MenuItem.find(filter)
      .populate('vendor', 'name vendorProfile')
      .sort({ 'rating.average': -1 });

    res.json({ success: true, menuItems });
  } catch (error) {
    serverError(res, error);
  }
};

// Get vendor's own menu (Vendor only)
exports.getVendorMenu = async (req, res) => {
  try {
    const menuItems = await MenuItem.find({ vendor: req.user.id }).sort({ createdAt: -1 });
    res.json({ success: true, menuItems });
  } catch (error) {
    serverError(res, error);
  }
};

// Update menu item (Vendor or Admin)
exports.updateMenuItem = async (req, res) => {
  try {
    const menuItem = await MenuItem.findById(req.params.id);
    if (!menuItem) {
      return res.status(404).json({ success: false, message: 'Menu item not found' });
    }
    if (menuItem.vendor.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    const ALLOWED_FIELDS = ['name', 'description', 'category', 'price', 'nutrition', 'allergens', 'isVegetarian', 'isVegan', 'isGlutenFree', 'images', 'isAvailable', 'preparationTime'];
    ALLOWED_FIELDS.forEach((key) => { if (req.body[key] !== undefined) menuItem[key] = req.body[key]; });
    await menuItem.save();
    res.json({ success: true, menuItem });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Delete menu item (Vendor or Admin)
exports.deleteMenuItem = async (req, res) => {
  try {
    const menuItem = await MenuItem.findById(req.params.id);
    if (!menuItem) {
      return res.status(404).json({ success: false, message: 'Menu item not found' });
    }
    if (menuItem.vendor.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    await menuItem.deleteOne();
    res.json({ success: true, message: 'Menu item deleted successfully' });
  } catch (error) {
    serverError(res, error);
  }
};

// ─── USER: Order Placement ────────────────────────────────────────────────────

/**
 * User places an order.
 * Flow: placed → (kitchen) confirmed → preparing → ready → delivered
 */
exports.createOrder = async (req, res) => {
  try {
    const { eventId, vendorId, items, deliveryLocation, specialInstructions } = req.body;

    let totalAmount = 0;
    const orderItems = [];

    // Batch-fetch all menu items in a single query (avoids N+1)
    const menuItemIds = items.map((i) => i.menuItemId);
    const menuItemDocs = await MenuItem.find({ _id: { $in: menuItemIds } });
    const menuItemMap = Object.fromEntries(menuItemDocs.map((m) => [String(m._id), m]));

    for (const item of items) {
      const menuItem = menuItemMap[String(item.menuItemId)];
      if (!menuItem || !menuItem.isAvailable) {
        return res.status(400).json({
          success: false,
          message: `Menu item "${item.menuItemId}" is not available`,
        });
      }
      orderItems.push({
        menuItem: menuItem._id,
        name: menuItem.name,
        quantity: item.quantity,
        price: menuItem.price,
      });
      totalAmount += menuItem.price * item.quantity;
    }

    // Auto-assign to an active kitchen user if one exists
    const kitchenUser = await User.findOne({ role: 'kitchen', isApproved: true, isVerified: true });

    const order = new Order({
      user: req.user.id,
      event: eventId,
      vendor: vendorId,
      kitchen: kitchenUser ? kitchenUser._id : null,
      items: orderItems,
      totalAmount,
      deliveryLocation,
      specialInstructions,
      status: 'placed',
    });

    await order.save();

    // ── Notify kitchen by email ─────────────────────────────────────────────
    if (kitchenUser) {
      sendNewOrderToKitchen(kitchenUser.email, kitchenUser.name, order).catch(() => {});
    } else {
      // No specific kitchen user assigned — notify ALL active kitchen staff
      const allKitchenUsers = await User.find({ role: 'kitchen', isApproved: true, isVerified: true }).select('name email');
      allKitchenUsers.forEach((k) => {
        sendNewOrderToKitchen(k.email, k.name, order).catch(() => {});
      });
    }

    // ── Real-time: push order to kitchen dashboard instantly ───────────────
    const populatedOrder = await Order.findById(order._id)
      .populate('user', 'name email phone')
      .populate('vendor', 'name vendorProfile')
      .populate('items.menuItem', 'name price');
    emitNewOrder(populatedOrder);

    // Return the populated order so the client has the full data
    res.status(201).json({ success: true, order: populatedOrder });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Get current user's orders
exports.getUserOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id })
      .populate('event', 'title startDate')
      .populate('vendor', 'name vendorProfile')
      .populate('kitchen', 'name kitchenProfile')
      .populate('items.menuItem')
      .sort({ orderDate: -1 });
    res.json({ success: true, orders });
  } catch (error) {
    serverError(res, error);
  }
};

// ─── KITCHEN: Order Management ────────────────────────────────────────────────

/**
 * Kitchen staff see all orders assigned to them, plus unassigned placed orders.
 * Query param ?status= to filter by a specific status.
 */
exports.getKitchenOrders = async (req, res) => {
  try {
    const { status, all } = req.query;

    let filter;
    if (all === 'true') {
      filter = {}; // all orders — for delivered / cancelled history tabs
    } else if (status) {
      filter = { status };
    } else {
      // Default: show active orders (not yet delivered/cancelled)
      filter = {
        status: { $in: ['placed', 'confirmed', 'preparing', 'ready'] },
      };
    }

    const orders = await Order.find(filter)
      .populate('user', 'name email phone')
      .populate('vendor', 'name vendorProfile')
      .populate('items.menuItem', 'name price preparationTime category')
      .populate('event', 'title startDate')
      .sort({ orderDate: -1 });

    res.json({ success: true, orders });
  } catch (error) {
    serverError(res, error);
  }
};

/**
 * Kitchen updates an order's status.
 * Transitions: placed→confirmed→preparing→ready→delivered  |  any→cancelled
 *
 * On DELIVERED:
 *   • Each menuItem.soldCount += item.quantity
 *   • vendor.vendorProfile.totalRevenue += order.totalAmount
 *   • vendor.vendorProfile.totalSold   += total items
 */
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const validStatuses = ['confirmed', 'preparing', 'ready', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed: ${validStatuses.join(', ')}`,
      });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const isKitchen = req.user.role === 'kitchen';
    const isAdmin   = req.user.role === 'admin';

    if (!isKitchen && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Only kitchen staff or admin can update order status' });
    }

    // Self-assign if not yet assigned
    if (isKitchen && !order.kitchen) {
      order.kitchen = req.user.id;
    }

    // Stamp timestamps
    const now = new Date();
    if (status === 'confirmed')  order.confirmedAt = now;
    if (status === 'preparing')  order.preparedAt  = now;
    if (status === 'ready')      order.readyAt     = now;
    if (status === 'delivered')  order.deliveredAt = now;

    order.status = status;
    await order.save();

    // ── Notify user by email when kitchen confirms the order ─────────────
    if (status === 'confirmed') {
      const orderUser = await User.findById(order.user).select('name email');
      if (orderUser) {
        sendOrderConfirmedToUser(orderUser.email, orderUser.name, order).catch(() => {});
      }
    }

    // ── On DELIVERED: update sold counts & vendor revenue ──────────────────
    if (status === 'delivered') {
      let totalSoldItems = 0;

      for (const item of order.items) {
        await MenuItem.findByIdAndUpdate(item.menuItem, {
          $inc: { soldCount: item.quantity },
        });
        totalSoldItems += item.quantity;
      }

      // Update the vendor's cumulative totals
      await User.findByIdAndUpdate(order.vendor, {
        $inc: {
          'vendorProfile.totalRevenue': order.totalAmount,
          'vendorProfile.totalSold': totalSoldItems,
        },
      });
    }

    const updatedOrder = await Order.findById(order._id)
      .populate('user', 'name email phone')
      .populate('vendor', 'name vendorProfile')
      .populate('kitchen', 'name kitchenProfile')
      .populate('items.menuItem', 'name price soldCount');

    // ── Real-time: push updated status to the user who placed the order ──
    emitOrderStatusUpdate(String(order.user), updatedOrder);

    res.json({ success: true, order: updatedOrder });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// ─── VENDOR: Sales Overview ───────────────────────────────────────────────────

// Vendor sees their orders with sales stats
exports.getVendorOrders = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = { vendor: req.user.id };
    if (status) filter.status = status;

    const orders = await Order.find(filter)
      .populate('user', 'name email phone')
      .populate('kitchen', 'name kitchenProfile')
      .populate('event', 'title startDate')
      .populate('items.menuItem', 'name price soldCount')
      .sort({ orderDate: -1 });

    const deliveredOrders = orders.filter((o) => o.status === 'delivered');
    const totalRevenue    = deliveredOrders.reduce((s, o) => s + o.totalAmount, 0);
    const totalItemsSold  = deliveredOrders.reduce(
      (s, o) => s + o.items.reduce((ss, i) => ss + i.quantity, 0),
      0,
    );

    res.json({
      success: true,
      orders,
      stats: { totalOrders: orders.length, deliveredOrders: deliveredOrders.length, totalRevenue, totalItemsSold },
    });
  } catch (error) {
    serverError(res, error);
  }
};

// ─── USER: Rate a delivered order ──────────────────────────────────────────────

/**
 * POST /food/orders/:id/rate
 * User rates a delivered order (food quality + service + optional comment).
 * Also updates the average rating on each menuItem in the order.
 */
exports.rateOrder = async (req, res) => {
  try {
    const { food, service, comment } = req.body;

    if (!food || food < 1 || food > 5) {
      return res.status(400).json({ success: false, message: 'Food rating must be between 1 and 5' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    if (String(order.user) !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not your order' });
    }
    if (order.status !== 'delivered') {
      return res.status(400).json({ success: false, message: 'You can only rate delivered orders' });
    }
    if (order.rating?.food) {
      return res.status(400).json({ success: false, message: 'You have already rated this order' });
    }

    order.rating = { food, service: service || null, comment: comment || '' };
    await order.save();

    // ── Update each menuItem's rolling average rating ─────────────────────
    for (const item of order.items) {
      if (item.menuItem) {
        const mi = await MenuItem.findById(item.menuItem);
        if (mi) {
          const oldAvg   = mi.rating.average || 0;
          const oldCount = mi.rating.count   || 0;
          const newCount = oldCount + 1;
          const newAvg   = parseFloat(((oldAvg * oldCount + food) / newCount).toFixed(2));
          mi.rating = { average: newAvg, count: newCount };
          await mi.save();
        }
      }
    }

    res.json({ success: true, message: 'Thank you for your rating!', order });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Vendor sales stats per menu item
exports.getVendorSalesStats = async (req, res) => {
  try {
    const menuItems = await MenuItem.find({ vendor: req.user.id }).sort({ soldCount: -1 });
    const vendorUser = await User.findById(req.user.id).select('vendorProfile name');

    res.json({
      success: true,
      menuItems,
      revenue: {
        totalRevenue: vendorUser?.vendorProfile?.totalRevenue || 0,
        totalSold:    vendorUser?.vendorProfile?.totalSold    || 0,
      },
    });
  } catch (error) {
    serverError(res, error);
  }
};
