// ==================== PLAYER PAYMENTS JS ====================

let currentPage = 1;
let totalPages = 1;

document.addEventListener('DOMContentLoaded', () => {
    if (!checkPlayerAuth()) return;
    
    // Display player name in header card
    const user = getCurrentUser();
    const playerNameHeader = document.getElementById('playerNameHeader');
    if (playerNameHeader && user) {
        const nameSpan = playerNameHeader.querySelector('span');
        if (nameSpan) {
            nameSpan.textContent = user.name || user.full_name || 'Player';
        }
    }
    
    loadSummary();
    loadPayments();
    
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keyup', () => {
            loadPayments(1);
        });
    }
    
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }
});

async function loadSummary() {
    try {
        const token = getToken();
        const response = await fetch(API_URL + '/player/payments/summary', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        
        if (response.ok) {
            const summary = await response.json();
            
            const totalPaidElem = document.getElementById('totalPaid');
            if (totalPaidElem) totalPaidElem.textContent = formatCurrency(summary.totalPaid || 0);
            
            const totalFeesElem = document.getElementById('totalFees');
            if (totalFeesElem) totalFeesElem.textContent = formatCurrency(summary.totalFees || 0);
            
            const pendingAmount = (summary.totalFees || 0) - (summary.totalPaid || 0);
            const pendingAmountElem = document.getElementById('pendingAmount');
            if (pendingAmountElem) pendingAmountElem.textContent = formatCurrency(pendingAmount < 0 ? 0 : pendingAmount);
        }
    } catch (error) {
        console.error('Error loading summary:', error);
    }
}

async function loadPayments(page = 1) {
    currentPage = page;
    const searchInput = document.getElementById('searchInput');
    const search = searchInput ? searchInput.value : '';
    
    try {
        const token = getToken();
        const response = await fetch(API_URL + '/player/payments?page=' + page + '&limit=10&search=' + encodeURIComponent(search), {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        
        if (response.ok) {
            const data = await response.json();
            totalPages = data.totalPages || 1;
            displayPayments(data.payments);
            renderPagination();
        } else if (response.status === 401 || response.status === 403) {
            logout();
        }
    } catch (error) {
        console.error('Error loading payments:', error);
        const tbody = document.getElementById('paymentsBody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">Error loading payments</td></tr>';
        }
    }
}

function displayPayments(payments) {
    const tbody = document.getElementById('paymentsBody');
    if (!tbody) return;
    
    if (!payments || payments.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No payments found</td></tr>';
        return;
    }
    
    tbody.innerHTML = '';
    for (let i = 0; i < payments.length; i++) {
        const payment = payments[i];
        const row = tbody.insertRow();
        
        row.insertCell(0).textContent = payment.id;
        row.insertCell(1).textContent = formatDate(payment.payment_date);
        row.insertCell(2).className = 'amount-cell';
        row.insertCell(2).innerHTML = formatCurrency(payment.amount);
        row.insertCell(3).textContent = payment.payment_mode || 'Cash';
        row.insertCell(4).textContent = payment.transaction_id || 'N/A';
        
        let statusClass = '';
        let statusText = '';
        if (payment.status === 'completed') {
            statusClass = 'badge-success';
            statusText = 'Completed';
        } else if (payment.status === 'pending') {
            statusClass = 'badge-pending';
            statusText = 'Pending';
        } else {
            statusClass = 'badge-failed';
            statusText = payment.status || 'Unknown';
        }
        row.insertCell(5).innerHTML = '<span class="badge ' + statusClass + '">' + statusText + '</span>';
        row.insertCell(6).innerHTML = '<button class="btn btn-sm btn-info" onclick="downloadReceipt(' + payment.id + ')"><i class="fa-solid fa-download"></i> Receipt</button>';
    }
}

function renderPagination() {
    const paginationDiv = document.getElementById('pagination');
    if (!paginationDiv) return;
    
    if (totalPages <= 1) {
        paginationDiv.innerHTML = '';
        return;
    }
    
    let html = '<ul class="pagination">';
    
    html += '<li class="page-item ' + (currentPage === 1 ? 'disabled' : '') + '">';
    html += '<a class="page-link" href="#" onclick="loadPayments(' + (currentPage - 1) + ')">Previous</a>';
    html += '</li>';
    
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, currentPage + 2);
    
    if (startPage > 1) {
        html += '<li class="page-item"><a class="page-link" href="#" onclick="loadPayments(1)">1</a></li>';
        if (startPage > 2) html += '<li class="page-item disabled"><span class="page-link">...</span></li>';
    }
    
    for (let i = startPage; i <= endPage; i++) {
        html += '<li class="page-item ' + (currentPage === i ? 'active' : '') + '">';
        html += '<a class="page-link" href="#" onclick="loadPayments(' + i + ')">' + i + '</a>';
        html += '</li>';
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) html += '<li class="page-item disabled"><span class="page-link">...</span></li>';
        html += '<li class="page-item"><a class="page-link" href="#" onclick="loadPayments(' + totalPages + ')">' + totalPages + '</a></li>';
    }
    
    html += '<li class="page-item ' + (currentPage === totalPages ? 'disabled' : '') + '">';
    html += '<a class="page-link" href="#" onclick="loadPayments(' + (currentPage + 1) + ')">Next</a>';
    html += '</li>';
    
    html += '</ul>';
    paginationDiv.innerHTML = html;
}

async function downloadReceipt(paymentId) {
    try {
        const token = getToken();
        const response = await fetch(API_URL + '/player/payments/receipt/' + paymentId, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        
        if (response.ok) {
            const payment = await response.json();
            
            const receiptHtml = `
                <div id="receiptModal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; justify-content: center; align-items: center;">
                    <div style="background: white; border-radius: 12px; width: 450px; max-width: 90%; padding: 25px;">
                        <div style="text-align: center; margin-bottom: 20px;">
                            <i class="fa-solid fa-receipt" style="font-size: 48px; color: #2563eb;"></i>
                            <h3 style="margin-top: 10px;">Payment Receipt</h3>
                            <p style="color: #64748b;">Cricket CRM Academy</p>
                        </div>
                        <hr>
                        <div style="margin-bottom: 15px;">
                            <div style="background: #f0fdf4; padding: 10px; border-radius: 8px; margin-bottom: 15px; text-align: center;">
                                <p style="margin: 0; font-size: 12px; color: #166534;">TRANSACTION ID</p>
                                <p style="margin: 5px 0 0; font-weight: bold; font-size: 14px;">` + (payment.transaction_id || 'N/A') + `</p>
                            </div>
                            <p><strong>Receipt No:</strong> #` + payment.id + `</p>
                            <p><strong>Date:</strong> ` + formatDate(payment.payment_date) + `</p>
                            <p><strong>Player Name:</strong> ` + (payment.player_name || '-') + `</p>
                            <p><strong>Batch:</strong> ` + (payment.batch_name || '-') + `</p>
                            <p><strong>Amount:</strong> ` + formatCurrency(payment.amount) + `</p>
                            <p><strong>Payment Mode:</strong> ` + (payment.payment_mode || 'Cash') + `</p>
                            <p><strong>Status:</strong> <span style="color: ` + (payment.status === 'completed' ? '#10b981' : '#f59e0b') + `">` + (payment.status === 'completed' ? 'Completed' : 'Pending') + `</span></p>
                        </div>
                        <hr>
                        <div style="text-align: center; font-size: 12px; color: #94a3b8; margin-bottom: 15px;">
                            This is a system generated receipt.
                        </div>
                        <div style="text-align: center;">
                            <button onclick="window.print()" style="background: #2563eb; color: white; padding: 8px 20px; border: none; border-radius: 5px; margin-right: 10px; cursor: pointer;">
                                <i class="fa-solid fa-print"></i> Print
                            </button>
                            <button onclick="this.closest('#receiptModal').remove()" style="background: #ef4444; color: white; padding: 8px 20px; border: none; border-radius: 5px; cursor: pointer;">
                                <i class="fa-solid fa-times"></i> Close
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.insertAdjacentHTML('beforeend', receiptHtml);
            showToast('Receipt loaded', 'success');
        } else {
            showToast('Failed to load receipt', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Error downloading receipt', 'error');
    }
}

window.loadPayments = loadPayments;
window.downloadReceipt = downloadReceipt;