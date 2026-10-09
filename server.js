require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const path = require('path');
const { initDatabase, run, get, all, lastInsertId } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

function requireLogin(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: 'Not logged in' });
  next();
}
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.session.user || !roles.includes(req.session.user.role))
      return res.status(403).json({ error: 'Access denied' });
    next();
  };
}

// ── AUTH ──────────────────────────────────────────
app.post('/api/register', (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'All fields are required' });
  const exists = get('SELECT id FROM users WHERE email = ?', [email]);
  if (exists) return res.status(400).json({ error: 'Email already registered' });
  const hash = bcrypt.hashSync(password, 10);
  run('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)', [name, email, hash, 'student']);
  res.json({ success: true });
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  const user = get('SELECT * FROM users WHERE email = ?', [email]);
  if (!user || !bcrypt.compareSync(password, user.password))
    return res.status(401).json({ error: 'Invalid email or password' });
  req.session.user = { id: user.id, name: user.name, email: user.email, role: user.role };
  res.json({ success: true, role: user.role, name: user.name });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

app.get('/api/me', (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Not logged in' });
  res.json(req.session.user);
});

// ── CATEGORIES ────────────────────────────────────
app.get('/api/categories', (req, res) => {
  const cats = all('SELECT * FROM categories ORDER BY name');
  res.json(cats);
});

// ── DEPARTMENTS ───────────────────────────────────
app.get('/api/departments', requireLogin, requireRole('admin'), (req, res) => {
  const depts = all('SELECT * FROM departments ORDER BY name');
  res.json(depts);
});

app.post('/api/departments/add', requireLogin, requireRole('admin'), (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Department name is required' });
  const exists = get('SELECT id FROM departments WHERE name = ?', [name.trim()]);
  if (exists) return res.status(400).json({ error: 'Department already exists' });
  run('INSERT INTO departments (name) VALUES (?)', [name.trim()]);
  const id = lastInsertId();
  res.json({ success: true, id });
});

app.delete('/api/departments/:id', requireLogin, requireRole('admin'), (req, res) => {
  run('UPDATE users SET dept_id = NULL WHERE dept_id = ?', [req.params.id]);
  run('DELETE FROM departments WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

// ── STAFF ─────────────────────────────────────────
app.get('/api/staff', requireLogin, requireRole('admin'), (req, res) => {
  const staff = all(`
    SELECT u.id, u.name, u.email, u.created_at, u.dept_id, d.name as dept_name
    FROM users u
    LEFT JOIN departments d ON u.dept_id = d.id
    WHERE u.role = 'maintenance'
    ORDER BY u.name
  `);
  res.json(staff);
});

app.post('/api/staff/add', requireLogin, requireRole('admin'), (req, res) => {
  const { name, email, password, dept_id } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Name, email and password are required' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  const exists = get('SELECT id FROM users WHERE email = ?', [email]);
  if (exists) return res.status(400).json({ error: 'Email already registered' });
  const hash = bcrypt.hashSync(password, 10);
  run('INSERT INTO users (name, email, password, role, dept_id) VALUES (?, ?, ?, ?, ?)',
    [name, email, hash, 'maintenance', dept_id || null]);
  res.json({ success: true });
});

app.put('/api/staff/:id/department', requireLogin, requireRole('admin'), (req, res) => {
  const { dept_id } = req.body;
  run('UPDATE users SET dept_id = ? WHERE id = ? AND role = ?', [dept_id || null, req.params.id, 'maintenance']);
  res.json({ success: true });
});

// ── ISSUES ────────────────────────────────────────
app.post('/api/issues', requireLogin, requireRole('student'), (req, res) => {
  const { title, description, category_id, location } = req.body;
  if (!title || !description || !category_id || !location)
    return res.status(400).json({ error: 'All fields are required' });
  run('INSERT INTO issues (title, description, category_id, location, student_id) VALUES (?, ?, ?, ?, ?)',
    [title, description, category_id, location, req.session.user.id]);
  const id = lastInsertId();
  res.json({ success: true, id });
});

app.get('/api/issues/mine', requireLogin, requireRole('student'), (req, res) => {
  const issues = all(`
    SELECT i.*, c.name as category_name, u.name as assigned_name, d.name as dept_name
    FROM issues i
    JOIN categories c ON i.category_id = c.id
    LEFT JOIN users u ON i.assigned_to = u.id
    LEFT JOIN departments d ON u.dept_id = d.id
    WHERE i.student_id = ?
    ORDER BY i.created_at DESC
  `, [req.session.user.id]);
  res.json(issues);
});

app.get('/api/issues/all', requireLogin, requireRole('admin'), (req, res) => {
  const issues = all(`
    SELECT i.*, c.name as category_name,
           s.name as student_name,
           m.name as assigned_name,
           d.name as dept_name
    FROM issues i
    JOIN categories c ON i.category_id = c.id
    JOIN users s ON i.student_id = s.id
    LEFT JOIN users m ON i.assigned_to = m.id
    LEFT JOIN departments d ON m.dept_id = d.id
    ORDER BY i.created_at DESC
  `);
  res.json(issues);
});

app.put('/api/issues/:id/assign', requireLogin, requireRole('admin'), (req, res) => {
  const { staffId } = req.body;
  run("UPDATE issues SET assigned_to = ?, status = 'In Progress', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    [staffId, req.params.id]);
  res.json({ success: true });
});

app.get('/api/issues/assigned', requireLogin, requireRole('maintenance'), (req, res) => {
  const issues = all(`
    SELECT i.*, c.name as category_name, s.name as student_name
    FROM issues i
    JOIN categories c ON i.category_id = c.id
    JOIN users s ON i.student_id = s.id
    WHERE i.assigned_to = ?
    ORDER BY i.created_at DESC
  `, [req.session.user.id]);
  res.json(issues);
});

app.put('/api/issues/:id/status', requireLogin, requireRole('maintenance'), (req, res) => {
  const { status } = req.body;
  if (!['In Progress', 'Resolved'].includes(status))
    return res.status(400).json({ error: 'Invalid status' });
  run('UPDATE issues SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND assigned_to = ?',
    [status, req.params.id, req.session.user.id]);
  res.json({ success: true });
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

initDatabase().then(() => {
  app.listen(PORT, () => console.log('Campus Issue Tracker running at http://localhost:' + PORT));
});
