const express = require('express');
const { authenticate } = require('../middleware/auth');
const { all, get } = require('../db');

const router = express.Router();
router.use(authenticate);

router.get('/summary', async (req, res) => {
  const totals = await all(
    `SELECT type, SUM(amount) AS total
     FROM records
     WHERE deleted_at IS NULL
     GROUP BY type`
  );

  const categoryTotals = await all(
    `SELECT category, SUM(amount) AS total
     FROM records
     WHERE deleted_at IS NULL
     GROUP BY category
     ORDER BY total DESC
     LIMIT 10`
  );

  const recentActivity = await all(
    `SELECT id, amount, type, category, date, description, created_at
     FROM records
     WHERE deleted_at IS NULL
     ORDER BY date DESC, created_at DESC
     LIMIT 5`
  );

  const incomeTotal = totals.find((item) => item.type === 'income')?.total || 0;
  const expenseTotal = totals.find((item) => item.type === 'expense')?.total || 0;

  res.json({
    totalIncome: incomeTotal,
    totalExpenses: expenseTotal,
    netBalance: incomeTotal - expenseTotal,
    categoryTotals: categoryTotals.map((item) => ({ category: item.category, total: item.total })),
    recentActivity,
  });
});

router.get('/trends', async (req, res) => {
  const trends = await all(
    `SELECT strftime('%Y-%m', date) AS month,
      SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS income,
      SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS expense
     FROM records
     WHERE deleted_at IS NULL
       AND date >= date('now', '-5 months')
     GROUP BY month
     ORDER BY month ASC`
  );

  res.json({ trends });
});

module.exports = router;
