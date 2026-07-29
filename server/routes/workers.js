import express from 'express';
import { pool } from '../db.js';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    console.log('Workers API - Auth header:', authHeader);
    console.log('Workers API - Extracted token:', token);
    
    if (!token) {
      console.error('Workers API - No token provided in request');
      return res.status(401).json({ error: 'No token provided' });
    }
    
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        console.error('Workers API - Token verification failed:', err.message);
        return res.status(403).json({ error: 'Invalid or expired token' });
      }
      
      console.log('Workers API - Token verified successfully for user:', user.id);
      req.user = user;
      next();
    });
  } catch (error) {
    console.error('Workers API - Authentication middleware error:', error);
    return res.status(500).json({ error: 'Authentication error' });
  }
};

// Update worker location
router.post('/location', authenticateToken, async (req, res) => {
  try {
    const { latitude, longitude, address } = req.body;
    const workerId = req.user.id;
    
    // Verify user is a worker
    if (req.user.role !== 'municipal_worker') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Use stored procedure to update worker location
    const [result] = await pool.query(
      'CALL UpdateWorkerLocation(?, ?, ?, ?, @locationId)',
      [workerId, latitude, longitude, address]
    );
    
    // Get the location ID from the output parameter
    const [locationIdResult] = await pool.query('SELECT @locationId as locationId');
    const locationId = locationIdResult[0].locationId;
    
    res.status(201).json({
      message: 'Location updated successfully',
      locationId
    });
  } catch (error) {
    console.error('Location update error:', error);
    res.status(500).json({ error: 'Failed to update location' });
  }
});

// Get all worker locations (for admin)
router.get('/locations', authenticateToken, async (req, res) => {
  try {
    // Verify user is an admin
    if (req.user.role !== 'municipal_admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Debugging: Log the request to verify it's being called
    console.log('Admin requesting worker locations');
    
    try {
      // Get latest location for each worker with full user info
      const [workers] = await pool.query(
        `SELECT 
          u.user_id, 
          u.username, 
          u.full_name,
          u.active,
          d.department_name,
          wl.latitude, 
          wl.longitude, 
          wl.address, 
          wl.timestamp as last_location_update,
          (SELECT COUNT(*) FROM grievances g WHERE g.assigned_worker_id = u.user_id AND g.status != 'resolved') as assigned_tasks
        FROM users u
        JOIN roles r ON u.role_id = r.role_id
        JOIN departments d ON u.department_id = d.department_id
        LEFT JOIN (
          SELECT wl.*
          FROM worker_locations wl
          JOIN (
            SELECT worker_id, MAX(timestamp) as max_timestamp
            FROM worker_locations
            GROUP BY worker_id
          ) latest ON wl.worker_id = latest.worker_id AND wl.timestamp = latest.max_timestamp
        ) wl ON u.user_id = wl.worker_id
        WHERE r.role_name = 'municipal_worker'
        ORDER BY u.full_name`
      );
      
      // Debugging: Log the response to see what we got
      console.log('Worker data retrieved:', workers.length);
      
      // Ensure we always return an array, even if empty
      const workerData = workers || [];
      res.json({ workers: workerData });
    } catch (sqlError) {
      console.error('SQL Error in worker locations:', sqlError);
      throw sqlError;
    }
  } catch (error) {
    console.error('Get worker locations error:', error);
    res.status(500).json({ error: 'Failed to fetch worker locations' });
  }
});

// Get location history for a worker
router.get('/locations/:workerId', authenticateToken, async (req, res) => {
  try {
    const workerId = req.params.workerId;
    
    // Verify user is an admin or the worker themselves
    if (req.user.role !== 'municipal_admin' && req.user.id !== parseInt(workerId)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Get location history
    const [locationHistory] = await pool.query(
      `SELECT 
        wl.location_id, 
        wl.latitude, 
        wl.longitude, 
        wl.address, 
        wl.timestamp
      FROM worker_locations wl
      WHERE wl.worker_id = ?
      ORDER BY wl.timestamp DESC
      LIMIT 100`,
      [workerId]
    );
    
    res.json({ locationHistory });
  } catch (error) {
    console.error('Get location history error:', error);
    res.status(500).json({ error: 'Failed to fetch location history' });
  }
});

// Get worker's own latest location
router.get('/my-location', authenticateToken, async (req, res) => {
  try {
    const workerId = req.user.id;
    
    // Verify user is a worker
    if (req.user.role !== 'municipal_worker') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Get worker's latest location
    const [locationResult] = await pool.query(
      `SELECT 
        latitude, 
        longitude, 
        address, 
        timestamp
      FROM worker_locations
      WHERE worker_id = ?
      ORDER BY timestamp DESC
      LIMIT 1`,
      [workerId]
    );
    
    if (locationResult.length === 0) {
      return res.json({ 
        message: 'No location data found',
        lastUpdate: null
      });
    }
    
    const location = locationResult[0];
    
    res.json({
      latitude: location.latitude,
      longitude: location.longitude,
      address: location.address,
      lastUpdate: location.timestamp
    });
  } catch (error) {
    console.error('Get my location error:', error);
    res.status(500).json({ error: 'Failed to fetch your location data' });
  }
});

// Get all workers (for admin)
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Verify user is an admin
    if (req.user.role !== 'municipal_admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Get all workers
    const [workers] = await pool.query(
      `SELECT 
        u.user_id, 
        u.username, 
        u.full_name, 
        u.email,
        u.phone_number,
        d.department_id,
        d.department_name
      FROM users u
      JOIN roles r ON u.role_id = r.role_id
      JOIN departments d ON u.department_id = d.department_id
      WHERE r.role_name = 'municipal_worker'
      ORDER BY u.full_name`
    );
    
    res.json({ workers });
  } catch (error) {
    console.error('Get workers error:', error);
    res.status(500).json({ error: 'Failed to fetch workers' });
  }
});

