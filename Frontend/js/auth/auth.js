// ==================== AUTH JS ====================

// Custom Toast Notification
function showAuthToast(message, type = 'success') {
    const existingToasts = document.querySelectorAll('.auth-toast');
    existingToasts.forEach(toast => toast.remove());
    
    const toast = document.createElement('div');
    toast.className = `auth-toast ${type}`;
    toast.innerHTML = `
        <i class="fa-solid ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
        <span>${message}</span>
    `;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        gap: 10px;
        z-index: 9999;
        animation: slideIn 0.3s ease;
        font-size: 14px;
        font-weight: 500;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        font-family: 'Segoe UI', Arial, sans-serif;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Add animation style if not exists
if (!document.querySelector('#auth-toast-style')) {
    const style = document.createElement('style');
    style.id = 'auth-toast-style';
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
    `;
    document.head.appendChild(style);
}

async function loginUser(email, password) {
    try {
        const response = await fetch(`http://localhost:5000/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        return { success: response.ok, data };
    } catch (error) {
        return { success: false, data: { message: 'Cannot connect to server' } };
    }
}

async function registerUser(userData) {
    try {
        const response = await fetch(`http://localhost:5000/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });
        const data = await response.json();
        return { success: response.ok, data };
    } catch (error) {
        return { success: false, data: { message: 'Cannot connect to server' } };
    }
}
// Add this function to auth.js
async function verifyToken() {
    const token = getToken();
    if (!token) return false;
    
    try {
        const response = await fetch(`http://localhost:5000/api/auth/verify`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            return true;
        } else {
            // Token invalid or expired
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            return false;
        }
    } catch (error) {
        console.error('Token verification error:', error);
        return false;
    }
}

// Add this at the end of your auth.js file

// Prevent back button from showing cached pages after logout
window.addEventListener('pageshow', function(event) {
    // If page is loaded from cache (back button)
    if (event.persisted) {
        // Check if user is logged in
        const token = localStorage.getItem('token');
        
        // If not logged in, redirect to login page
        if (!token) {
            window.location.replace('login.html');
        } else {
            // If logged in but on auth page, reload to verify
            const currentPage = window.location.pathname.split('/').pop();
            if (currentPage === 'login.html' || currentPage === 'register.html' || currentPage === 'forgot_pass.html') {
                window.location.reload();
            }
        }
    }
});

function logout() {
    showAuthToast('Logged out successfully', 'success');
    setTimeout(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '../Authentication/login.html';
    }, 500);
}

function getToken() {
    return localStorage.getItem('token');
}

function getCurrentUser() {
    return JSON.parse(localStorage.getItem('user') || '{}');
}