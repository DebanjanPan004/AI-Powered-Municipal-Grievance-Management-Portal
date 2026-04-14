import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import jwt from 'jsonwebtoken';

const router = express.Router();
const execPromise = promisify(exec);
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
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    console.log('File filter checking:', file.originalname, file.mimetype);
    
    // Debug: Log all headers
    console.log('Request headers:', req.headers);
    
    const filetypes = /jpeg|jpg|png|gif/;
    const mimetype = file.mimetype.includes('image');
    const extname = path.extname(file.originalname).toLowerCase();
    
    console.log('Extension:', extname);
    console.log('Mimetype:', file.mimetype);
    console.log('Mimetype check:', mimetype);
    
    // Be more permissive - accept any file that claims to be an image
    if (mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
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
      return res.status(403).json({ error: 'Invalid token' });
    }
    
    req.user = user;
    next();
  });
};

// Classify an image using the Python model
router.post('/classify', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    console.log('=== IMAGE CLASSIFICATION START ===');
    
    if (!req.file) {
      return res.status(400).json({ error: 'No image provided' });
    }
    
    const imagePath = path.join(__dirname, '..', 'temp', req.file.filename);
    const pythonScriptPath = path.join(__dirname, '..', '..', 'modelup', 'sih.py');
    
    console.log('Image path:', imagePath);
    console.log('Python script path:', pythonScriptPath);
    
    // Create a temporary python script that doesn't use streamlit
    const tempPythonScript = path.join(__dirname, '..', 'temp', 'classify_image.py');
    
    // Use the absolute path to the model as provided
    const modelPath = "D:\\SIH Dataset_Split\\runs\\classify\\train\\weights\\best.pt";
    
    // Log model path for debugging
    console.log('Using model path:', modelPath);
    
    fs.writeFileSync(tempPythonScript, `
import os
import sys
import json
import traceback

try:
    # Import required modules
    from ultralytics import YOLO
    from PIL import Image
    
    # Load trained model with absolute path
    model_path = r"${modelPath.replace(/\\/g, '/')}"
    print(f"Using model path: {model_path}", file=sys.stderr)
    
    # Check if model file exists
    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Model file not found at: {model_path}")
        
    # Load the model
    model = YOLO(model_path)

    # Open image
    image_path = r"${imagePath.replace(/\\/g, '/')}"
    print(f"Using image path: {image_path}", file=sys.stderr)
    
    # Check if image file exists
    if not os.path.exists(image_path):
        raise FileNotFoundError(f"Image file not found at: {image_path}")
        
    image = Image.open(image_path)

    # Run prediction
    results = model.predict(image, verbose=False)

    # Get top prediction
    probs = results[0].probs
    class_names = results[0].names
    top_class = class_names[int(probs.top1)]
    confidence = probs.top1conf.item() * 100

    # Prepare results
    result = {
        "prediction": top_class,
        "confidence": confidence,
        "probabilities": {}
    }

    # Add all probabilities
    for i, prob in enumerate(probs.data):
        result["probabilities"][class_names[i]] = float(prob * 100)

    # Output as JSON
    print(json.dumps(result))
except Exception as e:
    # Print traceback to stderr for debugging
    traceback.print_exc(file=sys.stderr)
    
    # Prepare error result
    error_result = {
        "error": str(e),
        "error_type": type(e).__name__,
        "model_path": r"${modelPath.replace(/\\/g, '/')}",
        "image_path": r"${imagePath.replace(/\\/g, '/')}"
    }
    print(json.dumps(error_result))
    sys.exit(1)
`);
    
    // Execute the Python script
    try {
      console.log('Executing Python script:', tempPythonScript);
      
      // Use the Python virtual environment
      const pythonExecutable = process.platform === 'win32' 
          ? '"E:/SIH Debanjan (6)/.venv/Scripts/python.exe"' 
          : 'python3';
      const { stdout, stderr } = await execPromise(`${pythonExecutable} "${tempPythonScript}"`);
      
      if (stderr) {
        console.error('Python script stderr output:', stderr);
      }
      
      console.log('Python script stdout output:', stdout);
      
      // Clean up
      try {
        fs.unlinkSync(imagePath);
        fs.unlinkSync(tempPythonScript);
      } catch (cleanupErr) {
        console.warn('Cleanup error:', cleanupErr);
      }
      
      try {
        // Parse the JSON output
        let result;
        try {
          result = JSON.parse(stdout);
        } catch (parseError) {
          throw new Error(`Failed to parse JSON output: ${stdout}. Error: ${parseError.message}`);
        }
        
        // Check if there was an error in the Python script
        if (result.error) {
          console.error('Error in Python script:', result);
          return res.status(500).json({
            error: 'Model prediction failed',
            details: result.error,
            modelPath: result.model_path,
            imagePath: result.image_path
          });
        }
        
        // Transform the prediction to match expected category format
        // Map YOLO class names to your category system
        const categoryMapping = {
          'Fallen Trees': 'Public Property',
          'Garbage Overflow': 'Waste Management', 
          'Potholes': 'Roads',
          'Waterlogging': 'Drainage'
        };
        
        const mappedCategory = categoryMapping[result.prediction] || 'Others';
        
        res.json({
          success: true,
          rawPrediction: result.prediction,
          category: mappedCategory,
          confidence: result.confidence,
          probabilities: result.probabilities
        });
      } catch (jsonError) {
        console.error('Error parsing JSON from Python script:', jsonError);
        res.status(500).json({ 
          error: 'Failed to parse classification result',
          pythonOutput: stdout 
        });
      }
    } catch (error) {
      console.error('Classification error:', error);
      res.status(500).json({ 
        error: 'Failed to classify image',
        details: error.message,
        command: error.cmd
      });
    }
  } catch (error) {
    console.error('Classification error:', error);
    
    // Provide detailed error message to help with debugging
    let errorMessage = 'Failed to classify image';
    let errorDetails = error.message;
    
    if (error.code === 'ENOENT') {
      errorMessage = 'Python or file not found';
      errorDetails = `Could not find required file: ${error.path}`;
    } else if (error.code === 'EACCES') {
      errorMessage = 'Permission denied';
      errorDetails = `No permission to access: ${error.path}`;
    } else if (error.code === 'ETIMEDOUT') {
      errorMessage = 'Operation timed out';
    }
    
    res.status(500).json({ 
      error: errorMessage,
      details: errorDetails,
      path: error.path,
      code: error.code
    });
  }
});

export default router;