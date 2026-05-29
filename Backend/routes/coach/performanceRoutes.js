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

// Helper function to get coach's database ID from user_id
function getCoachDbId(userId, callback) {
    db.query('SELECT id FROM coaches WHERE user_id = ?', [userId], (err, result) => {
        if (err) return callback(err, null);
        callback(null, result[0]?.id || null);
    });
}

// GET PERFORMANCE SUMMARY
router.get('/', authenticateToken, (req, res) => {
    const userId = req.user.id;
    
    getCoachDbId(userId, (err, coachesDbId) => {
        if (err) {
            console.error('Error getting coach id:', err);
            return res.status(500).json({ error: err.message });
        }
        
        if (!coachesDbId) {
            return res.json([]);
        }
        
        const query = `
            SELECT 
                pl.id as player_record_id,
                pl.player_name,
                COUNT(p.id) as matches_played,
                COALESCE(SUM(p.runs), 0) as total_runs,
                COALESCE(SUM(p.wickets), 0) as total_wickets,
                COALESCE(SUM(p.catches), 0) as total_catches,
                COALESCE(ROUND(AVG(CASE WHEN p.runs > 0 THEN p.runs END), 2), 0) as batting_average,
                COALESCE(ROUND(AVG(CASE WHEN p.wickets > 0 THEN p.wickets END), 2), 0) as bowling_average,
                COALESCE(MAX(p.runs), 0) as highest_score
            FROM players pl
            LEFT JOIN performance p ON pl.id = p.player_id
            WHERE pl.coach_id = ?
            GROUP BY pl.id, pl.player_name
            ORDER BY total_runs DESC
        `;
        
        db.query(query, [coachesDbId], (err, performance) => {
            if (err) {
                console.error('Error fetching performance:', err);
                return res.status(500).json({ error: err.message });
            }
            res.json(performance || []);
        });
    });
});

// GET INDIVIDUAL EVALUATIONS
router.get('/evaluations', authenticateToken, (req, res) => {
    const userId = req.user.id;
    
    const query = `
        SELECT 
            p.*,
            pl.player_name
        FROM performance p
        JOIN players pl ON p.player_id = pl.id
        WHERE pl.coach_id = (SELECT id FROM coaches WHERE user_id = ?)
        ORDER BY p.match_date DESC
    `;
    
    db.query(query, [userId], (err, evaluations) => {
        if (err) {
            console.error('Error fetching evaluations:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json(evaluations || []);
    });
});

// ADD PERFORMANCE RECORD 
router.post('/', authenticateToken, (req, res) => {
    const { player_id, match_date, match_type, runs, wickets, catches, coach_comments } = req.body;
    const userId = req.user.id;
    
    console.log('Received POST request:', { player_id, match_date, match_type, runs, wickets, catches });
    
    if (!player_id || !match_date) {
        return res.status(400).json({ message: 'Player and match date are required' });
    }
    
    // First verify the player exists
    db.query('SELECT id, coach_id FROM players WHERE id = ?', [player_id], (err, playerResult) => {
        if (err) {
            console.error('Error checking player:', err);
            return res.status(500).json({ error: err.message });
        }
        
        if (!playerResult || playerResult.length === 0) {
            return res.status(404).json({ message: 'Player not found' });
        }
        
        // Now verify the coach has permission 
        db.query('SELECT id FROM coaches WHERE user_id = ?', [userId], (err, coachResult) => {
            if (err) {
                console.error('Error checking coach:', err);
                return res.status(500).json({ error: err.message });
            }
            
            const coachDbId = coachResult[0]?.id;
            
            if (playerResult[0].coach_id !== coachDbId) {
                console.log(`Permission denied: player.coach_id=${playerResult[0].coach_id}, coach.id=${coachDbId}`);
                return res.status(403).json({ message: 'You do not have permission to add performance for this player' });
            }
            
            // Insert the performance record
            const insertQuery = `INSERT INTO performance (player_id, match_date, match_type, runs, wickets, catches, coach_comments) 
                                 VALUES (?, ?, ?, ?, ?, ?, ?)`;
            
            db.query(insertQuery, [player_id, match_date, match_type || 'Practice', runs || 0, wickets || 0, catches || 0, coach_comments || ''], 
            (err, result) => {
                if (err) {
                    console.error('Error adding performance:', err);
                    return res.status(500).json({ error: err.message });
                }
                console.log('Performance added successfully, ID:', result.insertId);
                res.json({ success: true, message: 'Performance added successfully', id: result.insertId });
            });
        });
    });
});

// DELETE EVALUATION
router.delete('/:id', authenticateToken, (req, res) => {
    const evaluationId = req.params.id;
    const userId = req.user.id;
    
    db.query(`
        DELETE p FROM performance p
        JOIN players pl ON p.player_id = pl.id
        JOIN coaches c ON pl.coach_id = c.id
        WHERE p.id = ? AND c.user_id = ?
    `, [evaluationId, userId], (err, result) => {
        if (err) {
            console.error('Error deleting evaluation:', err);
            return res.status(500).json({ error: err.message });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Evaluation not found or not authorized' });
        }
        res.json({ success: true, message: 'Evaluation deleted successfully' });
    });
});

// GET PLAYER STATS SUMMARY
router.get('/stats/:playerId', authenticateToken, (req, res) => {
    const playerId = req.params.playerId;
    const userId = req.user.id;
    
    const query = `
        SELECT 
            COUNT(*) as matches_played,
            COALESCE(SUM(runs), 0) as total_runs,
            COALESCE(SUM(wickets), 0) as total_wickets,
            COALESCE(SUM(catches), 0) as total_catches,
            COALESCE(MAX(runs), 0) as highest_score,
            COALESCE(MAX(wickets), 0) as best_bowling,
            COALESCE(ROUND(AVG(CASE WHEN runs > 0 THEN runs END), 2), 0) as batting_average,
            COALESCE(ROUND(AVG(CASE WHEN wickets > 0 THEN wickets END), 2), 0) as bowling_average
        FROM performance p
        JOIN players pl ON p.player_id = pl.id
        WHERE p.player_id = ? AND pl.coach_id = (SELECT id FROM coaches WHERE user_id = ?)
    `;
    
    db.query(query, [playerId, userId], (err, stats) => {
        if (err) {
            console.error('Error fetching player stats:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json(stats[0] || { 
            matches_played: 0, 
            total_runs: 0, 
            total_wickets: 0, 
            total_catches: 0,
            highest_score: 0,
            best_bowling: 0,
            batting_average: 0,
            bowling_average: 0
        });
    });
});

module.exports = router;