// Get available workers for assignment, sorted by proximity (using Haversine formula)
router.get('/available', authenticateToken, async (req, res) => {
  try {
    // Verify user is an admin
    if (req.user.role !== 'municipal_admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Get grievance location if provided
    const { latitude, longitude } = req.query;
    
    // Get all available workers with their last known location
    const [workers] = await pool.query(
      `SELECT 
        u.user_id, 
        u.username, 
        u.full_name,
        u.phone_number,
        d.department_name,
        wl.latitude, 
        wl.longitude, 
        wl.address,
        (SELECT COUNT(*) FROM grievance_assignments ga 
         WHERE ga.worker_id = u.user_id AND ga.status IN ('assigned', 'working')) as current_tasks
      FROM users u
      JOIN roles r ON u.role_id = r.role_id
      JOIN departments d ON u.department_id = d.department_id
      LEFT JOIN (
        SELECT wl.*
        FROM worker_locations wl
        JOIN (
          SELECT worker_id, MAX(timestamp) as max_timestamp
          FROM worker_locations
          GROUP BY worker_id
        ) latest ON wl.worker_id = latest.worker_id AND wl.timestamp = latest.max_timestamp
      ) wl ON u.user_id = wl.worker_id
      WHERE r.role_name = 'municipal_worker'
      ORDER BY current_tasks ASC, u.full_name`
    );
    
    // Calculate distance using Haversine formula if coordinates provided
    let workersWithDistance = workers;
    
    if (latitude && longitude) {
      workersWithDistance = workers.map(worker => {
        let distance = null;
        
        if (worker.latitude && worker.longitude) {
          // Haversine formula to calculate distance
          const R = 6371; // Earth radius in km
          const dLat = (worker.latitude - parseFloat(latitude)) * Math.PI / 180;
          const dLon = (worker.longitude - parseFloat(longitude)) * Math.PI / 180;
          const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(parseFloat(latitude) * Math.PI / 180) * Math.cos(worker.latitude * Math.PI / 180) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
          distance = R * c; // Distance in km
        }
        
        return {
          ...worker,
          distance: distance !== null ? parseFloat(distance.toFixed(2)) : null,
          distance_unit: 'km'
        };
      });
      
      // Sort by distance (null values at the end)
      workersWithDistance.sort((a, b) => {
        if (a.distance === null && b.distance === null) return 0;
        if (a.distance === null) return 1;
        if (b.distance === null) return -1;
        return a.distance - b.distance;
      });
    }
    
    res.json({ workers: workersWithDistance });
  } catch (error) {
    console.error('Get available workers error:', error);
    res.status(500).json({ error: 'Failed to fetch available workers' });
  }
});

export default router;
