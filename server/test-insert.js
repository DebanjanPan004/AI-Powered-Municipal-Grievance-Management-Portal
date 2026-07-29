import { pool } from './db.js';

async function testDirectInsert() {
  try {
    console.log('Testing direct insert into grievances table...');
    
    // Test direct insert
    const [insertResult] = await pool.query(
      'INSERT INTO grievances (user_id, image_path, latitude, longitude, address, description, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())',
      [1, 'test-image.jpg', 12.345, 67.890, 'Test Address', 'Test Description', 'pending']
    );
    
    console.log('Insert result:', insertResult);
    console.log('Inserted ID:', insertResult.insertId);
    
    // Check if data was actually inserted
    const [rows] = await pool.query('SELECT * FROM grievances WHERE grievance_id = ?', [insertResult.insertId]);
    console.log('Retrieved data:', rows);
    
    // Clean up test data
    await pool.query('DELETE FROM grievances WHERE grievance_id = ?', [insertResult.insertId]);
    console.log('Test data cleaned up');
    
    process.exit(0);
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

testDirectInsert();