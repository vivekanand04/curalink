const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');

// Helper: import external experts if no joined researchers exist
async function importExternalExpertsIfNoJoined() {
  // Check if any platform-joined researcher exists
  const joined = await query(
    `SELECT 1 FROM health_experts WHERE is_platform_member = true OR researcher_id IS NOT NULL LIMIT 1`
  );
  if (joined.rows.length > 0) return 0;

  // Import from publication authors
  const insert = await query(
    `INSERT INTO health_experts (name, specialties, research_interests, location, email, is_platform_member, external_source)
     SELECT DISTINCT a.name, ARRAY[]::text[], ARRAY[]::text[], NULL, NULL, false, 'publication'
     FROM (
       SELECT unnest(authors) AS name FROM publications WHERE authors IS NOT NULL
     ) a
     WHERE a.name IS NOT NULL AND a.name <> ''
       AND NOT EXISTS (
         SELECT 1 FROM health_experts he WHERE he.name = a.name AND he.external_source = 'publication'
       )
     RETURNING id`
  );
  let inserted = insert.rowCount || 0;

  // Fallback seed if no publications available
  if (inserted === 0) {
    const seed = await query(
      `INSERT INTO health_experts (name, specialties, research_interests, location, email, is_platform_member, external_source)
       VALUES 
       ('Dr. Jane Doe', ARRAY['Oncology'], ARRAY['Lung Cancer','Immunotherapy'], 'Global', NULL, false, 'seed'),
       ('Dr. John Smith', ARRAY['Cardiology'], ARRAY['Heart Failure','Hypertension'], 'Global', NULL, false, 'seed'),
       ('Dr. Alice Example', ARRAY['Neurology'], ARRAY['Brain Tumors','Neuro-Oncology'], 'Global', NULL, false, 'seed')
       ON CONFLICT DO NOTHING
       RETURNING id`
    );
    inserted += seed.rowCount || 0;
  }
  return inserted;
}

