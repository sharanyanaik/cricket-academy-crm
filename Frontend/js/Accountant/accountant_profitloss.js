// ==================== PROFIT & LOSS JS ====================

let currentPeriod = 'monthly';
let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth() + 1;
let currentPLData = null; // Store current data for printing

function setDefaultDate() {
    const periodType = document.getElementById('periodType');
    const monthSelect = document.getElementById('monthSelect');
    const yearSelect = document.getElementById('yearSelect');
    
    if (!monthSelect || !yearSelect) return;
    
    // Populate months
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                    'July', 'August', 'September', 'October', 'November', 'December'];
    
    monthSelect.innerHTML = '';
    months.forEach((month, index) => {
        const option = document.createElement('option');
        option.value = index + 1;
        option.textContent = month;
        if (index + 1 === currentMonth) {
            option.selected = true;
        }
        monthSelect.appendChild(option);
    });
    
    // Populate years (2024-2030)
    yearSelect.innerHTML = '';
    const currentYearVal = new Date().getFullYear();
    for (let i = currentYearVal - 1; i <= currentYearVal + 3; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = i;
        if (i === currentYearVal) {
            option.selected = true;
            currentYear = i;
        }
        yearSelect.appendChild(option);
    }
    
    // Update visibility based on period type
    updatePeriodVisibility();
}

function updatePeriodVisibility() {
    const periodType = document.getElementById('periodType').value;
    const monthDiv = document.getElementById('monthDiv');
    const quarterDiv = document.getElementById('quarterDiv');
    const yearDiv = document.getElementById('yearDiv');
    
    if (periodType === 'monthly') {
        if (monthDiv) monthDiv.style.display = 'block';
        if (quarterDiv) quarterDiv.style.display = 'none';
        if (yearDiv) yearDiv.style.display = 'block';
    } else if (periodType === 'quarterly') {
        if (monthDiv) monthDiv.style.display = 'none';
        if (quarterDiv) quarterDiv.style.display = 'block';
        if (yearDiv) yearDiv.style.display = 'block';
        populateQuarters();
    } else if (periodType === 'yearly') {
        if (monthDiv) monthDiv.style.display = 'none';
        if (quarterDiv) quarterDiv.style.display = 'none';
        if (yearDiv) yearDiv.style.display = 'block';
    }
}

function populateQuarters() {
    const quarterSelect = document.getElementById('quarterSelect');
    if (!quarterSelect) return;
    
    quarterSelect.innerHTML = '';
    const quarters = [
        { value: 1, name: 'Q1 (Jan - Mar)' },
        { value: 2, name: 'Q2 (Apr - Jun)' },
        { value: 3, name: 'Q3 (Jul - Sep)' },
        { value: 4, name: 'Q4 (Oct - Dec)' }
    ];
    
    quarters.forEach(quarter => {
        const option = document.createElement('option');
        option.value = quarter.value;
        option.textContent = quarter.name;
        quarterSelect.appendChild(option);
    });
}

async function loadProfitLoss() {
    try {
        const token = getToken();
        if (!token) return;
        
        const periodType = document.getElementById('periodType').value;
        const year = document.getElementById('yearSelect')?.value || currentYear;
        
        let url = `${API_URL}/accountant/profit-loss?period=${periodType}&year=${year}`;
        
        if (periodType === 'monthly') {
            const month = document.getElementById('monthSelect')?.value || currentMonth;
            url += `&month=${month}`;
        } else if (periodType === 'quarterly') {
            const quarter = document.getElementById('quarterSelect')?.value || 1;
            const monthForQuarter = quarter * 3;
            url += `&month=${monthForQuarter}`;
        }
        
        console.log('Fetching P&L from:', url);
        
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('P&L Data received:', data);
            currentPLData = data; // Store for printing
            updateUI(data);
        } else if (response.status === 401 || response.status === 403) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '../../pages/Authentication/login.html';
        } else {
            const error = await response.json();
            showToast(error.message || 'Failed to load data', 'error');
        }
    } catch (error) {
        console.error('Error loading P&L:', error);
        showToast('Error loading data', 'error');
    }
}

