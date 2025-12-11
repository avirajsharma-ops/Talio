// Talio Desktop App - Renderer Script

document.addEventListener('DOMContentLoaded', async () => {
  // Elements
  const loginView = document.getElementById('login-view');
  const dashboardView = document.getElementById('dashboard-view');
  const loginForm = document.getElementById('login-form');
  const loginError = document.getElementById('login-error');
  const loginBtn = document.getElementById('login-btn');
  const logoutBtn = document.getElementById('logout-btn');
  const checkinBtn = document.getElementById('checkin-btn');
  const checkoutBtn = document.getElementById('checkout-btn');
  const statusIndicator = document.getElementById('status-indicator');
  const statusText = document.getElementById('status-text');
  const captureStatus = document.getElementById('capture-status');
  const lastCapture = document.getElementById('last-capture');
  const userName = document.getElementById('user-name');
  const userCode = document.getElementById('user-code');
  const userInitials = document.getElementById('user-initials');
  const currentTime = document.getElementById('current-time');
  const currentDate = document.getElementById('current-date');
  const minimizeBtn = document.getElementById('minimize-btn');
  const closeBtn = document.getElementById('close-btn');
  
  // Stats
  let captureCount = 0;
  let keystrokeCount = 0;
  let clickCount = 0;

  // Window controls
  minimizeBtn.addEventListener('click', () => {
    window.talio.minimize();
  });
  
  closeBtn.addEventListener('click', () => {
    window.talio.close();
  });

  // Initialize
  await checkLoginStatus();
  startClock();
  setupActivityTracking();
  setupCaptureListener();

  // Check if user is logged in
  async function checkLoginStatus() {
    try {
      const status = await window.talio.getStatus();
      
      if (status.isLoggedIn) {
        showDashboard(status);
        
        // Check attendance status from server
        const attendanceStatus = await window.talio.getAttendanceStatus();
        if (attendanceStatus.success) {
          updateCheckinStatus(attendanceStatus.isCheckedIn);
        }
      } else {
        showLogin();
      }
    } catch (err) {
      console.error('Failed to check login status:', err);
      showLogin();
    }
  }

  // Show login view
  function showLogin() {
    loginView.style.display = 'block';
    dashboardView.style.display = 'none';
  }

  // Show dashboard view
  function showDashboard(status) {
    loginView.style.display = 'none';
    dashboardView.style.display = 'block';
    
    // Update user info
    const name = status.employeeName || 'User';
    userName.textContent = name;
    userCode.textContent = status.employeeCode || '';
    userInitials.textContent = getInitials(name);
    
    // Update checkin status
    updateCheckinStatus(status.isCheckedIn);
  }

  // Get initials from name
  function getInitials(name) {
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name[0].toUpperCase();
  }

  // Update checkin status UI
  function updateCheckinStatus(isCheckedIn) {
    if (isCheckedIn) {
      statusIndicator.classList.add('checked-in');
      statusText.textContent = 'Checked In';
      checkinBtn.style.display = 'none';
      checkoutBtn.style.display = 'flex';
      captureStatus.style.display = 'flex';
    } else {
      statusIndicator.classList.remove('checked-in');
      statusText.textContent = 'Not Checked In';
      checkinBtn.style.display = 'flex';
      checkoutBtn.style.display = 'none';
      captureStatus.style.display = 'none';
    }
  }

  // Start clock
  function startClock() {
    function updateClock() {
      const now = new Date();
      
      currentTime.textContent = now.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      
      currentDate.textContent = now.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
    
    updateClock();
    setInterval(updateClock, 1000);
  }

  // Setup activity tracking
  function setupActivityTracking() {
    // Track keystrokes
    document.addEventListener('keydown', () => {
      keystrokeCount++;
      window.talio.trackKeystroke();
      updateStats();
    });

    // Track mouse clicks
    document.addEventListener('click', () => {
      clickCount++;
      window.talio.trackMouseClick();
      updateStats();
    });

    // Track mouse movement
    let lastX = 0, lastY = 0;
    document.addEventListener('mousemove', (e) => {
      const distance = Math.sqrt(
        Math.pow(e.clientX - lastX, 2) + 
        Math.pow(e.clientY - lastY, 2)
      );
      if (distance > 5) {
        window.talio.trackMouseMove(distance);
        lastX = e.clientX;
        lastY = e.clientY;
      }
    });
  }

  // Update stats display
  function updateStats() {
    document.getElementById('stat-captures').textContent = captureCount;
    document.getElementById('stat-keystrokes').textContent = keystrokeCount;
    document.getElementById('stat-clicks').textContent = clickCount;
  }

  // Listen for capture success events
  function setupCaptureListener() {
    window.talio.onCaptureSuccess((data) => {
      captureCount++;
      updateStats();
      
      const time = new Date(data.timestamp).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
      lastCapture.textContent = `Last capture: ${time}`;
    });
  }

  // Login form submit
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    if (!email || !password) {
      loginError.textContent = 'Please fill in all fields';
      return;
    }
    
    // Show loading state
    loginBtn.querySelector('.btn-text').style.display = 'none';
    loginBtn.querySelector('.btn-loader').style.display = 'block';
    loginBtn.disabled = true;
    loginError.textContent = '';
    
    try {
      const result = await window.talio.login(email, password);
      
      if (result.success) {
        showDashboard({
          employeeName: result.user.name,
          employeeCode: result.user.employeeCode,
          isCheckedIn: false
        });
        
        // Check attendance status
        const attendanceStatus = await window.talio.getAttendanceStatus();
        if (attendanceStatus.success) {
          updateCheckinStatus(attendanceStatus.isCheckedIn);
        }
      } else {
        loginError.textContent = result.error || 'Login failed';
      }
    } catch (err) {
      loginError.textContent = 'Connection error. Please try again.';
    } finally {
      loginBtn.querySelector('.btn-text').style.display = 'block';
      loginBtn.querySelector('.btn-loader').style.display = 'none';
      loginBtn.disabled = false;
    }
  });

  // Logout
  logoutBtn.addEventListener('click', async () => {
    await window.talio.logout();
    showLogin();
    
    // Reset form
    document.getElementById('email').value = '';
    document.getElementById('password').value = '';
    loginError.textContent = '';
  });

  // Check in
  checkinBtn.addEventListener('click', async () => {
    checkinBtn.disabled = true;
    
    try {
      const result = await window.talio.checkIn();
      
      if (result.success) {
        updateCheckinStatus(true);
      } else {
        alert(result.error || 'Check-in failed');
      }
    } catch (err) {
      alert('Failed to check in. Please try again.');
    } finally {
      checkinBtn.disabled = false;
    }
  });

  // Check out
  checkoutBtn.addEventListener('click', async () => {
    checkoutBtn.disabled = true;
    
    try {
      const result = await window.talio.checkOut();
      
      if (result.success) {
        updateCheckinStatus(false);
      } else {
        alert(result.error || 'Check-out failed');
      }
    } catch (err) {
      alert('Failed to check out. Please try again.');
    } finally {
      checkoutBtn.disabled = false;
    }
  });
});
