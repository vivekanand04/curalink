require('dotenv').config();
const { Pool } = require('pg');

// Database configuration
const getPoolConfig = () => {
  const host = process.env.DB_HOST || 'localhost';
  const port = process.env.DB_PORT || 5432;
  const database = process.env.DB_NAME || 'curalink';
  const user = process.env.DB_USER || 'postgres';
  const password = process.env.DB_PASSWORD;
  
  const config = {
    host,
    port,
    database,
    user,
    password,
  };

  if (process.env.DB_SSL === 'false') {
    config.connectionString = `postgresql://${user}:${encodeURIComponent(password)}@${host}:${port}/${database}?sslmode=disable`;
    delete config.host;
    delete config.port;
    delete config.database;
    delete config.user;
    delete config.password;
  } else {
    config.ssl = { 
      rejectUnauthorized: false 
    };
  }

  return config;
};

const pool = new Pool(getPoolConfig());
const query = (text, params) => pool.query(text, params);

// Script to populate health_experts table from existing researcher_profiles
const populateHealthExperts = async () => {
  try {
    console.log('Starting to populate health_experts table...');

    // Get all researcher profiles
    const profilesResult = await query(`
      SELECT rp.*, u.email 
      FROM researcher_profiles rp
      JOIN users u ON rp.user_id = u.id
    `);

    console.log(`Found ${profilesResult.rows.length} researcher profiles`);

    let created = 0;
    let updated = 0;

    for (const profile of profilesResult.rows) {
      // Check if expert entry already exists
      const existing = await query(
        'SELECT id FROM health_experts WHERE researcher_id = $1',
        [profile.user_id]
      );

      if (existing.rows.length === 0) {
        // Create new health expert entry
        await query(
          `INSERT INTO health_experts 
           (researcher_id, name, specialties, research_interests, email, is_platform_member)
           VALUES ($1, $2, $3, $4, $5, true)
           ON CONFLICT (researcher_id) DO UPDATE
           SET name = $2, specialties = $3, research_interests = $4, email = $5, is_platform_member = true, updated_at = CURRENT_TIMESTAMP`,
          [profile.user_id, profile.name, profile.specialties, profile.research_interests, profile.email]
        );
        created++;
        console.log(`Created health_expert entry for: ${profile.name}`);
      } else {
        // Update existing entry
        await query(
          `UPDATE health_experts 
           SET name = $1, specialties = $2, research_interests = $3, email = $4, is_platform_member = true, updated_at = CURRENT_TIMESTAMP
           WHERE researcher_id = $5`,
          [profile.name, profile.specialties, profile.research_interests, profile.email, profile.user_id]
        );
        updated++;
        console.log(`Updated health_expert entry for: ${profile.name}`);
      }
    }

    console.log(`\n✅ Migration completed!`);
    console.log(`   Created: ${created} entries`);
    console.log(`   Updated: ${updated} entries`);

    // Verify the data
    const verifyResult = await query('SELECT COUNT(*) as count FROM health_experts');
    console.log(`\n   Total health_experts in database: ${verifyResult.rows[0].count}`);

    process.exit(0);
  } catch (error) {
    console.error('Error populating health_experts:', error);
    process.exit(1);
  }
};

populateHealthExperts();

