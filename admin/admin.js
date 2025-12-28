// Qwota Admin Dashboard JavaScript

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyArp2sE2b3x8QlG1ZwIcIsarMKKy105Mh4",
  authDomain: "qwota-ai-coach.firebaseapp.com",
  projectId: "qwota-ai-coach",
  storageBucket: "qwota-ai-coach.firebasestorage.app",
  messagingSenderId: "7410395296",
  appId: "1:7410395296:ios:c1f8226448e674a06081c5"
};

// Admin UID
const ADMIN_UID = "DEPKKHJMilcoJmSnKxb3UxFc5Is2";

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const functions = firebase.functions();

// DOM Elements
const loadingScreen = document.getElementById('loading-screen');
const loginScreen = document.getElementById('login-screen');
const accessDenied = document.getElementById('access-denied');
const dashboard = document.getElementById('dashboard');
const googleSigninBtn = document.getElementById('google-signin');
const logoutBtn = document.getElementById('logout-btn');
const logoutBtnDenied = document.getElementById('logout-btn-denied');
const refreshBtn = document.getElementById('refresh-btn');
const adminEmail = document.getElementById('admin-email');
const loginError = document.getElementById('login-error');

// Chart instances
let subscriptionChart = null;
let aiUsageChart = null;
let aiComparisonChart = null;

// Users data
let allUsers = [];
let currentFilter = 'all';

// Activity data
let allActivity = [];
let currentActivityFilter = 'all-activity';

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
    refreshBtn.parentElement.classList.add('refreshing');

    const getAdminStats = functions.httpsCallable('getAdminStats');
    const result = await getAdminStats();
    const stats = result.data;

    // Update stat cards
    document.getElementById('total-users').textContent = stats.totalUsers;
    document.getElementById('pro-users').textContent = stats.proSubscribers;
    document.getElementById('free-users').textContent = stats.freeUsers;
    document.getElementById('notifications-enabled').textContent = stats.notificationsEnabled;

    document.getElementById('meal-scans-today').textContent = stats.mealScansToday;
    document.getElementById('meal-scans-week').textContent = `${stats.mealScansWeek} this week`;
    document.getElementById('text-food-today').textContent = stats.textFoodToday;
    document.getElementById('text-food-week').textContent = `${stats.textFoodWeek} this week`;
    document.getElementById('coach-insights-today').textContent = stats.coachInsightsToday;
    document.getElementById('coach-insights-week').textContent = `${stats.coachInsightsWeek} this week`;

    document.getElementById('daily-notifs-sent').textContent = stats.dailyNotifsSentToday;
    document.getElementById('weekly-notifs-sent').textContent = stats.weeklyNotifsSentThisWeek;

    document.getElementById('last-updated').textContent = new Date().toLocaleString();

    // Update charts
    updateSubscriptionChart(stats);
    updateAIUsageChart(stats);
    updateAIComparisonChart(stats);

    // Update users table
    allUsers = stats.users || [];
    console.log('Users loaded:', allUsers.length, allUsers);
    renderUsersTable();

    // Update activity table
    allActivity = stats.recentActivity || [];
    console.log('Activity loaded:', allActivity.length, allActivity);
    renderActivityTable();

  } catch (error) {
    console.error('Error loading dashboard data:', error);
    alert('Failed to load dashboard data: ' + error.message);
  } finally {
    refreshBtn.parentElement.classList.remove('refreshing');
  }
}

// Chart colors
const chartColors = {
  teal: '#14B8A6',
  tealDark: '#0D9488',
  cyan: '#22D3EE',
  coral: '#F97316',
  gray: '#6B7280',
  grayLight: '#94A3B8'
};

// Update subscription donut chart
function updateSubscriptionChart(stats) {
  const ctx = document.getElementById('subscriptionChart').getContext('2d');

  if (subscriptionChart) {
    subscriptionChart.destroy();
  }

  subscriptionChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Free Users', 'Pro Subscribers'],
      datasets: [{
        data: [stats.freeUsers, stats.proSubscribers],
        backgroundColor: [chartColors.gray, chartColors.teal],
        borderWidth: 0,
        hoverOffset: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '70%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: chartColors.grayLight,
            padding: 16,
            font: { family: 'Outfit', size: 12 }
          }
        }
      }
    }
  });
}

