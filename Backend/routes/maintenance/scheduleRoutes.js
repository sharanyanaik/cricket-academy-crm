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

// GET MAINTENANCE STAFF 
router.get('/staff', authenticateToken, (req, res) => {
    const query = `
        SELECT id, full_name, specialization, phone
        FROM maintenance_staff 
        WHERE status = 'active'
        ORDER BY full_name ASC
    `;
    
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching maintenance staff:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json(results || []);
    });
});

// GET UPCOMING SCHEDULES
router.get('/upcoming', authenticateToken, (req, res) => {
    const query = `SELECT s.*, f.facility_name 
                   FROM maintenance_schedule s 
                   LEFT JOIN facilities f ON s.facility_id = f.id 
                   WHERE s.schedule_date >= CURDATE() 
                   ORDER BY s.schedule_date ASC`;
    
    db.query(query, (err, schedules) => {
        if (err) {
            console.error('Error fetching schedules:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json(schedules || []);
    });
});

// GET FACILITIES FOR DROPDOWN
router.get('/facilities', authenticateToken, (req, res) => {
    const query = `SELECT id, facility_name FROM facilities ORDER BY facility_name ASC`;
    
    db.query(query, (err, facilities) => {
        if (err) {
            console.error('Error fetching facilities:', err);
            return res.status(500).json({ error: err.message });
        }
        console.log('Facilities found:', facilities.length);
        res.json(facilities || []);
    });
});

// ADD SCHEDULE
router.post('/', authenticateToken, (req, res) => {
    const { facility_id, task_description, schedule_date, assigned_to } = req.body;
    
    if (!facility_id || !task_description || !schedule_date) {
        return res.status(400).json({ message: 'Facility, task description, and date are required' });
    }
    
    const query = `INSERT INTO maintenance_schedule (facility_id, task_description, schedule_date, assigned_to, status, created_at) 
                   VALUES (?, ?, ?, ?, 'scheduled', NOW())`;
    
    db.query(query, [facility_id, task_description, schedule_date, assigned_to || null], 
    (err, result) => {
        if (err) {
            console.error('Error adding schedule:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json({ success: true, message: 'Schedule added successfully', id: result.insertId });
    });
});

// UPDATE SCHEDULE STATUS
router.put('/:id', authenticateToken, (req, res) => {
    const scheduleId = req.params.id;
    const { status, cost } = req.body;
    
    const query = `UPDATE maintenance_schedule 
                   SET status = ?, cost = ? 
                   WHERE id = ?`;
    
    db.query(query, [status || 'scheduled', cost || 0, scheduleId], (err, result) => {
        if (err) {
            console.error('Error updating schedule:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json({ success: true, message: 'Schedule updated successfully' });
    });
});

// DELETE SCHEDULE
router.delete('/:id', authenticateToken, (req, res) => {
    const scheduleId = req.params.id;
    
    db.query('DELETE FROM maintenance_schedule WHERE id = ?', [scheduleId], (err, result) => {
        if (err) {
            console.error('Error deleting schedule:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json({ success: true, message: 'Schedule deleted successfully' });
    });
});

module.exports = router;