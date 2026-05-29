// ==================== FEE COLLECTION ROUTES ====================
const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const jwt = require('jsonwebtoken');

// Authentication middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ message: 'Access denied' });
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'cricket_crm_secret_2026');
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(403).json({ message: 'Invalid token' });
    }
};

// ==================== GET ALL PLAYERS ====================
router.get('/players', authenticateToken, (req, res) => {
    console.log('Fetching players for fee collection');
    
    if (req.user.role !== 'accountant' && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied' });
    }
    
    const query = `
        SELECT id, full_name as player_name 
        FROM users 
        WHERE role = 'player' 
        ORDER BY full_name ASC
    `;
    
    db.query(query, (err, players) => {
        if (err) {
            console.error('Error getting players:', err);
            return res.status(500).json({ message: 'Server error', error: err.message });
        }
        res.json(players || []);
    });
});

// ==================== GET ALL PAYMENTS ====================
router.get('/payments', authenticateToken, (req, res) => {
    console.log('Fetching all payments for fee collection');
    
    if (req.user.role !== 'accountant' && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied' });
    }
    
    const query = `
        SELECT p.*, u.full_name as player_name
        FROM payments p
        JOIN users u ON p.player_id = u.id
        WHERE u.role = 'player'
        ORDER BY p.payment_date DESC
    `;
    
    db.query(query, (err, payments) => {
        if (err) {
            console.error('Error getting payments:', err);
            return res.status(500).json({ message: 'Server error', error: err.message });
        }
        res.json(payments || []);
    });
});

// ==================== ADD PAYMENT ====================
router.post('/payments', authenticateToken, (req, res) => {
    console.log('Adding new payment from fee collection');
    
    if (req.user.role !== 'accountant' && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied' });
    }
    
    const { player_id, amount, payment_mode, payment_date, status, remarks } = req.body;
    
    if (!player_id || !amount || !payment_date) {
        return res.status(400).json({ message: 'Player, amount, and date are required' });
    }
    
    const query = `INSERT INTO payments (player_id, amount, payment_mode, payment_date, status, remarks) VALUES (?, ?, ?, ?, ?, ?)`;
    
    db.query(query, [player_id, amount, payment_mode || 'cash', payment_date, status || 'completed', remarks || null], (err, result) => {
        if (err) {
            console.error('Error adding payment:', err);
            return res.status(500).json({ message: 'Server error', error: err.message });
        }
        res.json({ message: 'Payment added successfully', id: result.insertId });
    });
});

// ==================== UPDATE PAYMENT ====================
router.put('/payments/:id', authenticateToken, (req, res) => {
    console.log('Updating payment ID:', req.params.id);
    
    if (req.user.role !== 'accountant' && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied' });
    }
    
    const { status } = req.body;
    const paymentId = req.params.id;
    
    const query = `UPDATE payments SET status = ? WHERE id = ?`;
    
    db.query(query, [status, paymentId], (err, result) => {
        if (err) {
            console.error('Error updating payment:', err);
            return res.status(500).json({ message: 'Server error', error: err.message });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Payment not found' });
        }
        res.json({ message: 'Payment updated successfully' });
    });
});

// ==================== DELETE PAYMENT ====================
router.delete('/payments/:id', authenticateToken, (req, res) => {
    console.log('Deleting payment ID:', req.params.id);
    
    if (req.user.role !== 'accountant' && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied' });
    }
    
    const paymentId = req.params.id;
    
    const query = `DELETE FROM payments WHERE id = ?`;
    
    db.query(query, [paymentId], (err, result) => {
        if (err) {
            console.error('Error deleting payment:', err);
            return res.status(500).json({ message: 'Server error', error: err.message });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Payment not found' });
        }
        res.json({ message: 'Payment deleted successfully' });
    });
});

module.exports = router;