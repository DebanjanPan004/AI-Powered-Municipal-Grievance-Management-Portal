// Test file for debugging file upload issues
import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for temporary image uploads for classification
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const tempDir = path.join(__dirname, '..', 'temp');
    
    // Create temp directory if it doesn't exist
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    console.log('Original file name:', file.originalname);
    console.log('File mimetype:', file.mimetype);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    console.log('File filter checking:', file.originalname, file.mimetype);
    const filetypes = /jpeg|jpg|png|gif/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    
    console.log('Extension check:', extname, 'Mimetype check:', mimetype);
    console.log('File extension:', path.extname(file.originalname).toLowerCase());
    
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// Simple test route that just logs file information
router.post('/test', upload.single('image'), (req, res) => {
  try {
    console.log('=== TEST UPLOAD START ===');
    
    if (!req.file) {
      return res.status(400).json({ error: 'No image provided' });
    }
    
    console.log('File received:', req.file);
    
    res.json({
      success: true,
      file: req.file
    });
  } catch (error) {
    console.error('Test upload error:', error);
    res.status(500).json({ 
      error: 'Test upload failed',
      details: error.message
    });
  }
});

export default router;