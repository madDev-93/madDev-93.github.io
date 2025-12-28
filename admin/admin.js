// Qwota Admin Dashboard

// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyArp2sE2b3x8QlG1ZwIcIsarMKKy105Mh4",
  authDomain: "qwota-ai-coach.firebaseapp.com",
  projectId: "qwota-ai-coach",
  storageBucket: "qwota-ai-coach.firebasestorage.app",
  messagingSenderId: "7410395296",
  appId: "1:7410395296:ios:c1f8226448e674a06081c5"
};

const ADMIN_UID = "DEPKKHJMilcoJmSnKxb3UxFc5Is2";
const ITEMS_PER_PAGE = 20;

// AI Cost estimates (per request) - Google Gemini 2.0 Flash
// ~1000 input tokens, ~500 output tokens per request
// Input: $0.10/1M tokens, Output: $0.40/1M tokens
const AI_COSTS = {
  meal_scan: 0.002,     // Vision + text ~$0.002
  text_analysis: 0.0003, // Text only ~$0.0003
  coach_insight: 0.0005  // Text (longer output) ~$0.0005
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const functions = firebase.functions();

// State
let allUsers = [];
let allActivity = [];
let allNotificationLogs = [];
let allErrorLogs = [];
let allDailyReviewLogs = [];
let stats = null;
let currentSection = 'overview';
let userFilter = 'all';
let activityFilter = 'all-activity';
let notifFilter = 'all';
let errorFilter = 'all';
let reviewFilter = 'all';
let userSearch = '';
let notifSearch = '';
let errorSearch = '';
let reviewSearch = '';
let usersPage = 1;
let activityPage = 1;
let notifPage = 1;
let errorPage = 1;
let reviewPage = 1;
let userSortField = 'lastActive';
let userSortDir = 'desc';
let activitySearch = '';
let selectedTimeRange = 7; // Default 7 days

// Chart instances
let subscriptionChart = null;
let aiUsageChart = null;
let aiComparisonChart = null;
let userGrowthChart = null;

// DOM Elements
const loadingScreen = document.getElementById('loading-screen');
const loginScreen = document.getElementById('login-screen');
const accessDenied = document.getElementById('access-denied');
const dashboard = document.getElementById('dashboard');

// Show screen helper
function showScreen(screen) {
  loadingScreen.style.display = 'none';
  loginScreen.style.display = 'none';
  accessDenied.style.display = 'none';
  dashboard.style.display = 'none';

  if (screen === 'loading') loadingScreen.style.display = 'flex';
  else if (screen === 'login') loginScreen.style.display = 'flex';
  else if (screen === 'denied') accessDenied.style.display = 'flex';
  else if (screen === 'dashboard') dashboard.style.display = 'flex';
}

// Check if user is admin
function isAdmin(user) {
  return user && user.uid === ADMIN_UID;
}

// Load dashboard data
async function loadDashboardData() {
  try {
    document.getElementById('refresh-btn').parentElement.classList.add('refreshing');

    const getAdminStats = functions.httpsCallable('getAdminStats');
    const result = await getAdminStats();
    stats = result.data;

    allUsers = stats.users || [];
    allActivity = stats.recentActivity || [];
    allNotificationLogs = stats.notificationLogs || [];
    allErrorLogs = stats.errorLogs || [];
    allDailyReviewLogs = stats.dailyReviewLogs || [];

    updateOverview();
    updateRetention();
    updateGrowthChart();
    updateChurnRisk();
    renderUsersTable();
    renderActivityTable();
    renderNotificationTable();
    renderErrorTable();
    renderReviewTable();
    updateHeatmap();
    updateCharts();
    updateBilling();

    document.getElementById('last-updated').textContent = new Date().toLocaleTimeString();

  } catch (error) {
    console.error('Error loading dashboard data:', error);
    alert('Failed to load dashboard data: ' + error.message);
  } finally {
    document.getElementById('refresh-btn').parentElement.classList.remove('refreshing');
  }
}

// Update overview metrics
function updateOverview() {
  if (!stats) return;

  const totalUsers = stats.totalUsers || 0;
  const proUsers = stats.proSubscribers || 0;
  const conversionRate = totalUsers > 0 ? ((proUsers / totalUsers) * 100).toFixed(1) : 0;

  const aiRequestsWeek = (stats.mealScansWeek || 0) + (stats.textFoodWeek || 0) + (stats.coachInsightsWeek || 0);
  const aiRequestsToday = (stats.mealScansToday || 0) + (stats.textFoodToday || 0) + (stats.coachInsightsToday || 0);

  // Estimate costs
  const estCost = (
    (stats.mealScansWeek || 0) * AI_COSTS.meal_scan +
    (stats.textFoodWeek || 0) * AI_COSTS.text_analysis +
    (stats.coachInsightsWeek || 0) * AI_COSTS.coach_insight
  );
  const costPerUser = totalUsers > 0 ? (estCost / totalUsers) : 0;

  // Active users (users with lastActive in last 7 days)
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const activeUsers = allUsers.filter(u => u.lastActive && new Date(u.lastActive) > weekAgo).length;

  // Update DOM
  document.getElementById('total-users').textContent = totalUsers;
  document.getElementById('pro-users').textContent = proUsers;
  document.getElementById('conversion-rate').textContent = `${conversionRate}% conversion`;

  document.getElementById('ai-requests-week').textContent = aiRequestsWeek;
  document.getElementById('ai-requests-today').textContent = `${aiRequestsToday} today`;

  document.getElementById('est-cost').textContent = `$${estCost.toFixed(2)}`;
  document.getElementById('cost-per-user').textContent = `$${costPerUser.toFixed(3)}/user`;

  document.getElementById('notifications-enabled').textContent = stats.notificationsEnabled || 0;
  document.getElementById('daily-notifs-sent').textContent = stats.dailyNotifsSentToday || 0;
  document.getElementById('weekly-notifs-sent').textContent = stats.weeklyNotifsSentThisWeek || 0;
  document.getElementById('active-users').textContent = activeUsers;

  // Activity section stats
  document.getElementById('meal-scans-today').textContent = stats.mealScansToday || 0;
  document.getElementById('meal-scans-week').textContent = `${stats.mealScansWeek || 0} this week`;
  document.getElementById('text-food-today').textContent = stats.textFoodToday || 0;
  document.getElementById('text-food-week').textContent = `${stats.textFoodWeek || 0} this week`;
  document.getElementById('coach-insights-today').textContent = stats.coachInsightsToday || 0;
  document.getElementById('coach-insights-week').textContent = `${stats.coachInsightsWeek || 0} this week`;
}

// Update retention metrics
function updateRetention() {
  if (!stats || !stats.retention) return;

  const r = stats.retention;
  document.getElementById('retention-dau').textContent = r.dau;
  document.getElementById('retention-wau').textContent = r.wau;
  document.getElementById('retention-mau').textContent = r.mau;
  document.getElementById('retention-stickiness').textContent = `${r.dauWauRatio}%`;
}

// Update user growth chart
function updateGrowthChart() {
  if (!stats || !stats.signupsByDate) return;

  const ctx = document.getElementById('userGrowthChart').getContext('2d');
  if (userGrowthChart) userGrowthChart.destroy();

  const signups = stats.signupsByDate;
  const totalNew = signups.reduce((sum, d) => sum + d.count, 0);
  document.getElementById('growth-total').textContent = `${totalNew} new users`;

  const labels = signups.map(d => {
    const date = new Date(d.date);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  });
  const data = signups.map(d => d.count);

  userGrowthChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'New Users',
        data,
        borderColor: '#14b8a6',
        backgroundColor: 'rgba(20, 184, 166, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 2,
        pointHoverRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#64748b', maxRotation: 0, autoSkip: true, maxTicksLimit: 10 }
        },
        y: {
          grid: { color: 'rgba(148,163,184,0.1)' },
          ticks: { color: '#64748b', stepSize: 1 },
          beginAtZero: true
        }
      }
    }
  });
}

