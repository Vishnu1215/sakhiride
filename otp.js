const express = require('express');
const router = express.Router();
const db = require('./db');
const { verifyToken } = require('./middleware');

// POST /api/otp/verify — Rider submits OTP to start ride
router.post('/verify', verifyToken, async (req, res) => {
  try {
    const { ride_id, otp_entered } = req.body;
    if (!ride_id || !otp_entered)
      return res.status(400).json({ success: false, message: 'ride_id and otp_entered are required' });

    const [rows] = await db.query(
      'SELECT * FROM rides WHERE id = ? AND rider_id = ? AND status = "accepted"',
      [ride_id, req.user.id]
    );
    if (rows.length === 0)
      return res.status(404).json({ success: false, message: 'Ride not found or already started' });

    if (rows[0].otp !== otp_entered.toString().trim())
      return res.status(400).json({ success: false, message: 'Incorrect OTP. Ask the passenger to confirm.' });

    await db.query('UPDATE rides SET status="in_progress", otp=NULL WHERE id=?', [ride_id]);
    res.json({ success: true, message: 'OTP verified! Ride started.' });
  } catch (err) {
    console.error('OTP verify error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/otp/passenger/:ride_id — Passenger gets their OTP
router.get('/passenger/:ride_id', verifyToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT otp, status, rider_id FROM rides WHERE id = ? AND passenger_id = ?',
      [req.params.ride_id, req.user.id]
    );
    if (rows.length === 0)
      return res.status(404).json({ success: false, message: 'Ride not found' });

    const ride = rows[0];
    if (ride.status === 'pending')
      return res.json({ success: true, otp: null, message: 'Waiting for rider...' });
    if (ride.status === 'accepted' && ride.otp)
      return res.json({ success: true, otp: ride.otp, message: 'Share with your rider' });
    if (ride.status === 'in_progress')
      return res.json({ success: true, otp: null, message: 'Ride in progress' });

    res.json({ success: true, otp: null, message: ride.status });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;