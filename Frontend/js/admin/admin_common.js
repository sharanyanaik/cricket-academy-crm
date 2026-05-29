const API_URL = 'http://localhost:5000/api';

// ============ AUTH FUNCTIONS ============
function getToken() {
    return localStorage.getItem('token');
}

function getCurrentUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
}

// ============ CUSTOM TOAST NOTIFICATION ============
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
        background: ${type === 'success' ? '#87c7a2' : type === 'error' ? '#f34242' : '#3b82f6'};
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
        font-family: 'Segoe UI', Arial, sans-serif;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// ============ CUSTOM CONFIRMATION MODAL ============
let pendingConfirmCallback = null;

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
                <div class="custom-confirm-body" id="confirmMessage">
                    Are you sure you want to proceed?
                </div>
                <div class="custom-confirm-footer">
                    <button class="custom-confirm-btn custom-confirm-btn-cancel" id="confirmCancelBtn">
                        <i class="fa-solid fa-times"></i> Cancel
                    </button>
                    <button class="custom-confirm-btn custom-confirm-btn-confirm" id="confirmOkBtn">
                        <i class="fa-solid fa-check"></i> Confirm
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        
        const style = document.createElement('style');
        style.textContent = `
            .custom-confirm-overlay {
                display: none;
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.5);
                z-index: 2000;
                justify-content: center;
                align-items: center;
            }
            .custom-confirm-modal {
                background: white;
                border-radius: 12px;
                width: 400px;
                max-width: 90%;
                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                animation: modalSlideIn 0.3s ease;
            }
            @keyframes modalSlideIn {
                from {
                    transform: translateY(-50px);
                    opacity: 0;
                }
                to {
                    transform: translateY(0);
                    opacity: 1;
                }
            }
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
            .custom-confirm-header {
                padding: 20px 24px;
                border-radius: 12px 12px 0 0;
                display: flex;
                align-items: center;
                gap: 12px;
            }
            .custom-confirm-header.warning { background: #ef4444; color: white; }
            .custom-confirm-header.info { background: #3b82f6; color: white; }
            .custom-confirm-header.success { background: #10b981; color: white; }
            .custom-confirm-header i { font-size: 24px; }
            .custom-confirm-header h3 { margin: 0; font-size: 18px; font-weight: 600; }
            .custom-confirm-body { padding: 24px; font-size: 16px; color: #1e293b; line-height: 1.5; }
            .custom-confirm-footer { padding: 16px 24px; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 12px; }
            .custom-confirm-btn { padding: 8px 20px; border-radius: 6px; font-size: 14px; font-weight: 500; cursor: pointer; border: none; transition: all 0.2s ease; font-family: 'Segoe UI', Arial, sans-serif; }
            .custom-confirm-btn-cancel { background: #e2e8f0; color: #475569; }
            .custom-confirm-btn-cancel:hover { background: #cbd5e1; }
            .custom-confirm-btn-confirm { background: #ef4444; color: white; }
            .custom-confirm-btn-confirm:hover { background: #dc2626; }
            .custom-confirm-btn-confirm.info { background: #3b82f6; }
            .custom-confirm-btn-confirm.info:hover { background: #2563eb; }
            .custom-confirm-btn-confirm.success { background: #10b981; }
            .custom-confirm-btn-confirm.success:hover { background: #059669; }
        `;
        document.head.appendChild(style);
    }
    
    const header = overlay.querySelector('#confirmHeader');
    const title = overlay.querySelector('#confirmTitle');
    const messageEl = overlay.querySelector('#confirmMessage');
    const confirmBtn = overlay.querySelector('#confirmOkBtn');
    
    header.className = `custom-confirm-header ${options.type || 'warning'}`;
    title.textContent = options.title || 'Confirm Action';
    messageEl.innerHTML = options.message || 'Are you sure you want to proceed?';
    
    if (options.type === 'info') {
        confirmBtn.className = 'custom-confirm-btn custom-confirm-btn-confirm info';
        confirmBtn.innerHTML = '<i class="fa-solid fa-check"></i> OK';
    } else if (options.type === 'success') {
        confirmBtn.className = 'custom-confirm-btn custom-confirm-btn-confirm success';
        confirmBtn.innerHTML = '<i class="fa-solid fa-check"></i> Yes';
    } else {
        confirmBtn.className = 'custom-confirm-btn custom-confirm-btn-confirm';
        confirmBtn.innerHTML = '<i class="fa-solid fa-trash-can"></i> Delete';
    }
    
    pendingConfirmCallback = options.onConfirm;
    
    overlay.style.display = 'flex';
    
    const cancelBtn = overlay.querySelector('#confirmCancelBtn');
    const newConfirmBtn = overlay.querySelector('#confirmOkBtn');
    
    cancelBtn.onclick = () => {
        overlay.style.display = 'none';
        pendingConfirmCallback = null;
        if (options.onCancel) options.onCancel();
    };
    
    newConfirmBtn.onclick = () => {
        overlay.style.display = 'none';
        if (pendingConfirmCallback) pendingConfirmCallback();
        pendingConfirmCallback = null;
    };
    
    overlay.onclick = (e) => {
        if (e.target === overlay) {
            overlay.style.display = 'none';
            pendingConfirmCallback = null;
            if (options.onCancel) options.onCancel();
        }
    };
}

// ============ ADMIN AUTH CHECK ============
function checkAdminAuth() {
    const token = getToken();
    const user = getCurrentUser();
    
    if (!token) {
        window.location.href = '../../Authentication/login.html';
        return false;
    }
    if (user && user.role !== 'admin') {
        showToast('Access denied. Admin only.', 'error');
        setTimeout(() => {
            window.location.href = '../../pages/Authentication/login.html';
        }, 1500);
        return false;
    }
    return true;
}

function displayUserInfo() {
    const user = getCurrentUser();
    if (user && document.getElementById('adminName')) {
        document.getElementById('adminName').innerHTML = `
            <i class="fas fa-user-circle"></i> ${user.full_name || user.name || 'Admin'}
        `;
    }
}

// ============ LOGOUT FUNCTION ============
function logout() {
    showConfirmModal({
        title: 'Logout',
        message: 'Are you sure you want to logout from Admin Panel?',
        type: 'info',
        onConfirm: () => {
            // Clear storage
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            
            // Show success message
            showToast('Logged out successfully', 'success');
            
            // Redirect to login page
            setTimeout(() => {
                window.location.href = '../../pages/Authentication/login.html';
            }, 500);
        }
    });
}

// Make logout available globally
window.logout = logout;

// Add spinner CSS if not exists
const spinnerStyle = document.createElement('style');
spinnerStyle.textContent = `
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
if (!document.querySelector('#spinner-style')) {
    spinnerStyle.id = 'spinner-style';
    document.head.appendChild(spinnerStyle);
}

// ============ PREVENT BACK BUTTON AFTER LOGOUT (SINGLE COPY) ============
window.addEventListener('pageshow', function(event) {
    // If page is loaded from cache (back button)
    if (event.persisted) {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.replace('../../pages/Authentication/login.html');
        }
    }
});