// ==================== COACH COMMON FUNCTIONS ====================

const API_URL = 'http://localhost:5000/api';

function getToken() {
    return localStorage.getItem('token');
}

function getCurrentUser() {
    var user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
}

function displayUserInfo() {
    const user = getCurrentUser();
    const userNameElement = document.getElementById('userName');
    const userRoleElement = document.getElementById('userRole');
    
    if (userNameElement) userNameElement.textContent = user?.full_name || user?.name || 'Coach';
    if (userRoleElement) userRoleElement.textContent = user?.role || 'Coach';
}

function checkCoachAuth() {
    var token = getToken();
    var user = getCurrentUser();
    
    console.log('Checking coach auth...');
    console.log('Token exists:', !!token);
    console.log('User:', user);
    
    if (!token) {
        window.location.href = '../../pages/Authentication/login.html';
        return false;
    }
    
    if (user && (user.role === 'coach' || user.role === 'admin')) {
        console.log('Auth PASSED');
        displayUserInfo();
        return true;
    }
    
    showToast('Access denied. Coach only.', 'error');
    setTimeout(function() {
        window.location.href = '../../pages/Authentication/login.html';
    }, 2000);
    return false;
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '../../pages/Authentication/login.html';
}

function showToast(message, type) {
    type = type || 'success';
    var existingToasts = document.querySelectorAll('.toast-notification');
    for (var i = 0; i < existingToasts.length; i++) {
        existingToasts[i].remove();
    }
    
    var toast = document.createElement('div');
    toast.className = 'toast-notification ' + type;
    var iconClass = (type === 'success') ? 'fa-check-circle' : (type === 'error') ? 'fa-exclamation-circle' : 'fa-info-circle';
    toast.innerHTML = '<i class="fa-solid ' + iconClass + '"></i><span>' + message + '</span>';
    toast.style.cssText = 'position: fixed; bottom: 20px; right: 20px; background: ' + (type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6') + '; color: white; padding: 12px 20px; border-radius: 8px; display: flex; align-items: center; gap: 10px; z-index: 2001; animation: slideIn 0.3s ease; font-size: 14px; font-weight: 500; box-shadow: 0 4px 12px rgba(0,0,0,0.15);';
    
    document.body.appendChild(toast);
    setTimeout(function() { toast.remove(); }, 3000);
}

// Add animation style
if (!document.querySelector('#toast-style')) {
    var style = document.createElement('style');
    style.id = 'toast-style';
    style.textContent = '@keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }';
    document.head.appendChild(style);
}

// Prevent back button after logout
window.addEventListener('pageshow', function(event) {
    if (event.persisted) {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.replace('../../pages/Authentication/login.html');
        }
    }
});
// Make logout available globally
window.logout = logout;