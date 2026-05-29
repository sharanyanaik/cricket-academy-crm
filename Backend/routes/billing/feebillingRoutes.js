// ==================== FEE BILLING ROUTES ====================
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

// ==================== GET FEE BILLING DATA ====================
router.get('/billing-data', authenticateToken, (req, res) => {
    console.log('Fetching fee billing data for:', req.query);
    
    if (req.user.role !== 'billing' && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied' });
    }
    
    const { month, year, batch_id } = req.query;
    const selectedMonth = month || new Date().getMonth() + 1;
    const selectedYear = year || new Date().getFullYear();
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    
    // Get all players with their batch and fee structure
    let playersQuery = `
        SELECT 
            u.id as player_id,
            u.full_name as player_name,
            COALESCE(b.batch_name, 'Not Assigned') as batch_name,
            b.id as batch_id,
            COALESCE(fs.yearly_fee, 0) as yearly_fee,
            COALESCE(fs.monthly_fee, 0) as monthly_fee,
            COALESCE(fs.quarterly_fee, 0) as quarterly_fee,
            COALESCE(fs.registration_fee, 0) as registration_fee
        FROM users u
        LEFT JOIN players pl ON u.id = pl.user_id
        LEFT JOIN batches b ON pl.batch_id = b.id
        LEFT JOIN fee_structure fs ON b.id = fs.batch_id AND fs.status = 'active'
        WHERE u.role = 'player'
    `;
    
    if (batch_id && batch_id !== 'all') {
        playersQuery += ` AND b.id = ${batch_id}`;
    }
    
    playersQuery += ` ORDER BY u.full_name`;
    
    db.query(playersQuery, (err, players) => {
        if (err) {
            console.error('Players query error:', err);
            return res.status(500).json({ error: err.message });
        }
        
        if (players.length === 0) {
            return res.json({
                period: { month: selectedMonth, month_name: monthNames[selectedMonth - 1], year: selectedYear },
                billing_data: [],
                summary: { total_fees: 0, total_paid: 0, total_pending: 0, collection_rate: 0 }
            });
        }
        
        // Get TOTAL payments for each player 
        const totalPaymentQuery = `
            SELECT player_id, SUM(amount) as total_paid
            FROM payments
            WHERE status = 'completed'
            GROUP BY player_id
        `;
        
        db.query(totalPaymentQuery, (err, totalPayments) => {
            if (err) {
                console.error('Total payment query error:', err);
                return res.status(500).json({ error: err.message });
            }
            
            const totalPaidMap = {};
            totalPayments.forEach(p => { 
                totalPaidMap[p.player_id] = parseFloat(p.total_paid); 
            });
            
            // Get payments for selected month
            const monthlyPaymentQuery = `
                SELECT player_id, SUM(amount) as paid_this_month
                FROM payments
                WHERE status = 'completed' 
                AND MONTH(payment_date) = ? 
                AND YEAR(payment_date) = ?
                GROUP BY player_id
            `;
            
            db.query(monthlyPaymentQuery, [selectedMonth, selectedYear], (err, monthlyPayments) => {
                if (err) {
                    console.error('Monthly payment query error:', err);
                    return res.status(500).json({ error: err.message });
                }
                
                const monthlyPaidMap = {};
                monthlyPayments.forEach(p => { 
                    monthlyPaidMap[p.player_id] = parseFloat(p.paid_this_month); 
                });
                
                let billingData = [];
                let totalYearlyFees = 0;
                let totalPaidAllTime = 0;
                let totalPendingAll = 0;
                let totalPaidThisMonth = 0;
                
                players.forEach(player => {
                    const yearlyFee = parseFloat(player.yearly_fee) || 0;
                    const totalPaid = totalPaidMap[player.player_id] || 0;
                    const paidThisMonth = monthlyPaidMap[player.player_id] || 0;
                    const pendingAmount = yearlyFee - totalPaid;
                    
                    let status = '';
                    let statusClass = '';
                    let statusText = '';
                    
                    if (totalPaid >= yearlyFee && yearlyFee > 0) {
                        status = 'paid';
                        statusClass = 'badge-paid';
                        statusText = 'Fully Paid';
                    } else if (totalPaid > 0) {
                        status = 'partial';
                        statusClass = 'badge-partial';
                        statusText = 'Partial';
                    } else {
                        status = 'pending';
                        statusClass = 'badge-pending';
                        statusText = 'Pending';
                    }
                    
                    billingData.push({
                        player_id: player.player_id,
                        player_name: player.player_name,
                        batch_name: player.batch_name || 'Not Assigned',
                        batch_id: player.batch_id,
                        yearly_fee: yearlyFee,
                        paid_this_month: paidThisMonth,
                        total_paid: totalPaid,
                        pending_amount: pendingAmount < 0 ? 0 : pendingAmount,
                        status: status,
                        status_class: statusClass,
                        status_text: statusText
                    });
                    
                    totalYearlyFees += yearlyFee;
                    totalPaidAllTime += totalPaid;
                    totalPendingAll += (pendingAmount < 0 ? 0 : pendingAmount);
                    totalPaidThisMonth += paidThisMonth;
                });
                
                res.json({
                    period: {
                        month: selectedMonth,
                        month_name: monthNames[selectedMonth - 1],
                        year: selectedYear
                    },
                    billing_data: billingData,
                    summary: {
                        total_yearly_fees: totalYearlyFees,
                        total_paid_all_time: totalPaidAllTime,
                        total_paid_this_month: totalPaidThisMonth,
                        total_pending: totalPendingAll,
                        collection_rate: totalYearlyFees > 0 ? ((totalPaidAllTime / totalYearlyFees) * 100).toFixed(1) : 0
                    }
                });
            });
        });
    });
});

