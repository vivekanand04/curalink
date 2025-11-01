const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');

// Get forum categories
router.get('/categories', authenticate, async (req, res) => {
  try {
    const result = await query('SELECT * FROM forum_categories ORDER BY name');
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create forum category (only for researchers)
router.post('/categories', authenticate, authorize('researcher'), async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Category name is required' });
    }

    // Check if category already exists
    const existing = await query('SELECT id FROM forum_categories WHERE LOWER(name) = LOWER($1)', [name]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ message: 'Category with this name already exists' });
    }

    const result = await query(
      'INSERT INTO forum_categories (name, description) VALUES ($1, $2) RETURNING *',
      [name, description || '']
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get posts in a category
router.get('/categories/:categoryId/posts', authenticate, async (req, res) => {
  try {
    const { categoryId } = req.params;
    const result = await query(
      `SELECT fp.*, u.user_type, 
              (SELECT COUNT(*) FROM forum_replies WHERE post_id = fp.id) as reply_count
       FROM forum_posts fp
       JOIN users u ON fp.user_id = u.id
       WHERE fp.category_id = $1
       ORDER BY fp.created_at DESC`,
      [categoryId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create post (patients can only ask questions, researchers can create discussions)
router.post('/posts', authenticate, async (req, res) => {
  try {
    const { categoryId, title, content, isQuestion } = req.body;
    const userId = req.user.userId;
    const userType = req.user.userType;

    // Patients can only create questions
    if (userType === 'patient' && !isQuestion) {
      return res.status(403).json({ message: 'Patients can only ask questions' });
    }

    const result = await query(
      'INSERT INTO forum_posts (category_id, user_id, title, content, is_question) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [categoryId, userId, title, content, isQuestion !== false]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get post with replies
router.get('/posts/:postId', authenticate, async (req, res) => {
  try {
    const { postId } = req.params;

    // Get post
    const postResult = await query(
      `SELECT fp.*, u.user_type, fc.name as category_name
       FROM forum_posts fp
       JOIN users u ON fp.user_id = u.id
       JOIN forum_categories fc ON fp.category_id = fc.id
       WHERE fp.id = $1`,
      [postId]
    );

    if (postResult.rows.length === 0) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Get replies (only researchers can reply)
    const repliesResult = await query(
      `SELECT fr.*, u.user_type, rp.name
       FROM forum_replies fr
       JOIN users u ON fr.user_id = u.id
       LEFT JOIN researcher_profiles rp ON u.id = rp.user_id
       WHERE fr.post_id = $1
       ORDER BY fr.created_at ASC`,
      [postId]
    );

    res.json({
      post: postResult.rows[0],
      replies: repliesResult.rows,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Reply to post (only researchers)
router.post('/posts/:postId/replies', authenticate, authorize('researcher'), async (req, res) => {
  try {
    const { postId } = req.params;
    const { content } = req.body;
    const userId = req.user.userId;

    // Verify post exists
    const postResult = await query('SELECT id FROM forum_posts WHERE id = $1', [postId]);
    if (postResult.rows.length === 0) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const result = await query(
      'INSERT INTO forum_replies (post_id, user_id, content) VALUES ($1, $2, $3) RETURNING *',
      [postId, userId, content]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

