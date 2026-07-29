# 🏛️ AI-Powered Municipal Grievance Management Portal

> **Smart India Hackathon (SIH) Project** — An intelligent, full-stack grievance management system that empowers citizens to report civic issues and helps municipalities resolve them efficiently using AI/ML.

---

## 📌 Overview

The **Municipal Grievance Management Portal** is a role-based web application that digitizes the entire civic complaint lifecycle — from submission to resolution. Citizens can report issues like potholes, waterlogging, garbage overflow, and fallen trees by simply uploading a photo. The system automatically **classifies the grievance using a custom-trained YOLOv8 AI model**, routes it to the right department, and enables municipal admins and workers to track and resolve it in real time.

---

## 🎯 What Does It Do?

| For Citizens | For Municipal Admins | For Municipal Workers |
|---|---|---|
| Register & login securely | View all submitted grievances | View assigned tasks |
| Submit grievances with photos | Auto-classified by AI category | Update task resolution status |
| Auto GPS-based location capture | Assign grievances to workers | Navigate to location via map |
| Track grievance status in real-time | View analytics & reports | Mark complaints as resolved |
| View history of all complaints | Manage the worker workforce | Update progress on-site |

---

## ✨ Key Features

- 🤖 **AI-Powered Auto-Classification** — YOLOv8 model classifies uploaded photos into civic categories automatically
- 📍 **GPS Location Capture** — Citizens capture precise coordinates via an interactive Leaflet map
- 🔐 **Role-Based Authentication** — JWT-secured login with three distinct roles: Citizen, Admin, Worker
- 📊 **Analytics Dashboard** — Admins get visual reports on grievance trends, resolution rates, and category breakdowns
- 📁 **Photo Upload & Storage** — Grievance images are stored server-side and linked to each complaint
- 🗂️ **Assignment System** — Admins assign individual grievances to specific workers with one click
- 📱 **Responsive Design** — Glassmorphism-inspired UI that works across all screen sizes
- 🔄 **Real-time Status Tracking** — Grievances move through statuses: `Pending → In Progress → Resolved`

---

## 🤖 AI / ML — YOLOv8 Image Classifier

The most powerful feature of this portal is the **integrated AI image classifier**.

### Model Architecture

