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

// GET PAYMENT SUMMARY for player
router.get('/summary', authenticateToken, (req, res) => {
    const playerId = req.user.id;
    
    // Get total paid from payments table (only completed payments)
    const paidQuery = `
        SELECT COALESCE(SUM(amount), 0) as total_paid
        FROM payments 
        WHERE player_id = ? AND status = 'completed'
    `;
    
    db.query(paidQuery, [playerId], (err, paidResult) => {
        if (err) {
            console.error('Error fetching paid amount:', err);
            return res.status(500).json({ error: err.message });
        }
        
        const totalPaid = paidResult[0]?.total_paid || 0;
        
        // Get total fees from fee_structure based on player's batch
        const feeQuery = `
            SELECT COALESCE(f.yearly_fee, 0) + COALESCE(f.registration_fee, 0) as total_fees
            FROM users u
            LEFT JOIN batches b ON u.batch_id = b.id
            LEFT JOIN fee_structure f ON b.id = f.batch_id
            WHERE u.id = ?
        `;
        
        db.query(feeQuery, [playerId], (err2, feeResult) => {
            if (err2) {
                console.error('Error fetching fees:', err2);
                return res.status(500).json({ error: err2.message });
            }
            
            const totalFees = feeResult[0]?.total_fees || 0;
            
            res.json({
                totalPaid: totalPaid,
                totalFees: totalFees
            });
        });
    });
});

// GET ALL PAYMENTS 
router.get('/', authenticateToken, (req, res) => {
    const playerId = req.user.id;
    const { page = 1, limit = 10, search = '' } = req.query;
    const offset = (page - 1) * limit;
    
    let query = `SELECT * FROM payments WHERE player_id = ?`;
    let params = [playerId];
    
    if (search) {
        query += ` AND (payment_date LIKE ? OR amount LIKE ? OR transaction_id LIKE ?)`;
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    
    query += ` ORDER BY payment_date DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);
    
    db.query(query, params, (err, payments) => {
        if (err) {
            console.error('Error fetching payments:', err);
            return res.status(500).json({ error: err.message });
        }
        
        let countQuery = `SELECT COUNT(*) as total FROM payments WHERE player_id = ?`;
        let countParams = [playerId];
        
        if (search) {
            countQuery += ` AND (payment_date LIKE ? OR amount LIKE ? OR transaction_id LIKE ?)`;
            countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }
        
        db.query(countQuery, countParams, (err, countResult) => {
            if (err) {
                console.error('Error fetching count:', err);
                return res.status(500).json({ error: err.message });
            }
            
            res.json({
                payments: payments || [],
                total: countResult[0]?.total || 0,
                page: parseInt(page),
                totalPages: Math.ceil((countResult[0]?.total || 0) / limit)
            });
        });
    });
});

// GET RECEIPT for player
router.get('/receipt/:paymentId', authenticateToken, (req, res) => {
    const paymentId = req.params.paymentId;
    const playerId = req.user.id;
    
    const query = `
        SELECT p.*, u.full_name as player_name, b.batch_name
        FROM payments p
        LEFT JOIN users u ON p.player_id = u.id
        LEFT JOIN batches b ON u.batch_id = b.id
        WHERE p.id = ? AND p.player_id = ?
    `;
    
    db.query(query, [paymentId, playerId], (err, result) => {
        if (err) {
            console.error('Error fetching receipt:', err);
            return res.status(500).json({ error: err.message });
        }
        if (result.length === 0) {
            return res.status(404).json({ message: 'Payment not found' });
        }
        res.json(result[0]);
    });
});

module.exports = router;