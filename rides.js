const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { verifyToken } = require('../middleware/auth');

// ✅ Get all rides
router.get('/', verifyToken, async (req, res) => {
  try {
    const [rides] = await db.query('SELECT * FROM rides ORDER BY created_at DESC');
    res.json({ success: true, rides });
  } catch (err) {
    console.error('Get rides error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ✅ Create ride
router.post('/', verifyToken, async (req, res) => {
  try {
    const { pickup_location, dropoff_location } = req.body;

    if (!pickup_location || !dropoff_location) {
      return res.status(400).json({ success: false, message: 'Locations required' });
    }

    const [result] = await db.query(
      'INSERT INTO rides (passenger_id, pickup_location, dropoff_location, status) VALUES (?, ?, ?, "pending")',
      [req.user.id, pickup_location, dropoff_location]
    );

    res.json({ success: true, message: 'Ride created', ride_id: result.insertId });

  } catch (err) {
    console.error('Create ride error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;