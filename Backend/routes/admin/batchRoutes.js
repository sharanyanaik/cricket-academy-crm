const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const { authenticateToken, authorizeAdmin } = require('../../middleware/auth');
const { addAuditLog } = require('../../utils/auditLog');

// Get all batches
router.get('/', authenticateToken, authorizeAdmin, (req, res) => {
    const query = `
        SELECT 
            b.*, 
            u.full_name as coach_name
        FROM batches b
        LEFT JOIN users u ON b.coach_id = u.id AND u.role = 'coach'
        ORDER BY b.id DESC
    `;
    
    db.query(query, (err, result) => {
        if (err) {
            console.error('Error fetching batches:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json(result);
    });
});

// GET ALL COACHES FOR DROPDOWN
router.get('/coaches/list', authenticateToken, authorizeAdmin, (req, res) => {
    const query = `
        SELECT id, full_name, email, phone 
        FROM users 
        WHERE role = 'coach' AND status = 'active'
        ORDER BY full_name ASC
    `;
    
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching coaches:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

// Get single batch
router.get('/:id', authenticateToken, authorizeAdmin, (req, res) => {
    const batchId = req.params.id;
    
    const query = `
        SELECT 
            b.*, 
            u.full_name as coach_name
        FROM batches b
        LEFT JOIN users u ON b.coach_id = u.id AND u.role = 'coach'
        WHERE b.id = ?
    `;
    
    db.query(query, [batchId], (err, result) => {
        if (err) {
            console.error('Error fetching batch:', err);
            return res.status(500).json({ error: err.message });
        }
        if (result.length === 0) {
            return res.status(404).json({ message: 'Batch not found' });
        }
        res.json(result[0]);
    });
});

// Add batch
router.post('/', authenticateToken, authorizeAdmin, (req, res) => {
    const { batch_name, timing, coach_id, max_players, status } = req.body;
    
    if (!batch_name || !timing) {
        return res.status(400).json({ message: 'Batch name and timing are required' });
    }
    
    const coachIdValue = (coach_id && coach_id !== '' && coach_id !== 'null') ? parseInt(coach_id) : null;
    
    db.query(
        'INSERT INTO batches (batch_name, timing, coach_id, max_players, status) VALUES (?, ?, ?, ?, ?)',
        [batch_name, timing, coachIdValue, max_players || 20, status || 'active'],
        (err, result) => {
            if (err) {
                console.error('Error adding batch:', err);
                return res.status(500).json({ error: err.message });
            }
            
            // Add audit log for batch creation 
            addAuditLog(req.user.id, 'CREATE_BATCH', `Added new batch: ${batch_name}`);
            
            res.json({ message: 'Batch added successfully', id: result.insertId });
        }
    );
});

// Update batch
router.put('/:id', authenticateToken, authorizeAdmin, (req, res) => {
    const batchId = req.params.id;
    const { batch_name, timing, coach_id, max_players, status } = req.body;
    
    if (!batch_name || !timing) {
        return res.status(400).json({ message: 'Batch name and timing are required' });
    }
    
    const coachIdValue = (coach_id && coach_id !== '' && coach_id !== 'null') ? parseInt(coach_id) : null;
    
    db.query(
        `UPDATE batches 
         SET batch_name = ?, 
             timing = ?, 
             coach_id = ?, 
             max_players = ?, 
             status = ? 
         WHERE id = ?`,
        [batch_name, timing, coachIdValue, max_players || 20, status || 'active', batchId],
        (err, result) => {
            if (err) {
                console.error('Error updating batch:', err);
                return res.status(500).json({ error: err.message });
            }
            if (result.affectedRows === 0) {
                return res.status(404).json({ message: 'Batch not found' });
            }
            
            // Add audit log for batch update 
            addAuditLog(req.user.id, 'UPDATE_BATCH', `Updated batch ID: ${batchId} - ${batch_name}`);
            
            res.json({ message: 'Batch updated successfully' });
        }
    );
});

// Delete batch
router.delete('/:id', authenticateToken, authorizeAdmin, (req, res) => {
    const batchId = req.params.id;
    
    // First get batch name for audit log
    db.query('SELECT batch_name FROM batches WHERE id = ?', [batchId], (err, batchResult) => {
        const batchName = (batchResult && batchResult[0]) ? batchResult[0].batch_name : batchId;
        
        // Check if batch has players before deleting
        db.query('SELECT COUNT(*) as count FROM players WHERE batch_id = ?', [batchId], (err, playerCheck) => {
            if (err) {
                console.error('Error checking players in batch:', err);
                return res.status(500).json({ error: err.message });
            }
            
            if (playerCheck[0].count > 0) {
                return res.status(400).json({ 
                    message: `Cannot delete batch. ${playerCheck[0].count} player(s) are still assigned to this batch. Please reassign them first.` 
                });
            }
            
            db.query('DELETE FROM batches WHERE id = ?', [batchId], (err, deleteResult) => {
                if (err) {
                    console.error('Error deleting batch:', err);
                    return res.status(500).json({ error: err.message });
                }
                if (deleteResult.affectedRows === 0) {
                    return res.status(404).json({ message: 'Batch not found' });
                }
                
                // Add audit log for batch deletion - REMOVED ip and req
                addAuditLog(req.user.id, 'DELETE_BATCH', `Deleted batch: ${batchName} (ID: ${batchId})`);
                
                res.json({ message: 'Batch deleted successfully' });
            });
        });
    });
});

module.exports = router;