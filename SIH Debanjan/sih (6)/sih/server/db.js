import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Create a connection pool to MySQL database
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true,
  // Force autocommit and proper isolation
  charset: 'utf8mb4',
  ssl: false
});

// Test database connection
const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    
    // Set connection properties
    await connection.query('SET autocommit = 1');
    await connection.query('SET SESSION transaction_isolation = "READ-COMMITTED"');
    
    console.log('Successfully connected to MySQL database');
    connection.release();
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
};

export { pool, testConnection };