// Update AI usage bar chart
function updateAIUsageChart(stats) {
  const ctx = document.getElementById('aiUsageChart').getContext('2d');

  if (aiUsageChart) {
    aiUsageChart.destroy();
  }

  aiUsageChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Meal Scans', 'Text Analysis', 'Coach Insights'],
      datasets: [{
        label: 'Today',
        data: [stats.mealScansToday, stats.textFoodToday, stats.coachInsightsToday],
        backgroundColor: chartColors.teal,
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: chartColors.grayLight, font: { family: 'Outfit' } }
        },
        y: {
          grid: { color: 'rgba(148, 163, 184, 0.1)' },
          ticks: { color: chartColors.grayLight, font: { family: 'Outfit' } },
          beginAtZero: true
        }
      },
      plugins: {
        legend: { display: false }
      }
    }
  });
}

// Update AI comparison chart (today vs week avg)
function updateAIComparisonChart(stats) {
  const ctx = document.getElementById('aiComparisonChart').getContext('2d');

  if (aiComparisonChart) {
    aiComparisonChart.destroy();
  }

  // Calculate weekly averages
  const mealScansAvg = Math.round(stats.mealScansWeek / 7);
  const textFoodAvg = Math.round(stats.textFoodWeek / 7);
  const insightsAvg = Math.round(stats.coachInsightsWeek / 7);

  aiComparisonChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Meal Scans', 'Text Analysis', 'Coach Insights'],
      datasets: [
        {
          label: 'Today',
          data: [stats.mealScansToday, stats.textFoodToday, stats.coachInsightsToday],
          backgroundColor: chartColors.teal,
          borderRadius: 6
        },
        {
          label: '7-Day Avg',
          data: [mealScansAvg, textFoodAvg, insightsAvg],
          backgroundColor: chartColors.tealDark,
          borderRadius: 6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: chartColors.grayLight, font: { family: 'Outfit' } }
        },
        y: {
          grid: { color: 'rgba(148, 163, 184, 0.1)' },
          ticks: { color: chartColors.grayLight, font: { family: 'Outfit' } },
          beginAtZero: true
        }
      },
      plugins: {
        legend: {
          position: 'top',
          labels: {
            color: chartColors.grayLight,
            padding: 16,
            font: { family: 'Outfit', size: 12 }
          }
        }
      }
    }
  });
}

// Auth state listener
auth.onAuthStateChanged(async (user) => {
  if (user) {
    if (isAdmin(user)) {
      adminEmail.textContent = user.email;
      showScreen('dashboard');
      loadDashboardData();
    } else {
      showScreen('denied');
    }
  } else {
    showScreen('login');
  }
});

// Google Sign-In
googleSigninBtn.addEventListener('click', async () => {
  try {
    loginError.textContent = '';
    const provider = new firebase.auth.GoogleAuthProvider();
    await auth.signInWithPopup(provider);
  } catch (error) {
    console.error('Sign-in error:', error);
    loginError.textContent = error.message;
  }
});

// Logout handlers
logoutBtn.addEventListener('click', () => auth.signOut());
logoutBtnDenied.addEventListener('click', () => auth.signOut());

// Refresh handler
refreshBtn.addEventListener('click', loadDashboardData);

// Format date for display
function formatDate(dateStr) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
}

// Render users table
function renderUsersTable() {
  const tbody = document.getElementById('users-table-body');

  // Filter users
  let filteredUsers = allUsers;
  if (currentFilter === 'pro') {
    filteredUsers = allUsers.filter(u => u.isPro);
  } else if (currentFilter === 'free') {
    filteredUsers = allUsers.filter(u => !u.isPro);
  }

  // Sort by last active (most recent first)
  filteredUsers.sort((a, b) => {
    const dateA = a.lastActive ? new Date(a.lastActive) : new Date(0);
    const dateB = b.lastActive ? new Date(b.lastActive) : new Date(0);
    return dateB - dateA;
  });

  if (filteredUsers.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" class="loading-cell">No users found</td></tr>';
    return;
  }

  tbody.innerHTML = filteredUsers.map(user => `
    <tr data-pro="${user.isPro}">
      <td class="user-name">${user.displayName || '-'}</td>
      <td class="user-email">${user.email || '-'}</td>
      <td>
        <span class="badge ${user.isPro ? 'badge-pro' : 'badge-free'}">
          ${user.isPro ? 'Pro' : 'Free'}
        </span>
      </td>
      <td>
        <span class="badge ${user.notificationsEnabled ? 'badge-on' : 'badge-off'}">
          ${user.notificationsEnabled ? 'On' : 'Off'}
        </span>
      </td>
      <td class="usage-cell ${user.mealScans > 0 ? 'has-usage' : ''}">${user.mealScans || 0}</td>
      <td class="usage-cell ${user.textAnalysis > 0 ? 'has-usage' : ''}">${user.textAnalysis || 0}</td>
      <td class="usage-cell ${user.coachInsights > 0 ? 'has-usage' : ''}">${user.coachInsights || 0}</td>
      <td class="date-cell">${formatDate(user.createdAt)}</td>
      <td class="date-cell">${formatDate(user.lastActive)}</td>
    </tr>
  `).join('');
}

