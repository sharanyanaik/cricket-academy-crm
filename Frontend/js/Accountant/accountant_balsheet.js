// ==================== BALANCE SHEET JS ====================

let currentBalanceData = null; // Store current data for printing

function setDefaultDate() {
    const asAtDate = document.getElementById('asAtDate');
    if (asAtDate && !asAtDate.value) {
        asAtDate.value = new Date().toISOString().split('T')[0];
    }
}

async function loadBalanceSheet() {
    try {
        const token = getToken();
        if (!token) return;
        
        const asAtDate = document.getElementById('asAtDate')?.value || new Date().toISOString().split('T')[0];
        
        console.log('Loading balance sheet for date:', asAtDate);
        
        const response = await fetch(`${API_URL}/accountant/balance-sheet?asAt=${asAtDate}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('Balance Sheet Data:', data);
            currentBalanceData = data; // Store for printing
            updateUI(data);
        } else {
            showToast('Failed to load balance sheet', 'error');
        }
    } catch (error) {
        console.error('Error loading balance sheet:', error);
        showToast('Error loading data', 'error');
    }
}

function updateUI(data) {
    const asAtDisplay = document.getElementById('asAtDisplay');
    if (asAtDisplay) {
        const date = new Date(data.as_at);
        asAtDisplay.innerHTML = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    }
    
    const totalAssetsElem = document.getElementById('totalAssets');
    const totalLiabilitiesElem = document.getElementById('totalLiabilities');
    
    if (totalAssetsElem) totalAssetsElem.innerHTML = formatCurrency(data.assets.total_assets);
    if (totalLiabilitiesElem) totalLiabilitiesElem.innerHTML = formatCurrency(data.total_liabilities_equity);
    
    updateAssetsTable(data.assets);
    updateLiabilitiesEquityTable(data.liabilities, data.equity);
    
    const balanceCard = document.getElementById('balanceCard');
    const balanceIcon = document.getElementById('balanceIcon');
    const balanceStatusText = document.getElementById('balanceStatusText');
    const balanceMessage = document.getElementById('balanceMessage');
    const balanceDifference = document.getElementById('balanceDifference');
    
    if (balanceCard && balanceMessage) {
        if (data.is_balanced) {
            balanceCard.className = 'balance-card';
            if (balanceIcon) {
                balanceIcon.className = 'fa-solid fa-circle-check';
                balanceIcon.style.color = '#10b981';
            }
            if (balanceStatusText) balanceStatusText.innerHTML = '✓ Balance Sheet is Balanced';
            balanceMessage.innerHTML = `Total Assets (${formatCurrency(data.assets.total_assets)}) = Total Liabilities & Equity (${formatCurrency(data.total_liabilities_equity)})`;
            if (balanceDifference) balanceDifference.innerHTML = '';
        } else {
            balanceCard.className = 'balance-card error';
            if (balanceIcon) {
                balanceIcon.className = 'fa-solid fa-circle-exclamation';
                balanceIcon.style.color = '#ef4444';
            }
            if (balanceStatusText) balanceStatusText.innerHTML = '⚠ Balance Sheet is NOT Balanced';
            balanceMessage.innerHTML = `Please check your entries. Difference: ${formatCurrency(data.difference)}`;
            if (balanceDifference) balanceDifference.innerHTML = `Difference: ${formatCurrency(data.difference)}`;
        }
    }
}

function updateAssetsTable(assets) {
    const assetsBody = document.getElementById('assetsTableBody');
    if (!assetsBody) return;
    
    let html = '';
    html += `<tr style="background: #f8fafc; font-weight: 600;"><td colspan="2">Current Assets</td></tr>`;
    html += `<tr><td style="padding-left: 40px;">Cash in Hand</td><td class="text-end">${formatCurrency(assets.current_assets.cash_in_hand)}</td></tr>`;
    html += `<tr><td style="padding-left: 40px;">Bank Balance</td><td class="text-end">${formatCurrency(assets.current_assets.bank_balance)}</td></tr>`;
    html += `<tr><td style="padding-left: 40px;">Accounts Receivable (Fees Due)</td><td class="text-end">${formatCurrency(assets.current_assets.accounts_receivable)}</td></tr>`;
    html += `<tr style="background: #f8fafc; font-weight: 600;"><td colspan="2">Fixed Assets</td></tr>`;
    html += `<tr><td style="padding-left: 40px;">Equipment & Gear</td><td class="text-end">${formatCurrency(assets.fixed_assets.equipment)}</td></tr>`;
    html += `<tr style="background: #f8fafc; font-weight: 600;"><td colspan="2">Other Assets</td></tr>`;
    html += `<tr><td style="padding-left: 40px;">Prepaid Expenses</td><td class="text-end">${formatCurrency(assets.other_assets.prepaid_expenses)}</td></tr>`;
    html += `<tr style="background: #f1f5f9; font-weight: 700;"><td><strong>Total Assets</strong></td><td class="text-end"><strong>${formatCurrency(assets.total_assets)}</strong></td></tr>`;
    
    assetsBody.innerHTML = html;
}

function updateLiabilitiesEquityTable(liabilities, equity) {
    const liabEquityBody = document.getElementById('liabilitiesEquityBody');
    if (!liabEquityBody) return;
    
    let html = '';
    html += `<tr style="background: #f8fafc; font-weight: 600;"><td colspan="2">Current Liabilities</td></tr>`;
    html += `<tr><td style="padding-left: 40px;">Accounts Payable</td><td class="text-end">${formatCurrency(liabilities.current_liabilities.accounts_payable)}</td></tr>`;
    html += `<tr><td style="padding-left: 40px;">Salaries Payable</td><td class="text-end">${formatCurrency(liabilities.current_liabilities.salaries_payable)}</td></tr>`;
    html += `<tr><td style="padding-left: 40px;">Utilities Payable</td><td class="text-end">${formatCurrency(liabilities.current_liabilities.utilities_payable)}</td></tr>`;
    html += `<tr style="background: #f8fafc; font-weight: 600;"><td colspan="2">Long Term Liabilities</td></tr>`;
    html += `<tr><td style="padding-left: 40px;">Bank Loan / Other</td><td class="text-end">${formatCurrency(liabilities.long_term_liabilities.other_payables)}</td></tr>`;
    html += `<tr style="background: #f8fafc; font-weight: 600;"><td colspan="2">Equity</td></tr>`;
    html += `<tr><td style="padding-left: 40px;">Capital</td><td class="text-end">${formatCurrency(equity.capital)}</td></tr>`;
    html += `<tr><td style="padding-left: 40px;">Retained Earnings</td><td class="text-end">${formatCurrency(equity.retained_earnings)}</td></tr>`;
    html += `<tr><td style="padding-left: 40px;">Current Year Profit</td><td class="text-end">${formatCurrency(equity.current_year_profit)}</td></tr>`;
    
    const total = liabilities.total_liabilities + equity.total_equity;
    html += `<tr style="background: #f1f5f9; font-weight: 700;"><td><strong>Total Liabilities & Equity</strong></td><td class="text-end"><strong>${formatCurrency(total)}</strong></td></tr>`;
    
    liabEquityBody.innerHTML = html;
}

// ==================== PRINT BALANCE SHEET ====================
function printBalanceSheet() {
    if (!currentBalanceData) {
        showToast('No data to print', 'error');
        return;
    }
    
    const date = new Date(currentBalanceData.as_at);
    const formattedDate = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    
    const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Balance Sheet - ${formattedDate}</title>
            <meta charset="UTF-8">
            <style>
                body {
                    font-family: Arial, sans-serif;
                    padding: 20px;
                    margin: 0;
                }
                .header {
                    text-align: center;
                    margin-bottom: 30px;
                    border-bottom: 2px solid #333;
                    padding-bottom: 15px;
                }
                .header h1 {
                    margin: 0;
                    color: #2563eb;
                    font-size: 24px;
                }
                .header h2 {
                    margin: 10px 0 0 0;
                    font-size: 18px;
                    color: #333;
                }
                .header p {
                    margin: 5px 0;
                    color: #666;
                    font-size: 12px;
                }
                .balance-sheet-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 30px;
                    margin-bottom: 30px;
                }
                .section-title {
                    margin: 0 0 15px 0;
                    padding-bottom: 10px;
                    border-bottom: 2px solid #333;
                    font-size: 18px;
                    font-weight: bold;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 20px;
                }
                th, td {
                    border: 1px solid #ddd;
                    padding: 10px;
                    text-align: left;
                }
                th {
                    background-color: #f2f2f2;
                    font-weight: bold;
                }
                .text-end {
                    text-align: right;
                }
                .total-row {
                    background: #f1f5f9;
                    font-weight: bold;
                }
                .indent {
                    padding-left: 30px;
                }
                .balance-status {
                    margin-top: 30px;
                    padding: 15px;
                    text-align: center;
                    border-radius: 8px;
                }
                .balanced {
                    background: #d1fae5;
                    color: #065f46;
                    border: 1px solid #10b981;
                }
                .unbalanced {
                    background: #fee2e2;
                    color: #991b1b;
                    border: 1px solid #ef4444;
                }
                .footer {
                    margin-top: 40px;
                    text-align: center;
                    font-size: 11px;
                    color: #666;
                    border-top: 1px solid #ddd;
                    padding-top: 15px;
                }
                @media print {
                    body {
                        margin: 0;
                        padding: 15px;
                    }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Cricket CRM</h1>
                <h2>Balance Sheet</h2>
                <p>As at ${formattedDate}</p>
                <p>Generated on: ${new Date().toLocaleString()}</p>
            </div>
            
            <div class="balance-sheet-grid">
                <!-- Assets Column -->
                <div>
                    <div class="section-title">ASSETS</div>
                    <table>
                        <tr style="background: #f8fafc; font-weight: bold;">
                            <td>Current Assets</td>
                            <td class="text-end">${formatCurrency(currentBalanceData.assets.current_assets.total)}</td>
                        </tr>
                        <tr><td class="indent">Cash in Hand</td><td class="text-end">${formatCurrency(currentBalanceData.assets.current_assets.cash_in_hand)}</td></tr>
                        <tr><td class="indent">Bank Balance</td><td class="text-end">${formatCurrency(currentBalanceData.assets.current_assets.bank_balance)}</td></tr>
                        <tr><td class="indent">Accounts Receivable</td><td class="text-end">${formatCurrency(currentBalanceData.assets.current_assets.accounts_receivable)}</td></tr>
                        <tr style="background: #f8fafc; font-weight: bold;"><td>Fixed Assets</td><td class="text-end">${formatCurrency(currentBalanceData.assets.fixed_assets.total)}</td></tr>
                        <tr><td class="indent">Equipment & Gear</td><td class="text-end">${formatCurrency(currentBalanceData.assets.fixed_assets.equipment)}</td></tr>
                        <tr style="background: #f1f5f9; font-weight: bold;"><td>TOTAL ASSETS</td><td class="text-end">${formatCurrency(currentBalanceData.assets.total_assets)}</td></tr>
                    </table>
                </div>
                
                <!-- Liabilities & Equity Column -->
                <div>
                    <div class="section-title">LIABILITIES & EQUITY</div>
                    <table>
                        <tr style="background: #f8fafc; font-weight: bold;">
                            <td>Current Liabilities</td>
                            <td class="text-end">${formatCurrency(currentBalanceData.liabilities.current_liabilities.total)}</td>
                        </tr>
                        <tr><td class="indent">Salaries Payable</td><td class="text-end">${formatCurrency(currentBalanceData.liabilities.current_liabilities.salaries_payable)}</td></tr>
                        <tr><td class="indent">Utilities Payable</td><td class="text-end">${formatCurrency(currentBalanceData.liabilities.current_liabilities.utilities_payable)}</td></tr>
                        <tr style="background: #f8fafc; font-weight: bold;"><td>Long Term Liabilities</td><td class="text-end">${formatCurrency(currentBalanceData.liabilities.long_term_liabilities.total)}</td></tr>
                        <tr><td class="indent">Bank Loan / Other</td><td class="text-end">${formatCurrency(currentBalanceData.liabilities.long_term_liabilities.other_payables)}</td></tr>
                        <tr style="background: #f8fafc; font-weight: bold;"><td>Equity</td><td class="text-end">${formatCurrency(currentBalanceData.equity.total_equity)}</td></tr>
                        <tr><td class="indent">Capital</td><td class="text-end">${formatCurrency(currentBalanceData.equity.capital)}</td></tr>
                        <tr><td class="indent">Retained Earnings</td><td class="text-end">${formatCurrency(currentBalanceData.equity.retained_earnings)}</td></tr>
                        <tr><td class="indent">Current Year Profit</td><td class="text-end">${formatCurrency(currentBalanceData.equity.current_year_profit)}</td></tr>
                        <tr style="background: #f1f5f9; font-weight: bold;"><td>TOTAL LIABILITIES & EQUITY</td><td class="text-end">${formatCurrency(currentBalanceData.total_liabilities_equity)}</td></tr>
                    </table>
                </div>
            </div>
            
            <div class="balance-status ${currentBalanceData.is_balanced ? 'balanced' : 'unbalanced'}">
                <strong>${currentBalanceData.is_balanced ? '✓ BALANCED' : '⚠ NOT BALANCED'}</strong><br>
                Total Assets: ${formatCurrency(currentBalanceData.assets.total_assets)} = Total Liabilities & Equity: ${formatCurrency(currentBalanceData.total_liabilities_equity)}
                ${!currentBalanceData.is_balanced ? `<br>Difference: ${formatCurrency(currentBalanceData.difference)}` : ''}
            </div>
            
            <div class="footer">
                <p>This is a computer generated report. No signature required.</p>
                <p>&copy; ${new Date().getFullYear()} Cricket CRM. All rights reserved.</p>
            </div>
        </body>
        </html>
    `;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
}

function exportBalanceSheet() {
    if (!currentBalanceData) {
        showToast('No data to export', 'error');
        return;
    }
    
    let csv = 'Balance Sheet\n\n';
    csv += `As at: ${new Date(currentBalanceData.as_at).toLocaleDateString('en-IN')}\n\n`;
    
    csv += 'ASSETS,Amount (₹)\n';
    csv += `Cash in Hand,${currentBalanceData.assets.current_assets.cash_in_hand}\n`;
    csv += `Bank Balance,${currentBalanceData.assets.current_assets.bank_balance}\n`;
    csv += `Accounts Receivable,${currentBalanceData.assets.current_assets.accounts_receivable}\n`;
    csv += `Equipment & Gear,${currentBalanceData.assets.fixed_assets.equipment}\n`;
    csv += `Total Assets,${currentBalanceData.assets.total_assets}\n\n`;
    
    csv += 'LIABILITIES & EQUITY,Amount (₹)\n';
    csv += `Salaries Payable,${currentBalanceData.liabilities.current_liabilities.salaries_payable}\n`;
    csv += `Utilities Payable,${currentBalanceData.liabilities.current_liabilities.utilities_payable}\n`;
    csv += `Bank Loan / Other,${currentBalanceData.liabilities.long_term_liabilities.other_payables}\n`;
    csv += `Capital,${currentBalanceData.equity.capital}\n`;
    csv += `Retained Earnings,${currentBalanceData.equity.retained_earnings}\n`;
    csv += `Current Year Profit,${currentBalanceData.equity.current_year_profit}\n`;
    csv += `Total Liabilities & Equity,${currentBalanceData.total_liabilities_equity}\n`;
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `balance_sheet_${currentBalanceData.as_at}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Balance Sheet exported successfully', 'success');
}

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    if (typeof checkAccountantAuth !== 'undefined') {
        if (!checkAccountantAuth()) return;
    }
    
    setDefaultDate();
    loadBalanceSheet();
    
    // Update print button to use custom print function
    const printBtn = document.querySelector('.btn-print');
    if (printBtn) {
        printBtn.onclick = (e) => {
            e.preventDefault();
            printBalanceSheet();
        };
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

window.loadBalanceSheet = loadBalanceSheet;
window.exportBalanceSheet = exportBalanceSheet;
window.printBalanceSheet = printBalanceSheet;