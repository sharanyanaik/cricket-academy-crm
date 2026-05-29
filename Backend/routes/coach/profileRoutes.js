const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) return res.status(401).json({ message: 'Access denied' });
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'cricket_crm_secret_2026');
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(403).json({ message: 'Invalid token' });
    }
};

// GET PROFILE
router.get('/', authenticateToken, (req, res) => {
    const userId = req.user.id;
    
    const query = `
        SELECT 
            u.id, 
            u.full_name, 
            u.email, 
            u.phone, 
            u.role, 
            u.created_at,
            u.qualification,
            u.bio,
            c.specialization,
            c.experience_years as experience
        FROM users u
        LEFT JOIN coaches c ON u.id = c.user_id
        WHERE u.id = ? AND u.role = 'coach'
    `;
    
    db.query(query, [userId], (err, coach) => {
        if (err) {
            console.error('Error fetching profile:', err);
            return res.status(500).json({ error: err.message });
        }
        if (coach.length === 0) return res.status(404).json({ message: 'Coach not found' });
        
        const profile = coach[0];
        
        // Set default values for null fields
        profile.specialization = profile.specialization || 'Not specified';
        profile.experience = profile.experience || 0;
        profile.qualification = profile.qualification || 'Not specified';
        profile.bio = profile.bio || 'No bio available';
        
        console.log('Profile retrieved:', profile);
        res.json(profile);
    });
});

// UPDATE PROFILE
router.put('/', authenticateToken, async (req, res) => {
    const { full_name, phone, specialization, experience, qualification, bio } = req.body;
    const userId = req.user.id;
    
    console.log('Updating profile with:', { full_name, phone, specialization, experience, qualification, bio });
    
    // Update users table
    db.query('UPDATE users SET full_name = ?, phone = ?, qualification = ?, bio = ? WHERE id = ?', 
        [full_name, phone, qualification || null, bio || null, userId], 
        (err) => {
            if (err) {
                console.error('Error updating user:', err);
                return res.status(500).json({ error: err.message });
            }
            
            // Update coaches table
            db.query('UPDATE coaches SET specialization = ?, experience_years = ? WHERE user_id = ?', 
                [specialization || 'General', parseInt(experience) || 0, userId], 
                (err) => {
                    if (err) {
                        console.error('Error updating coach:', err);
                        return res.status(500).json({ error: err.message });
                    }
                    res.json({ success: true, message: 'Profile updated successfully' });
                });
        });
});

// CHANGE PASSWORD
router.put('/change-password', authenticateToken, async (req, res) => {
    const { current_password, new_password } = req.body;
    
    if (!current_password || !new_password) {
        return res.status(400).json({ message: 'Current and new password are required' });
    }
    
    db.query('SELECT password FROM users WHERE id = ?', [req.user.id], async (err, users) => {
        if (err) return res.status(500).json({ error: err.message });
        if (users.length === 0) return res.status(404).json({ message: 'User not found' });
        
        const isValidPassword = await bcrypt.compare(current_password, users[0].password);
        if (!isValidPassword) {
            return res.status(401).json({ message: 'Current password is incorrect' });
        }
        
        const hashedPassword = await bcrypt.hash(new_password, 10);
        db.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, req.user.id], (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, message: 'Password changed successfully' });
        });
    });
});

module.exports = router;