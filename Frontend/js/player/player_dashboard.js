// ==================== PLAYER DASHBOARD JS ====================

document.addEventListener('DOMContentLoaded', () => {
    if (!checkPlayerAuth()) return;
    loadDashboardData();
    
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }
});

async function loadDashboardData() {
    try {
        const token = getToken();
        const user = getCurrentUser();
        
        // Display the logged-in player's name
        if (user && (user.name || user.full_name)) {
            document.getElementById('playerName').textContent = `Welcome, ${user.name || user.full_name || 'Player'}!`;
        }
        
        // Use the dashboard endpoint directly
        const response = await fetch(`${API_URL}/player/dashboard`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('Dashboard data:', data);
            
            // Update stats cards
            document.getElementById('totalFees').innerHTML = formatCurrency(data.totalFees || 0);
            document.getElementById('paidAmount').innerHTML = formatCurrency(data.totalPaid || 0);
            document.getElementById('pendingAmount').innerHTML = formatCurrency(data.pendingAmount || 0);
            document.getElementById('attendancePercent').innerHTML = `${data.attendancePercent || 0}%`;
            
            // Update recent payments table
            displayRecentPayments(data.recentPayments);
        } else if (response.status === 401 || response.status === 403) {
            logout();
        } else {
            const error = await response.json();
            console.error('Error:', error);
            showToast(error.message || 'Failed to load dashboard data', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Error loading dashboard data', 'error');
    }
}

function displayRecentPayments(payments) {
    const tbody = document.getElementById('recentPaymentsBody');
    if (!tbody) return;
    
    if (!payments || payments.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">No payments found</td></tr>';
        return;
    }
    
    tbody.innerHTML = '';
    payments.forEach(payment => {
        const row = tbody.insertRow();
        row.insertCell(0).textContent = formatDate(payment.payment_date);
        row.insertCell(1).innerHTML = formatCurrency(payment.amount);
        row.insertCell(2).textContent = payment.payment_mode || 'Cash';
        
        // Status badge
        const statusClass = payment.status === 'completed' ? 'bg-success' : (payment.status === 'pending' ? 'bg-warning' : 'bg-danger');
        const statusText = payment.status === 'completed' ? 'Completed' : (payment.status === 'pending' ? 'Pending' : 'Failed');
        row.insertCell(3).innerHTML = `<span class="badge ${statusClass}">${statusText}</span>`;
        
        // Receipt button
        row.insertCell(4).innerHTML = `<button class="btn btn-sm btn-info" onclick="downloadReceipt(${payment.id})"><i class="fa-solid fa-download"></i> Receipt</button>`;
    });
}

async function downloadReceipt(paymentId) {
    try {
        const token = getToken();
        const response = await fetch(API_URL + '/player/dashboard/receipt/' + paymentId, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const payment = await response.json();
            console.log('Payment receipt data:', payment);
            
            // Create enhanced receipt HTML with Transaction ID
            const receiptHtml = `
                <div id="receiptModal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; justify-content: center; align-items: center;">
                    <div style="background: white; border-radius: 16px; width: 500px; max-width: 90%; padding: 0; overflow: hidden;">
                        <div style="background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; text-align: center; padding: 25px;">
                            <i class="fa-solid fa-receipt" style="font-size: 48px; margin-bottom: 10px;"></i>
                            <h3 style="margin: 0;">Payment Receipt</h3>
                            <p style="margin: 5px 0 0; opacity: 0.9;">Cricket CRM Academy</p>
                        </div>
                        <div style="padding: 25px;">
                            <div style="background: #f0fdf4; padding: 12px; border-radius: 10px; margin-bottom: 20px; text-align: center; border: 1px solid #bbf7d0;">
                                <p style="margin: 0; font-size: 11px; color: #166534; text-transform: uppercase; letter-spacing: 1px;">Transaction ID</p>
                                <p style="margin: 5px 0 0; font-weight: bold; font-size: 16px; font-family: monospace; color: #065f46;">${payment.transaction_id || 'N/A'}</p>
                            </div>
                            <div style="margin-bottom: 20px;">
                                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #e2e8f0;">
                                    <span style="color: #64748b;">Receipt No:</span>
                                    <span style="font-weight: 600;">#${payment.id}</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #e2e8f0;">
                                    <span style="color: #64748b;">Date:</span>
                                    <span style="font-weight: 600;">${formatDate(payment.payment_date)}</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #e2e8f0;">
                                    <span style="color: #64748b;">Player Name:</span>
                                    <span style="font-weight: 600;">${payment.player_name || 'N/A'}</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #e2e8f0;">
                                    <span style="color: #64748b;">Batch:</span>
                                    <span style="font-weight: 600;">${payment.batch_name || 'Not Assigned'}</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #e2e8f0;">
                                    <span style="color: #64748b;">Payment Mode:</span>
                                    <span style="font-weight: 600;">${getPaymentModeText(payment.payment_mode)}</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #e2e8f0;">
                                    <span style="color: #64748b;">Amount:</span>
                                    <span style="font-weight: 700; font-size: 18px; color: #2563eb;">${formatCurrency(payment.amount)}</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #e2e8f0;">
                                    <span style="color: #64748b;">Status:</span>
                                    <span style="padding: 4px 12px; border-radius: 20px; background: ${payment.status === 'completed' ? '#d1fae5' : '#fed7aa'}; color: ${payment.status === 'completed' ? '#065f46' : '#92400e'};">
                                        ${payment.status === 'completed' ? 'Completed' : 'Pending'}
                                    </span>
                                </div>
                                ${payment.remarks ? `
                                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #e2e8f0;">
                                    <span style="color: #64748b;">Remarks:</span>
                                    <span style="font-weight: 600;">${payment.remarks}</span>
                                </div>
                                ` : ''}
                            </div>
                            <div style="text-align: center; font-size: 11px; color: #94a3b8; padding-top: 15px; border-top: 1px solid #e2e8f0;">
                                This is a system generated receipt. Valid without signature.
                            </div>
                        </div>
                        <div style="padding: 20px; border-top: 1px solid #e2e8f0; display: flex; justify-content: center; gap: 15px; background: #f8fafc;">
                            <button onclick="printReceipt()" style="background: #2563eb; color: white; border: none; padding: 8px 20px; border-radius: 8px; cursor: pointer;">
                                <i class="fa-solid fa-print"></i> Print
                            </button>
                            <button onclick="closeReceiptModal()" style="background: #ef4444; color: white; border: none; padding: 8px 20px; border-radius: 8px; cursor: pointer;">
                                <i class="fa-solid fa-times"></i> Close
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            const existingModal = document.getElementById('receiptModal');
            if (existingModal) existingModal.remove();
            document.body.insertAdjacentHTML('beforeend', receiptHtml);
        } else {
            const error = await response.json();
            showToast(error.message || 'Failed to load receipt', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Error downloading receipt', 'error');
    }
}

function getPaymentModeText(mode) {
    switch(mode) {
        case 'cash': return 'Cash';
        case 'upi': return 'UPI';
        case 'card': return 'Card';
        case 'bank_transfer': return 'Bank Transfer';
        default: return mode || 'Cash';
    }
}

function printReceipt() {
    const modal = document.getElementById('receiptModal');
    if (!modal) return;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
            <head>
                <title>Payment Receipt</title>
                <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
                <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    @media print {
                        button { display: none; }
                        body { margin: 0; padding: 0; }
                    }
                </style>
            </head>
            <body>
                ${modal.innerHTML}
            </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
}

function closeReceiptModal() {
    const modal = document.getElementById('receiptModal');
    if (modal) modal.remove();
}

window.printReceipt = printReceipt;
window.closeReceiptModal = closeReceiptModal;
window.downloadReceipt = downloadReceipt;