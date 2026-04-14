import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get directory name properly in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'grievance_portal',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

async function recreateAssignmentTable() {
  let connection;
  
  try {
    console.log('Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('Connected to database');
    
    console.log('Dropping and recreating grievance_assignments table...');
    
    // Drop the table if it exists
    await connection.query('DROP TABLE IF EXISTS grievance_assignments');
    console.log('Table dropped successfully');
    
    // Create the table with the correct schema
    await connection.query(`
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
    console.log('Table recreated successfully with admin_id column');
    
  } catch (error) {
    console.error('Error recreating table:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
}

recreateAssignmentTable().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});