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

// GET ATTENDANCE SUMMARY
router.get('/summary', authenticateToken, (req, res) => {
    const userId = req.user.id;
    
    console.log('Fetching attendance summary for user_id:', userId);
    
    // Query using JOIN to get attendance for the correct player_id
    const query = `
        SELECT 
            COUNT(a.id) as total_days,
            SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present_days,
            SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent_days,
            SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) as late_days
        FROM attendance a
        INNER JOIN players p ON a.player_id = p.id
        WHERE p.user_id = ?
    `;
    
    db.query(query, [userId], (err, result) => {
        if (err) {
            console.error('Error fetching attendance summary:', err);
            return res.status(500).json({ error: err.message });
        }
        
        const totalDays = result[0]?.total_days || 0;
        const presentDays = result[0]?.present_days || 0;
        const absentDays = result[0]?.absent_days || 0;
        const lateDays = result[0]?.late_days || 0;
        const attendancePercent = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;
        
        console.log(`Summary: Total=${totalDays}, Present=${presentDays}, Absent=${absentDays}, Late=${lateDays}, Percent=${attendancePercent}%`);
        
        res.json({
            totalDays: totalDays,
            presentDays: presentDays,
            absentDays: absentDays,
            lateDays: lateDays,
            attendancePercent: attendancePercent
        });
    });
});

// GET ATTENDANCE RECORDS
router.get('/', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const { search } = req.query;
    
    console.log('Fetching attendance records for user_id:', userId);
    
    let query = `
        SELECT a.id, a.date, a.status, a.remarks, a.check_in_time, a.check_out_time
        FROM attendance a
        INNER JOIN players p ON a.player_id = p.id
        WHERE p.user_id = ?
    `;
    let params = [userId];
    
    if (search) {
        query += ` AND a.date LIKE ?`;
        params.push(`%${search}%`);
    }
    
    query += ` ORDER BY a.date DESC`;
    
    db.query(query, params, (err, attendance) => {
        if (err) {
            console.error('Error fetching attendance:', err);
            return res.status(500).json({ error: err.message });
        }
        
        console.log(`Found ${attendance.length} attendance records for user_id ${userId}`);
        
        res.json({
            attendance: attendance || [],
            total: attendance.length
        });
    });
});

module.exports = router;