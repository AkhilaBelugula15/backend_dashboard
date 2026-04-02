const express = require('express');
const { body, param, query } = require('express-validator');
const { authenticate, requireRole } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { get, all, run } = require('../db');

const router = express.Router();

router.use(authenticate);

router.get(
  '/',
  requireRole('analyst', 'admin'),
  validate([
    query('type').optional().isIn(['income', 'expense']),
    query('category').optional().isString().trim(),
    query('startDate').optional().isISO8601().toDate(),
    query('endDate').optional().isISO8601().toDate(),
  ]),
  async (req, res) => {
    const { type, category, startDate, endDate } = req.query;
    const filters = ['deleted_at IS NULL'];
    const params = [];
    if (type) {
      filters.push('type = ?');
      params.push(type);
    }
    if (category) {
      filters.push('category = ?');
      params.push(category);
    }
    if (startDate) {
      filters.push('date >= ?');
      params.push(startDate.toISOString().split('T')[0]);
    }
    if (endDate) {
      filters.push('date <= ?');
      params.push(endDate.toISOString().split('T')[0]);
    }
    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const records = await all(
      `SELECT id, amount, type, category, date, description, created_by, created_at, updated_at FROM records ${whereClause} ORDER BY date DESC, created_at DESC`,
      params
    );
    res.json({ records });
  }
);

router.get('/:id', requireRole('analyst', 'admin'), validate([param('id').isInt()]), async (req, res) => {
  const { id } = req.params;
  const record = await get(
    'SELECT id, amount, type, category, date, description, created_by, created_at, updated_at FROM records WHERE id = ? AND deleted_at IS NULL',
    [id]
  );
  if (!record) {
    return res.status(404).json({ error: 'Record not found' });
  }
  res.json(record);
});

router.post(
  '/',
  requireRole('admin'),
  validate([
    body('amount').isFloat({ gt: 0 }).withMessage('Amount must be greater than zero'),
    body('type').isIn(['income', 'expense']).withMessage('Type must be income or expense'),
    body('category').isString().notEmpty().withMessage('Category is required'),
    body('date').isISO8601().withMessage('Date must be valid'),
    body('description').optional().isString(),
  ]),
  async (req, res) => {
    const { amount, type, category, date, description } = req.body;
    const result = await run(
      'INSERT INTO records (amount, type, category, date, description, created_by) VALUES (?, ?, ?, ?, ?, ?)',
      [amount, type, category, date, description || null, req.user.id]
    );
    const record = await get(
      'SELECT id, amount, type, category, date, description, created_by, created_at, updated_at FROM records WHERE id = ?',
      [result.lastID]
    );
    res.status(201).json(record);
  }
);

router.put(
  '/:id',
  requireRole('admin'),
  validate([
    param('id').isInt(),
    body('amount').optional().isFloat({ gt: 0 }).withMessage('Amount must be greater than zero'),
    body('type').optional().isIn(['income', 'expense']),
    body('category').optional().isString().notEmpty(),
    body('date').optional().isISO8601(),
    body('description').optional().isString(),
  ]),
  async (req, res) => {
    const { id } = req.params;
    const record = await get('SELECT id FROM records WHERE id = ? AND deleted_at IS NULL', [id]);
    if (!record) {
      return res.status(404).json({ error: 'Record not found' });
    }

    const updates = [];
    const params = [];
    const { amount, type, category, date, description } = req.body;
    if (amount !== undefined) {
      updates.push('amount = ?');
      params.push(amount);
    }
    if (type) {
      updates.push('type = ?');
      params.push(type);
    }
    if (category) {
      updates.push('category = ?');
      params.push(category);
    }
    if (date) {
      updates.push('date = ?');
      params.push(date);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description);
    }
    if (!updates.length) {
      return res.status(400).json({ error: 'No fields provided to update' });
    }
    updates.push('updated_at = datetime("now")');
    params.push(id);
    await run(`UPDATE records SET ${updates.join(', ')} WHERE id = ?`, params);
    const updated = await get('SELECT id, amount, type, category, date, description, created_by, created_at, updated_at FROM records WHERE id = ?', [id]);
    res.json(updated);
  }
);

router.delete('/:id', requireRole('admin'), validate([param('id').isInt()]), async (req, res) => {
  const { id } = req.params;
  const record = await get('SELECT id FROM records WHERE id = ? AND deleted_at IS NULL', [id]);
  if (!record) {
    return res.status(404).json({ error: 'Record not found' });
  }
  await run('UPDATE records SET deleted_at = datetime("now") WHERE id = ?', [id]);
  res.status(204).send();
});

module.exports = router;
