const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const { authenticateToken, authorizeAdmin } = require('../../middleware/auth');

// Dashboard stats
router.get('/stats', authenticateToken, (req, res) => {
    const queries = {
        total_players: 'SELECT COUNT(*) as count FROM users WHERE role = "player"',
        total_coaches: 'SELECT COUNT(*) as count FROM users WHERE role = "coach"', 
        total_batches: 'SELECT COUNT(*) as count FROM batches',
        total_collected: `SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'completed'`,
        total_pending: `SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'pending'`
    };
    
    const results = {};
    let completed = 0;
    const total = Object.keys(queries).length;
    
    for (let key in queries) {
        db.query(queries[key], (err, result) => {
            if (!err && result && result[0]) {
                results[key] = result[0].count || result[0].total || 0;
            } else {
                results[key] = 0;
                if (err) console.error(`Error fetching ${key}:`, err);
            }
            completed++;
            if (completed === total) {
                console.log('Stats results:', results);
                res.json(results);
            }
        });
    }
});

// Get User Stats for Dashboard 
router.get('/user-stats', authenticateToken, (req, res) => {
    const userStats = {
        totalUsers: 0,
        totalAdmins: 0,
        totalPlayers: 0,
        totalCoaches: 0,
        recentUsers: []
    };
    
    db.query('SELECT COUNT(*) as count FROM users', (err, result) => {
        if (!err && result[0]) userStats.totalUsers = result[0].count;
        
        db.query('SELECT COUNT(*) as count FROM users WHERE role = "admin"', (err, result) => {
            if (!err && result[0]) userStats.totalAdmins = result[0].count;
            
            db.query('SELECT COUNT(*) as count FROM users WHERE role = "player"', (err, result) => {
                if (!err && result[0]) userStats.totalPlayers = result[0].count;
                
                db.query('SELECT COUNT(*) as count FROM users WHERE role = "coach"', (err, result) => {
                    if (!err && result[0]) userStats.totalCoaches = result[0].count;
                    
                    // Get recent users 
                    db.query(
                        `SELECT 
                            u.id, 
                            u.full_name, 
                            u.username, 
                            u.email, 
                            u.role, 
                            u.phone,
                            u.date_of_birth,
                            DATE_FORMAT(u.date_of_birth, '%Y-%m-%d') as dob_formatted,
                            TIMESTAMPDIFF(YEAR, u.date_of_birth, CURDATE()) as age,
                            u.status,
                            u.created_at,
                            p.batch_id,
                            p.playing_role,
                            b.batch_name
                        FROM users u
                        LEFT JOIN players p ON u.id = p.user_id
                        LEFT JOIN batches b ON p.batch_id = b.id
                        WHERE u.role = 'player'
                        ORDER BY u.id DESC 
                        LIMIT 5`,
                        (err, results) => {
                            if (!err && results) {
                                userStats.recentUsers = results.map(user => ({
                                    ...user,
                                    age: user.age || (user.date_of_birth ? 'N/A' : 'Not provided'),
                                    date_of_birth: user.date_of_birth ? new Date(user.date_of_birth).toLocaleDateString('en-IN') : 'Not provided',
                                    batch_display: user.batch_name || 'Not Assigned'
                                }));
                            }
                            res.json(userStats);
                        }
                    );
                });
            });
        });
    });
});

