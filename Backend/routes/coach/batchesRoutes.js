const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const jwt = require('jsonwebtoken');

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

// GET ALL BATCHES 
router.get('/', authenticateToken, (req, res) => {
    let query;
    let params = [];
    
    // If coach is logged in, show only their batches
    if (req.user.role === 'coach') {
        query = `
            SELECT b.*, u.full_name as coach_name
            FROM batches b
            LEFT JOIN users u ON b.coach_id = u.id
            WHERE b.coach_id = ?
            ORDER BY b.timing ASC
        `;
        params = [req.user.id];
    } else {
        // Admin sees all batches
        query = `
            SELECT b.*, u.full_name as coach_name
            FROM batches b
            LEFT JOIN users u ON b.coach_id = u.id
            ORDER BY b.timing ASC
        `;
    }
    
    db.query(query, params, (err, batches) => {
        if (err) {
            console.error('Error fetching batches:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json(batches || []);
    });
});

// GET SINGLE BATCH
router.get('/:id', authenticateToken, (req, res) => {
    const query = `
        SELECT b.*, u.full_name as coach_name
        FROM batches b
        LEFT JOIN users u ON b.coach_id = u.id
        WHERE b.id = ?
    `;
    
    db.query(query, [req.params.id], (err, batch) => {
        if (err) {
            console.error('Error fetching batch:', err);
            return res.status(500).json({ error: err.message });
        }
        if (batch.length === 0) return res.status(404).json({ message: 'Batch not found' });
        res.json(batch[0]);
    });
});

// CREATE NEW BATCH
router.post('/', authenticateToken, (req, res) => {
    // Only admin can create batches
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied. Admin only.' });
    }
    
    const { batch_name, timing, coach_id, max_players, status } = req.body;
    
    if (!batch_name || !timing) {
        return res.status(400).json({ message: 'Batch name and timing are required' });
    }
    
    const query = `
        INSERT INTO batches (batch_name, timing, coach_id, max_players, status)
        VALUES (?, ?, ?, ?, ?)
    `;
    
    db.query(query, [batch_name, timing, coach_id || null, max_players || 25, status || 'active'], 
        (err, result) => {
            if (err) {
                console.error('Error creating batch:', err);
                return res.status(500).json({ error: err.message });
            }
            res.json({ success: true, message: 'Batch created successfully', id: result.insertId });
        }
    );
});

// UPDATE BATCH
router.put('/:id', authenticateToken, (req, res) => {
    // Only admin can update batches
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied. Admin only.' });
    }
    
    const { batch_name, timing, coach_id, max_players, status } = req.body;
    const batchId = req.params.id;
    
    const query = `
        UPDATE batches 
        SET batch_name = ?, timing = ?, coach_id = ?, max_players = ?, status = ?
        WHERE id = ?
    `;
    
    db.query(query, [batch_name, timing, coach_id || null, max_players || 25, status || 'active', batchId], 
        (err, result) => {
            if (err) {
                console.error('Error updating batch:', err);
                return res.status(500).json({ error: err.message });
            }
            
            if (result.affectedRows === 0) {
                return res.status(404).json({ message: 'Batch not found' });
            }
            
            // Update all players 
            const updatePlayersQuery = `UPDATE users SET coach_id = ? WHERE batch_id = ? AND role = 'player'`;
            
            db.query(updatePlayersQuery, [coach_id || null, batchId], (err, updateResult) => {
                if (err) {
                    console.error('Error updating players coach_id:', err);
                }
                
                res.json({ 
                    success: true, 
                    message: 'Batch updated successfully',
                    players_updated: updateResult?.affectedRows || 0
                });
            });
        }
    );
});

// DELETE BATCH
router.delete('/:id', authenticateToken, (req, res) => {
    // Only admin can delete batches
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied. Admin only.' });
    }
    
    // Check if there are players in this batch
    const checkQuery = `SELECT COUNT(*) as count FROM users WHERE batch_id = ? AND role = 'player'`;
    
    db.query(checkQuery, [req.params.id], (err, result) => {
        if (err) {
            console.error('Error checking batch players:', err);
            return res.status(500).json({ error: err.message });
        }
        
        if (result[0].count > 0) {
            return res.status(400).json({ 
                message: `Cannot delete batch. ${result[0].count} players are assigned to this batch.` 
            });
        }
        
        const deleteQuery = `DELETE FROM batches WHERE id = ?`;
        
        db.query(deleteQuery, [req.params.id], (err, result) => {
            if (err) {
                console.error('Error deleting batch:', err);
                return res.status(500).json({ error: err.message });
            }
            
            if (result.affectedRows === 0) {
                return res.status(404).json({ message: 'Batch not found' });
            }
            
            res.json({ success: true, message: 'Batch deleted successfully' });
        });
    });
});

module.exports = router;