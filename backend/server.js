const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { initializeDB } = require('./config/db');

// Load environment variables
dotenv.config();

// Initialize database
initializeDB();

const app = express();
// Behind Render's proxy; needed for secure cookies and correct proto
app.set('trust proxy', 1);

// CORS configuration
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  'https://curalink-frontend-h970.onrender.com',
  'http://curalink-frontend-h970.onrender.com'
];

const corsOptions = {
  origin: function(origin, callback) {
    // Allow requests with no origin (e.g., curl, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  // Let cors package reflect requested methods/headers by default to avoid preflight mismatches
  optionsSuccessStatus: 204,
  preflightContinue: false,
  maxAge: 86400
};

// Middleware
app.use(cors(corsOptions));
// Explicitly handle preflight requests for all routes
app.options('*', cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/patients', require('./routes/patients'));
app.use('/api/researchers', require('./routes/researchers'));
app.use('/api/clinical-trials', require('./routes/clinicalTrials'));
app.use('/api/publications', require('./routes/publications'));
app.use('/api/experts', require('./routes/experts'));
app.use('/api/collaborators', require('./routes/collaborators'));
app.use('/api/forums', require('./routes/forums'));
app.use('/api/favorites', require('./routes/favorites'));
app.use('/api/dashboard', require('./routes/dashboard'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'CuraLink API is running' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

