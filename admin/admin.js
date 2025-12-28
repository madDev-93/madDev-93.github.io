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
let stats = null;
let currentSection = 'overview';
let userFilter = 'all';
let activityFilter = 'all-activity';
let userSearch = '';
let usersPage = 1;
let activityPage = 1;
let userSortField = 'lastActive';
let userSortDir = 'desc';
let activitySearch = '';

// Chart instances
let subscriptionChart = null;
let aiUsageChart = null;
let aiComparisonChart = null;

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

    updateOverview();
    renderUsersTable();
    renderActivityTable();
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
      <tr>
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
    billing: { title: 'Billing', subtitle: 'Cost estimates and usage breakdown' }
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
