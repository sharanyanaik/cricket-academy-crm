// ==================== OUTSTANDING JS ====================

let allOutstanding = [];

document.addEventListener('DOMContentLoaded', () => {
    console.log('Outstanding page loaded');
    
    if (!checkBillingAuth()) return;
    
    loadOutstandingSummary();
    loadOutstandingDues();
    
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }
});

async function loadOutstandingSummary() {
    try {
        const token = getToken();
        const response = await fetch(`${API_URL}/billing/outstanding/summary`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const summary = await response.json();
            document.getElementById('totalPlayers').innerHTML = summary.total_players_with_dues || 0;
            document.getElementById('totalOutstanding').innerHTML = formatCurrency(summary.total_outstanding_amount);
        } else {
            console.error('Failed to load summary:', response.status);
        }
    } catch (error) {
        console.error('Error loading summary:', error);
    }
}

async function loadOutstandingDues() {
    try {
        const token = getToken();
        if (!token) return;
        
        const response = await fetch(`${API_URL}/billing/outstanding/`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.status === 401 || response.status === 403) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '../../pages/Authentication/login.html';
            return;
        }
        
        if (!response.ok) {
            console.error('Failed to fetch outstanding:', response.status);
            showToast('Failed to load outstanding dues', 'error');
            return;
        }
        
        const outstanding = await response.json();
        allOutstanding = Array.isArray(outstanding) ? outstanding : [];
        displayOutstanding(allOutstanding);
        
    } catch (error) {
        console.error('Error loading outstanding:', error);
        showToast('Error loading outstanding dues', 'error');
    }
}

