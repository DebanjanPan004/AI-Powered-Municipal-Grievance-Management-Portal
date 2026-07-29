import express from 'express';
import { pool } from '../db.js';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    
    // Check if user is an admin
    if (user.role !== 'municipal_admin') {
      return res.status(403).json({ error: 'Access denied: Admin privileges required' });
    }
    
    req.user = user;
    next();
  });
};

// Get analytics data with filters
router.get('/analytics', authenticateToken, async (req, res) => {
  try {
    const { timeRange = 'month', metric = 'count' } = req.query;
    
    // Validate time range
    if (!['week', 'month', 'year'].includes(timeRange)) {
      return res.status(400).json({ error: 'Invalid time range' });
    }
    
    // Validate metric
    if (!['count', 'avgTime', 'category'].includes(metric)) {
      return res.status(400).json({ error: 'Invalid metric' });
    }
    
    // Initialize connection
    const connection = await pool.getConnection();
    
    try {
      // Get time range filter SQL based on selected range
      const timeRangeFilter = getTimeRangeFilterSQL(timeRange);
      
      // Get summary statistics
      const summaryStats = await getSummaryStats(connection, timeRangeFilter);
      
      // Get category data
      const categoryData = await getCategoryData(connection, timeRangeFilter);
      
      // Get resolution time data
      const resolutionTimeData = await getResolutionTimeData(connection, timeRangeFilter);
      
      // Get trends data
      const trendsData = await getTrendsData(connection, timeRange);
      
      // Get worker performance data
      const workerPerformanceData = await getWorkerPerformanceData(connection, timeRangeFilter);
      
      // Release connection
      connection.release();
      
      // Send the combined data
      res.json({
        summaryStats,
        categoryData,
        resolutionTimeData,
        trendsData,
        workerPerformanceData
      });
      
    } catch (err) {
      // Release connection in case of error
      connection.release();
      throw err;
    }
    
  } catch (err) {
    console.error('Error fetching analytics data:', err);
    res.status(500).json({ 
      error: 'Failed to fetch analytics data', 
      details: err.message
    });
  }
});

// Helper function to get time range filter SQL
const getTimeRangeFilterSQL = (timeRange) => {
  let timeFilter = '';
  
  switch (timeRange) {
    case 'week':
      timeFilter = 'AND created_at >= DATE_SUB(NOW(), INTERVAL 1 WEEK)';
      break;
    case 'month':
      timeFilter = 'AND created_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH)';
      break;
    case 'year':
      timeFilter = 'AND created_at >= DATE_SUB(NOW(), INTERVAL 1 YEAR)';
      break;
    default:
      timeFilter = 'AND created_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH)';
  }
  
  return timeFilter;
};

