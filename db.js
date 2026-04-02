const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.resolve(__dirname, '../data.db');
const db = new sqlite3.Database(dbPath);

const run = (sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function (err) {
    if (err) return reject(err);
    resolve(this);
  });
});

const get = (sql, params = []) => new Promise((resolve, reject) => {
  db.get(sql, params, (err, row) => {
    if (err) return reject(err);
    resolve(row);
  });
});

const all = (sql, params = []) => new Promise((resolve, reject) => {
  db.all(sql, params, (err, rows) => {
    if (err) return reject(err);
    resolve(rows);
  });
});

const init = async () => {
  await run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL CHECK(role IN ('viewer','analyst','admin')),
    status TEXT NOT NULL CHECK(status IN ('active','inactive')) DEFAULT 'active',
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);

  await run(`CREATE TABLE IF NOT EXISTS records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    amount REAL NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('income','expense')),
    category TEXT NOT NULL,
    date TEXT NOT NULL,
    description TEXT,
    created_by INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT,
    deleted_at TEXT,
    FOREIGN KEY (created_by) REFERENCES users(id)
  )`);

  const passwordHash = bcrypt.hashSync('AKHILA123', 10);
  const admin = await get('SELECT id FROM users WHERE email = ?', ['belugulaakhilanaidu@gmail.com']);
  if (!admin) {
    const existingAdmin = await get('SELECT id FROM users WHERE role = ? LIMIT 1', ['admin']);
    if (existingAdmin) {
      await run(
        'UPDATE users SET email = ?, password_hash = ? WHERE id = ?',
        ['belugulaakhilanaidu@gmail.com', passwordHash, existingAdmin.id]
      );
      console.log('Updated existing admin credentials to belugulaakhilanaidu@gmail.com / AKHILA123');
    } else {
      await run(
        'INSERT INTO users (name, email, role, status, password_hash) VALUES (?, ?, ?, ?, ?)',
        ['Default Admin', 'belugulaakhilanaidu@gmail.com', 'admin', 'active', passwordHash]
      );
      console.log('Seeded default admin user: belugulaakhilanaidu@gmail.com / AKHILA123');
    }
  }
};

module.exports = {
  db,
  run,
  get,
  all,
  init,
};
