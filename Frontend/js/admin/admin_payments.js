// ==================== ADMIN PAYMENT PAGE ====================
// NOTE: getToken, getCurrentUser, showToast, showConfirmModal, logout, API_URL are already in admin_common.js

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// Load players for dropdown
async function loadPlayersForDropdown() {
    try {
        const token = getToken();
        const response = await fetch(`${API_URL}/payments/players-list`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const players = await response.json();
            const playerSelect = document.getElementById('player_id');
            if (playerSelect) {
                playerSelect.innerHTML = '<option value="">Select Player</option>';
                players.forEach(player => {
                    playerSelect.innerHTML += `<option value="${player.id}">${escapeHtml(player.name)}</option>`;
                });
                console.log('Players loaded:', players.length);
            }
        } else {
            console.error('Failed to load players');
            showToast('Failed to load players list', 'error');
        }
    } catch (error) {
        console.error('Error loading players:', error);
        showToast('Error loading players', 'error');
    }
}

// Load payments
async function loadPayments() {
    try {
        const token = getToken();
        if (!token) {
            window.location.href = '../../pages/Authentication/login.html';
            return;
        }

        const response = await fetch(`${API_URL}/payments`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                localStorage.clear();
                window.location.href = '../../pages/Authentication/login.html';
                return;
            }
            throw new Error('Failed to load payments');
        }
        
        const payments = await response.json();
        const tbody = document.getElementById('paymentsTableBody');
        
        if (!payments || payments.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">No payments found<\/td><\/tr>';
            return;
        }
        
        tbody.innerHTML = payments.map(payment => {
            let badgeClass = '';
            let statusText = '';
            
            if (payment.status === 'completed') {
                badgeClass = 'badge-paid';
                statusText = 'Completed';
            } else if (payment.status === 'pending') {
                badgeClass = 'badge-pending';
                statusText = 'Pending';
            } else if (payment.status === 'failed') {
                badgeClass = 'badge-danger';
                statusText = 'Failed';
            } else {
                badgeClass = 'badge-pending';
                statusText = payment.status || 'Pending';
            }
            
            return `
                <tr>
                    <td>${payment.id}</td>
                    <td><strong>${escapeHtml(payment.player_name || '-')}</strong></td>
                    <td>${payment.batch_name || '-'}</td>
                    <td class="amount-cell">₹${(payment.amount || 0).toLocaleString('en-IN')}</td>
                    <td>${payment.payment_date || '-'}</td>
                    <td><span class="${badgeClass}">${statusText}</span></td>
                    <td style="white-space: nowrap;">
                        <button class="btn btn-sm btn-warning" onclick="editPayment(${payment.id})">
                            <i class="fa fa-edit"></i> Edit
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deletePayment(${payment.id})">
                            <i class="fa fa-trash"></i> Delete
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error:', error);
        const tbody = document.getElementById('paymentsTableBody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center text-danger">Failed to load payments<\/td><\/tr>';
        }
    }
}

// Show Add Payment Modal
function showAddPaymentModal() {
    document.getElementById('modalTitle').innerText = 'Add Payment';
    document.getElementById('paymentId').value = '';
    document.getElementById('player_id').value = '';
    document.getElementById('amount').value = '';
    document.getElementById('payment_date').value = new Date().toISOString().split('T')[0];
    document.getElementById('payment_mode').value = 'cash';
    document.getElementById('status').value = 'completed';
    document.getElementById('transaction_id').value = '';
    document.getElementById('remarks').value = '';
    loadPlayersForDropdown();
    document.getElementById('paymentModal').style.display = 'flex';
}

// Edit Payment
async function editPayment(id) {
    try {
        const token = getToken();
        const response = await fetch(`${API_URL}/payments/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to load payment data');
        
        const paymentData = await response.json();
        
        document.getElementById('modalTitle').innerText = 'Edit Payment';
        document.getElementById('paymentId').value = paymentData.id;
        document.getElementById('amount').value = paymentData.amount || '';
        document.getElementById('payment_date').value = paymentData.payment_date || '';
        document.getElementById('payment_mode').value = paymentData.payment_mode || 'cash';
        document.getElementById('status').value = paymentData.status || 'completed';
        document.getElementById('transaction_id').value = paymentData.transaction_id || '';
        document.getElementById('remarks').value = paymentData.remarks || '';
        
        await loadPlayersForDropdown();
        document.getElementById('player_id').value = paymentData.player_id || '';
        document.getElementById('paymentModal').style.display = 'flex';
        
    } catch (error) {
        console.error('Error:', error);
        showToast('Error loading payment data', 'error');
    }
}

// Delete Payment
function deletePayment(id) {
    showConfirmModal({
        title: 'Delete Payment',
        message: 'Are you sure you want to delete this payment?<br><small style="color: #ef4444;">This action cannot be undone!</small>',
        type: 'warning',
        onConfirm: async () => {
            try {
                const token = getToken();
                const response = await fetch(`${API_URL}/payments/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (response.ok) {
                    showToast('Payment deleted successfully', 'success');
                    loadPayments();
                } else {
                    const data = await response.json();
                    showToast(data.message || 'Delete failed', 'error');
                }
            } catch (error) {
                console.error('Error:', error);
                showToast('Error deleting payment', 'error');
            }
        }
    });
}

// Save Payment
let isSaving = false;

async function savePayment(event) {
    event.preventDefault();
    
    if (isSaving) {
        showToast('Please wait, saving in progress...', 'info');
        return;
    }
    
    const paymentId = document.getElementById('paymentId').value;
    const player_id = document.getElementById('player_id').value;
    const amount = document.getElementById('amount').value;
    const payment_date = document.getElementById('payment_date').value;
    const payment_mode = document.getElementById('payment_mode').value;
    const status = document.getElementById('status').value;
    const transaction_id = document.getElementById('transaction_id')?.value || '';
    const remarks = document.getElementById('remarks')?.value || '';
    
    if (!player_id) {
        showToast('Please select a player', 'error');
        return;
    }
    
    if (!amount || amount <= 0) {
        showToast('Please enter a valid amount', 'error');
        return;
    }
    
    if (!payment_date) {
        showToast('Please select payment date', 'error');
        return;
    }
    
    const paymentData = { 
        player_id: parseInt(player_id),
        amount: parseFloat(amount),
        payment_date: payment_date,
        payment_mode: payment_mode,
        status: status,
        transaction_id: transaction_id || null,
        remarks: remarks || null
    };
    
    const saveBtn = document.querySelector('.btn-save');
    const originalText = saveBtn.innerHTML;
    isSaving = true;
    saveBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Saving...';
    saveBtn.disabled = true;
    
    try {
        const token = getToken();
        const url = paymentId ? `${API_URL}/payments/${paymentId}` : `${API_URL}/payments`;
        const method = paymentId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(paymentData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showToast(paymentId ? 'Payment updated successfully' : 'Payment added successfully', 'success');
            closeModal();
            loadPayments();
        } else {
            showToast(data.message || 'Operation failed', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Error saving payment: ' + error.message, 'error');
    } finally {
        isSaving = false;
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
    }
}

// Search payments
function searchPayments() {
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const rows = document.querySelectorAll('#paymentsTableBody tr');
    
    rows.forEach(row => {
        const playerName = row.cells[1]?.textContent.toLowerCase() || '';
        row.style.display = playerName.includes(searchTerm) ? '' : 'none';
    });
}

// Close modal
function closeModal() {
    document.getElementById('paymentModal').style.display = 'none';
    document.getElementById('paymentForm').reset();
    isSaving = false;
}

// Make functions global
window.showAddPaymentModal = showAddPaymentModal;
window.editPayment = editPayment;
window.deletePayment = deletePayment;
window.savePayment = savePayment;
window.closeModal = closeModal;
window.searchPayments = searchPayments;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    const token = getToken();
    const user = getCurrentUser();
    
    if (!token) {
        window.location.href = '../../pages/Authentication/login.html';
        return;
    }
    
    if (user && user.role !== 'admin') {
        showToast('Access denied. Admin only.', 'error');
        setTimeout(() => {
            window.location.href = '../../pages/Authentication/login.html';
        }, 1500);
        return;
    }
    
    const userNameElement = document.getElementById('userName');
    const userRoleElement = document.getElementById('userRole');
    if (userNameElement) userNameElement.textContent = user?.full_name || user?.name || 'Admin';
    if (userRoleElement) userRoleElement.textContent = user?.role || 'Admin';
    
    loadPayments();
    
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keyup', searchPayments);
    }
    
    const paymentForm = document.getElementById('paymentForm');
    if (paymentForm) {
        paymentForm.removeEventListener('submit', savePayment);
        paymentForm.addEventListener('submit', savePayment);
    }
    
    window.onclick = function(event) {
        const modal = document.getElementById('paymentModal');
        if (event.target === modal) closeModal();
    };
});