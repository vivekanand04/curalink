const { query, initializeDB } = require('../config/db');

const initForumCategories = async () => {
  const categories = [
    { name: 'Cancer Research', description: 'Discussions about cancer research, treatments, and clinical trials' },
    { name: 'Clinical Trials Insights', description: 'Share experiences and insights about clinical trials' },
    { name: 'Neurology', description: 'Discussions about neurological conditions and research' },
    { name: 'Cardiology', description: 'Heart and cardiovascular health discussions' },
    { name: 'Immunology', description: 'Immune system research and treatments' },
    { name: 'General Health', description: 'General health and medical discussions' },
  ];

  for (const category of categories) {
    try {
      await query(
        'INSERT INTO forum_categories (name, description) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [category.name, category.description]
      );
    } catch (error) {
      console.error(`Error inserting category ${category.name}:`, error);
    }
  }

  console.log('Forum categories initialized');
};

const run = async () => {
  try {
    await initializeDB();
    await initForumCategories();
    console.log('Database initialization completed');
    process.exit(0);
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
};

run();

