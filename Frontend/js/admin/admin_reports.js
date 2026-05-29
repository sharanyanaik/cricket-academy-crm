// ==================== ADMIN REPORTS PAGE ====================

function getToken() {
    return localStorage.getItem('token');
}

function showToast(message, type) {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed; bottom: 20px; right: 20px;
        background: ${type === 'error' ? '#ef4444' : '#10b981'};
        color: white; padding: 12px 20px; border-radius: 8px;
        z-index: 9999; font-size: 14px;
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// ==================== PRINT FUNCTION ====================
function printReport() {
    const modal = document.querySelector('#reportModal, #auditModal');
    if (modal) {
        const printContent = modal.cloneNode(true);
        printContent.style.position = 'fixed';
        printContent.style.top = '0';
        printContent.style.left = '0';
        printContent.style.width = '100%';
        printContent.style.height = '100%';
        printContent.style.background = 'white';
        printContent.style.zIndex = '9999';
        printContent.style.overflow = 'auto';
        printContent.style.padding = '20px';
        document.body.appendChild(printContent);
        window.print();
        document.body.removeChild(printContent);
    } else {
        window.print();
    }
}

// ==================== FINANCIAL REPORT ====================
async function loadFinancialReport() {
    try {
        const response = await fetch(`${API_URL}/reports/financial?period=month`, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            displayFinancialReport(data);
        } else {
            showToast('Failed to load financial report', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Error loading financial report', 'error');
    }
}

function displayFinancialReport(data) {
    const modalHtml = `
        <div id="reportModal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 2000; display: flex; justify-content: center; align-items: center;">
            <div style="background: white; border-radius: 12px; width: 80%; max-width: 900px; max-height: 80%; overflow: auto; padding: 20px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
                    <h3><i class="fa-solid fa-chart-line"></i> Financial Report</h3>
                    <button onclick="this.closest('#reportModal').remove()" style="background: none; border: none; font-size: 24px; cursor: pointer;">&times;</button>
                </div>
                
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 20px;">
                    <div style="background: #d1fae5; padding: 15px; border-radius: 10px;">
                        <h4>Total Collection</h4>
                        <p style="font-size: 24px; font-weight: bold;">₹${data.total_collection || 0}</p>
                    </div>
                    <div style="background: #fee2e2; padding: 15px; border-radius: 10px;">
                        <h4>Total Expenses</h4>
                        <p style="font-size: 24px; font-weight: bold;">₹${data.total_expenses || 0}</p>
                    </div>
                    <div style="background: #fef3c7; padding: 15px; border-radius: 10px;">
                        <h4>Pending Dues</h4>
                        <p style="font-size: 24px; font-weight: bold;">₹${data.pending_dues || 0}</p>
                    </div>
                    <div style="background: #dbeafe; padding: 15px; border-radius: 10px;">
                        <h4>Net Profit</h4>
                        <p style="font-size: 24px; font-weight: bold;">₹${data.net_profit || 0}</p>
                    </div>
                </div>
                
                <h4>Recent Payments</h4>
                <table class="table">
                    <thead><tr><th>Date</th><th>Player</th><th>Amount</th><th>Status</th></tr></thead>
                    <tbody>
                        ${(data.recent_payments || []).map(p => `
                            <tr>
                                <td>${new Date(p.payment_date).toLocaleDateString()}</td>
                                <td>${p.player_name || '-'}</td>
                                <td>₹${p.amount}</td>
                                <td><span class="badge ${p.status === 'completed' ? 'bg-success' : 'bg-warning'}">${p.status}</span></td>
                            </tr>
                        `).join('') || '<tr><td colspan="4">No recent payments</td></tr>'}
                    </tbody>
                </table>
                
                <button onclick="printReport()" style="background: #2563eb; color: white; padding: 10px 20px; border: none; border-radius: 5px; margin-top: 15px; cursor: pointer;">Print Report</button>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// ==================== ATTENDANCE REPORT ====================
async function loadAttendanceReport() {
    try {
        const response = await fetch(`${API_URL}/reports/attendance`, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            displayAttendanceReport(data);
        } else {
            showToast('Failed to load attendance report', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Error loading attendance report', 'error');
    }
}

function displayAttendanceReport(data) {
    const records = data || [];
    let tableHtml = '<table class="table"><thead><tr><th>Date</th><th>Player Name</th><th>Batch</th><th>Status</th></tr></thead><tbody>';
    
    records.forEach(record => {
        let statusClass = '';
        let statusText = record.status || '-';
        if (record.status === 'present') {
            statusClass = 'badge bg-success';
        } else if (record.status === 'late') {
            statusClass = 'badge bg-warning';
        } else if (record.status === 'absent') {
            statusClass = 'badge bg-danger';
        } else {
            statusClass = 'badge bg-secondary';
        }
        
        tableHtml += `
            <tr>
                <td>${record.attendance_date ? new Date(record.attendance_date).toLocaleDateString() : '-'}</td>
                <td>${record.player_name || '-'}</td>
                <td>${record.batch_name || 'Not Assigned'}</td>
                <td><span class="${statusClass}">${statusText}</span></td>
            </tr>
        `;
    });
    tableHtml += '</tbody></tr>';
    
    const modalHtml = `
        <div id="reportModal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 2000; display: flex; justify-content: center; align-items: center;">
            <div style="background: white; border-radius: 12px; width: 90%; max-width: 1000px; max-height: 80%; overflow: auto; padding: 20px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
                    <h3><i class="fa-solid fa-calendar-check"></i> Attendance Report</h3>
                    <button onclick="this.closest('#reportModal').remove()" style="background: none; border: none; font-size: 24px; cursor: pointer;">&times;</button>
                </div>
                ${records.length === 0 ? '<p>No attendance records found</p>' : tableHtml}
                <button onclick="printReport()" style="background: #2563eb; color: white; padding: 10px 20px; border: none; border-radius: 5px; margin-top: 15px; cursor: pointer;">Print Report</button>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// ==================== PERFORMANCE REPORT ====================
async function loadPerformanceReport() {
    try {
        const response = await fetch(`${API_URL}/reports/performance`, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            displayPerformanceReport(data);
        } else {
            showToast('Failed to load performance report', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Error loading performance report', 'error');
    }
}

function displayPerformanceReport(data) {
    const performance = data.performance || [];
    let tableHtml = '<table class="table"><thead><tr><th>Player Name</th><th>Total Days</th><th>Present Days</th><th>Attendance Rate</th><th>Runs</th><th>Wickets</th><th>Catches</th></tr></thead><tbody>';
    
    performance.forEach(p => {
        tableHtml += `
            <tr>
                <td>${p.player_name || '-'}</td>
                <td>${p.total_days || 0}</td>
                <td>${p.present_days || 0}</td>
                <td>${p.attendance_rate || 0}%</td>
                <td>${p.total_runs || 0}</td>
                <td>${p.total_wickets || 0}</td>
                <td>${p.total_catches || 0}</td>
            </tr>
        `;
    });
    tableHtml += '</tbody></table>';
    
    const modalHtml = `
        <div id="reportModal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 2000; display: flex; justify-content: center; align-items: center;">
            <div style="background: white; border-radius: 12px; width: 90%; max-width: 1000px; max-height: 80%; overflow: auto; padding: 20px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
                    <h3><i class="fa-solid fa-chart-simple"></i> Performance Report</h3>
                    <button onclick="this.closest('#reportModal').remove()" style="background: none; border: none; font-size: 24px; cursor: pointer;">&times;</button>
                </div>
                ${performance.length === 0 ? '<p>No performance data found</p>' : tableHtml}
                <button onclick="printReport()" style="background: #2563eb; color: white; padding: 10px 20px; border: none; border-radius: 5px; margin-top: 15px; cursor: pointer;">Print Report</button>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// ==================== AUDIT LOGS ====================
async function loadAuditLogs() {
    try {
        const response = await fetch(`${API_URL}/reports/audit-logs?limit=50`, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            displayAuditLogs(data);
        } else {
            showToast('Failed to load audit logs', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Error loading audit logs', 'error');
    }
}

function displayAuditLogs(data) {
    const logs = data || [];
    
    let tableHtml = `
        <table class="table">
            <thead>
                <tr>
                    <th>Timestamp</th>
                    <th>User</th>
                    <th>Role</th>
                    <th>Action</th>
                    <th>Details</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    logs.forEach(log => {
        let actionDisplay = log.action_type || '-';
        
        tableHtml += `
            <tr>
                <td>${log.created_at ? new Date(log.created_at).toLocaleString() : '-'}</td>
                <td>${log.user_name || 'System'}</td>
                <td>${log.user_role || '-'}</td>
                <td>${actionDisplay}</td>
                <td>${log.details || '-'}</td>
            </tr>
        `;
    });
    
    tableHtml += `
            </tbody>
        </table>
    `;
    
    const modalHtml = `
        <div id="auditModal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 2000; display: flex; justify-content: center; align-items: center;">
            <div style="background: white; border-radius: 12px; width: 95%; max-width: 1400px; max-height: 80%; overflow: auto; padding: 20px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
                    <h3><i class="fa-solid fa-history"></i> Audit Logs</h3>
                    <button onclick="this.closest('#auditModal').remove()" style="background: none; border: none; font-size: 24px; cursor: pointer;">&times;</button>
                </div>
                ${logs.length === 0 ? '<p>No audit logs found</p>' : tableHtml}
                <button onclick="printReport()" style="background: #2563eb; color: white; padding: 10px 20px; border: none; border-radius: 5px; margin-top: 15px; cursor: pointer;">
                    <i class="fa-solid fa-print"></i> Print Report
                </button>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// Load recent audit logs for dashboard
async function loadRecentAuditLogs() {
    try {
        const response = await fetch(`${API_URL}/reports/audit-logs?limit=10`, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        
        if (response.ok) {
            const logs = await response.json();
            const tbody = document.getElementById('auditLogsBody');
            
            if (tbody) {
                if (logs && logs.length > 0) {
                    tbody.innerHTML = logs.map(log => {
                        let actionDisplay = log.action_type || '-';
                        
                        return `
                            <tr>
                                <td>${log.created_at ? new Date(log.created_at).toLocaleString() : '-'}</td>
                                <td>${log.user_name || 'System'}</td>
                                <td>${actionDisplay}</td>
                                <td>${log.details || '-'}</td>
                            </tr>
                        `;
                    }).join('');
                } else {
                    tbody.innerHTML = '<tr><td colspan="4" class="text-center">No audit logs found</td></tr>';
                }
            }
        }
    } catch (error) {
        console.error('Error loading recent audit logs:', error);
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '../../pages/Authentication/login.html';
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    if (!getToken()) {
        window.location.href = '../../pages/Authentication/login.html';
        return;
    }
    
    // Display user info
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userNameElement = document.getElementById('userName');
    const userRoleElement = document.getElementById('userRole');
    if (userNameElement) userNameElement.textContent = user?.full_name || user?.name || 'Admin';
    if (userRoleElement) userRoleElement.textContent = user?.role || 'Admin';
    
    loadRecentAuditLogs();
});