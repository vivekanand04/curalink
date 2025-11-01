const { query, initializeDB } = require('../config/db');

const checkAndFixExperts = async () => {
  try {
    await initializeDB();
    
    console.log('\n=== Checking Researchers ===');
    // Get all researchers
    const researchers = await query(`
      SELECT rp.*, u.email, u.id as user_id 
      FROM researcher_profiles rp 
      JOIN users u ON rp.user_id = u.id
    `);
    
    console.log(`Found ${researchers.rows.length} researchers:`);
    researchers.rows.forEach(r => {
      console.log(`- ${r.name} (User ID: ${r.user_id}, Email: ${r.email})`);
    });
    
    console.log('\n=== Checking Health Experts ===');
    // Get all experts
    const experts = await query(`
      SELECT he.*, u.email 
      FROM health_experts he 
      LEFT JOIN users u ON he.researcher_id = u.id
    `);
    
    console.log(`Found ${experts.rows.length} experts:`);
    experts.rows.forEach(e => {
      console.log(`- ${e.name} (ID: ${e.id}, Researcher ID: ${e.researcher_id || 'NULL'})`);
    });
    
    console.log('\n=== Fixing Missing Experts ===');
    // Add missing researchers to health_experts
    for (const researcher of researchers.rows) {
      const existing = await query('SELECT id FROM health_experts WHERE researcher_id = $1', [researcher.user_id]);
      
      if (existing.rows.length === 0) {
        console.log(`Adding ${researcher.name} to health_experts...`);
        await query(
          `INSERT INTO health_experts 
           (researcher_id, name, specialties, research_interests, email, is_platform_member)
           VALUES ($1, $2, $3, $4, $5, true)`,
          [
            researcher.user_id,
            researcher.name,
            researcher.specialties || [],
            researcher.research_interests || [],
            researcher.email,
          ]
        );
        console.log(`✓ Added ${researcher.name}`);
      } else {
        // Update existing entry
        console.log(`Updating ${researcher.name} in health_experts...`);
        await query(
          `UPDATE health_experts 
           SET name = $1, specialties = $2, research_interests = $3, email = $4, is_platform_member = true, updated_at = CURRENT_TIMESTAMP
           WHERE researcher_id = $5`,
          [
            researcher.name,
            researcher.specialties || [],
            researcher.research_interests || [],
            researcher.email,
            researcher.user_id,
          ]
        );
        console.log(`✓ Updated ${researcher.name}`);
      }
    }
    
    // Remove test expert if it exists (optional)
    const testExpert = await query("SELECT id FROM health_experts WHERE name = 'Dr. Test Researcher'");
    if (testExpert.rows.length > 0) {
      console.log('\n=== Removing Test Expert ===');
      await query("DELETE FROM health_experts WHERE name = 'Dr. Test Researcher'");
      console.log('✓ Removed test expert');
    }
    
    console.log('\n=== Final Expert Count ===');
    const finalCount = await query('SELECT COUNT(*) as count FROM health_experts');
    console.log(`Total experts: ${finalCount.rows[0].count}`);
    
    const finalExperts = await query(`
      SELECT he.*, u.email 
      FROM health_experts he 
      LEFT JOIN users u ON he.researcher_id = u.id
      ORDER BY he.is_platform_member DESC, he.created_at DESC
    `);
    console.log('\nFinal experts list:');
    finalExperts.rows.forEach(e => {
      console.log(`- ${e.name} (Specialties: ${(e.specialties || []).join(', ')})`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
  process.exit(0);
};

checkAndFixExperts();

