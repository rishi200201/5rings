const Program = require('../models/program');
const Enrollment = require('../models/enrollment');
const serverError = require('../utils/serverError');

// Create program (Coach only)
exports.createProgram = async (req, res) => {
  try {
    const program = new Program({
      ...req.body,
      coach: req.user.id,
    });
    await program.save();
    res.status(201).json({ success: true, program });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Get all programs
exports.getAllPrograms = async (req, res) => {
  try {
    const { sport, level, coach, active } = req.query;
    const filter = {};
    
    if (sport) filter.sport = sport;
    if (level) filter.level = level;
    if (coach) filter.coach = coach;
    if (active === 'true') filter.isActive = true;

    const programs = await Program.find(filter)
      .populate('coach', 'name email coachProfile')
      .sort({ 'rating.average': -1 });
    
    res.json({ success: true, programs });
  } catch (error) {
    serverError(res, error);
  }
};

// Get single program
exports.getProgram = async (req, res) => {
  try {
    const program = await Program.findById(req.params.id)
      .populate('coach', 'name email coachProfile');
    
    if (!program) {
      return res.status(404).json({ success: false, message: 'Program not found' });
    }
    
    res.json({ success: true, program });
  } catch (error) {
    serverError(res, error);
  }
};

// Get coach's programs
exports.getCoachPrograms = async (req, res) => {
  try {
    const programs = await Program.find({ coach: req.user.id })
      .sort({ createdAt: -1 });
    
    res.json({ success: true, programs });
  } catch (error) {
    serverError(res, error);
  }
};

// Update program
exports.updateProgram = async (req, res) => {
  try {
    const program = await Program.findById(req.params.id);
    
    if (!program) {
      return res.status(404).json({ success: false, message: 'Program not found' });
    }
    
    if (program.coach.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    
    const ALLOWED_FIELDS = ['title', 'description', 'sport', 'level', 'duration', 'price', 'maxStudents', 'schedule', 'venue', 'images', 'features', 'isActive'];
    ALLOWED_FIELDS.forEach((key) => { if (req.body[key] !== undefined) program[key] = req.body[key]; });
    await program.save();
    
    res.json({ success: true, program });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Delete program
exports.deleteProgram = async (req, res) => {
  try {
    const program = await Program.findById(req.params.id);
    
    if (!program) {
      return res.status(404).json({ success: false, message: 'Program not found' });
    }
    
    if (program.coach.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    
    await program.deleteOne();
    res.json({ success: true, message: 'Program deleted successfully' });
  } catch (error) {
    serverError(res, error);
  }
};

// Enroll in program
exports.enrollProgram = async (req, res) => {
  try {
    const { programId, startDate } = req.body;
    
    const program = await Program.findById(programId);
    if (!program) {
      return res.status(404).json({ success: false, message: 'Program not found' });
    }
    
    if (!program.isActive) {
      return res.status(400).json({ success: false, message: 'Program is not active' });
    }
    
    if (program.enrolled >= program.maxStudents) {
      return res.status(400).json({ success: false, message: 'Program is full' });
    }
    
    // Check if already enrolled
    const existingEnrollment = await Enrollment.findOne({
      user: req.user.id,
      program: programId,
      status: { $in: ['active', 'paused'] }
    });
    
    if (existingEnrollment) {
      return res.status(400).json({ success: false, message: 'Already enrolled in this program' });
    }
    
    const enrollment = new Enrollment({
      user: req.user.id,
      program: programId,
      coach: program.coach,
      startDate,
      totalSessions: program.duration.weeks * program.duration.sessionsPerWeek,
    });
    
    await enrollment.save();
    
    // Update enrolled count
    program.enrolled += 1;
    await program.save();
    
    res.status(201).json({ success: true, enrollment });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Get user's enrollments
exports.getUserEnrollments = async (req, res) => {
  try {
    const enrollments = await Enrollment.find({ user: req.user.id })
      .populate('program', 'title sport level duration price')
      .populate('coach', 'name coachProfile')
      .sort({ enrollmentDate: -1 });
    
    res.json({ success: true, enrollments });
  } catch (error) {
    serverError(res, error);
  }
};

// Get coach's enrollments
exports.getCoachEnrollments = async (req, res) => {
  try {
    const { status, programId } = req.query;
    const filter = { coach: req.user.id };
    
    if (status) filter.status = status;
    if (programId) filter.program = programId;
    
    const enrollments = await Enrollment.find(filter)
      .populate('user', 'name email phone')
      .populate('program', 'title sport level')
      .sort({ enrollmentDate: -1 });
    
    res.json({ success: true, enrollments });
  } catch (error) {
    serverError(res, error);
  }
};

// Update enrollment progress (Coach only)
exports.updateEnrollmentProgress = async (req, res) => {
  try {
    const { attendedSessions, progress, performance } = req.body;
    const enrollment = await Enrollment.findById(req.params.id);
    
    if (!enrollment) {
      return res.status(404).json({ success: false, message: 'Enrollment not found' });
    }
    
    if (enrollment.coach.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    
    if (attendedSessions !== undefined) enrollment.attendedSessions = attendedSessions;
    if (progress) enrollment.progress = { ...enrollment.progress, ...progress };
    if (performance) enrollment.performance.push(performance);
    
    await enrollment.save();
    res.json({ success: true, enrollment });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
