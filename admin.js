const express = require('express');
const router = express.Router();
const db = require('./db');
const path = require('path');
const fs = require('fs');
const { verifyToken, isAdmin } = require('./middleware');

router.get('/stats', verifyToken, isAdmin, async (req, res) => {
  try {
    const [u1] = await db.query('SELECT COUNT(*) AS total_users FROM users WHERE role != "admin"');
    const [u2] = await db.query('SELECT COUNT(*) AS total_passengers FROM users WHERE role = "passenger"');
    const [u3] = await db.query('SELECT COUNT(*) AS total_riders FROM users WHERE role = "rider"');
    const [u4] = await db.query('SELECT COUNT(*) AS pending_riders FROM users WHERE role = "rider" AND is_approved = 0');
    const [u5] = await db.query('SELECT COUNT(*) AS total_rides FROM rides');
    const [u6] = await db.query('SELECT COUNT(*) AS completed_rides FROM rides WHERE status = "completed"');
    const [u7] = await db.query('SELECT COUNT(*) AS active_sos FROM sos_alerts WHERE status = "active"');
    const [u8] = await db.query('SELECT COUNT(*) AS total_sos FROM sos_alerts');
    res.json({
      success: true,
      stats: {
        total_users: u1[0].total_users, total_passengers: u2[0].total_passengers,
        total_riders: u3[0].total_riders, pending_riders: u4[0].pending_riders,
        total_rides: u5[0].total_rides, completed_rides: u6[0].completed_rides,
        active_sos: u7[0].active_sos, total_sos: u8[0].total_sos
      }
    });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error' }); }
});

// includes id_proof_filename + is_blocked for admin use
router.get('/users', verifyToken, isAdmin, async (req, res) => {
  try {
    const [users] = await db.query(`
      SELECT u.id, u.name, u.email, u.phone, u.role, u.is_approved, u.is_blocked,
             u.id_proof_filename, u.created_at,
             rd.vehicle_type, rd.vehicle_number, rd.license_number, rd.total_rides
      FROM users u
      LEFT JOIN rider_details rd ON u.id = rd.rider_id
      ORDER BY u.created_at DESC
    `);
    res.json({ success: true, users });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error' }); }
});

// Serve ID proof file securely (admin only) — token accepted via header OR query param (for img src)
router.get('/rider-id-proof/:id', async (req, res) => {
  try {
    const jwt = require('jsonwebtoken');
    const token = (req.headers['authorization']?.split(' ')[1]) || req.query.token;
    if (!token) return res.status(401).json({ success: false, message: 'Access token required' });
    let user;
    try { user = jwt.verify(token, process.env.JWT_SECRET || 'sakhi_secret'); } catch { return res.status(403).json({ success: false, message: 'Invalid token' }); }
    if (user.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin access required' });

    const [rows] = await db.query('SELECT id_proof_filename FROM users WHERE id = ? AND role = "rider"', [req.params.id]);
    if (!rows.length || !rows[0].id_proof_filename)
      return res.status(404).json({ success: false, message: 'No ID proof uploaded for this rider' });
    const filename = rows[0].id_proof_filename;
    const filePath = path.join(__dirname, 'uploads', 'id_proofs', filename);
    if (!fs.existsSync(filePath))
      return res.status(404).json({ success: false, message: 'File not found on server' });
    res.sendFile(filePath);
  } catch (err) { res.status(500).json({ success: false, message: 'Server error' }); }
});

router.put('/approve-rider/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    await db.query('UPDATE users SET is_approved = 1 WHERE id = ? AND role = "rider"', [req.params.id]);
    res.json({ success: true, message: 'Rider approved!' });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error' }); }
});

router.put('/reject-rider/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    await db.query('UPDATE users SET is_approved = 0 WHERE id = ? AND role = "rider"', [req.params.id]);
    res.json({ success: true, message: 'Rider deactivated' });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error' }); }
});

router.get('/rides', verifyToken, isAdmin, async (req, res) => {
  try {
    const [rides] = await db.query(`
      SELECT r.*, p.name AS passenger_name, p.phone AS passenger_phone,
      ri.name AS rider_name, ri.phone AS rider_phone
      FROM rides r JOIN users p ON r.passenger_id = p.id
      LEFT JOIN users ri ON r.rider_id = ri.id
      ORDER BY r.created_at DESC
    `);
    res.json({ success: true, rides });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error' }); }
});

router.get('/sos-alerts', verifyToken, isAdmin, async (req, res) => {
  try {
    const [alerts] = await db.query(`
      SELECT s.*, u.name AS user_name, u.phone AS user_phone
      FROM sos_alerts s JOIN users u ON s.user_id = u.id
      ORDER BY s.created_at DESC
    `);
    res.json({ success: true, alerts });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error' }); }
});

router.put('/sos-alerts/:id/resolve', verifyToken, isAdmin, async (req, res) => {
  try {
    await db.query('UPDATE sos_alerts SET status = "resolved" WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'SOS resolved' });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error' }); }
});

router.put('/users/:id/block', verifyToken, isAdmin, async (req, res) => {
  try {
    const block = req.body.block ? 1 : 0;
    await db.query('UPDATE users SET is_blocked = ? WHERE id = ?', [block, req.params.id]);
    res.json({ success: true, message: block ? 'User blocked' : 'User unblocked' });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error' }); }
});

module.exports = router;
