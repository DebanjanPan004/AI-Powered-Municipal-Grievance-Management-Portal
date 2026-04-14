# Fixing the Grievance Portal Data Loading Issues

## Identified Issues

After investigating the code, I've identified several issues causing the "Failed to load grievances" and "Failed to load analytics data" errors:

1. **Authentication Token Handling**: 
   - The token may not be properly formatted or included in API requests
   - Token validation may be failing on the server side
   - Inconsistent token storage and retrieval from localStorage

2. **API Request Configuration**:
   - Missing proper headers in fetch requests
   - Missing error handling for non-200 responses
   - Not properly parsing error responses

3. **CORS Configuration**:
   - The server's CORS configuration may be blocking requests from the frontend

4. **Component Error Handling**:
   - Some components don't handle errors gracefully
   - Error states may not be properly displayed to the user

## Solutions

### 1. Server-side Fixes

First, apply the improved CORS configuration to ensure requests from the frontend are not blocked:

```javascript
// In server.js, modify the CORS configuration
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
```

### 2. Client-side Fixes

#### A. Fix the AnalyticsDashboard Component

Replace the `src/components/AnalyticsDashboard.jsx` file with the improved version in `src/components/FixedAnalyticsDashboard.jsx`. Key improvements include:

- Better error handling with detailed error messages
- Improved authentication token validation
- Proper fetch request configuration with necessary headers
- Fallback to sample data when API fails
- Detailed console logging for debugging

#### B. Fix the AdminDashboard Component

Either:

1. Use the AdminDashboardFix component which wraps the original with fixes
2. Update your routes to use the fixed components
3. Apply the following changes to the existing AdminDashboard:

   - Ensure proper token validation before API calls
   - Add appropriate headers to all fetch requests
   - Improve error handling and user feedback
   - Fix any React Hook dependency issues

### 3. User Authentication Improvements

To address potential token expiration or invalid token issues:

1. Check if the token exists and is valid before making API requests
2. Implement token refresh logic if a 401/403 response is received
3. Add proper error handling for authentication failures
4. Redirect to the login page when authentication fails

### 4. API Request Best Practices

For all API requests, ensure:

1. Include all necessary headers:
   ```javascript
   headers: {
     'Authorization': `Bearer ${user.token}`,
     'Content-Type': 'application/json',
     'Cache-Control': 'no-cache'
   }
   ```

2. Add proper error handling:
   ```javascript
   if (!response.ok) {
     const errorText = await response.text();
     console.error('API error:', response.status, errorText);
     
     if (response.status === 401 || response.status === 403) {
       // Handle authentication errors
     }
     
     throw new Error(`Failed to fetch data: ${response.status}`);
   }
   ```

3. Include debugging information:
   ```javascript
   console.log('Fetching data with token:', user.token);
   ```

## Testing Your Fixes

After implementing the fixes:

1. Clear localStorage to start with a fresh session
2. Log in to the application
3. Navigate to the Admin Dashboard
4. Check browser developer tools console for any errors
5. Monitor network requests to see if the API calls are successful
6. Verify that the grievances and analytics data load correctly

## Next Steps

If you continue to encounter issues:

1. Check server logs for any errors related to database queries or authentication
2. Verify the JWT token is properly generated and validated
3. Ensure the database is accessible and contains the expected data
4. Review the API endpoints in the routes files to ensure they're correctly implemented

By addressing these issues, you should be able to resolve the data loading problems in the application.