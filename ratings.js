const express = require('express');
const router = express.Router();
const db = require('./db');
const { verifyToken } = require('./middleware');

router.post('/', verifyToken, async (req, res) => {
  try {
    const { ride_id, rating, feedback } = req.body;
    if (!ride_id || !rating)
      return res.status(400).json({ success: false, message: 'Ride ID and rating required' });
    if (rating < 1 || rating > 5)
      return res.status(400).json({ success: false, message: 'Rating must be 1-5' });

    const [rides] = await db.query('SELECT * FROM rides WHERE id = ? AND status = "completed"', [ride_id]);
    if (rides.length === 0)
      return res.status(404).json({ success: false, message: 'Completed ride not found' });

    const ride = rides[0];
    const [existing] = await db.query('SELECT id FROM ratings WHERE ride_id = ? AND rated_by = ?', [ride_id, req.user.id]);
    if (existing.length > 0)
      return res.status(400).json({ success: false, message: 'Already rated this ride' });

    let rated_user = req.user.id === ride.passenger_id ? ride.rider_id : ride.passenger_id;
    await db.query(
      'INSERT INTO ratings (ride_id, rated_by, rated_user, rating, feedback) VALUES (?, ?, ?, ?, ?)',
      [ride_id, req.user.id, rated_user, rating, feedback || null]
    );
    res.status(201).json({ success: true, message: 'Rating submitted!' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/user/:userId', verifyToken, async (req, res) => {
  try {
    const [ratings] = await db.query(
      `SELECT r.*, u.name as rated_by_name FROM ratings r
       JOIN users u ON r.rated_by = u.id WHERE r.rated_user = ? ORDER BY r.created_at DESC`,
      [req.params.userId]
    );
    const avg = ratings.length > 0
      ? (ratings.reduce((s, r) => s + r.rating, 0) / ratings.length).toFixed(1) : null;
    res.json({ success: true, ratings, average_rating: avg, total: ratings.length });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
