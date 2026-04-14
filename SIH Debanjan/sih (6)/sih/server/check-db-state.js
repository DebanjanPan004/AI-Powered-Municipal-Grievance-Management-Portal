import { pool } from './db.js';

async function checkDatabase() {
  try {
    console.log('=== CHECKING DATABASE STATE ===');
    
    // Check current grievances
    const [grievances] = await pool.query('SELECT * FROM grievances ORDER BY created_at DESC LIMIT 5');
    console.log('Current grievances in database:');
    console.log('Count:', grievances.length);
    grievances.forEach(g => {
      console.log(`ID: ${g.grievance_id}, User: ${g.user_id}, Status: ${g.status}, Created: ${g.created_at}`);
    });
    
    // Check MySQL session variables
    const [autocommit] = await pool.query('SELECT @@autocommit as autocommit_status');
    console.log('MySQL autocommit status:', autocommit[0].autocommit_status);
    
    // Check isolation level
    const [isolation] = await pool.query('SELECT @@transaction_isolation as isolation_level');
    console.log('Transaction isolation level:', isolation[0].isolation_level);
    
    process.exit(0);
  } catch (error) {
    console.error('Database check failed:', error);
    process.exit(1);
  }
}

checkDatabase();