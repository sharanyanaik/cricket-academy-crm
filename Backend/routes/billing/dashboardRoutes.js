// ==================== BILLING DASHBOARD ROUTES ====================
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

// ==================== GET SINGLE INVOICE BY ID ====================
router.get('/invoices/:id', authenticateToken, (req, res) => {
    console.log('Get single invoice called for ID:', req.params.id);
    
    if (req.user.role !== 'billing' && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied' });
    }
    
    const invoiceId = req.params.id;
    
    const query = `
        SELECT p.*, CONCAT('INV-', p.id) as invoice_number, u.full_name as player_name
        FROM payments p
        JOIN users u ON p.player_id = u.id
        WHERE p.id = ?
    `;
    
    db.query(query, [invoiceId], (err, invoice) => {
        if (err) {
            console.error('Error getting invoice:', err);
            return res.status(500).json({ message: 'Server error', error: err.message });
        }
        if (invoice.length === 0) {
            return res.status(404).json({ message: 'Invoice not found' });
        }
        res.json(invoice[0]);
    });
});

// ==================== GET PLAYERS ====================
router.get('/players', authenticateToken, (req, res) => {
    console.log('Fetching players for billing');
    
    if (req.user.role !== 'billing' && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied' });
    }
    
    const query = `SELECT id, full_name as player_name FROM users WHERE role = 'player' ORDER BY full_name ASC`;
    
    db.query(query, (err, players) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(players || []);
    });
});

// ==================== DASHBOARD STATS ====================
router.get('/stats', authenticateToken, (req, res) => {
    console.log('Fetching billing dashboard stats');
    
    if (req.user.role !== 'billing' && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied' });
    }
    
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    
    db.query(`SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'completed' AND MONTH(payment_date) = ? AND YEAR(payment_date) = ?`, [currentMonth, currentYear], (err, monthResult) => {
        if (err) return res.status(500).json({ error: err.message });
        const monthCollection = monthResult[0]?.total || 0;
        
        db.query(`SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'pending'`, (err, pendingResult) => {
            if (err) return res.status(500).json({ error: err.message });
            const outstandingDues = pendingResult[0]?.total || 0;
            
            db.query(`SELECT COUNT(*) as count FROM payments`, (err, invoiceResult) => {
                if (err) return res.status(500).json({ error: err.message });
                const totalInvoices = invoiceResult[0]?.count || 0;
                
                db.query(`SELECT COUNT(*) as count FROM payments WHERE status = 'completed'`, (err, paymentResult) => {
                    if (err) return res.status(500).json({ error: err.message });
                    const paymentsReceived = paymentResult[0]?.count || 0;
                    
                    res.json({
                        month_collection: monthCollection,
                        outstanding_dues: outstandingDues,
                        total_invoices: totalInvoices,
                        payments_received: paymentsReceived
                    });
                });
            });
        });
    });
});

// ==================== RECENT INVOICES ====================
router.get('/recent-invoices', authenticateToken, (req, res) => {
    console.log('Fetching recent invoices');
    
    if (req.user.role !== 'billing' && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied' });
    }
    
    const query = `
        SELECT p.id, CONCAT('INV-', p.id) as invoice_number, u.full_name as player_name, 
               p.amount, p.payment_date as due_date, p.status, p.payment_mode,
               p.created_at
        FROM payments p
        JOIN users u ON p.player_id = u.id
        WHERE u.role = 'player'
        ORDER BY p.id DESC
        LIMIT 10
    `;
    
    db.query(query, (err, invoices) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(invoices || []);
    });
});

module.exports = router;