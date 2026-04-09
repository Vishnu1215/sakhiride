const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'frontend')));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/rides', require('./routes/rides'));
app.use('/api/sos', require('./routes/sos'));
app.use('/api/ratings', require('./routes/ratings'));
app.use('/api/admin', require('./routes/admin'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Sakhi Ride API is running!', timestamp: new Date() });
});

// Serve frontend for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.stack);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

const PORT = process.env.PORT || 5004;
app.listen(PORT, () => {
  console.log('');
  console.log('🚗 =========================================');
  console.log('   SAKHI RIDE - Server Started!');
  console.log('=========================================');
  console.log(`✅ Server running at: http://localhost:${PORT}`);
  console.log(`📊 Admin Login: admin@sakhi.com / admin123`);
  console.log('=========================================');
  console.log('');
});

module.exports = app;
