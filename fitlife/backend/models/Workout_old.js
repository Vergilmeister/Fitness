// backend/models/Workout.js
const mongoose = require('mongoose');

const workoutSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Workout title is required'],
      trim: true,
      maxlength: 100,
    },
    type: {
      type: String,
      required: [true, 'Workout type is required'],
      enum: ['Cardio', 'Strength', 'Flexibility', 'HIIT', 'Yoga', 'Sports', 'Other'],
    },
    duration: {
      type: Number, // in minutes
      required: [true, 'Duration is required'],
      min: 1,
      max: 600,
    },
    calories: {
      type: Number,
      required: [true, 'Calories is required'],
      min: 0,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    date: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Workout', workoutSchema);
