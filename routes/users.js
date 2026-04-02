const express = require('express');
const bcrypt = require('bcryptjs');
const { body, param, query } = require('express-validator');
const { get, all, run } = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');
const { validate } = require('../middleware/validation');

const router = express.Router();

router.use(authenticate);

router.post(
  '/',
  requireRole('admin'),
  validate([
    body('name').isString().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isString().isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('role').isIn(['viewer', 'analyst', 'admin']).withMessage('Role must be viewer, analyst, or admin'),
    body('status').optional().isIn(['active', 'inactive']).withMessage('Status must be active or inactive'),
  ]),
  async (req, res) => {
    const { name, email, password, role, status = 'active' } = req.body;
    const passwordHash = bcrypt.hashSync(password, 10);
    try {
      const result = await run(
        'INSERT INTO users (name, email, role, status, password_hash) VALUES (?, ?, ?, ?, ?)',
        [name, email, role, status, passwordHash]
      );
      const user = await get('SELECT id, name, email, role, status, created_at FROM users WHERE id = ?', [result.lastID]);
      res.status(201).json(user);
    } catch (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ error: 'Email already exists' });
      }
      console.error(err);
      res.status(500).json({ error: 'Unable to create user' });
    }
  }
);

router.get(
  '/',
  requireRole('admin'),
  validate([
    query('role').optional().isIn(['viewer', 'analyst', 'admin']),
    query('status').optional().isIn(['active', 'inactive']),
  ]),
  async (req, res) => {
    const { role, status } = req.query;
    const filters = [];
    const params = [];
    if (role) {
      filters.push('role = ?');
      params.push(role);
    }
    if (status) {
      filters.push('status = ?');
      params.push(status);
    }
    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const users = await all(`SELECT id, name, email, role, status, created_at FROM users ${whereClause} ORDER BY created_at DESC`, params);
    res.json({ users });
  }
);

router.get('/:id', authenticate, validate([param('id').isInt()]), async (req, res) => {
  const { id } = req.params;
  if (req.user.role !== 'admin' && req.user.id !== Number(id)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const user = await get('SELECT id, name, email, role, status, created_at FROM users WHERE id = ?', [id]);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json(user);
});

router.patch(
  '/:id',
  requireRole('admin'),
  validate([
    param('id').isInt(),
    body('name').optional().isString().notEmpty(),
    body('email').optional().isEmail(),
    body('password').optional().isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('role').optional().isIn(['viewer', 'analyst', 'admin']),
    body('status').optional().isIn(['active', 'inactive']),
  ]),
  async (req, res) => {
    const { id } = req.params;
    const updates = [];
    const params = [];
    const { name, email, password, role, status } = req.body;
    if (name) {
      updates.push('name = ?');
      params.push(name);
    }
    if (email) {
      updates.push('email = ?');
      params.push(email);
    }
    if (password) {
      updates.push('password_hash = ?');
      params.push(bcrypt.hashSync(password, 10));
    }
    if (role) {
      updates.push('role = ?');
      params.push(role);
    }
    if (status) {
      updates.push('status = ?');
      params.push(status);
    }
    if (!updates.length) {
      return res.status(400).json({ error: 'No update fields provided' });
    }
    params.push(id);
    try {
      await run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
      const user = await get('SELECT id, name, email, role, status, created_at FROM users WHERE id = ?', [id]);
      res.json(user);
    } catch (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ error: 'Email already exists' });
      }
      console.error(err);
      res.status(500).json({ error: 'Unable to update user' });
    }
  }
);

router.delete('/:id', requireRole('admin'), validate([param('id').isInt()]), async (req, res) => {
  const { id } = req.params;
  const user = await get('SELECT id FROM users WHERE id = ?', [id]);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  await run('DELETE FROM users WHERE id = ?', [id]);
  res.status(204).send();
});

module.exports = router;
