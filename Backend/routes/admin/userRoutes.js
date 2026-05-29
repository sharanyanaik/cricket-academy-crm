const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../../config/db');
const { authenticateToken, authorizeAdmin } = require('../../middleware/auth');
const { addAuditLog } = require('../../utils/auditLog');

// GET all users
router.get('/', authenticateToken, authorizeAdmin, (req, res) => {
    const query = `SELECT id, full_name, email, phone, role, status, date_of_birth, created_at 
                   FROM users 
                   ORDER BY id DESC`;
    
    db.query(query, (err, result) => {
        if (err) {
            console.error('Error fetching users:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json(result);
    });
});

// GET single user
router.get('/:id', authenticateToken, authorizeAdmin, (req, res) => {
    const query = `SELECT id, full_name, email, phone, role, status, date_of_birth 
                   FROM users 
                   WHERE id = ?`;
    
    db.query(query, [req.params.id], (err, result) => {
        if (err) {
            console.error('Error fetching user:', err);
            return res.status(500).json({ error: err.message });
        }
        if (!result || result.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(result[0]);
    });
});

// POST - Add new user
router.post('/', authenticateToken, authorizeAdmin, async (req, res) => {
    const { full_name, email, password, phone, role, date_of_birth, status } = req.body;
    
    console.log('Adding new user:', { full_name, email, role });
    
    // Validation
    if (!password) {
        return res.status(400).json({ message: 'Password is required' });
    }
    if (!full_name || !email) {
        return res.status(400).json({ message: 'Full name and email are required' });
    }
    
    // Check if user exists by email
    db.query('SELECT id FROM users WHERE email = ?', [email], async (err, existing) => {
        if (err) {
            console.error('Error checking existing user:', err);
            return res.status(500).json({ error: err.message });
        }
        if (existing.length > 0) {
            return res.status(400).json({ message: 'Email already exists' });
        }
        
        try {
            const hashedPassword = await bcrypt.hash(password, 10);
            
            // Generate username from email (remove domain and special chars)
            const username = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
            
            // Check if username already exists, append number if needed
            let finalUsername = username;
            let counter = 1;
            let usernameExists = true;
            
            while (usernameExists) {
                const checkQuery = await new Promise((resolve) => {
                    db.query('SELECT id FROM users WHERE username = ?', [finalUsername], (err, result) => {
                        resolve(result && result.length > 0);
                    });
                });
                
                if (checkQuery) {
                    finalUsername = username + counter;
                    counter++;
                } else {
                    usernameExists = false;
                }
            }
            
            const insertQuery = `INSERT INTO users (full_name, username, email, password, phone, role, date_of_birth, status) 
                                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
            
            db.query(insertQuery, [full_name, finalUsername, email, hashedPassword, phone, role || 'player', date_of_birth || null, status || 'active'], 
                (err, result) => {
                if (err) {
                    console.error('Error inserting user:', err);
                    return res.status(500).json({ error: err.message });
                }
                
                const userId = result.insertId;
                
                // Handle role-specific tables
                if (role === 'player') {
                    const playerQuery = `INSERT INTO players (user_id, player_name, status, created_at) 
                                         VALUES (?, ?, ?, NOW())`;
                    db.query(playerQuery, [userId, full_name, status || 'active'], (err) => {
                        if (err) console.error('Error creating player record:', err);
                    });
                } else if (role === 'coach') {
                    const coachQuery = `INSERT INTO coaches (user_id, coach_name, email, phone, status, created_at) 
                                       VALUES (?, ?, ?, ?, ?, NOW())`;
                    db.query(coachQuery, [userId, full_name, email, phone, status || 'active'], (err) => {
                        if (err) console.error('Error creating coach record:', err);
                    });
                } else if (role === 'accountant') {
                    const accountantQuery = `INSERT INTO accountants (user_id, full_name, email, phone, status, created_at) 
                                            VALUES (?, ?, ?, ?, ?, NOW())`;
                    db.query(accountantQuery, [userId, full_name, email, phone, status || 'active'], (err) => {
                        if (err) console.error('Error creating accountant record:', err);
                    });
                } else if (role === 'billing') {
                    const billingQuery = `INSERT INTO billing_staff (user_id, full_name, email, phone, status, created_at) 
                                         VALUES (?, ?, ?, ?, ?, NOW())`;
                    db.query(billingQuery, [userId, full_name, email, phone, status || 'active'], (err) => {
                        if (err) console.error('Error creating billing staff record:', err);
                    });
                } else if (role === 'maintenance') {
                    const maintenanceQuery = `INSERT INTO maintenance_staff (user_id, full_name, phone, status, created_at) 
                                             VALUES (?, ?, ?, ?, NOW())`;
                    db.query(maintenanceQuery, [userId, full_name, phone, status || 'active'], (err) => {
                        if (err) console.error('Error creating maintenance staff record:', err);
                    });
                }
                
                // Add audit log
                const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
                addAuditLog(req.user.id, 'CREATE_USER', `Added new user: ${full_name} (${role})`, ip, req);
                
                res.json({ message: 'User added successfully', id: userId });
            });
        } catch (error) {
            console.error('Bcrypt error:', error);
            res.status(500).json({ message: 'Error processing password' });
        }
    });
});

// PUT - Update user
router.put('/:id', authenticateToken, authorizeAdmin, async (req, res) => {
    const { full_name, email, phone, role, date_of_birth, status, password } = req.body;
    const userId = req.params.id;
    
    try {
        const userExists = await new Promise((resolve) => {
            db.query('SELECT id FROM users WHERE id = ?', [userId], (err, result) => {
                resolve(result && result[0]);
            });
        });
        
        if (!userExists) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        let query, params;
        
        if (password && password.trim() !== '') {
            const hashedPassword = await bcrypt.hash(password, 10);
            query = `UPDATE users SET full_name = ?, email = ?, phone = ?, role = ?, date_of_birth = ?, status = ?, password = ? 
                     WHERE id = ?`;
            params = [full_name, email, phone, role, date_of_birth || null, status || 'active', hashedPassword, userId];
        } else {
            query = `UPDATE users SET full_name = ?, email = ?, phone = ?, role = ?, date_of_birth = ?, status = ? 
                     WHERE id = ?`;
            params = [full_name, email, phone, role, date_of_birth || null, status || 'active', userId];
        }
        
        await new Promise((resolve, reject) => {
            db.query(query, params, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
        
        // Update role
        if (role === 'player') {
            const playerQuery = `INSERT INTO players (user_id, player_name, status) 
                                 VALUES (?, ?, ?)
                                 ON DUPLICATE KEY UPDATE 
                                 player_name = VALUES(player_name),
                                 status = VALUES(status)`;
            db.query(playerQuery, [userId, full_name, status || 'active']);
        }
        
        // Add audit log
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        addAuditLog(req.user.id, 'UPDATE_USER', `Updated user: ${full_name} (ID: ${userId})`, ip, req);
        
        res.json({ message: 'User updated successfully' });
        
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE user
router.delete('/:id', authenticateToken, authorizeAdmin, (req, res) => {
    const userId = req.params.id;
    
    // Get user details for audit log
    db.query('SELECT full_name, role FROM users WHERE id = ?', [userId], (err, result) => {
        const userName = (result && result[0]) ? result[0].full_name : userId;
        const userRole = (result && result[0]) ? result[0].role : 'user';
        
        // Delete from players table first
        db.query('DELETE FROM players WHERE user_id = ?', [userId]);
        
        // Delete user
        db.query('DELETE FROM users WHERE id = ?', [userId], (err) => {
            if (err) {
                console.error('Delete error:', err);
                return res.status(500).json({ error: err.message });
            }
            
            // Add audit log
            const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
            addAuditLog(req.user.id, 'DELETE_USER', `Deleted user: ${userName} (${userRole}) (ID: ${userId})`, ip, req);
            
            res.json({ message: 'User deleted successfully' });
        });
    });
});

module.exports = router;