// Update churn risk section
function updateChurnRisk() {
  if (!stats) return;

  const churnUsers = stats.churnRiskUsers || [];
  document.getElementById('churn-count').textContent = `${churnUsers.length} users at risk`;

  const container = document.getElementById('churn-list');

  if (churnUsers.length === 0) {
    container.innerHTML = '<p class="churn-empty">No users at risk of churning</p>';
    return;
  }

  container.innerHTML = churnUsers.slice(0, 10).map(user => `
    <div class="churn-item">
      <div class="churn-user">
        <span class="churn-user-name">${user.displayName || 'Unknown'}</span>
        <span class="churn-user-email">${user.email || '-'}</span>
      </div>
      <span class="churn-days ${user.daysInactive < 14 ? 'warning' : ''}">${user.daysInactive}d inactive</span>
    </div>
  `).join('');
}

// Show user modal
function showUserModal(userId) {
  const user = allUsers.find(u => u.id === userId);
  if (!user) return;

  const modal = document.getElementById('user-modal');
  modal.style.display = 'flex';

  document.getElementById('modal-user-name').textContent = user.displayName || 'Unknown User';
  document.getElementById('modal-email').textContent = user.email || '-';
  document.getElementById('modal-status').innerHTML = `<span class="badge ${user.isPro ? 'badge-pro' : 'badge-free'}">${user.isPro ? 'Pro' : 'Free'}</span>`;
  document.getElementById('modal-signup').textContent = user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-';
  document.getElementById('modal-last-active').textContent = user.lastActive ? formatDate(user.lastActive) : 'Never';
  document.getElementById('modal-notifs').innerHTML = `<span class="badge ${user.notificationsEnabled ? 'badge-on' : 'badge-off'}">${user.notificationsEnabled ? 'Enabled' : 'Disabled'}</span>`;
  document.getElementById('modal-timezone').textContent = user.timezone || '-';

  document.getElementById('modal-meals').textContent = user.mealScans || 0;
  document.getElementById('modal-text').textContent = user.textAnalysis || 0;
  document.getElementById('modal-coach').textContent = user.coachInsights || 0;
  document.getElementById('modal-total').textContent = (user.mealScans || 0) + (user.textAnalysis || 0) + (user.coachInsights || 0);

  // Show user's recent activity
  const userActivity = allActivity.filter(a => a.userId === userId).slice(0, 5);
  const activityContainer = document.getElementById('modal-activity');

  if (userActivity.length === 0) {
    activityContainer.innerHTML = '<p class="no-activity">No recent activity</p>';
  } else {
    activityContainer.innerHTML = userActivity.map(a => {
      const typeInfo = getActivityTypeInfo(a.type);
      return `
        <div class="user-activity-item">
          <div class="user-activity-info">
            <span class="badge ${typeInfo.badgeClass}">${typeInfo.label}</span>
            <span class="user-activity-time">${formatTime(a.timestamp)}</span>
          </div>
          <span class="badge ${a.success ? 'badge-success' : 'badge-failed'}">${a.success ? 'OK' : 'Fail'}</span>
        </div>
      `;
    }).join('');
  }
}

