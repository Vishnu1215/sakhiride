const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken, isRider } = require('../middleware');
const https = require('https');

// Geocode a place name → { lat, lng } using Nominatim
function geocode(placeName) {
  return new Promise((resolve) => {
    const query = encodeURIComponent(placeName);
    const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1&countrycodes=in`;
    const options = { headers: { 'User-Agent': 'SakhiRide/1.0 (sakhiride@example.com)', 'Accept-Language': 'en' } };
    https.get(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.length > 0) resolve({ lat: parseFloat(json[0].lat), lng: parseFloat(json[0].lon) });
          else resolve(null);
        } catch { resolve(null); }
      });
    }).on('error', () => resolve(null));
  });
}

// Haversine formula — returns distance in km between two lat/lng points
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// Fare formula: base ₹25 + ₹14/km, minimum ₹40
function calcFare(distanceKm) {
  return Math.max(40, 25 + distanceKm * 14).toFixed(2);
}

router.post('/book', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'passenger')
      return res.status(403).json({ success: false, message: 'Only passengers can book rides' });
    const { pickup_location, dropoff_location, scheduled_time, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng } = req.body;
    if (!pickup_location || !dropoff_location)
      return res.status(400).json({ success: false, message: 'Pickup and dropoff locations required' });

    // Use coords from frontend if provided, else geocode the text
    let pLat = parseFloat(pickup_lat), pLng = parseFloat(pickup_lng);
    let dLat = parseFloat(dropoff_lat), dLng = parseFloat(dropoff_lng);

    if (!pLat || !pLng) { const g = await geocode(pickup_location); if (g) { pLat=g.lat; pLng=g.lng; } }
    if (!dLat || !dLng) { const g = await geocode(dropoff_location); if (g) { dLat=g.lat; dLng=g.lng; } }

    let distance_km, fare;
    if (pLat && pLng && dLat && dLng) {
      // Real straight-line distance × 1.35 road factor
      const straight = haversine(pLat, pLng, dLat, dLng);
      distance_km = (straight * 1.35).toFixed(2);
      fare = calcFare(parseFloat(distance_km));
    } else {
      // Geocoding failed — use a safe default short trip (3–5 km range)
      distance_km = (Math.random() * 2 + 3).toFixed(2);
      fare = calcFare(parseFloat(distance_km));
    }
    const [result] = await db.query(
      'INSERT INTO rides (passenger_id, pickup_location, dropoff_location, fare, distance_km, scheduled_time) VALUES (?, ?, ?, ?, ?, ?)',
      [req.user.id, pickup_location, dropoff_location, fare, distance_km, scheduled_time || null]
    );
    res.status(201).json({ success: true, message: 'Ride booked! Finding a rider...', ride: { id: result.insertId, pickup_location, dropoff_location, fare, distance_km, status: 'pending' } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/available', verifyToken, isRider, async (req, res) => {
  try {
    const [rides] = await db.query(
      `SELECT r.*, u.name as passenger_name, u.phone as passenger_phone
       FROM rides r JOIN users u ON r.passenger_id = u.id
       WHERE r.status = 'pending' AND r.rider_id IS NULL ORDER BY r.created_at DESC`
    );
    res.json({ success: true, rides });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Accept ride — generates 4-digit OTP
router.put('/:id/accept', verifyToken, isRider, async (req, res) => {
  try {
    const [rides] = await db.query('SELECT * FROM rides WHERE id = ? AND status = "pending"', [req.params.id]);
    if (rides.length === 0)
      return res.status(404).json({ success: false, message: 'Ride not found or already taken' });
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    await db.query('UPDATE rides SET rider_id = ?, status = "accepted", otp = ? WHERE id = ?', [req.user.id, otp, req.params.id]);
    res.json({ success: true, message: 'Ride accepted!', otp });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/:id/cancel', verifyToken, async (req, res) => {
  try {
    const [rides] = await db.query('SELECT * FROM rides WHERE id = ?', [req.params.id]);
    if (rides.length === 0)
      return res.status(404).json({ success: false, message: 'Ride not found' });
    const ride = rides[0];
    if (req.user.role === 'rider' && ride.status === 'accepted') {
      await db.query('UPDATE rides SET status = "pending", rider_id = NULL, otp = NULL WHERE id = ?', [req.params.id]);
      return res.json({ success: true, message: 'Ride released back to pool' });
    }
    await db.query('UPDATE rides SET status = "cancelled" WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Ride cancelled' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/:id/status', verifyToken, isRider, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['in_progress', 'completed'].includes(status))
      return res.status(400).json({ success: false, message: 'Invalid status' });
    await db.query('UPDATE rides SET status = ? WHERE id = ?', [status, req.params.id]);
    res.json({ success: true, message: `Status updated to ${status}` });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/my-rides', verifyToken, async (req, res) => {
  try {
    let query, params;
    if (req.user.role === 'passenger') {
      query = `SELECT r.*, u.name as rider_name, u.phone as rider_phone,
               rd.vehicle_type, rd.vehicle_number
               FROM rides r LEFT JOIN users u ON r.rider_id = u.id
               LEFT JOIN rider_details rd ON r.rider_id = rd.rider_id
               WHERE r.passenger_id = ? ORDER BY r.created_at DESC`;
      params = [req.user.id];
    } else {
      query = `SELECT r.*, u.name as passenger_name, u.phone as passenger_phone
               FROM rides r JOIN users u ON r.passenger_id = u.id
               WHERE r.rider_id = ? ORDER BY r.created_at DESC`;
      params = [req.user.id];
    }
    const [rides] = await db.query(query, params);
    res.json({ success: true, rides });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/payment/:id', verifyToken, async (req, res) => {
  try {
    const { payment_method } = req.body;
    await db.query('UPDATE rides SET payment_method = ?, payment_status = "paid" WHERE id = ?', [payment_method, req.params.id]);
    res.json({ success: true, message: 'Payment recorded!' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
