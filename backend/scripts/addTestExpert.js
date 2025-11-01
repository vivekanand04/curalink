const { query, initializeDB } = require('../config/db');

const addTestExpert = async () => {
  try {
    // Initialize DB first
    await initializeDB();
    
    // Check if test expert already exists
    const existing = await query("SELECT id FROM health_experts WHERE name = 'Test Researcher'");
    if (existing.rows.length > 0) {
      console.log('Test expert already exists');
      return;
    }

    // Add a test expert (without researcher_id since we don't have a test researcher user)
    await query(
      `INSERT INTO health_experts 
       (name, specialties, research_interests, location, email, is_platform_member)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        'Dr. Test Researcher',
        ['Oncology', 'Cancer Research'],
        ['Immunotherapy', 'Clinical Trials'],
        'New York, USA',
        'test.researcher@example.com',
        true
      ]
    );

    console.log('Test expert added successfully');
    
    // Check count
    const countResult = await query('SELECT COUNT(*) as count FROM health_experts');
    console.log('Total experts in database:', countResult.rows[0].count);
  } catch (error) {
    console.error('Error adding test expert:', error);
  }
  process.exit(0);
};

addTestExpert();

