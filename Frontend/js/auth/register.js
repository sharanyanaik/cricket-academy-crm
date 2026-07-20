// ==================== REGISTER PAGE JAVASCRIPT ====================
const API_URL = 'http://localhost:5000/api';

// Allowed email domains
const ALLOWED_EMAIL_DOMAINS = ['com', 'edu'];

// Email validation
function isValidEmail(email) {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) return false;
    
    const domain = email.split('@')[1];
    const tld = domain.split('.').pop().toLowerCase();
    return tld === 'com' || tld === 'edu';
}

// Password validation
function isValidPassword(password) {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
}

// Password strength
function getPasswordStrengthMessage(password) {
    if (!password) return '';
    
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[@$!%*?&]/.test(password)) strength++;
    
    if (strength === 5) return 'strong';
    if (strength >= 3) return 'medium';
    return 'weak';
}

// Age calculation function
function calculateAge(dateOfBirth) {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}

// Date of birth validation
function isValidDateOfBirth(dateOfBirth) {
    if (!dateOfBirth) return false;
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    
    if (isNaN(birthDate.getTime())) return false;
    if (birthDate > today) return false;
    
    const age = calculateAge(dateOfBirth);
    return age >= 5 && age <= 100;
}

// Real-time password strength indicator
function addPasswordStrengthIndicator() {
    const passwordInput = document.getElementById('password');
    if (!passwordInput) return;
    
    const strengthDiv = document.createElement('div');
    strengthDiv.id = 'passwordStrength';
    strengthDiv.style.cssText = `
        margin-top: 5px;
        font-size: 12px;
        padding: 5px;
        border-radius: 5px;
        transition: all 0.3s ease;
        display: none;
    `;
    passwordInput.parentNode.insertBefore(strengthDiv, passwordInput.nextSibling);
    
    passwordInput.addEventListener('input', function() {
        const password = this.value;
        const strength = getPasswordStrengthMessage(password);
        
        if (password.length === 0) {
            strengthDiv.style.display = 'none';
            return;
        }
        
        strengthDiv.style.display = 'block';
        
        if (strength === 'strong') {
            strengthDiv.innerHTML = 'Password strength: Strong';
            strengthDiv.style.backgroundColor = '#d1fae5';
            strengthDiv.style.color = '#065f46';
        } else if (strength === 'medium') {
            strengthDiv.innerHTML = ' Password strength: Medium';
            strengthDiv.style.backgroundColor = '#fef3c7';
            strengthDiv.style.color = '#92400e';
        } else {
            strengthDiv.innerHTML = ' Password strength: Weak';
            strengthDiv.style.backgroundColor = '#fee2e2';
            strengthDiv.style.color = '#991b1b';
        }
    });
}

// Real-time email validation
function addEmailValidationIndicator() {
    const emailInput = document.getElementById('email');
    if (!emailInput) return;
    
    const emailHint = document.createElement('div');
    emailHint.id = 'emailHint';
    emailHint.style.cssText = `
        margin-top: 5px;
        font-size: 11px;
        padding: 5px;
        border-radius: 5px;
        display: none;
    `;
    emailInput.parentNode.insertBefore(emailHint, emailInput.nextSibling);
    
    emailInput.addEventListener('input', function() {
        const email = this.value;
        
        if (email.length === 0) {
            emailHint.style.display = 'none';
            return;
        }
        
        emailHint.style.display = 'block';
        
        if (isValidEmail(email)) {
            emailHint.innerHTML = '✓ Valid email format (.com or .edu)';
            emailHint.style.backgroundColor = '#d1fae5';
            emailHint.style.color = '#065f46';
        } else {
            emailHint.innerHTML = '❌ Only .com and .edu domains allowed';
            emailHint.style.backgroundColor = '#fee2e2';
            emailHint.style.color = '#991b1b';
        }
    });
}

