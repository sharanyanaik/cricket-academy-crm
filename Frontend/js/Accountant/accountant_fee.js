// ==================== ACCOUNTANT FEE COLLECTION JS ====================

document.addEventListener('DOMContentLoaded', () => {
    console.log('Fee Collection page loaded');
    
    if (!checkAccountantAuth()) return;
    
    setDefaultDate();
    loadPlayers();
    loadRecentPayments();
    
    const paymentForm = document.getElementById('paymentForm');
    if (paymentForm) {
        paymentForm.addEventListener('submit', savePayment);
    }
    
    // Show add form button
    const showAddFormBtn = document.getElementById('showAddFormBtn');
    if (showAddFormBtn) {
        showAddFormBtn.addEventListener('click', showAddForm);
    }
    
    // Cancel form button
    const cancelFormBtn = document.getElementById('cancelFormBtn');
    if (cancelFormBtn) {
        cancelFormBtn.addEventListener('click', hideAddForm);
    }
    
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }
});

function setDefaultDate() {
    const dateInput = document.getElementById('paymentDate');
    if (dateInput && !dateInput.value) {
        dateInput.valueAsDate = new Date();
    }
}

async function loadPlayers() {
    try {
        const token = getToken();
        if (!token) return;
        
        const response = await fetch(`${API_URL}/accountant/players`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const players = await response.json();
            const playerSelect = document.getElementById('playerId');
            
            if (players && players.length > 0) {
                playerSelect.innerHTML = '<option value="">-- Select Player --</option>';
                players.forEach(player => {
                    playerSelect.innerHTML += `<option value="${player.id}">${player.player_name || player.full_name}</option>`;
                });
            } else {
                playerSelect.innerHTML = '<option value="">No players found</option>';
            }
        } else if (response.status === 401 || response.status === 403) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '../../pages/Authentication/login.html';
        }
    } catch (error) {
        console.error('Error loading players:', error);
        showToast('Failed to load players', 'error');
    }
}

async function loadRecentPayments() {
    try {
        const token = getToken();
        if (!token) return;
        
        const response = await fetch(`${API_URL}/accountant/payments`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const payments = await response.json();
            const tbody = document.getElementById('recentPaymentsBody');
            
            if (!tbody) return;
            
            if (payments && payments.length > 0) {
                tbody.innerHTML = payments.slice(0, 10).map(p => `
                    <tr>
                        <td>${formatDate(p.payment_date)}</td>
                        <td>${p.player_name || '-'}</td>
                        <td>${formatCurrency(p.amount)}</td>
                        <td>${p.payment_mode || '-'}</td>
                        <td><span class="${p.status === 'completed' ? 'badge-paid' : 'badge-pending'}">${p.status || 'PENDING'}</span></td>
                    </tr>
                `).join('');
            } else {
                tbody.innerHTML = '<tr><td colspan="5" class="text-center">No payments found</td><\/tr>';
            }
        }
    } catch (error) {
        console.error('Error loading payments:', error);
        const tbody = document.getElementById('recentPaymentsBody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Failed to load payments</td><\/tr>';
        }
    }
}

// Show add payment form 
function showAddForm() {
    const formCard = document.getElementById('paymentFormCard');
    const paymentsContainer = document.getElementById('paymentsContainer');
    
    if (formCard) {
        formCard.classList.add('show');
        setDefaultDate();
        formCard.scrollIntoView({ behavior: 'smooth' });
    }
    
    // Hide the payments table
    if (paymentsContainer) {
        paymentsContainer.style.display = 'none';
    }
}

//SHOW the payments table
function hideAddForm() {
    const formCard = document.getElementById('paymentFormCard');
    const paymentsContainer = document.getElementById('paymentsContainer');
    
    if (formCard) {
        formCard.classList.remove('show');
    }
    
    // Show the payments table 
    if (paymentsContainer) {
        paymentsContainer.style.display = 'block';
    }
    
    // Reset form
    const form = document.getElementById('paymentForm');
    if (form) {
        form.reset();
        setDefaultDate();
        document.getElementById('playerId').value = '';
    }
}

async function savePayment(event) {
    event.preventDefault();
    
    const playerId = document.getElementById('playerId').value;
    const amount = document.getElementById('amount').value;
    const paymentMode = document.getElementById('paymentMode').value;
    const paymentDate = document.getElementById('paymentDate').value;
    const status = document.getElementById('status').value;
    const remarks = document.getElementById('remarks').value;
    
    if (!playerId || !amount || !paymentDate) {
        showToast('Please fill all required fields', 'error');
        return;
    }
    
    const saveBtn = document.getElementById('saveBtn');
    const originalText = saveBtn.innerHTML;
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
    
    try {
        const token = getToken();
        const response = await fetch(`${API_URL}/accountant/payments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                player_id: parseInt(playerId),
                amount: parseFloat(amount),
                payment_mode: paymentMode,
                payment_date: paymentDate,
                status: status,
                remarks: remarks
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showToast('Payment saved successfully!', 'success');
            hideAddForm();
            loadRecentPayments();
            loadPlayers();
        } else {
            showToast(data.message || 'Failed to save payment', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Error saving payment. Make sure backend is running.', 'error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalText;
    }
}