const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');
const { generateAISummary } = require('../utils/ai');
const { fetchPubMedPublications, fetchClinicalTrialsGov } = require('../utils/externalApis');

// Get personalized publications for patient
router.get('/personalized', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userType = req.user.userType || req.user.user_type;

    if (userType === 'patient') {
      // Get patient's conditions
      const profileResult = await query('SELECT conditions FROM patient_profiles WHERE user_id = $1', [userId]);
      const conditions = profileResult.rows[0]?.conditions || [];

      if (conditions.length === 0) {
        return res.json([]);
      }

      // Search for publications matching conditions
      // Build pattern with correct parameter indices
      const conditionsPattern = conditions.map((_, i) => 
        `(title ILIKE $${i * 2 + 1} OR abstract ILIKE $${i * 2 + 2})`
      ).join(' OR ');
      
      const params = [];
      conditions.forEach(condition => {
        params.push(`%${condition}%`, `%${condition}%`);
      });

      const result = await query(
        `SELECT * FROM publications 
         WHERE ${conditionsPattern}
         ORDER BY publication_date DESC 
         LIMIT 20`,
        params
      );

      res.json(result.rows);
    } else {
      // For researchers, return all publications
      const result = await query('SELECT * FROM publications ORDER BY publication_date DESC LIMIT 50');
      res.json(result.rows);
    }
  } catch (error) {
    console.error('Error in personalized publications:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Search publications
router.get('/search', authenticate, async (req, res) => {
  try {
    const { query: searchQuery } = req.query;

    if (!searchQuery) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    // Search in database first
    const dbResult = await query(
      `SELECT * FROM publications 
       WHERE title ILIKE $1 OR abstract ILIKE $1 
       ORDER BY publication_date DESC 
       LIMIT 20`,
      [`%${searchQuery}%`]
    );

    // Also fetch from external APIs
    try {
      const pubmedResults = await fetchPubMedPublications(searchQuery);
      
      // Store new publications in database
      for (const pub of pubmedResults.slice(0, 10)) {
        const existing = await query('SELECT id FROM publications WHERE doi = $1', [pub.doi || '']);
        if (existing.rows.length === 0) {
          const aiSummary = await generateAISummary(pub.abstract || pub.title);
          await query(
            `INSERT INTO publications (title, authors, journal, publication_date, doi, abstract, full_text_url, ai_summary, source)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
              pub.title,
              pub.authors || [],
              pub.journal,
              pub.publicationDate,
              pub.doi,
              pub.abstract,
              pub.url,
              aiSummary,
              'pubmed',
            ]
          );
        }
      }
    } catch (apiError) {
      console.error('Error fetching from external APIs:', apiError);
    }

    // Return combined results
    const finalResult = await query(
      `SELECT * FROM publications 
       WHERE title ILIKE $1 OR abstract ILIKE $1 
       ORDER BY publication_date DESC 
       LIMIT 20`,
      [`%${searchQuery}%`]
    );

    res.json(finalResult.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all publications
router.get('/', authenticate, async (req, res) => {
  try {
    const result = await query('SELECT * FROM publications ORDER BY publication_date DESC LIMIT 50');
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create publication (for researchers)
router.post('/', authenticate, authorize('researcher'), async (req, res) => {
  try {
    const {
      title,
      authors,
      journal,
      publicationDate,
      doi,
      abstract,
      fullTextUrl,
    } = req.body;

    if (!title) {
      return res.status(400).json({ message: 'Title is required' });
    }

    // Generate AI summary (handle errors gracefully)
    let aiSummary = null;
    try {
      aiSummary = await generateAISummary(abstract || title);
    } catch (aiError) {
      console.error('Error generating AI summary:', aiError);
      // Continue without AI summary - it's not critical
      aiSummary = null;
    }

    const result = await query(
      `INSERT INTO publications 
       (title, authors, journal, publication_date, doi, abstract, full_text_url, ai_summary, source)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
       RETURNING *`,
      [
        title,
        authors || [],
        journal || null,
        publicationDate || null,
        doi || null,
        abstract || null,
        fullTextUrl || null,
        aiSummary,
        'manual',
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update publication (for researchers)
router.put('/:id', authenticate, authorize('researcher'), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      authors,
      journal,
      publicationDate,
      doi,
      abstract,
      fullTextUrl,
    } = req.body;

    if (!title) {
      return res.status(400).json({ message: 'Title is required' });
    }

    // Generate updated AI summary (handle errors gracefully)
    let aiSummary = null;
    try {
      aiSummary = await generateAISummary(abstract || title);
    } catch (aiError) {
      console.error('Error generating AI summary:', aiError);
      // Try to keep existing AI summary if update fails
      const existingPub = await query('SELECT ai_summary FROM publications WHERE id = $1', [id]);
      aiSummary = existingPub.rows[0]?.ai_summary || null;
    }

    const result = await query(
      `UPDATE publications 
       SET title = $1, authors = $2, journal = $3, publication_date = $4, 
           doi = $5, abstract = $6, full_text_url = $7, ai_summary = $8
       WHERE id = $9 
       RETURNING *`,
      [
        title,
        authors || [],
        journal || null,
        publicationDate || null,
        doi || null,
        abstract || null,
        fullTextUrl || null,
        aiSummary,
        id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Publication not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating publication:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

// Delete publication (for researchers)
router.delete('/:id', authenticate, authorize('researcher'), async (req, res) => {
  try {
    const { id } = req.params;

    const checkResult = await query('SELECT id FROM publications WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: 'Publication not found' });
    }

    await query('DELETE FROM publications WHERE id = $1', [id]);
    res.json({ message: 'Publication deleted successfully' });
  } catch (error) {
    console.error('Error deleting publication:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

module.exports = router;

