// ==================== FEE BILLING JS ====================

let currentBillingData = [];

document.addEventListener('DOMContentLoaded', () => {
    console.log('Fee Billing page loaded');
    
    if (!checkBillingAuth()) return;
    
    loadBatches();
    loadBillingData();
    
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }
});

async function loadBatches() {
    try {
        const token = getToken();
        const response = await fetch(`${API_URL}/billing/fee-billing/batches`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const batches = await response.json();
            const batchSelect = document.getElementById('batchSelect');
            if (batchSelect) {
                batchSelect.innerHTML = '<option value="all">All Batches</option>';
                if (batches && batches.length > 0) {
                    batches.forEach(batch => {
                        batchSelect.innerHTML += `<option value="${batch.id}">${escapeHtml(batch.batch_name)}</option>`;
                    });
                }
            }
        } else {
            console.error('Failed to load batches:', response.status);
        }
    } catch (error) {
        console.error('Error loading batches:', error);
    }
}

async function loadBillingData() {
    try {
        const token = getToken();
        const monthSelect = document.getElementById('billingMonth');
        const batchSelect = document.getElementById('batchSelect');
        
        const month = monthSelect ? monthSelect.value : new Date().getMonth() + 1;
        const year = new Date().getFullYear();
        const batchId = batchSelect ? batchSelect.value : 'all';
        
        console.log('Loading billing data with params:', { month, year, batchId });
        
        const response = await fetch(`${API_URL}/billing/fee-billing/billing-data?month=${month}&year=${year}&batch_id=${batchId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('Billing data received:', data);
            currentBillingData = data.billing_data || [];
            displayBillingTable(data);
            updateSummary(data.summary);
            
            const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
            const periodElement = document.getElementById('periodDisplay');
            if (periodElement) {
                periodElement.innerHTML = `${monthNames[month - 1]} ${year}`;
            }
        } else {
            const error = await response.json();
            console.error('Failed to load billing data:', error);
            showToast(error.message || 'Failed to load billing data', 'error');
        }
    } catch (error) {
        console.error('Error loading billing data:', error);
        showToast('Error loading billing data', 'error');
    }
}

function displayBillingTable(data) {
    const tbody = document.getElementById('billingTableBody');
    if (!tbody) return;
    
    const billingData = data.billing_data || [];
    
    if (billingData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No billing data found for this period<\/td><\/tr>';
        return;
    }
    
    let html = '';
    for (let i = 0; i < billingData.length; i++) {
        const item = billingData[i];
        
        html += `
            <tr>
                <td><strong>${escapeHtml(item.player_name)}</strong></td>
                <td>${escapeHtml(item.batch_name)}</span></td>
                <td><strong>₹${formatNumber(item.yearly_fee)}</strong></span></td>
                <td>₹${formatNumber(item.paid_this_month)}</span></span></td>
                <td><strong class="text-danger">₹${formatNumber(item.pending_amount)}</strong></td>
                <td><span class="${item.status_class}">${item.status_text}</span></span></td>
                <td><button class="btn-view" onclick="viewFeeDetails(${item.player_id})"><i class="fa-solid fa-eye"></i> View</button></td>
            </tr>
        `;
    }
    tbody.innerHTML = html;
}

function updateSummary(summary) {
    if (!summary) return;
    
    const totalFeesElem = document.getElementById('totalFees');
    const totalPaidElem = document.getElementById('totalPaid');
    const totalPendingElem = document.getElementById('totalPending');
    const collectionRateElem = document.getElementById('collectionRate');
    
    if (totalFeesElem) totalFeesElem.innerHTML = `₹${formatNumber(summary.total_yearly_fees || 0)}`;
    if (totalPaidElem) totalPaidElem.innerHTML = `₹${formatNumber(summary.total_paid_all_time || 0)}`;
    if (totalPendingElem) totalPendingElem.innerHTML = `₹${formatNumber(summary.total_pending || 0)}`;
    if (collectionRateElem) collectionRateElem.innerHTML = `${summary.collection_rate || 0}%`;
}

async function viewFeeDetails(playerId) {
    try {
        const token = getToken();
        const monthSelect = document.getElementById('billingMonth');
        const month = monthSelect ? monthSelect.value : new Date().getMonth() + 1;
        const year = new Date().getFullYear();
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        
        const response = await fetch(`${API_URL}/billing/fee-billing/player-fee-details/${playerId}?month=${month}&year=${year}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to load fee details');
        
        const data = await response.json();
        const player = data.player;
        const payments = data.payments || [];
        
        const modalContent = `
            <div id="feeDetailsModal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 9999; display: flex; justify-content: center; align-items: center;">
                <div style="background: white; border-radius: 16px; width: 700px; max-width: 90%; max-height: 90%; overflow: auto;">
                    <div style="background: #2563eb; color: white; padding: 20px; display: flex; justify-content: space-between; align-items: center; border-radius: 16px 16px 0 0;">
                        <h3 style="margin: 0;"><i class="fa-solid fa-file-invoice"></i> Fee Details - ${escapeHtml(player.player_name)}</h3>
                        <button onclick="closeModal()" style="background: none; border: none; color: white; font-size: 28px; cursor: pointer;">&times;</button>
                    </div>
                    <div style="padding: 20px;">
                        <!-- Player Info -->
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid #e2e8f0;">
                            <div>
                                <p><strong>Player Name:</strong> ${escapeHtml(player.player_name)}</p>
                                <p><strong>Batch:</strong> ${escapeHtml(player.batch_name || 'Not Assigned')}</p>
                                <p><strong>Email:</strong> ${escapeHtml(player.email || 'N/A')}</p>
                            </div>
                            <div>
                                <p><strong>Phone:</strong> ${player.phone || 'N/A'}</p>
                                <p><strong>Playing Role:</strong> ${player.playing_role || 'N/A'}</p>
                                <p><strong>Status:</strong> <span class="${player.status === 'active' ? 'badge-paid' : 'badge-pending'}">${player.status || 'active'}</span></p>
                            </div>
                        </div>
                        
                        <!-- Fee Summary -->
                        <h4 style="margin-bottom: 15px;"><i class="fa-solid fa-indian-rupee-sign"></i> Fee Summary</h4>
                        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                            <tr style="background: #f8fafc;">
                                <th style="padding: 10px; text-align: left;">Description</th>
                                <th style="padding: 10px; text-align: right;">Amount (₹)</th>
                            </tr>
                            <tr>
                                <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">Yearly Fee</td>
                                <td style="padding: 10px; text-align: right; border-bottom: 1px solid #e2e8f0;">₹${formatNumber(player.yearly_fee || 0)}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">Total Paid</td>
                                <td style="padding: 10px; text-align: right; border-bottom: 1px solid #e2e8f0; color: #10b981;">₹${formatNumber(data.total_paid || 0)}</td>
                            </tr>
                            <tr style="background: #fef3c7;">
                                <td style="padding: 10px;"><strong>Pending Amount</strong></td>
                                <td style="padding: 10px; text-align: right;"><strong style="color: #dc2626;">₹${formatNumber(data.pending_amount || 0)}</strong></td>
                            </tr>
                        </table>
                        
                        <!-- Payment History -->
                        <h4 style="margin-bottom: 15px;"><i class="fa-solid fa-clock"></i> Payment History</h4>
                        <table style="width: 100%; border-collapse: collapse;">
                            <thead>
                                <tr style="background: #f8fafc;">
                                    <th style="padding: 10px; text-align: left;">Date</th>
                                    <th style="padding: 10px; text-align: left;">Amount</th>
                                    <th style="padding: 10px; text-align: left;">Mode</th>
                                    <th style="padding: 10px; text-align: left;">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${payments.length > 0 ? payments.map(p => `
                                    <tr>
                                        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${p.payment_date || 'N/A'}</td>
                                        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">₹${formatNumber(p.amount)}</td>
                                        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${p.payment_mode || 'N/A'}</td>
                                        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;"><span class="${p.status === 'completed' ? 'badge-paid' : 'badge-pending'}">${p.status || 'N/A'}</span></td>
                                    </tr>
                                `).join('') : '<tr><td colspan="4" style="padding: 20px; text-align: center;">No payment records found</td><\/tr>'}
                            </tbody>
                        </table>
                    </div>
                    <div style="padding: 20px; border-top: 1px solid #e2e8f0; text-align: right;">
                        <button onclick="closeModal()" style="background: #2563eb; color: white; border: none; padding: 10px 24px; border-radius: 8px; cursor: pointer;">Close</button>
                    </div>
                </div>
            </div>
        `;
        
        const existingModal = document.getElementById('feeDetailsModal');
        if (existingModal) existingModal.remove();
        
        const modalDiv = document.createElement('div');
        modalDiv.id = 'feeDetailsModal';
        modalDiv.innerHTML = modalContent;
        document.body.appendChild(modalDiv);
        
    } catch (error) {
        console.error('Error loading fee details:', error);
        showToast('Error loading fee details', 'error');
    }
}

function closeModal() {
    const modal = document.getElementById('feeDetailsModal');
    if (modal) modal.remove();
}

function applyFilters() {
    console.log('Applying filters...');
    loadBillingData();
}

function refreshData() {
    console.log('Refreshing data...');
    loadBillingData();
    showToast('Data refreshed successfully', 'success');
}

function formatNumber(value) {
    if (value === null || value === undefined) return '0';
    return Number(value).toLocaleString('en-IN');
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

// Make functions global
window.applyFilters = applyFilters;
window.refreshData = refreshData;
window.viewFeeDetails = viewFeeDetails;
window.closeModal = closeModal;