// Get recent players with batch, badge information AND DOB 
router.get('/players', authenticateToken, (req, res) => {
    const query = `
        SELECT 
            u.id, 
            u.full_name as player_name,
            u.email,
            u.phone,
            u.date_of_birth,
            DATE_FORMAT(u.date_of_birth, '%Y-%m-%d') as dob_formatted,
            TIMESTAMPDIFF(YEAR, u.date_of_birth, CURDATE()) as age,
            u.status,
            u.created_at,
            -- Player specific fields from players table
            p.id as player_record_id,
            p.batch_id,
            p.playing_role,
            p.player_role,
            p.age as player_age,
            p.parent_name,
            p.parent_phone,
            p.address,
            p.joining_date,
            -- Batch information
            b.id as batch_database_id,
            b.batch_name,
            b.timing as batch_timing,
            b.status as batch_status,
            -- Coach information
            c.id as coach_id,
            c.full_name as coach_name,
            -- Badge information
            COALESCE(bdg.badge_name, 'No Badge') as badge_name,
            COALESCE(bdg.badge_level, 'none') as badge_level,
            -- Formatted displays
            COALESCE(b.batch_name, 'Not Assigned') as batch_display,
            CASE 
                WHEN p.batch_id IS NOT NULL AND b.id IS NOT NULL 
                THEN CONCAT(b.batch_name, ' (', IFNULL(b.timing, 'No Timing'), ')')
                ELSE 'Not Assigned'
            END as batch_info,
            CASE 
                WHEN u.date_of_birth IS NOT NULL 
                THEN CONCAT(TIMESTAMPDIFF(YEAR, u.date_of_birth, CURDATE()), ' years')
                ELSE 'Not provided'
            END as age_display,
            CASE 
                WHEN p.id IS NULL THEN ' Missing Player Record'
                WHEN p.batch_id IS NULL THEN 'No Batch Assigned'
                ELSE 'Batch Assigned'
            END as batch_assignment_status
        FROM users u
        INNER JOIN players p ON u.id = p.user_id
        LEFT JOIN batches b ON p.batch_id = b.id
        LEFT JOIN users c ON b.coach_id = c.id AND c.role IN ('coach', 'admin')
        LEFT JOIN user_badges ub ON u.id = ub.user_id AND ub.is_active = 1
        LEFT JOIN badges bdg ON ub.badge_id = bdg.id
        WHERE u.role = 'player'
        ORDER BY u.id DESC 
        LIMIT 10
    `;
    
    db.query(query, (err, result) => {
        if (err) {
            console.error('Players query error:', err);
            return res.status(500).json({ error: err.message });
        }
        
        const processedResults = (result || []).map(player => ({
            ...player,
            batch_name: player.batch_name || 'Not Assigned',
            batch_display: player.batch_display || 'Not Assigned',
            batch_info: player.batch_info || 'Not Assigned',
            has_batch: !!player.batch_id,
            has_player_record: !!player.player_record_id,
            status_badge: player.status === 'active' ? 'Active' : 'Inactive',
            dob_display: player.date_of_birth ? new Date(player.date_of_birth).toLocaleDateString('en-IN') : 'Not provided',
            age_display: player.age_display || 'Not calculated'
        }));
        
        console.log(`Found ${processedResults.length} recent players with batch and DOB info`);
        res.json(processedResults);
    });
});

