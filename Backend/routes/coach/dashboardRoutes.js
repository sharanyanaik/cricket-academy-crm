const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ success: false, message: 'Access denied - No token provided' });
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'cricket_crm_secret_2026');
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(403).json({ success: false, message: 'Invalid or expired token' });
    }
};

router.get('/stats', authenticateToken, (req, res) => {
    console.log('Fetching coach dashboard data for user:', req.user);
    
    if (!req.user || (req.user.role !== 'coach' && req.user.role !== 'admin')) {
        return res.status(403).json({ success: false, message: 'Access denied - Coach role required' });
    }
    
    const loggedInUserId = req.user.id;
    
    // Get coach's actual ID from coaches table
    db.query('SELECT id, coach_name FROM coaches WHERE user_id = ?', [loggedInUserId], (err, coachInfo) => {
        if (err) {
            console.error('Error finding coach:', err);
            return res.status(500).json({ success: false, error: err.message });
        }
        
        if (!coachInfo || coachInfo.length === 0) {
            return res.json({
                success: true,
                totalPlayers: 0,
                presentToday: 0,
                batches: [],
                playerStats: { batsmen: 0, bowlers: 0, all_rounders: 0, wicket_keepers: 0 },
                recentPlayers: []
            });
        }
        
        const coachDbId = coachInfo[0].id;
        
        // Get ALL batches assigned to this coach
        db.query(`
            SELECT b.id, b.batch_name, b.timing,
                   (SELECT COUNT(*) FROM players WHERE batch_id = b.id AND status = 'active') as player_count
            FROM batches b
            WHERE b.coach_id = ?
            ORDER BY b.timing ASC
        `, [loggedInUserId], (err, batches) => {
            if (err) {
                console.error('Error fetching batches:', err);
                return res.status(500).json({ success: false, error: err.message });
            }
            
            // Get total players assigned to this coach
            db.query('SELECT COUNT(*) as count FROM players WHERE coach_id = ? AND status = "active"', [coachDbId], (err, playersResult) => {
                if (err) {
                    console.error('Error fetching players:', err);
                    return res.status(500).json({ success: false, error: err.message });
                }
                
                const totalPlayers = playersResult[0]?.count || 0;
                
                // Get present today count
                db.query(`
                    SELECT COUNT(*) as count 
                    FROM attendance a 
                    JOIN players p ON a.player_id = p.id 
                    WHERE p.coach_id = ? AND a.date = CURDATE() AND a.status = 'present'
                `, [coachDbId], (err, attendanceResult) => {
                    if (err) {
                        console.error('Error fetching attendance:', err);
                        return res.status(500).json({ success: false, error: err.message });
                    }
                    
                    const presentToday = attendanceResult[0]?.count || 0;
                    
                    // Get player role statistics
                    db.query(`
                        SELECT 
                            SUM(CASE WHEN playing_role = 'batsman' THEN 1 ELSE 0 END) as batsmen,
                            SUM(CASE WHEN playing_role = 'bowler' THEN 1 ELSE 0 END) as bowlers,
                            SUM(CASE WHEN playing_role = 'all-rounder' THEN 1 ELSE 0 END) as all_rounders,
                            SUM(CASE WHEN playing_role = 'wicket-keeper' THEN 1 ELSE 0 END) as wicket_keepers
                        FROM players 
                        WHERE coach_id = ? AND status = 'active'
                    `, [coachDbId], (err, statsResult) => {
                        if (err) {
                            console.error('Error fetching stats:', err);
                            return res.status(500).json({ success: false, error: err.message });
                        }
                        
                        const playerStats = statsResult[0] || { batsmen: 0, bowlers: 0, all_rounders: 0, wicket_keepers: 0 };
                        
                        // Get recent players
                        db.query(`
                            SELECT p.player_name, p.playing_role, b.batch_name
                            FROM players p
                            LEFT JOIN batches b ON p.batch_id = b.id
                            WHERE p.coach_id = ? AND p.status = 'active'
                            ORDER BY p.id DESC
                            LIMIT 10
                        `, [coachDbId], (err, recentPlayers) => {
                            if (err) {
                                console.error('Error fetching recent players:', err);
                                return res.status(500).json({ success: false, error: err.message });
                            }
                            
                            res.json({
                                success: true,
                                totalPlayers: totalPlayers,
                                presentToday: presentToday,
                                batches: batches || [],
                                playerStats: playerStats,
                                recentPlayers: recentPlayers || []
                            });
                        });
                    });
                });
            });
        });
    });
});

router.get('/health', (req, res) => {
    res.json({ success: true, message: 'Coach dashboard routes are working' });
});

module.exports = router;