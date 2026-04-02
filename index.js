const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const { init } = require('./db');
const authRouter = require('./routes/auth');
const usersRouter = require('./routes/users');
const recordsRouter = require('./routes/records');
const dashboardRouter = require('./routes/dashboard');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRouter);
app.use('/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/users', usersRouter);
app.use('/api/records', recordsRouter);
app.use('/records', recordsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/dashboard', dashboardRouter);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'An unexpected error occurred' });
});

const PORT = process.env.PORT || 4000;
init()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Finance dashboard backend running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Database initialization failed', error);
    process.exit(1);
  });
