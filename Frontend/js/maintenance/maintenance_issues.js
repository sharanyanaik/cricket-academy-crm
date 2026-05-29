// ==================== MAINTENANCE ISSUES JS ====================

let allIssues = [];
let allFacilities = [];

document.addEventListener('DOMContentLoaded', function() {
    console.log('Maintenance Issues loaded');
    
    if (!checkMaintenanceAuth()) return;
    
    loadFacilities();
    loadIssues();
    
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
        }
    } catch (error) {
        console.error('Error loading facilities:', error);
    }
}

async function loadIssues() {
    try {
        var token = getToken();
        var response = await fetch(API_URL + '/maintenance/issues', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        
        if (response.ok) {
            allIssues = await response.json();
            displayIssues(allIssues);
        } else {
            showToast('Failed to load issues', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Failed to load issues', 'error');
    }
}

function displayIssues(issues) {
    var tbody = document.getElementById('issuesBody');
    if (!tbody) return;
    
    if (!issues || issues.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">No issues found<\/td><\/tr>';
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
            statusClass = 'in_progress';
            statusText = 'In Progress';
        } else if (issue.status === 'resolved') {
            statusClass = 'completed';
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
        html += '<td class="action-buttons">';
        html += '<button class="btn-small btn-edit" onclick="openEditModal(' + issue.id + ')">Edit<\/button>';
        html += '<button class="btn-small btn-delete" onclick="deleteIssue(' + issue.id + ')">Delete<\/button>';
        html += '<\/td>';
        html += '<\/tr>';
    }
    tbody.innerHTML = html;
}

function openAddIssueModal() {
    // Get unique facilities by name (remove duplicates)
    var uniqueFacilities = [];
    var seenNames = {};
    
    for (var i = 0; i < allFacilities.length; i++) {
        var facility = allFacilities[i];
        var name = facility.facility_name || facility.name;
        if (!seenNames[name]) {
            seenNames[name] = true;
            uniqueFacilities.push(facility);
        }
    }
    
    var facilityOptions = '';
    for (var i = 0; i < uniqueFacilities.length; i++) {
        facilityOptions += '<option value="' + uniqueFacilities[i].id + '">' + escapeHtml(uniqueFacilities[i].facility_name || uniqueFacilities[i].name) + '</option>';
    }
    
    var modalHtml = `
        <div id="issueModal" class="modal" style="display: flex;">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Report Issue</h3>
                    <span class="close-btn" onclick="closeModal()">&times;</span>
                </div>
                <form id="issueForm" onsubmit="return false;">
                    <div class="form-group">
                        <label>Facility *</label>
                        <select id="facility_id" class="form-control" required>
                            <option value="">Select Facility</option>
                            ${facilityOptions}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Issue Title *</label>
                        <input type="text" id="issue_title" class="form-control" required>
                    </div>
                    <div class="form-group">
                        <label>Description</label>
                        <textarea id="description" class="form-control" rows="3"></textarea>
                    </div>
                    <div class="form-group">
                        <label>Priority</label>
                        <select id="priority" class="form-control">
                            <option value="low">Low</option>
                            <option value="medium" selected>Medium</option>
                            <option value="high">High</option>
                        </select>
                    </div>
                    <button type="button" class="btn-save" onclick="saveIssue()">Report Issue</button>
                </form>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function openEditModal(id) {
    var issue = null;
    for (var i = 0; i < allIssues.length; i++) {
        if (allIssues[i].id === id) {
            issue = allIssues[i];
            break;
        }
    }
    if (!issue) return;
    
    var modalHtml = `
        <div id="issueModal" class="modal" style="display: flex;">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Update Issue</h3>
                    <span class="close-btn" onclick="closeModal()">&times;</span>
                </div>
                <form id="issueForm" onsubmit="return false;">
                    <input type="hidden" id="issueId" value="${issue.id}">
                    <div class="form-group">
                        <label>Facility</label>
                        <input type="text" class="form-control" value="${issue.facility_name || '-'}" readonly disabled>
                    </div>
                    <div class="form-group">
                        <label>Issue Title</label>
                        <input type="text" class="form-control" value="${escapeHtml(issue.issue_title || '')}" readonly disabled>
                    </div>
                    <div class="form-group">
                        <label>Status</label>
                        <select id="status" class="form-control">
                            <option value="open" ${issue.status === 'open' ? 'selected' : ''}>Open</option>
                            <option value="in_progress" ${issue.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
                            <option value="resolved" ${issue.status === 'resolved' ? 'selected' : ''}>Resolved</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Cost (₹)</label>
                        <input type="number" id="cost" class="form-control" value="${issue.cost || 0}">
                    </div>
                    <div class="form-group">
                        <label>Resolution Notes</label>
                        <textarea id="remarks" class="form-control" rows="3"></textarea>
                    </div>
                    <button type="button" class="btn-save" onclick="updateIssue()">Update Issue</button>
                </form>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

async function saveIssue() {
    var facility_id = document.getElementById('facility_id')?.value;
    var issue_title = document.getElementById('issue_title')?.value;
    var description = document.getElementById('description')?.value || null;
    var priority = document.getElementById('priority')?.value || 'medium';
    
    if (!facility_id || !issue_title) {
        showToast('Please select facility and enter issue title', 'error');
        return;
    }
    
    try {
        var token = getToken();
        var response = await fetch(API_URL + '/maintenance/issues', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ 
                facility_id: parseInt(facility_id), 
                issue_title: issue_title, 
                description: description, 
                priority: priority
            })
        });
        
        if (response.ok) {
            showToast('Issue reported successfully', 'success');
            closeModal();
            loadIssues();
        } else {
            var data = await response.json();
            showToast(data.message || 'Failed to report issue', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Error reporting issue', 'error');
    }
}

async function updateIssue() {
    var id = document.getElementById('issueId')?.value;
    var status = document.getElementById('status')?.value;
    var cost = document.getElementById('cost')?.value || 0;
    var remarks = document.getElementById('remarks')?.value || '';
    
    try {
        var token = getToken();
        var response = await fetch(API_URL + '/maintenance/issues/' + id, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ 
                status: status, 
                cost: cost, 
                remarks: remarks
            })
        });
        
        if (response.ok) {
            showToast('Issue updated successfully', 'success');
            closeModal();
            loadIssues();
        } else {
            var data = await response.json();
            showToast(data.message || 'Failed to update issue', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Error updating issue', 'error');
    }
}

async function deleteIssue(id) {
    if (confirm('Are you sure you want to delete this issue?')) {
        try {
            var token = getToken();
            var response = await fetch(API_URL + '/maintenance/issues/' + id, {
                method: 'DELETE',
                headers: { 'Authorization': 'Bearer ' + token }
            });
            
            if (response.ok) {
                showToast('Issue deleted successfully', 'success');
                loadIssues();
            } else {
                showToast('Failed to delete issue', 'error');
            }
        } catch (error) {
            showToast('Error deleting issue', 'error');
        }
    }
}

function escapeHtml(text) {
    if (!text) return '';
    return text.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

function closeModal() {
    var modal = document.getElementById('issueModal');
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
    .form-group input, .form-group select, .form-group textarea {
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
window.openAddIssueModal = openAddIssueModal;
window.openEditModal = openEditModal;
window.saveIssue = saveIssue;
window.updateIssue = updateIssue;
window.deleteIssue = deleteIssue;
window.closeModal = closeModal;