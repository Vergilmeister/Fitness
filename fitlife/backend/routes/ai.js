// backend/routes/ai.js
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Suggestion = require('../models/Suggestion');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

// Helper: generate AI-like suggestions without OpenAI (fallback)
// Replace this with real OpenAI call if API key is available
const generateSuggestion = (goal, age, activityLevel) => {
  const plans = {
    lose_weight: {
      workout: `🏃 Weight Loss Plan (Age ${age}, ${activityLevel} activity):
• Mon: 45-min brisk walk + 15-min core circuit
• Tue: 30-min HIIT (20s on / 10s off – burpees, jump squats, mountain climbers)
• Wed: Active rest – 20-min yoga or stretching
• Thu: 40-min cycling + bodyweight squats (3×15)
• Fri: 30-min run + 20-min strength circuit
• Sat: 60-min recreational sport (basketball, swimming)
• Sun: Full rest or light walk`,
      diet: `🥗 Diet Plan:
• Breakfast: Oats with berries, Greek yogurt (400 kcal)
• Snack: Apple + 10 almonds (150 kcal)
• Lunch: Grilled chicken breast, quinoa, steamed broccoli (500 kcal)
• Snack: Cucumber slices + hummus (100 kcal)
• Dinner: Baked salmon, sweet potato, green salad (450 kcal)
• Daily target: ~1600 kcal | Drink 2.5–3L water`,
    },
    build_muscle: {
      workout: `💪 Muscle Building Plan (Age ${age}, ${activityLevel} activity):
• Mon: Chest + Triceps – Bench press 4×8, Dips 3×10, Cable flies 3×12
• Tue: Back + Biceps – Pull-ups 4×8, Barbell rows 4×8, Curls 3×12
• Wed: Rest or light cardio (20 min)
• Thu: Legs – Squats 4×8, Leg press 3×12, Lunges 3×10, Calf raises 4×15
• Fri: Shoulders + Core – OHP 4×8, Lateral raises 3×12, Planks 3×60s
• Sat: Full body compound session
• Sun: Rest + stretch`,
      diet: `🥩 Diet Plan:
• Breakfast: 4 whole eggs + 2 toast + banana (600 kcal)
• Snack: Protein shake + oats (300 kcal)
• Lunch: 200g chicken, brown rice, mixed vegetables (650 kcal)
• Snack: Cottage cheese + fruit (200 kcal)
• Dinner: Lean beef / tuna, pasta, broccoli (700 kcal)
• Pre-bed: Casein protein or milk (200 kcal)
• Daily target: ~2650 kcal | Protein: 1.8–2.2g/kg body weight`,
    },
    improve_endurance: {
      workout: `🏅 Endurance Plan (Age ${age}, ${activityLevel} activity):
• Mon: Easy 30-min run at 60-70% max HR
• Tue: Cycling 45 min + bodyweight circuit
• Wed: Swim 30 min or cross-train
• Thu: Tempo run 25 min (80% max HR)
• Fri: Rest or yoga
• Sat: Long slow run 60-90 min
• Sun: Active recovery – walk or light stretch`,
      diet: `🍌 Diet Plan:
• Breakfast: Overnight oats, banana, nut butter (500 kcal)
• Snack: Energy bar or dates (150 kcal)
• Lunch: Whole-grain pasta, grilled chicken, tomato sauce (600 kcal)
• Snack: Greek yogurt + granola (200 kcal)
• Dinner: Brown rice, baked fish, stir-fried veggies (550 kcal)
• Daily target: ~2000 kcal | Focus on complex carbs for fuel`,
    },
    stay_healthy: {
      workout: `🌿 Wellness Plan (Age ${age}, ${activityLevel} activity):
• Mon: 30-min walk + 10-min stretching
• Tue: 20-min yoga or Pilates
• Wed: 30-min recreational activity of your choice
• Thu: Bodyweight exercises – 3×10 squats, push-ups, rows
• Fri: 30-min walk or bike ride
• Sat: Outdoor activity (hiking, sports)
• Sun: Full rest + meditation`,
      diet: `🥦 Diet Plan:
• Breakfast: Whole grain toast, avocado, poached eggs (450 kcal)
• Snack: Mixed nuts + fruit (180 kcal)
• Lunch: Large mixed salad, lean protein, olive oil dressing (500 kcal)
• Snack: Herbal tea + small dark chocolate (100 kcal)
• Dinner: Grilled fish/chicken, roasted vegetables, quinoa (500 kcal)
• Daily target: ~1730 kcal | Minimize processed foods`,
    },
  };

  return plans[goal] || plans['stay_healthy'];
};

// @route   POST /api/ai/suggest
// @desc    Generate AI workout + diet suggestion
// @access  Private
router.post(
  '/suggest',
  [
    body('goal').notEmpty().withMessage('Goal is required'),
    body('age').isInt({ min: 10, max: 100 }).withMessage('Age must be between 10 and 100'),
    body('activityLevel').notEmpty().withMessage('Activity level is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { goal, age, activityLevel } = req.body;

    try {
      let workoutPlan, dietPlan;

      // Try OpenAI if key is available
      if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here') {
        try {
          const OpenAI = require('openai');
          const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

          const prompt = `Create a detailed weekly workout plan and daily diet plan for:
- Goal: ${goal.replace('_', ' ')}
- Age: ${age}
- Activity Level: ${activityLevel}

Format response as JSON: { "workoutPlan": "...", "dietPlan": "..." }`;

          const completion = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 800,
          });

          const parsed = JSON.parse(completion.choices[0].message.content);
          workoutPlan = parsed.workoutPlan;
          dietPlan = parsed.dietPlan;
        } catch (openaiError) {
          // Fallback to local suggestions
          const fallback = generateSuggestion(goal, age, activityLevel);
          workoutPlan = fallback.workout;
          dietPlan = fallback.diet;
        }
      } else {
        // Use built-in suggestions
        const fallback = generateSuggestion(goal, age, activityLevel);
        workoutPlan = fallback.workout;
        dietPlan = fallback.diet;
      }

      // Save suggestion to DB
      const suggestion = await Suggestion.create({
        user: req.user._id,
        goal,
        age,
        activityLevel,
        workoutPlan,
        dietPlan,
      });

      res.json(suggestion);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error generating suggestion' });
    }
  }
);

// @route   GET /api/ai/history
// @desc    Get user's suggestion history
// @access  Private
router.get('/history', async (req, res) => {
  try {
    const suggestions = await Suggestion.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(10);
    res.json(suggestions);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching history' });
  }
});

module.exports = router;
