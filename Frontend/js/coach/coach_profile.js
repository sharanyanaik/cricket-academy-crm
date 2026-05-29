// ==================== COACH PROFILE JS ====================

let currentProfile = {};

document.addEventListener('DOMContentLoaded', function() {
    console.log('Coach Profile page loaded');
    
    if (!checkCoachAuth()) return;
    
    loadProfile();
    
    var logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            logout();
        });
    }
});

async function loadProfile() {
    try {
        var token = getToken();
        var response = await fetch(API_URL + '/coach/profile', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        
        if (response.ok) {
            currentProfile = await response.json();
            console.log('Profile loaded:', currentProfile);
            displayProfile(currentProfile);
        } else if (response.status === 401 || response.status === 403) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '../../pages/Authentication/login.html';
        } else {
            showToast('Failed to load profile', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Failed to load profile', 'error');
    }
}

function displayProfile(profile) {
    // Profile header
    var profileImg = document.getElementById('profileImg');
    if (profileImg) {
        var name = profile.full_name || 'Coach';
        profileImg.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(name) + '&size=100&background=2563eb&color=fff&bold=true';
    }
    
    var profileName = document.getElementById('profileName');
    if (profileName) profileName.textContent = profile.full_name || '-';
    
    var profileRole = document.getElementById('profileRole');
    if (profileRole) profileRole.innerHTML = '<i class="fa-solid fa-tag"></i> ' + (profile.specialization || 'Coach');
    
    // Personal Information
    var personalHtml = '';
    
    personalHtml += '<div class="detail-item">';
    personalHtml += '<div class="detail-icon"><i class="fa-solid fa-envelope"></i></div>';
    personalHtml += '<div><div class="detail-label">Email</div><div class="detail-value">' + (profile.email || '-') + '</div></div>';
    personalHtml += '</div>';
    
    personalHtml += '<div class="detail-item">';
    personalHtml += '<div class="detail-icon"><i class="fa-solid fa-phone"></i></div>';
    personalHtml += '<div><div class="detail-label">Phone</div><div class="detail-value">' + (profile.phone || '-') + '</div></div>';
    personalHtml += '</div>';
    
    personalHtml += '<div class="detail-item">';
    personalHtml += '<div class="detail-icon"><i class="fa-solid fa-calendar"></i></div>';
    personalHtml += '<div><div class="detail-label">Member Since</div><div class="detail-value">' + formatDate(profile.created_at) + '</div></div>';
    personalHtml += '</div>';
    
    document.getElementById('personalInfo').innerHTML = personalHtml;
    
    // Professional Information
    var professionalHtml = '';
    
    professionalHtml += '<div class="detail-item">';
    professionalHtml += '<div class="detail-icon"><i class="fa-solid fa-star"></i></div>';
    professionalHtml += '<div><div class="detail-label">Specialization</div><div class="detail-value">' + (profile.specialization || 'Not specified') + '</div></div>';
    professionalHtml += '</div>';
    
    professionalHtml += '<div class="detail-item">';
    professionalHtml += '<div class="detail-icon"><i class="fa-solid fa-briefcase"></i></div>';
    professionalHtml += '<div><div class="detail-label">Experience</div><div class="detail-value">' + (profile.experience ? profile.experience + ' Years' : '0 Years') + '</div></div>';
    professionalHtml += '</div>';
    
    professionalHtml += '<div class="detail-item">';
    professionalHtml += '<div class="detail-icon"><i class="fa-solid fa-graduation-cap"></i></div>';
    professionalHtml += '<div><div class="detail-label">Qualification</div><div class="detail-value">' + (profile.qualification || 'Not specified') + '</div></div>';
    professionalHtml += '</div>';
    
    professionalHtml += '<div class="detail-item">';
    professionalHtml += '<div class="detail-icon"><i class="fa-solid fa-pen"></i></div>';
    professionalHtml += '<div><div class="detail-label">Bio</div><div class="detail-value">' + (profile.bio || 'No bio available') + '</div></div>';
    professionalHtml += '</div>';
    
    document.getElementById('professionalInfo').innerHTML = professionalHtml;
}

function openEditModal() {
    // Fill form with current profile data
    document.getElementById('full_name').value = currentProfile.full_name || '';
    document.getElementById('phone').value = currentProfile.phone || '';
    document.getElementById('specialization').value = currentProfile.specialization || 'General';
    document.getElementById('experience').value = currentProfile.experience || 0;
    document.getElementById('qualification').value = currentProfile.qualification || '';
    document.getElementById('bio').value = currentProfile.bio || '';
    
    var modal = document.getElementById('editModal');
    if (modal) modal.style.display = 'flex';
}

async function updateProfile() {
    var profileData = {
        full_name: document.getElementById('full_name').value,
        phone: document.getElementById('phone').value,
        specialization: document.getElementById('specialization').value,
        experience: parseInt(document.getElementById('experience').value) || 0,
        qualification: document.getElementById('qualification').value,
        bio: document.getElementById('bio').value
    };
    
    console.log('Updating profile with:', profileData);
    
    var saveBtn = document.querySelector('#editModal .btn-save');
    var originalText = saveBtn.innerHTML;
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
    
    try {
        var token = getToken();
        var response = await fetch(API_URL + '/coach/profile', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify(profileData)
        });
        
        var data = await response.json();
        
        if (response.ok) {
            showToast('Profile updated successfully!', 'success');
            closeModal();
            loadProfile(); // Refresh the displayed profile
        } else {
            showToast(data.message || 'Failed to update profile', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Error updating profile', 'error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalText;
    }
}

function openPasswordModal() {
    document.getElementById('current_password').value = '';
    document.getElementById('new_password').value = '';
    document.getElementById('confirm_password').value = '';
    document.getElementById('passwordModal').style.display = 'flex';
}

function closePasswordModal() {
    document.getElementById('passwordModal').style.display = 'none';
}

async function updatePassword() {
    var currentPassword = document.getElementById('current_password').value;
    var newPassword = document.getElementById('new_password').value;
    var confirmPassword = document.getElementById('confirm_password').value;
    
    if (!currentPassword || !newPassword || !confirmPassword) {
        showToast('Please fill all fields', 'error');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        showToast('New passwords do not match!', 'error');
        return;
    }
    
    if (newPassword.length < 6) {
        showToast('Password must be at least 6 characters', 'error');
        return;
    }
    
    var saveBtn = document.querySelector('#passwordModal .btn-save');
    var originalText = saveBtn.innerHTML;
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Updating...';
    
    try {
        var token = getToken();
        var response = await fetch(API_URL + '/coach/profile/change-password', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({
                current_password: currentPassword,
                new_password: newPassword
            })
        });
        
        var data = await response.json();
        
        if (response.ok) {
            showToast('Password changed successfully! Please login again.', 'success');
            setTimeout(() => {
                logout();
            }, 2000);
        } else {
            showToast(data.message || 'Failed to change password', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Error changing password', 'error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalText;
    }
}

function changePassword() {
    openPasswordModal();
}

function closeModal() {
    var modal = document.getElementById('editModal');
    if (modal) modal.style.display = 'none';
}

function formatDate(dateString) {
    if (!dateString) return '-';
    var date = new Date(dateString);
    return date.toLocaleDateString('en-IN');
}

// Make functions global
window.openEditModal = openEditModal;
window.updateProfile = updateProfile;
window.changePassword = changePassword;
window.closeModal = closeModal;
window.updatePassword = updatePassword;
window.closePasswordModal = closePasswordModal;