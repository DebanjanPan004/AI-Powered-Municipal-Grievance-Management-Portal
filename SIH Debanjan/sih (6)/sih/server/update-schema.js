import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Get directory name in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

// Create a connection pool to MySQL database
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function executeSqlFile(filePath) {
  try {
    console.log(`Executing SQL file: ${filePath}`);
    
    // Read SQL file content
    const sqlContent = fs.readFileSync(filePath, 'utf8');
    
    // Execute the entire SQL script at once with multipleStatements enabled
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      multipleStatements: true // Important for executing multiple statements
    });
    
    console.log('Executing SQL batch...');
    await connection.query(sqlContent);
    console.log('SQL batch executed successfully');
    
    await connection.end();
    console.log('SQL file execution completed successfully');
  } catch (error) {
    console.error('Error executing SQL file:', error);
    console.error('SQL Error Details:', error.sqlMessage || 'No specific SQL message');
    
    // Fallback method: try to add the column directly
    try {
      console.log('Attempting direct column addition as fallback...');
      await pool.query(`ALTER TABLE grievances ADD COLUMN category VARCHAR(100) DEFAULT 'General' AFTER description`);
      console.log('Fallback column addition successful');
    } catch (fallbackError) {
      // If error is about column already existing, that's fine
      if (fallbackError.code === 'ER_DUP_FIELDNAME') {
        console.log('Category column already exists, continuing...');
      } else {
        console.error('Fallback attempt also failed:', fallbackError.message);
      }
    }
  }
}

async function main() {
  try {
    // Execute the category column addition SQL
    await executeSqlFile(path.join(__dirname, 'add_category_column.sql'));
    console.log('Database schema updates completed');
  } catch (error) {
    console.error('Error during database schema update:', error);
  } finally {
    await pool.end();
  }
}

main().catch(console.error);