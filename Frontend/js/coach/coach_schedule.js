// ==================== COACH SCHEDULE JS ====================

let allSchedules = [];
let coachBatches = [];

document.addEventListener('DOMContentLoaded', function() {
    console.log('Coach Schedule page loaded');
    
    if (!checkCoachAuth()) return;
    
    loadBatches();
    loadSchedule();
    
    var logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            logout();
        });
    }
});

async function loadBatches() {
    try {
        var token = getToken();
        var response = await fetch(API_URL + '/coach/batches', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        
        if (response.ok) {
            coachBatches = await response.json();
            console.log('Batches loaded:', coachBatches.length);
            
            var batchSelect = document.getElementById('batch_id');
            if (batchSelect) {
                var options = '<option value="">Select Batch</option>';
                for (var i = 0; i < coachBatches.length; i++) {
                    options += '<option value="' + coachBatches[i].id + '">' + coachBatches[i].batch_name + ' (' + (coachBatches[i].timing || 'No timing') + ')</option>';
                }
                batchSelect.innerHTML = options;
            }
        }
    } catch (error) {
        console.error('Error loading batches:', error);
        showToast('Failed to load batches', 'error');
    }
}

async function loadSchedule() {
    try {
        var token = getToken();
        var response = await fetch(API_URL + '/coach/schedule', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        
        if (response.ok) {
            allSchedules = await response.json();
            console.log('Schedules loaded:', allSchedules.length);
            displayAllSchedules();
        } else {
            showToast('Failed to load schedule', 'error');
        }
    } catch (error) {
        console.error('Error loading schedules:', error);
        showToast('Failed to load schedule', 'error');
    }
}

// SIMPLE DISPLAY - Show all schedules in one table with proper formatting
function displayAllSchedules() {
    var tbody = document.getElementById('allSchedulesTableBody');
    if (!tbody) {
        console.log('Table body not found');
        return;
    }
    
    if (!allSchedules || allSchedules.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="empty-state"><i class="fa-solid fa-calendar-day"></i><br>No schedules found. Click "Add Session" to create one.</td></tr>';
        return;
    }
    
    // Sort schedules by date (latest first)
    var sortedSchedules = [...allSchedules].sort((a, b) => new Date(b.schedule_date) - new Date(a.schedule_date));
    
    var html = '';
    for (var i = 0; i < sortedSchedules.length; i++) {
        var s = sortedSchedules[i];
        
        // Find batch name
        var batchName = 'Unknown';
        for (var j = 0; j < coachBatches.length; j++) {
            if (coachBatches[j].id === s.batch_id) {
                batchName = coachBatches[j].batch_name;
                break;
            }
        }
        
        var status = getScheduleStatus(s.schedule_date);
        var statusClass = getStatusBadgeClass(status);
        
        // Format time properly
        var startTimeFormatted = s.start_time ? s.start_time.substring(0, 5) : '--';
        var endTimeFormatted = s.end_time ? s.end_time.substring(0, 5) : '--';
        
        html += '<tr>';
        html += '<td style="white-space: nowrap;">' + formatDate(s.schedule_date) + '</td>';
        html += '<td>' + escapeHtml(batchName) + '</td>';
        html += '<td>' + escapeHtml(s.activity_type || 'Practice') + '</td>';
        html += '<td style="white-space: nowrap;">' + startTimeFormatted + ' - ' + endTimeFormatted + '</td>';
        html += '<td>' + escapeHtml(s.location || 'Main Ground') + '</td>';
        html += '<td>' + escapeHtml(s.description || '-') + '</td>';
        html += '<td><span class="' + statusClass + '">' + status + '</span></td>';
        html += '<td class="action-buttons" style="white-space: nowrap;">';
        html += '<button class="btn-sm btn-warning" onclick="editSchedule(' + s.id + ')" title="Edit"><i class="fa-solid fa-edit"></i></button>';
        html += '<button class="btn-sm btn-danger" onclick="deleteSchedule(' + s.id + ')" title="Delete"><i class="fa-solid fa-trash"></i></button>';
        html += '</td>';
        html += '</tr>';
    }
    tbody.innerHTML = html;
}

// Helper function to escape HTML special characters
function escapeHtml(text) {
    if (!text) return '-';
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getScheduleStatus(scheduleDate) {
    var today = new Date();
    var schedule = new Date(scheduleDate);
    today.setHours(0, 0, 0, 0);
    schedule.setHours(0, 0, 0, 0);
    
    if (schedule < today) return 'Completed';
    if (schedule.getTime() === today.getTime()) return 'Today';
    return 'Upcoming';
}

function getStatusBadgeClass(status) {
    if (status === 'Completed') return 'badge-completed';
    if (status === 'Today') return 'badge-today';
    return 'badge-upcoming';
}

function formatDate(dateString) {
    if (!dateString) return '-';
    var date = new Date(dateString);
    return date.toLocaleDateString('en-IN');
}

function openAddScheduleModal() {
    document.getElementById('modalTitle').innerHTML = '<i class="fa-solid fa-calendar-plus"></i> Add Schedule';
    document.getElementById('scheduleId').value = '';
    document.getElementById('schedule_date').value = new Date().toISOString().split('T')[0];
    document.getElementById('start_time').value = '07:00';
    document.getElementById('end_time').value = '08:30';
    document.getElementById('activity_type').value = 'Practice';
    document.getElementById('description').value = '';
    document.getElementById('location').value = 'Main Ground';
    document.getElementById('batch_id').value = '';
    
    var modal = document.getElementById('scheduleModal');
    if (modal) modal.style.display = 'flex';
}

function addScheduleForDay(dateStr) {
    document.getElementById('modalTitle').innerHTML = '<i class="fa-solid fa-calendar-plus"></i> Add Schedule';
    document.getElementById('scheduleId').value = '';
    document.getElementById('schedule_date').value = dateStr;
    document.getElementById('start_time').value = '07:00';
    document.getElementById('end_time').value = '08:30';
    document.getElementById('activity_type').value = 'Practice';
    document.getElementById('description').value = '';
    document.getElementById('location').value = 'Main Ground';
    document.getElementById('batch_id').value = '';
    
    var modal = document.getElementById('scheduleModal');
    if (modal) modal.style.display = 'flex';
}

async function editSchedule(id) {
    try {
        var token = getToken();
        var response = await fetch(API_URL + '/coach/schedule/' + id, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        
        if (response.ok) {
            var schedule = await response.json();
            
            document.getElementById('modalTitle').innerHTML = '<i class="fa-solid fa-pen"></i> Edit Schedule';
            document.getElementById('scheduleId').value = schedule.id;
            document.getElementById('batch_id').value = schedule.batch_id;
            document.getElementById('schedule_date').value = schedule.schedule_date ? schedule.schedule_date.split('T')[0] : '';
            document.getElementById('start_time').value = schedule.start_time ? schedule.start_time.substring(0, 5) : '';
            document.getElementById('end_time').value = schedule.end_time ? schedule.end_time.substring(0, 5) : '';
            document.getElementById('activity_type').value = schedule.activity_type || 'Practice';
            document.getElementById('description').value = schedule.description || '';
            document.getElementById('location').value = schedule.location || 'Main Ground';
            
            var modal = document.getElementById('scheduleModal');
            if (modal) modal.style.display = 'flex';
        } else {
            showToast('Failed to load schedule', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Error loading schedule', 'error');
    }
}

async function saveSchedule() {
    var scheduleId = document.getElementById('scheduleId').value;
    var batch_id = document.getElementById('batch_id').value;
    var schedule_date = document.getElementById('schedule_date').value;
    var start_time = document.getElementById('start_time').value;
    var end_time = document.getElementById('end_time').value;
    var activity_type = document.getElementById('activity_type').value;
    var description = document.getElementById('description').value;
    var location = document.getElementById('location').value;
    
    if (!batch_id) {
        showToast('Please select a batch', 'error');
        return;
    }
    
    if (!schedule_date) {
        showToast('Please select schedule date', 'error');
        return;
    }
    
    var scheduleData = {
        batch_id: parseInt(batch_id),
        schedule_date: schedule_date,
        start_time: start_time,
        end_time: end_time,
        activity_type: activity_type,
        description: description,
        location: location
    };
    
    var saveBtn = document.querySelector('#scheduleModal .btn-save');
    var originalText = saveBtn.innerHTML;
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
    
    try {
        var token = getToken();
        var url = API_URL + '/coach/schedule';
        var method = 'POST';
        
        if (scheduleId) {
            url = API_URL + '/coach/schedule/' + scheduleId;
            method = 'PUT';
        }
        
        var response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify(scheduleData)
        });
        
        var data = await response.json();
        
        if (response.ok) {
            showToast(scheduleId ? 'Schedule updated!' : 'Schedule added!', 'success');
            closeModal();
            await loadSchedule(); // Refresh the display
        } else {
            showToast(data.message || 'Failed to save', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Error saving schedule', 'error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalText;
    }
}

async function deleteSchedule(id) {
    if (confirm('Are you sure you want to delete this schedule?')) {
        try {
            var token = getToken();
            var response = await fetch(API_URL + '/coach/schedule/' + id, {
                method: 'DELETE',
                headers: { 'Authorization': 'Bearer ' + token }
            });
            
            if (response.ok) {
                showToast('Schedule deleted successfully!', 'success');
                loadSchedule();
            } else {
                showToast('Failed to delete schedule', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showToast('Error deleting schedule', 'error');
        }
    }
}

function closeModal() {
    var modal = document.getElementById('scheduleModal');
    if (modal) modal.style.display = 'none';
}

function refreshData() {
    loadSchedule();
}

// Make functions global
window.openAddScheduleModal = openAddScheduleModal;
window.addScheduleForDay = addScheduleForDay;
window.editSchedule = editSchedule;
window.saveSchedule = saveSchedule;
window.deleteSchedule = deleteSchedule;
window.closeModal = closeModal;
window.refreshData = refreshData;