function updateUI(data) {
    // Update summary cards
    const totalIncomeElem = document.getElementById('totalIncome');
    const totalExpensesElem = document.getElementById('totalExpenses');
    const netProfitElem = document.getElementById('netProfit');
    const netProfitLargeElem = document.getElementById('netProfitLarge');
    const profitMarginElem = document.getElementById('profitMargin');
    const profitProgressBar = document.getElementById('profitProgressBar');
    
    if (totalIncomeElem) totalIncomeElem.innerHTML = formatCurrency(data.total_income);
    if (totalExpensesElem) totalExpensesElem.innerHTML = formatCurrency(data.total_expenses);
    if (netProfitElem) netProfitElem.innerHTML = formatCurrency(data.net_profit);
    if (netProfitLargeElem) netProfitLargeElem.innerHTML = formatCurrency(data.net_profit);
    
    if (profitMarginElem) {
        const profitMargin = parseFloat(data.profit_margin);
        profitMarginElem.innerHTML = `Profit Margin: ${profitMargin}%`;
        profitMarginElem.className = profitMargin >= 0 ? 'balance-positive' : 'balance-negative';
    }
    
    if (profitProgressBar) {
        const percentage = Math.min(Math.max(parseFloat(data.profit_margin), 0), 100);
        profitProgressBar.style.width = `${percentage}%`;
    }
    
    // Update period text
    const periodTextElem = document.getElementById('periodText');
    if (periodTextElem && data.period) {
        const periodType = document.getElementById('periodType').value;
        let displayText = '';
        
        if (periodType === 'monthly') {
            displayText = `For the period of ${data.period.month_name} ${data.period.year}`;
        } else if (periodType === 'quarterly') {
            const quarter = Math.ceil(data.period.month / 3);
            displayText = `For the period of Q${quarter} ${data.period.year}`;
        } else {
            displayText = `For the financial year ${data.period.year}`;
        }
        periodTextElem.innerHTML = displayText;
    }
    
    // Update Income Table
    const incomeTableBody = document.getElementById('incomeTableBody');
    if (incomeTableBody) {
        if (!data.income_breakdown || data.income_breakdown.length === 0 || 
            (data.income_breakdown.length === 1 && data.income_breakdown[0].name === 'No Income Records')) {
            incomeTableBody.innerHTML = '<tr><td colspan="3" class="text-center">No income data found for this period<\/td><\/tr>';
        } else {
            let incomeHtml = '';
            data.income_breakdown.forEach(item => {
                incomeHtml += `
                    <tr>
                        <td>${item.name}</td>
                        <td>${formatCurrency(item.amount)}</td>
                        <td>${item.percentage}%</td>
                    </tr>
                `;
            });
            incomeHtml += `
                <tr style="background: #f1f5f9; font-weight: 700;">
                    <td><strong>Total Income</strong></td>
                    <td><strong>${formatCurrency(data.total_income)}</strong></td>
                    <td><strong>100%</strong></td>
                </tr>
            `;
            incomeTableBody.innerHTML = incomeHtml;
        }
    }
    
    // Update Expenses Table
    const expensesTableBody = document.getElementById('expensesTableBody');
    if (expensesTableBody) {
        if (!data.expenses_breakdown || data.expenses_breakdown.length === 0 ||
            (data.expenses_breakdown.length === 1 && data.expenses_breakdown[0].name === 'No Expense Records')) {
            expensesTableBody.innerHTML = '<tr><td colspan="3" class="text-center">No expense data found for this period<\/td><\/tr>';
        } else {
            let expensesHtml = '';
            data.expenses_breakdown.forEach(item => {
                expensesHtml += `
                    <tr>
                        <td>${item.name}</td>
                        <td>${formatCurrency(item.amount)}</td>
                        <td>${item.percentage}%</td>
                    </tr>
                `;
            });
            expensesHtml += `
                <tr style="background: #f1f5f9; font-weight: 700;">
                    <td><strong>Total Expenses</strong></td>
                    <td><strong>${formatCurrency(data.total_expenses)}</strong></td>
                    <td><strong>${data.total_income > 0 ? ((data.total_expenses / data.total_income) * 100).toFixed(2) : 0}%</strong></td>
                </tr>
            `;
            expensesTableBody.innerHTML = expensesHtml;
        }
    }
}

