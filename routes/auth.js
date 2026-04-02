const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { body } = require('express-validator');
const { get } = require('../db');
const { validate } = require('../middleware/validation');
const { secret } = require('../middleware/auth');

const router = express.Router();

router.post(
  '/login',
  validate([
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isString().notEmpty().withMessage('Password is required'),
  ]),
  async (req, res) => {
    const { email, password } = req.body;
    const user = await get('SELECT id, email, password_hash, status, role, name FROM users WHERE email = ?', [email]);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    if (user.status !== 'active') {
      return res.status(403).json({ error: 'User is not active' });
    }
    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ userId: user.id }, secret, { expiresIn: '8h' });
    res.json({ token, user: { id: user.id, email: user.email, role: user.role, name: user.name } });
  }
);

module.exports = router;
