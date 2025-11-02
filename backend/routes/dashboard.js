const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');

// Get dashboard statistics
router.get('/stats', authenticate, async (req, res) => {
  try {
    // Get counts for each resource
    const expertsResult = await query(
      'SELECT COUNT(*) as count FROM health_experts WHERE is_platform_member = true'
    );
    const trialsResult = await query('SELECT COUNT(*) as count FROM clinical_trials');
    const publicationsResult = await query('SELECT COUNT(*) as count FROM publications');
    const discussionsResult = await query('SELECT COUNT(*) as count FROM forum_posts');

    res.json({
      experts: parseInt(expertsResult.rows[0].count),
      clinicalTrials: parseInt(trialsResult.rows[0].count),
      publications: parseInt(publicationsResult.rows[0].count),
      discussions: parseInt(discussionsResult.rows[0].count),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