// Close user modal
function closeUserModal() {
  document.getElementById('user-modal').style.display = 'none';
}

// Update daily activity display
function updateHeatmap() {
  const container = document.getElementById('daily-activity-list');
  if (!container) return;

  // Get activity data grouped by date
  const activityByDate = {};
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  // Calculate start date based on selected range
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - selectedTimeRange + 1);
  startDate.setHours(0, 0, 0, 0);

  // Initialize all days in range
  for (let d = new Date(startDate); d <= now; d.setDate(d.getDate() + 1)) {
    const key = d.toISOString().split('T')[0];
    activityByDate[key] = { total: 0, meals: 0, text: 0, coach: 0 };
  }

  // Count activity per day by type
  allActivity.forEach(a => {
    if (!a.timestamp) return;
    const date = new Date(a.timestamp).toISOString().split('T')[0];
    if (activityByDate.hasOwnProperty(date)) {
      activityByDate[date].total++;
      if (a.type === 'meal_scan') activityByDate[date].meals++;
      else if (a.type === 'text_analysis') activityByDate[date].text++;
      else if (a.type === 'coach_insight') activityByDate[date].coach++;
    }
  });

  // Calculate stats
  const values = Object.values(activityByDate).map(d => d.total);
  const total = values.reduce((a, b) => a + b, 0);
  const avg = values.length > 0 ? (total / values.length).toFixed(1) : 0;
  const maxVal = Math.max(...values, 1);

  // Update summary
  document.getElementById('activity-total').textContent = total;
  document.getElementById('activity-avg').textContent = avg;

  // Build list (most recent first)
  const sortedDates = Object.keys(activityByDate).sort().reverse();

  let html = '';
  sortedDates.forEach(date => {
    const data = activityByDate[date];
    const d = new Date(date + 'T12:00:00');
    const isToday = date === todayStr;
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
    const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const barWidth = maxVal > 0 ? (data.total / maxVal) * 100 : 0;

    html += `
      <div class="activity-day ${isToday ? 'today' : ''}">
        <div class="activity-day-date">
          ${dateStr}
          <small>${dayName}${isToday ? ' (Today)' : ''}</small>
        </div>
        <div class="activity-bar-container">
          <div class="activity-bar ${data.total === 0 ? 'zero' : ''}" style="width: ${barWidth}%"></div>
        </div>
        <div class="activity-count ${data.total === 0 ? 'zero' : ''}">${data.total} req</div>
      </div>
    `;
  });

  container.innerHTML = html || '<p style="color: var(--text-muted); text-align: center; padding: 20px;">No activity data</p>';
}

