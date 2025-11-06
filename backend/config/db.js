const { Pool } = require('pg');
require('dotenv').config();

// Database configuration
// If PostgreSQL requires SSL, we'll accept any certificate for local development
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

  // If DB_SSL is explicitly set to false, disable SSL
  // Otherwise, use SSL but accept any certificate (for development)
  if (process.env.DB_SSL === 'false') {
    // Try connection string approach
    config.connectionString = `postgresql://${user}:${encodeURIComponent(password)}@${host}:${port}/${database}?sslmode=disable`;
    delete config.host;
    delete config.port;
    delete config.database;
    delete config.user;
    delete config.password;
  } else {
    // Use SSL but accept any certificate for local development
    // This works when PostgreSQL server requires SSL
    config.ssl = { 
      rejectUnauthorized: false 
    };
  }

  return config;
};

const pool = new Pool(getPoolConfig());

// Test connection
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Initialize database tables
const initializeDB = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        user_type VARCHAR(50) NOT NULL CHECK (user_type IN ('patient', 'researcher')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS patient_profiles (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255),
        age INTEGER,
        conditions TEXT[],
        location_city VARCHAR(255),
        location_country VARCHAR(255),
        symptoms TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS researcher_profiles (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255),
        specialties TEXT[],
        research_interests TEXT[],
        orcid_id VARCHAR(255),
        researchgate_id VARCHAR(255),
        availability_for_meetings BOOLEAN DEFAULT false,
        publications JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS clinical_trials (
        id SERIAL PRIMARY KEY,
        researcher_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        title VARCHAR(500) NOT NULL,
        description TEXT,
        condition TEXT,
        phase VARCHAR(50),
        status VARCHAR(50),
        location VARCHAR(255),
        eligibility_criteria TEXT,
        current_participants INTEGER DEFAULT 0,
        target_participants INTEGER,
        ai_summary TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS publications (
        id SERIAL PRIMARY KEY,
        title VARCHAR(500) NOT NULL,
        authors TEXT[],
        journal VARCHAR(255),
        publication_date DATE,
        doi VARCHAR(255) UNIQUE,
        abstract TEXT,
        full_text_url VARCHAR(500),
        ai_summary TEXT,
        source VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS health_experts (
        id SERIAL PRIMARY KEY,
        researcher_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        name VARCHAR(255) NOT NULL,
        specialties TEXT[],
        research_interests TEXT[],
        location VARCHAR(255),
        email VARCHAR(255),
        is_platform_member BOOLEAN DEFAULT false,
        external_source VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(researcher_id)
      );

      CREATE TABLE IF NOT EXISTS forum_categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS forum_posts (
        id SERIAL PRIMARY KEY,
        category_id INTEGER REFERENCES forum_categories(id),
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(500) NOT NULL,
        content TEXT NOT NULL,
        is_question BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS forum_replies (
        id SERIAL PRIMARY KEY,
        post_id INTEGER REFERENCES forum_posts(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS favorites (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        item_type VARCHAR(50) NOT NULL CHECK (item_type IN ('clinical_trial', 'publication', 'expert', 'collaborator')),
        item_id INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, item_type, item_id)
      );

      CREATE TABLE IF NOT EXISTS meeting_requests (
        id SERIAL PRIMARY KEY,
        patient_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        expert_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        patient_name VARCHAR(255),
        patient_contact VARCHAR(255),
        message TEXT,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS collaborator_connections (
        id SERIAL PRIMARY KEY,
        requester_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        receiver_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(requester_id, receiver_id)
      );

      CREATE TABLE IF NOT EXISTS collaborator_messages (
        id SERIAL PRIMARY KEY,
        connection_id INTEGER REFERENCES collaborator_connections(id) ON DELETE CASCADE,
        sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        receiver_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_user_type ON users(user_type);
      CREATE INDEX IF NOT EXISTS idx_patient_profiles_user_id ON patient_profiles(user_id);
      CREATE INDEX IF NOT EXISTS idx_researcher_profiles_user_id ON researcher_profiles(user_id);
      CREATE INDEX IF NOT EXISTS idx_clinical_trials_condition ON clinical_trials(condition);
      CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
      CREATE INDEX IF NOT EXISTS idx_collaborator_messages_connection ON collaborator_messages(connection_id);
      CREATE INDEX IF NOT EXISTS idx_collaborator_messages_sender_receiver ON collaborator_messages(sender_id, receiver_id);
    `);
    console.log('Database tables initialized successfully');

    // Add missing columns to clinical_trials table if they don't exist
    try {
      // Check if current_participants column exists
      const checkCurrent = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name='clinical_trials' AND column_name='current_participants'
      `);
      
      if (checkCurrent.rows.length === 0) {
        await pool.query(`
          ALTER TABLE clinical_trials 
          ADD COLUMN current_participants INTEGER DEFAULT 0
        `);
        console.log('Added current_participants column to clinical_trials table');
      }

      // Check if target_participants column exists
      const checkTarget = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name='clinical_trials' AND column_name='target_participants'
      `);
      
      if (checkTarget.rows.length === 0) {
        await pool.query(`
          ALTER TABLE clinical_trials 
          ADD COLUMN target_participants INTEGER
        `);
        console.log('Added target_participants column to clinical_trials table');
      }
    } catch (error) {
      console.error('Error adding columns to clinical_trials:', error.message);
    }

    // Add parent_reply_id to forum_replies for threaded replies if it doesn't exist
    try {
      const checkParent = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name='forum_replies' AND column_name='parent_reply_id'
      `);
      if (checkParent.rows.length === 0) {
        await pool.query(`
          ALTER TABLE forum_replies 
          ADD COLUMN parent_reply_id INTEGER REFERENCES forum_replies(id) ON DELETE CASCADE
        `);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_forum_replies_parent ON forum_replies(parent_reply_id)`);
        console.log('Added parent_reply_id column to forum_replies table');
      }
    } catch (error) {
      console.error('Error adding parent_reply_id to forum_replies:', error.message);
    }

    // Initialize default forum categories
    const defaultCategories = [
      { name: 'Cancer Research', description: 'Discussions about cancer research, treatments, and clinical trials' },
      { name: 'Clinical Trials Insights', description: 'Share experiences and insights about clinical trials' },
      { name: 'Neurology', description: 'Discussions about neurological conditions and research' },
      { name: 'Cardiology', description: 'Heart and cardiovascular health discussions' },
      { name: 'Immunology', description: 'Immune system research and treatments' },
      { name: 'General Health', description: 'General health and medical discussions' },
    ];

    for (const category of defaultCategories) {
      try {
        await pool.query(
          'INSERT INTO forum_categories (name, description) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [category.name, category.description]
        );
      } catch (error) {
        // Ignore errors if category already exists
        console.log(`Category ${category.name} already exists or error:`, error.message);
      }
    }
    console.log('Default forum categories initialized');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
};

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
  initializeDB,
};

// Initialize on load
if (require.main === module) {
  initializeDB();
}

