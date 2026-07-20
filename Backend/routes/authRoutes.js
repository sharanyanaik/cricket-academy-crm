const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { addAuditLog } = require('../utils/auditLog');

// ================================================================
// REGISTER - Only "Player" role 
// ================================================================
router.post('/register', async (req, res) => {
    try {
        const { username, email, password, full_name, phone, role, date_of_birth, age } = req.body;

        // Validate required fields
        if (!full_name || !email || !password || !role || !date_of_birth) {
            return res.status(400).json({ message: 'All required fields must be filled' });
        }

        if (role !== 'player') {
            return res.status(403).json({ 
                message: 'Only "Player" role can be registered. Please contact admin for other roles.' 
            });
        }

        db.query('SELECT id FROM users WHERE email = ? OR username = ?', [email, username], async (err, existing) => {
            if (err) return res.status(500).json({ error: err.message });
            if (existing.length > 0) {
                return res.status(400).json({ message: 'User already exists' });
            }

            const hashedPassword = await bcrypt.hash(password, 10);

            // Insert into users table with date_of_birth and phone
            db.query(
                'INSERT INTO users (username, email, password, full_name, phone, role, date_of_birth, created_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), "active")',
                [username, email, hashedPassword, full_name, phone || null, role, date_of_birth],
                (err, result) => {
                    if (err) {
                        console.error('Insert error:', err);
                        return res.status(500).json({ error: err.message });
                    }
                    
                    // If role is player, also insert into players table
                    if (role === 'player') {
                        const playerQuery = `
                            INSERT INTO players (user_id, player_name, playing_role, date_of_birth, status, created_at) 
                            VALUES (?, ?, ?, ?, "active", NOW())
                        `;
                        db.query(playerQuery, [result.insertId, full_name, 'Not Specified', date_of_birth], (playerErr) => {
                            if (playerErr) {
                                console.error('Error inserting into players table:', playerErr);
                            }
                        });
                    }
                    
                    res.status(201).json({ 
                        message: 'Registration successful!', 
                        userId: result.insertId 
                    });
                }
            );
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ================================================================
// LOGIN
// ================================================================
router.post('/login', (req, res) => {
    try {
        const { email, password } = req.body;

        db.query('SELECT * FROM users WHERE email = ? OR username = ?', [email, email], async (err, users) => {
            if (err) return res.status(500).json({ error: err.message });
            if (users.length === 0) {
                return res.status(401).json({ message: 'Invalid credentials' });
            }

            const user = users[0];
            const validPassword = await bcrypt.compare(password, user.password);

            if (!validPassword) {
                return res.status(401).json({ message: 'Invalid credentials' });
            }

            addAuditLog(user.id, 'LOGIN', `${user.full_name} logged in`);

            const token = jwt.sign(
                { id: user.id, email: user.email, role: user.role, name: user.full_name },
                process.env.JWT_SECRET || 'cricket_crm_secret_2026',
                { expiresIn: '7d' }
            );

            res.json({
                message: 'Login successful',
                token,
                user: {
                    id: user.id,
                    name: user.full_name,
                    email: user.email,
                    role: user.role,
                    username: user.username
                }
            });
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ================================================================
// FORGOT PASSWORD
// ================================================================
router.post('/forgot-password', async (req, res) => {
    const { email, newPassword, confirmPassword } = req.body;
    
    if (!email) {
        return res.status(400).json({ message: 'Email is required' });
    }
    
    if (!newPassword || !confirmPassword) {
        return res.status(400).json({ message: 'Both password fields are required' });
    }
    
    if (newPassword !== confirmPassword) {
        return res.status(400).json({ message: 'Passwords do not match' });
    }
    
    if (newPassword.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }
    
    try {
        db.query('SELECT id, email FROM users WHERE email = ?', [email], async (err, users) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ message: 'Server error. Please try again.' });
            }
            
            if (users.length === 0) {
                return res.status(404).json({ message: 'Email not found in our database' });
            }
            
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            
            db.query(
                'UPDATE users SET password = ? WHERE email = ?',
                [hashedPassword, email],
                (updateErr, result) => {
                    if (updateErr) {
                        console.error('Update error:', updateErr);
                        return res.status(500).json({ message: 'Failed to update password' });
                    }
                    
                    res.json({ 
                        success: true, 
                        message: 'Password reset successful! Please login with your new password.'
                    });
                }
            );
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ================================================================
// VERIFY TOKEN
// ================================================================
router.get('/verify', (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ valid: false, message: 'No token provided' });
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'cricket_crm_secret_2026');
        res.json({ 
            valid: true, 
            user: { 
                id: decoded.id, 
                role: decoded.role,
                name: decoded.name,
                email: decoded.email
            } 
        });
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ valid: false, message: 'Token expired' });
        }
        return res.status(403).json({ valid: false, message: 'Invalid token' });
    }
});

// ================================================================
// ADMIN USER MANAGEMENT ROUTES
// ================================================================

// Middleware to check if user is admin
function authorizeAdmin(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ message: 'No token provided' });
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'cricket_crm_secret_2026');
        if (decoded.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Admin only.' });
        }
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(403).json({ message: 'Invalid or expired token' });
    }
}