// Update charts
function updateCharts() {
  if (!stats) return;

  const chartColors = {
    teal: '#14b8a6',
    tealDark: '#0d9488',
    gray: '#64748b',
    purple: '#a855f7',
    orange: '#f97316',
    cyan: '#22d3ee'
  };

  // Subscription Chart
  const subCtx = document.getElementById('subscriptionChart').getContext('2d');
  if (subscriptionChart) subscriptionChart.destroy();

  subscriptionChart = new Chart(subCtx, {
    type: 'doughnut',
    data: {
      labels: ['Free', 'Pro'],
      datasets: [{
        data: [stats.freeUsers || 0, stats.proSubscribers || 0],
        backgroundColor: [chartColors.gray, chartColors.teal],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '70%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: '#94a3b8', padding: 12, font: { family: 'Inter', size: 11 } }
        }
      }
    }
  });

  // AI Usage Chart
  const aiCtx = document.getElementById('aiUsageChart').getContext('2d');
  if (aiUsageChart) aiUsageChart.destroy();

  aiUsageChart = new Chart(aiCtx, {
    type: 'bar',
    data: {
      labels: ['Meals', 'Text', 'Coach'],
      datasets: [{
        data: [stats.mealScansWeek || 0, stats.textFoodWeek || 0, stats.coachInsightsWeek || 0],
        backgroundColor: [chartColors.orange, chartColors.cyan, chartColors.purple],
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#64748b', font: { family: 'Inter' } } },
        y: { grid: { color: 'rgba(148,163,184,0.1)' }, ticks: { color: '#64748b', font: { family: 'Inter' } }, beginAtZero: true }
      }
    }
  });

  // Comparison Chart
  const compCtx = document.getElementById('aiComparisonChart').getContext('2d');
  if (aiComparisonChart) aiComparisonChart.destroy();

  const avgMeals = Math.round((stats.mealScansWeek || 0) / 7);
  const avgText = Math.round((stats.textFoodWeek || 0) / 7);
  const avgCoach = Math.round((stats.coachInsightsWeek || 0) / 7);

  aiComparisonChart = new Chart(compCtx, {
    type: 'bar',
    data: {
      labels: ['Meals', 'Text', 'Coach'],
      datasets: [
        {
          label: 'Today',
          data: [stats.mealScansToday || 0, stats.textFoodToday || 0, stats.coachInsightsToday || 0],
          backgroundColor: chartColors.teal,
          borderRadius: 4
        },
        {
          label: 'Daily Avg',
          data: [avgMeals, avgText, avgCoach],
          backgroundColor: chartColors.tealDark,
          borderRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: { color: '#94a3b8', padding: 12, font: { family: 'Inter', size: 11 } }
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#64748b', font: { family: 'Inter' } } },
        y: { grid: { color: 'rgba(148,163,184,0.1)' }, ticks: { color: '#64748b', font: { family: 'Inter' } }, beginAtZero: true }
      }
    }
  });
}

// Update billing section
function updateBilling() {
  if (!stats) return;

  const mealScans = stats.mealScansWeek || 0;
  const textAnalysis = stats.textFoodWeek || 0;
  const coachInsights = stats.coachInsightsWeek || 0;

  const mealCost = mealScans * AI_COSTS.meal_scan;
  const textCost = textAnalysis * AI_COSTS.text_analysis;
  const coachCost = coachInsights * AI_COSTS.coach_insight;
  const totalCost = mealCost + textCost + coachCost;

  // Calculate active users
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const activeUsers = allUsers.filter(u => u.lastActive && new Date(u.lastActive) > weekAgo).length;
  const costPerUser = activeUsers > 0 ? totalCost / activeUsers : 0;

  // Project monthly (weekly * 4.33)
  const monthlyProjected = totalCost * 4.33;

  // Update summary cards
  document.getElementById('billing-total').textContent = `$${totalCost.toFixed(4)}`;
  document.getElementById('billing-per-user').textContent = `$${costPerUser.toFixed(4)}`;
  document.getElementById('billing-monthly').textContent = `$${monthlyProjected.toFixed(2)}`;

  // Update breakdown
  document.getElementById('billing-meal-requests').textContent = `${mealScans} requests`;
  document.getElementById('billing-meal-cost').textContent = `$${mealCost.toFixed(4)}`;

  document.getElementById('billing-text-requests').textContent = `${textAnalysis} requests`;
  document.getElementById('billing-text-cost').textContent = `$${textCost.toFixed(4)}`;

  document.getElementById('billing-coach-requests').textContent = `${coachInsights} requests`;
  document.getElementById('billing-coach-cost').textContent = `$${coachCost.toFixed(4)}`;
}

// Format date
function formatDate(dateStr) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Format time
function formatTime(dateStr) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMins = Math.floor((now - date) / (1000 * 60));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
  return formatDate(dateStr);
}

// Render users table
function renderUsersTable() {
  const tbody = document.getElementById('users-table-body');

  // Filter and search
  let filtered = allUsers.filter(u => {
    if (userFilter === 'pro' && !u.isPro) return false;
    if (userFilter === 'free' && u.isPro) return false;
    if (userSearch) {
      const search = userSearch.toLowerCase();
      const name = (u.displayName || '').toLowerCase();
      const email = (u.email || '').toLowerCase();
      if (!name.includes(search) && !email.includes(search)) return false;
    }
    return true;
  });

  // Sort
  filtered.sort((a, b) => {
    let valA, valB;

    switch (userSortField) {
      case 'name':
        valA = (a.displayName || a.email || '').toLowerCase();
        valB = (b.displayName || b.email || '').toLowerCase();
        break;
      case 'status':
        valA = a.isPro ? 1 : 0;
        valB = b.isPro ? 1 : 0;
        break;
      case 'notifications':
        valA = a.notificationsEnabled ? 1 : 0;
        valB = b.notificationsEnabled ? 1 : 0;
        break;
      case 'meals':
        valA = a.mealScans || 0;
        valB = b.mealScans || 0;
        break;
      case 'text':
        valA = a.textAnalysis || 0;
        valB = b.textAnalysis || 0;
        break;
      case 'coach':
        valA = a.coachInsights || 0;
        valB = b.coachInsights || 0;
        break;
      case 'signedUp':
        valA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        valB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        break;
      case 'lastActive':
      default:
        valA = a.lastActive ? new Date(a.lastActive).getTime() : 0;
        valB = b.lastActive ? new Date(b.lastActive).getTime() : 0;
        break;
    }

    if (valA < valB) return userSortDir === 'asc' ? -1 : 1;
    if (valA > valB) return userSortDir === 'asc' ? 1 : -1;
    return 0;
  });

  // Update sort indicators
  document.querySelectorAll('#users-table th.sortable').forEach(th => {
    th.classList.remove('asc', 'desc');
    if (th.dataset.sort === userSortField) {
      th.classList.add(userSortDir);
    }
  });

  // Pagination
  const total = filtered.length;
  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);
  const start = (usersPage - 1) * ITEMS_PER_PAGE;
  const pageUsers = filtered.slice(start, start + ITEMS_PER_PAGE);

  // Update info
  document.getElementById('users-showing').textContent = pageUsers.length;
  document.getElementById('users-total').textContent = total;

  // Render table
  if (pageUsers.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="loading-cell">No users found</td></tr>';
  } else {
    tbody.innerHTML = pageUsers.map(user => `
      <tr class="clickable" data-user-id="${user.id}">
        <td>
          <div class="user-cell">
            <span class="user-name">${user.displayName || '-'}</span>
            <span class="user-email">${user.email || '-'}</span>
          </div>
        </td>
        <td><span class="badge ${user.isPro ? 'badge-pro' : 'badge-free'}">${user.isPro ? 'Pro' : 'Free'}</span></td>
        <td><span class="badge ${user.notificationsEnabled ? 'badge-on' : 'badge-off'}">${user.notificationsEnabled ? 'On' : 'Off'}</span></td>
        <td class="text-center usage-cell ${user.mealScans > 0 ? 'has-usage' : ''}">${user.mealScans || 0}</td>
        <td class="text-center usage-cell ${user.textAnalysis > 0 ? 'has-usage' : ''}">${user.textAnalysis || 0}</td>
        <td class="text-center usage-cell ${user.coachInsights > 0 ? 'has-usage' : ''}">${user.coachInsights || 0}</td>
        <td class="date-cell">${formatDate(user.createdAt)}</td>
        <td class="date-cell">${formatDate(user.lastActive)}</td>
      </tr>
    `).join('');

    // Add click handlers for rows
    tbody.querySelectorAll('tr.clickable').forEach(row => {
      row.addEventListener('click', () => showUserModal(row.dataset.userId));
    });
  }

  // Render pagination
  renderPagination('users-pagination', usersPage, totalPages, (page) => {
    usersPage = page;
    renderUsersTable();
  });
}

