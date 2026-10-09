# 🏫 Campus Issue Reporting & Resolution System

A simple web-based system for reporting and resolving campus issues.
Built with **Node.js + Express + SQLite** — no heavy setup required!

---

## 📁 Project Structure

```
campus-issue-tracker/
├── server.js          → Main backend (Express server + all API routes)
├── database.js        → SQLite setup & seed data
├── package.json       → Dependencies
├── database/
│   └── campus.db      → Auto-created on first run
└── public/
    ├── index.html             → Landing page (role selector)
    ├── css/style.css          → Shared styles
    ├── student/
    │   ├── register.html      → Student registration
    │   ├── login.html         → Student login
    │   └── dashboard.html     → Submit & track issues
    ├── admin/
    │   ├── login.html         → Admin login
    │   └── dashboard.html     → View all issues + assign staff
    └── maintenance/
        ├── login.html         → Maintenance staff login
        └── dashboard.html     → View assigned issues + update status
```

---

## ⚙️ Setup & Run

### Prerequisites
- Node.js (v16 or higher) — Download from https://nodejs.org

### Steps

```bash
# 1. Navigate to the project folder
cd campus-issue-tracker

# 2. Install dependencies
npm install

# 3. Start the server
node server.js
```

### Open in Browser
```
http://localhost:3000
```

---

## 👤 Default Login Credentials

| Role        | Email              | Password  |
|-------------|--------------------|-----------|
| Admin       | admin@campus.com   | admin123  |
| Maintenance | staff@campus.com   | staff123  |
| Student     | Register yourself  | —         |

---

## 🔄 How It Works

```
1. Student registers and logs in
2. Student submits a campus issue (title, category, location, description)
3. Admin logs in → sees all issues → assigns to maintenance staff
4. Maintenance staff logs in → sees assigned issues → updates status
   (In Progress → Resolved)
5. Student can check status anytime on their dashboard
```

---

## 📦 Dependencies

| Package          | Purpose                        |
|------------------|--------------------------------|
| express          | Web server & routing           |
| better-sqlite3   | SQLite database (zero setup)   |
| bcryptjs         | Password hashing               |
| express-session  | Login session management       |

---

## 🗄️ Database Tables

### `users`
| Column     | Type    | Description                          |
|------------|---------|--------------------------------------|
| id         | INTEGER | Primary key                          |
| name       | TEXT    | Full name                            |
| email      | TEXT    | Unique email                         |
| password   | TEXT    | Bcrypt hashed password               |
| role       | TEXT    | student / admin / maintenance        |

### `issues`
| Column      | Type    | Description                         |
|-------------|---------|-------------------------------------|
| id          | INTEGER | Primary key                         |
| title       | TEXT    | Short issue title                   |
| description | TEXT    | Detailed description                |
| category    | TEXT    | Electrical, Cleanliness, etc.       |
| location    | TEXT    | Where the issue is                  |
| status      | TEXT    | Pending / In Progress / Resolved    |
| student_id  | INTEGER | FK → users (who reported)           |
| assigned_to | INTEGER | FK → users (maintenance staff)      |
| created_at  | DATETIME| Timestamp                           |

---

## 🌐 API Endpoints

| Method | Endpoint                  | Role        | Description            |
|--------|---------------------------|-------------|------------------------|
| POST   | /api/register             | Student     | Register new account   |
| POST   | /api/login                | All         | Login                  |
| POST   | /api/logout               | All         | Logout                 |
| GET    | /api/me                   | All         | Current session info   |
| POST   | /api/issues               | Student     | Submit an issue        |
| GET    | /api/issues/mine          | Student     | Get my issues          |
| GET    | /api/issues/all           | Admin       | Get all issues         |
| GET    | /api/staff                | Admin       | Get maintenance staff  |
| PUT    | /api/issues/:id/assign    | Admin       | Assign issue to staff  |
| GET    | /api/issues/assigned      | Maintenance | Get assigned issues    |
| PUT    | /api/issues/:id/status    | Maintenance | Update issue status    |

---

*Mini Project — Design Engineering Subject*
