const express = require('express');
const router = express.Router();
const db = require('./db');
const { verifyToken } = require('./middleware');

// Save emergency contact
router.put('/emergency-contact', verifyToken, async (req, res) => {
  try {
    const { emergency_contact_name, emergency_contact_phone } = req.body;
    if (!emergency_contact_name || !emergency_contact_phone)
      return res.status(400).json({ success: false, message: 'Name and phone required' });

    await db.query(
      'UPDATE users SET emergency_contact_name=?, emergency_contact_phone=? WHERE id=?',
      [emergency_contact_name, emergency_contact_phone, req.user.id]
    );
    res.json({ success: true, message: 'Emergency contact saved!' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get emergency contact
router.get('/emergency-contact', verifyToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT emergency_contact_name, emergency_contact_phone FROM users WHERE id=?',
      [req.user.id]
    );
    res.json({ success: true, contact: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;