// ==================== BILLING DASHBOARD JS ====================

document.addEventListener('DOMContentLoaded', () => {
    console.log('Billing Dashboard loaded');
    
    if (!checkBillingAuth()) {
        return;
    }
    
    const user = getCurrentUser();
    const userNameElement = document.getElementById('userName');
    const userRoleElement = document.getElementById('userRole');
    
    if (userNameElement) userNameElement.textContent = user.name || user.full_name || 'Billing Staff';
    if (userRoleElement) userRoleElement.textContent = user.role || 'Billing';
    
    loadDashboardStats();
    loadRecentInvoices();
    
    // Logout button - FIXED
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            logout(); // This calls the function from billing_common.js
        });
    }
});

async function loadDashboardStats() {
    try {
        const token = getToken();
        if (!token) return;
        
        const response = await fetch(`${API_URL}/billing/stats`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.status === 401 || response.status === 403) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '../../pages/Authentication/login.html';
            return;
        }
        
        const stats = await response.json();
        
        document.getElementById('monthCollection').innerHTML = formatCurrency(stats.month_collection);
        document.getElementById('outstandingDues').innerHTML = formatCurrency(stats.outstanding_dues);
        document.getElementById('totalInvoices').innerHTML = stats.total_invoices;
        document.getElementById('paymentsReceived').innerHTML = stats.payments_received;
        
    } catch (error) {
        console.error('Error loading stats:', error);
        showToast('Failed to load dashboard stats', 'error');
    }
}

async function loadRecentInvoices() {
    try {
        const token = getToken();
        if (!token) return;
        
        const response = await fetch(`${API_URL}/billing/recent-invoices`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.status === 401 || response.status === 403) return;
        
        const invoices = await response.json();
        const tbody = document.getElementById('recentInvoicesBody');
        
        if (!tbody) return;
        
        if (!invoices || invoices.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">No invoices found<\/td><\/tr>';
            return;
        }
        
        let html = '';
        invoices.forEach(invoice => {
            const statusClass = invoice.status === 'completed' ? 'badge-paid' : 'badge-pending';
            const statusText = invoice.status === 'completed' ? 'Paid' : 'Pending';
            
            html += `
                <tr>
                    <td>${invoice.invoice_number}</td>
                    <td>${invoice.player_name}</td>
                    <td>${formatCurrency(invoice.amount)}</td>
                    <td>${formatDate(invoice.due_date)}</td>
                    <td><span class="${statusClass}">${statusText}</span></td>
                    <td><button class="view-btn" onclick="viewInvoiceDetails(${invoice.id})">View</button></td>
                </tr>
            `;
        });
        tbody.innerHTML = html;
        
    } catch (error) {
        console.error('Error loading invoices:', error);
        const tbody = document.getElementById('recentInvoicesBody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Failed to load invoices<\/td><\/tr>';
        }
    }
}

// View Invoice Details in Modal
async function viewInvoiceDetails(id) {
    try {
        const token = getToken();
        const response = await fetch(`${API_URL}/billing/invoices/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const invoice = await response.json();
            
            document.getElementById('detailInvoiceNo').textContent = invoice.invoice_number || `INV-${invoice.id}`;
            document.getElementById('detailDate').textContent = formatDate(invoice.payment_date);
            document.getElementById('detailPlayer').textContent = invoice.player_name || '-';
            document.getElementById('detailAmount').textContent = formatCurrency(invoice.amount);
            document.getElementById('detailMode').textContent = invoice.payment_mode || '-';
            
            const statusClass = invoice.status === 'completed' ? 'badge-paid' : 'badge-pending';
            const statusText = invoice.status === 'completed' ? 'Paid' : 'Pending';
            document.getElementById('detailStatus').innerHTML = `<span class="${statusClass}">${statusText}</span>`;
            document.getElementById('detailDueDate').textContent = formatDate(invoice.due_date) || formatDate(invoice.payment_date);
            
            document.getElementById('invoiceDetailModal').style.display = 'flex';
        } else {
            showToast('Failed to load invoice details', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Error loading invoice details', 'error');
    }
}

function closeInvoiceModal() {
    document.getElementById('invoiceDetailModal').style.display = 'none';
}

function refreshData() {
    loadDashboardStats();
    loadRecentInvoices();
    showToast('Data refreshed', 'success');
}

// Make functions global
window.viewInvoiceDetails = viewInvoiceDetails;
window.closeInvoiceModal = closeInvoiceModal;
window.refreshData = refreshData;