// Get summary statistics
const getSummaryStats = async (connection, timeRangeFilter) => {
  // Query for total and status counts
  const [totalCountRows] = await connection.query(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
      SUM(CASE WHEN status != 'completed' THEN 1 ELSE 0 END) as pending
    FROM grievances
    WHERE 1=1 ${timeRangeFilter}
  `);
  
  // Query for average resolution time
  const [avgTimeRows] = await connection.query(`
    SELECT 
      AVG(TIMESTAMPDIFF(DAY, g.created_at, ga.completed_at)) as avg_days
    FROM grievances g
    JOIN grievance_assignments ga ON g.grievance_id = ga.grievance_id
    WHERE g.status = 'completed'
    AND ga.status = 'completed'
    AND ga.completed_at IS NOT NULL
    ${timeRangeFilter}
  `);
  
  const total = totalCountRows[0].total || 0;
  const resolved = totalCountRows[0].completed || 0;
  const pending = totalCountRows[0].pending || 0;
  const avgTime = avgTimeRows[0].avg_days || 0;
  const completionRate = total > 0 ? ((resolved / total) * 100).toFixed(1) : 0;
  
  return {
    totalGrievances: total,
    resolvedGrievances: resolved,
    pendingGrievances: pending,
    avgResolutionTime: parseFloat(avgTime).toFixed(1),
    completionRate: parseFloat(completionRate)
  };
};

// Get category data for pie chart
const getCategoryData = async (connection, timeRangeFilter) => {
  const [rows] = await connection.query(`
    SELECT 
      category,
      COUNT(*) as count
    FROM grievances
    WHERE 1=1 ${timeRangeFilter}
    GROUP BY category
    ORDER BY count DESC
  `);
  
  // Format data for chart
  const labels = rows.map(row => row.category || 'Uncategorized');
  const values = rows.map(row => row.count);
  
  return { labels, values };
};

// Get resolution time data by category
const getResolutionTimeData = async (connection, timeRangeFilter) => {
  const [rows] = await connection.query(`
    SELECT 
      g.category,
      AVG(TIMESTAMPDIFF(DAY, g.created_at, ga.completed_at)) as avg_days
    FROM grievances g
    JOIN grievance_assignments ga ON g.grievance_id = ga.grievance_id
    WHERE g.status = 'completed'
    AND ga.status = 'completed'
    AND ga.completed_at IS NOT NULL
    ${timeRangeFilter}
    GROUP BY g.category
    ORDER BY avg_days DESC
  `);
  
  // Format data for chart
  const labels = rows.map(row => row.category || 'Uncategorized');
  const values = rows.map(row => parseFloat(row.avg_days).toFixed(1));
  
  return { labels, values };
};

// Get trends data over time
const getTrendsData = async (connection, timeRange) => {
  let groupFormat = '';
  let limitClause = '';
  
  // Determine date format and limit based on time range
  switch (timeRange) {
    case 'week':
      groupFormat = '%Y-%m-%d'; // Daily
      limitClause = 'LIMIT 7';
      break;
    case 'month':
      groupFormat = '%Y-%m-%d'; // Daily
      limitClause = 'LIMIT 30';
      break;
    case 'year':
      groupFormat = '%Y-%m'; // Monthly
      limitClause = 'LIMIT 12';
      break;
    default:
      groupFormat = '%Y-%m-%d';
      limitClause = 'LIMIT 30';
  }
  
  // Query for new grievances
  const [newGrievancesRows] = await connection.query(`
    SELECT 
      DATE_FORMAT(created_at, '${groupFormat}') as date_group,
      COUNT(*) as count
    FROM grievances
    GROUP BY date_group
    ORDER BY date_group DESC
    ${limitClause}
  `);
  
  // Query for resolved grievances
  const [resolvedGrievancesRows] = await connection.query(`
    SELECT 
      DATE_FORMAT(ga.completed_at, '${groupFormat}') as date_group,
      COUNT(*) as count
    FROM grievance_assignments ga
    WHERE ga.status = 'completed'
    AND ga.completed_at IS NOT NULL
    GROUP BY date_group
    ORDER BY date_group DESC
    ${limitClause}
  `);
  
  // Format data for chart
  const newData = newGrievancesRows.reverse();
  const resolvedData = resolvedGrievancesRows.reverse();
  
  // Create a complete list of dates
  const allDates = [...new Set([
    ...newData.map(row => row.date_group),
    ...resolvedData.map(row => row.date_group)
  ])].sort();
  
  // Format labels based on time range
  const labels = allDates.map(date => {
    if (timeRange === 'year') {
      // Format as Month Year
      const [year, month] = date.split('-');
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${monthNames[parseInt(month) - 1]} ${year}`;
    } else {
      // Just return the date for daily views
      return date;
    }
  });
  
  // Map values ensuring all dates have entries
  const newValues = allDates.map(date => {
    const found = newData.find(row => row.date_group === date);
    return found ? found.count : 0;
  });
  
  const resolvedValues = allDates.map(date => {
    const found = resolvedData.find(row => row.date_group === date);
    return found ? found.count : 0;
  });
  
  return { labels, newValues, resolvedValues };
};

