// ==================== SIMPLE FORGOT PASSWORD JS ====================
const API_URL = 'http://localhost:5000/api';

// Get DOM elements
const forgotForm = document.getElementById('forgotForm');
const emailInput = document.getElementById('email');
const newPasswordInput = document.getElementById('newPassword');
const confirmPasswordInput = document.getElementById('confirmPassword');
const resetBtn = document.getElementById('resetBtn');
const errorMsg = document.getElementById('errorMsg');
const successMsg = document.getElementById('successMsg');

// Show error message
function showError(message) {
    errorMsg.textContent = message;
    errorMsg.style.display = 'block';
    successMsg.style.display = 'none';
    
    // Auto hide after 5 seconds
    setTimeout(() => {
        errorMsg.style.display = 'none';
    }, 5000);
}

// Show success message
function showSuccess(message) {
    successMsg.textContent = message;
    successMsg.style.display = 'block';
    errorMsg.style.display = 'none';
    
    // Auto hide after 5 seconds
    setTimeout(() => {
        successMsg.style.display = 'none';
    }, 5000);
}

// Set loading state
function setLoading(isLoading) {
    if (isLoading) {
        resetBtn.disabled = true;
        resetBtn.innerHTML = '<span class="spinner"></span> Resetting Password...';
    } else {
        resetBtn.disabled = false;
        resetBtn.innerHTML = 'Reset Password';
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

// Handle form submission
async function handleForgotPassword(event) {
    event.preventDefault();
    
    // Get values
    const email = emailInput.value.trim();
    const newPassword = newPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    
    // Validate
    if (!email) {
        showError('Please enter your email address');
        return;
    }
    
    if (!newPassword || !confirmPassword) {
        showError('Please enter both password fields');
        return;
    }
    
    if (newPassword.length < 6) {
        showError('Password must be at least 6 characters long');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        showError('Passwords do not match');
        return;
    }
    
    // Send request
    setLoading(true);
    
    try {
        const response = await fetch(`${API_URL}/auth/forgot-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                email: email, 
                newPassword: newPassword,
                confirmPassword: confirmPassword
            })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            showSuccess(data.message);
            // Clear form
            emailInput.value = '';
            newPasswordInput.value = '';
            confirmPasswordInput.value = '';
            // Redirect to login after 2 seconds
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
        } else {
            showError(data.message || 'Failed to reset password');
        }
    } catch (error) {
        console.error('Error:', error);
        showError('Unable to connect to server. Please make sure the backend is running.');
    } finally {
        setLoading(false);
    }
}

// Add event listener
if (forgotForm) {
    forgotForm.addEventListener('submit', handleForgotPassword);
}