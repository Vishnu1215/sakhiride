const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from public/ folder
app.use(express.static(path.join(__dirname, 'public')));

// Serve uploaded files (ID proofs etc.)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes — now inside routes/ folder
app.use('/api/auth',     require('./routes/auth'));
app.use('/api/rides',    require('./routes/rides'));
app.use('/api/sos',      require('./routes/sos'));
app.use('/api/admin',    require('./routes/admin'));
app.use('/api/otp',      require('./routes/otp'));
app.use('/api/ratings', require('./routes/ratings'));
app.use('/api/users',   require('./routes/users'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Sakhi Ride API is running!' });
});

// All other routes → serve index.html from public/
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 5004;
app.listen(PORT, () => {
  console.log('');
  console.log('🌸 =========================================');
  console.log('   SAKHI RIDE - Server Started!');
  console.log('=========================================');
  console.log(`✅ Server running at: http://localhost:${PORT}`);
  console.log(`📊 Admin Login: admin@sakhi.com / admin123`);
  console.log('=========================================');
});