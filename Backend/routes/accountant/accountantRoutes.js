// ==================== ACCOUNTANT ROUTES ====================
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

// ==================== DASHBOARD STATS ====================
router.get('/dashboard/stats', authenticateToken, (req, res) => {
    console.log('Dashboard stats called');
    
    db.query(`SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'completed'`, (err, collectionResult) => {
        if (err) return res.status(500).json({ error: err.message });
        
        db.query(`SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'pending'`, (err, pendingResult) => {
            if (err) return res.status(500).json({ error: err.message });
            
            db.query(`SELECT COALESCE(SUM(amount), 0) as total FROM expenses`, (err, expenseResult) => {
                if (err) return res.status(500).json({ error: err.message });
                
                const totalCollections = parseFloat(collectionResult[0]?.total) || 0;
                const pendingDues = parseFloat(pendingResult[0]?.total) || 0;
                const totalExpenses = parseFloat(expenseResult[0]?.total) || 0;
                const netBalance = totalCollections - totalExpenses;
                
                res.json({
                    total_collections: totalCollections,
                    pending_dues: pendingDues,
                    total_expenses: totalExpenses,
                    net_balance: netBalance
                });
            });
        });
    });
});

// ==================== RECENT COLLECTIONS ====================
router.get('/dashboard/recent-collections', authenticateToken, (req, res) => {
    console.log('Recent collections called by user:', req.user);
    
    if (req.user.role !== 'accountant' && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied' });
    }
    
    const query = `
        SELECT p.id, p.payment_date, u.full_name as player_name, p.amount, p.payment_mode, p.status
        FROM payments p
        JOIN users u ON p.player_id = u.id
        WHERE u.role = 'player'
        ORDER BY p.payment_date DESC
        LIMIT 10
    `;
    
    db.query(query, (err, collections) => {
        if (err) {
            console.error('Error getting collections:', err);
            return res.status(500).json({ message: 'Server error', error: err.message });
        }
        
        console.log('Collections found:', collections?.length || 0);
        res.json(collections || []);
    });
});

// ==================== ALL PAYMENTS ====================
router.get('/payments', authenticateToken, (req, res) => {
    console.log('All payments called');
    
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

// ==================== GET SINGLE PAYMENT ====================
router.get('/payments/:id', authenticateToken, (req, res) => {
    console.log('Get single payment called for ID:', req.params.id);
    
    if (req.user.role !== 'accountant' && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied' });
    }
    
    const paymentId = req.params.id;
    
    const query = `
        SELECT p.*, u.full_name as player_name
        FROM payments p
        JOIN users u ON p.player_id = u.id
        WHERE p.id = ?
    `;
    
    db.query(query, [paymentId], (err, payment) => {
        if (err) {
            console.error('Error getting payment:', err);
            return res.status(500).json({ message: 'Server error', error: err.message });
        }
        if (payment.length === 0) {
            return res.status(404).json({ message: 'Payment not found' });
        }
        res.json(payment[0]);
    });
});

// ==================== ALL EXPENSES ====================
router.get('/expenses', authenticateToken, (req, res) => {
    console.log('All expenses called');
    
    if (req.user.role !== 'accountant' && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied' });
    }
    
    const query = `SELECT * FROM expenses ORDER BY expense_date DESC`;
    
    db.query(query, (err, expenses) => {
        if (err) {
            console.error('Error getting expenses:', err);
            return res.status(500).json({ message: 'Server error', error: err.message });
        }
        res.json(expenses || []);
    });
});

// ==================== ADD EXPENSE ====================
router.post('/expenses', authenticateToken, (req, res) => {
    console.log('Add expense called');
    
    if (req.user.role !== 'accountant' && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied' });
    }
    
    const { category, description, amount, expense_date, payment_mode, vendor_name } = req.body;
    
    if (!category || !amount || !expense_date) {
        return res.status(400).json({ message: 'Category, amount, and date are required' });
    }
    
    const query = `INSERT INTO expenses (category, description, amount, expense_date, payment_mode, vendor_name) VALUES (?, ?, ?, ?, ?, ?)`;
    
    db.query(query, [category, description, amount, expense_date, payment_mode || 'cash', vendor_name || null], (err, result) => {
        if (err) {
            console.error('Error adding expense:', err);
            return res.status(500).json({ message: 'Server error', error: err.message });
        }
        res.json({ message: 'Expense added successfully', id: result.insertId });
    });
});

// ==================== ADD PAYMENT ====================
router.post('/payments', authenticateToken, (req, res) => {
    console.log('Add payment called');
    
    if (req.user.role !== 'accountant' && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied' });
    }
    
    const { player_id, amount, payment_date, payment_mode, status, transaction_id, remarks } = req.body;
    
    if (!player_id || !amount || !payment_date) {
        return res.status(400).json({ message: 'Player, amount, and date are required' });
    }
    
    const query = `INSERT INTO payments (player_id, amount, payment_date, payment_mode, status, transaction_id, remarks) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    
    db.query(query, [player_id, amount, payment_date, payment_mode || 'cash', status || 'pending', transaction_id || null, remarks || null], (err, result) => {
        if (err) {
            console.error('Error adding payment:', err);
            return res.status(500).json({ message: 'Server error', error: err.message });
        }
        res.json({ message: 'Payment added successfully', id: result.insertId });
    });
});

// ==================== UPDATE PAYMENT STATUS ====================
router.put('/payments/:id', authenticateToken, (req, res) => {
    console.log('Update payment called for ID:', req.params.id);
    
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
        res.json({ message: 'Payment status updated successfully' });
    });
});

module.exports = router;