// ============ GET TOKEN AND USER ============
// These functions are already in admin_common.js, so we just use them
const token = getToken();
const user = getCurrentUser();

// ============ CHECK AUTHENTICATION ============
if (!token) {
    showToast('Please login to continue', 'info');
    setTimeout(() => {
        window.location.href = '../../pages/Authentication/login.html';
    }, 1500);
}

if (user && user.role !== 'admin') {
    showToast('Access denied. Admin only.', 'error');
    setTimeout(() => {
        window.location.href = '../../pages/Authentication/login.html';
    }, 1500);
}

// ============ DISPLAY USER INFO ============
const userNameElement = document.getElementById('userName');
const userRoleElement = document.getElementById('userRole');
if (userNameElement) userNameElement.textContent = user?.full_name || user?.name || 'Admin';
if (userRoleElement) userRoleElement.textContent = user?.role || 'Admin';

console.log('Dashboard loaded. User:', user);

// ============ LOAD DASHBOARD STATS ============
async function loadDashboardStats() {
    try {
        console.log('Fetching dashboard stats...');
        
        const response = await fetch(`${API_URL}/dashboard/stats`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const stats = await response.json();
        console.log('Stats received:', stats);
        
        const totalPlayers = document.getElementById('totalPlayers');
        const totalCoaches = document.getElementById('totalCoaches');
        const totalBatches = document.getElementById('totalBatches');
        const totalCollected = document.getElementById('totalCollected');
        
        if (totalPlayers) totalPlayers.textContent = stats.total_players || 0;
        if (totalCoaches) totalCoaches.textContent = stats.total_coaches || 0;
        if (totalBatches) totalBatches.textContent = stats.total_batches || 0;
        
        const collected = stats.total_collected || 0;
        if (totalCollected) totalCollected.innerHTML = '₹' + collected.toLocaleString('en-IN');
        
    } catch (error) {
        console.error('Error loading stats:', error);
        showToast('Failed to load dashboard stats', 'error');
    }
}

// ============ LOAD RECENT PLAYERS ============
async function loadRecentPlayers() {
    try {
        console.log('Fetching recent players...');
        
        const response = await fetch(`${API_URL}/dashboard/players`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const players = await response.json();
        console.log('Players received:', players);
        
        const playersTable = document.querySelector('#recentPlayersTable tbody');
        if (!playersTable) return;
        
        if (players && players.length > 0) {
            playersTable.innerHTML = players.map(player => `
                <tr>
                    <td>${player.player_name || 'N/A'}</td>
                    <td>${player.batch_name || 'Not Assigned'}</td>
                    <td><span class="badge ${player.status === 'active' ? 'bg-success' : 'bg-danger'}">${player.status === 'active' ? 'Active' : 'Inactive'}</span></td>
                </tr>
            `).join('');
        } else {
            playersTable.innerHTML = '<tr><td colspan="3" class="text-center">No players found</td><\/tr>';
        }
        
    } catch (error) {
        console.error('Error loading recent players:', error);
        const playersTable = document.querySelector('#recentPlayersTable tbody');
        if (playersTable) {
            playersTable.innerHTML = '<tr><td colspan="3" class="text-center text-danger">Failed to load players</td><\/tr>';
        }
        showToast('Failed to load recent players', 'error');
    }
}

// ============ LOAD RECENT PAYMENTS ============
async function loadRecentPayments() {
    try {
        console.log('Fetching recent payments...');
        
        const response = await fetch(`${API_URL}/dashboard/payments`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const payments = await response.json();
        console.log('Payments received:', payments);
        
        const paymentsTable = document.querySelector('#recentPaymentsTable tbody');
        if (!paymentsTable) return;
        
        if (payments && payments.length > 0) {
            paymentsTable.innerHTML = payments.map(payment => `
                <tr>
                    <td>${payment.player_name || 'N/A'}</td>
                    <td>₹${(payment.amount || 0).toLocaleString('en-IN')}</td>
                    <td>${payment.payment_date ? new Date(payment.payment_date).toLocaleDateString('en-IN') : 'N/A'}</td>
                </tr>
            `).join('');
        } else {
            paymentsTable.innerHTML = '<tr><td colspan="3" class="text-center">No payments found</td><\/tr>';
        }
        
    } catch (error) {
        console.error('Error loading recent payments:', error);
        const paymentsTable = document.querySelector('#recentPaymentsTable tbody');
        if (paymentsTable) {
            paymentsTable.innerHTML = '<tr><td colspan="3" class="text-center text-danger">Failed to load payments</td><\/tr>';
        }
        showToast('Failed to load recent payments', 'error');
    }
}

// ============ LOAD REVENUE DISTRIBUTION CHART ============
async function loadChart() {
    const canvas = document.getElementById('revenueChart');
    if (!canvas) {
        console.log('Chart canvas not found');
        return;
    }
    
    try {
        console.log('Fetching revenue distribution data...');
        
        const response = await fetch(`${API_URL}/dashboard/revenue-distribution`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const revenueData = await response.json();
        console.log('Revenue distribution received:', revenueData);
        
        const collectedAmount = document.getElementById('collectedAmount');
        const pendingAmount = document.getElementById('pendingAmount');
        
        if (collectedAmount) {
            collectedAmount.innerHTML = '₹' + (revenueData[0]?.value || 0).toLocaleString('en-IN');
        }
        if (pendingAmount) {
            pendingAmount.innerHTML = '₹' + (revenueData[1]?.value || 0).toLocaleString('en-IN');
        }
        
        const labels = revenueData.map(item => item.name);
        const values = revenueData.map(item => item.value);
        const colors = revenueData.map(item => item.color);
        
        const totalValue = values.reduce((a, b) => a + b, 0);
        const ctx = canvas.getContext('2d');
        
        if (window.revenueChartInstance) {
            window.revenueChartInstance.destroy();
        }
        
        if (totalValue === 0) {
            window.revenueChartInstance = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['No Data'],
                    datasets: [{
                        data: [1],
                        backgroundColor: ['#e2e8f0'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '60%',
                    plugins: {
                        legend: { display: true, position: 'bottom' },
                        tooltip: { callbacks: { label: () => 'No payment data available' } }
                    }
                }
            });
            return;
        }
        
        window.revenueChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: colors,
                    borderWidth: 0,
                    hoverOffset: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '60%',
                plugins: {
                    legend: { 
                        display: true, 
                        position: 'bottom',
                        labels: { font: { size: 12 } }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                return `${label}: ₹${value.toLocaleString('en-IN')} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
        
        console.log('Revenue chart loaded successfully');
        
    } catch (error) {
        console.error('Error loading revenue chart:', error);
        showToast('Failed to load revenue data', 'error');
    }
}

// ============ INITIALIZE PAGE ============
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing dashboard...');
    loadDashboardStats();
    loadRecentPlayers();
    loadRecentPayments();
    loadChart();
});