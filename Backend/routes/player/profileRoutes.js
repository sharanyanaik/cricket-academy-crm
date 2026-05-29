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

// GET PROFILE 
router.get('/', authenticateToken, (req, res) => {
    const userId = req.user.id;
    console.log('Fetching profile for user ID:', userId);
    
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
            u.created_at as joined_date,
            u.status as user_status,
            p.id as player_record_id,
            p.player_name,
            p.player_role,
            p.address,
            p.playing_role,
            p.joining_date,
            b.id as batch_id,
            b.batch_name,
            b.timing as batch_time
        FROM users u
        LEFT JOIN players p ON u.id = p.user_id
        LEFT JOIN batches b ON p.batch_id = b.id
        WHERE u.id = ? AND u.role = 'player'
    `;
    
    db.query(query, [userId], (err, user) => {
        if (err) {
            console.error('Error fetching profile:', err);
            return res.status(500).json({ error: err.message });
        }
        
        if (user.length === 0) {
            return res.status(404).json({ message: 'Player not found' });
        }
        
        const playerData = user[0];
        
        // Get attendance percentage using JOIN to players table
        const attendanceQuery = `
            SELECT 
                COUNT(a.id) as total_days,
                SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present_days
            FROM attendance a
            INNER JOIN players p ON a.player_id = p.id
            WHERE p.user_id = ?
        `;
        
        db.query(attendanceQuery, [userId], (err, attendanceResult) => {
            if (err) {
                console.error('Error fetching attendance:', err);
                playerData.attendance_percentage = 0;
                return res.json(playerData);
            }
            
            const totalDays = (attendanceResult && attendanceResult[0]) ? parseInt(attendanceResult[0].total_days) || 0 : 0;
            const presentDays = (attendanceResult && attendanceResult[0]) ? parseInt(attendanceResult[0].present_days) || 0 : 0;
            const attendancePercentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;
            
            playerData.attendance_percentage = attendancePercentage;
            
            console.log(`Attendance for user ${userId}: ${presentDays}/${totalDays} = ${attendancePercentage}%`);
            
            res.json(playerData);
        });
    });
});

module.exports = router;