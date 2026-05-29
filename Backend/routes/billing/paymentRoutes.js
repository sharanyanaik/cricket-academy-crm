// ==================== PAYMENT ROUTES ====================
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

// ==================== RECORD PAYMENT ====================
router.post('/record', authenticateToken, (req, res) => {
    console.log('Recording new payment');
    
    if (req.user.role !== 'billing' && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied' });
    }
    
    const { player_id, amount, payment_date, payment_mode, transaction_id, status, remarks } = req.body;
    
    if (!player_id || !amount || !payment_date) {
        return res.status(400).json({ message: 'Player, amount, and date are required' });
    }
    
    const query = `INSERT INTO payments (player_id, amount, payment_date, payment_mode, transaction_id, status, remarks) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    
    db.query(query, [player_id, amount, payment_date, payment_mode || 'cash', transaction_id || null, status || 'completed', remarks || null], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Payment recorded successfully', id: result.insertId });
    });
});

// ==================== GET ALL PAYMENTS ====================
router.get('/all', authenticateToken, (req, res) => {
    console.log('Fetching all payments');
    
    if (req.user.role !== 'billing' && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied' });
    }
    
    const query = `
        SELECT p.id, p.amount, p.payment_date, p.payment_mode, p.transaction_id, p.status, p.remarks,
               u.full_name as player_name
        FROM payments p
        JOIN users u ON p.player_id = u.id
        WHERE u.role = 'player'
        ORDER BY p.payment_date DESC
        LIMIT 20
    `;
    
    db.query(query, (err, payments) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(payments || []);
    });
});

// ==================== GET PAYMENT BY ID ====================
router.get('/:id', authenticateToken, (req, res) => {
    console.log('Fetching payment ID:', req.params.id);
    
    if (req.user.role !== 'billing' && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied' });
    }
    
    const query = `
        SELECT p.*, u.full_name as player_name
        FROM payments p
        JOIN users u ON p.player_id = u.id
        WHERE p.id = ?
    `;
    
    db.query(query, [req.params.id], (err, payment) => {
        if (err) return res.status(500).json({ error: err.message });
        if (payment.length === 0) return res.status(404).json({ message: 'Payment not found' });
        res.json(payment[0]);
    });
});

// ==================== UPDATE PAYMENT STATUS ====================
router.put('/:id/status', authenticateToken, (req, res) => {
    console.log('Updating payment status for ID:', req.params.id);
    
    if (req.user.role !== 'billing' && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied' });
    }
    
    const { status } = req.body;
    const paymentId = req.params.id;
    
    const query = `UPDATE payments SET status = ? WHERE id = ?`;
    
    db.query(query, [status, paymentId], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Payment not found' });
        res.json({ message: 'Payment status updated successfully' });
    });
});

// ==================== GET PAYMENTS BY PLAYER ====================
router.get('/player/:playerId', authenticateToken, (req, res) => {
    console.log('Fetching payments for player:', req.params.playerId);
    
    if (req.user.role !== 'billing' && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied' });
    }
    
    const query = `
        SELECT * FROM payments 
        WHERE player_id = ? 
        ORDER BY payment_date DESC
    `;
    
    db.query(query, [req.params.playerId], (err, payments) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(payments || []);
    });
});

module.exports = router;