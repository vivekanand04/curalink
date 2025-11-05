const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');

// Search collaborators
router.get('/search', authenticate, authorize('researcher'), async (req, res) => {
  try {
    const { query: searchQuery, specialty, researchInterest } = req.query;
    let queryText = `
      SELECT rp.*, u.email, u.id as user_id
      FROM researcher_profiles rp
      JOIN users u ON rp.user_id = u.id
      WHERE u.id != $1 AND u.user_type = 'researcher'
    `;
    const params = [req.user.userId];
    let paramIndex = 2;

    if (searchQuery) {
      queryText += ` AND (rp.name ILIKE $${paramIndex} OR rp.specialties::text ILIKE $${paramIndex} OR rp.research_interests::text ILIKE $${paramIndex})`;
      params.push(`%${searchQuery}%`);
      paramIndex++;
    }

    if (specialty) {
      queryText += ` AND $${paramIndex} = ANY(rp.specialties)`;
      params.push(specialty);
      paramIndex++;
    }

    if (researchInterest) {
      queryText += ` AND $${paramIndex} = ANY(rp.research_interests)`;
      params.push(researchInterest);
      paramIndex++;
    }

    queryText += ' ORDER BY rp.created_at DESC LIMIT 20';

    const result = await query(queryText, params);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Send connection request
router.post('/:id/connect', authenticate, authorize('researcher'), async (req, res) => {
  try {
    const { id } = req.params;
    const requesterId = req.user.userId;
    const receiverId = parseInt(id);

    if (requesterId === receiverId) {
      return res.status(400).json({ message: 'Cannot connect to yourself' });
    }

    // Check if connection already exists
    const existing = await query(
      'SELECT * FROM collaborator_connections WHERE (requester_id = $1 AND receiver_id = $2) OR (requester_id = $2 AND receiver_id = $1)',
      [requesterId, receiverId]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ message: 'Connection already exists' });
    }

    const result = await query(
      'INSERT INTO collaborator_connections (requester_id, receiver_id, status) VALUES ($1, $2, $3) RETURNING *',
      [requesterId, receiverId, 'pending']
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Disconnect (remove connection in any state)
router.delete('/:id/connect', authenticate, authorize('researcher'), async (req, res) => {
  try {
    const { id } = req.params;
    const me = req.user.userId;
    const other = parseInt(id);

    if (me === other) {
      return res.status(400).json({ message: 'Invalid operation' });
    }

    await query(
      `DELETE FROM collaborator_connections 
       WHERE (requester_id = $1 AND receiver_id = $2) 
          OR (requester_id = $2 AND receiver_id = $1)`,
      [me, other]
    );

    return res.json({ message: 'Disconnected successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get connection requests
router.get('/connections', authenticate, authorize('researcher'), async (req, res) => {
  try {
    const result = await query(
      `SELECT cc.*, rp.name, rp.specialties, rp.research_interests
       FROM collaborator_connections cc
       JOIN researcher_profiles rp ON (
         CASE 
           WHEN cc.requester_id = $1 THEN cc.receiver_id = rp.user_id
           ELSE cc.requester_id = rp.user_id
         END
       )
       WHERE (cc.requester_id = $1 OR cc.receiver_id = $1)
       ORDER BY cc.created_at DESC`,
      [req.user.userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Accept/Reject connection request
router.put('/connections/:id', authenticate, authorize('researcher'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    // Verify ownership
    const checkResult = await query(
      'SELECT * FROM collaborator_connections WHERE id = $1 AND receiver_id = $2',
      [id, req.user.userId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: 'Connection request not found' });
    }

    const result = await query(
      'UPDATE collaborator_connections SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Send message to connected collaborator
router.post('/messages', authenticate, authorize('researcher'), async (req, res) => {
  try {
    const { receiverId, message } = req.body;
    const senderId = req.user.userId;

    if (!receiverId || !message) {
      return res.status(400).json({ message: 'Receiver ID and message are required' });
    }

    // Verify connection exists and is accepted
    const connectionCheck = await query(
      `SELECT id FROM collaborator_connections 
       WHERE status = 'accepted' 
       AND ((requester_id = $1 AND receiver_id = $2) OR (requester_id = $2 AND receiver_id = $1))`,
      [senderId, receiverId]
    );

    if (connectionCheck.rows.length === 0) {
      return res.status(403).json({ message: 'Connection not found or not accepted' });
    }

    const connectionId = connectionCheck.rows[0].id;

    const result = await query(
      `INSERT INTO collaborator_messages (connection_id, sender_id, receiver_id, message)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [connectionId, senderId, receiverId, message]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get messages between two collaborators
router.get('/messages/:collaboratorId', authenticate, authorize('researcher'), async (req, res) => {
  try {
    const { collaboratorId } = req.params;
    const userId = req.user.userId;

    // Verify connection
    const connectionCheck = await query(
      `SELECT id FROM collaborator_connections 
       WHERE status = 'accepted' 
       AND ((requester_id = $1 AND receiver_id = $2) OR (requester_id = $2 AND receiver_id = $1))`,
      [userId, collaboratorId]
    );

    if (connectionCheck.rows.length === 0) {
      return res.status(403).json({ message: 'Connection not found or not accepted' });
    }

    const connectionId = connectionCheck.rows[0].id;

    // Get messages
    const messagesResult = await query(
      `SELECT cm.*, rp.name as sender_name
       FROM collaborator_messages cm
       JOIN researcher_profiles rp ON cm.sender_id = rp.user_id
       WHERE cm.connection_id = $1
       ORDER BY cm.created_at ASC`,
      [connectionId]
    );

    // Mark messages as read for receiver
    await query(
      'UPDATE collaborator_messages SET is_read = true WHERE connection_id = $1 AND receiver_id = $2',
      [connectionId, userId]
    );

    res.json(messagesResult.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get list of conversations
router.get('/conversations', authenticate, authorize('researcher'), async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await query(
      `SELECT DISTINCT ON (
         CASE WHEN cc.requester_id = $1 THEN cc.receiver_id ELSE cc.requester_id END
       )
         CASE WHEN cc.requester_id = $1 THEN cc.receiver_id ELSE cc.requester_id END as collaborator_id,
         rp.name as collaborator_name,
         rp.specialties,
         rp.research_interests,
         (SELECT message FROM collaborator_messages 
          WHERE connection_id = cc.id 
          ORDER BY created_at DESC LIMIT 1) as last_message,
         (SELECT created_at FROM collaborator_messages 
          WHERE connection_id = cc.id 
          ORDER BY created_at DESC LIMIT 1) as last_message_time,
         COALESCE((
           SELECT COUNT(*)::INTEGER FROM collaborator_messages 
           WHERE connection_id = cc.id AND receiver_id = $1 AND is_read = false
         ), 0) as unread_count
       FROM collaborator_connections cc
       JOIN researcher_profiles rp ON (
         (cc.requester_id = $1 AND cc.receiver_id = rp.user_id) OR
         (cc.receiver_id = $1 AND cc.requester_id = rp.user_id)
       )
       WHERE cc.status = 'accepted' AND (cc.requester_id = $1 OR cc.receiver_id = $1)
       ORDER BY CASE WHEN cc.requester_id = $1 THEN cc.receiver_id ELSE cc.requester_id END, 
                (SELECT created_at FROM collaborator_messages 
                 WHERE connection_id = cc.id 
                 ORDER BY created_at DESC LIMIT 1) DESC NULLS LAST`,
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

