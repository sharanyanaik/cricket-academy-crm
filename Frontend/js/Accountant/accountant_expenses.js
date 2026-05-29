// ==================== ACCOUNTANT EXPENSES JS ====================

let currentEditId = null;

document.addEventListener('DOMContentLoaded', () => {
    console.log('Expenses page loaded');
    
    if (!checkAccountantAuth()) return;
    
    setDefaultDate();
    loadExpenses();
    
    // Add form event listeners
    const expenseForm = document.getElementById('expenseForm');
    if (expenseForm) {
        expenseForm.addEventListener('submit', saveExpense);
    }
    
    // Show add form button
    const showAddFormBtn = document.getElementById('showAddFormBtn');
    if (showAddFormBtn) {
        showAddFormBtn.addEventListener('click', showAddForm);
    }
    
    // Cancel form button
    const cancelFormBtn = document.getElementById('cancelFormBtn');
    if (cancelFormBtn) {
        cancelFormBtn.addEventListener('click', hideAddForm);
    }
    
    // Cancel edit button 
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    if (cancelEditBtn) {
        cancelEditBtn.addEventListener('click', closeEditModal);
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

function setDefaultDate() {
    const dateInput = document.getElementById('expenseDate');
    if (dateInput && !dateInput.value) {
        dateInput.valueAsDate = new Date();
    }
}

async function loadExpenses() {
    try {
        const token = getToken();
        if (!token) return;
        
        const response = await fetch(`${API_URL}/accountant/expenses`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const expenses = await response.json();
            displayExpenses(expenses);
        } else if (response.status === 401 || response.status === 403) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '../../pages/Authentication/login.html';
        }
    } catch (error) {
        console.error('Error loading expenses:', error);
        showToast('Failed to load expenses', 'error');
    }
}

function displayExpenses(expenses) {
    const tbody = document.getElementById('expensesTableBody');
    if (!tbody) return;
    
    if (!expenses || expenses.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center">No expenses found</td></tr>';
        return;
    }
    
    let html = '';
    expenses.forEach(expense => {
        html += `
            <tr>
                <td>${formatDate(expense.expense_date)}</td>
                <td>${expense.description || expense.category || '-'}</td>
                <td>${formatCurrency(expense.amount)}</td>
                <td>
                    <button class="btn-edit" onclick="openEditModal(${expense.id})" title="Edit"><i class="fa-solid fa-pen"></i></button>
                    <button class="btn-delete" onclick="deleteExpense(${expense.id})" title="Delete"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

function openEditModal(id) {
    currentEditId = id;
    fetchExpenseById(id);
    const modal = document.getElementById('editModal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

function closeEditModal() {
    const modal = document.getElementById('editModal');
    if (modal) {
        modal.style.display = 'none';
    }
    currentEditId = null;
}

async function fetchExpenseById(id) {
    try {
        const token = getToken();
        const response = await fetch(`${API_URL}/accountant/expenses/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const expense = await response.json();
            document.getElementById('editExpenseTitle').value = expense.description || '';
            document.getElementById('editExpenseCategory').value = expense.category || 'General';
            document.getElementById('editExpenseAmount').value = expense.amount;
            document.getElementById('editExpenseDate').value = expense.expense_date ? new Date(expense.expense_date).toISOString().split('T')[0] : '';
            document.getElementById('editPaymentMode').value = expense.payment_mode || 'cash';
            document.getElementById('editExpenseNotes').value = expense.notes || '';
        } else {
            showToast('Failed to load expense details', 'error');
        }
    } catch (error) {
        console.error('Error fetching expense:', error);
        showToast('Error loading expense details', 'error');
    }
}

async function updateExpense() {
    const title = document.getElementById('editExpenseTitle').value;
    const amount = document.getElementById('editExpenseAmount').value;
    const expenseDate = document.getElementById('editExpenseDate').value;
    const notes = document.getElementById('editExpenseNotes').value;
    const category = document.getElementById('editExpenseCategory').value;
    const paymentMode = document.getElementById('editPaymentMode').value;
    
    if (!title || !amount || !expenseDate) {
        showToast('Please fill all required fields', 'error');
        return;
    }
    
    const updateBtn = document.getElementById('updateExpenseBtn');
    const originalText = updateBtn.innerHTML;
    updateBtn.disabled = true;
    updateBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Updating...';
    
    try {
        const token = getToken();
        const response = await fetch(`${API_URL}/accountant/expenses/${currentEditId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                title: title,
                amount: parseFloat(amount),
                expense_date: expenseDate,
                notes: notes,
                category: category,
                payment_mode: paymentMode
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showToast('Expense updated successfully!', 'success');
            closeEditModal();
            loadExpenses();
        } else {
            showToast(data.message || 'Failed to update expense', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Error updating expense', 'error');
    } finally {
        updateBtn.disabled = false;
        updateBtn.innerHTML = originalText;
    }
}

async function saveExpense(event) {
    event.preventDefault();
    
    const title = document.getElementById('expenseTitle').value;
    const amount = document.getElementById('expenseAmount').value;
    const expenseDate = document.getElementById('expenseDate').value;
    const notes = document.getElementById('expenseNotes').value;
    const category = document.getElementById('expenseCategory') ? document.getElementById('expenseCategory').value : 'General';
    const paymentMode = document.getElementById('paymentMode') ? document.getElementById('paymentMode').value : 'cash';
    
    if (!title || !amount || !expenseDate) {
        showToast('Please fill all required fields', 'error');
        return;
    }
    
    const saveBtn = document.getElementById('saveBtn');
    const originalText = saveBtn.innerHTML;
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
    
    try {
        const token = getToken();
        const response = await fetch(`${API_URL}/accountant/expenses`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                title: title,
                amount: parseFloat(amount),
                expense_date: expenseDate,
                notes: notes,
                category: category,
                payment_mode: paymentMode
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showToast('Expense added successfully!', 'success');
            hideAddForm();
            loadExpenses();
        } else {
            showToast(data.message || 'Failed to add expense', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Error saving expense. Make sure backend is running.', 'error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalText;
    }
}

async function deleteExpense(id) {
    showConfirmModal({
        title: 'Delete Expense',
        message: 'Are you sure you want to delete this expense?',
        type: 'warning',
        onConfirm: async () => {
            try {
                const token = getToken();
                const response = await fetch(`${API_URL}/accountant/expenses/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (response.ok) {
                    showToast('Expense deleted successfully', 'success');
                    loadExpenses();
                } else {
                    showToast('Failed to delete expense', 'error');
                }
            } catch (error) {
                console.error('Error:', error);
                showToast('Error deleting expense', 'error');
            }
        }
    });
}

function refreshExpenses() {
    loadExpenses();
    showToast('Expenses refreshed', 'success');
}

// Show add expense form 
function showAddForm() {
    const formCard = document.getElementById('expenseFormCard');
    const recordsContainer = document.getElementById('expenseRecordsContainer');
    
    if (formCard) {
        formCard.classList.add('show');
        setDefaultDate();
        formCard.scrollIntoView({ behavior: 'smooth' });
    }
    
    // Hide the expense records table
    if (recordsContainer) {
        recordsContainer.style.display = 'none';
    }
}

// Hide add expense form 
function hideAddForm() {
    const formCard = document.getElementById('expenseFormCard');
    const recordsContainer = document.getElementById('expenseRecordsContainer');
    
    if (formCard) {
        formCard.classList.remove('show');
    }
    
    // Show the expense records table again
    if (recordsContainer) {
        recordsContainer.style.display = 'block';
    }
    
    // Reset form
    const form = document.getElementById('expenseForm');
    if (form) {
        form.reset();
        setDefaultDate();
    }
}