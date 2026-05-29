// ==================== MAINTENANCE DASHBOARD JS ====================

document.addEventListener('DOMContentLoaded', function() {
    console.log('Maintenance Dashboard loaded');
    
    if (!checkMaintenanceAuth()) return;
    
    loadDashboardData();
    
    var logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            logout();
        });
    }
});

async function loadDashboardData() {
    try {
        var token = getToken();
        var response = await fetch(API_URL + '/maintenance/dashboard', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        
        if (response.ok) {
            var data = await response.json();
            updateStats(data);
            displayRecentIssues(data.recentIssues);
        } else if (response.status === 401 || response.status === 403) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '../../pages/Authentication/login.html';
        } else {
            showToast('Failed to load dashboard data', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Failed to load dashboard data', 'error');
    }
}

function updateStats(data) {
    var totalFacilitiesElem = document.getElementById('totalFacilities');
    if (totalFacilitiesElem) totalFacilitiesElem.textContent = data.totalFacilities || 0;
    
    var openIssuesElem = document.getElementById('openIssues');
    if (openIssuesElem) openIssuesElem.textContent = data.openIssues || 0;
    
    var resolvedThisMonthElem = document.getElementById('resolvedThisMonth');
    if (resolvedThisMonthElem) resolvedThisMonthElem.textContent = data.resolvedThisMonth || 0;
    
    var totalCostElem = document.getElementById('totalCost');
    if (totalCostElem) totalCostElem.textContent = formatCurrency(data.totalCost || 0);
}

function displayRecentIssues(issues) {
    var tbody = document.getElementById('recentIssuesBody');
    if (!tbody) return;
    
    if (!issues || issues.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center">No recent issues<\/td><\/tr>';
        return;
    }
    
    var html = '';
    for (var i = 0; i < issues.length; i++) {
        var issue = issues[i];
        
        var priorityClass = '';
        var priorityText = '';
        if (issue.priority === 'high') {
            priorityClass = 'high';
            priorityText = 'High';
        } else if (issue.priority === 'medium') {
            priorityClass = 'medium';
            priorityText = 'Medium';
        } else {
            priorityClass = 'low';
            priorityText = 'Low';
        }
        
        var statusClass = '';
        var statusText = '';
        if (issue.status === 'open') {
            statusClass = 'open';
            statusText = 'Open';
        } else if (issue.status === 'in_progress') {
            statusClass = 'progress';
            statusText = 'In Progress';
        } else if (issue.status === 'resolved') {
            statusClass = 'done';
            statusText = 'Resolved';
        } else {
            statusClass = 'open';
            statusText = issue.status || 'Open';
        }
        
        html += '<tr>';
        html += '<td>' + (issue.facility_name || '-') + '<\/td>';
        html += '<td>' + (issue.issue_title || '-') + '<\/td>';
        html += '<td><span class="badge ' + priorityClass + '">' + priorityText + '<\/span><\/td>';
        html += '<td><span class="badge ' + statusClass + '">' + statusText + '<\/span><\/td>';
        html += '<\/tr>';
    }
    tbody.innerHTML = html;
}

async function refreshData() {
    showToast('Refreshing data...', 'info');
    await loadDashboardData();
    showToast('Data refreshed!', 'success');
}

// Make functions global
window.refreshData = refreshData;