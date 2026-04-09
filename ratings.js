const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { verifyToken } = require('../middleware/auth');

// ✅ Add rating
router.post('/', verifyToken, async (req, res) => {
  try {
    const { ride_id, rating, review } = req.body;

    if (!ride_id || !rating) {
      return res.status(400).json({ success: false, message: 'Rating required' });
    }

    await db.query(
      'INSERT INTO ratings (ride_id, user_id, rating, review) VALUES (?, ?, ?, ?)',
      [ride_id, req.user.id, rating, review || '']
    );

    res.json({ success: true, message: 'Rating added' });

  } catch (err) {
    console.error('Rating error:', err);
    res.status(500).json({ success: false });
  }
});

// ✅ Get ratings for a ride
router.get('/:ride_id', verifyToken, async (req, res) => {
  try {
    const [ratings] = await db.query(
      'SELECT * FROM ratings WHERE ride_id = ?',
      [req.params.ride_id]
    );

    res.json({ success: true, ratings });

  } catch (err) {
    console.error('Get ratings error:', err);
    res.status(500).json({ success: false });
  }
});

module.exports = router;