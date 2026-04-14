# Grievance Portal System

A modern web application for municipal grievance reporting and management, featuring a beautiful landing page and comprehensive dashboard system.

## Project Structure

- **Landing Page**: `NewLandingPage/` - Modern landing page with glass morphism design
- **React App**: Main application with login, registration, and dashboard functionality
- **Server**: Backend API in `server/` directory

## Quick Start

### 1. Running the Landing Page

The landing page is a static HTML page that serves as the entry point:

```bash
# Option 1: Use a simple HTTP server
cd NewLandingPage
python -m http.server 3000

# Option 2: Use Node.js http-server (if installed globally)
npx http-server NewLandingPage -p 3000

# Option 3: Use VS Code Live Server extension
# Right-click on NewLandingPage/index.html and select "Open with Live Server"
```

The landing page will be available at `http://localhost:3000`

### 2. Running the React Application

```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```

The React app will be available at `http://localhost:5173`

### 3. Running the Backend Server

```bash
cd server
npm install
npm start
```

The API server will run on `http://localhost:3001`

## Navigation Flow

1. **Landing Page** (`http://localhost:3000`) - Beautiful introduction page with project information
2. **Login Button** - Clicking "Login" on the landing page navigates to the React app login
3. **React App** (`http://localhost:5173/login`) - Full application with authentication and dashboards
4. **Back to Home** - Both login and register pages have a "Back to Home" link to return to the landing page

## Features

### Landing Page
- Modern glass morphism design
- Responsive layout for all devices
- Smooth animations and scroll effects
- Interactive floating cards
- Timeline section with project milestones

### React Application
- User authentication (Citizens, Municipal Admins, Workers)
- Role-based dashboards
- Grievance submission with photo upload
- Location capture functionality
- Admin assignment and tracking system

## Development

This project uses:
- **Frontend**: React 19 + Vite
- **Styling**: Custom CSS with glass morphism effects
- **Routing**: React Router DOM
- **Maps**: Leaflet for location features
- **Backend**: Node.js + Express (in server directory)

## Building for Production

```bash
# Build the React app
npm run build

# Preview the production build
npm run preview
```
