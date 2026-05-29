// ==================== INVOICES JS ====================

let currentPage = 1;
let totalPages = 1;
let allInvoices = [];

document.addEventListener('DOMContentLoaded', () => {
    console.log('Invoices page loaded');
    
    if (!checkBillingAuth()) return;
    
    setDefaultFilters();
    loadInvoices();
    loadPlayersForInvoice();
    
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }
});

function setDefaultFilters() {
    const fromDate = document.getElementById('filterFromDate');
    const toDate = document.getElementById('filterToDate');
    
    if (fromDate && !fromDate.value) {
        const firstDay = new Date();
        firstDay.setDate(1);
        fromDate.value = firstDay.toISOString().split('T')[0];
    }
    if (toDate && !toDate.value) {
        toDate.value = new Date().toISOString().split('T')[0];
    }
}

async function loadInvoices() {
    try {
        const token = getToken();
        if (!token) return;
        
        const status = document.getElementById('filterStatus')?.value || 'all';
        const fromDate = document.getElementById('filterFromDate')?.value || '';
        const toDate = document.getElementById('filterToDate')?.value || '';
        const search = document.getElementById('filterSearch')?.value || '';
        
        let url = `${API_URL}/billing/invoices?status=${status}`;
        if (fromDate) url += `&from=${fromDate}`;
        if (toDate) url += `&to=${toDate}`;
        if (search) url += `&search=${encodeURIComponent(search)}`;
        
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            allInvoices = await response.json();
            renderTable();
        } else if (response.status === 401 || response.status === 403) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '../../pages/Authentication/login.html';
        } else {
            showToast('Failed to load invoices', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Error loading invoices', 'error');
    }
}