// Get worker performance data
const getWorkerPerformanceData = async (connection, timeRangeFilter) => {
  // Get top performers
  const [topPerformersRows] = await connection.query(`
    SELECT 
      u.user_id,
      u.full_name,
      COUNT(ga.grievance_id) as total_assigned,
      SUM(CASE WHEN ga.status = 'completed' THEN 1 ELSE 0 END) as completed,
      AVG(CASE WHEN ga.status = 'completed' AND ga.completed_at IS NOT NULL THEN TIMESTAMPDIFF(DAY, ga.assigned_at, ga.completed_at) ELSE NULL END) as avg_days,
      AVG(CASE WHEN g.status = 'completed' THEN 1 ELSE 0 END) * 100 as completion_rate
    FROM users u
    JOIN grievance_assignments ga ON u.user_id = ga.worker_id
    JOIN grievances g ON ga.grievance_id = g.grievance_id
    WHERE u.role_id = 3 ${timeRangeFilter.replace('created_at', 'g.created_at')} # role_id 3 = municipal_worker
    GROUP BY u.user_id, u.full_name
    HAVING total_assigned > 5
    ORDER BY completion_rate DESC, avg_days ASC
    LIMIT 10
  `);
  
  // Calculate metrics for the top performers
  const topPerformers = topPerformersRows.slice(0, 5);
  const averagePerformers = topPerformersRows.slice(5);
  
  // Normalize metrics to 0-100 scale for radar chart
  const calculateRadarMetrics = (workers) => {
    if (workers.length === 0) return [0, 0, 0, 0, 0];
    
    // Calculate averages
    const avgCompletionRate = workers.reduce((sum, w) => sum + (w.completion_rate || 0), 0) / workers.length;
    const avgResolutionSpeed = 100 - Math.min(workers.reduce((sum, w) => sum + (w.avg_days || 0), 0) / workers.length * 10, 100);
    const avgSatisfaction = 80; // Placeholder (would come from rating system)
    const avgTaskVolume = Math.min(workers.reduce((sum, w) => sum + (w.total_assigned || 0), 0) / workers.length, 100);
    const avgCoverage = 75; // Placeholder (would come from geographic analysis)
    
    return [
      parseFloat(avgCompletionRate.toFixed(1)),
      parseFloat(avgResolutionSpeed.toFixed(1)),
      parseFloat(avgSatisfaction.toFixed(1)),
      parseFloat(avgTaskVolume.toFixed(1)),
      parseFloat(avgCoverage.toFixed(1))
    ];
  };
  
  // Format data for radar chart
  const datasets = [
    {
      label: 'Top Performers',
      values: calculateRadarMetrics(topPerformers)
    },
    {
      label: 'Average Workers',
      values: calculateRadarMetrics(averagePerformers)
    }
  ];
  
  return {
    labels: ['Completion Rate', 'Resolution Speed', 'Citizen Satisfaction', 'Task Volume', 'Location Coverage'],
    datasets
  };
};

// Get worker efficiency for resource allocation
router.get('/worker-efficiency', authenticateToken, async (req, res) => {
  try {
    const connection = await pool.getConnection();
    
    try {
      const [rows] = await connection.query(`
        SELECT 
          u.user_id,
          u.full_name,
          d.department_name,
          COUNT(ga.grievance_id) as total_assigned,
          SUM(CASE WHEN ga.status = 'completed' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN ga.status != 'completed' THEN 1 ELSE 0 END) as active,
          AVG(TIMESTAMPDIFF(DAY, ga.assigned_at, IFNULL(ga.updated_at, NOW()))) as avg_days
        FROM users u
        LEFT JOIN departments d ON u.department_id = d.department_id
        LEFT JOIN grievance_assignments ga ON u.user_id = ga.worker_id
        WHERE u.role_id = 3 # role_id 3 = municipal_worker
        GROUP BY u.user_id, u.full_name, d.department_name
        ORDER BY completed DESC
      `);
      
      // Calculate metrics
      const workers = rows.map(worker => {
        const completionRate = worker.total_assigned > 0 
          ? (worker.completed / worker.total_assigned) * 100 
          : 0;
          
        return {
          user_id: worker.user_id,
          full_name: worker.full_name,
          department_name: worker.department_name,
          metrics: {
            completionRate: parseFloat(completionRate.toFixed(1)),
            avgResolutionTime: parseFloat(worker.avg_days || 0).toFixed(1),
            totalAssigned: worker.total_assigned || 0,
            totalCompleted: worker.completed || 0,
            activeGrievances: worker.active || 0
          }
        };
      });
      
      connection.release();
      res.json({ workers });
      
    } catch (err) {
      connection.release();
      throw err;
    }
    
  } catch (err) {
    console.error('Error fetching worker efficiency data:', err);
    res.status(500).json({ 
      error: 'Failed to fetch worker efficiency data', 
      details: err.message
    });
  }
});

