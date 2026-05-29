// ==================== TAX REPORT JS ====================

let currentTaxData = null; // Store current data for printing

async function loadTaxReport() {
    try {
        const token = getToken();
        if (!token) return;
        
        showToast('Loading tax report...', 'info');
        
        const response = await fetch(`${API_URL}/accountant/tax-report`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            currentTaxData = data; // Store for printing
            updateUI(data);
            showToast('Tax report loaded', 'success');
        } else if (response.status === 401 || response.status === 403) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '../../pages/Authentication/login.html';
        } else {
            showToast('Failed to load tax report', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Error loading data', 'error');
    }
}

function updateUI(data) {
    // Update main cards
    document.getElementById('totalIncome').innerHTML = formatCurrency(data.total_income);
    document.getElementById('totalExpenses').innerHTML = formatCurrency(data.total_expenses);
    document.getElementById('taxableIncome').innerHTML = formatCurrency(data.taxable_income);
    document.getElementById('gstPayable').innerHTML = formatCurrency(data.net_gst_payable);
    document.getElementById('incomeTax').innerHTML = formatCurrency(data.estimated_income_tax);
    document.getElementById('totalTax').innerHTML = formatCurrency(data.total_tax_liability);
    
    // Update GST details table
    document.getElementById('gstCollected').innerHTML = formatCurrency(data.gst_collected);
    document.getElementById('itcAmount').innerHTML = formatCurrency(data.input_tax_credit);
    document.getElementById('netGSTPayable').innerHTML = formatCurrency(data.net_gst_payable);
}

// ==================== PRINT TAX REPORT ====================
function printTaxReport() {
    if (!currentTaxData) {
        showToast('No data to print', 'error');
        return;
    }
    
    const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Tax Report - Cricket CRM</title>
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
                    grid-template-columns: repeat(2, 1fr);
                    gap: 20px;
                    margin-bottom: 30px;
                }
                .summary-cards-3 {
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
                .card.total-card {
                    background: linear-gradient(135deg, #1e3a5f, #2563eb);
                    color: white;
                    padding: 25px;
                }
                .card.total-card p {
                    color: white;
                }
                .section-title {
                    margin: 25px 0 15px 0;
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
                .footer {
                    margin-top: 40px;
                    text-align: center;
                    font-size: 11px;
                    color: #666;
                    border-top: 1px solid #ddd;
                    padding-top: 15px;
                }
                .green-text { color: #10b981; }
                .red-text { color: #ef4444; }
                .blue-text { color: #2563eb; }
                .orange-text { color: #f59e0b; }
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
                <h2>Tax Report</h2>
                <p>Generated on: ${new Date().toLocaleString()}</p>
            </div>
            
            <!-- Income & Expenses Summary -->
            <div class="summary-cards">
                <div class="card">
                    <h4>Total Income</h4>
                    <p class="green-text">${formatCurrency(currentTaxData.total_income)}</p>
                    <small>From all completed payments</small>
                </div>
                <div class="card">
                    <h4>Total Expenses</h4>
                    <p class="red-text">${formatCurrency(currentTaxData.total_expenses)}</p>
                    <small>From all expenses</small>
                </div>
            </div>
            
            <!-- Tax Summary -->
            <div class="summary-cards-3">
                <div class="card">
                    <h4>Taxable Income</h4>
                    <p class="blue-text">${formatCurrency(currentTaxData.taxable_income)}</p>
                    <small>Income - Expenses</small>
                </div>
                <div class="card">
                    <h4>GST Payable (18%)</h4>
                    <p class="orange-text">${formatCurrency(currentTaxData.net_gst_payable)}</p>
                    <small>On total income</small>
                </div>
                <div class="card">
                    <h4>Estimated Income Tax (30%)</h4>
                    <p class="red-text">${formatCurrency(currentTaxData.estimated_income_tax)}</p>
                    <small>On taxable income</small>
                </div>
            </div>
            
            <!-- Total Tax Liability -->
            <div class="card total-card" style="background: linear-gradient(135deg, #1e3a5f, #2563eb); color: white; text-align: center; padding: 25px; margin-bottom: 30px;">
                <h4 style="color: #e2e8f0; margin-bottom: 5px;">Total Tax Liability</h4>
                <p style="font-size: 32px; font-weight: bold; margin: 5px 0; color: white;">${formatCurrency(currentTaxData.total_tax_liability)}</p>
                <small style="color: #94a3b8;">GST Payable + Income Tax</small>
            </div>
            
            <!-- GST Details -->
            <div class="section-title">GST Details</div>
            <table>
                <thead>
                    <tr>
                        <th>Particulars</th>
                        <th class="text-end">Amount (₹)</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>GST Collected (18% of Income)</td>
                        <td class="text-end">${formatCurrency(currentTaxData.gst_collected)}</td>
                    </tr>
                    <tr>
                        <td>Less: Input Tax Credit (ITC)</td>
                        <td class="text-end red-text">${formatCurrency(currentTaxData.input_tax_credit)}</td>
                    </tr>
                    <tr class="total-row">
                        <td><strong>Net GST Payable</strong></td>
                        <td class="text-end"><strong>${formatCurrency(currentTaxData.net_gst_payable)}</strong></td>
                    </tr>
                </tbody>
            </table>
            
            <div class="footer">
                <p>This is a computer generated tax report. Please consult your tax advisor.</p>
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

function exportTaxReport() {
    if (!currentTaxData) {
        showToast('No data to export', 'error');
        return;
    }
    
    let csv = 'Tax Report\n\n';
    csv += `Generated on: ${new Date().toLocaleString()}\n\n`;
    csv += `Total Income,${currentTaxData.total_income}\n`;
    csv += `Total Expenses,${currentTaxData.total_expenses}\n`;
    csv += `Taxable Income,${currentTaxData.taxable_income}\n`;
    csv += `GST Collected (18%),${currentTaxData.gst_collected}\n`;
    csv += `Input Tax Credit (ITC),${currentTaxData.input_tax_credit}\n`;
    csv += `Net GST Payable,${currentTaxData.net_gst_payable}\n`;
    csv += `Estimated Income Tax (30%),${currentTaxData.estimated_income_tax}\n`;
    csv += `Total Tax Liability,${currentTaxData.total_tax_liability}\n`;
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tax_report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Report exported successfully', 'success');
}

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    if (typeof checkAccountantAuth !== 'undefined') {
        if (!checkAccountantAuth()) return;
    }
    loadTaxReport();
    
    // Update print button to use custom print function
    const printBtn = document.querySelector('.btn-print');
    if (printBtn) {
        printBtn.onclick = (e) => {
            e.preventDefault();
            printTaxReport();
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

window.loadTaxReport = loadTaxReport;
window.exportTaxReport = exportTaxReport;
window.printTaxReport = printTaxReport;