// Get all health experts (for patients)
router.get('/', authenticate, authorize('patient'), async (req, res) => {
  try {
    // If any joined exists, return only joined; else import externals and return them
    const joined = await query(
      `SELECT 1 FROM health_experts WHERE is_platform_member = true OR researcher_id IS NOT NULL LIMIT 1`
    );

    if (joined.rows.length > 0) {
      const result = await query(
        `SELECT he.*, u.email, rp.availability_for_meetings 
         FROM health_experts he
         LEFT JOIN users u ON he.researcher_id = u.id
         LEFT JOIN researcher_profiles rp ON rp.user_id = he.researcher_id
         WHERE he.is_platform_member = true OR he.researcher_id IS NOT NULL
         ORDER BY he.is_platform_member DESC, he.researcher_id IS NOT NULL DESC, he.created_at DESC 
         LIMIT 50`
      );
      console.log(`Returning ${result.rows.length} joined experts`);
      return res.json(result.rows);
    }

    await importExternalExpertsIfNoJoined();
    const fallback = await query(
      `SELECT he.*, NULL as email, NULL as availability_for_meetings
       FROM health_experts he
       WHERE he.is_platform_member = false AND he.researcher_id IS NULL
       ORDER BY he.created_at DESC
       LIMIT 50`
    );
    console.log(`Returning ${fallback.rows.length} external fallback experts`);
    return res.json(fallback.rows);
  } catch (error) {
    console.error('Error fetching experts:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Import external experts from publications authors if not present
router.post('/import-external', authenticate, authorize('patient'), async (req, res) => {
  try {
    const inserted = await importExternalExpertsIfNoJoined();
    if (inserted === 0) {
      return res.json({ inserted: 0, skipped: 'platform_joined_present_or_none_needed' });
    }
    console.log(`Imported external experts: ${inserted}`);
    return res.json({ inserted });
  } catch (error) {
    console.error('Error importing external experts:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get personalized health experts for patient
router.get('/personalized', authenticate, authorize('patient'), async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get patient's conditions
    const profileResult = await query('SELECT conditions FROM patient_profiles WHERE user_id = $1', [userId]);
    const conditions = profileResult.rows[0]?.conditions || [];

    if (conditions.length === 0) {
      return res.json([]);
    }

    // Search for experts matching conditions
    // Use exact-in-array or ILIKE for text search (qualify columns)
    const conditionPatterns = conditions.map((_, i) => 
      `($${i * 2 + 1} = ANY(he.specialties) OR $${i * 2 + 1} = ANY(he.research_interests) OR he.specialties::text ILIKE $${i * 2 + 2} OR he.research_interests::text ILIKE $${i * 2 + 2})`
    ).join(' OR ');
    
    const params = [];
    conditions.forEach(condition => {
      params.push(condition, `%${condition}%`);
    });

    // If joined exist, restrict to joined; else allow externals and fallback to externals when no match
    const joined = await query(
      `SELECT 1 FROM health_experts WHERE is_platform_member = true OR researcher_id IS NOT NULL LIMIT 1`
    );

    if (joined.rows.length > 0) {
      const result = await query(
        `SELECT he.*, u.email, rp.availability_for_meetings 
         FROM health_experts he
         LEFT JOIN users u ON he.researcher_id = u.id
         LEFT JOIN researcher_profiles rp ON rp.user_id = he.researcher_id
         WHERE (${conditionPatterns})
           AND (he.is_platform_member = true OR he.researcher_id IS NOT NULL)
         ORDER BY he.is_platform_member DESC, he.created_at DESC 
         LIMIT 20`,
        params
      );
      return res.json(result.rows);
    }

    // No joined: try to match externals, else fallback to recent externals
    const resultExt = await query(
      `SELECT he.*, NULL as email, NULL as availability_for_meetings 
       FROM health_experts he
       WHERE (${conditionPatterns})
       ORDER BY he.created_at DESC
       LIMIT 20`,
      params
    );
    if (resultExt.rows.length > 0) return res.json(resultExt.rows);

    const fallback = await query(
      `SELECT he.*, NULL as email, NULL as availability_for_meetings 
       FROM health_experts he
       WHERE he.is_platform_member = false AND he.researcher_id IS NULL
       ORDER BY he.created_at DESC
       LIMIT 20`
    );
    return res.json(fallback.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Search health experts
router.get('/search', authenticate, authorize('patient'), async (req, res) => {
  try {
    const { query: searchQuery, specialty, location } = req.query;
    // If joined exist, search joined; else search across externals too
    const joined = await query(
      `SELECT 1 FROM health_experts WHERE is_platform_member = true OR researcher_id IS NOT NULL LIMIT 1`
    );

    let queryText = joined.rows.length > 0
      ? 'SELECT he.*, u.email, rp.availability_for_meetings FROM health_experts he LEFT JOIN users u ON he.researcher_id = u.id LEFT JOIN researcher_profiles rp ON rp.user_id = he.researcher_id WHERE 1=1'
      : 'SELECT he.*, NULL as email, NULL as availability_for_meetings FROM health_experts he WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (searchQuery) {
      queryText += ` AND (he.name ILIKE $${paramIndex} OR he.specialties::text ILIKE $${paramIndex} OR he.research_interests::text ILIKE $${paramIndex})`;
      params.push(`%${searchQuery}%`);
      paramIndex++;
    }

    if (specialty) {
      queryText += ` AND $${paramIndex} = ANY(he.specialties)`;
      params.push(specialty);
      paramIndex++;
    }

    if (location) {
      queryText += ` AND he.location ILIKE $${paramIndex}`;
      params.push(`%${location}%`);
      paramIndex++;
    }

    if (joined.rows.length > 0) {
      queryText += ' AND (he.is_platform_member = true OR he.researcher_id IS NOT NULL) ORDER BY he.is_platform_member DESC LIMIT 20';
    } else {
      queryText += ' ORDER BY he.created_at DESC LIMIT 20';
    }

    const result = await query(queryText, params);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Request meeting with expert
router.post('/:id/meeting-request', authenticate, authorize('patient'), async (req, res) => {
  try {
    const { id } = req.params;
    const { patientName, patientContact, message } = req.body;
    const patientId = req.user.userId;

    // Check if expert exists
    const expertResult = await query('SELECT researcher_id, is_platform_member, external_source FROM health_experts WHERE id = $1', [id]);
    if (expertResult.rows.length === 0) {
      return res.status(404).json({ message: 'Expert not found' });
    }

    const expert = expertResult.rows[0];
    const expertUserId = expert.researcher_id || null; // For imported experts (no researcher account), route to owner later; store null here

    // Create meeting request
    const result = await query(
      `INSERT INTO meeting_requests (patient_id, expert_id, patient_name, patient_contact, message, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [patientId, expertUserId, patientName, patientContact, message, 'pending']
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get meeting requests for the authenticated researcher
router.get('/meeting-requests', authenticate, authorize('researcher'), async (req, res) => {
  try {
    const researcherId = req.user.userId;
    const result = await query(
      `SELECT id, patient_id, expert_id, patient_name, patient_contact, message, status, created_at
       FROM meeting_requests
       WHERE expert_id = $1
       ORDER BY created_at DESC`,
      [researcherId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching meeting requests:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Follow expert (add to favorites)
router.post('/:id/follow', authenticate, authorize('patient'), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    await query(
      `INSERT INTO favorites (user_id, item_type, item_id)
       VALUES ($1, 'expert', $2)
       ON CONFLICT (user_id, item_type, item_id) DO NOTHING`,
      [userId, id]
    );

    res.json({ message: 'Expert followed successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

