// ==================== ACCOUNTANT LEDGER JS ====================

let currentPage = 1;
let totalPages = 1;
let allTransactions = [];
let ledgerData = null;

function setDefaultDates() {
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

// ==================== LOAD LEDGER DATA ====================
async function loadLedger() {
    try {
        const token = getToken();
        if (!token) return;
        
        const fromDate = document.getElementById('filterFromDate').value;
        const toDate = document.getElementById('filterToDate').value;
        const accountType = document.getElementById('filterAccountType').value;
        const search = document.getElementById('filterSearch').value;
        
        let url = `${API_URL}/accountant/ledger?from=${fromDate}&to=${toDate}`;
        if (accountType !== 'all') url += `&type=${accountType}`;
        if (search) url += `&search=${encodeURIComponent(search)}`;
        
        console.log('Fetching ledger from:', url);
        
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            ledgerData = data;
            allTransactions = data.transactions || [];
            updateStats(data);
            renderTable();
            
            console.log('Ledger loaded:', {
                filter_type: data.filter_type,
                transactions: allTransactions.length,
                opening_balance: data.opening_balance,
                total_debits: data.total_debits,
                total_credits: data.total_credits,
                closing_balance: data.closing_balance
            });
        } else if (response.status === 401 || response.status === 403) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '../../pages/Authentication/login.html';
        } else {
            const error = await response.json();
            showToast(error.message || 'Failed to load ledger data', 'error');
        }
    } catch (error) {
        console.error('Error loading ledger:', error);
        showToast('Error loading ledger data', 'error');
    }
}

// ==================== UPDATE STATS ====================
function updateStats(data) {
    const openingBalanceEl = document.getElementById('openingBalance');
    const totalDebitsEl = document.getElementById('totalDebits');
    const totalCreditsEl = document.getElementById('totalCredits');
    const closingBalanceEl = document.getElementById('closingBalance');
    
    if (openingBalanceEl) openingBalanceEl.innerHTML = formatCurrency(data.opening_balance || 0);
    if (totalDebitsEl) totalDebitsEl.innerHTML = formatCurrency(data.total_debits || 0);
    if (totalCreditsEl) totalCreditsEl.innerHTML = formatCurrency(data.total_credits || 0);
    if (closingBalanceEl) closingBalanceEl.innerHTML = formatCurrency(data.closing_balance || 0);
}

