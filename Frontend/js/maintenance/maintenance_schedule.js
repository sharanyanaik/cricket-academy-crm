// ==================== MAINTENANCE SCHEDULE JS ====================

let allSchedules = [];
let allFacilities = [];
let allStaff = [];

document.addEventListener('DOMContentLoaded', function() {
    console.log('Maintenance Schedule loaded');
    
    if (!checkMaintenanceAuth()) return;
    
    loadFacilities();
    loadStaff();
    loadSchedules();
    
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
        var response = await fetch(API_URL + '/maintenance/schedule/facilities', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        
        if (response.ok) {
            allFacilities = await response.json();
            populateFacilitySelect();
        } else {
            console.error('Failed to load facilities:', response.status);
        }
    } catch (error) {
        console.error('Error loading facilities:', error);
    }
}

async function loadStaff() {
    try {
        var token = getToken();
        // Change this URL to use the schedule endpoint
        var response = await fetch(API_URL + '/maintenance/schedule/staff', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        
        if (response.ok) {
            allStaff = await response.json();
            console.log('Staff loaded:', allStaff);
            populateStaffSelect();
        } else {
            console.error('Failed to load staff:', response.status);
            var select = document.getElementById('assignedSelect');
            if (select) {
                select.innerHTML = '<option value="">No staff available</option>';
            }
        }
    } catch (error) {
        console.error('Error loading staff:', error);
        var select = document.getElementById('assignedSelect');
        if (select) {
            select.innerHTML = '<option value="">Error loading staff</option>';
        }
    }
}

function populateFacilitySelect() {
    var select = document.getElementById('facilitySelect');
    if (!select) return;
    
    select.innerHTML = '<option value="">Select Facility</option>';
    for (var i = 0; i < allFacilities.length; i++) {
        var facility = allFacilities[i];
        select.innerHTML += '<option value="' + facility.id + '">' + (facility.facility_name || facility.name) + '</option>';
    }
}

function populateStaffSelect() {
    var select = document.getElementById('assignedSelect');
    if (!select) return;
    
    select.innerHTML = '<option value="">Select Staff</option>';
    
    if (!allStaff || allStaff.length === 0) {
        select.innerHTML = '<option value="">No staff available</option>';
        return;
    }
    
    for (var i = 0; i < allStaff.length; i++) {
        var staff = allStaff[i];
        var displayName = staff.full_name;
        if (staff.specialization && staff.specialization !== 'General') {
            displayName += ' (' + staff.specialization + ')';
        }
        select.innerHTML += '<option value="' + staff.id + '">' + displayName + '</option>';
    }
    
    console.log('Staff dropdown populated with', allStaff.length, 'staff members');
}

async function loadSchedules() {
    try {
        var token = getToken();
        var response = await fetch(API_URL + '/maintenance/schedule/upcoming', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        
        if (response.ok) {
            allSchedules = await response.json();
            displaySchedules(allSchedules);
        } else {
            showToast('Failed to load schedules', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Failed to load schedules', 'error');
    }
}

function displaySchedules(schedules) {
    var tbody = document.getElementById('scheduleBody');
    if (!tbody) return;
    
    if (!schedules || schedules.length === 0) {
        tbody.innerHTML = '<table><td colspan="5" class="text-center">No schedules found</td><\/tr>';
        return;
    }
    
    var html = '';
    for (var i = 0; i < schedules.length; i++) {
        var schedule = schedules[i];
        
        var statusClass = '';
        var statusText = '';
        if (schedule.status === 'scheduled') {
            statusClass = 'pending';
            statusText = 'Scheduled';
        } else if (schedule.status === 'in_progress') {
            statusClass = 'progress';
            statusText = 'In Progress';
        } else if (schedule.status === 'completed') {
            statusClass = 'done';
            statusText = 'Completed';
        } else {
            statusClass = 'pending';
            statusText = schedule.status || 'Scheduled';
        }
        
        // Get assigned staff name
        var assignedName = 'Unassigned';
        if (schedule.assigned_to && allStaff.length > 0) {
            var staff = allStaff.find(function(s) { return s.id == schedule.assigned_to; });
            if (staff) assignedName = staff.full_name;
        }
        
        html += '<tr>';
        html += '<td>' + (schedule.facility_name || '-') + '<\/td>';
        html += '<td>' + (schedule.task_description || '-') + '<\/td>';
        html += '<td>' + formatDate(schedule.schedule_date) + '<\/td>';
        html += '<td>' + assignedName + '<\/td>';
        html += '<td><span class="' + statusClass + '">' + statusText + '<\/span><\/td>';
        html += '<\/tr>';
    }
    tbody.innerHTML = html;
}

function showAddScheduleModal() {
    // Reset form fields
    document.getElementById('facilitySelect').value = '';
    document.getElementById('taskInput').value = '';
    document.getElementById('dateInput').value = '';
    
    // Reset staff dropdown
    populateStaffSelect();
    
    // Set default date to today
    var today = new Date().toISOString().split('T')[0];
    document.getElementById('dateInput').value = today;
    
    // Show modal
    document.getElementById('scheduleModal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('scheduleModal').style.display = 'none';
}

async function saveSchedule() {
    var facilityId = document.getElementById('facilitySelect')?.value;
    var task = document.getElementById('taskInput')?.value;
    var scheduleDate = document.getElementById('dateInput')?.value;
    var assignedTo = document.getElementById('assignedSelect')?.value;
    
    // Validation
    if (!facilityId) {
        showToast('Please select a facility', 'error');
        return;
    }
    
    if (!task) {
        showToast('Please enter task description', 'error');
        return;
    }
    
    if (!scheduleDate) {
        showToast('Please select schedule date', 'error');
        return;
    }
    
    try {
        var token = getToken();
        var response = await fetch(API_URL + '/maintenance/schedule', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({
                facility_id: parseInt(facilityId),
                task_description: task,
                schedule_date: scheduleDate,
                assigned_to: assignedTo || null
            })
        });
        
        var data = await response.json();
        
        if (response.ok) {
            showToast('Schedule added successfully', 'success');
            closeModal();
            loadSchedules(); // Refresh the table
        } else {
            showToast(data.message || 'Failed to add schedule', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Error adding schedule', 'error');
    }
}

function formatDate(dateString) {
    if (!dateString) return '-';
    var date = new Date(dateString);
    return date.toLocaleDateString('en-IN');
}

// Make functions global
window.showAddScheduleModal = showAddScheduleModal;
window.closeModal = closeModal;
window.saveSchedule = saveSchedule;