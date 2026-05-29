// ==================== COACH PLAYER VIEW JS ====================

let playerId = null;

document.addEventListener('DOMContentLoaded', () => {
    console.log('Coach Player View page loaded');
    
    if (!checkCoachAuth()) return;
    
    const urlParams = new URLSearchParams(window.location.search);
    playerId = urlParams.get('id');
    
    if (!playerId) {
        showToast('Player ID not found', 'error');
        setTimeout(() => window.location.href = 'coach_players.html', 2000);
        return;
    }
    
    loadPlayerDetails();
    
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }
});

async function loadPlayerDetails() {
    try {
        const token = getToken();
        const response = await fetch(`${API_URL}/coach/players/${playerId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const player = await response.json();
            console.log('Player details:', player);
            console.log('Total paid:', player.total_paid);
            console.log('Yearly fee:', player.yearly_fee);
            console.log('Pending amount:', player.pending_amount);
            displayPlayerDetails(player);
        } else if (response.status === 404) {
            showToast('Player not found', 'error');
            setTimeout(() => window.location.href = 'coach_players.html', 2000);
        } else if (response.status === 401 || response.status === 403) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '../../pages/Authentication/login.html';
        } else {
            showToast('Failed to load player details', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Failed to load player details', 'error');
    }
}

function displayPlayerDetails(player) {
    // Profile header
    const playerNameEl = document.getElementById('playerName');
    const playerRoleEl = document.getElementById('playerRole');
    
    if (playerNameEl) playerNameEl.textContent = player.full_name || player.player_name || '-';
    if (playerRoleEl) playerRoleEl.innerHTML = getRoleBadge(player.playing_role);
    
    // Contact Info
    const contactInfo = document.getElementById('contactInfo');
    if (contactInfo) {
        contactInfo.innerHTML = `
            <h4>Contact Info</h4>
            <p><strong>Email:</strong> ${player.email || 'N/A'}</p>
            <p><strong>Phone:</strong> ${player.phone || 'N/A'}</p>
            <p><strong>Date of Birth:</strong> ${player.date_of_birth ? new Date(player.date_of_birth).toLocaleDateString('en-IN') : 'N/A'}</p>
            <p><strong>Age:</strong> ${player.age || 'N/A'}</p>
        `;
    }
    
    // Batch Info
    const batchInfo = document.getElementById('batchInfo');
    if (batchInfo) {
        batchInfo.innerHTML = `
            <h4>Batch Info</h4>
            <p><strong>Batch:</strong> ${player.batch_name || 'Unassigned'}</p>
            <p><strong>Timing:</strong> ${player.batch_time || '--'}</p>
            <p><strong>Coach:</strong> ${player.coach_name || 'Not assigned'}</p>
        `;
    }
    
    // Attendance
    const attendanceInfo = document.getElementById('attendanceInfo');
    if (attendanceInfo) {
        const present = player.attendance?.present || 0;
        const absent = player.attendance?.absent || 0;
        const total = player.attendance?.total_days || (present + absent);
        const percent = player.attendance?.attendance_percentage || (total > 0 ? Math.round((present / total) * 100) : 0);
        
        attendanceInfo.innerHTML = `
            <h4>Attendance Record</h4>
            <p><strong>Total Days:</strong> ${total}</p>
            <p><strong>Present:</strong> <span style="color: #10b981;">${present}</span></p>
            <p><strong>Absent:</strong> <span style="color: #ef4444;">${absent}</span></p>
            <p><strong>Attendance %:</strong> <strong style="color: #2563eb;">${percent}%</strong></p>
            <div class="progress mt-2" style="height: 8px;">
                <div class="progress-bar bg-success" style="width: ${percent}%;"></div>
            </div>
        `;
    }
    
    // Payment Status
    const paymentInfo = document.getElementById('paymentInfo');
    if (paymentInfo) {
        const lastPayment = player.last_payment;
        const totalPaid = player.total_paid || 0;
        const pendingAmount = player.pending_amount || 0;
        const yearlyFee = player.yearly_fee || 0;
        
        let statusClass = '';
        let statusText = '';
        
        if (pendingAmount <= 0 && totalPaid > 0) {
            statusClass = 'paid';
            statusText = 'Fully Paid';
        } else if (totalPaid > 0) {
            statusClass = 'pending';
            statusText = 'Partial';
        } else {
            statusClass = 'pending';
            statusText = 'Pending';
        }
        
        paymentInfo.innerHTML = `
            <h4>Payment Status</h4>
            <p><strong>Yearly Fee:</strong> ₹${formatNumber(yearlyFee)}</p>
            <p><strong>Total Paid:</strong> <span style="color: #10b981; font-weight: bold;">₹${formatNumber(totalPaid)}</span></p>
            <p><strong>Pending Amount:</strong> <span style="color: #ef4444; font-weight: bold;">₹${formatNumber(pendingAmount)}</span></p>
            <p><strong>Status:</strong> <span class="${statusClass}">${statusText}</span></p>
            <p><strong>Last Payment:</strong> ${lastPayment ? '₹' + formatNumber(lastPayment.amount) + ' on ' + formatDate(lastPayment.payment_date) : 'N/A'}</p>
        `;
    }
}

function getRoleBadge(role) {
    const roleMap = {
        'batsman': 'role-batsman',
        'bowler': 'role-bowler',
        'all-rounder': 'role-allrounder',
        'wicket-keeper': 'role-wicketkeeper'
    };
    const className = roleMap[role?.toLowerCase()] || 'role-batsman';
    return `<span class="player-role ${className}">${role || 'Not specified'}</span>`;
}

function formatNumber(amount) {
    if (!amount) return '0';
    return amount.toLocaleString('en-IN');
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN');
}