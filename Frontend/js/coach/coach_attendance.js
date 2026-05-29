// ==================== COACH ATTENDANCE JS ====================

let currentBatchId = null;
let currentDate = null;
let attendanceData = [];

document.addEventListener('DOMContentLoaded', function() {
    console.log('Coach Attendance page loaded');
    
    if (!checkCoachAuth()) return;
    
    // Set default date to today
    setDefaultDate();
    
    // Load batches for the coach
    loadBatches();
    
    var logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            logout();
        });
    }
});

function setDefaultDate() {
    var today = new Date();
    var year = today.getFullYear();
    var month = String(today.getMonth() + 1).padStart(2, '0');
    var day = String(today.getDate()).padStart(2, '0');
    currentDate = year + '-' + month + '-' + day;
    
    var dateInput = document.getElementById('attendanceDate');
    if (dateInput) {
        dateInput.value = currentDate;
    }
    
    updateDateDisplay();
}

function updateDateDisplay() {
    var dateDisplay = document.getElementById('selectedDate');
    if (dateDisplay && currentDate) {
        var date = new Date(currentDate);
        dateDisplay.textContent = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    }
}

async function loadBatches() {
    try {
        var token = getToken();
        var response = await fetch(API_URL + '/coach/attendance/batches', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        
        if (response.ok) {
            var batches = await response.json();
            console.log('Batches loaded:', batches);
            var batchSelect = document.getElementById('batchSelect');
            
            if (batchSelect) {
                if (batches && batches.length > 0) {
                    var options = '<option value="">-- Select Batch --</option>';
                    for (var i = 0; i < batches.length; i++) {
                        options += '<option value="' + batches[i].id + '">' + (batches[i].batch_name || 'Batch') + ' (' + (batches[i].timing || 'No timing') + ')</option>';
                    }
                    batchSelect.innerHTML = options;
                    
                    batchSelect.addEventListener('change', function(e) {
                        currentBatchId = e.target.value;
                        if (currentBatchId) {
                            loadAttendance();
                        } else {
                            var tbody = document.getElementById('attendanceTableBody');
                            if (tbody) tbody.innerHTML = '<tr><td colspan="4" class="text-center">Select a batch to view players<\/td><\/tr>';
                        }
                    });
                } else {
                    batchSelect.innerHTML = '<option value="">No batches assigned</option>';
                }
            }
        } else if (response.status === 401 || response.status === 403) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '../../pages/Authentication/login.html';
        } else {
            var error = await response.json();
            showToast(error.message || 'Failed to load batches', 'error');
        }
    } catch (error) {
        console.error('Error loading batches:', error);
        showToast('Failed to load batches', 'error');
    }
}

async function loadAttendance() {
    if (!currentBatchId) {
        showToast('Please select a batch', 'error');
        return;
    }
    
    var dateInput = document.getElementById('attendanceDate');
    if (dateInput && dateInput.value) {
        currentDate = dateInput.value;
        updateDateDisplay();
    }
    
    try {
        var token = getToken();
        var url = API_URL + '/coach/attendance?date=' + currentDate + '&batch_id=' + currentBatchId;
        
        console.log('Fetching attendance from:', url);
        
        var response = await fetch(url, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        
        if (response.ok) {
            attendanceData = await response.json();
            console.log('Attendance data:', attendanceData);
            displayAttendance();
        } else {
            var error = await response.json();
            showToast(error.message || 'Failed to load attendance data', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Error loading attendance', 'error');
    }
}

function loadTodayAttendance() {
    setDefaultDate();
    if (currentBatchId) {
        loadAttendance();
    } else {
        showToast('Please select a batch first', 'error');
    }
}

function displayAttendance() {
    var tbody = document.getElementById('attendanceTableBody');
    if (!tbody) return;
    
    if (!attendanceData || attendanceData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center">No players found in this batch for selected date<\/td><\/tr>';
        return;
    }
    
    var html = '';
    for (var i = 0; i < attendanceData.length; i++) {
        var player = attendanceData[i];
        var status = player.status || 'absent';
        
        var statusBadge = '';
        if (status === 'present') statusBadge = '<span class="badge present">Present</span>';
        else if (status === 'late') statusBadge = '<span class="badge late">Late</span>';
        else statusBadge = '<span class="badge absent">Absent</span>';
        
        html += '<tr>';
        html += '<td><strong>' + escapeHtml(player.full_name || player.player_name) + '<\/strong><\/td>';
        html += '<td>' + (player.playing_role || 'Not specified') + '<\/td>';
        html += '<td>' + statusBadge + '<\/td>';
        html += '<td class="action-buttons">';
        html += '<button class="btn-present" onclick="markAttendance(' + player.player_id + ', \'present\')"><i class="fa-regular fa-circle-check"></i> Present<\/button>';
        html += '<button class="btn-absent" onclick="markAttendance(' + player.player_id + ', \'absent\')"><i class="fa-regular fa-circle-xmark"></i> Absent<\/button>';
        html += '<button class="btn-late" onclick="markAttendance(' + player.player_id + ', \'late\')"><i class="fa-regular fa-clock"></i> Late<\/button>';
        html += '<\/td>';
        html += '<\/tr>';
    }
    tbody.innerHTML = html;
}

async function markAttendance(playerId, status) {
    try {
        var token = getToken();
        
        console.log('Marking attendance:', { playerId, date: currentDate, status });
        
        var response = await fetch(API_URL + '/coach/attendance', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ 
                player_id: playerId, 
                date: currentDate, 
                status: status,
                remarks: ''
            })
        });
        
        if (response.ok) {
            var statusText = status === 'present' ? 'Present' : (status === 'late' ? 'Late' : 'Absent');
            showToast('Attendance marked as ' + statusText, 'success');
            await loadAttendance(); // Refresh the list
        } else {
            var data = await response.json();
            showToast(data.message || 'Failed to mark attendance', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Error marking attendance', 'error');
    }
}

function escapeHtml(text) {
    if (!text) return '';
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Make functions global
window.loadAttendance = loadAttendance;
window.loadTodayAttendance = loadTodayAttendance;
window.markAttendance = markAttendance;