// ==================== MAINTENANCE COST JS ====================

let allExpenses = [];

document.addEventListener('DOMContentLoaded', function() {
    console.log('Maintenance Cost Tracking loaded');
    
    if (!checkMaintenanceAuth()) return;
    
    loadSummary();
    loadExpenses();
    loadCategorySummary();
    
    var logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            logout();
        });
    }
});

// UPDATE
function formatCurrencyNoDecimal(amount) {
    if (!amount || amount === 0) return '₹0';
    return '₹' + Math.round(amount).toLocaleString('en-IN');
}

async function loadSummary() {
    try {
        var token = getToken();
        var response = await fetch(API_URL + '/maintenance/cost/summary', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        
        if (response.ok) {
            var summary = await response.json();
            
            var thisMonthElem = document.getElementById('thisMonth');
            if (thisMonthElem) thisMonthElem.textContent = formatCurrencyNoDecimal(summary.thisMonth || 0);
            
            var thisQuarterElem = document.getElementById('thisQuarter');
            if (thisQuarterElem) thisQuarterElem.textContent = formatCurrencyNoDecimal(summary.thisQuarter || 0);
            
            var thisYearElem = document.getElementById('thisYear');
            if (thisYearElem) thisYearElem.textContent = formatCurrencyNoDecimal(summary.thisYear || 0);
            
            var avgMonthlyElem = document.getElementById('avgMonthly');
            if (avgMonthlyElem) avgMonthlyElem.textContent = formatCurrencyNoDecimal(summary.avgMonthly || 0);
        }
    } catch (error) {
        console.error('Error loading summary:', error);
    }
}

async function loadExpenses() {
    try {
        var token = getToken();
        var response = await fetch(API_URL + '/maintenance/cost/expenses', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        
        if (response.ok) {
            allExpenses = await response.json();
            displayExpenses(allExpenses);
        } else {
            showToast('Failed to load expenses', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Failed to load expenses', 'error');
    }
}

function displayExpenses(expenses) {
    var tbody = document.getElementById('expensesBody');
    if (!tbody) return;
    
    if (!expenses || expenses.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">No expenses found<\/td><\/tr>';
        return;
    }
    
    var html = '';
    for (var i = 0; i < expenses.length; i++) {
        var expense = expenses[i];
        
        html += '<tr>';
        html += '<td>' + formatDate(expense.expense_date) + '<\/td>';
        html += '<td>' + (expense.category || '-') + '<\/td>';
        html += '<td>' + (expense.description || expense.title || '-') + '<\/td>';
        html += '<td>' + formatCurrencyNoDecimal(expense.amount) + '<\/td>';
        html += '<td class="action-buttons">';
        html += '<button class="btn-small btn-edit" onclick="openEditModal(' + expense.id + ')">Edit<\/button>';
        html += '<button class="btn-small btn-delete" onclick="deleteExpense(' + expense.id + ')">Delete<\/button>';
        html += '<\/td>';
        html += '<\/tr>';
    }
    tbody.innerHTML = html;
}

async function loadCategorySummary() {
    try {
        var token = getToken();
        var response = await fetch(API_URL + '/maintenance/cost/category-summary', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        
        if (response.ok) {
            var summary = await response.json();
            displayCategorySummary(summary);
        }
    } catch (error) {
        console.error('Error loading category summary:', error);
    }
}

function displayCategorySummary(summary) {
    var tbody = document.getElementById('categorySummaryBody');
    if (!tbody) return;
    
    if (!summary || summary.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center">No data available<\/td><\/tr>';
        return;
    }
    
    var html = '';
    for (var i = 0; i < summary.length; i++) {
        var item = summary[i];
        var percentChange = parseFloat(item.percentChange);
        var changeColor = percentChange >= 0 ? '#ef4444' : '#10b981';
        var changeIcon = percentChange >= 0 ? 'fa-arrow-up' : 'fa-arrow-down';
        
        html += '<tr>';
        html += '<td>' + (item.category || '-') + '<\/td>';
        html += '<td>' + formatCurrencyNoDecimal(item.thisMonth) + '<\/td>';
        html += '<td>' + formatCurrencyNoDecimal(item.lastMonth) + '<\/td>';
        html += '<td><span style="color: ' + changeColor + ';"><i class="fa-solid ' + changeIcon + '"></i> ' + Math.abs(percentChange) + '%<\/span><\/td>';
        html += '<\/tr>';
    }
    tbody.innerHTML = html;
}

function openAddExpenseModal() {
    var modalHtml = `
        <div id="expenseModal" class="modal" style="display: flex;">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Add Expense</h3>
                    <span class="close-btn" onclick="closeModal()">&times;</span>
                </div>
                <form id="expenseForm" onsubmit="return false;">
                    <div class="form-group">
                        <label>Category *</label>
                        <select id="category" class="form-control" required>
                            <option value="Equipment">Equipment</option>
                            <option value="Salary">Salary</option>
                            <option value="Maintenance">Maintenance</option>
                            <option value="Electrical">Electrical</option>
                            <option value="Plumbing">Plumbing</option>
                            <option value="Cleaning">Cleaning</option>
                            <option value="Others">Others</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Description</label>
                        <input type="text" id="description" class="form-control" placeholder="Enter description">
                    </div>
                    <div class="form-group">
                        <label>Amount (₹) *</label>
                        <input type="number" id="amount" class="form-control" required>
                    </div>
                    <div class="form-group">
                        <label>Date *</label>
                        <input type="date" id="expense_date" class="form-control" value="${new Date().toISOString().split('T')[0]}" required>
                    </div>
                    <div class="form-group">
                        <label>Payment Mode</label>
                        <select id="payment_mode" class="form-control">
                            <option value="cash">Cash</option>
                            <option value="upi">UPI</option>
                            <option value="card">Card</option>
                            <option value="bank_transfer">Bank Transfer</option>
                        </select>
                    </div>
                    <button type="button" class="btn-save" onclick="saveExpense()">Save Expense</button>
                </form>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function openEditModal(id) {
    var expense = null;
    for (var i = 0; i < allExpenses.length; i++) {
        if (allExpenses[i].id === id) {
            expense = allExpenses[i];
            break;
        }
    }
    if (!expense) return;
    
    var modalHtml = `
        <div id="expenseModal" class="modal" style="display: flex;">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Edit Expense</h3>
                    <span class="close-btn" onclick="closeModal()">&times;</span>
                </div>
                <form id="expenseForm" onsubmit="return false;">
                    <input type="hidden" id="expenseId" value="${expense.id}">
                    <div class="form-group">
                        <label>Category *</label>
                        <select id="category" class="form-control" required>
                            <option value="Equipment" ${expense.category === 'Equipment' ? 'selected' : ''}>Equipment</option>
                            <option value="Salary" ${expense.category === 'Salary' ? 'selected' : ''}>Salary</option>
                            <option value="Maintenance" ${expense.category === 'Maintenance' ? 'selected' : ''}>Maintenance</option>
                            <option value="Electrical" ${expense.category === 'Electrical' ? 'selected' : ''}>Electrical</option>
                            <option value="Plumbing" ${expense.category === 'Plumbing' ? 'selected' : ''}>Plumbing</option>
                            <option value="Cleaning" ${expense.category === 'Cleaning' ? 'selected' : ''}>Cleaning</option>
                            <option value="Others" ${expense.category === 'Others' ? 'selected' : ''}>Others</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Description</label>
                        <input type="text" id="description" class="form-control" value="${(expense.description || '').replace(/"/g, '&quot;')}">
                    </div>
                    <div class="form-group">
                        <label>Amount (₹) *</label>
                        <input type="number" id="amount" class="form-control" value="${expense.amount}" required>
                    </div>
                    <div class="form-group">
                        <label>Date *</label>
                        <input type="date" id="expense_date" class="form-control" value="${expense.expense_date}" required>
                    </div>
                    <div class="form-group">
                        <label>Payment Mode</label>
                        <select id="payment_mode" class="form-control">
                            <option value="cash" ${expense.payment_mode === 'cash' ? 'selected' : ''}>Cash</option>
                            <option value="upi" ${expense.payment_mode === 'upi' ? 'selected' : ''}>UPI</option>
                            <option value="card" ${expense.payment_mode === 'card' ? 'selected' : ''}>Card</option>
                            <option value="bank_transfer" ${expense.payment_mode === 'bank_transfer' ? 'selected' : ''}>Bank Transfer</option>
                        </select>
                    </div>
                    <button type="button" class="btn-save" onclick="updateExpense()">Update Expense</button>
                </form>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

async function saveExpense() {
    var category = document.getElementById('category')?.value;
    var description = document.getElementById('description')?.value || null;
    var amount = parseFloat(document.getElementById('amount')?.value);
    var expense_date = document.getElementById('expense_date')?.value;
    var payment_mode = document.getElementById('payment_mode')?.value;
    
    if (!category || !amount || !expense_date) {
        showToast('Please fill all required fields', 'error');
        return;
    }
    
    try {
        var token = getToken();
        var response = await fetch(API_URL + '/maintenance/cost/expenses', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ 
                category: category, 
                description: description, 
                amount: amount, 
                expense_date: expense_date, 
                payment_mode: payment_mode
            })
        });
        
        if (response.ok) {
            showToast('Expense added successfully', 'success');
            closeModal();
            loadSummary();
            loadExpenses();
            loadCategorySummary();
        } else {
            var data = await response.json();
            showToast(data.message || 'Failed to add expense', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Error adding expense', 'error');
    }
}

async function updateExpense() {
    var id = document.getElementById('expenseId')?.value;
    var category = document.getElementById('category')?.value;
    var description = document.getElementById('description')?.value || null;
    var amount = parseFloat(document.getElementById('amount')?.value);
    var expense_date = document.getElementById('expense_date')?.value;
    var payment_mode = document.getElementById('payment_mode')?.value;
    
    try {
        var token = getToken();
        var response = await fetch(API_URL + '/maintenance/cost/expenses/' + id, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ 
                category: category, 
                description: description, 
                amount: amount, 
                expense_date: expense_date, 
                payment_mode: payment_mode
            })
        });
        
        if (response.ok) {
            showToast('Expense updated successfully', 'success');
            closeModal();
            loadSummary();
            loadExpenses();
            loadCategorySummary();
        } else {
            showToast('Failed to update expense', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Error updating expense', 'error');
    }
}

async function deleteExpense(id) {
    if (confirm('Are you sure you want to delete this expense?')) {
        try {
            var token = getToken();
            var response = await fetch(API_URL + '/maintenance/cost/expenses/' + id, {
                method: 'DELETE',
                headers: { 'Authorization': 'Bearer ' + token }
            });
            
            if (response.ok) {
                showToast('Expense deleted successfully', 'success');
                loadSummary();
                loadExpenses();
                loadCategorySummary();
            } else {
                showToast('Failed to delete expense', 'error');
            }
        } catch (error) {
            showToast('Error deleting expense', 'error');
        }
    }
}

function closeModal() {
    var modal = document.getElementById('expenseModal');
    if (modal) modal.remove();
}

// Add CSS for modal
var modalStyle = document.createElement('style');
modalStyle.textContent = `
    .modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        z-index: 1000;
        justify-content: center;
        align-items: center;
    }
    .modal-content {
        background: white;
        border-radius: 12px;
        width: 500px;
        max-width: 90%;
        padding: 25px;
    }
    .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        padding-bottom: 10px;
        border-bottom: 1px solid #ddd;
    }
    .close-btn {
        cursor: pointer;
        font-size: 24px;
        color: #666;
    }
    .form-group {
        margin-bottom: 15px;
    }
    .form-group label {
        display: block;
        margin-bottom: 5px;
        font-weight: 500;
    }
    .form-group input, .form-group select {
        width: 100%;
        padding: 8px 12px;
        border: 1px solid #ddd;
        border-radius: 5px;
    }
    .btn-save {
        background: #10b981;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 8px;
        cursor: pointer;
        width: 100%;
    }
    .btn-save:hover {
        background: #059669;
    }
    .btn-edit {
        background: #3b82f6;
        color: white;
        margin-right: 5px;
    }
    .btn-edit:hover {
        background: #2563eb;
    }
    .btn-delete {
        background: #ef4444;
        color: white;
    }
    .btn-delete:hover {
        background: #dc2626;
    }
    .action-buttons {
        display: flex;
        gap: 5px;
    }
`;
document.head.appendChild(modalStyle);

// Make functions global
window.openAddExpenseModal = openAddExpenseModal;
window.openEditModal = openEditModal;
window.saveExpense = saveExpense;
window.updateExpense = updateExpense;
window.deleteExpense = deleteExpense;
window.closeModal = closeModal;