// Filter tab handlers for users
document.querySelectorAll('.filter-tabs').forEach((tabGroup, index) => {
  if (index === 0) return; // Skip the first filter tabs (in charts section if any)
});

// User filter tabs (in Users section)
document.querySelectorAll('[data-filter="all"], [data-filter="pro"], [data-filter="free"]').forEach(tab => {
  tab.addEventListener('click', () => {
    // Update active state within the same section
    tab.parentElement.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    // Update filter and re-render
    currentFilter = tab.dataset.filter;
    renderUsersTable();
  });
});

// Activity filter tabs
document.querySelectorAll('[data-filter="all-activity"], [data-filter="meal_scan"], [data-filter="text_analysis"], [data-filter="coach_insight"]').forEach(tab => {
  tab.addEventListener('click', () => {
    // Update active state within the same section
    tab.parentElement.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    // Update filter and re-render
    currentActivityFilter = tab.dataset.filter;
    renderActivityTable();
  });
});

// Format time for activity
function formatActivityTime(dateStr) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) {
    return 'Just now';
  } else if (diffMins < 60) {
    return `${diffMins}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}

// Get activity type label and badge class
function getActivityTypeInfo(type) {
  switch (type) {
    case 'meal_scan':
      return { label: 'Meal Scan', badgeClass: 'badge-meal' };
    case 'text_analysis':
      return { label: 'Text Analysis', badgeClass: 'badge-text' };
    case 'coach_insight':
      return { label: 'Coach', badgeClass: 'badge-coach' };
    default:
      return { label: type, badgeClass: '' };
  }
}

// Get activity details string
function getActivityDetails(activity) {
  if (activity.type === 'meal_scan') {
    const foods = activity.foodsDetected || 0;
    const conf = activity.confidence || '-';
    return `${foods} food${foods !== 1 ? 's' : ''} detected • ${conf} confidence`;
  } else if (activity.type === 'text_analysis') {
    if (activity.description) {
      return activity.description;
    }
    const foods = activity.foodsDetected || 0;
    return `${foods} food${foods !== 1 ? 's' : ''} detected`;
  } else if (activity.type === 'coach_insight') {
    const type = activity.insightType || 'insight';
    const style = activity.coachingStyle || '';
    return `${type}${style ? ' • ' + style : ''}`;
  }
  return '-';
}

// Render activity table
function renderActivityTable() {
  const tbody = document.getElementById('activity-table-body');

  // Filter activity
  let filteredActivity = allActivity;
  if (currentActivityFilter !== 'all-activity') {
    filteredActivity = allActivity.filter(a => a.type === currentActivityFilter);
  }

  if (filteredActivity.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="loading-cell">No activity found</td></tr>';
    return;
  }

  tbody.innerHTML = filteredActivity.map(activity => {
    const typeInfo = getActivityTypeInfo(activity.type);
    const details = getActivityDetails(activity);
    const userName = activity.userName || activity.userEmail || 'Unknown';

    return `
      <tr>
        <td class="activity-time">${formatActivityTime(activity.timestamp)}</td>
        <td class="user-name">${userName}</td>
        <td>
          <span class="badge ${typeInfo.badgeClass}">${typeInfo.label}</span>
        </td>
        <td class="activity-details" title="${details}">${details}</td>
        <td>
          <span class="badge ${activity.success ? 'badge-success' : 'badge-failed'}">
            ${activity.success ? 'Success' : 'Failed'}
          </span>
        </td>
      </tr>
    `;
  }).join('');
}
