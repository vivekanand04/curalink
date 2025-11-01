const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');

// Create or update patient profile
router.post('/profile', authenticate, authorize('patient'), async (req, res) => {
  try {
    const { name, age, conditions, locationCity, locationCountry, symptoms } = req.body;
    const userId = req.user.userId;

    // Check if profile exists
    const existing = await query('SELECT id FROM patient_profiles WHERE user_id = $1', [userId]);

    let result;
    if (existing.rows.length > 0) {
      // Update existing profile
      result = await query(
        `UPDATE patient_profiles 
         SET name = $1, age = $2, conditions = $3, location_city = $4, location_country = $5, 
             symptoms = $6, updated_at = CURRENT_TIMESTAMP 
         WHERE user_id = $7 
         RETURNING *`,
        [name, age, conditions, locationCity, locationCountry, symptoms, userId]
      );
    } else {
      // Create new profile
      result = await query(
        `INSERT INTO patient_profiles (user_id, name, age, conditions, location_city, location_country, symptoms)
         VALUES ($1, $2, $3, $4, $5, $6, $7) 
         RETURNING *`,
        [userId, name, age, conditions, locationCity, locationCountry, symptoms]
      );
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get patient profile
router.get('/profile', authenticate, authorize('patient'), async (req, res) => {
  try {
    const result = await query('SELECT * FROM patient_profiles WHERE user_id = $1', [req.user.userId]);
    res.json(result.rows[0] || {});
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

