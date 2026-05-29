// ==================== PLAYER PROFILE JS ====================

let playerData = {};

document.addEventListener('DOMContentLoaded', () => {
    if (!checkPlayerAuth()) return;
    loadProfile();
    
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }
});

async function loadProfile() {
    try {
        const token = getToken();
        const user = getCurrentUser();
        
        const welcomeText = document.getElementById('welcomeText');
        if (welcomeText && user) {
            welcomeText.textContent = `Welcome, ${user.name || user.full_name || user.fullName || 'Player'}!`;
        }
        
        const response = await fetch(`${API_URL}/player/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                logout();
            }
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to load profile');
        }
        
        playerData = await response.json();
        console.log('Profile data:', playerData);
        displayProfile(playerData);
        
    } catch (error) {
        console.error('Error:', error);
        showToast('Error loading profile: ' + error.message, 'error');
    }
}

function displayProfile(profile) {
    // Header - Player Name and Email
    const playerName = document.getElementById('playerName');
    if (playerName) playerName.textContent = profile.full_name || 'Player Name';
    
    const playerEmail = document.getElementById('playerEmail');
    if (playerEmail) playerEmail.textContent = profile.email || '-';
    
    // Batch Badge and Timing
    const batchBadge = document.getElementById('batchBadge');
    const timeBadge = document.getElementById('timeBadge');
    
    if (batchBadge) {
        if (profile.batch_name) {
            batchBadge.innerHTML = `<i class="fa-solid fa-layer-group"></i> Batch: ${profile.batch_name}`;
            batchBadge.className = 'batch-badge';
        } else {
            batchBadge.innerHTML = `<i class="fa-solid fa-layer-group"></i> Batch: Not Assigned`;
            batchBadge.className = 'no-badge';
        }
    }
    
    if (timeBadge) {
        if (profile.batch_time) {
            timeBadge.innerHTML = `<i class="fa-regular fa-clock"></i> Timing: ${profile.batch_time}`;
            timeBadge.className = 'timing-badge';
        } else {
            timeBadge.innerHTML = `<i class="fa-regular fa-clock"></i> Timing: Not Assigned`;
            timeBadge.className = 'no-badge';
        }
    }
    
    // Display all information
    const viewFullName = document.getElementById('viewFullName');
    if (viewFullName) viewFullName.textContent = profile.full_name || '-';
    
    const viewEmail = document.getElementById('viewEmail');
    if (viewEmail) viewEmail.textContent = profile.email || '-';
    
    const viewPhone = document.getElementById('viewPhone');
    if (viewPhone) viewPhone.textContent = profile.phone || 'Not provided';
    
    const viewDob = document.getElementById('viewDob');
    if (viewDob && profile.date_of_birth) {
        const date = new Date(profile.date_of_birth);
        viewDob.textContent = date.toLocaleDateString('en-IN');
    } else if (viewDob) {
        viewDob.textContent = 'Not provided';
    }
    
    const viewAge = document.getElementById('viewAge');
    if (viewAge && profile.age) {
        viewAge.textContent = `${profile.age} years`;
    } else if (viewAge) {
        viewAge.textContent = 'Not calculated';
    }
    
    const viewRole = document.getElementById('viewRole');
    if (viewRole) {
        const role = profile.playing_role || profile.player_role || 'Not specified';
        viewRole.textContent = role;
    }
    
    const viewAddress = document.getElementById('viewAddress');
    if (viewAddress) viewAddress.textContent = profile.address || 'Not provided';
    
    const viewAttendance = document.getElementById('viewAttendance');
    if (viewAttendance) viewAttendance.textContent = `${profile.attendance_percentage || 0}%`;
    
    const viewJoined = document.getElementById('viewJoined');
    if (viewJoined && profile.joined_date) {
        const date = new Date(profile.joined_date);
        viewJoined.textContent = date.toLocaleDateString('en-IN');
    } else if (viewJoined) {
        viewJoined.textContent = 'Recently';
    }
}