// ==================== ADMIN USERS MANAGEMENT ====================

let isSaving = false;
let isModalOpen = false;

// Load all users
async function loadUsers() {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;
    
    try {
        const token = getToken();
        if (!token) {
            window.location.href = '../../pages/Authentication/login.html';
            return;
        }

        const response = await fetch(`${API_URL}/users`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                localStorage.clear();
                window.location.href = '../../pages/Authentication/login.html';
                return;
            }
            throw new Error('Failed to load users');
        }
        
        const users = await response.json();
        
        if (!users || users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center">No users found</td></tr>';
            return;
        }
        
        tbody.innerHTML = users.map(user => {
            let badgeClass = 'bg-secondary';
            
            // REMOVED badgeStyle - using only CSS classes
            switch(user.role) {
                case 'admin': 
                    badgeClass = 'bg-danger'; 
                    break;
                case 'coach': 
                    badgeClass = 'bg-primary'; 
                    break;
                case 'player': 
                    badgeClass = 'bg-success'; 
                    break;
                case 'accountant': 
                    badgeClass = 'bg-info'; 
                    break;
                case 'billing': 
                    badgeClass = 'bg-warning'; 
                    break;
                case 'maintenance': 
                    badgeClass = 'bg-secondary'; 
                    break;
                default: 
                    badgeClass = 'bg-secondary';
            }
            
            let dobDisplay = 'Not set';
            if (user.date_of_birth) {
                const dob = new Date(user.date_of_birth);
                dobDisplay = dob.toLocaleDateString('en-IN');
            }
            
            const joinedDate = user.created_at ? new Date(user.created_at).toLocaleDateString('en-IN') : 'N/A';
            const statusBadge = user.status === 'active' 
                ? '<span class="badge bg-success">Active</span>' 
                : '<span class="badge bg-secondary">Inactive</span>';
            
            // Capitalize role for display
            const roleDisplay = user.role.charAt(0).toUpperCase() + user.role.slice(1);
            
            return `
                <tr>
                    <td>${user.id}</td>
                    <td>${escapeHtml(user.full_name) || '-'}</td>
                    <td>${escapeHtml(user.email) || '-'}</td>
                    <td><span class="badge ${badgeClass}">${roleDisplay}</span></td>
                    <td>${statusBadge}</td>
                    <td>${dobDisplay}</td>
                    <td>${joinedDate}</td>
                    <td class="action-buttons">
                        <button class="btn btn-sm btn-warning" onclick="editUser(${user.id})">
                            <i class="fa-solid fa-pencil"></i> Edit
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteUser(${user.id})">
                            <i class="fa-solid fa-trash-can"></i> Delete
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error:', error);
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-danger">Failed to load users</td></tr>';
    }
}

// Helper function to escape HTML
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// Show add user modal (SINGLE VERSION)
function showAddUserModal() {
    if (isModalOpen) {
        console.log('Modal already open, ignoring');
        return;
    }
    
    isModalOpen = true;
    document.getElementById('modalTitle').innerText = 'Add User';
    document.getElementById('userId').value = '';
    document.getElementById('full_name').value = '';
    document.getElementById('email').value = '';
    document.getElementById('phone').value = '';
    document.getElementById('date_of_birth').value = '';
    document.getElementById('password').value = '';
    document.getElementById('role').value = 'player';
    document.getElementById('status').value = 'active';
    document.getElementById('userModal').style.display = 'flex';
}

// Edit user
async function editUser(id) {
    try {
        const token = getToken();
        const response = await fetch(`${API_URL}/users/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to load user');
        
        const user = await response.json();
        
        document.getElementById('modalTitle').innerText = 'Edit User';
        document.getElementById('userId').value = user.id;
        document.getElementById('full_name').value = user.full_name || '';
        document.getElementById('email').value = user.email || '';
        document.getElementById('phone').value = user.phone || '';
        document.getElementById('date_of_birth').value = user.date_of_birth || '';
        document.getElementById('role').value = user.role || 'player';
        document.getElementById('status').value = user.status || 'active';
        document.getElementById('password').value = '';
        document.getElementById('userModal').style.display = 'flex';
        
    } catch (error) {
        console.error('Error:', error);
        showToast('Error loading user data', 'error');
    }
}

// Delete user
function deleteUser(id) {
    showConfirmModal({
        title: 'Delete User',
        message: 'Are you sure you want to delete this user? This action cannot be undone.',
        type: 'warning',
        onConfirm: async () => {
            try {
                const token = getToken();
                const response = await fetch(`${API_URL}/users/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (response.ok) {
                    showToast('User deleted successfully', 'success');
                    loadUsers();
                } else {
                    showToast('Delete failed', 'error');
                }
            } catch (error) {
                console.error('Error:', error);
                showToast('Error deleting user', 'error');
            }
        }
    });
}

// Save user
async function saveUser(event) {
    event.preventDefault();
    
    if (isSaving) {
        console.log('Save already in progress, ignoring duplicate click');
        showToast('Please wait, saving in progress...', 'info');
        return;
    }
    
    const userId = document.getElementById('userId').value;
    const full_name = document.getElementById('full_name').value.trim();
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const date_of_birth = document.getElementById('date_of_birth').value;
    const role = document.getElementById('role').value;
    const status = document.getElementById('status').value;
    const password = document.getElementById('password').value;
    
    if (!full_name || !email) {
        showToast('Please fill all required fields', 'error');
        return;
    }
    
    if (!userId && !password) {
        showToast('Password is required for new users', 'error');
        return;
    }
    
    const userData = { full_name, email, phone, date_of_birth, role, status };
    if (password) userData.password = password;
    
    const saveBtn = document.querySelector('.btn-save');
    const originalText = saveBtn.innerHTML;
    
    isSaving = true;
    saveBtn.innerHTML = '<span class="spinner"></span> Saving...';
    saveBtn.disabled = true;
    
    try {
        const token = getToken();
        const url = userId ? `${API_URL}/users/${userId}` : `${API_URL}/users`;
        const method = userId ? 'PUT' : 'POST';
        
        console.log('Saving user with data:', userData);
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(userData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showToast(userId ? 'User updated successfully' : 'User added successfully', 'success');
            closeModal();
            loadUsers();
        } else {
            showToast(data.message || 'Operation failed', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Error saving user', 'error');
    } finally {
        isSaving = false;
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
    }
}

// Close modal (SINGLE VERSION)
function closeModal() {
    document.getElementById('userModal').style.display = 'none';
    document.getElementById('userForm').reset();
    isModalOpen = false;
    isSaving = false;
}

// Search users
function searchUsers() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const rows = document.querySelectorAll('#usersTableBody tr');
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
}

// Make functions global
window.showAddUserModal = showAddUserModal;
window.editUser = editUser;
window.deleteUser = deleteUser;
window.closeModal = closeModal;
window.searchUsers = searchUsers;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    const token = getToken();
    const user = getCurrentUser();
    
    if (!token) {
        window.location.href = '../../pages/Authentication/login.html';
        return;
    }
    
    if (user && user.role !== 'admin') {
        showToast('Access denied. Admin only.', 'error');
        setTimeout(() => {
            window.location.href = '../../pages/Authentication/login.html';
        }, 1500);
        return;
    }
    
    const userNameElement = document.getElementById('userName');
    const userRoleElement = document.getElementById('userRole');
    if (userNameElement) userNameElement.textContent = user?.full_name || user?.name || 'Admin';
    if (userRoleElement) userRoleElement.textContent = user?.role || 'Admin';
    
    loadUsers();
    
    const form = document.getElementById('userForm');
    if (form) {
        form.removeEventListener('submit', saveUser);
        form.addEventListener('submit', saveUser);
    }
    
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.removeEventListener('keyup', searchUsers);
        searchInput.addEventListener('keyup', searchUsers);
    }
    
    window.onclick = function(event) {
        const modal = document.getElementById('userModal');
        if (event.target === modal) closeModal();
    };
});