// ==================== GET PLAYER FEE DETAILS ====================
router.get('/player-fee-details/:playerId', authenticateToken, (req, res) => {
    const playerId = req.params.playerId;
    const { month, year } = req.query;
    const selectedMonth = month || new Date().getMonth() + 1;
    const selectedYear = year || new Date().getFullYear();
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    
    const query = `
        SELECT 
            u.id as player_id,
            u.full_name as player_name,
            u.email,
            u.phone,
            COALESCE(b.batch_name, 'Not Assigned') as batch_name,
            COALESCE(fs.yearly_fee, 0) as yearly_fee,
            COALESCE(fs.monthly_fee, 0) as monthly_fee,
            COALESCE(fs.quarterly_fee, 0) as quarterly_fee,
            COALESCE(fs.registration_fee, 0) as registration_fee,
            COALESCE(p.playing_role, 'Not Specified') as playing_role,
            COALESCE(p.status, 'active') as status
        FROM users u
        LEFT JOIN players p ON u.id = p.user_id
        LEFT JOIN batches b ON p.batch_id = b.id
        LEFT JOIN fee_structure fs ON b.id = fs.batch_id AND fs.status = 'active'
        WHERE u.id = ? AND u.role = 'player'
    `;
    
    db.query(query, [playerId], (err, playerDetails) => {
        if (err) {
            console.error('Error fetching player details:', err);
            return res.status(500).json({ error: err.message });
        }
        
        if (playerDetails.length === 0) {
            return res.status(404).json({ message: 'Player not found' });
        }
        
        // Get all payments for this player
        const paymentQuery = `
            SELECT id, amount, payment_date, payment_mode, status, remarks
            FROM payments
            WHERE player_id = ?
            ORDER BY payment_date DESC
        `;
        
        db.query(paymentQuery, [playerId], (err, payments) => {
            if (err) {
                console.error('Error fetching payments:', err);
                return res.status(500).json({ error: err.message });
            }
            
            // Get total paid
            const totalPaidQuery = `
                SELECT COALESCE(SUM(amount), 0) as total_paid
                FROM payments
                WHERE player_id = ? AND status = 'completed'
            `;
            
            db.query(totalPaidQuery, [playerId], (err, totalResult) => {
                if (err) {
                    console.error('Error fetching total paid:', err);
                    return res.status(500).json({ error: err.message });
                }
                
                const totalPaid = parseFloat(totalResult[0]?.total_paid || 0);
                const yearlyFee = parseFloat(playerDetails[0]?.yearly_fee || 0);
                const pendingAmount = yearlyFee - totalPaid;
                
                res.json({
                    player: playerDetails[0],
                    payments: payments || [],
                    total_paid: totalPaid,
                    pending_amount: pendingAmount < 0 ? 0 : pendingAmount,
                    fee_summary: {
                        yearly_fee: yearlyFee,
                        total_paid: totalPaid,
                        pending: pendingAmount < 0 ? 0 : pendingAmount
                    }
                });
            });
        });
    });
});

// ==================== GET BATCHES ====================
router.get('/batches', authenticateToken, (req, res) => {
    console.log('Fetching batches for billing');
    
    if (req.user.role !== 'billing' && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied' });
    }
    
    // Removed status filter to show all batches
    const query = `SELECT id, batch_name FROM batches ORDER BY batch_name`;
    
    db.query(query, (err, batches) => {
        if (err) {
            console.error('Error fetching batches:', err);
            return res.status(500).json({ error: err.message });
        }
        console.log('Batches found:', batches.length);
        res.json(batches || []);
    });
});

module.exports = router;