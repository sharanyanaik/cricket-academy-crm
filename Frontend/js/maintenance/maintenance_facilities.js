// ==================== MAINTENANCE FACILITIES JS ====================

let allFacilities = [];

document.addEventListener('DOMContentLoaded', function() {
    console.log('Maintenance Facilities loaded');
    
    if (!checkMaintenanceAuth()) return;
    
    loadFacilities();
    
    var logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            logout();
        });
    }
});

async function loadFacilities() {
    try {
        var token = getToken();
        var response = await fetch(API_URL + '/maintenance/facilities', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        
        if (response.ok) {
            allFacilities = await response.json();
            displayFacilities(allFacilities);
        } else if (response.status === 401 || response.status === 403) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '../../pages/Authentication/login.html';
        } else {
            showToast('Failed to load facilities', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Failed to load facilities', 'error');
    }
}

function displayFacilities(facilities) {
    var tbody = document.getElementById('facilitiesBody');
    if (!tbody) return;
    
    if (!facilities || facilities.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">No facilities found<\/td><\/tr>';
        return;
    }
    
    var html = '';
    for (var i = 0; i < facilities.length; i++) {
        var facility = facilities[i];
        
        var statusClass = '';
        var statusText = '';
        if (facility.status === 'good') {
            statusClass = 'good';
            statusText = 'Good';
        } else if (facility.status === 'warn' || facility.status === 'needs_repair') {
            statusClass = 'warn';
            statusText = 'Needs Repair';
        } else {
            statusClass = 'critical';
            statusText = 'Critical';
        }
        
        // Format dates for display
        function formatDisplayDate(dateString) {
            if (!dateString) return '-';
            var date = new Date(dateString);
            if (isNaN(date.getTime())) return '-';
            return date.toLocaleDateString('en-IN');
        }
        
        html += '<tr>';
        html += '<td>' + (facility.facility_name || '-') + '<\/td>';
        html += '<td>' + (facility.type || '-') + '<\/td>';
        html += '<td><span class="badge ' + statusClass + '">' + statusText + '<\/span><\/td>';
        html += '<td>' + formatDisplayDate(facility.last_maintenance) + '<\/td>';
        html += '<td>' + formatDisplayDate(facility.next_maintenance) + '<\/td>';
        html += '<td class="action-buttons">';
        html += '<button class="btn-small btn-edit" onclick="openEditModal(' + facility.id + ')"><i class="fa-solid fa-edit"></i> Edit<\/button>';
        html += '<button class="btn-small btn-delete" onclick="deleteFacility(' + facility.id + ')"><i class="fa-solid fa-trash"></i> Delete<\/button>';
        html += '<\/td>';
        html += '<\/tr>';
    }
    tbody.innerHTML = html;
}

function openAddFacilityModal() {
    var modalHtml = `
        <div id="facilityModal" class="modal" style="display: flex;">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Add Facility</h3>
                    <span class="close-btn" onclick="closeModal()">&times;</span>
                </div>
                <form id="facilityForm" onsubmit="return false;">
                    <div class="form-group">
                        <label>Facility Name *</label>
                        <input type="text" id="facility_name" class="form-control" required>
                    </div>
                    <div class="form-group">
                        <label>Type *</label>
                        <select id="type" class="form-control" required>
                            <option value="ground">Ground</option>
                            <option value="net">Net</option>
                            <option value="equipment">Equipment</option>
                            <option value="gym">Gym</option>
                            <option value="others">Others</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Status</label>
                        <select id="status" class="form-control">
                            <option value="good">Good</option>
                            <option value="needs_repair">Needs Repair</option>
                            <option value="under_maintenance">Under Maintenance</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Last Maintenance</label>
                        <input type="date" id="last_maintenance" class="form-control">
                    </div>
                    <div class="form-group">
                        <label>Next Maintenance</label>
                        <input type="date" id="next_maintenance" class="form-control">
                    </div>
                    <button type="button" class="btn-save" onclick="saveFacility()">Save Facility</button>
                </form>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function openEditModal(id) {
    var facility = allFacilities.find(function(f) { return f.id === id; });
    if (!facility) return;
    
    // Format dates properly for input[type="date"]
    function formatDateForInput(dateString) {
        if (!dateString) return '';
        // Check if it's already in YYYY-MM-DD format
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
            return dateString;
        }
        // Convert ISO format to YYYY-MM-DD
        var date = new Date(dateString);
        if (isNaN(date.getTime())) return '';
        var year = date.getFullYear();
        var month = String(date.getMonth() + 1).padStart(2, '0');
        var day = String(date.getDate()).padStart(2, '0');
        return year + '-' + month + '-' + day;
    }
    
    var lastMaintenanceFormatted = formatDateForInput(facility.last_maintenance);
    var nextMaintenanceFormatted = formatDateForInput(facility.next_maintenance);
    
    var modalHtml = `
        <div id="facilityModal" class="modal" style="display: flex;">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Edit Facility</h3>
                    <span class="close-btn" onclick="closeModal()">&times;</span>
                </div>
                <form id="facilityForm" onsubmit="return false;">
                    <input type="hidden" id="facilityId" value="${facility.id}">
                    <div class="form-group">
                        <label>Facility Name *</label>
                        <input type="text" id="facility_name" class="form-control" value="${escapeHtml(facility.facility_name || '')}" required>
                    </div>
                    <div class="form-group">
                        <label>Type *</label>
                        <select id="type" class="form-control" required>
                            <option value="ground" ${facility.type === 'ground' ? 'selected' : ''}>Ground</option>
                            <option value="net" ${facility.type === 'net' ? 'selected' : ''}>Net</option>
                            <option value="equipment" ${facility.type === 'equipment' ? 'selected' : ''}>Equipment</option>
                            <option value="gym" ${facility.type === 'gym' ? 'selected' : ''}>Gym</option>
                            <option value="others" ${facility.type === 'others' ? 'selected' : ''}>Others</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Status</label>
                        <select id="status" class="form-control">
                            <option value="good" ${facility.status === 'good' ? 'selected' : ''}>Good</option>
                            <option value="needs_repair" ${facility.status === 'needs_repair' ? 'selected' : ''}>Needs Repair</option>
                            <option value="under_maintenance" ${facility.status === 'under_maintenance' ? 'selected' : ''}>Under Maintenance</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Last Maintenance</label>
                        <input type="date" id="last_maintenance" class="form-control" value="${lastMaintenanceFormatted}">
                    </div>
                    <div class="form-group">
                        <label>Next Maintenance</label>
                        <input type="date" id="next_maintenance" class="form-control" value="${nextMaintenanceFormatted}">
                    </div>
                    <button type="button" class="btn-save" onclick="updateFacility()">Update Facility</button>
                </form>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

async function saveFacility() {
    var name = document.getElementById('facility_name')?.value;
    var type = document.getElementById('type')?.value;
    var status = document.getElementById('status')?.value;
    var last_maintenance = document.getElementById('last_maintenance')?.value || null;
    var next_maintenance = document.getElementById('next_maintenance')?.value || null;
    
    if (!name || !type) {
        showToast('Name and type are required', 'error');
        return;
    }
    
    try {
        var token = getToken();
        var response = await fetch(API_URL + '/maintenance/facilities', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ 
                facility_name: name, 
                type: type, 
                status: status, 
                last_maintenance: last_maintenance, 
                next_maintenance: next_maintenance 
            })
        });
        
        if (response.ok) {
            showToast('Facility added successfully', 'success');
            closeModal();
            loadFacilities();
        } else {
            var data = await response.json();
            showToast(data.message || 'Failed to add facility', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Error adding facility', 'error');
    }
}

async function updateFacility() {
    var id = document.getElementById('facilityId')?.value;
    var name = document.getElementById('facility_name')?.value;
    var type = document.getElementById('type')?.value;
    var status = document.getElementById('status')?.value;
    var last_maintenance = document.getElementById('last_maintenance')?.value || null;
    var next_maintenance = document.getElementById('next_maintenance')?.value || null;
    
    if (!name || !type) {
        showToast('Name and type are required', 'error');
        return;
    }
    
    try {
        var token = getToken();
        var response = await fetch(API_URL + '/maintenance/facilities/' + id, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ 
                facility_name: name, 
                type: type, 
                status: status, 
                last_maintenance: last_maintenance, 
                next_maintenance: next_maintenance 
            })
        });
        
        if (response.ok) {
            showToast('Facility updated successfully', 'success');
            closeModal();
            loadFacilities();
        } else {
            var data = await response.json();
            showToast(data.message || 'Failed to update facility', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Error updating facility', 'error');
    }
}

async function deleteFacility(id) {
    // First, get facility name for better error message
    var facility = allFacilities.find(function(f) { return f.id === id; });
    var facilityName = facility ? facility.facility_name : 'this facility';
    
    showConfirmModal({
        title: 'Delete Facility',
        message: `Are you sure you want to delete "${facilityName}"?<br><small style="color: #ef4444;">Warning: This will also delete all related issues and maintenance records!</small>`,
        type: 'warning',
        onConfirm: async function() {
            try {
                var token = getToken();
                var response = await fetch(API_URL + '/maintenance/facilities/' + id, {
                    method: 'DELETE',
                    headers: { 
                        'Authorization': 'Bearer ' + token,
                        'Content-Type': 'application/json'
                    }
                });
                
                var data = await response.json();
                
                if (response.ok) {
                    showToast('Facility deleted successfully', 'success');
                    loadFacilities();
                } else {
                    // Show the actual error message from server
                    showToast(data.message || 'Failed to delete facility', 'error');
                    console.error('Delete error:', data);
                }
            } catch (error) {
                console.error('Error:', error);
                showToast('Error deleting facility: ' + error.message, 'error');
            }
        }
    });
}

function closeModal() {
    var modal = document.getElementById('facilityModal');
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
window.openAddFacilityModal = openAddFacilityModal;
window.openEditModal = openEditModal;
window.saveFacility = saveFacility;
window.updateFacility = updateFacility;
window.deleteFacility = deleteFacility;
window.closeModal = closeModal;