function displayOutstanding(outstanding) {
    const tbody = document.getElementById('outstandingTableBody');
    if (!tbody) return;
    
    if (outstanding.length === 0) {
        tbody.innerHTML = '<td><td colspan="6" class="text-center">No outstanding dues found</td><\/tr>';
        return;
    }
    
    let html = '';
    outstanding.forEach(player => {
        let statusClass = '';
        let statusText = '';
        let statusIcon = '';
        
        if (player.total_due === player.total_fee) {
            statusClass = 'status-notpaid';
            statusText = 'Not Paid';
            statusIcon = '<i class="fa-solid fa-circle-exclamation"></i>';
        } else {
            statusClass = 'status-pending';
            statusText = 'Pending';
            statusIcon = '<i class="fa-regular fa-clock"></i>';
        }
        
        html += `
            <tr>
                <td><strong>${escapeHtml(player.player_name)}</strong><br><small class="text-muted">${escapeHtml(player.batch_name || 'No Batch')}</small></td>
                <td>${formatCurrency(player.total_fee)}</span></td>
                <td>${formatCurrency(player.total_paid)}</span></td>
                <td class="due-amount">${formatCurrency(player.total_due)}</span></td>
                <td><span class="${statusClass}">${statusIcon} ${statusText}</span></td>
                <td>
                    <button class="view-btn" onclick="viewPlayerDetails(${player.player_id})">
                        <i class="fa-solid fa-eye"></i> View
                    </button>
                 </span>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

async function viewPlayerDetails(playerId) {
    try {
        const token = getToken();
        const response = await fetch(`${API_URL}/billing/outstanding/player/${playerId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            showPlayerModal(data);
        } else {
            showToast('Failed to load player details', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Error loading player details', 'error');
    }
}

function showPlayerModal(data) {
    let modal = document.getElementById('playerModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'playerModal';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-container">
                <div class="modal-header">
                    <h3><i class="fa-solid fa-user"></i> Player Details</h3>
                    <button onclick="closePlayerModal()" class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <p><strong>Name:</strong> <span id="modalPlayerName"></span></p>
                    <p><strong>Email:</strong> <span id="modalPlayerEmail"></span></p>
                    <p><strong>Phone:</strong> <span id="modalPlayerPhone"></span></p>
                    <p><strong>Joined Date:</strong> <span id="modalJoinedDate"></span></p>
                    <hr>
                    <p><strong>Total Paid:</strong> <span id="modalTotalPaid" style="color:#10b981;"></span></p>
                    <p><strong>Total Due:</strong> <span id="modalTotalDue" style="color:#ef4444;"></span></p>
                    <hr>
                    <h5>Pending Invoices</h5>
                    <div id="modalInvoices"></div>
                </div>
                <div class="modal-footer">
                    <button class="btn-close-modal" onclick="closePlayerModal()">Close</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        const style = document.createElement('style');
        style.textContent = `
            .modal-overlay {
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
            .modal-container {
                background: white;
                border-radius: 16px;
                width: 500px;
                max-width: 90%;
                max-height: 80vh;
                overflow-y: auto;
                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            }
            .modal-header {
                padding: 20px;
                border-bottom: 1px solid #e2e8f0;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .modal-header h3 { margin: 0; color: #1e293b; }
            .modal-close {
                background: none;
                border: none;
                font-size: 28px;
                cursor: pointer;
                color: #64748b;
            }
            .modal-close:hover { color: #ef4444; }
            .modal-body { padding: 20px; }
            .modal-body p { margin-bottom: 12px; }
            .modal-footer {
                padding: 16px 20px;
                border-top: 1px solid #e2e8f0;
                text-align: right;
            }
            .btn-close-modal {
                background: #2563eb;
                color: white;
                border: none;
                padding: 8px 20px;
                border-radius: 8px;
                cursor: pointer;
            }
            .btn-close-modal:hover { background: #1d4ed8; }
            .view-btn {
                background: #2563eb;
                color: white;
                border: none;
                padding: 5px 12px;
                border-radius: 6px;
                cursor: pointer;
            }
            .view-btn:hover { background: #1d4ed8; }
            .due-amount { font-weight: 600; color: #dc2626; }
            .status-pending {
                background: #fef3c7;
                color: #92400e;
                padding: 4px 12px;
                border-radius: 20px;
                font-size: 12px;
                display: inline-block;
            }
            .status-notpaid {
                background: #fee2e2;
                color: #991b1b;
                padding: 4px 12px;
                border-radius: 20px;
                font-size: 12px;
                display: inline-block;
            }
            .invoice-item {
                padding: 8px 0;
                border-bottom: 1px solid #e2e8f0;
                display: flex;
                justify-content: space-between;
            }
        `;
        document.head.appendChild(style);
    }
    
    document.getElementById('modalPlayerName').textContent = data.player?.full_name || '-';
    document.getElementById('modalPlayerEmail').textContent = data.player?.email || '-';
    document.getElementById('modalPlayerPhone').textContent = data.player?.phone || '-';
    document.getElementById('modalJoinedDate').textContent = formatDate(data.player?.joined_date) || '-';
    document.getElementById('modalTotalPaid').innerHTML = formatCurrency(data.payment_summary?.total_paid);
    document.getElementById('modalTotalDue').innerHTML = formatCurrency(data.payment_summary?.total_due);
    
    const invoicesDiv = document.getElementById('modalInvoices');
    if (data.pending_invoices && data.pending_invoices.length > 0) {
        let invoicesHtml = '';
        data.pending_invoices.forEach(inv => {
            invoicesHtml += `
                <div class="invoice-item">
                    <span>${inv.invoice_number}</span>
                    <span>${formatCurrency(inv.amount)}</span>
                    <span>Due: ${formatDate(inv.due_date)}</span>
                </div>
            `;
        });
        invoicesDiv.innerHTML = invoicesHtml;
    } else {
        invoicesDiv.innerHTML = '<p class="text-muted">No pending invoices</p>';
    }
    
    modal.style.display = 'flex';
}

function closePlayerModal() {
    const modal = document.getElementById('playerModal');
    if (modal) modal.style.display = 'none';
}

function refreshOutstanding() {
    loadOutstandingSummary();
    loadOutstandingDues();
    showToast('Outstanding dues refreshed', 'success');
}