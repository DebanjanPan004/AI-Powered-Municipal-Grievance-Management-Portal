import express from 'express';
import jwt from 'jsonwebtoken';
import { pool } from '../db.js';

const router = express.Router();

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  try {
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
  } catch (error) {
    return res.status(500).json({ error: 'Authentication error' });
  }
};

// Worker assignment status update endpoint
router.put('/assignments/:assignmentId/status', authenticateToken, async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { status } = req.body;
    const workerId = req.user.id;
    
    // Verify user is a worker
    if (req.user.role !== 'municipal_worker') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Validate status
    const validStatuses = ['assigned', 'working', 'completed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }
    
    // Begin transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    
    try {
      // Check if worker is assigned to this grievance
      const [assignmentCheck] = await connection.query(
        'SELECT * FROM grievance_assignments WHERE assignment_id = ? AND worker_id = ?',
        [assignmentId, workerId]
      );
      
      if (assignmentCheck.length === 0) {
        await connection.rollback();
        return res.status(403).json({ error: 'You are not assigned to this grievance' });
      }
      
      // Update the assignment status
      const [updateResult] = await connection.query(
        'UPDATE grievance_assignments SET status = ?, completed_at = ? WHERE assignment_id = ?',
        [status, status === 'completed' ? new Date() : null, assignmentId]
      );
      
      // Update the grievance status if assignment is completed
      if (status === 'completed') {
        await connection.query(
          'UPDATE grievances SET status = "completed" WHERE grievance_id = ?',
          [assignmentCheck[0].grievance_id]
        );
      }
      
      await connection.commit();
      
      res.json({ 
        message: 'Assignment status updated successfully',
        status
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Update assignment status error:', error);
    res.status(500).json({ error: 'Failed to update assignment status' });
  }
});

export default router;