// Get optimal assignments recommendations
router.get('/optimal-assignments', authenticateToken, async (req, res) => {
  try {
    const connection = await pool.getConnection();
    
    try {
      // Get pending grievances
      const [grievances] = await connection.query(`
        SELECT 
          g.grievance_id,
          g.description,
          g.category,
          g.latitude,
          g.longitude,
          g.created_at
        FROM grievances g
        WHERE g.status = 'pending'
        ORDER BY g.created_at ASC
      `);
      
      // Get available workers with their current workload
      const [workers] = await connection.query(`
        SELECT 
          u.user_id,
          u.full_name,
          d.department_name,
          COUNT(ga.grievance_id) as current_tasks,
          (SELECT 
            AVG(TIMESTAMPDIFF(DAY, ga2.assigned_at, ga2.updated_at)) 
           FROM grievance_assignments ga2 
           WHERE ga2.worker_id = u.user_id AND ga2.status = 'completed'
          ) as avg_completion_days
        FROM users u
        LEFT JOIN departments d ON u.department_id = d.department_id
        LEFT JOIN grievance_assignments ga ON u.user_id = ga.worker_id AND ga.status != 'completed'
        WHERE u.role_id = 3 # role_id 3 = municipal_worker
        GROUP BY u.user_id, u.full_name, d.department_name
      `);
      
      // Get worker last known locations
      const [locations] = await connection.query(`
        SELECT 
          wl.worker_id,
          wl.latitude,
          wl.longitude
        FROM worker_locations wl
        INNER JOIN (
          SELECT worker_id, MAX(timestamp) as latest_time
          FROM worker_locations
          GROUP BY worker_id
        ) latest ON wl.worker_id = latest.worker_id AND wl.timestamp = latest.latest_time
      `);
      
      // Add location information to workers
      const workersWithLocation = workers.map(worker => {
        const location = locations.find(loc => loc.worker_id === worker.user_id);
        
        return {
          ...worker,
          latitude: location ? location.latitude : null,
          longitude: location ? location.longitude : null
        };
      });
      
      // Generate assignments
      const assignments = [];
      
      for (const grievance of grievances) {
        // Find best worker for this grievance
        let bestWorker = null;
        let bestScore = -Infinity;
        let bestDistance = null;
        
        for (const worker of workersWithLocation) {
          // Skip workers with no location data
          if (!worker.latitude || !worker.longitude) continue;
          
          // Calculate distance between worker and grievance
          const distance = calculateDistance(
            worker.latitude, worker.longitude,
            grievance.latitude, grievance.longitude
          );
          
          // Calculate score based on multiple factors (higher is better)
          const distanceScore = 100 - Math.min(distance * 10, 100); // Lower distance = higher score
          const workloadScore = 100 - Math.min(worker.current_tasks * 20, 100); // Lower workload = higher score
          
          // Department matching
          const departmentMatchScore = isDepartmentMatch(worker.department_name, grievance.category) ? 50 : 0;
          
          // Efficiency score based on average completion days (lower is better)
          const efficiencyScore = worker.avg_completion_days 
            ? 100 - Math.min(worker.avg_completion_days * 10, 100)
            : 50; // Default for new workers
          
          // Calculate total score
          const totalScore = distanceScore + workloadScore + departmentMatchScore + efficiencyScore;
          
          if (totalScore > bestScore) {
            bestScore = totalScore;
            bestWorker = worker;
            bestDistance = distance;
          }
        }
        
        // Add assignment recommendation
        assignments.push({
          grievance_id: grievance.grievance_id,
          title: grievance.description.substring(0, 30) + (grievance.description.length > 30 ? '...' : ''),
          category: grievance.category,
          latitude: grievance.latitude,
          longitude: grievance.longitude,
          created_at: grievance.created_at,
          recommended_worker: bestWorker ? {
            user_id: bestWorker.user_id,
            full_name: bestWorker.full_name,
            department_name: bestWorker.department_name,
            current_tasks: bestWorker.current_tasks,
            distance: parseFloat(bestDistance.toFixed(2))
          } : null,
          score: bestScore,
          reasons: generateRecommendationReasons(bestWorker, bestDistance, grievance.category)
        });
      }
      
      connection.release();
      res.json({ assignments });
      
    } catch (err) {
      connection.release();
      throw err;
    }
    
  } catch (err) {
    console.error('Error generating optimal assignments:', err);
    res.status(500).json({ 
      error: 'Failed to generate optimal assignments', 
      details: err.message
    });
  }
});

