const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');

// Get user's favorites
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { type } = req.query;

    let queryText = 'SELECT * FROM favorites WHERE user_id = $1';
    const params = [userId];

    if (type) {
      queryText += ' AND item_type = $2';
      params.push(type);
    }

    queryText += ' ORDER BY created_at DESC';

    const result = await query(queryText, params);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add to favorites
router.post('/', authenticate, async (req, res) => {
  try {
    const { itemType, itemId } = req.body;
    const userId = req.user.userId;

    if (!['clinical_trial', 'publication', 'expert', 'collaborator'].includes(itemType)) {
      return res.status(400).json({ message: 'Invalid item type' });
    }

    const result = await query(
      `INSERT INTO favorites (user_id, item_type, item_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, item_type, item_id) DO NOTHING
       RETURNING *`,
      [userId, itemType, itemId]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ message: 'Item already in favorites' });
    }

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Remove from favorites
router.delete('/:itemType/:itemId', authenticate, async (req, res) => {
  try {
    const { itemType, itemId } = req.params;
    const userId = req.user.userId;

    await query(
      'DELETE FROM favorites WHERE user_id = $1 AND item_type = $2 AND item_id = $3',
      [userId, itemType, itemId]
    );

    res.json({ message: 'Removed from favorites' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

