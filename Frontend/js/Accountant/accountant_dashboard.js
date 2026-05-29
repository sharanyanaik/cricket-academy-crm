// ==================== ACCOUNTANT DASHBOARD JS ====================

document.addEventListener('DOMContentLoaded', () => {
    console.log('Accountant Dashboard loaded');
    
    if (!checkAccountantAuth()) {
        return;
    }
    
    const user = getCurrentUser();
    const userNameElement = document.getElementById('userName');
    const userRoleElement = document.getElementById('userRole');
    
    if (userNameElement) userNameElement.textContent = user.name || user.full_name || 'Accountant';
    if (userRoleElement) userRoleElement.textContent = user.role || 'Accountant';
    
    loadDashboardStats();
    loadRecentCollections();
    
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }
});

async function loadDashboardStats() {
    try {
        const token = getToken();
        if (!token) return;
        
        const response = await fetch(`${API_URL}/accountant/dashboard/stats`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.status === 401 || response.status === 403) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '../../pages/Authentication/login.html';
            return;
        }
        
        const stats = await response.json();
        
        document.getElementById('totalCollections').innerHTML = formatCurrency(stats.total_collections);
        document.getElementById('pendingDues').innerHTML = formatCurrency(stats.pending_dues);
        document.getElementById('totalExpenses').innerHTML = formatCurrency(stats.total_expenses);
        document.getElementById('netBalance').innerHTML = formatCurrency(stats.net_balance);
        
    } catch (error) {
        console.error('Error:', error);
        showToast('Failed to load stats', 'error');
    }
}

async function loadRecentCollections() {
    try {
        const token = getToken();
        if (!token) return;
        
        const response = await fetch(`${API_URL}/accountant/dashboard/recent-collections`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.status === 401 || response.status === 403) return;
        
        const collections = await response.json();
        const tbody = document.getElementById('recentCollectionsBody');
        
        if (!tbody) return;
        
        if (!collections || collections.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">No collections found<\/td><\/tr>';
            return;
        }
        
        let html = '';
        for (let i = 0; i < collections.length; i++) {
            const c = collections[i];
            html += `
                <tr>
                    <td>${formatDate(c.payment_date)}</td>
                    <td>${c.player_name || '-'}</td>
                    <td>${formatCurrency(c.amount)}</td>
                    <td>${c.payment_mode || '-'}</td>
                    <td><span class="${c.status === 'completed' ? 'badge-paid' : 'badge-pending'}">${c.status || 'PENDING'}</span></td>
                    <td><button class="view-btn" onclick="viewPaymentDetails(${c.id})">View</button></td>
                </tr>
            `;
        }
        tbody.innerHTML = html;
        
    } catch (error) {
        console.error('Error loading recent collections:', error);
        const tbody = document.getElementById('recentCollectionsBody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Failed to load collections<\/td><\/tr>';
        }
    }
}

async function viewPaymentDetails(id) {
    try {
        const token = getToken();
        const response = await fetch(`${API_URL}/accountant/payments/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const payment = await response.json();
            
            document.getElementById('detailId').textContent = payment.id;
            document.getElementById('detailDate').textContent = formatDate(payment.payment_date);
            document.getElementById('detailPlayer').textContent = payment.player_name || '-';
            document.getElementById('detailAmount').textContent = formatCurrency(payment.amount);
            document.getElementById('detailMode').textContent = payment.payment_mode || '-';
            document.getElementById('detailStatus').innerHTML = `<span class="${payment.status === 'completed' ? 'badge-paid' : 'badge-pending'}">${payment.status || 'PENDING'}</span>`;
            document.getElementById('detailRemarks').textContent = payment.remarks || 'No remarks';
            
            document.getElementById('paymentDetailModal').style.display = 'flex';
        } else {
            showToast('Failed to load payment details', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Error loading payment details', 'error');
    }
}

function closePaymentModal() {
    document.getElementById('paymentDetailModal').style.display = 'none';
}

function refreshData() {
    loadDashboardStats();
    loadRecentCollections();
    showToast('Data refreshed', 'success');
}