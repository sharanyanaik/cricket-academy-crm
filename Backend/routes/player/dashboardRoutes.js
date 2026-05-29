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

// GET /api/player/dashboard
router.get('/', authenticateToken, (req, res) => {
    const playerUserId = req.user.id;
    
    console.log('Fetching dashboard for player user_id:', playerUserId);
    
    // Get player basic info with JOIN to players table
    const playerQuery = `
        SELECT 
            u.id as user_id,
            u.full_name,
            u.email,
            u.phone,
            u.playing_role,
            u.batch_id,
            p.id as player_id
        FROM users u
        LEFT JOIN players p ON p.user_id = u.id
        WHERE u.id = ? AND u.role = 'player'
    `;
    
    db.query(playerQuery, [playerUserId], (err, userResult) => {
        if (err) {
            console.error('Error fetching user:', err);
            return res.status(500).json({ error: err.message });
        }
        
        if (!userResult || userResult.length === 0) {
            return res.status(404).json({ message: 'Player not found' });
        }
        
        const player = userResult[0];
        const batchId = player.batch_id;
        const playerId = player.player_id; 
        
        console.log('Player found:', player);
        console.log('Player ID (from players table):', playerId);
        
        // If player has no batch assigned
        if (!batchId) {
            return res.json({
                success: true,
                playerName: player.full_name,
                playerEmail: player.email,
                playerPhone: player.phone,
                playingRole: player.playing_role || 'Not specified',
                batchName: 'Not Assigned',
                batchTime: 'Not set',
                totalFees: 0,
                totalPaid: 0,
                pendingAmount: 0,
                attendancePercent: 0,
                recentPayments: []
            });
        }
        
        // Get batch name and timing
        db.query('SELECT batch_name, timing FROM batches WHERE id = ?', [batchId], (err, batchResult) => {
            if (err) {
                console.error('Error fetching batch:', err);
                return res.status(500).json({ error: err.message });
            }
            
            const batchName = (batchResult && batchResult[0]) ? batchResult[0].batch_name : 'Not Assigned';
            const batchTime = (batchResult && batchResult[0]) ? batchResult[0].timing : 'Not set';
            
            // Get fee structure for the player's batch
            db.query('SELECT yearly_fee, registration_fee, monthly_fee FROM fee_structure WHERE batch_id = ? AND status = "active" LIMIT 1', [batchId], (err, feeResult) => {
                if (err) {
                    console.error('Error fetching fee structure:', err);
                    return res.status(500).json({ error: err.message });
                }
                
                let totalFees = 0;
                if (feeResult && feeResult[0]) {
                    const yearlyFee = parseFloat(feeResult[0].yearly_fee || 0);
                    const registrationFee = parseFloat(feeResult[0].registration_fee || 0);
                    totalFees = yearlyFee + registrationFee;
                }
                
                // Get total paid amount from payments
                db.query('SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE player_id = ? AND status = "completed"', [playerUserId], (err, paidResult) => {
                    if (err) {
                        console.error('Error fetching paid amount:', err);
                        return res.status(500).json({ error: err.message });
                    }
                    
                    const totalPaid = parseFloat(paidResult[0]?.total || 0);
                    const pendingAmount = Math.max(0, totalFees - totalPaid);
                    
                    // Get attendance stats using JOIN to get the correct player_id
                    const attendanceQuery = `
                        SELECT 
                            COUNT(*) as total_days,
                            SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present_days,
                            SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent_days,
                            SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) as late_days
                        FROM attendance a
                        INNER JOIN players p ON a.player_id = p.id
                        WHERE p.user_id = ?
                    `;
                    
                    db.query(attendanceQuery, [playerUserId], (err, attendanceResult) => {
                        if (err) {
                            console.error('Error fetching attendance:', err);
                            return res.status(500).json({ error: err.message });
                        }
                        
                        const totalDays = (attendanceResult && attendanceResult[0]) ? parseInt(attendanceResult[0].total_days) || 0 : 0;
                        const presentDays = (attendanceResult && attendanceResult[0]) ? parseInt(attendanceResult[0].present_days) || 0 : 0;
                        let attendancePercent = 0;
                        
                        if (totalDays > 0) {
                            attendancePercent = Math.round((presentDays / totalDays) * 100);
                        }
                        
                        console.log(`Attendance for user_id ${playerUserId}: ${presentDays}/${totalDays} = ${attendancePercent}%`);
                        
                        // Get recent payments
                        db.query(`
                            SELECT id, payment_date, amount, payment_mode, status, transaction_id, remarks
                            FROM payments 
                            WHERE player_id = ? 
                            ORDER BY payment_date DESC 
                            LIMIT 5
                        `, [playerUserId], (err, recentPayments) => {
                            if (err) {
                                console.error('Error fetching recent payments:', err);
                                return res.status(500).json({ error: err.message });
                            }
                            
                            res.json({
                                success: true,
                                playerName: player.full_name,
                                playerEmail: player.email,
                                playerPhone: player.phone,
                                playingRole: player.playing_role || 'Not specified',
                                batchName: batchName,
                                batchTime: batchTime,
                                totalFees: totalFees,
                                totalPaid: totalPaid,
                                pendingAmount: pendingAmount,
                                attendancePercent: attendancePercent,
                                recentPayments: recentPayments || []
                            });
                        });
                    });
                });
            });
        });
    });
});

// GET /api/player/dashboard/receipt/:paymentId
router.get('/receipt/:paymentId', authenticateToken, (req, res) => {
    const paymentId = req.params.paymentId;
    const playerUserId = req.user.id;
    
    console.log('Fetching receipt for payment:', paymentId, 'player:', playerUserId);
    
    db.query(`
        SELECT 
            p.id, 
            p.amount, 
            p.payment_date, 
            p.payment_mode, 
            p.status,
            p.transaction_id,
            p.remarks,
            u.full_name as player_name,
            u.email,
            u.phone,
            b.batch_name
        FROM payments p
        LEFT JOIN users u ON p.player_id = u.id
        LEFT JOIN batches b ON u.batch_id = b.id
        WHERE p.id = ? AND p.player_id = ?
    `, [paymentId, playerUserId], (err, result) => {
        if (err) {
            console.error('Receipt query error:', err);
            return res.status(500).json({ error: err.message });
        }
        
        if (!result || result.length === 0) {
            return res.status(404).json({ message: 'Payment not found' });
        }
        
        res.json(result[0]);
    });
});

module.exports = router;