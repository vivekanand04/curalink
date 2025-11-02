const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');
const { generateAISummary } = require('../utils/ai');

// Get clinical trials (for patients - personalized)
router.get('/', authenticate, async (req, res) => {
  try {
    const { search, status, location } = req.query;
    let queryText = 'SELECT * FROM clinical_trials WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (search) {
      queryText += ` AND (title ILIKE $${paramIndex} OR description ILIKE $${paramIndex} OR condition ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (status) {
      queryText += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (location) {
      queryText += ` AND location ILIKE $${paramIndex}`;
      params.push(`%${location}%`);
      paramIndex++;
    }

    queryText += ' ORDER BY created_at DESC LIMIT 50';

    const result = await query(queryText, params);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get personalized clinical trials for patient
router.get('/personalized', authenticate, authorize('patient'), async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Get patient's conditions
    const profileResult = await query('SELECT conditions FROM patient_profiles WHERE user_id = $1', [userId]);
    const conditions = profileResult.rows[0]?.conditions || [];

    if (conditions.length === 0) {
      return res.json([]);
    }

    // Search for trials matching conditions
    const conditionPattern = conditions.map((_, i) => `condition ILIKE $${i + 1}`).join(' OR ');
    const params = conditions.map(c => `%${c}%`);

    const result = await query(
      `SELECT * FROM clinical_trials 
       WHERE ${conditionPattern} 
       ORDER BY created_at DESC 
       LIMIT 20`,
      params
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create clinical trial (for researchers)
router.post('/', authenticate, authorize('researcher'), async (req, res) => {
  try {
    const { title, description, condition, phase, status, location, eligibilityCriteria } = req.body;
    const researcherId = req.user.userId;

    // Generate AI summary
    const aiSummary = await generateAISummary(`${title}\n${description}`);

    const result = await query(
      `INSERT INTO clinical_trials 
       (researcher_id, title, description, condition, phase, status, location, eligibility_criteria, ai_summary)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
       RETURNING *`,
      [researcherId, title, description, condition, phase, status, location, eligibilityCriteria, aiSummary]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update clinical trial (for researchers)
router.put('/:id', authenticate, authorize('researcher'), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, condition, phase, status, location, eligibilityCriteria } = req.body;

    // Check ownership
    const checkResult = await query('SELECT researcher_id FROM clinical_trials WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: 'Clinical trial not found' });
    }

    if (checkResult.rows[0].researcher_id !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Generate updated AI summary
    const aiSummary = await generateAISummary(`${title}\n${description}`);

    const result = await query(
      `UPDATE clinical_trials 
       SET title = $1, description = $2, condition = $3, phase = $4, status = $5, 
           location = $6, eligibility_criteria = $7, ai_summary = $8, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $9 
       RETURNING *`,
      [title, description, condition, phase, status, location, eligibilityCriteria, aiSummary, id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get researcher's clinical trials (must come before /:id route)
router.get('/my-trials', authenticate, authorize('researcher'), async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM clinical_trials WHERE researcher_id = $1 ORDER BY created_at DESC',
      [req.user.userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get a single clinical trial by ID (must come after specific routes)
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('SELECT * FROM clinical_trials WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Clinical trial not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete clinical trial (for researchers)
router.delete('/:id', authenticate, authorize('researcher'), async (req, res) => {
  try {
    const { id } = req.params;

    // Check ownership
    const checkResult = await query('SELECT researcher_id FROM clinical_trials WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: 'Clinical trial not found' });
    }

    if (checkResult.rows[0].researcher_id !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await query('DELETE FROM clinical_trials WHERE id = $1', [id]);
    res.json({ message: 'Clinical trial deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

