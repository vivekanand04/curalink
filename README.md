# CuraLink - Clinical Trials & Research Platform

CuraLink is an AI-powered platform designed to connect patients, caregivers, and researchers by simplifying the discovery of clinical trials, medical publications, and health experts.

LIVE : https://curalink-frontend-h970.onrender.com
## 🎯 Features

### For Patients/Caregivers
- **Personalized Dashboard**: Get recommendations based on your medical conditions
- **Health Experts**: Search and connect with specialists in your field
- **Clinical Trials**: Discover relevant clinical trials with AI-generated summaries
- **Publications**: Access the latest medical research papers
- **Forums**: Ask questions and get answers from researchers
- **Favorites**: Save your favorite trials, publications, and experts

### For Researchers
- **Collaborator Network**: Find and connect with other researchers
- **Clinical Trials Management**: Create and manage your clinical trials
- **Forums**: Engage in discussions and answer patient questions
- **Publications**: Access research publications
- **Favorites**: Save relevant content for future reference

## 🛠 Tech Stack

- **Frontend**: React 18 with React Router
- **Backend**: Node.js with Express
- **Database**: PostgreSQL
- **Authentication**: JWT-based authentication
- **AI Integration**: OpenAI API for generating summaries
- **External APIs**: PubMed, ClinicalTrials.gov (integrated)

## 📋 Prerequisites

- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

## 🚀 Setup Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
cd curalink
```

### 2. Install Dependencies

Install all dependencies for root, backend, and frontend:

```bash
npm run install-all
```

Or manually:

```bash
npm install
cd backend && npm install
cd ../frontend && npm install
```

### 3. Database Setup

1. Create a PostgreSQL database:

```bash
createdb curalink
```

2. Configure database connection in `backend/.env`:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=curalink
DB_USER=postgres
DB_PASSWORD=your_password

JWT_SECRET=your_jwt_secret_key_here
OPENAI_API_KEY=your_openai_api_key_here
PORT=5000
NODE_ENV=development
```

3. Initialize the database:

```bash
cd backend
node scripts/initDatabase.js
```

### 4. Start the Application

#### Option 1: Run both frontend and backend together

From the root directory:

```bash
npm run dev
```

#### Option 2: Run separately

**Backend:**
```bash
cd backend
npm run dev
```

**Frontend:**
```bash
cd frontend
npm start
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## 📁 Project Structure

```
curalink/
├── backend/
│   ├── config/
│   │   └── db.js              # Database configuration
│   ├── middleware/
│   │   └── auth.js            # Authentication middleware
│   ├── routes/
│   │   ├── auth.js            # Authentication routes
│   │   ├── patients.js        # Patient routes
│   │   ├── researchers.js     # Researcher routes
│   │   ├── clinicalTrials.js # Clinical trials routes
│   │   ├── publications.js   # Publications routes
│   │   ├── experts.js        # Health experts routes
│   │   ├── collaborators.js  # Collaborator routes
│   │   ├── forums.js         # Forum routes
│   │   └── favorites.js      # Favorites routes
│   ├── utils/
│   │   ├── ai.js             # AI summary generation
│   │   └── externalApis.js   # External API integrations
│   ├── scripts/
│   │   └── initDatabase.js   # Database initialization
│   └── server.js             # Express server
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/        # Reusable components
│   │   ├── context/          # React context (Auth)
│   │   ├── pages/
│   │   │   ├── Auth/         # Login/Register pages
│   │   │   ├── Patient/     # Patient pages
│   │   │   └── Researcher/  # Researcher pages
│   │   ├── App.js
│   │   └── index.js
│   └── package.json
└── README.md
```

## 🔐 Authentication

The application uses JWT (JSON Web Tokens) for authentication. Users must register with either:
- **Patient/Caregiver** role
- **Researcher** role

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Patients
- `GET /api/patients/profile` - Get patient profile
- `POST /api/patients/profile` - Create/update patient profile

### Researchers
- `GET /api/researchers/profile` - Get researcher profile
- `POST /api/researchers/profile` - Create/update researcher profile

### Clinical Trials
- `GET /api/clinical-trials` - Get all trials (with filters)
- `GET /api/clinical-trials/personalized` - Get personalized trials (patients)
- `GET /api/clinical-trials/my-trials` - Get researcher's trials
- `POST /api/clinical-trials` - Create trial (researchers)
- `PUT /api/clinical-trials/:id` - Update trial (researchers)

### Publications
- `GET /api/publications` - Get all publications
- `GET /api/publications/personalized` - Get personalized publications
- `GET /api/publications/search` - Search publications

### Health Experts
- `GET /api/experts/personalized` - Get personalized experts
- `GET /api/experts/search` - Search experts
- `POST /api/experts/:id/follow` - Follow an expert
- `POST /api/experts/:id/meeting-request` - Request meeting

### Collaborators
- `GET /api/collaborators/search` - Search collaborators
- `POST /api/collaborators/:id/connect` - Send connection request
- `GET /api/collaborators/connections` - Get connections
- `PUT /api/collaborators/connections/:id` - Accept/reject connection

### Forums
- `GET /api/forums/categories` - Get forum categories
- `GET /api/forums/categories/:id/posts` - Get posts in category
- `POST /api/forums/posts` - Create post
- `GET /api/forums/posts/:id` - Get post with replies
- `POST /api/forums/posts/:id/replies` - Reply to post (researchers only)

### Favorites
- `GET /api/favorites` - Get user's favorites
- `POST /api/favorites` - Add to favorites
- `DELETE /api/favorites/:type/:id` - Remove from favorites

## 🎨 UI/UX Features

- Clean, modern, and intuitive design
- Responsive layout for all screen sizes
- Smooth navigation and transitions
- AI-generated summaries for easy understanding
- Personalized recommendations
- Easy-to-use search and filtering

## 🔧 Environment Variables

### Backend (.env)
- `DB_HOST` - PostgreSQL host
- `DB_PORT` - PostgreSQL port
- `DB_NAME` - Database name
- `DB_USER` - Database user
- `DB_PASSWORD` - Database password
- `JWT_SECRET` - Secret key for JWT tokens
- `OPENAI_API_KEY` - OpenAI API key for AI summaries
- `PORT` - Backend server port
- `NODE_ENV` - Environment (development/production)

### Frontend (.env)
- `REACT_APP_API_URL` - Backend API URL (default: http://localhost:5000/api)

## 📝 Notes

- The application requires an OpenAI API key for AI-generated summaries. If not provided, it will use a fallback simple summary.
- External API integrations (PubMed, ClinicalTrials.gov) are configured but may require API keys for full functionality.
- Database tables are automatically created on first run.
- Forum categories are initialized via the database script.

## 🐛 Troubleshooting

1. **Database Connection Issues**: Ensure PostgreSQL is running and credentials are correct.
2. **Port Already in Use**: Change the PORT in backend/.env or kill the process using the port.
3. **Module Not Found**: Run `npm install` in the respective directory.
4. **CORS Errors**: Ensure the backend CORS configuration allows requests from frontend origin.

## 📄 License

This project is created for the CuraLink Hackathon.

## 👥 Contributors

Built for the CuraLink Hackathon challenge.

---

**Good luck with the hackathon! 🚀**

