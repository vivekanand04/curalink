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
    const existingExpert = await query('SELECT id FROM health_experts WHERE researcher_id = $1', [userId]);
    
    // Get user email for health_experts table
    const userResult = await query('SELECT email FROM users WHERE id = $1', [userId]);
    const userEmail = userResult.rows[0]?.email;

    if (existingExpert.rows.length === 0) {
      // Create new health expert entry
      await query(
        `INSERT INTO health_experts 
         (researcher_id, name, specialties, research_interests, email, is_platform_member)
         VALUES ($1, $2, $3, $4, $5, true)
         ON CONFLICT (researcher_id) DO UPDATE
         SET name = $2, specialties = $3, research_interests = $4, email = $5, is_platform_member = true, updated_at = CURRENT_TIMESTAMP`,
        [userId, name, specialties, researchInterests, userEmail]
      );
    } else {
      // Update existing health expert entry
      await query(
        `UPDATE health_experts 
         SET name = $1, specialties = $2, research_interests = $3, email = $4, is_platform_member = true, updated_at = CURRENT_TIMESTAMP
         WHERE researcher_id = $5`,
        [name, specialties, researchInterests, userEmail, userId]
      );
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
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

