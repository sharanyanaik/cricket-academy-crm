// ==================== ADMIN PLAYERS MANAGEMENT ====================

// Load all players
async function loadPlayers() {
    const tbody = document.getElementById('playersTableBody');
    if (!tbody) return;
    
    try {
        const token = getToken();
        if (!token) {
            window.location.href = '../../pages/Authentication/login.html';
            return;
        }

        tbody.innerHTML = '<tr><td colspan="10" class="text-center"><i class="fa fa-spinner fa-spin"></i> Loading...<\/td><\/tr>';
        
        const response = await fetch(`${API_URL}/players`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                localStorage.clear();
                window.location.href = '../../pages/Authentication/login.html';
                return;
            }
            throw new Error('Failed to load players');
        }
        
        const players = await response.json();
        
        if (!players || players.length === 0) {
            tbody.innerHTML = '<tr><td colspan="10" class="text-center">No players found. Click "Add Player" to create one.<\/td><\/tr>';
            return;
        }
        
        tbody.innerHTML = players.map(player => {
            const playerName = player.player_name || player.full_name || 'N/A';
            const dobDisplay = player.date_of_birth ? new Date(player.date_of_birth).toLocaleDateString('en-IN') : '-';
            
            return `
            <tr>
                <td>${player.id || '-'}</td>
                <td><strong>${escapeHtml(playerName)}</strong></td>
                <td>${escapeHtml(player.email || '-')}</td>
                <td>${player.phone || '-'}</td>
                <td>${dobDisplay}</td>
                <td>${player.batch_name ? escapeHtml(player.batch_name) : '-'}</td>
                <td>${player.coach_name ? escapeHtml(player.coach_name) : '<span class="text-muted">Not assigned</span>'}</td>
                <td>${player.playing_role || '-'}</td>
                <td><span class="badge ${player.status === 'active' ? 'bg-success' : 'bg-danger'}">${player.status || 'active'}</span></td>
                <td class="action-buttons">
                    <button class="btn btn-sm btn-warning" onclick="editPlayer(${player.id})" title="Edit Player">
                        <i class="fa-solid fa-pencil"></i> Edit
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deletePlayer(${player.id})" title="Delete Player">
                        <i class="fa-solid fa-trash-can"></i> Delete
                    </button>
                  </td>
            </tr>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error:', error);
        tbody.innerHTML = '</table><td colspan="10" class="text-center text-danger">Failed to load players<\/td><\/tr>';
        showToast('Failed to load players', 'error');
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

// Load batches from database
async function loadBatches() {
    try {
        const token = getToken();
        const response = await fetch(`${API_URL}/batches`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const batches = await response.json();
            const batchSelect = document.getElementById('batch_id');
            if (batchSelect) {
                batchSelect.innerHTML = '<option value="">Select Batch</option>';
                batches.forEach(batch => {
                    batchSelect.innerHTML += `<option value="${batch.id}">${escapeHtml(batch.batch_name)} (${batch.timing || ''})</option>`;
                });
            }
        }
    } catch (error) {
        console.error('Error loading batches:', error);
    }
}

// Load coaches
async function loadCoaches(selectedCoachId = null) {
    try {
        const token = getToken();
        
        const response = await fetch(`${API_URL}/coaches`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            console.error('Coaches API returned:', response.status);
            const coachSelect = document.getElementById('coach_id');
            if (coachSelect) {
                coachSelect.innerHTML = '<option value="">Error loading coaches</option>';
            }
            return;
        }
        
        const coaches = await response.json();
        console.log('Coaches from API:', coaches);
        
        const coachSelect = document.getElementById('coach_id');
        
        if (coachSelect) {
            coachSelect.innerHTML = '<option value="">Select Coach</option>';
            
            if (coaches && coaches.length > 0) {
                coaches.forEach(coach => {
                    const selected = selectedCoachId && coach.id == selectedCoachId ? 'selected' : '';
                    coachSelect.innerHTML += `<option value="${coach.id}" ${selected}>${escapeHtml(coach.coach_name)}</option>`;
                });
                console.log(`Loaded ${coaches.length} coaches into dropdown`);
            } else {
                coachSelect.innerHTML = '<option value="">No coaches available</option>';
            }
        }
        
    } catch (error) {
        console.error('Error loading coaches:', error);
        const coachSelect = document.getElementById('coach_id');
        if (coachSelect) {
            coachSelect.innerHTML = '<option value="">Error loading coaches</option>';
        }
    }
}

// Show add modal
function showAddPlayerModal() {
    document.getElementById('modalTitle').innerText = 'Add Player';
    document.getElementById('playerId').value = '';
    document.getElementById('playerForm').reset();
    document.getElementById('status').value = 'active';
    document.getElementById('playerModal').style.display = 'flex';
    
    loadBatches();
    loadCoaches();
}

// Edit player
async function editPlayer(id) {
    try {
        const token = getToken();
        const response = await fetch(`${API_URL}/players/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to load player');
        
        const player = await response.json();
        console.log('Editing player:', player);
        
        // Load batches
        await loadBatches();
        
        // Load coaches with current selection
        await loadCoaches(player.coach_id);
        
        // Set form values
        document.getElementById('modalTitle').innerText = 'Edit Player';
        document.getElementById('playerId').value = player.id;
        document.getElementById('full_name').value = player.player_name || '';
        document.getElementById('email').value = player.email || '';
        document.getElementById('phone').value = player.phone || '';
        document.getElementById('date_of_birth').value = player.date_of_birth || '';
        document.getElementById('batch_id').value = player.batch_id || '';
        document.getElementById('playing_role').value = player.playing_role || '';
        document.getElementById('status').value = player.status || 'active';
        
        document.getElementById('playerModal').style.display = 'flex';
        
    } catch (error) {
        console.error('Error:', error);
        showToast('Error loading player data', 'error');
    }
}

// Delete player
function deletePlayer(id) {
    showConfirmModal({
        title: 'Delete Player',
        message: 'Are you sure you want to delete this player?',
        type: 'warning',
        onConfirm: async () => {
            try {
                const token = getToken();
                const response = await fetch(`${API_URL}/players/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (response.ok) {
                    showToast('Player deleted successfully', 'success');
                    loadPlayers();
                } else {
                    const data = await response.json();
                    showToast(data.message || 'Delete failed', 'error');
                }
            } catch (error) {
                console.error('Error:', error);
                showToast('Error deleting player', 'error');
            }
        }
    });
}

// Save player
let isSaving = false;

async function savePlayer(event) {
    event.preventDefault();
    
    if (isSaving) {
        showToast('Please wait, saving in progress...', 'info');
        return;
    }
    
    const playerId = document.getElementById('playerId').value;
    
    const playerData = {
        player_name: document.getElementById('full_name').value.trim(),
        email: document.getElementById('email').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        date_of_birth: document.getElementById('date_of_birth').value,
        batch_id: document.getElementById('batch_id').value || null,
        coach_id: document.getElementById('coach_id').value || null,
        playing_role: document.getElementById('playing_role').value || null,
        status: document.getElementById('status').value
    };
    
    console.log('Saving player data:', playerData);
    
    if (!playerData.player_name || !playerData.email) {
        showToast('Please fill player name and email', 'error');
        return;
    }
    
    const saveBtn = document.querySelector('.btn-save');
    const originalText = saveBtn.innerHTML;
    isSaving = true;
    saveBtn.innerHTML = '<span class="spinner"></span> Saving...';
    saveBtn.disabled = true;
    
    try {
        const token = getToken();
        const url = playerId ? `${API_URL}/players/${playerId}` : `${API_URL}/players`;
        const method = playerId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(playerData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showToast(playerId ? 'Player updated successfully' : 'Player added successfully', 'success');
            closeModal();
            loadPlayers();
        } else {
            showToast(data.message || 'Operation failed', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Error saving player', 'error');
    } finally {
        isSaving = false;
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
    }
}

// Close modal
function closeModal() {
    document.getElementById('playerModal').style.display = 'none';
    document.getElementById('playerForm').reset();
}

// Search players
function searchPlayers() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const rows = document.querySelectorAll('#playersTableBody tr');
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
}

// Make functions global
window.showAddPlayerModal = showAddPlayerModal;
window.editPlayer = editPlayer;
window.deletePlayer = deletePlayer;
window.closeModal = closeModal;
window.searchPlayers = searchPlayers;

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
    
    loadPlayers();
    
    const form = document.getElementById('playerForm');
    if (form) {
        form.removeEventListener('submit', savePlayer);
        form.addEventListener('submit', savePlayer);
    }
    
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.removeEventListener('keyup', searchPlayers);
        searchInput.addEventListener('keyup', searchPlayers);
    }
    
    window.onclick = function(event) {
        const modal = document.getElementById('playerModal');
        if (event.target === modal) closeModal();
    };
});