// Helper function to calculate distance between two coordinates (Haversine formula)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  const distance = R * c; // Distance in km
  return distance;
};

const deg2rad = (deg) => {
  return deg * (Math.PI/180);
};

// Helper function to check if department matches grievance category
const isDepartmentMatch = (department, category) => {
  if (!department || !category) return false;
  
  // Map departments to categories
  const departmentCategoryMap = {
    'Roads': ['Roads', 'Potholes'],
    'Drainage': ['Drainage', 'Water Logging', 'Waterlogging'],
    'Waste Management': ['Waste Management', 'Garbage', 'Garbage Overflow'],
    'Street Lights': ['Street Lights', 'Lighting'],
    'Water Supply': ['Water Supply', 'Water'],
    'Electricity': ['Electricity', 'Power'],
    'Public Property Maintenance': ['Public Property', 'Fallen Trees', 'Trees']
  };
  
  // Check if category belongs to department
  return departmentCategoryMap[department]?.some(cat => 
    category.toLowerCase().includes(cat.toLowerCase())
  ) || false;
};

// Generate human-readable recommendation reasons
const generateRecommendationReasons = (worker, distance, category) => {
  if (!worker) return 'No suitable worker found for this grievance.';
  
  const reasons = [];
  
  // Add distance reason
  if (distance !== null) {
    if (distance < 2) {
      reasons.push(`Worker is very close (${distance.toFixed(2)} km away)`);
    } else if (distance < 5) {
      reasons.push(`Worker is nearby (${distance.toFixed(2)} km away)`);
    } else {
      reasons.push(`Worker is ${distance.toFixed(2)} km away`);
    }
  }
  
  // Add workload reason
  if (worker.current_tasks === 0) {
    reasons.push('Worker has no active tasks');
  } else if (worker.current_tasks < 3) {
    reasons.push(`Worker has a light workload (${worker.current_tasks} active tasks)`);
  } else if (worker.current_tasks < 6) {
    reasons.push(`Worker has a moderate workload (${worker.current_tasks} active tasks)`);
  } else {
    reasons.push(`Worker has a heavy workload (${worker.current_tasks} active tasks)`);
  }
  
  // Add department match reason
  if (isDepartmentMatch(worker.department_name, category)) {
    reasons.push(`Worker specializes in ${worker.department_name} which matches the grievance category`);
  }
  
  // Add efficiency reason
  if (worker.avg_completion_days) {
    if (worker.avg_completion_days < 3) {
      reasons.push(`Worker has excellent resolution time (${worker.avg_completion_days.toFixed(1)} days)`);
    } else if (worker.avg_completion_days < 5) {
      reasons.push(`Worker has good resolution time (${worker.avg_completion_days.toFixed(1)} days)`);
    } else {
      reasons.push(`Worker's average resolution time is ${worker.avg_completion_days.toFixed(1)} days`);
    }
  }
  
  return reasons.join('. ') + '.';
};

export default router;