// Render activity table
function renderActivityTable() {
  const tbody = document.getElementById('activity-table-body');

  // Filter by type
  let filtered = allActivity;
  if (activityFilter !== 'all-activity') {
    filtered = filtered.filter(a => a.type === activityFilter);
  }

  // Filter by search
  if (activitySearch) {
    const search = activitySearch.toLowerCase();
    filtered = filtered.filter(a => {
      const userName = (a.userName || '').toLowerCase();
      const userEmail = (a.userEmail || '').toLowerCase();
      const description = (a.description || '').toLowerCase();
      const insightType = (a.insightType || '').toLowerCase();
      return userName.includes(search) || userEmail.includes(search) ||
             description.includes(search) || insightType.includes(search);
    });
  }

  // Pagination
  const total = filtered.length;
  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);
  const start = (activityPage - 1) * ITEMS_PER_PAGE;
  const pageActivity = filtered.slice(start, start + ITEMS_PER_PAGE);

  // Update info
  document.getElementById('activity-showing').textContent = pageActivity.length;
  document.getElementById('activity-total').textContent = total;

  // Render table
  if (pageActivity.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="loading-cell">No activity found</td></tr>';
  } else {
    tbody.innerHTML = pageActivity.map(activity => {
      const typeInfo = getActivityTypeInfo(activity.type);
      const details = getActivityDetails(activity);
      const userName = activity.userName || activity.userEmail || 'Unknown';

      return `
        <tr>
          <td class="date-cell">${formatTime(activity.timestamp)}</td>
          <td class="user-name">${userName}</td>
          <td><span class="badge ${typeInfo.badgeClass}">${typeInfo.label}</span></td>
          <td class="activity-details" title="${details}">${details}</td>
          <td><span class="badge ${activity.success ? 'badge-success' : 'badge-failed'}">${activity.success ? 'Success' : 'Failed'}</span></td>
        </tr>
      `;
    }).join('');
  }

  // Render pagination
  renderPagination('activity-pagination', activityPage, totalPages, (page) => {
    activityPage = page;
    renderActivityTable();
  });
}

