// ==================== BILLING COMMON FUNCTIONS ====================
const API_URL = 'http://localhost:5000/api';

function getToken() {
    return localStorage.getItem('token');
}

function getCurrentUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
}

function showToast(message, type = 'success') {
    const existingToasts = document.querySelectorAll('.toast-notification');
    existingToasts.forEach(toast => toast.remove());
    
    const toast = document.createElement('div');
    toast.className = `toast-notification ${type}`;
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
        z-index: 2001;
        animation: slideIn 0.3s ease;
        font-size: 14px;
        font-weight: 500;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
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

function showConfirmModal(options) {
    let overlay = document.getElementById('customConfirmOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'customConfirmOverlay';
        overlay.className = 'custom-confirm-overlay';
        overlay.innerHTML = `
            <div class="custom-confirm-modal">
                <div class="custom-confirm-header" id="confirmHeader">
                    <i class="fa-solid fa-question-circle"></i>
                    <h3 id="confirmTitle">Confirm Action</h3>
                </div>
                <div class="custom-confirm-body" id="confirmMessage"></div>
                <div class="custom-confirm-footer">
                    <button class="custom-confirm-btn custom-confirm-btn-cancel" id="confirmCancelBtn">Cancel</button>
                    <button class="custom-confirm-btn custom-confirm-btn-confirm" id="confirmOkBtn">Confirm</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        
        const style = document.createElement('style');
        style.textContent = `
            .custom-confirm-overlay {
                display: none; position: fixed; top: 0; left: 0;
                width: 100%; height: 100%; background: rgba(0,0,0,0.5);
                z-index: 2000; justify-content: center; align-items: center;
            }
            .custom-confirm-modal {
                background: white; border-radius: 12px; width: 400px;
                max-width: 90%; box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            }
            .custom-confirm-header {
                padding: 20px 24px; border-radius: 12px 12px 0 0;
                display: flex; align-items: center; gap: 12px;
            }
            .custom-confirm-header.warning { background: #ef4444; color: white; }
            .custom-confirm-header.info { background: #3b82f6; color: white; }
            .custom-confirm-header.success { background: #10b981; color: white; }
            .custom-confirm-body { padding: 24px; font-size: 16px; color: #1e293b; }
            .custom-confirm-footer { padding: 16px 24px; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 12px; }
            .custom-confirm-btn { padding: 8px 20px; border-radius: 6px; cursor: pointer; border: none; }
            .custom-confirm-btn-cancel { background: #e2e8f0; color: #475569; }
            .custom-confirm-btn-confirm { background: #ef4444; color: white; }
            .custom-confirm-btn-confirm.info { background: #3b82f6; }
        `;
        document.head.appendChild(style);
    }
    
    const header = overlay.querySelector('#confirmHeader');
    const title = overlay.querySelector('#confirmTitle');
    const messageEl = overlay.querySelector('#confirmMessage');
    const confirmBtn = overlay.querySelector('#confirmOkBtn');
    
    header.className = `custom-confirm-header ${options.type || 'warning'}`;
    title.textContent = options.title || 'Confirm Action';
    messageEl.innerHTML = options.message || 'Are you sure?';
    
    confirmBtn.innerHTML = options.type === 'info' ? 'OK' : 'Delete';
    confirmBtn.className = options.type === 'info' ? 'custom-confirm-btn custom-confirm-btn-confirm info' : 'custom-confirm-btn custom-confirm-btn-confirm';
    
    const callback = options.onConfirm;
    
    overlay.style.display = 'flex';
    
    const cancelBtn = overlay.querySelector('#confirmCancelBtn');
    const newConfirmBtn = overlay.querySelector('#confirmOkBtn');
    
    cancelBtn.onclick = () => {
        overlay.style.display = 'none';
        if (options.onCancel) options.onCancel();
    };
    
    newConfirmBtn.onclick = () => {
        overlay.style.display = 'none';
        if (callback) callback();
    };
}

function checkBillingAuth() {
    const token = getToken();
    const user = getCurrentUser();
    
    console.log('=== Billing Auth Debug ===');
    console.log('Token exists:', token ? 'Yes' : 'No');
    console.log('User:', user);
    console.log('User role:', user?.role);
    
    if (!token) {
        window.location.href = '../../pages/Authentication/login.html';
        return false;
    }
    
    if (user && (user.role === 'billing' || user.role === 'admin')) {
        console.log('Auth PASSED');
        return true;
    }
    
    showToast('Access denied. Billing only.', 'error');
    setTimeout(() => {
        window.location.href = '../../pages/Authentication/login.html';
    }, 2000);
    return false;
}

function formatCurrency(amount) {
    if (amount === undefined || amount === null || amount === 0) {
        return '₹0';
    }
    const numAmount = Number(amount);
    if (isNaN(numAmount)) return '₹0';
    return '₹' + Math.round(numAmount).toLocaleString('en-IN');
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN');
}

function logout() {
    showConfirmModal({
        title: 'Logout',
        message: 'Are you sure you want to logout?',
        type: 'info',
        onConfirm: () => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            showToast('Logged out successfully!', 'success');
            setTimeout(() => {
                window.location.href = '../../pages/Authentication/login.html';
            }, 500);
        }
    });
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