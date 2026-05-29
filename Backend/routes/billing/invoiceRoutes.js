// ==================== INVOICE ROUTES ====================
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

// ==================== GET ALL INVOICES ====================
router.get('/', authenticateToken, (req, res) => {
    console.log('Fetching all invoices');
    
    if (req.user.role !== 'billing' && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied' });
    }
    
    const { status, from, to, search } = req.query;
    
    let query = `
        SELECT p.id, CONCAT('INV-', p.id) as invoice_number, u.full_name as player_name, 
               COALESCE(b.batch_name, 'Not Assigned') as batch_name,
               DATE_FORMAT(p.payment_date, '%M %Y') as month,
               p.amount, 
               COALESCE(p.due_date, p.payment_date) as due_date, 
               p.status, p.payment_mode, p.remarks,
               CASE 
                   WHEN p.status = 'completed' THEN 'Paid'
                   WHEN p.status = 'pending' AND COALESCE(p.due_date, p.payment_date) < CURDATE() THEN 'Overdue'
                   ELSE 'Pending'
               END as display_status
        FROM payments p
        JOIN users u ON p.player_id = u.id
        LEFT JOIN players pl ON u.id = pl.user_id
        LEFT JOIN batches b ON pl.batch_id = b.id
        WHERE u.role = 'player'
    `;
    
    // Apply status filter
    if (status && status !== 'all') {
        if (status === 'paid') {
            query += ` AND p.status = 'completed'`;
        } else if (status === 'pending') {
            query += ` AND p.status = 'pending'`;
        } else if (status === 'overdue') {
            query += ` AND p.status = 'pending' AND COALESCE(p.due_date, p.payment_date) < CURDATE()`;
        }
    }
    
    // Apply date filters
    if (from) query += ` AND p.payment_date >= '${from}'`;
    if (to) query += ` AND p.payment_date <= '${to}'`;
    
    // Apply search filter
    if (search) query += ` AND (u.full_name LIKE '%${search}%' OR CONCAT('INV-', p.id) LIKE '%${search}%')`;
    
    query += ` ORDER BY p.payment_date DESC`;
    
    db.query(query, (err, invoices) => {
        if (err) {
            console.error('Error fetching invoices:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json(invoices || []);
    });
});

// ==================== GET SINGLE INVOICE ====================
router.get('/:id', authenticateToken, (req, res) => {
    console.log('Fetching invoice ID:', req.params.id);
    
    if (req.user.role !== 'billing' && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied' });
    }
    
    const query = `
        SELECT p.id, CONCAT('INV-', p.id) as invoice_number, u.full_name as player_name,
               u.email, u.phone, u.address,
               COALESCE(b.batch_name, 'Not Assigned') as batch_name,
               DATE_FORMAT(p.payment_date, '%M %Y') as month,
               p.amount, COALESCE(p.due_date, p.payment_date) as due_date, 
               p.status, p.payment_mode, p.remarks, p.created_at,
               CASE 
                   WHEN p.status = 'completed' THEN 'Paid'
                   WHEN p.status = 'pending' AND COALESCE(p.due_date, p.payment_date) < CURDATE() THEN 'Overdue'
                   ELSE 'Pending'
               END as display_status
        FROM payments p
        JOIN users u ON p.player_id = u.id
        LEFT JOIN players pl ON u.id = pl.user_id
        LEFT JOIN batches b ON pl.batch_id = b.id
        WHERE u.role = 'player' AND p.id = ?
    `;
    
    db.query(query, [req.params.id], (err, invoice) => {
        if (err) return res.status(500).json({ error: err.message });
        if (invoice.length === 0) return res.status(404).json({ message: 'Invoice not found' });
        res.json(invoice[0]);
    });
});

// ==================== GENERATE INVOICE ====================
router.post('/', authenticateToken, (req, res) => {
    console.log('Generating new invoice');
    
    if (req.user.role !== 'billing' && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied' });
    }
    
    const { player_id, amount, payment_date, due_date, payment_mode, remarks } = req.body;
    
    if (!player_id || !amount || !payment_date) {
        return res.status(400).json({ message: 'Player, amount, and date are required' });
    }
    
    const finalDueDate = due_date || payment_date;
    
    const query = `INSERT INTO payments (player_id, amount, payment_date, due_date, payment_mode, status, remarks) VALUES (?, ?, ?, ?, ?, 'pending', ?)`;
    
    db.query(query, [player_id, amount, payment_date, finalDueDate, payment_mode || 'cash', remarks || null], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Invoice generated successfully', id: result.insertId, invoice_number: `INV-${result.insertId}` });
    });
});

// ==================== SEND REMINDER ====================
router.post('/:id/remind', authenticateToken, (req, res) => {
    console.log('Sending reminder for invoice:', req.params.id);
    
    if (req.user.role !== 'billing' && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied' });
    }
    
    const query = `
        SELECT CONCAT('INV-', p.id) as invoice_number, u.full_name as player_name, u.email,
               p.amount, COALESCE(p.due_date, p.payment_date) as due_date
        FROM payments p
        JOIN users u ON p.player_id = u.id
        WHERE p.id = ?
    `;
    
    db.query(query, [req.params.id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        if (result.length === 0) return res.status(404).json({ message: 'Invoice not found' });
        
        const invoice = result[0];
        res.json({ message: `Reminder sent to ${invoice.player_name} for invoice ${invoice.invoice_number}` });
    });
});

module.exports = router;