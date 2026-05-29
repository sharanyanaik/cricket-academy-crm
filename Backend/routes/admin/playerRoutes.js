const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const { authenticateToken, authorizeAdmin } = require('../../middleware/auth');
const { addAuditLog } = require('../../utils/auditLog');

// GET all players
router.get('/', authenticateToken, authorizeAdmin, (req, res) => {
    const query = `
        SELECT 
            p.id,
            p.user_id,
            p.player_name,
            u.email,
            u.phone,
            u.date_of_birth,
            p.batch_id,
            b.batch_name,
            b.timing as batch_timing,
            p.coach_id,
            c.coach_name,
            p.playing_role,
            p.status,
            p.created_at
        FROM players p
        INNER JOIN users u ON p.user_id = u.id
        LEFT JOIN batches b ON p.batch_id = b.id
        LEFT JOIN coaches c ON p.coach_id = c.id
        WHERE p.status = 'active' OR p.status IS NULL
        ORDER BY p.id DESC
    `;
    
    db.query(query, (err, result) => {
        if (err) {
            console.error('Error fetching players:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json(result || []);
    });
});

// GET single player
router.get('/:id', authenticateToken, authorizeAdmin, (req, res) => {
    const query = `
        SELECT 
            p.id,
            p.user_id,
            p.player_name,
            u.email,
            u.phone,
            u.date_of_birth,
            p.batch_id,
            b.batch_name,
            p.coach_id,
            c.coach_name,
            p.playing_role,
            p.status
        FROM players p
        INNER JOIN users u ON p.user_id = u.id
        LEFT JOIN batches b ON p.batch_id = b.id
        LEFT JOIN coaches c ON p.coach_id = c.id
        WHERE p.id = ?
    `;
    
    db.query(query, [req.params.id], (err, result) => {
        if (err) {
            console.error('Error fetching player:', err);
            return res.status(500).json({ error: err.message });
        }
        if (!result || result.length === 0) {
            return res.status(404).json({ message: 'Player not found' });
        }
        res.json(result[0]);
    });
});

// Helper function to convert user_id to coach_id
async function getCoachIdFromUserId(userId) {
    return new Promise((resolve) => {
        if (!userId) {
            resolve(null);
            return;
        }
        db.query('SELECT id FROM coaches WHERE user_id = ?', [userId], (err, result) => {
            if (err || !result || result.length === 0) {
                resolve(null);
            } else {
                resolve(result[0].id);
            }
        });
    });
}

// POST - Add new player
router.post('/', authenticateToken, authorizeAdmin, async (req, res) => {
    const { 
        player_name, email, phone, date_of_birth, batch_id, coach_id, 
        playing_role, status 
    } = req.body;
    
    console.log('Received player data:', { player_name, email, phone, date_of_birth, batch_id, coach_id, playing_role, status });
    
    if (!player_name || !email) {
        return res.status(400).json({ message: 'Player name and email are required' });
    }
    
    // Convert coach_id from user_id to coaches.id 
    let finalCoachId = null;
    if (coach_id && coach_id !== '') {
        const coachCheck = await new Promise((resolve) => {
            db.query('SELECT id FROM coaches WHERE id = ?', [coach_id], (err, result) => {
                if (result && result.length > 0) {
                    resolve({ exists: true, id: coach_id });
                } else {
                    db.query('SELECT id FROM coaches WHERE user_id = ?', [coach_id], (err, result2) => {
                        if (result2 && result2.length > 0) {
                            resolve({ exists: true, id: result2[0].id });
                        } else {
                            resolve({ exists: false, id: null });
                        }
                    });
                }
            });
        });
        
        if (!coachCheck.exists) {
            return res.status(400).json({ message: 'Selected coach does not exist. Please select a valid coach.' });
        }
        finalCoachId = coachCheck.id;
    }
    
    const username = email.split('@')[0];
    const defaultPassword = '$2a$10$N9qo8uLOickgx2ZMRZoMy.Mqr4e2qY5QRU8Qr3E5FJgQyKqjY5KqK';
    
    // Check if user exists
    db.query('SELECT id FROM users WHERE email = ?', [email], (err, existingUser) => {
        if (err) {
            console.error('Error checking user:', err);
            return res.status(500).json({ error: err.message });
        }
        
        if (existingUser && existingUser.length > 0) {
            // User exists - update
            const userId = existingUser[0].id;
            
            db.query('UPDATE users SET full_name = ?, phone = ?, date_of_birth = ?, role = "player", playing_role = ? WHERE id = ?', 
                [player_name, phone, date_of_birth || null, playing_role || null, userId], 
                (updateErr) => {
                    if (updateErr) {
                        console.error('Error updating user:', updateErr);
                        return res.status(500).json({ error: updateErr.message });
                    }
                    
                    // Check if player already exists
                    db.query('SELECT id FROM players WHERE user_id = ?', [userId], (playerErr, existingPlayer) => {
                        if (existingPlayer && existingPlayer.length > 0) {
                            // Update existing player
                            db.query(
                                `UPDATE players SET 
                                    player_name = ?, batch_id = ?, coach_id = ?, 
                                    playing_role = ?, status = ?
                                WHERE user_id = ?`,
                                [player_name, batch_id || null, finalCoachId, 
                                 playing_role || null, status || 'active', userId],
                                (err) => {
                                    if (err) {
                                        console.error('Error updating player:', err);
                                        return res.status(500).json({ error: err.message });
                                    }
                                    
                                    // Add audit log for update
                                    addAuditLog(req.user.id, 'UPDATE_PLAYER', `Updated player: ${player_name} (ID: ${existingPlayer[0].id})`);
                                    
                                    res.json({ message: 'Player updated successfully', id: existingPlayer[0].id });
                                }
                            );
                        } else {
                            // Create new player
                            db.query(
                                `INSERT INTO players (user_id, player_name, batch_id, coach_id, playing_role, status) 
                                 VALUES (?, ?, ?, ?, ?, ?)`,
                                [userId, player_name, batch_id || null, finalCoachId, 
                                 playing_role || null, status || 'active'],
                                (err, result) => {
                                    if (err) {
                                        console.error('Error creating player:', err);
                                        return res.status(500).json({ error: err.message });
                                    }
                                    
                                    // Add audit log for create - REMOVED ip and req
                                    addAuditLog(req.user.id, 'CREATE_PLAYER', `Added new player: ${player_name}`);
                                    
                                    res.json({ message: 'Player added successfully', id: result.insertId });
                                }
                            );
                        }
                    });
                }
            );
        } else {
            // Create new user
            db.query(
                'INSERT INTO users (full_name, username, email, phone, date_of_birth, role, playing_role, password, status) VALUES (?, ?, ?, ?, ?, "player", ?, ?, ?)',
                [player_name, username, email, phone, date_of_birth || null, playing_role || null, defaultPassword, status || 'active'],
                (insertErr, result) => {
                    if (insertErr) {
                        console.error('Error creating user:', insertErr);
                        return res.status(500).json({ error: insertErr.message });
                    }
                    
                    const userId = result.insertId;
                    
                    // Create player record
                    db.query(
                        `INSERT INTO players (user_id, player_name, batch_id, coach_id, playing_role, status) 
                         VALUES (?, ?, ?, ?, ?, ?)`,
                        [userId, player_name, batch_id || null, finalCoachId, 
                         playing_role || null, status || 'active'],
                        (err) => {
                            if (err) {
                                console.error('Error creating player:', err);
                                return res.status(500).json({ error: err.message });
                            }
                            
                            // Add audit log for create 
                            addAuditLog(req.user.id, 'CREATE_PLAYER', `Added new player: ${player_name}`);
                            
                            res.json({ message: 'Player added successfully', id: userId });
                        }
                    );
                }
            );
        }
    });
});

// PUT - Update player
router.put('/:id', authenticateToken, authorizeAdmin, async (req, res) => {
    const playerId = req.params.id;
    const { 
        player_name, email, phone, date_of_birth, batch_id, coach_id, 
        playing_role, status 
    } = req.body;
    
    console.log('Updating player:', { playerId, player_name, email, date_of_birth, batch_id, coach_id });
    
    // Convert coach_id from user_id to coaches.id 
    let finalCoachId = null;
    if (coach_id && coach_id !== '') {
        const coachCheck = await new Promise((resolve) => {
            db.query('SELECT id FROM coaches WHERE id = ?', [coach_id], (err, result) => {
                if (result && result.length > 0) {
                    resolve({ exists: true, id: coach_id });
                } else {
                    db.query('SELECT id FROM coaches WHERE user_id = ?', [coach_id], (err, result2) => {
                        if (result2 && result2.length > 0) {
                            resolve({ exists: true, id: result2[0].id });
                        } else {
                            resolve({ exists: false, id: null });
                        }
                    });
                }
            });
        });
        
        if (!coachCheck.exists) {
            return res.status(400).json({ message: 'Selected coach does not exist. Please select a valid coach.' });
        }
        finalCoachId = coachCheck.id;
    }
    
    // First get user_id from player
    db.query('SELECT user_id FROM players WHERE id = ?', [playerId], (err, result) => {
        if (err) {
            console.error('Error finding player:', err);
            return res.status(500).json({ error: err.message });
        }
        
        if (!result || result.length === 0) {
            return res.status(404).json({ message: 'Player not found' });
        }
        
        const userId = result[0].user_id;
        
        // Update users table
        db.query('UPDATE users SET full_name = ?, email = ?, phone = ?, date_of_birth = ?, playing_role = ?, status = ? WHERE id = ?',
            [player_name, email, phone, date_of_birth || null, playing_role || null, status || 'active', userId],
            (userErr) => {
                if (userErr) {
                    console.error('Error updating user:', userErr);
                    return res.status(500).json({ error: userErr.message });
                }
                
                // Update players table
                db.query(
                    `UPDATE players SET 
                        player_name = ?, batch_id = ?, coach_id = ?, 
                        playing_role = ?, status = ?
                    WHERE id = ?`,
                    [player_name, batch_id || null, finalCoachId, 
                     playing_role || null, status || 'active', playerId],
                    (playerErr) => {
                        if (playerErr) {
                            console.error('Error updating player:', playerErr);
                            return res.status(500).json({ error: playerErr.message });
                        }
                        
                        // Add audit log for update - REMOVED ip and req
                        addAuditLog(req.user.id, 'UPDATE_PLAYER', `Updated player: ${player_name} (ID: ${playerId})`);
                        
                        res.json({ message: 'Player updated successfully' });
                    }
                );
            }
        );
    });
});

// DELETE
router.delete('/:id', authenticateToken, authorizeAdmin, (req, res) => {
    const playerId = req.params.id;
    
    // Get player name for audit log
    db.query('SELECT player_name FROM players WHERE id = ?', [playerId], (err, result) => {
        const playerName = (result && result[0]) ? result[0].player_name : playerId;
        
        db.query('UPDATE players SET status = "inactive" WHERE id = ?', [playerId], (err) => {
            if (err) {
                console.error('Error deleting player:', err);
                return res.status(500).json({ error: err.message });
            }
            
            // Add audit log for soft delete 
            addAuditLog(req.user.id, 'DELETE_PLAYER', `Deactivated player: ${playerName} (ID: ${playerId})`);
            
            res.json({ message: 'Player deactivated successfully' });
        });
    });
});

module.exports = router;