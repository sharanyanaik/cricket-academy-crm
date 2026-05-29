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

// GET ALL PLAYERS FOR THE LOGGED
router.get('/', authenticateToken, (req, res) => {
    const loggedInUserId = req.user.id;
    
    console.log('Fetching players for coach user_id:', loggedInUserId);
    
    const query = `
        SELECT 
            u.id, 
            u.full_name, 
            u.email, 
            u.phone, 
            u.playing_role, 
            u.status,
            u.batch_id,
            u.date_of_birth,
            TIMESTAMPDIFF(YEAR, u.date_of_birth, CURDATE()) as age,
            b.batch_name,
            b.timing as batch_time,
            c.coach_name,
            p.id as player_record_id
        FROM users u 
        LEFT JOIN batches b ON u.batch_id = b.id 
        LEFT JOIN players p ON u.id = p.user_id
        LEFT JOIN coaches c ON p.coach_id = c.id
        WHERE u.role = 'player' 
        AND c.user_id = ?
        ORDER BY u.full_name ASC
    `;
    
    db.query(query, [loggedInUserId], (err, players) => {
        if (err) {
            console.error('Error fetching players:', err);
            return res.status(500).json({ error: err.message });
        }
        console.log(`Found ${players.length} players for coach`);
        res.json(players || []);
    });
});

// GET SINGLE PLAYER 
router.get('/:id', authenticateToken, (req, res) => {
    const userId = req.params.id; // This is user_id from URL
    const loggedInUserId = req.user.id;
    
    console.log(`Fetching player details for user_id: ${userId}, coach_id: ${loggedInUserId}`);
    
    // Get the player record from players table
    db.query('SELECT id as player_record_id, batch_id, coach_id FROM players WHERE user_id = ?', [userId], (err, playerRecord) => {
        if (err) {
            console.error('Error fetching player record:', err);
            return res.status(500).json({ error: err.message });
        }
        
        if (!playerRecord || playerRecord.length === 0) {
            return res.status(404).json({ message: 'Player record not found' });
        }
        
        const playerRecordId = playerRecord[0].player_record_id;
        const batchId = playerRecord[0].batch_id;
        
        // Get player basic info with batch and coach
        const query = `
            SELECT 
                u.id, 
                u.full_name, 
                u.email, 
                u.phone, 
                u.playing_role, 
                u.status,
                u.batch_id,
                u.date_of_birth,
                TIMESTAMPDIFF(YEAR, u.date_of_birth, CURDATE()) as age,
                b.batch_name,
                b.timing as batch_time,
                c.coach_name
            FROM users u 
            LEFT JOIN batches b ON u.batch_id = b.id 
            LEFT JOIN players p ON u.id = p.user_id
            LEFT JOIN coaches c ON p.coach_id = c.id
            WHERE u.id = ? AND u.role = 'player' AND c.user_id = ?
        `;
        
        db.query(query, [userId, loggedInUserId], (err, playerResult) => {
            if (err) {
                console.error('Error fetching player:', err);
                return res.status(500).json({ error: err.message });
            }
            
            if (!playerResult || playerResult.length === 0) {
                return res.status(404).json({ message: 'Player not found or not assigned to you' });
            }
            
            const player = playerResult[0];
            
            // Get attendance stats using the player_record_id (players.id)
            db.query(`
                SELECT 
                    COUNT(*) as total_days,
                    SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present,
                    SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent,
                    SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late,
                    ROUND((SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0)) * 100, 2) as attendance_percentage
                FROM attendance 
                WHERE player_id = ? 
                AND coach_id = ?
            `, [playerRecordId, loggedInUserId], (err, attendanceResult) => {
                if (err) {
                    console.error('Error fetching attendance stats:', err);
                    return res.status(500).json({ error: err.message });
                }
                
                const attendance = attendanceResult[0] || { total_days: 0, present: 0, absent: 0, late: 0, attendance_percentage: 0 };
                
                // Use user_id  for payments because payments.player_id stores user_id
                db.query(`
                    SELECT 
                        id, 
                        amount, 
                        payment_date, 
                        payment_mode, 
                        status,
                        remarks,
                        DATE_FORMAT(payment_date, '%Y-%m-%d') as formatted_date
                    FROM payments 
                    WHERE player_id = ?
                    ORDER BY payment_date DESC
                    LIMIT 5
                `, [userId], (err, payments) => {
                    if (err) {
                        console.error('Error fetching payments:', err);
                        payments = [];
                    }
                    
                    const lastPayment = payments && payments.length > 0 ? payments[0] : null;
                    
                    // FIXED: Use user_id for total paid calculation
                    db.query(`
                        SELECT COALESCE(SUM(amount), 0) as total_paid
                        FROM payments 
                        WHERE player_id = ? AND status = 'completed'
                    `, [userId], (err, totalResult) => {
                        if (err) {
                            console.error('Error fetching total paid:', err);
                            totalResult = [{ total_paid: 0 }];
                        }
                        
                        const totalPaid = totalResult[0]?.total_paid || 0;
                        
                        // Get fee structure for the batch
                        db.query(`
                            SELECT COALESCE(yearly_fee, 0) as yearly_fee
                            FROM fee_structure 
                            WHERE batch_id = ? AND status = 'active'
                            LIMIT 1
                        `, [batchId], (err, feeResult) => {
                            if (err) {
                                console.error('Error fetching fee:', err);
                                feeResult = [{ yearly_fee: 0 }];
                            }
                            
                            const yearlyFee = feeResult[0]?.yearly_fee || 0;
                            const pendingAmount = yearlyFee - totalPaid;
                            
                            res.json({
                                ...player,
                                player_record_id: playerRecordId,
                                attendance: {
                                    total_days: attendance.total_days || 0,
                                    present: attendance.present || 0,
                                    absent: attendance.absent || 0,
                                    late: attendance.late || 0,
                                    attendance_percentage: attendance.attendance_percentage || 0
                                },
                                payments: payments || [],
                                last_payment: lastPayment,
                                total_paid: totalPaid,
                                pending_amount: pendingAmount > 0 ? pendingAmount : 0,
                                yearly_fee: yearlyFee
                            });
                        });
                    });
                });
            });
        });
    });
});

// GET COACH'S BATCHES
router.get('/batches', authenticateToken, (req, res) => {
    const loggedInUserId = req.user.id;
    
    const query = `
        SELECT id, batch_name, timing 
        FROM batches 
        WHERE coach_id = ?
        ORDER BY timing ASC
    `;
    
    db.query(query, [loggedInUserId], (err, batches) => {
        if (err) {
            console.error('Error fetching batches:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json(batches || []);
    });
});

module.exports = router;