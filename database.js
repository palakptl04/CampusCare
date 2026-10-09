const initSqlJs = require('sql.js');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'database', 'campus.db');

let db;

function saveDb() {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

function run(sql, params = []) {
  db.run(sql, params);
  saveDb();
}

function get(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row;
  }
  stmt.free();
  return null;
}

function all(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function lastInsertId() {
  return get('SELECT last_insert_rowid() as id').id;
}

async function initDatabase() {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // Users table
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL,
    dept_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Departments table
  db.run(`CREATE TABLE IF NOT EXISTS departments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Categories table
  db.run(`CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL
  )`);

  // Issues table
  db.run(`CREATE TABLE IF NOT EXISTS issues (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category_id INTEGER NOT NULL,
    location TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending',
    student_id INTEGER NOT NULL,
    assigned_to INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id),
    FOREIGN KEY (student_id) REFERENCES users(id),
    FOREIGN KEY (assigned_to) REFERENCES users(id)
  )`);

  // Seed departments
  const depts = ['Electrical Department', 'Civil & Infrastructure', 'Housekeeping & Cleanliness', 'IT & Classroom Equipment', 'Plumbing & Water Supply'];
  for (const d of depts) {
    const ex = get('SELECT id FROM departments WHERE name = ?', [d]);
    if (!ex) db.run('INSERT INTO departments (name) VALUES (?)', [d]);
  }

  // Seed categories
  const cats = ['Electrical', 'Cleanliness', 'Plumbing', 'Classroom Equipment', 'Infrastructure', 'Other'];
  for (const c of cats) {
    const ex = get('SELECT id FROM categories WHERE name = ?', [c]);
    if (!ex) db.run('INSERT INTO categories (name) VALUES (?)', [c]);
  }

  // Seed admin
  const admin = get('SELECT id FROM users WHERE email = ?', ['admin@campus.com']);
  if (!admin) {
    const hash = bcrypt.hashSync('admin123', 10);
    db.run('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)', ['Admin', 'admin@campus.com', hash, 'admin']);
  }

  // Seed default maintenance staff
  const staff = get('SELECT id FROM users WHERE email = ?', ['staff@campus.com']);
  if (!staff) {
    const elecDept = get('SELECT id FROM departments WHERE name = ?', ['Electrical Department']);
    const hash = bcrypt.hashSync('staff123', 10);
    db.run('INSERT INTO users (name, email, password, role, dept_id) VALUES (?, ?, ?, ?, ?)',
      ['Maintenance Staff', 'staff@campus.com', hash, 'maintenance', elecDept ? elecDept.id : null]);
  }

  saveDb();
  console.log('Database initialized');
}

module.exports = { initDatabase, run, get, all, lastInsertId };
