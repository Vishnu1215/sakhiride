const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { verifyToken } = require('../middleware/auth');

// ✅ Trigger SOS
router.post('/', verifyToken, async (req, res) => {
  try {
    const { location } = req.body;

    const [result] = await db.query(
      'INSERT INTO sos_alerts (user_id, location, status) VALUES (?, ?, "active")',
      [req.user.id, location || 'Unknown']
    );

    res.json({ success: true, message: 'SOS triggered', id: result.insertId });

  } catch (err) {
    console.error('SOS error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ✅ Get my SOS alerts
router.get('/', verifyToken, async (req, res) => {
  try {
    const [alerts] = await db.query(
      'SELECT * FROM sos_alerts WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );

    res.json({ success: true, alerts });

  } catch (err) {
    console.error('Get SOS error:', err);
    res.status(500).json({ success: false });
  }
});

module.exports = router;