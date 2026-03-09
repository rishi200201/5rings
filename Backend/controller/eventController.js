const Event = require('../models/event');
const Venue = require('../models/venue');
const Ticket = require('../models/ticket');
const crypto = require('crypto');
const serverError = require('../utils/serverError');

// Create Event (Event Organizer only)
exports.createEvent = async (req, res) => {
  try {
    // Check if venue exists, if not create a default one
    let venueId = req.body.venue;
    
    // If no venue or default, create/find default venue
    if (!venueId || venueId === 'default' || venueId === '') {
      // Check if default venue exists
      let defaultVenue = await Venue.findOne({ name: 'Main Stadium' });
      
      if (!defaultVenue) {
        console.log('Creating default venue...');
        // Create default venue
        defaultVenue = await Venue.create({
          name: 'Main Stadium',
          address: {
            street: '123 Sports Ave',
            city: 'Sports City',
            state: 'SC',
            zipCode: '12345',
            country: 'USA',
          },
          capacity: 1000,
          facilities: ['Parking', 'Restrooms', 'Food Court'],
          createdBy: req.user.id,
        });
        console.log('Default venue created:', defaultVenue._id);
      } else {
        console.log('Using existing default venue:', defaultVenue._id);
      }
      venueId = defaultVenue._id;
    }
    
    // Create event with valid venue ObjectId
    const eventData = {
      title: req.body.title,
      description: req.body.description,
      sport: req.body.sport,
      eventType: req.body.eventType,
      startDate: req.body.startDate,
      endDate: req.body.endDate,
      ticketCategories: req.body.ticketCategories,
      status: req.body.status || 'draft',
      venue: venueId,
      organizer: req.user.id,
    };
    
    const event = new Event(eventData);
    await event.save();
    res.status(201).json({ success: true, event });
  } catch (error) {
    console.error('Event creation error:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};

// Get all events
exports.getAllEvents = async (req, res) => {
  try {
    const { sport, eventType, status, featured } = req.query;
    const filter = {};
    
    if (sport) filter.sport = sport;
    if (eventType) filter.eventType = eventType;
    if (status) filter.status = status;
    if (featured === 'true') filter.featuredEvent = true;

    const events = await Event.find(filter)
      .populate('organizer', 'name email organizerProfile')
      .populate('venue')
      .sort({ startDate: 1 });
    
    res.json({ success: true, events });
  } catch (error) {
    serverError(res, error);
  }
};

// Get single event
exports.getEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('organizer', 'name email organizerProfile')
      .populate('venue')
      .populate('coaches', 'name coachProfile');
    
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }
    
    res.json({ success: true, event });
  } catch (error) {
    serverError(res, error);
  }
};

// Update event
exports.updateEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }
    
    // Check if user is the organizer or admin
    if (event.organizer.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to update this event' });
    }
    
    const ALLOWED_FIELDS = ['title', 'description', 'sport', 'eventType', 'startDate', 'endDate', 'status', 'ticketCategories', 'enabledVendors', 'coaches', 'images'];
    ALLOWED_FIELDS.forEach((key) => { if (req.body[key] !== undefined) event[key] = req.body[key]; });
    await event.save();
    
    res.json({ success: true, event });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Delete event
exports.deleteEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }
    
    if (event.organizer.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this event' });
    }
    
    await event.deleteOne();
    res.json({ success: true, message: 'Event deleted successfully' });
  } catch (error) {
    serverError(res, error);
  }
};

// Book ticket
exports.bookTicket = async (req, res) => {
  try {
    const { eventId, category, seatNumber, mealCombo } = req.body;
    
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }
    
    const ticketCategory = event.ticketCategories.find(tc => tc.name === category);
    if (!ticketCategory) {
      return res.status(400).json({ success: false, message: 'Invalid ticket category' });
    }
    
    if (ticketCategory.available <= ticketCategory.sold) {
      return res.status(400).json({ success: false, message: 'Tickets sold out for this category' });
    }
    
    // Generate QR code
    const qrCode = crypto.randomBytes(32).toString('hex');
    
    const ticket = new Ticket({
      event: eventId,
      user: req.user.id,
      category,
      seatNumber,
      price: ticketCategory.price,
      qrCode,
      mealCombo,
    });
    
    await ticket.save();
    
    // Update sold count
    ticketCategory.sold += 1;
    event.totalRevenue += ticketCategory.price;
    await event.save();
    
    res.status(201).json({ success: true, ticket });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Get user's tickets
exports.getUserTickets = async (req, res) => {
  try {
    const tickets = await Ticket.find({ user: req.user.id })
      .populate('event', 'title sport startDate endDate venue')
      .sort({ bookingDate: -1 });
    
    res.json({ success: true, tickets });
  } catch (error) {
    serverError(res, error);
  }
};

// Get organizer's events
exports.getOrganizerEvents = async (req, res) => {
  try {
    const events = await Event.find({ organizer: req.user.id })
      .populate('venue')
      .sort({ createdAt: -1 });
    
    res.json({ success: true, events });
  } catch (error) {
    serverError(res, error);
  }
};