// Get activity type info
function getActivityTypeInfo(type) {
  switch (type) {
    case 'meal_scan': return { label: 'Meal Scan', badgeClass: 'badge-meal' };
    case 'text_analysis': return { label: 'Text', badgeClass: 'badge-text' };
    case 'coach_insight': return { label: 'Coach', badgeClass: 'badge-coach' };
    default: return { label: type, badgeClass: '' };
  }
}

// Get activity details
function getActivityDetails(activity) {
  if (activity.type === 'meal_scan') {
    return `${activity.foodsDetected || 0} foods • ${activity.confidence || '-'}`;
  } else if (activity.type === 'text_analysis') {
    return activity.description || `${activity.foodsDetected || 0} foods`;
  } else if (activity.type === 'coach_insight') {
    return `${activity.insightType || 'insight'}${activity.coachingStyle ? ' • ' + activity.coachingStyle : ''}`;
  }
  return '-';
}

// Render pagination
function renderPagination(containerId, currentPage, totalPages, onPageChange) {
  const container = document.getElementById(containerId);

  if (totalPages <= 1) {
    container.innerHTML = '';
    return;
  }

  let html = '';

  // Previous
  html += `<button class="page-btn" ${currentPage === 1 ? 'disabled' : ''} data-page="${currentPage - 1}">Prev</button>`;

  // Page numbers
  const maxVisible = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  let endPage = Math.min(totalPages, startPage + maxVisible - 1);

  if (endPage - startPage < maxVisible - 1) {
    startPage = Math.max(1, endPage - maxVisible + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
  }

  // Next
  html += `<button class="page-btn" ${currentPage === totalPages ? 'disabled' : ''} data-page="${currentPage + 1}">Next</button>`;

  container.innerHTML = html;

  // Add click handlers
  container.querySelectorAll('.page-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const page = parseInt(btn.dataset.page);
      if (page >= 1 && page <= totalPages) {
        onPageChange(page);
      }
    });
  });
}

// Render notification logs table
function renderNotificationTable() {
  const tbody = document.getElementById('notif-table-body');
  if (!tbody) return;

  // Filter by type
  let filtered = allNotificationLogs;
  if (notifFilter === 'daily') {
    filtered = filtered.filter(n => n.type === 'daily');
  } else if (notifFilter === 'weekly') {
    filtered = filtered.filter(n => n.type === 'weekly');
  } else if (notifFilter === 'failed') {
    filtered = filtered.filter(n => n.status === 'failed');
  }

  // Filter by search
  if (notifSearch) {
    const search = notifSearch.toLowerCase();
    filtered = filtered.filter(n => {
      const userName = (n.userName || '').toLowerCase();
      const userEmail = (n.userEmail || '').toLowerCase();
      return userName.includes(search) || userEmail.includes(search);
    });
  }

  // Pagination
  const total = filtered.length;
  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);
  const start = (notifPage - 1) * ITEMS_PER_PAGE;
  const pageNotifs = filtered.slice(start, start + ITEMS_PER_PAGE);

  // Update info
  document.getElementById('notif-showing').textContent = pageNotifs.length;
  document.getElementById('notif-total').textContent = total;

  // Render table
  if (pageNotifs.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="loading-cell">No notifications found</td></tr>';
  } else {
    tbody.innerHTML = pageNotifs.map(notif => {
      const userName = notif.userName || notif.userEmail || 'Unknown';
      return `
        <tr>
          <td class="user-name">${userName}</td>
          <td><span class="type-badge ${notif.type}">${notif.type}</span></td>
          <td><span class="status-badge ${notif.status}">${notif.status}</span></td>
          <td class="date-cell">${formatTime(notif.timestamp)}</td>
          <td class="message-cell" title="${notif.error || notif.message || '-'}">${notif.error || notif.message || '-'}</td>
        </tr>
      `;
    }).join('');
  }

  // Render pagination
  renderPagination('notif-pagination', notifPage, totalPages, (page) => {
    notifPage = page;
    renderNotificationTable();
  });
}

