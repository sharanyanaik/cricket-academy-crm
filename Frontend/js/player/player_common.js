// ==================== PLAYER COMMON FUNCTIONS ====================

const API_URL = 'http://localhost:5000/api';

function getToken() {
    return localStorage.getItem('token');
}

function getCurrentUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
}

function checkPlayerAuth() {
    const token = getToken();
    const user = getCurrentUser();
    
    console.log('Checking player auth...');
    console.log('Token:', !!token);
    console.log('User:', user);
    
    if (!token) {
        window.location.href = '../../pages/Authentication/login.html';
        return false;
    } 
    
    if (user && (user.role === 'player' || user.role === 'admin')) {
        console.log('Auth passed');
        return true;
    }
    
    showToast('Access denied. Player only.', 'error');
    setTimeout(() => {
        window.location.href = '../../pages/Authentication/login.html';
    }, 2000);
    return false;
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '../../pages/Authentication/login.html';
}

function showToast(message, type = 'success') {
    const existingToasts = document.querySelectorAll('.toast-notification');
    existingToasts.forEach(toast => toast.remove());
    
    const toast = document.createElement('div');
    toast.className = `toast-notification ${type}`;
    toast.innerHTML = `<i class="fa-solid ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i><span>${message}</span>`;
    toast.style.cssText = `
        position: fixed; bottom: 20px; right: 20px;
        background: ${type === 'success' ? '#10b981' : '#ef4444'};
        color: white; padding: 12px 20px; border-radius: 8px;
        z-index: 2001; font-size: 14px; font-weight: 500;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function formatCurrency(amount) {
    if (!amount || amount === 0) return '₹0';
    return '₹' + amount.toLocaleString('en-IN');
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN');
}

// Add animation style
if (!document.querySelector('#toast-style')) {
    const style = document.createElement('style');
    style.id = 'toast-style';
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
    `;
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