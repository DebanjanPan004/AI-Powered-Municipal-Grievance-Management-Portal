import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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

async function getGrievancesByUser() {
  try {
    console.log('Fetching all grievances grouped by user...');
    
    // Query to get all grievances with user details
    const [rows] = await pool.query(`
      SELECT 
        g.grievance_id,
        g.user_id,
        u.username,
        u.full_name,
        g.description,
        g.status,
        g.latitude,
        g.longitude,
        g.address,
        IFNULL(g.category, 'General') as category,
        g.created_at,
        g.image_path
      FROM 
        grievances g
      JOIN 
        users u ON g.user_id = u.user_id
      ORDER BY 
        g.user_id, g.created_at DESC
    `);
    
    console.log(`Found ${rows.length} total grievances`);
    
    // Group grievances by user
    const grievancesByUser = {};
    
    rows.forEach(grievance => {
      const userId = grievance.user_id;
      const username = grievance.username;
      
      if (!grievancesByUser[userId]) {
        grievancesByUser[userId] = {
          userId,
          username: username,
          fullName: grievance.full_name,
          grievances: []
        };
      }
      
      grievancesByUser[userId].grievances.push({
        id: grievance.grievance_id,
        description: grievance.description,
        status: grievance.status,
        category: grievance.category,
        location: {
          latitude: grievance.latitude,
          longitude: grievance.longitude,
          address: grievance.address
        },
        createdAt: grievance.created_at,
        imagePath: grievance.image_path ? `/uploads/${grievance.image_path}` : null
      });
    });
    
    // Convert to array for easier handling
    const usersWithGrievances = Object.values(grievancesByUser);
    
    // Print summary
    console.log(`\nGrievances by User Summary:`);
    console.log('==========================');
    
    usersWithGrievances.forEach(user => {
      console.log(`\nUser ID: ${user.userId}`);
      console.log(`Username: ${user.username}`);
      console.log(`Full Name: ${user.fullName}`);
      console.log(`Total Grievances: ${user.grievances.length}`);
      
      // Count grievances by status
      const statusCounts = {};
      user.grievances.forEach(g => {
        statusCounts[g.status] = (statusCounts[g.status] || 0) + 1;
      });
      
      console.log('Status Breakdown:');
      Object.entries(statusCounts).forEach(([status, count]) => {
        console.log(`  ${status}: ${count}`);
      });
      
      // Print details of each grievance
      console.log('\nGrievance Details:');
      user.grievances.forEach((g, index) => {
        console.log(`  ${index + 1}. ID: ${g.id}`);
        console.log(`     Description: ${g.description.substring(0, 50)}${g.description.length > 50 ? '...' : ''}`);
        console.log(`     Status: ${g.status}`);
        console.log(`     Category: ${g.category}`);
        console.log(`     Created: ${new Date(g.createdAt).toLocaleString()}`);
        console.log(`     Location: ${g.location.latitude}, ${g.location.longitude}`);
      });
      
      console.log('---------------------------');
    });
    
    // Save to a JSON file for reference
    const outputFile = path.join(__dirname, 'grievances_by_user.json');
    fs.writeFileSync(outputFile, JSON.stringify(usersWithGrievances, null, 2));
    console.log(`\nDetailed results saved to ${outputFile}`);
    
    return usersWithGrievances;
  } catch (error) {
    console.error('Error fetching grievances by user:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Execute the function
getGrievancesByUser().catch(console.error);