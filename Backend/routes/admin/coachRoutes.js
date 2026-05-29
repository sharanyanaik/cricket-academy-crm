const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const { authenticateToken, authorizeAdmin } = require('../../middleware/auth');
const { addAuditLog } = require('../../utils/auditLog');

// GET all coaches from coaches table
router.get('/', authenticateToken, authorizeAdmin, (req, res) => {
    const query = `SELECT c.id, c.coach_name, c.email, c.phone, u.date_of_birth, c.specialization, c.experience_years, c.status 
                   FROM coaches c
                   LEFT JOIN users u ON c.user_id = u.id
                   ORDER BY c.coach_name`;
    
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching coaches:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

// GET single coach by ID 
router.get('/:id', authenticateToken, authorizeAdmin, (req, res) => {
    const coachId = req.params.id;
    
    const query = `SELECT c.id, c.coach_name, c.email, c.phone, u.date_of_birth, c.specialization, c.experience_years, c.status 
                   FROM coaches c
                   LEFT JOIN users u ON c.user_id = u.id
                   WHERE c.id = ?`;
    
    db.query(query, [coachId], (err, results) => {
        if (err) {
            console.error('Error fetching coach:', err);
            return res.status(500).json({ error: err.message });
        }
        if (results.length === 0) {
            return res.status(404).json({ message: 'Coach not found' });
        }
        res.json(results[0]);
    });
});

// Add new coach
router.post('/', authenticateToken, authorizeAdmin, async (req, res) => {
    const { full_name, email, phone, date_of_birth, specialization, experience_years, status, password } = req.body;
    
    if (!full_name || !email) {
        return res.status(400).json({ message: 'Name and email are required' });
    }
    
    // Check if email exists in users table
    db.query('SELECT id FROM users WHERE email = ?', [email], async (err, existingUser) => {
        if (err) return res.status(500).json({ error: err.message });
        
        if (existingUser && existingUser.length > 0) {
            return res.status(400).json({ message: 'Email already exists' });
        }
        
        // Check if email exists in coaches table
        db.query('SELECT id FROM coaches WHERE email = ?', [email], (err, existingCoach) => {
            if (err) return res.status(500).json({ error: err.message });
            if (existingCoach.length > 0) {
                return res.status(400).json({ message: 'Email already exists in coaches' });
            }
            
            // Generate username from email
            const username = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
            
            // Use provided password or default
            const bcrypt = require('bcryptjs');
            const defaultPassword = password || 'coach123';
            
            bcrypt.hash(defaultPassword, 10, (err, hashedPassword) => {
                if (err) return res.status(500).json({ error: err.message });
                
                //Create user in users table
                db.query(
                    `INSERT INTO users (full_name, username, email, password, phone, date_of_birth, role, status, created_at) 
                     VALUES (?, ?, ?, ?, ?, ?, 'coach', ?, NOW())`,
                    [full_name, username, email, hashedPassword, phone || null, date_of_birth || null, status || 'active'],
                    (err, userResult) => {
                        if (err) {
                            console.error('Error creating user:', err);
                            return res.status(500).json({ error: err.message });
                        }
                        
                        const userId = userResult.insertId;
                        
                        // Then create coach record linked to the user
                        db.query(
                            `INSERT INTO coaches (user_id, coach_name, email, phone, specialization, experience_years, status, created_at) 
                             VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
                            [userId, full_name, email, phone || null, specialization || 'General', experience_years || 0, status || 'active'],
                            (err, coachResult) => {
                                if (err) {
                                    console.error('Error adding coach:', err);
                                    // Rollback - delete the user if coach insert fails
                                    db.query('DELETE FROM users WHERE id = ?', [userId]);
                                    return res.status(500).json({ error: err.message });
                                }
                                
                                // Add audit log 
                                addAuditLog(req.user.id, 'CREATE_COACH', `Added new coach: ${full_name}`);
                                
                                res.status(201).json({ 
                                    message: 'Coach added successfully with user account', 
                                    id: coachResult.insertId,
                                    user_id: userId
                                });
                            }
                        );
                    }
                );
            });
        });
    });
});

// Update coach
router.put('/:id', authenticateToken, authorizeAdmin, (req, res) => {
    const coachId = req.params.id;
    const { full_name, email, phone, date_of_birth, specialization, experience_years, status } = req.body;
    
    if (!full_name || !email) {
        return res.status(400).json({ message: 'Name and email are required' });
    }
    
    //Get the user_id from coach
    db.query('SELECT user_id FROM coaches WHERE id = ?', [coachId], (err, coachResult) => {
        if (err) return res.status(500).json({ error: err.message });
        if (coachResult.length === 0) return res.status(404).json({ message: 'Coach not found' });
        
        const userId = coachResult[0].user_id;
        
        // Check if email exists for other coaches
        db.query('SELECT id FROM coaches WHERE email = ? AND id != ?', [email, coachId], (err, existing) => {
            if (err) return res.status(500).json({ error: err.message });
            if (existing.length > 0) {
                return res.status(400).json({ message: 'Email already exists for another coach' });
            }
            
            // Update coaches table
            db.query(
                `UPDATE coaches 
                 SET coach_name = ?, email = ?, phone = ?, specialization = ?, experience_years = ?, status = ? 
                 WHERE id = ?`,
                [full_name, email, phone || null, specialization || 'General', experience_years || 0, status || 'active', coachId],
                (err, result) => {
                    if (err) {
                        console.error('Error updating coach:', err);
                        return res.status(500).json({ error: err.message });
                    }
                    
                    if (userId) {
                        db.query(
                            `UPDATE users SET full_name = ?, email = ?, phone = ?, date_of_birth = ?, status = ? WHERE id = ?`,
                            [full_name, email, phone || null, date_of_birth || null, status || 'active', userId],
                            (err) => {
                                if (err) console.error('Error updating user:', err);
                            }
                        );
                    }
                    
                    // Add audit log 
                    addAuditLog(req.user.id, 'UPDATE_COACH', `Updated coach ID: ${coachId} - ${full_name}`);
                    
                    res.json({ message: 'Coach updated successfully' });
                }
            );
        });
    });
});

// Delete coach
router.delete('/:id', authenticateToken, authorizeAdmin, (req, res) => {
    const coachId = req.params.id;
    
    // Get coach name for audit log
    db.query('SELECT coach_name FROM coaches WHERE id = ?', [coachId], (err, nameResult) => {
        const coachName = (nameResult && nameResult[0]) ? nameResult[0].coach_name : coachId;
        
        // Get the user_id associated with this coach
        db.query('SELECT user_id FROM coaches WHERE id = ?', [coachId], (err, coachResult) => {
            if (err) {
                console.error('Error finding coach:', err);
                return res.status(500).json({ error: err.message });
            }
            
            const userId = coachResult[0]?.user_id;
            
            // Update players to set coach_id = NULL
            db.query('UPDATE players SET coach_id = NULL WHERE coach_id = ?', [coachId], (err) => {
                if (err) console.error('Error updating players:', err);
                
                // Delete from coaches table
                db.query('DELETE FROM coaches WHERE id = ?', [coachId], (err, result) => {
                    if (err) {
                        console.error('Error deleting coach:', err);
                        return res.status(500).json({ error: err.message });
                    }
                    if (result.affectedRows === 0) {
                        return res.status(404).json({ message: 'Coach not found' });
                    }
                    
                    // Delete from users table if user_id exists
                    if (userId) {
                        db.query('DELETE FROM users WHERE id = ?', [userId], (err) => {
                            if (err) console.error('Error deleting user:', err);
                        });
                    }
                    
                    // Add audit log 
                    addAuditLog(req.user.id, 'DELETE_COACH', `Deleted coach: ${coachName} (ID: ${coachId})`);
                    
                    res.json({ message: 'Coach deleted successfully' });
                });
            });
        });
    });
});

module.exports = router;