// Get all users with DOB and age 
router.get('/all-users', authenticateToken, authorizeAdmin, (req, res) => {
    const query = `
        SELECT 
            u.id,
            u.full_name,
            u.username,
            u.email,
            u.phone,
            u.date_of_birth,
            DATE_FORMAT(u.date_of_birth, '%Y-%m-%d') as dob_formatted,
            TIMESTAMPDIFF(YEAR, u.date_of_birth, CURDATE()) as age,
            u.role,
            u.status,
            u.created_at,
            CASE 
                WHEN u.role = 'player' THEN p.batch_id
                ELSE NULL
            END as batch_id,
            CASE 
                WHEN u.role = 'player' THEN b.batch_name
                ELSE NULL
            END as batch_name,
            CASE 
                WHEN u.date_of_birth IS NOT NULL 
                THEN DATE_FORMAT(u.date_of_birth, '%d %b %Y')
                ELSE 'Not provided'
            END as dob_display,
            CASE 
                WHEN u.date_of_birth IS NOT NULL 
                THEN CONCAT(TIMESTAMPDIFF(YEAR, u.date_of_birth, CURDATE()), ' years')
                ELSE 'Not provided'
            END as age_display
        FROM users u
        LEFT JOIN players p ON u.id = p.user_id AND u.role = 'player'
        LEFT JOIN batches b ON p.batch_id = b.id
        ORDER BY u.id DESC
    `;
    
    db.query(query, (err, result) => {
        if (err) {
            console.error('Error fetching all users:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json(result || []);
    });
});

// Get user by ID with DOB and batch info 
router.get('/user/:id', authenticateToken, (req, res) => {
    const userId = req.params.id;
    
    const query = `
        SELECT 
            u.id,
            u.full_name,
            u.username,
            u.email,
            u.phone,
            u.date_of_birth,
            DATE_FORMAT(u.date_of_birth, '%Y-%m-%d') as dob_formatted,
            TIMESTAMPDIFF(YEAR, u.date_of_birth, CURDATE()) as age,
            u.role,
            u.status,
            u.created_at,
            CASE 
                WHEN u.date_of_birth IS NOT NULL 
                THEN CONCAT(TIMESTAMPDIFF(YEAR, u.date_of_birth, CURDATE()), ' years')
                ELSE 'Not provided'
            END as age_display,
            -- Player specific info
            p.batch_id,
            p.playing_role,
            p.parent_name,
            p.parent_phone,
            p.address,
            p.joining_date,
            -- Batch info
            b.batch_name,
            b.timing as batch_timing,
            -- Coach info
            c.id as coach_id,
            c.full_name as coach_name
        FROM users u
        LEFT JOIN players p ON u.id = p.user_id
        LEFT JOIN batches b ON p.batch_id = b.id
        LEFT JOIN users c ON b.coach_id = c.id
        WHERE u.id = ?
    `;
    
    db.query(query, [userId], (err, result) => {
        if (err) {
            console.error('Error fetching user:', err);
            return res.status(500).json({ error: err.message });
        }
        if (result.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        const userData = result[0];
        // Add role-specific information
        if (userData.role === 'player') {
            userData.batch_assigned = !!userData.batch_id;
            userData.batch_display = userData.batch_name || 'Not Assigned';
        }
        
        res.json(userData);
    });
});

// Get recent payments 
router.get('/payments', authenticateToken, (req, res) => {
    const query = `
        SELECT 
            p.id, 
            p.amount, 
            DATE_FORMAT(p.payment_date, '%Y-%m-%d') as payment_date,
            u.full_name as player_name,
            u.date_of_birth,
            p.status,
            py.batch_id
        FROM payments p
        LEFT JOIN users u ON p.player_id = u.id
        LEFT JOIN players py ON u.id = py.user_id
        ORDER BY p.payment_date DESC 
        LIMIT 5
    `;
    
    db.query(query, (err, result) => {
        if (err) {
            console.error('Payments query error:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json(result || []);
    });
});

// Chart data
router.get('/chart-data', authenticateToken, authorizeAdmin, (req, res) => {
    const query = `
        SELECT 
            'Total Revenue' as label,
            COALESCE(SUM(amount), 0) as total_revenue
        FROM payments
        WHERE status = 'completed'
    `;
    
    db.query(query, (err, result) => {
        if (err) {
            console.error('Error:', err);
            return res.status(500).json({ error: err.message });
        }
        
        const totalRevenue = result[0]?.total_revenue || 0;
        
        if (totalRevenue === 0) {
            return res.json({ labels: ['No Revenue Data'], values: [1] });
        }
        
        // Get monthly breakdown
        const monthlyQuery = `
            SELECT 
                DATE_FORMAT(payment_date, '%b %Y') as month,
                SUM(amount) as total
            FROM payments
            WHERE status = 'completed'
            GROUP BY YEAR(payment_date), MONTH(payment_date)
            ORDER BY payment_date ASC
        `;
        
        db.query(monthlyQuery, (err2, monthlyResult) => {
            if (err2 || !monthlyResult || monthlyResult.length === 0) {
                return res.json({ labels: ['Total Revenue'], values: [totalRevenue] });
            }
            
            const labels = monthlyResult.map(row => row.month);
            const values = monthlyResult.map(row => parseFloat(row.total));
            
            res.json({ labels, values });
        });
    });
});

// Get batch-wise player distribution 
router.get('/batch-distribution', authenticateToken, authorizeAdmin, (req, res) => {
    const query = `
        SELECT 
            b.id,
            b.batch_name,
            b.timing,
            COUNT(p.user_id) as player_count,
            GROUP_CONCAT(DISTINCT u.full_name ORDER BY u.full_name SEPARATOR ', ') as player_names
        FROM batches b
        LEFT JOIN players p ON p.batch_id = b.id
        LEFT JOIN users u ON p.user_id = u.id AND u.role = 'player' AND u.status = 'active'
        WHERE b.status = 'active'
        GROUP BY b.id, b.batch_name, b.timing
        ORDER BY player_count DESC
    `;
    
    db.query(query, (err, result) => {
        if (err) {
            console.error('Error fetching batch distribution:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json(result || []);
    });
});

// Get players by batch ID
router.get('/players/by-batch/:batchId', authenticateToken, (req, res) => {
    const batchId = req.params.batchId;
    
    const query = `
        SELECT 
            u.id,
            u.full_name,
            u.email,
            u.phone,
            u.date_of_birth,
            DATE_FORMAT(u.date_of_birth, '%Y-%m-%d') as dob_formatted,
            TIMESTAMPDIFF(YEAR, u.date_of_birth, CURDATE()) as age,
            p.playing_role,
            p.parent_name,
            p.parent_phone,
            p.joining_date,
            u.status
        FROM players p
        INNER JOIN users u ON p.user_id = u.id
        WHERE p.batch_id = ? AND u.role = 'player'
        ORDER BY u.full_name
    `;
    
    db.query(query, [batchId], (err, result) => {
        if (err) {
            console.error('Error fetching players by batch:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json(result || []);
    });
});

// Get player with their batch details 
router.get('/player-batch/:playerId', authenticateToken, (req, res) => {
    const playerId = req.params.playerId;
    
    const query = `
        SELECT 
            u.id,
            u.full_name,
            u.date_of_birth,
            DATE_FORMAT(u.date_of_birth, '%Y-%m-%d') as dob_formatted,
            p.batch_id,
            b.batch_name,
            b.timing,
            c.id as coach_id,
            c.full_name as coach_name,
            CASE 
                WHEN p.batch_id IS NULL THEN 'No Batch Assigned'
                ELSE CONCAT(b.batch_name, ' - ', b.timing)
            END as batch_status,
            CASE 
                WHEN p.id IS NULL THEN 'Player record missing in players table'
                WHEN p.batch_id IS NOT NULL THEN 'Batch assigned in players table'
                ELSE 'No batch record'
            END as data_source_info
        FROM users u
        INNER JOIN players p ON u.id = p.user_id
        LEFT JOIN batches b ON p.batch_id = b.id
        LEFT JOIN users c ON b.coach_id = c.id
        WHERE u.id = ? AND u.role = 'player'
    `;
    
    db.query(query, [playerId], (err, result) => {
        if (err) {
            console.error('Error fetching player batch:', err);
            return res.status(500).json({ error: err.message });
        }
        
        if (result.length === 0) {
            return res.json({ 
                message: 'Player not found or missing player record',
                suggestion: 'Create a record in players table for this user'
            });
        }
        
        res.json(result[0]);
    });
});

// Age distribution report
router.get('/age-distribution', authenticateToken, authorizeAdmin, (req, res) => {
    const query = `
        SELECT 
            CASE 
                WHEN u.date_of_birth IS NULL THEN 'Not Provided'
                WHEN TIMESTAMPDIFF(YEAR, u.date_of_birth, CURDATE()) < 10 THEN 'Under 10'
                WHEN TIMESTAMPDIFF(YEAR, u.date_of_birth, CURDATE()) BETWEEN 10 AND 15 THEN '10-15 Years'
                WHEN TIMESTAMPDIFF(YEAR, u.date_of_birth, CURDATE()) BETWEEN 16 AND 20 THEN '16-20 Years'
                WHEN TIMESTAMPDIFF(YEAR, u.date_of_birth, CURDATE()) BETWEEN 21 AND 25 THEN '21-25 Years'
                ELSE '26+ Years'
            END as age_group,
            COUNT(*) as count,
            u.role
        FROM users u
        WHERE u.role IN ('player', 'coach')
        GROUP BY age_group, u.role
        ORDER BY age_group
    `;
    
    db.query(query, (err, result) => {
        if (err) {
            console.error('Error fetching age distribution:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json(result || []);
    });
});

// Check data integrity between users and players table
router.get('/check-integrity', authenticateToken, authorizeAdmin, (req, res) => {
    const query = `
        SELECT 
            COUNT(DISTINCT u.id) as total_players_in_users,
            COUNT(DISTINCT p.user_id) as players_with_records,
            COUNT(DISTINCT CASE WHEN p.user_id IS NULL THEN u.id END) as missing_player_records,
            GROUP_CONCAT(DISTINCT 
                CASE WHEN p.user_id IS NULL 
                THEN CONCAT(u.id, ': ', u.full_name) 
                END SEPARATOR ' | '
            ) as missing_players_list
        FROM users u
        LEFT JOIN players p ON u.id = p.user_id
        WHERE u.role = 'player'
    `;
    
    db.query(query, (err, result) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        const integrity = result[0];
        res.json({
            status: integrity.missing_player_records == 0 ? '✅ PERFECT' : '⚠️ NEEDS FIX',
            total_players_in_users: integrity.total_players_in_users,
            players_with_records: integrity.players_with_records,
            missing_records: integrity.missing_player_records,
            missing_players: integrity.missing_players_list || 'None',
            recommendation: integrity.missing_player_records > 0 ? 
                'Run the fix endpoint to create missing player records' : 
                'All good! Data is consistent.'
        });
    });
});

// Fix missing player records (Admin only)
router.post('/fix-missing-players', authenticateToken, authorizeAdmin, (req, res) => {
    const fixQuery = `
        INSERT INTO players (user_id, player_name, playing_role, status, created_at, updated_at)
        SELECT 
            u.id, 
            u.full_name, 
            COALESCE(u.playing_role, 'Not Specified') as playing_role,
            COALESCE(u.status, 'active') as status,
            NOW() as created_at,
            NOW() as updated_at
        FROM users u
        LEFT JOIN players p ON u.id = p.user_id
        WHERE u.role = 'player' 
        AND p.user_id IS NULL
    `;
    
    db.query(fixQuery, (err, result) => {
        if (err) {
            console.error('Error fixing missing players:', err);
            return res.status(500).json({ error: err.message });
        }
        
        res.json({
            message: 'Data integrity fix completed',
            fixed_count: result.affectedRows,
            note: 'Missing player records have been created. Batch IDs still need to be assigned separately.'
        });
    });
});

// Revenue distribution 
router.get('/revenue-distribution', authenticateToken, authorizeAdmin, (req, res) => {
    const query = `
        SELECT 
            COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0) as collected,
            COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as pending
        FROM payments
    `;
    
    db.query(query, (err, result) => {
        if (err) {
            console.error('Error fetching revenue distribution:', err);
            return res.status(500).json({ error: err.message });
        }

        const data = result[0];
        const formattedData = [
            { name: 'Collected', value: parseFloat(data.collected || 0), color: '#22c55e' },
            { name: 'Pending', value: parseFloat(data.pending || 0), color: '#f59e0b' }
        ];

        res.json(formattedData);
    });
});

module.exports = router;