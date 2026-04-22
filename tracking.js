const express = require('express');
const router = express.Router();

const liveLocations = {};

router.post('/update', (req, res) => {
  const { ride_id, lat, lng } = req.body;

  liveLocations[ride_id] = {
    lat: parseFloat(lat),
    lng: parseFloat(lng),
    driver_name: 'Driver',
    updated_at: new Date()
  };

  res.json({ success: true });
});

router.get('/location/:ride_id', (req, res) => {
  const loc = liveLocations[req.params.ride_id];
  if (!loc) return res.json({ lat: null, lng: null });
  res.json(loc);
});

module.exports = router;