// 1. Admin creates user (any role)
router.post('/admin/users', authorizeAdmin, async (req, res) => {
    const { full_name, email, phone, role, password, date_of_birth } = req.body;
    
    // Validate role
    const allowedRoles = ['admin', 'coach', 'player', 'accountant', 'billing', 'maintenance'];
    if (!allowedRoles.includes(role)) {
        return res.status(400).json({ message: 'Invalid role' });
    }
    
    // Validate required fields
    if (!full_name || !email || !role || !password) {
        return res.status(400).json({ message: 'Full name, email, role and password are required' });
    }
    
    // Check if email already exists
    db.query('SELECT id FROM users WHERE email = ?', [email], async (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ message: 'Database error' });
        }
        if (results.length > 0) {
            return res.status(400).json({ message: 'Email already registered' });
        }
        
        try {
            const hashedPassword = await bcrypt.hash(password, 10);
            const username = email.split('@')[0];
            
            db.query(
                `INSERT INTO users (full_name, username, email, password, phone, role, date_of_birth, created_at, status) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), "active")`,
                [full_name, username, email, hashedPassword, phone || null, role, date_of_birth || null],
                (err, result) => {
                    if (err) {
                        console.error('Insert error:', err);
                        return res.status(500).json({ message: 'User creation failed' });
                    }
                    
                    // If role is player, also insert into players table
                    if (role === 'player') {
                        db.query(
                            `INSERT INTO players (user_id, player_name, status, created_at) 
                             VALUES (?, ?, "active", NOW())`,
                            [result.insertId, full_name],
                            (playerErr) => {
                                if (playerErr) console.error('Error inserting into players table:', playerErr);
                            }
                        );
                    }
                    
                    res.status(201).json({ 
                        success: true,
                        message: `User created successfully with role: ${role}`,
                        userId: result.insertId,
                        credentials: { 
                            email: email, 
                            password: password,
                            role: role
                        }
                    });
                }
            );
        } catch (error) {
            console.error('Hashing error:', error);
            res.status(500).json({ message: 'Password hashing failed' });
        }
    });
});

// 2. Get all users (admin only)
router.get('/admin/users', authorizeAdmin, (req, res) => {
    const query = 'SELECT id, full_name, username, email, phone, role, created_at FROM users ORDER BY id DESC';
    
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching users:', err);
            return res.status(500).json({ message: 'Failed to fetch users' });
        }
        res.json(results);
    });
});

// 3. Update user role (admin only)
router.put('/admin/users/:id/role', authorizeAdmin, (req, res) => {
    const { role } = req.body;
    const userId = req.params.id;
    
    const allowedRoles = ['admin', 'coach', 'player', 'accountant', 'billing', 'maintenance'];
    if (!allowedRoles.includes(role)) {
        return res.status(400).json({ message: 'Invalid role' });
    }
    
    db.query('UPDATE users SET role = ? WHERE id = ?', [role, userId], (err, result) => {
        if (err) {
            console.error('Error updating role:', err);
            return res.status(500).json({ message: 'Failed to update role' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json({ success: true, message: 'Role updated successfully' });
    });
});

// 4. Delete user (admin only)
router.delete('/admin/users/:id', authorizeAdmin, (req, res) => {
    const userId = req.params.id;
    
    db.query('DELETE FROM users WHERE id = ?', [userId], (err, result) => {
        if (err) {
            console.error('Error deleting user:', err);
            return res.status(500).json({ message: 'Failed to delete user' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json({ success: true, message: 'User deleted successfully' });
    });
});

module.exports = router;