// Render error logs table
function renderErrorTable() {
  const tbody = document.getElementById('error-table-body');
  const noErrorsMessage = document.getElementById('no-errors-message');
  const errorTable = document.getElementById('error-table');
  if (!tbody) return;

  // Filter by type
  let filtered = allErrorLogs;
  if (errorFilter !== 'all') {
    filtered = filtered.filter(e => e.type === errorFilter);
  }

  // Filter by search
  if (errorSearch) {
    const search = errorSearch.toLowerCase();
    filtered = filtered.filter(e => {
      const userName = (e.userName || '').toLowerCase();
      const userEmail = (e.userEmail || '').toLowerCase();
      const error = (e.error || '').toLowerCase();
      return userName.includes(search) || userEmail.includes(search) || error.includes(search);
    });
  }

  // Show/hide no errors message
  if (allErrorLogs.length === 0) {
    if (noErrorsMessage) noErrorsMessage.style.display = 'flex';
    if (errorTable) errorTable.parentElement.style.display = 'none';
    return;
  } else {
    if (noErrorsMessage) noErrorsMessage.style.display = 'none';
    if (errorTable) errorTable.parentElement.style.display = 'block';
  }

  // Pagination
  const total = filtered.length;
  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);
  const start = (errorPage - 1) * ITEMS_PER_PAGE;
  const pageErrors = filtered.slice(start, start + ITEMS_PER_PAGE);

  // Update info
  document.getElementById('error-showing').textContent = pageErrors.length;
  document.getElementById('error-total').textContent = total;

  // Render table
  if (pageErrors.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="loading-cell">No errors found</td></tr>';
  } else {
    tbody.innerHTML = pageErrors.map(err => {
      const userName = err.userName || err.userEmail || 'Unknown';
      const typeLabel = err.type.replace('_', ' ');
      return `
        <tr>
          <td class="user-name">${userName}</td>
          <td><span class="type-badge ${err.type}">${typeLabel}</span></td>
          <td class="date-cell">${formatTime(err.timestamp)}</td>
          <td class="error-cell" title="${err.error}">${err.error}</td>
        </tr>
      `;
    }).join('');
  }

  // Render pagination
  renderPagination('error-pagination', errorPage, totalPages, (page) => {
    errorPage = page;
    renderErrorTable();
  });
}

// Render Daily Review logs table
function renderReviewTable() {
  const tbody = document.getElementById('review-table-body');
  if (!tbody) return;

  // Filter by status
  let filtered = allDailyReviewLogs;
  if (reviewFilter === 'success') {
    filtered = filtered.filter(r => r.success === true);
  } else if (reviewFilter === 'failed') {
    filtered = filtered.filter(r => r.success === false);
  }

  // Filter by search
  if (reviewSearch) {
    const search = reviewSearch.toLowerCase();
    filtered = filtered.filter(r => {
      const userName = (r.userName || '').toLowerCase();
      const userEmail = (r.userEmail || '').toLowerCase();
      return userName.includes(search) || userEmail.includes(search);
    });
  }

  // Pagination
  const total = filtered.length;
  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);
  const start = (reviewPage - 1) * ITEMS_PER_PAGE;
  const pageReviews = filtered.slice(start, start + ITEMS_PER_PAGE);

  // Update info
  document.getElementById('review-showing').textContent = pageReviews.length;
  document.getElementById('review-total').textContent = total;

  // Helper to get grade class
  function getGradeClass(grade) {
    if (!grade) return '';
    const letter = grade.charAt(0).toUpperCase();
    if (letter === 'A') return 'grade-a';
    if (letter === 'B') return 'grade-b';
    if (letter === 'C') return 'grade-c';
    if (letter === 'D') return 'grade-d';
    if (letter === 'F') return 'grade-f';
    return '';
  }

  // Render table
  if (pageReviews.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="loading-cell">No daily reviews found</td></tr>';
  } else {
    tbody.innerHTML = pageReviews.map(review => {
      const userName = review.userName || review.userEmail || 'Unknown';
      const gradeClass = getGradeClass(review.grade);
      return `
        <tr>
          <td class="user-name">${userName}</td>
          <td><span class="status-badge ${review.success ? 'sent' : 'failed'}">${review.success ? 'Success' : 'Failed'}</span></td>
          <td>${review.grade ? `<span class="grade-badge ${gradeClass}">${review.grade}</span>` : '-'}</td>
          <td class="date-cell">${formatTime(review.timestamp)}</td>
          <td class="error-cell" title="${review.error || '-'}">${review.error || '-'}</td>
        </tr>
      `;
    }).join('');
  }

  // Render pagination
  renderPagination('review-pagination', reviewPage, totalPages, (page) => {
    reviewPage = page;
    renderReviewTable();
  });
}

// Switch section
function switchSection(section) {
  currentSection = section;

  // Update nav
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.section === section);
  });

  // Update content
  document.querySelectorAll('.content-section').forEach(s => {
    s.style.display = 'none';
  });
  document.getElementById(`section-${section}`).style.display = 'block';

  // Update header
  const titles = {
    overview: { title: 'Overview', subtitle: 'Key metrics and insights' },
    users: { title: 'Users', subtitle: 'Manage and view user data' },
    activity: { title: 'AI Activity', subtitle: 'Monitor AI usage and performance' },
    billing: { title: 'Billing', subtitle: 'Cost estimates and usage breakdown' },
    logs: { title: 'Logs', subtitle: 'Notifications and error tracking' }
  };

  document.getElementById('page-title').textContent = titles[section].title;
  document.getElementById('page-subtitle').textContent = titles[section].subtitle;
}

