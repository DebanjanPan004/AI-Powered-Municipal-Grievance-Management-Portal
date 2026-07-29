import { pool } from './db.js';

async function testDB() {
  try {
    console.log('Testing database connection...');
    
    // Test basic connection
    const [rows] = await pool.query('SELECT 1 as test');
    console.log('Basic query successful:', rows);
    
    // Check if SubmitGrievance procedure exists
    const [procedures] = await pool.query("SHOW PROCEDURE STATUS WHERE Name = 'SubmitGrievance'");
    console.log('SubmitGrievance procedure exists:', procedures.length > 0);
    
    if (procedures.length === 0) {
      console.log('ERROR: SubmitGrievance stored procedure does not exist!');
    } else {
      console.log('Procedure details:', procedures[0]);
    }
    
    // Check grievances table structure
    const [tableInfo] = await pool.query('DESCRIBE grievances');
    console.log('Grievances table columns:', tableInfo.map(col => col.Field));
    
    // Check users table to verify user exists
    const [users] = await pool.query('SELECT user_id, username, role_id FROM users LIMIT 5');
    console.log('Sample users:', users);
    
    process.exit(0);
  } catch (error) {
    console.error('Database test failed:', error);
    process.exit(1);
  }
}

testDB();