function renderTable() {
    const itemsPerPage = 10;
    totalPages = Math.ceil(allInvoices.length / itemsPerPage);
    if (totalPages === 0) totalPages = 1;
    if (currentPage > totalPages) currentPage = totalPages;
    
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageInvoices = allInvoices.slice(start, end);
    
    const tbody = document.getElementById('invoicesTableBody');
    if (!tbody) return;
    
    if (!pageInvoices || pageInvoices.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">No invoices found</td><\/tr>';
        document.getElementById('paginationInfo').innerHTML = 'Showing 0 of 0 invoices';
        document.getElementById('paginationControls').innerHTML = '';
        return;
    }
    
    let html = '';
    pageInvoices.forEach(invoice => {
        let statusClass = '';
        let statusText = invoice.display_status || invoice.status;
        
        // Determine correct status display
        if (invoice.status === 'completed') {
            statusClass = 'badge-paid';
            statusText = 'Paid';
        } else if (invoice.status === 'pending') {
            // Check if overdue
            const today = new Date().toISOString().split('T')[0];
            if (invoice.due_date && invoice.due_date < today) {
                statusClass = 'badge-overdue';
                statusText = 'Overdue';
            } else {
                statusClass = 'badge-pending';
                statusText = 'Pending';
            }
        } else {
            statusClass = 'badge-pending';
            statusText = 'Pending';
        }
        
        html += `
            <tr>
                <td>${invoice.invoice_number}</td>
                <td>${invoice.player_name}</td>
                <td>${invoice.batch_name || 'Not Assigned'}</td>
                <td>${invoice.month || '-'}</td>
                <td>${formatCurrency(invoice.amount)}</td>
                <td>${formatDate(invoice.due_date || invoice.payment_date)}</td>
                <td><span class="${statusClass}">${statusText}</span></td>
                <td>
                    <button class="btn-view" onclick="viewInvoice(${invoice.id})" title="View"><i class="fa-solid fa-eye"></i></button>
                    ${invoice.status !== 'completed' ? `<button class="btn-remind" onclick="sendReminder(${invoice.id})" title="Send Reminder"><i class="fa-solid fa-bell"></i></button>` : ''}
                    <button class="btn-print" onclick="printInvoice(${invoice.id})" title="Print"><i class="fa-solid fa-print"></i></button>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
    
    document.getElementById('paginationInfo').innerHTML = `Showing ${start + 1}-${Math.min(end, allInvoices.length)} of ${allInvoices.length} invoices`;
    renderPagination();
}

function renderPagination() {
    const container = document.getElementById('paginationControls');
    if (!container) return;
    
    let html = '';
    html += `<button class="page-btn" onclick="goToPage(1)" ${currentPage === 1 ? 'disabled' : ''}>First</button>`;
    html += `<button class="page-btn" onclick="goToPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>Prev</button>`;
    
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    
    for (let i = startPage; i <= endPage; i++) {
        html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
    }
    
    html += `<button class="page-btn" onclick="goToPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>Next</button>`;
    html += `<button class="page-btn" onclick="goToPage(${totalPages})" ${currentPage === totalPages ? 'disabled' : ''}>Last</button>`;
    
    container.innerHTML = html;
}

function goToPage(page) {
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    renderTable();
}

function applyFilters() {
    currentPage = 1;
    loadInvoices();
}

async function loadPlayersForInvoice() {
    try {
        const token = getToken();
        const response = await fetch(`${API_URL}/billing/players`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const players = await response.json();
            const select = document.getElementById('invoicePlayerId');
            if (select) {
                select.innerHTML = '<option value="">-- Select Player --</option>';
                players.forEach(player => {
                    select.innerHTML += `<option value="${player.id}">${player.player_name}</option>`;
                });
                console.log('Players loaded:', players.length);
            }
        } else {
            console.error('Failed to load players:', response.status);
        }
    } catch (error) {
        console.error('Error loading players:', error);
    }
}

function openGenerateModal() {
    document.getElementById('generateModal').style.display = 'flex';
    // Set default due date to 30 days from today
    const defaultDueDate = new Date();
    defaultDueDate.setDate(defaultDueDate.getDate() + 30);
    document.getElementById('invoiceDueDate').valueAsDate = defaultDueDate;
    loadPlayersForInvoice();
}

function closeGenerateModal() {
    document.getElementById('generateModal').style.display = 'none';
    document.getElementById('generateInvoiceForm').reset();
}

async function generateInvoice() {
    const playerId = document.getElementById('invoicePlayerId').value;
    const amount = document.getElementById('invoiceAmount').value;
    const paymentMode = document.getElementById('invoicePaymentMode').value;
    const dueDate = document.getElementById('invoiceDueDate').value;
    const remarks = document.getElementById('invoiceRemarks').value;
    
    if (!playerId || !amount || !dueDate) {
        showToast('Please fill all required fields', 'error');
        return;
    }
    
    try {
        const token = getToken();
        const response = await fetch(`${API_URL}/billing/invoices`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                player_id: parseInt(playerId),
                amount: parseFloat(amount),
                payment_date: dueDate,
                payment_mode: paymentMode,
                remarks: remarks
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showToast(`Invoice ${data.invoice_number} generated successfully!`, 'success');
            closeGenerateModal();
            loadInvoices();
        } else {
            showToast(data.message || 'Failed to generate invoice', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Error generating invoice', 'error');
    }
}

function viewInvoice(id) {
    const invoice = allInvoices.find(i => i.id === id);
    if (invoice) {
        const viewWindow = window.open('', '_blank');
        const statusDisplay = invoice.status === 'completed' ? 'Paid' : (invoice.due_date < new Date().toISOString().split('T')[0] ? 'Overdue' : 'Pending');
        
        viewWindow.document.write(`
            <html>
            <head>
                <title>Invoice ${invoice.invoice_number}</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 40px; background: #f0f2f5; }
                    .invoice-box { max-width: 800px; margin: auto; background: white; border-radius: 16px; padding: 30px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
                    .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #2563eb; }
                    .header h1 { color: #1e293b; margin: 0; }
                    .header h2 { color: #64748b; margin: 5px 0 0; font-size: 18px; }
                    .details { margin-bottom: 30px; display: grid; grid-template-columns: 1fr 1fr; gap: 15px; background: #f8fafc; padding: 15px; border-radius: 12px; }
                    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
                    th { background: #f1f5f9; font-weight: 600; }
                    .total { font-weight: bold; font-size: 18px; margin-top: 20px; text-align: right; padding-top: 15px; border-top: 2px solid #e2e8f0; }
                    .status { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
                    .status-paid { background: #d1fae5; color: #065f46; }
                    .status-pending { background: #fed7aa; color: #92400e; }
                    .status-overdue { background: #fee2e2; color: #991b1b; }
                    .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="invoice-box">
                    <div class="header">
                        <h1>🏏 Cricket Academy CRM</h1>
                        <h2>Tax Invoice</h2>
                    </div>
                    <div class="details">
                        <div><strong>Invoice No:</strong> ${invoice.invoice_number}</div>
                        <div><strong>Date:</strong> ${formatDate(invoice.payment_date)}</div>
                        <div><strong>Due Date:</strong> ${formatDate(invoice.due_date)}</div>
                        <div><strong>Player:</strong> ${invoice.player_name}</div>
                        <div><strong>Batch:</strong> ${invoice.batch_name || 'Not Assigned'}</div>
                        <div><strong>Month:</strong> ${invoice.month || '-'}</div>
                    </div>
                    <table>
                        <thead><tr><th>Description</th><th>Amount</th></tr></thead>
                        <tbody>
                            <tr><td>${invoice.month || 'Monthly'} Fee for ${invoice.batch_name || 'Cricket Academy'}</td><td style="text-align: right;">${formatCurrency(invoice.amount)}</td></tr>
                        </tbody>
                    </table>
                    <div class="total">
                        Total Amount: ${formatCurrency(invoice.amount)}
                    </div>
                    <div style="margin-top: 20px; text-align: center;">
                        <span class="status status-${invoice.status === 'completed' ? 'paid' : (invoice.due_date < new Date().toISOString().split('T')[0] ? 'overdue' : 'pending')}">
                            ${statusDisplay}
                        </span>
                    </div>
                    <div class="footer">
                        <p>Thank you for choosing Cricket Academy!</p>
                        <p>For any queries, please contact: accounts@cricketacademy.com</p>
                    </div>
                </div>
            </body>
            </html>
        `);
        viewWindow.document.close();
    }
}

async function sendReminder(id) {
    try {
        const token = getToken();
        const response = await fetch(`${API_URL}/billing/invoices/${id}/remind`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            showToast(data.message, 'success');
        } else {
            showToast('Failed to send reminder', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Error sending reminder', 'error');
    }
}

function printInvoice(id) {
    const invoice = allInvoices.find(i => i.id === id);
    if (invoice) {
        const printWindow = window.open('', '_blank');
        const statusDisplay = invoice.status === 'completed' ? 'Paid' : (invoice.due_date < new Date().toISOString().split('T')[0] ? 'Overdue' : 'Pending');
        
        printWindow.document.write(`
            <html>
            <head>
                <title>Invoice ${invoice.invoice_number}</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 40px; }
                    .invoice-box { max-width: 800px; margin: auto; border: 1px solid #ddd; padding: 30px; }
                    .header { text-align: center; margin-bottom: 30px; }
                    table { width: 100%; border-collapse: collapse; }
                    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
                    .total { font-weight: bold; font-size: 18px; margin-top: 20px; text-align: right; }
                </style>
            </head>
            <body>
                <div class="invoice-box">
                    <div class="header">
                        <h1>Cricket Academy CRM</h1>
                        <h2>Invoice ${invoice.invoice_number}</h2>
                    </div>
                    <p><strong>Player:</strong> ${invoice.player_name}</p>
                    <p><strong>Amount:</strong> ${formatCurrency(invoice.amount)}</p>
                    <p><strong>Due Date:</strong> ${formatDate(invoice.due_date)}</p>
                    <p><strong>Status:</strong> ${statusDisplay}</p>
                    <hr>
                    <p>Thank you for choosing Cricket Academy!</p>
                </div>
            </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
    }
}

function refreshInvoices() {
    loadInvoices();
    showToast('Invoices refreshed', 'success');
}