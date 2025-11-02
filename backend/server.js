const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { initializeDB } = require('./config/db');

// Load environment variables
dotenv.config();

// Initialize database
initializeDB();

const app = express();

// Middleware
app.use(cors());
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

