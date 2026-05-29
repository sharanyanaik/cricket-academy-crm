// ==================== ADMIN BATCHES PAGE ====================

// Load existing batches for selection dropdown
async function loadBatchesForSelection() {
    try {
        const response = await fetch(`${API_URL}/batches`, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        
        if (response.ok) {
            const batches = await response.json();
            const selectBatch = document.getElementById('select_batch');
            
            if (selectBatch) {
                let options = '<option value="">-- Select a batch to edit --</option>';
                
                if (batches && batches.length > 0) {
                    for (const batch of batches) {
                        options += '<option value="' + batch.id + '" data-timing="' + (batch.timing || '') + '" data-max-players="' + (batch.max_players || 20) + '" data-status="' + (batch.status || 'active') + '" data-coach-id="' + (batch.coach_id || '') + '">';
                        options += batch.batch_name + ' (' + (batch.timing || 'No timing') + ') - Max: ' + (batch.max_players || 20) + ' players';
                        options += '</option>';
                    }
                }
                selectBatch.innerHTML = options;
            }
        }
    } catch (error) {
        console.error('Error loading batches for selection:', error);
        showToast('Failed to load batches', 'error');
    }
}

// Load coaches from database
async function loadCoachesForDropdown() {
    try {
        // Use the dedicated coaches endpoint
        const response = await fetch(`${API_URL}/batches/coaches/list`, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        
        if (response.ok) {
            const coaches = await response.json();
            const coachSelect = document.getElementById('coach_id');
            
            if (coachSelect) {
                let options = '<option value="">-- Select Coach --</option>';
                
                if (!coaches || coaches.length === 0) {
                    options = '<option value="">-- No coaches available --</option>';
                    showToast('No coaches found. Please add coaches first.', 'info');
                } else {
                    for (const coach of coaches) {
                        options += `<option value="${coach.id}">${coach.full_name} ${coach.email ? `(${coach.email})` : ''}</option>`;
                    }
                }
                coachSelect.innerHTML = options;
                console.log('Coaches loaded:', coaches.length); // Debug log
            }
        } else {
            console.error('Failed to load coaches:', response.status);
            const coachSelect = document.getElementById('coach_id');
            if (coachSelect) {
                coachSelect.innerHTML = '<option value="">-- Error loading coaches --</option>';
            }
            showToast('Failed to load coaches list', 'error');
        }
    } catch (error) {
        console.error('Error loading coaches:', error);
        showToast('Error loading coaches: ' + error.message, 'error');
        const coachSelect = document.getElementById('coach_id');
        if (coachSelect) {
            coachSelect.innerHTML = '<option value="">-- Error loading coaches --</option>';
        }
    }
}
// Load all batches for table display
async function loadBatches() {
    try {
        const token = getToken();
        if (!token) {
            window.location.href = '../../pages/Authentication/login.html';
            return;
        }

        const response = await fetch(`${API_URL}/batches`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                window.location.href = '../../pages/Authentication/login.html';
                return;
            }
            throw new Error('Failed to load batches');
        }
        
        const batches = await response.json();
        const tbody = document.getElementById('batchesTableBody');
        
        if (!tbody) return;
        
        if (!batches || batches.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">No batches found</td></tr>';
            return;
        }
        
        let html = '';
        for (const batch of batches) {
            // Determine status badge class
            let statusClass = '';
            if (batch.status === 'active') statusClass = 'bg-success';
            else if (batch.status === 'completed') statusClass = 'bg-info';
            else statusClass = 'bg-danger';
            
            html += '<tr>';
            html += '<td>' + (batch.id || '') + '</td>';
            html += '<td>' + (batch.batch_name || '-') + '</td>';
            html += '<td>' + (batch.timing || '-') + '</td>';
            html += '<td>' + (batch.coach_name || 'Not Assigned') + '</td>';
            html += '<td>' + (batch.max_players || 20) + '</td>';
            html += '<td><span class="badge ' + statusClass + '">' + (batch.status || 'active') + '</span></td>';
            html += '<td class="action-buttons">';
            html += '<button class="btn btn-sm btn-warning" onclick="editBatch(' + batch.id + ')" title="Edit Batch">';
            html += '<i class="fa-solid fa-pencil"></i> Edit';
            html += '</button>';
            html += '<button class="btn btn-sm btn-danger" onclick="deleteBatch(' + batch.id + ')" title="Delete Batch">';
            html += '<i class="fa-solid fa-trash-can"></i> Delete';
            html += '</button>';
            html += '</td>';
            html += '</tr>';
        }
        tbody.innerHTML = html;
        
    } catch (error) {
        console.error('Error:', error);
        const tbody = document.getElementById('batchesTableBody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center text-danger">Failed to load batches</td></tr>';
        }
        showToast('Failed to load batches', 'error');
    }
}

// Show Add Batch Modal
function showAddBatchModal() {
    const modal = document.getElementById('batchModal');
    if (!modal) return;
    
    document.getElementById('modalTitle').innerText = 'Add New Batch';
    document.getElementById('batchId').value = '';
    document.getElementById('batch_name').value = '';
    document.getElementById('timing').value = '';
    document.getElementById('max_players').value = '20';
    document.getElementById('status').value = 'active';
    document.getElementById('select_batch').value = '';
    
    // Set loading state on coach dropdown
    const coachSelect = document.getElementById('coach_id');
    if (coachSelect) {
        coachSelect.innerHTML = '<option value="">Loading coaches...</option>';
    }
    
    // Load coaches and then show modal
    loadCoachesForDropdown().then(() => {
        modal.style.display = 'flex';
    });
}
// Edit Batch
async function editBatch(id) {
    try {
        const response = await fetch(`${API_URL}/batches/${id}`, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        
        if (!response.ok) throw new Error('Failed to load batch data');
        
        const batchData = await response.json();
        
        document.getElementById('modalTitle').innerText = 'Edit Batch';
        document.getElementById('batchId').value = batchData.id;
        document.getElementById('batch_name').value = batchData.batch_name || '';
        document.getElementById('timing').value = batchData.timing || '';
        document.getElementById('max_players').value = batchData.max_players || 20;
        document.getElementById('status').value = batchData.status || 'active';
        document.getElementById('select_batch').value = '';
        
        await loadCoachesForDropdown();
        
        if (batchData.coach_id) {
            document.getElementById('coach_id').value = batchData.coach_id;
        } else {
            document.getElementById('coach_id').value = '';
        }
        
        const modal = document.getElementById('batchModal');
        if (modal) modal.style.display = 'flex';
        
    } catch (error) {
        console.error('Error:', error);
        showToast('Error loading batch data', 'error');
    }
}

// Handle batch selection 
async function onBatchSelect() {
    const selectBatch = document.getElementById('select_batch');
    const selectedBatchId = selectBatch.value;
    
    if (!selectedBatchId) return;
    
    const selectedOption = selectBatch.options[selectBatch.selectedIndex];
    
    const timing = selectedOption.getAttribute('data-timing') || '';
    const maxPlayers = selectedOption.getAttribute('data-max-players') || '20';
    const status = selectedOption.getAttribute('data-status') || 'active';
    const coachId = selectedOption.getAttribute('data-coach-id') || '';
    
    const optionText = selectedOption.text;
    const batchName = optionText.split(' (')[0];
    
    document.getElementById('batchId').value = selectedBatchId;
    document.getElementById('batch_name').value = batchName;
    document.getElementById('timing').value = timing;
    document.getElementById('max_players').value = maxPlayers;
    document.getElementById('status').value = status;
    document.getElementById('modalTitle').innerText = 'Edit Batch';
    
    await loadCoachesForDropdown();
    
    setTimeout(() => {
        if (coachId && coachId !== '') {
            document.getElementById('coach_id').value = coachId;
        } else {
            document.getElementById('coach_id').value = '';
        }
    }, 100);
    
    showToast('Batch loaded for editing', 'info');
}

// Delete Batch
function deleteBatch(id) {
    showConfirmModal({
        title: 'Delete Batch',
        message: 'Are you sure you want to delete this batch?<br><small style="color: #ef4444;">Warning: This will affect players assigned to this batch!</small>',
        type: 'warning',
        onConfirm: async () => {
            try {
                const response = await fetch(`${API_URL}/batches/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${getToken()}` }
                });
                
                if (response.ok) {
                    showToast('Batch deleted successfully', 'success');
                    await loadBatches();
                    await loadBatchesForSelection();
                } else {
                    const data = await response.json();
                    showToast(data.message || 'Delete failed', 'error');
                }
            } catch (error) {
                showToast('Error deleting batch', 'error');
            }
        }
    });
}

