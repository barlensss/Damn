const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const USERS_FILE = path.join(__dirname, 'users.json');

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// ---- Helper JSON ----
function readUsers() {
  const data = fs.readFileSync(USERS_FILE, 'utf-8');
  return JSON.parse(data);
}
function writeUsers(data) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(data, null, 2));
}

// ---- REGISTER (unlimited) ----
app.post('/api/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ ok: false, msg: 'Isi semua field' });

  const db = readUsers();
  const exists = db.users.find(u => u.username.toLowerCase() === username.toLowerCase());
  if (exists) return res.status(400).json({ ok: false, msg: 'Username sudah terdaftar' });

  const newUser = {
    id: db.users.length ? Math.max(...db.users.map(u => u.id)) + 1 : 1,
    username,
    password,
    role: 'User',
    createdAt: new Date().toISOString()
  };
  db.users.push(newUser);
  writeUsers(db);

  res.json({ ok: true, msg: 'Berhasil daftar', user: { id: newUser.id, username, role: newUser.role } });
});

// ---- LOGIN ----
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const db = readUsers();
  const user = db.users.find(
    u => u.username.toLowerCase() === (username || '').toLowerCase() && u.password === password
  );
  if (!user) return res.status(401).json({ ok: false, msg: 'Username / password salah' });

  res.json({
    ok: true,
    user: { id: user.id, username: user.username, role: user.role }
  });
});

// ---- GET ALL USERS (untuk dashboard CEO/Mod) ----
app.get('/api/users', (req, res) => {
  const { requester } = req.query; // username requester
  const db = readUsers();
  const reqUser = db.users.find(u => u.username === requester);

  if (!reqUser) return res.status(403).json({ ok: false, msg: 'Akses ditolak' });
  if (reqUser.role !== 'CEO' && reqUser.role !== 'Moderator') {
    return res.status(403).json({ ok: false, msg: 'Hanya CEO/Moderator' });
  }

  res.json({ ok: true, users: db.users });
});

// ---- UBAH ROLE (hanya CEO) ----
app.post('/api/set-role', (req, res) => {
  const { requester, targetId, newRole } = req.body;
  const db = readUsers();
  const reqUser = db.users.find(u => u.username === requester);

  if (!reqUser || reqUser.role !== 'CEO') {
    return res.status(403).json({ ok: false, msg: 'Hanya CEO yang bisa ubah role' });
  }
  if (!['CEO', 'Moderator', 'User'].includes(newRole)) {
    return res.status(400).json({ ok: false, msg: 'Role tidak valid' });
  }
  const target = db.users.find(u => u.id === targetId);
  if (!target) return res.status(404).json({ ok: false, msg: 'User tidak ditemukan' });

  target.role = newRole;
  writeUsers(db);
  res.json({ ok: true, msg: `Role ${target.username} → ${newRole}` });
});

// ---- HAPUS USER (hanya CEO) ----
app.post('/api/delete-user', (req, res) => {
  const { requester, targetId } = req.body;
  const db = readUsers();
  const reqUser = db.users.find(u => u.username === requester);
  if (!reqUser || reqUser.role !== 'CEO') {
    return res.status(403).json({ ok: false, msg: 'Hanya CEO' });
  }
  const before = db.users.length;
  db.users = db.users.filter(u => u.id !== targetId);
  writeUsers(db);
  res.json({ ok: true, msg: `User dihapus (${before - db.users.length})` });
});

// ---- Fallback ----
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server jalan di http://localhost:${PORT}`);
});
