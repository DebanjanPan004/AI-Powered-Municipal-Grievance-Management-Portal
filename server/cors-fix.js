// Add this import at the top of server.js
import cors from 'cors';

// Then add this CORS configuration right after app.use(cors())
app.use(cors({
  origin: '*', // Replace with your frontend origin in production
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Add this middleware to debug authentication issues
app.use((req, res, next) => {
  console.log('Request path:', req.path);
  console.log('Auth header:', req.headers.authorization);
  next();
});