let currentUser = null;

const $ = id => document.getElementById(id);

function show(screen) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  $(screen).classList.add('active');
}

function setMsg(el, text, ok) {
  const e = $(el);
  e.textContent = text;
  e.className = 'msg ' + (ok ? 'ok' : 'err');
}

// ===== TABS =====
$('tabLogin').onclick = () => {
  $('tabLogin').classList.add('active');
  $('tabRegister').classList.remove('active');
  $('formLogin').classList.add('active');
  $('formRegister').classList.remove('active');
};
$('tabRegister').onclick = () => {
  $('tabRegister').classList.add('active');
  $('tabLogin').classList.remove('active');
  $('formRegister').classList.add('active');
  $('formLogin').classList.remove('active');
};

// ===== REGISTER =====
$('formRegister').onsubmit = async (e) => {
  e.preventDefault();
  const username = $('regUser').value.trim();
  const password = $('regPass').value.trim();

  const r = await fetch('/api/register', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ username, password })
  });
  const d = await r.json();

  if (d.ok) {
    setMsg('authMsg', '✅ Berhasil daftar! Silakan login.', true);
    $('formRegister').reset();
    $('tabLogin').click();
  } else {
    setMsg('authMsg', '❌ ' + d.msg, false);
  }
};

// ===== LOGIN =====
$('formLogin').onsubmit = async (e) => {
  e.preventDefault();
  const username = $('loginUser').value.trim();
  const password = $('loginPass').value.trim();

  const r = await fetch('/api/login', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ username, password })
  });
  const d = await r.json();

  if (d.ok) {
    currentUser = d.user;
    enterPortfolio();
  } else {
    setMsg('authMsg', '❌ ' + d.msg, false);
  }
};

// ===== MASUK PORTFOLIO =====
function enterPortfolio() {
  $('userBadge').textContent = `👤 ${currentUser.username} • ${currentUser.role}`;
  $('heroName').textContent = currentUser.username.split('@')[0].toUpperCase();
  show('portfolioScreen');
}

// ===== LOGOUT =====
$('btnLogout').onclick = () => {
  currentUser = null;
  $('formLogin').reset();
  $('formRegister').reset();
  $('authMsg').textContent = '';
  show('authScreen');
};

// ===== BUKA DASHBOARD =====
$('btnDashboard').onclick = async () => {
  $('dashBadge').textContent = `👤 ${currentUser.username} • ${currentUser.role}`;
  $('dashInfo').textContent =
    (currentUser.role === 'CEO' || currentUser.role === 'Moderator')
      ? 'Kamu bisa melihat semua akun (username, password, role)'
      : 'Kamu hanya bisa melihat akun kamu sendiri';

  $('roleTools').style.display = currentUser.role === 'CEO' ? 'block' : 'none';

  await loadUsers();
  show('dashboardScreen');
};

$('btnBack').onclick = () => show('portfolioScreen');

// ===== LOAD USERS =====
async function loadUsers() {
  const r = await fetch('/api/users?requester=' + encodeURIComponent(currentUser.username));
  const d = await r.json();
  const list = $('userList');
  list.innerHTML = '';

  if (!d.ok) {
    list.innerHTML = `<div class="msg err">${d.msg}</div>`;
    return;
  }

  d.users.forEach(u => {
    const item = document.createElement('div');
    item.className = 'user-item';
    item.innerHTML = `
      <span class="uid">#${u.id}</span>
      <span class="uname">${u.username}</span>
      <span class="urole role-${u.role}">${u.role}</span>
    `;
    item.onclick = () => {
      const detail = document.createElement('div');
      detail.className = 'user-detail';
      detail.innerHTML = `
        <b>ID:</b> ${u.id}<br/>
        <b>Username:</b> ${u.username}<br/>
        <b>Password:</b> ${u.password}<br/>
        <b>Role:</b> ${u.role}<br/>
        <b>Dibuat:</b> ${new Date(u.createdAt).toLocaleString('id-ID')}
      `;
      const old = document.querySelector('.user-detail');
      if (old) old.remove();
      item.after(detail);
    };
    list.appendChild(item);
  });

  $('dashMsg').textContent = `Total akun: ${d.users.length}`;
  $('dashMsg').className = 'msg ok';
}

// ===== UBAH ROLE (CEO) =====
$('btnSetRole').onclick = async () => {
  const targetId = parseInt($('roleTargetId').value);
  const newRole = $('roleSelect').value;

  if (!targetId) return setMsg('dashMsg', 'Masukkan ID user', false);

  const r = await fetch('/api/set-role', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ requester: currentUser.username, targetId, newRole })
  });
  const d = await r.json();
  setMsg('dashMsg', d.ok ? '✅ ' + d.msg : '❌ ' + d.msg, d.ok);

  if (d.ok) loadUsers();
};
