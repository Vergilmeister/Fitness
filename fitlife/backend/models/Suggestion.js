// backend/models/Suggestion.js
const mongoose = require('mongoose');

const suggestionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    goal: {
      type: String,
      required: true,
    },
    age: {
      type: Number,
      required: true,
    },
    activityLevel: {
      type: String,
      required: true,
    },
    workoutPlan: {
      type: String,
      required: true,
    },
    dietPlan: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Suggestion', suggestionSchema);
