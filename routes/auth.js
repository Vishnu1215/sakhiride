const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');
const { verifyToken } = require('../middleware');
require('dotenv').config();

const storage = multer.diskStorage({
  destination: (req, file, cb) => { const dir = './uploads/id_proofs/'; if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); cb(null, dir); },
  filename: (req, file, cb) => { cb(null, `id_${Date.now()}${path.extname(file.originalname)}`); }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: (req, file, cb) => { const allowed = ['.jpg','.jpeg','.png','.pdf']; if (allowed.includes(path.extname(file.originalname).toLowerCase())) cb(null, true); else cb(new Error('Only JPG, PNG, PDF allowed')); } });

router.post('/register', upload.single('id_proof'), async (req, res) => {
  try {
    const { name, email, phone, password, role, vehicle_type, vehicle_number, license_number, gender } = req.body;
    if (!name || !email || !phone || !password || !role) return res.status(400).json({ success: false, message: 'All fields are required' });
    if (gender && gender.toLowerCase() !== 'female') return res.status(403).json({ success: false, message: 'Sakhi Ride is exclusively for women.' });
    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) return res.status(400).json({ success: false, message: 'Email already registered' });
    const hashedPassword = await bcrypt.hash(password, 10);
    const is_approved = role === 'passenger' ? 1 : 0;
    const idProof = req.file ? req.file.filename : null;
    const [result] = await db.query(
      'INSERT INTO users (name, email, phone, password, role, is_approved, gender, id_proof_filename) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [name, email, phone, hashedPassword, role, is_approved, gender || null, idProof]
    );
    if (role === 'rider') {
      if (!vehicle_type || !vehicle_number || !license_number) return res.status(400).json({ success: false, message: 'Vehicle details required for riders' });
      await db.query('INSERT INTO rider_details (rider_id, vehicle_type, vehicle_number, license_number) VALUES (?, ?, ?, ?)', [result.insertId, vehicle_type, vehicle_number, license_number]);
    }
    res.status(201).json({ success: true, message: role === 'rider' ? 'Registration successful! Wait for admin approval.' : 'Registration successful! You can now login.' });
  } catch (err) { console.error('Register error:', err); res.status(500).json({ success: false, message: 'Server error during registration' }); }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password required' });
    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) return res.status(401).json({ success: false, message: 'Invalid email or password' });
    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid email or password' });
    if (user.is_blocked) return res.status(403).json({ success: false, message: 'Your account has been suspended. Contact support.' });
    if (!user.is_approved) return res.status(403).json({ success: false, message: 'Your account is pending admin approval' });
    const token = jwt.sign({ id: user.id, name: user.name, email: user.email, role: user.role }, process.env.JWT_SECRET || 'sakhi_secret', { expiresIn: '24h' });
    res.json({ success: true, message: 'Login successful', token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) { console.error('Login error:', err); res.status(500).json({ success: false, message: 'Server error during login' }); }
});

router.get('/profile', verifyToken, async (req, res) => {
  try {
    const [users] = await db.query('SELECT id, name, email, phone, role, is_approved, created_at FROM users WHERE id = ?', [req.user.id]);
    if (users.length === 0) return res.status(404).json({ success: false, message: 'User not found' });
    let profileData = users[0];
    if (users[0].role === 'rider') { const [details] = await db.query('SELECT * FROM rider_details WHERE rider_id = ?', [req.user.id]); if (details.length > 0) profileData.rider_details = details[0]; }
    res.json({ success: true, user: profileData });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error' }); }
});

module.exports = router;
