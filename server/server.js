import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { testConnection } from './db.js';
import authRoutes from './routes/auth.js';
import grievanceRoutes from './routes/grievances.js';
import workerRoutes from './routes/workers.js';
import adminRoutes from './routes/admin.js';
import classifierRoutes from './routes/classifier.js';
import analyticsRoutes from './routes/analytics.js';
import testUploadRoutes from './routes/test-upload.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Get directory name in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)){
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Load environment variables
dotenv.config();
const PORT = process.env.PORT || 5000;

// Initialize express app
const app = express();

// Middleware
app.use(cors({
  origin: '*', // In production, specify your frontend domain
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'Pragma', 'Expires'],
  exposedHeaders: ['Content-Length', 'Content-Type'],
  credentials: true,
  maxAge: 86400 // 24 hours
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Debug middleware for request logging
app.use((req, res, next) => {
  const requestId = Math.random().toString(36).substring(2, 15);
  req.requestId = requestId;
  
  console.log(`[${new Date().toISOString()}][${requestId}] ${req.method} ${req.url}`);
  
  // Add token logging
  if (req.headers.authorization) {
    const token = req.headers.authorization.split(' ')[1];
    console.log(`[${requestId}] Auth token: ${token ? token.substring(0, 15) + '...' : 'None'}`);
  } else {
    console.log(`[${requestId}] No authorization header`);
  }
  
  // Track request timing
  req.startTime = Date.now();
  
  // Capture response for logging
  const originalSend = res.send;
  res.send = function(body) {
    res.responseBody = body;
    res.send = originalSend;
    return originalSend.call(this, body);
  };
  
  // Log response on completion
  res.on('finish', () => {
    const duration = Date.now() - req.startTime;
    console.log(`[${requestId}] Response: ${res.statusCode} (${duration}ms)`);
    
    // Log errors for non-success responses
    if (res.statusCode >= 400) {
      console.error(`[${requestId}] ERROR: ${res.statusCode} on ${req.method} ${req.url}`);
      
      // Try to parse and log error response
      try {
        if (res.responseBody) {
          const parsedBody = typeof res.responseBody === 'string' 
            ? JSON.parse(res.responseBody) 
            : res.responseBody;
          console.error(`[${requestId}] Error details:`, parsedBody);
        }
      } catch (err) {
        console.error(`[${requestId}] Could not parse error response:`, res.responseBody);
      }
    }
  });
  
  next();
});

// Test database connection
testConnection();

// Import and run the schema update script
import './update-schema.js';

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/grievances', grievanceRoutes);
app.use('/api/workers', workerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/classifier', classifierRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/test-upload', testUploadRoutes);

// Geocoding endpoint (simplified, no actual external API call)
app.get('/api/geocode', (req, res) => {
  const { lat, lng } = req.query;
  
  if (!lat || !lng) {
    return res.status(400).json({ error: 'Missing latitude or longitude parameters' });
  }
  
  // In a real app, this would call a geocoding service like Google Maps
  // For this demo, we'll just return a mock address based on coordinates
  const address = `Sample address near coordinates ${lat}, ${lng}`;
  const pincode = '600001'; // Example pincode
  
  res.json({ 
    address,
    pincode,
    latitude: parseFloat(lat),
    longitude: parseFloat(lng)
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'Server is running',
    time: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    env: process.env.NODE_ENV || 'development'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  const requestId = req.requestId || 'unknown';
  console.error(`[${requestId}] Unhandled server error:`, err);
  
  // Don't expose internal error details in production
  const isProduction = process.env.NODE_ENV === 'production';
  
  res.status(500).json({
    error: 'An unexpected error occurred',
    code: 'SERVER_ERROR',
    message: isProduction ? 'Please try again later' : err.message,
    requestId: requestId,
    ...(isProduction ? {} : { stack: err.stack })
  });
});

// 404 handler for undefined routes
app.use((req, res) => {
  console.warn(`404 Not Found: ${req.method} ${req.url}`);
  res.status(404).json({
    error: 'Resource not found',
    code: 'NOT_FOUND',
    path: req.url
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`CORS allowed for: ${process.env.FRONTEND_URL || '*'}`);
});
