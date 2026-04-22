const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));
app.use('/uploads', express.static('uploads'));

app.use('/api/auth', require('./auth'));
app.use('/api/rides', require('./rides'));
app.use('/api/sos', require('./sos'));
app.use('/api/ratings', require('./ratings'));
app.use('/api/admin', require('./admin'));
app.use('/api/tracking', require('./tracking'));
app.use('/api/otp', require('./otp'));
app.use('/api/users', require('./users'));

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Sakhi Ride API is running!' });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
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
