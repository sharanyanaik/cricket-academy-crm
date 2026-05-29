// ==================== PAYMENTS JS ====================

document.addEventListener('DOMContentLoaded', () => {
    console.log('Payments page loaded');
    
    if (!checkBillingAuth()) return;
    
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
        const response = await fetch(`${API_URL}/billing/players`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const players = await response.json();
            const select = document.getElementById('playerId');
            if (select) {
                select.innerHTML = '<option value="">-- Select Player --</option>';
                players.forEach(player => {
                    select.innerHTML += `<option value="${player.id}">${player.player_name}</option>`;
                });
            }
        } else {
            console.error('Failed to load players');
        }
    } catch (error) {
        console.error('Error loading players:', error);
    }
}

async function loadRecentPayments() {
    try {
        const token = getToken();
        const response = await fetch(`${API_URL}/billing/payments/all`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const payments = await response.json();
            displayPayments(payments);
        } else if (response.status === 401 || response.status === 403) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '../../pages/Authentication/login.html';
        }
    } catch (error) {
        console.error('Error loading payments:', error);
    }
}

function displayPayments(payments) {
    const tbody = document.getElementById('paymentsTableBody');
    if (!tbody) return;
    
    if (!payments || payments.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">No payments found</td><\/tr>';
        return;
    }
    
    let html = '';
    payments.forEach(payment => {
        const statusClass = payment.status === 'completed' ? 'badge-paid' : 'badge-pending';
        const statusText = payment.status === 'completed' ? 'Success' : 'Pending';
        
        html += `
            <tr>
                <td>${formatDate(payment.payment_date)}</td>
                <td>${payment.player_name}</td>
                <td>${formatCurrency(payment.amount)}</td>
                <td>${payment.payment_mode || '-'}</td>
                <td><span class="${statusClass}">${statusText}</span></td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

// Show add payment form - HIDE the payments table
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

// Hide add payment form - SHOW the payments table
function hideAddForm() {
    const formCard = document.getElementById('paymentFormCard');
    const paymentsContainer = document.getElementById('paymentsContainer');
    
    if (formCard) {
        formCard.classList.remove('show');
    }
    
    // Show the payments table again
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
    const paymentDate = document.getElementById('paymentDate').value;
    const paymentMode = document.getElementById('paymentMode').value;
    const transactionId = document.getElementById('transactionId').value;
    const status = document.getElementById('status')?.value || 'completed';
    const remarks = document.getElementById('remarks')?.value || '';
    
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
        const response = await fetch(`${API_URL}/billing/payments/record`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                player_id: parseInt(playerId),
                amount: parseFloat(amount),
                payment_date: paymentDate,
                payment_mode: paymentMode,
                transaction_id: transactionId,
                status: status,
                remarks: remarks
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showToast('Payment recorded successfully!', 'success');
            hideAddForm();
            loadRecentPayments();
            loadPlayers();
        } else {
            showToast(data.message || 'Failed to record payment', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Error recording payment', 'error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalText;
    }
}

function refreshPayments() {
    loadRecentPayments();
    showToast('Payments refreshed', 'success');
}