// Auth state listener
auth.onAuthStateChanged(async (user) => {
  if (user) {
    if (isAdmin(user)) {
      document.getElementById('admin-email').textContent = user.email;
      showScreen('dashboard');
      loadDashboardData();
    } else {
      showScreen('denied');
    }
  } else {
    showScreen('login');
  }
});

// Event listeners
document.getElementById('google-signin').addEventListener('click', async () => {
  try {
    document.getElementById('login-error').textContent = '';
    const provider = new firebase.auth.GoogleAuthProvider();
    await auth.signInWithPopup(provider);
  } catch (error) {
    document.getElementById('login-error').textContent = error.message;
  }
});

document.getElementById('logout-btn').addEventListener('click', () => auth.signOut());
document.getElementById('logout-btn-denied').addEventListener('click', () => auth.signOut());
document.getElementById('refresh-btn').addEventListener('click', loadDashboardData);

// Navigation
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', (e) => {
    e.preventDefault();
    switchSection(item.dataset.section);
  });
});

// User filters
document.querySelectorAll('[data-filter="all"], [data-filter="pro"], [data-filter="free"]').forEach(btn => {
  btn.addEventListener('click', () => {
    btn.parentElement.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    userFilter = btn.dataset.filter;
    usersPage = 1;
    renderUsersTable();
  });
});

// Activity filters
document.querySelectorAll('[data-filter="all-activity"], [data-filter="meal_scan"], [data-filter="text_analysis"], [data-filter="coach_insight"]').forEach(btn => {
  btn.addEventListener('click', () => {
    btn.parentElement.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activityFilter = btn.dataset.filter;
    activityPage = 1;
    renderActivityTable();
  });
});

// Search
document.getElementById('user-search').addEventListener('input', (e) => {
  userSearch = e.target.value;
  usersPage = 1;
  renderUsersTable();
});

// Column sorting
document.querySelectorAll('#users-table th.sortable').forEach(th => {
  th.addEventListener('click', () => {
    const field = th.dataset.sort;
    if (userSortField === field) {
      userSortDir = userSortDir === 'asc' ? 'desc' : 'asc';
    } else {
      userSortField = field;
      userSortDir = 'desc';
    }
    usersPage = 1;
    renderUsersTable();
  });
});

// Activity search
document.getElementById('activity-search').addEventListener('input', (e) => {
  activitySearch = e.target.value;
  activityPage = 1;
  renderActivityTable();
});

// Notification filters
document.querySelectorAll('[data-notif-filter]').forEach(btn => {
  btn.addEventListener('click', () => {
    btn.parentElement.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    notifFilter = btn.dataset.notifFilter;
    notifPage = 1;
    renderNotificationTable();
  });
});

// Notification search
const notifSearchEl = document.getElementById('notif-search');
if (notifSearchEl) {
  notifSearchEl.addEventListener('input', (e) => {
    notifSearch = e.target.value;
    notifPage = 1;
    renderNotificationTable();
  });
}

// Error filters
document.querySelectorAll('[data-error-filter]').forEach(btn => {
  btn.addEventListener('click', () => {
    btn.parentElement.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    errorFilter = btn.dataset.errorFilter;
    errorPage = 1;
    renderErrorTable();
  });
});

// Error search
const errorSearchEl = document.getElementById('error-search');
if (errorSearchEl) {
  errorSearchEl.addEventListener('input', (e) => {
    errorSearch = e.target.value;
    errorPage = 1;
    renderErrorTable();
  });
}

// Time range selector
document.querySelectorAll('.time-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedTimeRange = parseInt(btn.dataset.range);
    updateHeatmap();
    // Could also reload data with new range here if backend supports it
  });
});

// Daily Review filters
document.querySelectorAll('[data-review-filter]').forEach(btn => {
  btn.addEventListener('click', () => {
    btn.parentElement.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    reviewFilter = btn.dataset.reviewFilter;
    reviewPage = 1;
    renderReviewTable();
  });
});

// Daily Review search
const reviewSearchEl = document.getElementById('review-search');
if (reviewSearchEl) {
  reviewSearchEl.addEventListener('input', (e) => {
    reviewSearch = e.target.value;
    reviewPage = 1;
    renderReviewTable();
  });
}

// Modal close handlers
document.getElementById('modal-close').addEventListener('click', closeUserModal);
document.querySelector('.modal-backdrop').addEventListener('click', closeUserModal);

// Close modal with Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeUserModal();
});

// Mobile menu toggle
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');

function openMobileMenu() {
  sidebar.classList.add('open');
  sidebarOverlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeMobileMenu() {
  sidebar.classList.remove('open');
  sidebarOverlay.classList.remove('active');
  document.body.style.overflow = '';
}

mobileMenuBtn.addEventListener('click', openMobileMenu);
sidebarOverlay.addEventListener('click', closeMobileMenu);

// Close mobile menu when nav item is clicked
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', closeMobileMenu);
});
