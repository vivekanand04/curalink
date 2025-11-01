const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');

// Create or update researcher profile
router.post('/profile', authenticate, authorize('researcher'), async (req, res) => {
  try {
    const {
      name,
      specialties,
      researchInterests,
      orcidId,
      researchgateId,
      availabilityForMeetings,
      publications,
    } = req.body;
    const userId = req.user.userId;

    // Check if profile exists
    const existing = await query('SELECT id FROM researcher_profiles WHERE user_id = $1', [userId]);

    let result;
    if (existing.rows.length > 0) {
      // Update existing profile
      result = await query(
        `UPDATE researcher_profiles 
         SET name = $1, specialties = $2, research_interests = $3, orcid_id = $4, 
             researchgate_id = $5, availability_for_meetings = $6, publications = $7, 
             updated_at = CURRENT_TIMESTAMP 
         WHERE user_id = $8 
         RETURNING *`,
        [name, specialties, researchInterests, orcidId, researchgateId, availabilityForMeetings, JSON.stringify(publications || []), userId]
      );
    } else {
      // Create new profile
      result = await query(
        `INSERT INTO researcher_profiles 
         (user_id, name, specialties, research_interests, orcid_id, researchgate_id, availability_for_meetings, publications)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
         RETURNING *`,
        [userId, name, specialties, researchInterests, orcidId, researchgateId, availabilityForMeetings, JSON.stringify(publications || [])]
      );
    }

    // Automatically add researcher to health_experts table when they complete profile
    // This makes them visible to patients as health experts
    try {
      const existingExpert = await query('SELECT id FROM health_experts WHERE researcher_id = $1', [userId]);
      
      // Get user email for health_experts table
      const userResult = await query('SELECT email FROM users WHERE id = $1', [userId]);
      const userEmail = userResult.rows[0]?.email || '';

      // Ensure arrays are properly formatted
      const specialtiesArray = Array.isArray(specialties) ? specialties : (specialties ? [specialties] : []);
      const interestsArray = Array.isArray(researchInterests) ? researchInterests : (researchInterests ? [researchInterests] : []);

      if (existingExpert.rows.length === 0) {
        // Create new health expert entry
        await query(
          `INSERT INTO health_experts 
           (researcher_id, name, specialties, research_interests, email, is_platform_member)
           VALUES ($1, $2, $3, $4, $5, true)`,
          [userId, name, specialtiesArray, interestsArray, userEmail]
        );
      } else {
        // Update existing health expert entry
        await query(
          `UPDATE health_experts 
           SET name = $1, specialties = $2, research_interests = $3, email = $4, is_platform_member = true, updated_at = CURRENT_TIMESTAMP
           WHERE researcher_id = $5`,
          [name, specialtiesArray, interestsArray, userEmail, userId]
        );
      }
    } catch (expertError) {
      console.error('Error updating health_experts:', expertError);
      // Don't fail the entire request if health_experts update fails
      // Log the error but continue
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error in researcher profile creation:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      userId: req.user?.userId
    });
    res.status(500).json({ 
      message: 'Server error', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
});

// Get researcher profile
router.get('/profile', authenticate, authorize('researcher'), async (req, res) => {
  try {
    const result = await query('SELECT * FROM researcher_profiles WHERE user_id = $1', [req.user.userId]);
    res.json(result.rows[0] || {});
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

