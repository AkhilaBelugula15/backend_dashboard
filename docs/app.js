const state = {
  token: localStorage.getItem('apiToken') || '',
  user: JSON.parse(localStorage.getItem('apiUser') || 'null'),
};

const api = async (path, options = {}) => {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  const response = await fetch(path, { ...options, headers });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || response.statusText || 'Request failed');
  }
  return response.json();
};

const setStatus = (message, type = 'info') => {
  const statusEl = document.querySelector('#status');
  statusEl.textContent = message;
  statusEl.className = type;
};

const renderAuth = () => {
  const authPanel = document.querySelector('#auth-panel');
  if (state.user) {
    authPanel.innerHTML = `
      <div class="status-box">
        <div><strong>Signed in as:</strong> ${state.user.name} (${state.user.role})</div>
        <button id="logoutBtn" class="button secondary">Logout</button>
      </div>
    `;
    document.querySelector('#logoutBtn').addEventListener('click', () => {
      state.token = '';
      state.user = null;
      localStorage.removeItem('apiToken');
      localStorage.removeItem('apiUser');
      renderAuth();
      setStatus('Logged out successfully.', 'info');
    });
  } else {
    authPanel.innerHTML = `
      <form id="loginForm" class="card form-card">
        <div class="form-row"><label>Email</label><input id="loginEmail" type="email" value="admin@finance.test" required /></div>
        <div class="form-row"><label>Password</label><input id="loginPassword" type="password" value="Admin123!" required /></div>
        <button type="submit" class="button primary">Login</button>
      </form>
    `;
    document.querySelector('#loginForm').addEventListener('submit', async (event) => {
      event.preventDefault();
      try {
        const email = document.querySelector('#loginEmail').value;
        const password = document.querySelector('#loginPassword').value;
        const body = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
        state.token = body.token;
        state.user = body.user;
        localStorage.setItem('apiToken', body.token);
        localStorage.setItem('apiUser', JSON.stringify(body.user));
        renderAuth();
        setStatus('Login successful. You can now call protected backend APIs.', 'success');
      } catch (error) {
        setStatus(error.message, 'error');
      }
    });
  }
};

const renderUsers = async () => {
  const list = document.querySelector('#usersList');
  list.innerHTML = '<div class="loading">Loading users...</div>';
  try {
    const data = await api('/users');
    if (data.users) {
      list.innerHTML = data.users.length
        ? data.users.map((user) => `<div class="table-row"><span>${user.id}</span><span>${user.name}</span><span>${user.email || '-'}</span><span>${user.role}</span><span>${user.status}</span></div>`).join('')
        : '<div class="empty">No users found.</div>';
    }
  } catch (error) {
    list.innerHTML = `<div class="empty">${error.message}</div>`;
  }
};

const renderRecords = async () => {
  const list = document.querySelector('#recordsList');
  list.innerHTML = '<div class="loading">Loading records...</div>';
  try {
    const data = await api('/records');
    if (data.records) {
      list.innerHTML = data.records.length
        ? data.records.map((record) => `<div class="table-row"><span>${record.id}</span><span>${record.category}</span><span>${record.type}</span><span>${record.amount}</span><span>${record.date}</span></div>`).join('')
        : '<div class="empty">No records available.</div>';
    }
  } catch (error) {
    list.innerHTML = `<div class="empty">${error.message}</div>`;
  }
};

const renderDashboard = async () => {
  const summaryEl = document.querySelector('#dashboardSummary');
  const trendsEl = document.querySelector('#dashboardTrends');
  summaryEl.innerHTML = '<div class="loading">Loading summary...</div>';
  trendsEl.innerHTML = '<div class="loading">Loading trends...</div>';
  try {
    const data = await api('/dashboard/summary');
    summaryEl.innerHTML = `
      <div class="metric"><strong>Total income</strong><span>$${data.totalIncome.toFixed(2)}</span></div>
      <div class="metric"><strong>Total expenses</strong><span>$${data.totalExpenses.toFixed(2)}</span></div>
      <div class="metric"><strong>Net balance</strong><span>$${data.netBalance.toFixed(2)}</span></div>
      <div class="metric"><strong>Recent activity</strong></div>
      ${data.recentActivity.map((item) => `<div class="activity-row">${item.date} · ${item.category} · ${item.type} · $${item.amount}</div>`).join('')}
    `;
    const trends = await api('/dashboard/trends');
    trendsEl.innerHTML = trends.trends.length
      ? trends.trends.map((month) => `<div class="trend-row"><span>${month.month}</span><span>Income $${month.income.toFixed(2)}</span><span>Expense $${month.expense.toFixed(2)}</span></div>`).join('')
      : '<div class="empty">No trend data.</div>';
  } catch (error) {
    summaryEl.innerHTML = `<div class="empty">${error.message}</div>`;
    trendsEl.innerHTML = `<div class="empty">${error.message}</div>`;
  }
};

const activateTab = (tabId) => {
  document.querySelectorAll('.tab-button').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });
  document.querySelectorAll('.tab-panel').forEach((panel) => {
    panel.style.display = panel.id === tabId ? 'block' : 'none';
  });
};

window.addEventListener('load', () => {
  renderAuth();
  activateTab('tab-users');

  document.querySelectorAll('.tab-button').forEach((button) => {
    button.addEventListener('click', () => {
      activateTab(button.dataset.tab);
      if (button.dataset.tab === 'tab-users') renderUsers();
      if (button.dataset.tab === 'tab-records') renderRecords();
      if (button.dataset.tab === 'tab-dashboard') renderDashboard();
    });
  });

  document.querySelector('#refreshUsers').addEventListener('click', renderUsers);
  document.querySelector('#refreshRecords').addEventListener('click', renderRecords);
  document.querySelector('#refreshDashboard').addEventListener('click', renderDashboard);
});
