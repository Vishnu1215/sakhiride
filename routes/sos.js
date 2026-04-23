const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken } = require('../middleware');

router.post('/trigger', verifyToken, async (req, res) => {
  try {
    const { ride_id, latitude, longitude, location_text } = req.body;
    const [result] = await db.query(
      'INSERT INTO sos_alerts (user_id, ride_id, latitude, longitude, location_text) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, ride_id || null, latitude || null, longitude || null, location_text || 'Location not provided']
    );
    res.status(201).json({ success: true, message: 'SOS Alert sent! Help is on the way.', alert_id: result.insertId });
  } catch (err) {
    console.error('SOS error:', err);
    res.status(500).json({ success: false, message: 'Failed to send SOS. Call 112.' });
  }
});

router.get('/my-alerts', verifyToken, async (req, res) => {
  try {
    const [alerts] = await db.query(
      'SELECT * FROM sos_alerts WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json({ success: true, alerts });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
