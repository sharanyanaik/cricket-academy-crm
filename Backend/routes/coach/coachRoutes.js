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

// GET COACH BATCHES
router.get('/batches', authenticateToken, (req, res) => {
    const coachId = req.user.id;
    
    const query = `SELECT b.id, b.batch_name, b.timing, b.max_players, b.status, 
                   COUNT(DISTINCT p.id) as player_count 
                   FROM batches b
                   LEFT JOIN users p ON p.batch_id = b.id AND p.role = 'player'
                   WHERE b.coach_id = ?
                   GROUP BY b.id
                   ORDER BY b.timing ASC`;
    
    db.query(query, [coachId], (err, batches) => {
        if (err) {
            console.error('Error fetching batches:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json(batches || []);
    });
});

// GET COACH PLAYERS
router.get('/players', authenticateToken, (req, res) => {
    const coachId = req.user.id;
    
    const query = `SELECT u.id, u.full_name, u.email, u.phone, u.playing_role, p.age, b.batch_name, b.timing
                   FROM users u
                   LEFT JOIN players p ON u.id = p.user_id
                   LEFT JOIN batches b ON u.batch_id = b.id
                   WHERE u.coach_id = ? AND u.role = 'player'
                   ORDER BY u.full_name ASC`;
    
    db.query(query, [coachId], (err, players) => {
        if (err) {
            console.error('Error fetching players:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json(players || []);
    });
});

// GET BATCH PLAYERS 
router.get('/attendance', authenticateToken, (req, res) => {
    const coachId = req.user.id;
    const { date, batch_id } = req.query;
    const attendanceDate = date || new Date().toISOString().split('T')[0];
    
    let query = `SELECT u.id as player_id, u.full_name, u.playing_role, a.status
                 FROM users u
                 LEFT JOIN attendance a ON u.id = a.player_id AND a.date = ? AND a.coach_id = ?
                 WHERE u.batch_id = ? AND u.role = 'player' AND u.coach_id = ?
                 ORDER BY u.full_name ASC`;
    
    db.query(query, [attendanceDate, coachId, batch_id, coachId], (err, players) => {
        if (err) {
            console.error('Error fetching attendance:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json(players || []);
    });
});

// MARK ATTENDANCE
router.post('/attendance', authenticateToken, (req, res) => {
    const { player_id, date, status, remarks } = req.body;
    const coachId = req.user.id;
    
    const query = `INSERT INTO attendance (player_id, coach_id, date, status, remarks) 
                   VALUES (?, ?, ?, ?, ?) 
                   ON DUPLICATE KEY UPDATE status = VALUES(status), remarks = VALUES(remarks)`;
    
    db.query(query, [player_id, coachId, date, status, remarks || ''], (err, result) => {
        if (err) {
            console.error('Error marking attendance:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json({ success: true, message: 'Attendance marked successfully' });
    });
});

module.exports = router;