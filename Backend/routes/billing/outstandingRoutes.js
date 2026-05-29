// ==================== OUTSTANDING ROUTES ====================
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

// ==================== GET ALL OUTSTANDING DUES ====================
router.get('/', authenticateToken, (req, res) => {
    console.log('Fetching outstanding dues with batch info');
    
    if (req.user.role !== 'billing' && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied' });
    }
    
    // Get all players with their batch and fee structure
    const query = `
        SELECT 
            u.id as player_id,
            u.full_name as player_name,
            b.batch_name,
            fs.monthly_fee,
            COALESCE(SUM(CASE WHEN p.status = 'completed' THEN p.amount ELSE 0 END), 0) as total_paid,
            COALESCE(SUM(CASE WHEN p.status = 'pending' THEN p.amount ELSE 0 END), 0) as pending_amount
        FROM users u
        LEFT JOIN players pl ON u.id = pl.user_id
        LEFT JOIN batches b ON pl.batch_id = b.id
        LEFT JOIN fee_structure fs ON b.id = fs.batch_id AND fs.status = 'active'
        LEFT JOIN payments p ON u.id = p.player_id
        WHERE u.role = 'player'
        GROUP BY u.id, u.full_name, b.batch_name, fs.monthly_fee
    `;
    
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching outstanding:', err);
            return res.status(500).json({ error: err.message });
        }
        
        // Calculate total fee (monthly fee) and due amount
        const outstanding = results.map(player => {
            const monthlyFee = parseFloat(player.monthly_fee) || 0;
            const totalPaid = parseFloat(player.total_paid) || 0;
            const pending = parseFloat(player.pending_amount) || 0;
            
            let totalFee = monthlyFee;
            let totalDue = monthlyFee > 0 ? (monthlyFee - totalPaid) : pending;
            
            // Ensure due is not negative
            totalDue = totalDue > 0 ? totalDue : 0;
            
            return {
                player_id: player.player_id,
                player_name: player.player_name,
                batch_name: player.batch_name || 'Not Assigned',
                total_fee: monthlyFee > 0 ? monthlyFee : pending,
                total_paid: totalPaid,
                total_due: totalDue
            };
        }).filter(p => p.total_due > 0);
        
        res.json(outstanding);
    });
});

// ==================== GET OUTSTANDING SUMMARY ====================
router.get('/summary', authenticateToken, (req, res) => {
    const query = `
        SELECT 
            COUNT(DISTINCT u.id) as total_players_with_dues,
            COALESCE(SUM(CASE WHEN p.status = 'pending' THEN p.amount ELSE 0 END), 0) as total_outstanding_amount
        FROM users u
        LEFT JOIN payments p ON u.id = p.player_id
        WHERE u.role = 'player'
    `;
    db.query(query, (err, summary) => {
        if (err) return res.status(500).json({ error: err.message });
        const result = (summary && summary.length > 0) ? summary[0] : { total_players_with_dues: 0, total_outstanding_amount: 0 };
        res.json(result);
    });
});

// ==================== GET PLAYER OUTSTANDING DETAILS ====================
router.get('/player/:id', authenticateToken, (req, res) => {
    const playerId = req.params.id;
    
    // Player details
    const playerQuery = `SELECT id, full_name, email, phone FROM users WHERE id = ? AND role = 'player'`;
    db.query(playerQuery, [playerId], (err, playerResult) => {
        if (err) return res.status(500).json({ error: err.message });
        if (playerResult.length === 0) return res.status(404).json({ message: 'Player not found' });
        
        // Payment summary
        const paymentQuery = `
            SELECT 
                COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0) as total_paid,
                COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as total_due
            FROM payments WHERE player_id = ?
        `;
        db.query(paymentQuery, [playerId], (err, paymentResult) => {
            if (err) return res.status(500).json({ error: err.message });
            
            // Pending invoices
            const invoiceQuery = `
                SELECT id, CONCAT('INV-', id) as invoice_number, amount, payment_date as due_date
                FROM payments WHERE player_id = ? AND status = 'pending'
                ORDER BY payment_date ASC
            `;
            db.query(invoiceQuery, [playerId], (err, invoices) => {
                if (err) return res.status(500).json({ error: err.message });
                
                res.json({
                    player: playerResult[0],
                    payment_summary: paymentResult[0] || { total_paid: 0, total_due: 0 },
                    pending_invoices: invoices || []
                });
            });
        });
    });
});

module.exports = router;