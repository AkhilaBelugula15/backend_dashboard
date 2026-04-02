const jwt = require('jsonwebtoken');
const { get } = require('../db');
const secret = process.env.JWT_SECRET || 'finance-demo-secret';

const authenticate = async (req, res, next) => {
  const authHeader = req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization token' });
  }

  const token = authHeader.replace('Bearer ', '').trim();
  try {
    const payload = jwt.verify(token, secret);
    const user = await get('SELECT id, name, email, role, status FROM users WHERE id = ?', [payload.userId]);
    if (!user || user.status !== 'active') {
      return res.status(401).json({ error: 'Invalid or inactive user' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

const requireRole = (...allowedRoles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Forbidden: insufficient privileges' });
  }
  next();
};

module.exports = { authenticate, requireRole, secret };
