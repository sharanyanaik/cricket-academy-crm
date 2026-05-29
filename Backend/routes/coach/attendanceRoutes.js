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

// GET COACH'S BATCHES
router.get('/batches', authenticateToken, (req, res) => {
    const userId = req.user.id;
    
    console.log('Fetching batches for coach user_id:', userId);
    
    const query = `
        SELECT b.id, b.batch_name, b.timing, b.max_players, b.status
        FROM batches b
        WHERE b.coach_id = ? AND b.status = 'active'
        ORDER BY b.timing ASC
    `;
    
    db.query(query, [userId], (err, batches) => {
        if (err) {
            console.error('Error fetching batches:', err);
            return res.status(500).json({ error: err.message });
        }
        console.log(`Found ${batches.length} batches for coach`);
        res.json(batches || []);
    });
});

// GET ATTENDANCE
router.get('/', authenticateToken, (req, res) => {
    const coachId = req.user.id;
    const { date, batch_id } = req.query;
    const attendanceDate = date || new Date().toISOString().split('T')[0];
    
    if (!batch_id) {
        return res.json([]);
    }
    
    console.log(`Fetching attendance for batch_id: ${batch_id}, date: ${attendanceDate}, coach_id: ${coachId}`);
    
    // Get all players in the batch with attendance 
    const query = `
        SELECT 
            p.id as player_id,
            p.user_id,
            p.player_name as full_name,
            p.playing_role,
            COALESCE(a.status, 'absent') as status,
            a.remarks,
            a.id as attendance_id
        FROM players p
        LEFT JOIN attendance a ON p.id = a.player_id AND a.date = ? AND a.coach_id = ?
        WHERE p.batch_id = ? AND p.status = 'active'
        ORDER BY p.player_name ASC
    `;
    
    db.query(query, [attendanceDate, coachId, batch_id], (err, players) => {
        if (err) {
            console.error('Error fetching attendance:', err);
            return res.status(500).json({ error: err.message });
        }
        console.log(`Found ${players.length} players in batch`);
        res.json(players || []);
    });
});

// MARK ATTENDANCE
router.post('/', authenticateToken, (req, res) => {
    const { player_id, date, status, remarks } = req.body;
    const coachId = req.user.id;
    
    console.log(`Marking attendance: player_id=${player_id}, date=${date}, status=${status}, coach_id=${coachId}`);
    
    if (!player_id || !date || !status) {
        return res.status(400).json({ message: 'Player, date, and status are required' });
    }
    
    //Get batch_id from player
    db.query('SELECT batch_id FROM players WHERE id = ?', [player_id], (err, playerResult) => {
        if (err) {
            console.error('Error getting player batch:', err);
            return res.status(500).json({ error: err.message });
        }
        
        const batch_id = playerResult[0]?.batch_id || null;
        
        // UPSERT
        const query = `
            INSERT INTO attendance (player_id, coach_id, batch_id, date, status, remarks, created_at) 
            VALUES (?, ?, ?, ?, ?, ?, NOW())
            ON DUPLICATE KEY UPDATE 
                status = VALUES(status), 
                remarks = VALUES(remarks),
                coach_id = COALESCE(coach_id, VALUES(coach_id)),
                batch_id = COALESCE(batch_id, VALUES(batch_id))
        `;
        
        db.query(query, [player_id, coachId, batch_id, date, status, remarks || ''], (err, result) => {
            if (err) {
                console.error('Error marking attendance:', err);
                return res.status(500).json({ error: err.message });
            }
            res.json({ success: true, message: `Attendance marked as ${status}` });
        });
    });
});

module.exports = router;