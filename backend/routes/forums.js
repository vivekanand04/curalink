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

// Reply to post (only researchers) - supports threaded replies via optional parentReplyId
router.post('/posts/:postId/replies', authenticate, authorize('researcher'), async (req, res) => {
  try {
    const { postId } = req.params;
    const { content, parentReplyId } = req.body;
    const userId = req.user.userId;

    // Verify post exists
    const postResult = await query('SELECT id FROM forum_posts WHERE id = $1', [postId]);
    if (postResult.rows.length === 0) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // If replying to another reply, ensure the parent reply exists and belongs to the same post
    if (parentReplyId) {
      const parentResult = await query('SELECT id, post_id FROM forum_replies WHERE id = $1', [parentReplyId]);
      if (parentResult.rows.length === 0) {
        return res.status(400).json({ message: 'Parent reply not found' });
      }
      if (String(parentResult.rows[0].post_id) !== String(postId)) {
        return res.status(400).json({ message: 'Parent reply does not belong to this post' });
      }
    }

    const result = await query(
      'INSERT INTO forum_replies (post_id, user_id, content, parent_reply_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [postId, userId, content, parentReplyId || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all forum posts (for forums page)
router.get('/posts', authenticate, async (req, res) => {
  try {
    const result = await query(
      `SELECT fp.*, 
              fc.name as category_name,
              fc.id as category_id,
              u.user_type,
              (SELECT COUNT(*) FROM forum_replies WHERE post_id = fp.id) as reply_count,
              COALESCE(rp.name, pp.name) as author_name
       FROM forum_posts fp
       JOIN forum_categories fc ON fp.category_id = fc.id
       JOIN users u ON fp.user_id = u.id
       LEFT JOIN researcher_profiles rp ON u.id = rp.user_id AND u.user_type = 'researcher'
       LEFT JOIN patient_profiles pp ON u.id = pp.user_id AND u.user_type = 'patient'
       ORDER BY fp.created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get recent forum posts (for dashboard)
router.get('/recent-posts', authenticate, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 3;
    const result = await query(
      `SELECT fp.*, 
              fc.name as category_name,
              u.user_type,
              (SELECT COUNT(*) FROM forum_replies WHERE post_id = fp.id) as reply_count,
              COALESCE(rp.name, pp.name) as author_name
       FROM forum_posts fp
       JOIN forum_categories fc ON fp.category_id = fc.id
       JOIN users u ON fp.user_id = u.id
       LEFT JOIN researcher_profiles rp ON u.id = rp.user_id AND u.user_type = 'researcher'
       LEFT JOIN patient_profiles pp ON u.id = pp.user_id AND u.user_type = 'patient'
       ORDER BY fp.created_at DESC
       LIMIT $1`,
      [limit]
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