// ==================== PRINT PROFIT & LOSS (Proper Print Function) ====================
function printProfitLoss() {
    if (!currentPLData) {
        showToast('No data to print', 'error');
        return;
    }
    
    const periodType = document.getElementById('periodType').value;
    let periodText = '';
    
    if (periodType === 'monthly') {
        periodText = `${currentPLData.period?.month_name || 'Current'} ${currentPLData.period?.year || ''}`;
    } else if (periodType === 'quarterly') {
        const quarter = Math.ceil((currentPLData.period?.month || 1) / 3);
        periodText = `Q${quarter} ${currentPLData.period?.year || ''}`;
    } else {
        periodText = `${currentPLData.period?.year || ''}`;
    }
    
    // Get current table data
    const incomeRows = [];
    const expenseRows = [];
    
    document.querySelectorAll('#incomeTableBody tr').forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length === 3 && !row.querySelector('strong')) {
            incomeRows.push({
                name: cells[0]?.innerText || '',
                amount: cells[1]?.innerText || '₹0',
                percentage: cells[2]?.innerText || '0%'
            });
        }
    });
    
    document.querySelectorAll('#expensesTableBody tr').forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length === 3 && !row.querySelector('strong')) {
            expenseRows.push({
                name: cells[0]?.innerText || '',
                amount: cells[1]?.innerText || '₹0',
                percentage: cells[2]?.innerText || '0%'
            });
        }
    });
    
    const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Profit & Loss Statement - ${periodText}</title>
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
                .summary-cards {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 20px;
                    margin-bottom: 30px;
                }
                .card {
                    background: #f8fafc;
                    padding: 15px;
                    border-radius: 8px;
                    text-align: center;
                    border: 1px solid #e2e8f0;
                }
                .card h4 {
                    margin: 0 0 5px 0;
                    font-size: 12px;
                    color: #666;
                }
                .card p {
                    margin: 0;
                    font-size: 22px;
                    font-weight: bold;
                }
                .section-title {
                    margin: 25px 0 15px 0;
                    padding-bottom: 10px;
                    border-bottom: 2px solid #333;
                    font-size: 18px;
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
                .profit-section {
                    margin-top: 30px;
                    padding: 20px;
                    background: #f0f9ff;
                    border-radius: 8px;
                    text-align: center;
                }
                .profit-section h3 {
                    margin: 0;
                    font-size: 28px;
                    color: #2563eb;
                }
                .profit-section p {
                    margin: 10px 0 0 0;
                    font-size: 14px;
                }
                .footer {
                    margin-top: 40px;
                    text-align: center;
                    font-size: 11px;
                    color: #666;
                    border-top: 1px solid #ddd;
                    padding-top: 15px;
                }
                .balance-positive {
                    color: #10b981;
                }
                .balance-negative {
                    color: #ef4444;
                }
                @media print {
                    body {
                        margin: 0;
                        padding: 15px;
                    }
                    .no-print {
                        display: none;
                    }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Cricket CRM</h1>
                <h2>Profit & Loss Statement</h2>
                <p>For the period: ${periodText}</p>
                <p>Generated on: ${new Date().toLocaleString()}</p>
            </div>
            
            <div class="summary-cards">
                <div class="card">
                    <h4>Total Income</h4>
                    <p style="color: #10b981;">${formatCurrency(currentPLData.total_income)}</p>
                </div>
                <div class="card">
                    <h4>Total Expenses</h4>
                    <p style: #ef4444;">${formatCurrency(currentPLData.total_expenses)}</p>
                </div>
                <div class="card">
                    <h4>Net Profit</h4>
                    <p style="color: #2563eb;">${formatCurrency(currentPLData.net_profit)}</p>
                </div>
            </div>
            
            <div class="section-title">
                <i class="fa-solid fa-circle-arrow-up"></i> Income / Revenue
            </div>
            <table>
                <thead>
                    <tr>
                        <th>Particulars</th>
                        <th class="text-end">Amount (₹)</th>
                        <th class="text-end">% of Income</th>
                    </tr>
                </thead>
                <tbody>
                    ${incomeRows.map(row => `
                        <tr>
                            <td>${row.name}</td>
                            <td class="text-end">${row.amount}</td>
                            <td class="text-end">${row.percentage}</td>
                        </tr>
                    `).join('')}
                    <tr style="background: #f1f5f9; font-weight: bold;">
                        <td>Total Income</td>
                        <td class="text-end">${formatCurrency(currentPLData.total_income)}</td>
                        <td class="text-end">100%</td>
                    </tr>
                </tbody>
            </table>
            
            <div class="section-title">
                <i class="fa-solid fa-circle-arrow-down"></i> Expenses
            </div>
            <table>
                <thead>
                    <tr>
                        <th>Particulars</th>
                        <th class="text-end">Amount (₹)</th>
                        <th class="text-end">% of Income</th>
                    </tr>
                </thead>
                <tbody>
                    ${expenseRows.map(row => `
                        <tr>
                            <td>${row.name}</td>
                            <td class="text-end">${row.amount}</td>
                            <td class="text-end">${row.percentage}</td>
                        </tr>
                    `).join('')}
                    <tr style="background: #f1f5f9; font-weight: bold;">
                        <td>Total Expenses</td>
                        <td class="text-end">${formatCurrency(currentPLData.total_expenses)}</td>
                        <td class="text-end">${currentPLData.total_income > 0 ? ((currentPLData.total_expenses / currentPLData.total_income) * 100).toFixed(2) : 0}%</td>
                    </tr>
                </tbody>
            </table>
            
            <div class="profit-section">
                <h3>Net Profit: ${formatCurrency(currentPLData.net_profit)}</h3>
                <p class="${parseFloat(currentPLData.profit_margin) >= 0 ? 'balance-positive' : 'balance-negative'}">
                    Profit Margin: ${currentPLData.profit_margin}%
                </p>
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

// Replace the window.print() with proper print function
// Also update the export function
function exportPL() {
    if (!currentPLData) {
        showToast('No data to export', 'error');
        return;
    }
    
    const periodType = document.getElementById('periodType').value;
    let periodText = '';
    
    if (periodType === 'monthly') {
        periodText = `${currentPLData.period?.month_name || 'Current'} ${currentPLData.period?.year || ''}`;
    } else if (periodType === 'quarterly') {
        const quarter = Math.ceil((currentPLData.period?.month || 1) / 3);
        periodText = `Q${quarter} ${currentPLData.period?.year || ''}`;
    } else {
        periodText = `${currentPLData.period?.year || ''}`;
    }
    
    let csv = `Profit & Loss Statement - ${periodText}\n\n`;
    csv += `Particulars,Amount (₹),% of Income\n`;
    csv += `Total Income,${formatCurrency(currentPLData.total_income)},100%\n`;
    csv += `Total Expenses,${formatCurrency(currentPLData.total_expenses)},${currentPLData.total_income > 0 ? ((currentPLData.total_expenses / currentPLData.total_income) * 100).toFixed(2) : 0}%\n`;
    csv += `Net Profit,${formatCurrency(currentPLData.net_profit)},${currentPLData.profit_margin}%\n\n`;
    
    csv += 'Income Breakdown\n';
    csv += 'Particulars,Amount (₹),% of Income\n';
    const incomeRows = document.querySelectorAll('#incomeTableBody tr');
    incomeRows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length === 3 && !row.querySelector('strong')) {
            csv += `${cells[0].innerText},${cells[1].innerText},${cells[2].innerText}\n`;
        }
    });
    
    csv += '\nExpenses Breakdown\n';
    csv += 'Particulars,Amount (₹),% of Income\n';
    const expenseRows = document.querySelectorAll('#expensesTableBody tr');
    expenseRows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length === 3 && !row.querySelector('strong')) {
            csv += `${cells[0].innerText},${cells[1].innerText},${cells[2].innerText}\n`;
        }
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `profit_loss_${periodText.replace(/ /g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Report exported successfully', 'success');
}

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    if (typeof checkAccountantAuth !== 'undefined') {
        if (!checkAccountantAuth()) return;
    }
    
    setDefaultDate();
    loadProfitLoss();
    
    // Add event listeners
    const periodType = document.getElementById('periodType');
    if (periodType) {
        periodType.addEventListener('change', () => {
            updatePeriodVisibility();
            loadProfitLoss();
        });
    }
    
    const monthSelect = document.getElementById('monthSelect');
    if (monthSelect) {
        monthSelect.addEventListener('change', () => loadProfitLoss());
    }
    
    const quarterSelect = document.getElementById('quarterSelect');
    if (quarterSelect) {
        quarterSelect.addEventListener('change', () => loadProfitLoss());
    }
    
    const yearSelect = document.getElementById('yearSelect');
    if (yearSelect) {
        yearSelect.addEventListener('change', () => loadProfitLoss());
    }
    
    // Update print button to use custom print function
    const printBtn = document.querySelector('.btn-print');
    if (printBtn) {
        printBtn.onclick = (e) => {
            e.preventDefault();
            printProfitLoss();
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