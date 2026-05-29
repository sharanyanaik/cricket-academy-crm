const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const { authenticateToken, authorizeAdmin } = require('../../middleware/auth');
const { addAuditLog } = require('../../utils/auditLog');

// GET all payments 
router.get('/', authenticateToken, authorizeAdmin, (req, res) => {
    const query = `
        SELECT 
            p.id,
            p.player_id,
            u.full_name as player_name,
            b.batch_name,
            p.amount,
            DATE_FORMAT(p.payment_date, '%Y-%m-%d') as payment_date,
            p.payment_mode,
            p.status,
            p.transaction_id,
            p.remarks,
            p.created_at
        FROM payments p
        LEFT JOIN users u ON p.player_id = u.id
        LEFT JOIN players pl ON u.id = pl.user_id
        LEFT JOIN batches b ON pl.batch_id = b.id
        ORDER BY p.id DESC
    `;
    
    db.query(query, (err, result) => {
        if (err) {
            console.error('Error fetching payments:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json(result || []);
    });
});

// GET players list (users with role 'player') - For dropdown
router.get('/players-list', authenticateToken, authorizeAdmin, (req, res) => {
    const query = `
        SELECT u.id, u.full_name as name
        FROM users u
        WHERE u.role = 'player'
        ORDER BY u.full_name
    `;
    
    db.query(query, (err, result) => {
        if (err) {
            console.error('Error fetching players list:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json(result || []);
    });
});

// GET single payment
router.get('/:id', authenticateToken, authorizeAdmin, (req, res) => {
    const paymentId = req.params.id;
    
    const query = `
        SELECT 
            p.id,
            p.player_id,
            u.full_name as player_name,
            p.amount,
            DATE_FORMAT(p.payment_date, '%Y-%m-%d') as payment_date,
            p.payment_mode,
            p.status,
            p.transaction_id,
            p.remarks
        FROM payments p
        LEFT JOIN users u ON p.player_id = u.id
        WHERE p.id = ?
    `;
    
    db.query(query, [paymentId], (err, result) => {
        if (err) {
            console.error('Error fetching payment:', err);
            return res.status(500).json({ error: err.message });
        }
        if (!result || result.length === 0) {
            return res.status(404).json({ message: 'Payment not found' });
        }
        res.json(result[0]);
    });
});

// GET payments by player
router.get('/player/:playerId', authenticateToken, authorizeAdmin, (req, res) => {
    const playerId = req.params.playerId;
    
    const query = `
        SELECT 
            p.id,
            p.player_id,
            u.full_name as player_name,
            b.batch_name,
            p.amount,
            DATE_FORMAT(p.payment_date, '%Y-%m-%d') as payment_date,
            p.payment_mode,
            p.status
        FROM payments p
        LEFT JOIN users u ON p.player_id = u.id
        LEFT JOIN players pl ON u.id = pl.user_id
        LEFT JOIN batches b ON pl.batch_id = b.id
        WHERE p.player_id = ?
        ORDER BY p.payment_date DESC
    `;
    
    db.query(query, [playerId], (err, results) => {
        if (err) {
            console.error('Error fetching player payments:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json(results || []);
    });
});

// POST - Add new payment
router.post('/', authenticateToken, authorizeAdmin, (req, res) => {
    console.log('Received payment data:', req.body);
    
    const { 
        player_id, 
        amount, 
        payment_date, 
        payment_mode, 
        status,
        transaction_id,
        remarks
    } = req.body;
    
    // Validation
    if (!player_id) {
        return res.status(400).json({ message: 'Player is required' });
    }
    
    if (!amount || amount <= 0) {
        return res.status(400).json({ message: 'Valid amount is required' });
    }
    
    if (!payment_date) {
        return res.status(400).json({ message: 'Payment date is required' });
    }
    
    // Generate a unique transaction_id if not provided
    let finalTransactionId = transaction_id;
    if (!finalTransactionId || finalTransactionId.trim() === '') {
        finalTransactionId = `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    }
    
    const query = `
        INSERT INTO payments (player_id, amount, payment_date, payment_mode, status, transaction_id, remarks)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    db.query(query, [
        player_id, 
        amount, 
        payment_date, 
        payment_mode || 'cash', 
        status || 'completed',
        finalTransactionId,
        remarks || null
    ], (err, result) => {
        if (err) {
            console.error('Error inserting payment:', err);
            return res.status(500).json({ error: err.message });
        }
        
        // Add audit log 
        db.query('SELECT full_name FROM users WHERE id = ?', [player_id], (err, userResult) => {
            const playerName = (userResult && userResult[0]) ? userResult[0].full_name : player_id;
            addAuditLog(req.user.id, 'CREATE_PAYMENT', `Added payment of ₹${amount} for player: ${playerName}`);
        });
        
        res.status(201).json({ 
            message: 'Payment recorded successfully', 
            id: result.insertId 
        });
    });
});

// PUT - Update payment
router.put('/:id', authenticateToken, authorizeAdmin, (req, res) => {
    const paymentId = req.params.id;
    const { 
        player_id, 
        amount, 
        payment_date, 
        payment_mode, 
        status,
        transaction_id,
        remarks
    } = req.body;
    
    // Generate a unique transaction_id if not provided or empty
    let finalTransactionId = transaction_id;
    if (!finalTransactionId || finalTransactionId.trim() === '') {
        finalTransactionId = `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    }
    
    const query = `
        UPDATE payments 
        SET player_id = ?, 
            amount = ?, 
            payment_date = ?, 
            payment_mode = ?, 
            status = ?,
            transaction_id = ?,
            remarks = ?
        WHERE id = ?
    `;
    
    db.query(query, [
        player_id, 
        amount, 
        payment_date, 
        payment_mode || 'cash', 
        status || 'completed',
        finalTransactionId,
        remarks || null,
        paymentId
    ], (err, result) => {
        if (err) {
            console.error('Error updating payment:', err);
            return res.status(500).json({ error: err.message });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Payment not found' });
        }
        
        // Add audit log
        addAuditLog(req.user.id, 'UPDATE_PAYMENT', `Updated payment ID: ${paymentId}`);
        
        res.json({ message: 'Payment updated successfully' });
    });
});

// DELETE payment
router.delete('/:id', authenticateToken, authorizeAdmin, (req, res) => {
    const paymentId = req.params.id;
    
    // Get payment details for audit log
    db.query('SELECT amount, player_id FROM payments WHERE id = ?', [paymentId], (err, result) => {
        const amount = (result && result[0]) ? result[0].amount : 'unknown';
        const playerId = (result && result[0]) ? result[0].player_id : 'unknown';
        
        db.query('DELETE FROM payments WHERE id = ?', [paymentId], (err, result) => {
            if (err) {
                console.error('Error deleting payment:', err);
                return res.status(500).json({ error: err.message });
            }
            if (result.affectedRows === 0) {
                return res.status(404).json({ message: 'Payment not found' });
            }
            
            // Add audit log 
            addAuditLog(req.user.id, 'DELETE_PAYMENT', `Deleted payment ID: ${paymentId} (Amount: ₹${amount})`);
            
            res.json({ message: 'Payment deleted successfully' });
        });
    });
});

module.exports = router;