// Age display functionality
function addAgeDisplay() {
    const dobInput = document.getElementById('date_of_birth');
    if (!dobInput) return;
    
    const ageDisplay = document.createElement('div');
    ageDisplay.id = 'ageDisplay';
    ageDisplay.style.cssText = `
        margin-top: 5px;
        font-size: 12px;
        padding: 5px;
        border-radius: 5px;
        display: none;
    `;
    dobInput.parentNode.insertBefore(ageDisplay, dobInput.nextSibling);
    
    dobInput.addEventListener('change', function() {
        const dob = this.value;
        if (dob) {
            const age = calculateAge(dob);
            if (age >= 5 && age <= 100) {
                ageDisplay.style.display = 'block';
                ageDisplay.innerHTML = `✓ Age: ${age} years`;
                ageDisplay.style.backgroundColor = '#d1fae5';
                ageDisplay.style.color = '#065f46';
            } else {
                ageDisplay.style.display = 'block';
                ageDisplay.innerHTML = `❌ Age: ${age} years (Invalid - Must be between 5-100)`;
                ageDisplay.style.backgroundColor = '#fee2e2';
                ageDisplay.style.color = '#991b1b';
            }
        } else {
            ageDisplay.style.display = 'none';
        }
    });
}

function setLoading(buttonId, isLoading, originalText = '') {
    const btn = document.getElementById(buttonId);
    if (!btn) return;
    
    if (isLoading) {
        btn.originalText = btn.innerHTML;
        btn.innerHTML = '<span class="spinner"></span> Registering...';
        btn.disabled = true;
    } else {
        btn.innerHTML = btn.originalText || originalText;
        btn.disabled = false;
    }
}

// Validate form - UPDATED with all fields
function validateForm(full_name, email, password, role, date_of_birth, phone) {
    if (!full_name || full_name.trim().length < 2) {
        showAuthToast('Please enter a valid full name', 'error');
        return false;
    }
    
    if (!email) {
        showAuthToast('Please enter email address', 'error');
        return false;
    }
    
    if (!isValidEmail(email)) {
        showAuthToast('Only .com and .edu email domains are allowed', 'error');
        return false;
    }
    
    if (!password) {
        showAuthToast('Please enter a password', 'error');
        return false;
    }
    
    if (!isValidPassword(password)) {
        showAuthToast('Password must be 8+ chars with uppercase, lowercase, number & special character', 'error');
        return false;
    }
    
    // Date of birth validation
    if (!date_of_birth) {
        showAuthToast('Please enter date of birth', 'error');
        return false;
    }
    
    if (!isValidDateOfBirth(date_of_birth)) {
        showAuthToast('Please enter a valid date of birth (Age should be between 5 and 100 years)', 'error');
        return false;
    }
    
    if (!role || role === '') {
        showAuthToast('Please select a role', 'error');
        return false;
    }
    
    // Phone is optional, but validate format if provided
    if (phone && phone.trim() !== '') {
        const phoneRegex = /^[0-9]{10}$/;
        if (!phoneRegex.test(phone)) {
            showAuthToast('Please enter a valid 10-digit phone number', 'error');
            return false;
        }
    }
    
    return true;
}

// Handle registration - UPDATED
async function handleRegister(e) {
    e.preventDefault();
    
    const full_name = document.getElementById('full_name').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
   const role = 'player'; // Force all registrations as player
    const date_of_birth = document.getElementById('date_of_birth').value;
    const phone = document.getElementById('phone').value.trim();
    
    if (!validateForm(full_name, email, password, role, date_of_birth, phone)) {
        return;
    }
    
    const username = email.split('@')[0];
    const age = calculateAge(date_of_birth);
    
    const userData = {
        full_name: full_name,
        username: username,
        email: email,
        password: password,
        role: role,
        phone: phone || '',
        date_of_birth: date_of_birth,
        age: age
    };
    
    setLoading('registerBtn', true);
    
    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showAuthToast('Registration successful! Redirecting to login...', 'success');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
        } else {
            showAuthToast(data.message || 'Registration failed', 'error');
            setLoading('registerBtn', false, 'Register');
        }
    } catch (error) {
        console.error('Error:', error);
        showAuthToast('Cannot connect to server', 'error');
        setLoading('registerBtn', false, 'Register');
    }
}

// Add spinner style
if (!document.querySelector('#spinner-style')) {
    const style = document.createElement('style');
    style.id = 'spinner-style';
    style.textContent = `
        .spinner {
            display: inline-block;
            width: 14px;
            height: 14px;
            border: 2px solid rgba(255,255,255,0.3);
            border-radius: 50%;
            border-top-color: white;
            animation: spin 0.6s linear infinite;
            margin-right: 8px;
        }
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);
}

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    addEmailValidationIndicator();
    addPasswordStrengthIndicator();
    addAgeDisplay();
    
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
});