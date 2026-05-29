// ==================== LOGIN PAGE JAVASCRIPT ====================
const API_URL = 'http://localhost:5000/api';

// Helper functions
function setLoading(buttonId, isLoading, originalText = '') {
    const btn = document.getElementById(buttonId);
    if (!btn) return;
    
    if (isLoading) {
        btn.originalText = btn.innerHTML;
        btn.innerHTML = '<span class="spinner"></span> Loading...';
        btn.disabled = true;
    } else {
        btn.innerHTML = btn.originalText || originalText;
        btn.disabled = false;
    }
}

// Handle login
async function handleLogin() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    if (!email || !password) {
        showAuthToast('Please enter email and password', 'error');
        return;
    }
    
    setLoading('loginBtn', true);
    
    const result = await loginUser(email, password);
    
    if (result.success) {
        localStorage.setItem('token', result.data.token);
        localStorage.setItem('user', JSON.stringify(result.data.user));
        
        showAuthToast('Login successful! Redirecting...', 'success');
        
        const role = result.data.user.role;
        
        setTimeout(() => {
            if (role === 'admin') {
                window.location.href = '../../pages/Admin/admin_dashboard.html';
            } else if (role === 'coach') {
                window.location.href = '../../pages/Coach/coach_dashboard.html';
            } else if (role === 'accountant') {
                window.location.href = '../../pages/Accountant/accountant_dashboard.html';
            } else if (role === 'billing') {
                window.location.href = '../../pages/Billing/billing_dashboard.html';
            } else if (role === 'maintenance') {
                window.location.href = '../../pages/Maintenance/maintenance_dashboard.html';
            } else {
                window.location.href = '../../pages/Player/player_dashboard.html';
            }
        }, 1500);
        
    } else {
        showAuthToast(result.data.message || 'Login failed', 'error');
        setLoading('loginBtn', false, 'Login');
    }
}

// Add spinner style
if (!document.querySelector('#spinner-style')) {
    const style = document.createElement('style');
    style.id = 'spinner-style';
    style.textContent = `
        .spinner {
            display: inline-block;
            width: 14px;
            height: 14px;
            border: 2px solid rgba(255,255,255,0.3);
            border-radius: 50%;
            border-top-color: white;
            animation: spin 0.6s linear infinite;
            margin-right: 8px;
        }
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);
}

// Add event listener
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            handleLogin();
        });
    }
});