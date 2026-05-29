// ==================== EXPENSES ROUTES ====================
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

// ==================== GET ALL EXPENSES ====================
router.get('/expenses', authenticateToken, (req, res) => {
    console.log('Fetching all expenses');
    
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
    console.log('Adding new expense');
    
    if (req.user.role !== 'accountant' && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied' });
    }
    
    const { title, amount, expense_date, notes, category, payment_mode, vendor_name } = req.body;
    
    if (!title || !amount || !expense_date) {
        return res.status(400).json({ message: 'Title, amount, and date are required' });
    }
    
    const query = `INSERT INTO expenses (category, description, amount, expense_date, payment_mode, vendor_name) VALUES (?, ?, ?, ?, ?, ?)`;
    
    db.query(query, [category || 'General', title, amount, expense_date, payment_mode || 'cash', vendor_name || null], (err, result) => {
        if (err) {
            console.error('Error adding expense:', err);
            return res.status(500).json({ message: 'Server error', error: err.message });
        }
        res.json({ message: 'Expense added successfully', id: result.insertId });
    });
});

// ==================== UPDATE EXPENSE ====================
router.put('/expenses/:id', authenticateToken, (req, res) => {
    console.log('Updating expense ID:', req.params.id);
    
    if (req.user.role !== 'accountant' && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied' });
    }
    
    const { title, amount, expense_date, notes, category, payment_mode } = req.body;
    const expenseId = req.params.id;
    
    const query = `UPDATE expenses SET category = ?, description = ?, amount = ?, expense_date = ?, payment_mode = ? WHERE id = ?`;
    
    db.query(query, [category || 'General', title, amount, expense_date, payment_mode || 'cash', expenseId], (err, result) => {
        if (err) {
            console.error('Error updating expense:', err);
            return res.status(500).json({ message: 'Server error', error: err.message });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Expense not found' });
        }
        res.json({ message: 'Expense updated successfully', id: expenseId });
    });
});

// ==================== DELETE EXPENSE ====================
router.delete('/expenses/:id', authenticateToken, (req, res) => {
    console.log('Deleting expense ID:', req.params.id);
    
    if (req.user.role !== 'accountant' && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied' });
    }
    
    const expenseId = req.params.id;
    
    const query = `DELETE FROM expenses WHERE id = ?`;
    
    db.query(query, [expenseId], (err, result) => {
        if (err) {
            console.error('Error deleting expense:', err);
            return res.status(500).json({ message: 'Server error', error: err.message });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Expense not found' });
        }
        res.json({ message: 'Expense deleted successfully' });
    });
});

// ==================== GET EXPENSE BY ID ====================
router.get('/expenses/:id', authenticateToken, (req, res) => {
    console.log('Fetching expense ID:', req.params.id);
    
    if (req.user.role !== 'accountant' && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied' });
    }
    
    const expenseId = req.params.id;
    
    const query = `SELECT * FROM expenses WHERE id = ?`;
    
    db.query(query, [expenseId], (err, expense) => {
        if (err) {
            console.error('Error getting expense:', err);
            return res.status(500).json({ message: 'Server error', error: err.message });
        }
        if (expense.length === 0) {
            return res.status(404).json({ message: 'Expense not found' });
        }
        res.json(expense[0]);
    });
});

module.exports = router;