// Save Batch
async function saveBatch(event) {
    if (event) event.preventDefault();
    
    const batchId = document.getElementById('batchId').value;
    const batch_name = document.getElementById('batch_name').value;
    const timing = document.getElementById('timing').value;
    let coach_id = document.getElementById('coach_id').value;
    const max_players = document.getElementById('max_players').value;
    const status = document.getElementById('status').value;
    
    if (!batch_name || !timing) {
        showToast('Please fill batch name and timing', 'error');
        return;
    }
    
    if (!coach_id || coach_id === '') {
        coach_id = null;
    }
    
    const batchData = { 
        batch_name: batch_name, 
        timing: timing, 
        coach_id: coach_id,
        max_players: parseInt(max_players) || 20,
        status: status 
    };
    
    try {
        let response;
        let url = `${API_URL}/batches`;
        let method = 'POST';
        
        if (batchId) {
            url = `${API_URL}/batches/${batchId}`;
            method = 'PUT';
        }
        
        response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            },
            body: JSON.stringify(batchData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showToast(batchId ? 'Batch updated successfully' : 'Batch added successfully', 'success');
            closeModal();
            await loadBatches();
            await loadBatchesForSelection();
        } else {
            showToast(data.message || 'Operation failed', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Error saving batch: ' + error.message, 'error');
    }
}

// Search batches
function searchBatches() {
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const rows = document.querySelectorAll('#batchesTableBody tr');
    
    rows.forEach(row => {
        const name = row.cells[1]?.textContent.toLowerCase() || '';
        const timing = row.cells[2]?.textContent.toLowerCase() || '';
        row.style.display = (name.includes(searchTerm) || timing.includes(searchTerm)) ? '' : 'none';
    });
}

// Close modal
function closeModal() {
    const modal = document.getElementById('batchModal');
    if (modal) {
        modal.style.display = 'none';
    }
    const form = document.getElementById('batchForm');
    if (form) {
        form.reset();
    }
    document.getElementById('batchId').value = '';
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    if (!getToken()) {
        window.location.href = '../../pages/Authentication/login.html';
        return;
    }
    
    loadBatches();
    loadBatchesForSelection();
    
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keyup', searchBatches);
    }
    
    const batchForm = document.getElementById('batchForm');
    if (batchForm) {
        batchForm.addEventListener('submit', saveBatch);
    }
    
    const selectBatch = document.getElementById('select_batch');
    if (selectBatch) {
        selectBatch.addEventListener('change', onBatchSelect);
    }
    
    window.onclick = function(event) {
        const modal = document.getElementById('batchModal');
        if (event.target === modal) closeModal();
    };
});