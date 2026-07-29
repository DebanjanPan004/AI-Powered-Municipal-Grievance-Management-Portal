import express from 'express';
import { pool } from '../db.js';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Add debugging middleware
router.use((req, res, next) => {
  console.log(`Admin route hit: ${req.method} ${req.path}`);
  next();
});

// Simple test route that doesn't require authentication
router.get('/ping', (req, res) => {
  console.log('Admin ping route hit');
  res.json({ message: 'Admin routes are working!', timestamp: new Date().toISOString() });
});

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Test endpoint to verify admin routes are working
router.get('/test', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'municipal_admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json({ 
      message: 'Admin routes working',
      user: req.user,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Admin test error:', error);
    res.status(500).json({ error: 'Test failed' });
  }
});

// Get all worker locations directly from worker_locations table
router.get('/worker-locations', authenticateToken, async (req, res) => {
  try {
    // Verify user is an admin
    if (req.user.role !== 'municipal_admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    console.log('Admin requesting all worker locations data');
    
    try {
      // Get all worker locations - only fetch columns that actually exist
      const [locations] = await pool.query(
        `SELECT 
          location_id,
          worker_id,
          latitude,
          longitude,
          address,
          timestamp
        FROM worker_locations
        ORDER BY timestamp DESC`
      );
      
      console.log(`Found ${locations.length} worker location records`);
      
      res.json({ locations });
    } catch (queryError) {
      console.error('Database query error:', queryError);
      res.status(500).json({ 
        error: 'Failed to fetch worker locations',
        details: queryError.message 
      });
    }
  } catch (error) {
    console.error('Admin worker locations error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch worker locations',
      details: error.message 
    });
  }
});

// Get all workers with their latest location (for admin dashboard)
router.get('/workers', authenticateToken, async (req, res) => {
  try {
    // Verify user is an admin
    if (req.user.role !== 'municipal_admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    console.log('Admin requesting worker data with locations');
    
    try {
      // Check the structure of the users table
      const [userColumns] = await pool.query(
        `SHOW COLUMNS FROM users`
      );
      console.log('Users table columns:', userColumns.map(col => col.Field));
      
      // Check what roles exist
      const [roles] = await pool.query(`SELECT * FROM roles`);
      console.log('Available roles:', roles);
      
      // First, get all workers
      const [workers] = await pool.query(
        `SELECT 
          u.user_id, 
          u.username, 
          u.full_name,
          d.department_name,
          COALESCE((SELECT COUNT(*) FROM grievances g WHERE g.assigned_worker_id = u.user_id AND g.status != 'resolved'), 0) as assigned_tasks
        FROM users u
        JOIN roles r ON u.role_id = r.role_id
        LEFT JOIN departments d ON u.department_id = d.department_id
        WHERE r.role_name IN ('municipal_worker', 'worker', 'field_worker')
        ORDER BY u.full_name`
      );
      
      console.log(`Found ${workers.length} workers`);
      
      // Check if worker_locations table exists
      const [tableCheck] = await pool.query(
        `SELECT COUNT(*) as count FROM information_schema.tables 
         WHERE table_schema = DATABASE() AND table_name = 'worker_locations'`
      );
      
      if (tableCheck[0].count === 0) {
        console.log('worker_locations table does not exist, returning workers without location data');
        return res.json({ workers });
      }
      
      // For each worker, get their most recent location
      const workersWithLocations = await Promise.all(
        workers.map(async (worker) => {
          try {
            const [locations] = await pool.query(
              `SELECT 
                latitude, 
                longitude, 
                address, 
                timestamp as last_location_update
              FROM worker_locations
              WHERE worker_id = ?
              ORDER BY timestamp DESC
              LIMIT 1`,
              [worker.user_id]
            );
            
            // Add location data if available
            if (locations.length > 0) {
              return { ...worker, ...locations[0] };
            }
            
            return worker;
          } catch (locationError) {
            console.error(`Error fetching location for worker ${worker.user_id}:`, locationError);
            return worker; // Return worker without location data
          }
        })
      );
      
      console.log(`Processed ${workersWithLocations.length} workers with location data`);
      
      res.json({ workers: workersWithLocations });
    } catch (queryError) {
      console.error('Database query error:', queryError);
      throw new Error(`Database query failed: ${queryError.message}`);
    }
  } catch (error) {
    console.error('Admin worker data error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch worker data',
      details: error.message 
    });
  }
});

export default router;