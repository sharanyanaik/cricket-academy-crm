const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const { authenticateToken, authorizeAdmin } = require('../../middleware/auth');

// FINANCIAL REPORTS 
router.get('/financial', authenticateToken, authorizeAdmin, (req, res) => {
    const period = req.query.period || 'month';
    
    let dateCondition = '';
    if (period === 'week') {
        dateCondition = "AND payment_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)";
    } else if (period === 'month') {
        dateCondition = "AND payment_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)";
    } else if (period === 'year') {
        dateCondition = "AND payment_date >= DATE_SUB(CURDATE(), INTERVAL 365 DAY)";
    }
    
    // Get payment totals
    const paymentQuery = `
        SELECT 
            COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0) as total_collection,
            COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as pending_dues
        FROM payments
    `;
    
    // Get expenses totals
    const expenseQuery = `
        SELECT COALESCE(SUM(amount), 0) as total_expenses
        FROM expenses
    `;
    
    db.query(paymentQuery, (err, paymentResults) => {
        if (err) {
            console.error('Error fetching payment report:', err);
            return res.status(500).json({ error: err.message });
        }
        
        db.query(expenseQuery, (err2, expenseResults) => {
            if (err2) {
                console.error('Error fetching expenses:', err2);
                return res.status(500).json({ error: err2.message });
            }
            
            const payments = paymentResults[0] || {};
            const expenses = expenseResults[0] || {};
            const totalCollection = payments.total_collection || 0;
            const totalExpenses = expenses.total_expenses || 0;
            
            // Get recent payments with player names
            const recentQuery = `
                SELECT p.*, u.full_name as player_name
                FROM payments p
                LEFT JOIN users u ON p.player_id = u.id
                ORDER BY p.payment_date DESC
                LIMIT 10
            `;
            
            db.query(recentQuery, (err3, recentPayments) => {
                res.json({
                    total_collection: totalCollection,
                    total_expenses: totalExpenses,
                    pending_dues: payments.pending_dues || 0,
                    net_profit: totalCollection - totalExpenses,
                    recent_payments: recentPayments || []
                });
            });
        });
    });
});

// ==================== ATTENDANCE REPORT ====================
router.get('/attendance', authenticateToken, authorizeAdmin, (req, res) => {
    const query = `
        SELECT 
            a.id,
            a.player_id,
            a.date as attendance_date,
            a.status,
            a.remarks,
            p.player_name,
            COALESCE(b.batch_name, 'Not Assigned') as batch_name
        FROM attendance a
        LEFT JOIN players p ON a.player_id = p.id
        LEFT JOIN batches b ON COALESCE(a.batch_id, p.batch_id) = b.id
        ORDER BY a.date DESC
        LIMIT 200
    `;
    
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching attendance report:', err);
            return res.json([]);
        }
        res.json(results);
    });
});

// ==================== PERFORMANCE REPORT====================
router.get('/performance', authenticateToken, authorizeAdmin, (req, res) => {
    // First get attendance stats separately
    const attendanceQuery = `
        SELECT 
            p.id as player_id,
            p.player_name,
            COUNT(DISTINCT a.id) as total_days,
            SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present_days,
            ROUND((SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) / NULLIF(COUNT(DISTINCT a.id), 0)) * 100, 2) as attendance_rate
        FROM players p
        LEFT JOIN attendance a ON p.id = a.player_id
        GROUP BY p.id
    `;
    
    // Get performance stats separately
    const performanceQuery = `
        SELECT 
            player_id,
            COALESCE(SUM(runs), 0) as total_runs,
            COALESCE(SUM(wickets), 0) as total_wickets,
            COALESCE(SUM(catches), 0) as total_catches
        FROM performance
        GROUP BY player_id
    `;
    
    db.query(attendanceQuery, (err, attendanceResults) => {
        if (err) {
            console.error('Error fetching attendance stats:', err);
            return res.json({ performance: [] });
        }
        
        db.query(performanceQuery, (err2, performanceResults) => {
            if (err2) {
                console.error('Error fetching performance stats:', err2);
                return res.json({ performance: [] });
            }
            
            // Create a map for performance data
            const perfMap = {};
            performanceResults.forEach(p => {
                perfMap[p.player_id] = {
                    runs: p.total_runs,
                    wickets: p.total_wickets,
                    catches: p.total_catches
                };
            });
            
            // Combine attendance and performance data
            const combined = attendanceResults.map(player => {
                const perf = perfMap[player.player_id] || { runs: 0, wickets: 0, catches: 0 };
                return {
                    player_id: player.player_id,
                    player_name: player.player_name,
                    total_days: player.total_days || 0,
                    present_days: player.present_days || 0,
                    attendance_rate: player.attendance_rate || 0,
                    total_runs: perf.runs,
                    total_wickets: perf.wickets,
                    total_catches: perf.catches
                };
            });
            
            // Sort by player name
            combined.sort((a, b) => a.player_name.localeCompare(b.player_name));
            
            res.json({ performance: combined });
        });
    });
});

// ==================== AUDIT LOGS ====================
router.get('/audit-logs', authenticateToken, authorizeAdmin, (req, res) => {
    const limit = parseInt(req.query.limit) || 50;
    
    const query = `
        SELECT 
            al.id,
            al.user_id,
            al.action_type,
            al.details,
            al.created_at,
            u.full_name as user_name,
            u.role as user_role
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
        ORDER BY al.created_at DESC 
        LIMIT ?
    `;
    
    db.query(query, [limit], (err, results) => {
        if (err) {
            console.error('Error fetching audit logs:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json(results || []);
    });
});

// ==================== BATCH PERFORMANCE REPORT ====================
router.get('/batch-performance', authenticateToken, authorizeAdmin, (req, res) => {
    const query = `
        SELECT 
            b.id,
            b.batch_name,
            COUNT(DISTINCT p.id) as total_players,
            COUNT(pay.id) as total_payments,
            COALESCE(SUM(pay.amount), 0) as total_revenue
        FROM batches b
        LEFT JOIN players p ON p.batch_id = b.id
        LEFT JOIN payments pay ON pay.player_id = p.id AND pay.status = 'completed'
        GROUP BY b.id
        ORDER BY total_revenue DESC
    `;
    
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching batch performance:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

module.exports = router;