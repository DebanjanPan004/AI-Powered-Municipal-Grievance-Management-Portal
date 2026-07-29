import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'grievance_portal',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function createAssignmentTable() {
  try {
    console.log('Creating grievance_assignments table...');
    
    // Check if table exists
    const [tables] = await pool.query(
      "SHOW TABLES LIKE 'grievance_assignments'"
    );
    
    if (tables.length > 0) {
      console.log('Table grievance_assignments already exists');
    } else {
      // Create the table
      await pool.query(`
        CREATE TABLE grievance_assignments (
          assignment_id INT AUTO_INCREMENT PRIMARY KEY,
          grievance_id INT NOT NULL,
          worker_id INT NOT NULL,
          admin_id INT NOT NULL,
          assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          status ENUM('assigned', 'working', 'completed') DEFAULT 'assigned',
          completed_at TIMESTAMP NULL,
          notes TEXT,
          INDEX idx_grievance_id (grievance_id),
          INDEX idx_worker_id (worker_id),
          INDEX idx_status (status)
        )
      `);
      console.log('Table grievance_assignments created successfully');
    }
    
    // Update grievances table status column
    console.log('Updating grievances table status column...');
    await pool.query(`
      ALTER TABLE grievances 
      MODIFY COLUMN status ENUM('pending', 'assigned', 'completed', 'rejected') DEFAULT 'pending'
    `);
    console.log('Grievances table updated successfully');
    
    console.log('Database setup completed!');
    
  } catch (error) {
    console.error('Database setup error:', error);
    if (error.code === 'ER_DUP_FIELDNAME' || error.message.includes('Duplicate column name')) {
      console.log('Column already exists, continuing...');
    } else {
      throw error;
    }
  } finally {
    await pool.end();
  }
}

createAssignmentTable().catch(console.error);