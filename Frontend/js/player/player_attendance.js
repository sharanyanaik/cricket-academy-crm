// ==================== PLAYER ATTENDANCE JS ====================

let currentSearch = '';

document.addEventListener('DOMContentLoaded', () => {
    if (!checkPlayerAuth()) return;
    
    // Display player name in header card
    const user = getCurrentUser();
    const playerNameHeader = document.getElementById('playerNameHeader');
    if (playerNameHeader && user) {
        const nameSpan = playerNameHeader.querySelector('span');
        if (nameSpan) {
            nameSpan.textContent = user.name || user.full_name || 'Player';
        }
    }
    
    loadSummary();
    loadAttendance();
    
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keyup', function() {
            currentSearch = this.value;
            loadAttendance();
        });
    }
    
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            logout();
        });
    }
});
async function loadSummary() {
    try {
        const token = getToken();
        const response = await fetch(API_URL + '/player/attendance/summary', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        
        if (response.ok) {
            const summary = await response.json();
            console.log('Summary data:', summary);
            
            // Update all stat cards
            document.getElementById('totalDays').textContent = summary.totalDays || 0;
            document.getElementById('presentDays').textContent = summary.presentDays || 0;
            document.getElementById('absentDays').textContent = summary.absentDays || 0;
            
            // Add late days if the element exists
            const lateDaysElem = document.getElementById('lateDays');
            if (lateDaysElem) {
                lateDaysElem.textContent = summary.lateDays || 0;
            }
            
            const attendancePercent = summary.attendancePercent || 0;
            const attPercentElem = document.getElementById('attPercent');
            if (attPercentElem) {
                attPercentElem.textContent = attendancePercent + '%';
            }
            
            // Update progress bar
            const progressBar = document.getElementById('attendanceProgressBar');
            if (progressBar) {
                progressBar.style.width = attendancePercent + '%';
            }
        } else if (response.status === 401 || response.status === 403) {
            logout();
        }
    } catch (error) {
        console.error('Error loading summary:', error);
    }
}

async function loadAttendance() {
    const search = currentSearch || '';
    
    try {
        const token = getToken();
        const url = API_URL + '/player/attendance?search=' + encodeURIComponent(search);
        const response = await fetch(url, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        
        if (response.ok) {
            const data = await response.json();
            displayAttendance(data.attendance);
        } else if (response.status === 401 || response.status === 403) {
            logout();
        }
    } catch (error) {
        console.error('Error loading attendance:', error);
        const tbody = document.getElementById('attendanceBody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="3" class="text-center">Error loading records</td><\/tr>';
        }
    }
}

function displayAttendance(attendance) {
    const tbody = document.getElementById('attendanceBody');
    if (!tbody) return;
    
    if (!attendance || attendance.length === 0) {
        tbody.innerHTML = '</table><td colspan="3" class="text-center">No attendance records found</td><\/tr>';
        return;
    }
    
    tbody.innerHTML = '';
    for (let i = 0; i < attendance.length; i++) {
        const record = attendance[i];
        const row = tbody.insertRow();
        
        // Date
        row.insertCell(0).textContent = formatDate(record.date);
        
        // Status with badge
        let badgeClass = '';
        let statusText = '';
        if (record.status === 'present') {
            badgeClass = 'badge-present';
            statusText = 'Present';
        } else if (record.status === 'absent') {
            badgeClass = 'badge-absent';
            statusText = 'Absent';
        } else if (record.status === 'late') {
            badgeClass = 'badge-late';
            statusText = 'Late';
        } else {
            badgeClass = 'badge-absent';
            statusText = record.status || 'Absent';
        }
        row.insertCell(1).innerHTML = '<span class="badge ' + badgeClass + '">' + statusText + '</span>';
        
        // Remarks
        row.insertCell(2).textContent = record.remarks || '--';
    }
}

// Make functions global
window.loadAttendance = loadAttendance;