const jwt = require('jsonwebtoken');
require('dotenv').config();

const verifyToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'Access token required' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'sakhi_secret');
    next();
  } catch (err) {
    return res.status(403).json({ success: false, message: 'Invalid or expired token' });
  }
};

const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin')
    return res.status(403).json({ success: false, message: 'Admin access required' });
  next();
};

const isRider = (req, res, next) => {
  if (req.user.role !== 'rider' && req.user.role !== 'admin')
    return res.status(403).json({ success: false, message: 'Rider access required' });
  next();
};

module.exports = { verifyToken, isAdmin, isRider };