| Property | Detail |
|---|---|
| **Model** | YOLOv8 (Classification variant) |
| **Library** | [Ultralytics](https://ultralytics.com) |
| **Training Data** | Custom SIH dataset (`SIH Dataset_Split`) |
| **Model File** | `modelup/best.pt` (~10 MB, fine-tuned weights) |
| **Input** | Grievance photo (JPEG / PNG) |
| **Output** | Predicted category + confidence score + all class probabilities |

### What the Model Detects

The YOLOv8 classifier is trained to identify **4 civic issue categories** from photos:

| Detected Class | Mapped Category | Example |
|---|---|---|
| 🕳️ Potholes | `Roads` | Damaged road surface |
| 🌊 Waterlogging | `Drainage` | Flooded streets / blocked drains |
| 🗑️ Garbage Overflow | `Waste Management` | Overflowing bins, dump sites |
| 🌳 Fallen Trees | `Public Property` | Storm-damaged or fallen trees |

Unrecognized images default to the `Others` category.

### How the AI Pipeline Works

```
Citizen uploads a photo while submitting a grievance
              ↓
POST /api/classifier/classify  (Express.js route)
              ↓
Node.js spawns a Python subprocess with the image path
              ↓
Python loads YOLOv8 best.pt via ultralytics library
              ↓
model.predict(image) → returns class probabilities
              ↓
Top prediction + confidence score returned as JSON
              ↓
Category auto-filled in the grievance form
              ↓
Grievance routed to the correct municipal department
```

---

## 🛠️ Tech Stack

### Frontend

| Technology | Purpose |
|---|---|
| **React 19** | UI framework |
| **Vite 7** | Build tool & dev server |
| **React Router DOM v7** | Client-side routing |
| **Leaflet.js** | Interactive maps & GPS location |
| **Axios** | HTTP client for API calls |
| **Custom CSS** | Glassmorphism design system |

### Backend

| Technology | Purpose |
|---|---|
| **Node.js** | Runtime environment |
| **Express.js** | REST API framework |
| **JWT (jsonwebtoken)** | Authentication & authorization |
| **Multer** | File upload handling |
| **MySQL** | Relational database |
| **dotenv** | Environment configuration |

### AI / ML

| Technology | Purpose |
|---|---|
| **YOLOv8 (Ultralytics)** | Custom-trained image classifier |
| **Python 3** | Model inference runtime |
| **Pillow (PIL)** | Image preprocessing |
| **Streamlit** | Model demo/testing UI |

---

## 🗂️ Project Structure

```
sih/
├── src/                          # React frontend source
│   ├── App.jsx                   # Root app with routing
│   ├── pages/
│   │   ├── Login.jsx             # Login page
│   │   ├── Register.jsx          # Registration page
│   │   ├── CitizenDashboard.jsx  # Citizen portal
│   │   ├── AdminDashboard.jsx    # Admin control panel
│   │   ├── WorkerDashboard.jsx   # Worker task view
│   │   ├── SubmitGrievance.jsx   # Grievance submission form
│   │   └── LocationCapture.jsx   # GPS/map location picker
│   ├── components/
│   │   ├── AnalyticsDashboard.jsx # Charts & analytics
│   │   └── MyGrievances.jsx       # Citizen grievance list
│   └── styles/
│
├── server/                        # Express.js backend
│   ├── server.js                  # App entry point
│   ├── db.js                      # MySQL database connection
│   ├── routes/
│   │   ├── auth.js                # Login & registration API
│   │   ├── grievances.js          # Grievance CRUD API
│   │   ├── admin.js               # Admin operations API
│   │   ├── workers.js             # Worker management API
│   │   ├── analytics.js           # Analytics & reporting API
│   │   └── classifier.js          # AI classification API
│   └── uploads/                   # Stored grievance photos
│
├── modelup/                       # ML model files
│   ├── best.pt                    # Trained YOLOv8 weights (~10MB)
│   └── sih.py                     # Streamlit model demo
│
├── NewLandingPage/                # Static HTML landing page
├── grievance_portal_setup.sql     # Full DB schema
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js v18+
- Python 3.9+
- MySQL Server
- Python packages: `ultralytics`, `Pillow`

```bash
pip install ultralytics Pillow
```

### 1. Clone the Repository

```bash
git clone https://github.com/DebanjanPan004/AI-Powered-Municipal-Grievance-Management-Portal.git
cd AI-Powered-Municipal-Grievance-Management-Portal/sih
```

### 2. Setup the Database

```bash
mysql -u root -p < grievance_portal_setup.sql
```

### 3. Configure Environment Variables

Create a `.env` file in the `server/` directory:

```env
PORT=3001
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=grievance_portal
JWT_SECRET=your_jwt_secret_key
```

### 4. Install & Run the Backend

```bash
cd server
npm install
npm start
# API runs at http://localhost:3001
```

### 5. Install & Run the Frontend

```bash
# From the sih/ root directory
npm install
npm run dev
# App runs at http://localhost:5173
```

### 6. (Optional) Run the Streamlit Model Demo

```bash
cd modelup
streamlit run sih.py
```

---

## 🌐 API Endpoints

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| POST | `/api/auth/register` | Register new user | ❌ |
| POST | `/api/auth/login` | User login | ❌ |
| GET | `/api/grievances` | Get all grievances | ✅ |
| POST | `/api/grievances` | Submit new grievance | ✅ |
| PUT | `/api/grievances/:id` | Update grievance status | ✅ |
| POST | `/api/classifier/classify` | AI image classification | ✅ |
| GET | `/api/analytics` | Dashboard analytics | ✅ Admin |
| GET | `/api/workers` | List all workers | ✅ Admin |
| POST | `/api/admin/assign` | Assign grievance to worker | ✅ Admin |
| GET | `/api/health` | Server health check | ❌ |

---

## 👥 User Roles

```
┌──────────────────────────────────────────────────────┐
│                    GRIEVANCE PORTAL                   │
├───────────────┬────────────────┬─────────────────────┤
│    CITIZEN    │  MUNICIPAL     │  MUNICIPAL WORKER   │
│               │    ADMIN       │                     │
│ • Submit      │ • View all     │ • View assigned     │
│   grievances  │   grievances   │   tasks             │
│ • Upload      │ • Assign to    │ • Update status     │
│   photos      │   workers      │ • Navigate to site  │
│ • GPS locate  │ • View         │ • Mark resolved     │
│ • Track       │   analytics    │                     │
│   status      │ • Manage users │                     │
└───────────────┴────────────────┴─────────────────────┘
```

---

## 🏆 Built For

**Smart India Hackathon (SIH)** — This project was developed as a solution for the municipal governance problem statement, aiming to modernize and digitize the civic grievance redressal system using AI and web technologies.

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m 'Add some feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

## 👨‍💻 Author

**Debanjan Pan**
- GitHub: [@DebanjanPan004](https://github.com/DebanjanPan004)

---

<p align="center">Made with ❤️ for Smart India Hackathon</p>
