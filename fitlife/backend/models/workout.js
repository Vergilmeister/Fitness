// backend/routes/workout.js
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Workout = require('../models/Workout');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;

    const total = await Workout.countDocuments({ user: req.user._id });
    const workouts = await Workout.find({ user: req.user._id })
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      workouts,
      page,
      totalPages: Math.ceil(total / limit),
      total,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching workouts' });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const workouts = await Workout.find({ user: req.user._id });
    const totalCalories = workouts.reduce((sum, w) => sum + w.calories, 0);
    const totalDuration = workouts.reduce((sum, w) => sum + w.duration, 0);
    const totalSessions = workouts.length;

    // Count by type
    const byType = {};
    workouts.forEach((w) => {
      byType[w.type] = (byType[w.type] || 0) + 1;
    });

    res.json({ totalCalories, totalDuration, totalSessions, byType });
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching stats' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const workout = await Workout.findById(req.params.id);
    if (!workout) return res.status(404).json({ message: 'Workout not found' });

    if (workout.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to view this workout' });
    }

    res.json(workout);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching workout' });
  }
});

router.post(
  '/',
  [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('type').notEmpty().withMessage('Type is required'),
    body('duration').isInt({ min: 1 }).withMessage('Duration must be a positive number'),
    body('calories').isInt({ min: 0 }).withMessage('Calories must be a non-negative number'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { title, type, duration, calories, notes, date } = req.body;
      const workout = await Workout.create({
        user: req.user._id,
        title,
        type,
        duration,
        calories,
        notes,
        date: date || Date.now(),
      });
      res.status(201).json(workout);
    } catch (error) {
      res.status(500).json({ message: 'Server error creating workout' });
    }
  }
);

router.put(
  '/:id',
  [
    body('title').optional().trim().notEmpty().withMessage('Title cannot be empty'),
    body('type').optional().isIn(['Cardio', 'Strength', 'Flexibility', 'HIIT', 'Yoga', 'Sports', 'Other']).withMessage('Invalid workout type'),
    body('duration').optional().isInt({ min: 1 }).withMessage('Duration must be a positive number'),
    body('calories').optional().isInt({ min: 0 }).withMessage('Calories must be a non-negative number'),
    body('notes').optional().isLength({ max: 500 }).withMessage('Notes must be 500 characters or fewer'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
  try {
    const workout = await Workout.findById(req.params.id);
    if (!workout) return res.status(404).json({ message: 'Workout not found' });

    if (workout.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to edit this workout' });
    }

    const { title, type, duration, calories, notes, date } = req.body;
    workout.title = title || workout.title;
    workout.type = type || workout.type;
    workout.duration = duration || workout.duration;
    workout.calories = calories !== undefined ? calories : workout.calories;
    workout.notes = notes !== undefined ? notes : workout.notes;
    workout.date = date || workout.date;

    const updated = await workout.save();
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Server error updating workout' });
  }
  }
);

router.delete('/:id', async (req, res) => {
  try {
    const workout = await Workout.findById(req.params.id);
    if (!workout) return res.status(404).json({ message: 'Workout not found' });

    if (workout.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this workout' });
    }

    await workout.deleteOne();
    res.json({ message: 'Workout deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error deleting workout' });
  }
});

module.exports = router;