// ==================== RENDER TABLE ====================
function renderTable() {
    const itemsPerPage = 15;
    totalPages = Math.ceil(allTransactions.length / itemsPerPage);
    if (totalPages === 0) totalPages = 1;
    
    if (currentPage > totalPages) currentPage = totalPages;
    
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageTransactions = allTransactions.slice(start, end);
    
    const tbody = document.getElementById('ledgerTableBody');
    if (!tbody) return;
    
    if (!pageTransactions || pageTransactions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No transactions found for selected filters</td></tr>';
        const footerDebit = document.getElementById('footerDebit');
        const footerCredit = document.getElementById('footerCredit');
        const footerBalance = document.getElementById('footerBalance');
        const paginationInfo = document.getElementById('paginationInfo');
        const paginationControls = document.getElementById('paginationControls');
        
        if (footerDebit) footerDebit.innerHTML = '₹0';
        if (footerCredit) footerCredit.innerHTML = '₹0';
        if (footerBalance) footerBalance.innerHTML = '₹0';
        if (paginationInfo) paginationInfo.innerHTML = 'Showing 0 of 0 entries';
        if (paginationControls) paginationControls.innerHTML = '';
        return;
    }
    
    let html = '';
    pageTransactions.forEach(transaction => {
        let badgeClass = '';
        let badgeText = '';
        let showBalance = true;
        
        if (transaction.display_type === 'Fee Collection') {
            badgeClass = 'badge-success';
            badgeText = 'Fee Collection';
        } else if (transaction.display_type === 'Pending Fee') {
            badgeClass = 'badge-warning';
            badgeText = 'Pending Fee';
            showBalance = false;
        } else {
            badgeClass = 'badge-danger';
            badgeText = 'Expense';
        }
        
        const balanceClass = (transaction.running_balance || 0) >= 0 ? 'balance-positive' : 'balance-negative';
        
        html += `
            <tr>
                <td>${formatDate(transaction.date)}</td>
                <td>${transaction.voucher_no || '-'}</td>
                <td>${transaction.description || '-'}</td>
                <td><span class="${badgeClass}">${badgeText}</span></td>
                <td class="text-end">${transaction.debit > 0 ? formatCurrency(transaction.debit) : '-'}</td>
                <td class="text-end">${transaction.credit > 0 ? formatCurrency(transaction.credit) : '-'}</td>
                <td class="${showBalance ? balanceClass : 'text-muted'}">${showBalance && transaction.running_balance !== undefined && transaction.running_balance !== null ? formatCurrency(transaction.running_balance) : '—'}</td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
    
    const totalDebit = pageTransactions.reduce((sum, t) => sum + (parseFloat(t.debit) || 0), 0);
    const totalCredit = pageTransactions.reduce((sum, t) => sum + (parseFloat(t.credit) || 0), 0);
    const lastBalance = pageTransactions.filter(t => t.running_balance !== undefined && t.running_balance !== null).pop()?.running_balance || 0;
    
    const footerDebit = document.getElementById('footerDebit');
    const footerCredit = document.getElementById('footerCredit');
    const footerBalance = document.getElementById('footerBalance');
    const paginationInfo = document.getElementById('paginationInfo');
    
    if (footerDebit) footerDebit.innerHTML = `<strong>${formatCurrency(totalDebit)}</strong>`;
    if (footerCredit) footerCredit.innerHTML = `<strong>${formatCurrency(totalCredit)}</strong>`;
    if (footerBalance) footerBalance.innerHTML = `<strong>${formatCurrency(lastBalance)}</strong>`;
    if (paginationInfo) paginationInfo.innerHTML = `Showing ${start + 1}-${Math.min(end, allTransactions.length)} of ${allTransactions.length} entries`;
    
    renderPagination();
}

// ==================== RENDER PAGINATION ====================
function renderPagination() {
    const container = document.getElementById('paginationControls');
    if (!container) return;
    
    let html = '';
    html += `<button class="pagination-btn" onclick="goToPage(1)" ${currentPage === 1 ? 'disabled' : ''}>&laquo; First</button>`;
    html += `<button class="pagination-btn" onclick="goToPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>&lsaquo; Prev</button>`;
    
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    
    for (let i = startPage; i <= endPage; i++) {
        html += `<button class="pagination-btn ${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
    }
    
    html += `<button class="pagination-btn" onclick="goToPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>Next &rsaquo;</button>`;
    html += `<button class="pagination-btn" onclick="goToPage(${totalPages})" ${currentPage === totalPages ? 'disabled' : ''}>Last &raquo;</button>`;
    
    container.innerHTML = html;
}

// ==================== GO TO PAGE ====================
function goToPage(page) {
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    renderTable();
}

// ==================== APPLY FILTERS ====================
function applyFilters() {
    currentPage = 1;
    loadLedger();
}

// ==================== EXPORT LEDGER ====================
function exportLedger() {
    if (allTransactions.length === 0) {
        showToast('No data to export', 'error');
        return;
    }
    
    let csv = 'Date,Voucher #,Description,Type,Debit (₹),Credit (₹),Balance (₹)\n';
    
    if (ledgerData && ledgerData.opening_balance) {
        csv += `"","","Opening Balance","","","",${formatCurrency(ledgerData.opening_balance)}\n`;
    }
    
    allTransactions.forEach(t => {
        let typeText = t.display_type || (t.trans_type === 'expense' ? 'Expense' : 'Fee Collection');
        csv += `"${t.date}","${t.voucher_no || ''}","${t.description || ''}","${typeText}","${t.debit || 0}","${t.credit || 0}","${t.running_balance !== null ? (t.running_balance || 0) : '—'}"\n`;
    });
    
    if (ledgerData && ledgerData.closing_balance) {
        csv += `"","","Closing Balance","","","",${formatCurrency(ledgerData.closing_balance)}\n`;
    }
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ledger_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Ledger exported successfully', 'success');
}

// ==================== PRINT LEDGER ====================
function printLedger() {
    if (!allTransactions || allTransactions.length === 0) {
        showToast('No data to print', 'error');
        return;
    }
    
    const printContent = `<!DOCTYPE html>
    <html>
    <head>
        <title>Ledger Report</title>
        <meta charset="UTF-8">
        <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
            .header h2 { margin: 0; color: #2563eb; }
            .header p { margin: 5px 0; color: #666; }
            .summary-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 20px; }
            .card { background: #f8fafc; padding: 15px; border-radius: 8px; text-align: center; border: 1px solid #e2e8f0; }
            .card h4 { margin: 0 0 5px 0; font-size: 12px; color: #666; }
            .card p { margin: 0; font-size: 18px; font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .text-end { text-align: right; }
            .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #ddd; padding-top: 10px; }
            @media print { body { margin: 0; padding: 15px; } }
        </style>
    </head>
    <body>
        <div class="header">
            <h2>Cricket CRM - General Ledger</h2>
            <p>Period: ${document.getElementById('filterFromDate').value} to ${document.getElementById('filterToDate').value}</p>
            <p>Generated on: ${new Date().toLocaleString()}</p>
        </div>
        <div class="summary-cards">
            <div class="card"><h4>Opening Balance</h4><p>${document.getElementById('openingBalance')?.innerHTML || '₹0'}</p></div>
            <div class="card"><h4>Total Debits</h4><p>${document.getElementById('totalDebits')?.innerHTML || '₹0'}</p></div>
            <div class="card"><h4>Total Credits</h4><p>${document.getElementById('totalCredits')?.innerHTML || '₹0'}</p></div>
            <div class="card"><h4>Closing Balance</h4><p>${document.getElementById('closingBalance')?.innerHTML || '₹0'}</p></div>
        </div>
        <table>
            <thead><tr><th>Date</th><th>Voucher #</th><th>Description</th><th>Type</th><th class="text-end">Debit (₹)</th><th class="text-end">Credit (₹)</th><th class="text-end">Balance (₹)</th></tr></thead>
            <tbody>
                ${allTransactions.map(t => `
                    <tr>
                        <td>${formatDate(t.date)}</td>
                        <td>${t.voucher_no || '-'}</td>
                        <td>${t.description || '-'}</td>
                        <td>${t.display_type || (t.trans_type === 'expense' ? 'Expense' : 'Fee Collection')}</td>
                        <td class="text-end">${t.debit > 0 ? formatCurrency(t.debit) : '-'}</td>
                        <td class="text-end">${t.credit > 0 ? formatCurrency(t.credit) : '-'}</td>
                        <td class="text-end">${t.running_balance !== undefined && t.running_balance !== null ? formatCurrency(t.running_balance) : '—'}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        <div class="footer"><p>This is a computer generated report. No signature required.</p></div>
    </body>
    </html>`;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
}

// ==================== HELPER FUNCTIONS ====================
function formatCurrency(amount) {
    return '₹' + (amount || 0).toLocaleString('en-IN');
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN');
}

// ==================== INITIALIZE PAGE ====================
document.addEventListener('DOMContentLoaded', () => {
    if (typeof checkAccountantAuth !== 'undefined' && !checkAccountantAuth()) return;
    
    setDefaultDates();
    loadLedger();
    
    const filterAccountType = document.getElementById('filterAccountType');
    const filterFromDate = document.getElementById('filterFromDate');
    const filterToDate = document.getElementById('filterToDate');
    const filterSearch = document.getElementById('filterSearch');
    
    if (filterAccountType) filterAccountType.addEventListener('change', applyFilters);
    if (filterFromDate) filterFromDate.addEventListener('change', applyFilters);
    if (filterToDate) filterToDate.addEventListener('change', applyFilters);
    if (filterSearch) filterSearch.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') applyFilters();
    });
    
    // Logout button - This calls logout() from accountant_common.js
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            logout();  // ✅ Calls the function from accountant_common.js
        });
    }
});