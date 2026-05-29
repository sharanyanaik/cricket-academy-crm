// ==================== ADMIN COACHES MANAGEMENT ====================

// Load all coaches
async function loadCoaches() {
    const tbody = document.getElementById('coachesTableBody');
    if (!tbody) return;
    
    try {
        const token = getToken();
        if (!token) {
            window.location.href = '../../pages/Authentication/login.html';
            return;
        }

        const response = await fetch(`${API_URL}/coaches`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                localStorage.clear();
                window.location.href = '../../pages/Authentication/login.html';
                return;
            }
            throw new Error('Failed to load coaches');
        }
        
        const coaches = await response.json();
        
        if (!coaches || coaches.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" class="text-center">No coaches found. Click "Add Coach" to create one.<\/td><\/tr>';
            return;
        }
        
        tbody.innerHTML = coaches.map(coach => {
            const statusBadge = coach.status === 'active' 
                ? '<span class="badge bg-success">Active</span>' 
                : '<span class="badge bg-danger">Inactive</span>';
            
            const expDisplay = coach.experience_years ? `${coach.experience_years} yrs` : '0 yrs';
            const dobDisplay = coach.date_of_birth ? new Date(coach.date_of_birth).toLocaleDateString('en-IN') : '-';
            
            return `
            <tr>
                <td>${coach.id || '-'}</td>
                <td><strong>${escapeHtml(coach.coach_name || '-')}</strong></td>
                <td>${escapeHtml(coach.email || '-')}</td>
                <td>${coach.phone || '-'}</td>
                <td>${dobDisplay}</td>
                <td>${escapeHtml(coach.specialization || 'General')}</td>
                <td>${expDisplay}</td>
                <td>${statusBadge}</td>
                <td class="action-buttons">
                    <button class="btn btn-sm btn-warning" onclick="editCoach(${coach.id})" title="Edit Coach">
                        <i class="fa-solid fa-pencil"></i> Edit
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteCoach(${coach.id})" title="Delete Coach">
                        <i class="fa-solid fa-trash-can"></i> Delete
                    </button>
                  </td>
            </tr>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error:', error);
        tbody.innerHTML = '<tr><td colspan="9" class="text-center text-danger">Failed to load coaches<\/td><\/tr>';
        showToast('Failed to load coaches', 'error');
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// Show add coach modal
function showAddCoachModal() {
    const modal = document.getElementById('coachModal');
    if (!modal) return;
    
    document.getElementById('modalTitle').innerText = 'Add Coach';
    document.getElementById('coachId').value = '';
    document.getElementById('full_name').value = '';
    document.getElementById('email').value = '';
    document.getElementById('phone').value = '';
    document.getElementById('date_of_birth').value = '';
    document.getElementById('specialization').value = 'General';
    document.getElementById('experience_years').value = '0';
    document.getElementById('status').value = 'active';
    document.getElementById('password').value = '';
    
    modal.style.display = 'flex';
}

// Edit coach
async function editCoach(id) {
    try {
        const token = getToken();
        const response = await fetch(`${API_URL}/coaches/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to load coach data');
        
        const coach = await response.json();
        
        document.getElementById('modalTitle').innerText = 'Edit Coach';
        document.getElementById('coachId').value = coach.id;
        document.getElementById('full_name').value = coach.coach_name || '';
        document.getElementById('email').value = coach.email || '';
        document.getElementById('phone').value = coach.phone || '';
        document.getElementById('date_of_birth').value = coach.date_of_birth || '';
        document.getElementById('specialization').value = coach.specialization || 'General';
        document.getElementById('experience_years').value = coach.experience_years || '0';
        document.getElementById('status').value = coach.status || 'active';
        document.getElementById('password').value = '';
        
        document.getElementById('coachModal').style.display = 'flex';
        
    } catch (error) {
        console.error('Error:', error);
        showToast('Error loading coach data', 'error');
    }
}

// Delete coach
function deleteCoach(id) {
    showConfirmModal({
        title: 'Delete Coach',
        message: 'Are you sure you want to delete this coach?',
        type: 'warning',
        onConfirm: async () => {
            try {
                const token = getToken();
                const response = await fetch(`${API_URL}/coaches/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (response.ok) {
                    showToast('Coach deleted successfully', 'success');
                    await loadCoaches();
                } else {
                    const data = await response.json();
                    showToast(data.message || 'Delete failed', 'error');
                }
            } catch (error) {
                console.error('Error:', error);
                showToast('Error deleting coach', 'error');
            }
        }
    });
}

// Save coach
let isSavingCoach = false;

async function saveCoach(event) {
    event.preventDefault();
    
    if (isSavingCoach) {
        showToast('Please wait, saving in progress...', 'info');
        return;
    }
    
    const coachId = document.getElementById('coachId').value;
    const full_name = document.getElementById('full_name').value.trim();
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const date_of_birth = document.getElementById('date_of_birth').value;
    const specialization = document.getElementById('specialization').value;
    const experience_years = document.getElementById('experience_years').value || 0;
    const status = document.getElementById('status').value;
    const password = document.getElementById('password').value;
    
    if (!full_name || !email) {
        showToast('Please fill name and email', 'error');
        return;
    }
    
    const coachData = { 
        full_name, 
        email, 
        phone, 
        date_of_birth,
        specialization, 
        experience_years, 
        status 
    };
    if (password && password.trim() !== '') {
        coachData.password = password;
    }
    
    const saveBtn = document.querySelector('#coachForm .btn-save');
    const originalText = saveBtn ? saveBtn.innerHTML : 'Save';
    isSavingCoach = true;
    if (saveBtn) {
        saveBtn.innerHTML = '<span class="spinner"></span> Saving...';
        saveBtn.disabled = true;
    }
    
    try {
        const token = getToken();
        let response;
        
        if (coachId) {
            response = await fetch(`${API_URL}/coaches/${coachId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(coachData)
            });
        } else {
            response = await fetch(`${API_URL}/coaches`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(coachData)
            });
        }
        
        const data = await response.json();
        
        if (response.ok) {
            showToast(coachId ? 'Coach updated successfully' : 'Coach added successfully', 'success');
            closeModal();
            await loadCoaches();
        } else {
            showToast(data.message || 'Operation failed', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Error saving coach', 'error');
    } finally {
        isSavingCoach = false;
        if (saveBtn) {
            saveBtn.innerHTML = originalText;
            saveBtn.disabled = false;
        }
    }
}

// Search coaches
function searchCoaches() {
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const rows = document.querySelectorAll('#coachesTableBody tr');
    
    rows.forEach(row => {
        const name = row.cells[1]?.textContent.toLowerCase() || '';
        const email = row.cells[2]?.textContent.toLowerCase() || '';
        row.style.display = (name.includes(searchTerm) || email.includes(searchTerm)) ? '' : 'none';
    });
}

// Close modal
function closeModal() {
    const modal = document.getElementById('coachModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Make functions global
window.showAddCoachModal = showAddCoachModal;
window.editCoach = editCoach;
window.deleteCoach = deleteCoach;
window.closeModal = closeModal;
window.searchCoaches = searchCoaches;

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
    
    if (document.getElementById('coachesTableBody')) {
        loadCoaches();
        
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('keyup', searchCoaches);
        }
        
        window.onclick = function(event) {
            const modal = document.getElementById('coachModal');
            if (event.target === modal) closeModal();
        };
    }
    
    const coachForm = document.getElementById('coachForm');
    if (coachForm) {
        coachForm.removeEventListener('submit', saveCoach);
        coachForm.addEventListener('submit', saveCoach);
    }
});