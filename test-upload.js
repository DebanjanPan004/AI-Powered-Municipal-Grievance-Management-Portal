import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import FormData from 'form-data';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testUpload() {
  try {
    // Path to the test image
    const imagePath = path.join(__dirname, 'server', 'uploads', '1757829484996-928125544.jpg');
    
    if (!fs.existsSync(imagePath)) {
      console.error(`File doesn't exist: ${imagePath}`);
      return;
    }
    
    // Create form data
    const formData = new FormData();
    formData.append('image', fs.createReadStream(imagePath), {
      filename: 'test-image.jpg',
      contentType: 'image/jpeg'
    });
    
    console.log('Sending test image:', imagePath);
    
    // Send the request
    const response = await axios.post('http://localhost:5000/api/test-upload/test', formData, {
      headers: {
        ...formData.getHeaders()
      }
    });
    
    console.log('Response status:', response.status);
    console.log('Response data:', response.data);
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testUpload();