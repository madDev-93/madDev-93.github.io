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
const ADMIN_UID = "OjtuRpl3bZasDux1lIoeaAYoMGD2";

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
