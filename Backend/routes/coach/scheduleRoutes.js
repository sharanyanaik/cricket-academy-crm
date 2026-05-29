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
        console.log('Authenticated user:', req.user);
        next();
    } catch (error) {
        console.error('Auth error:', error);
        return res.status(403).json({ message: 'Invalid token' });
    }
};

router.get('/', authenticateToken, (req, res) => {
    const coachId = req.user.id;
    
    const query = `SELECT s.*, b.batch_name, b.timing as batch_timing
                   FROM schedules s 
                   JOIN batches b ON s.batch_id = b.id 
                   WHERE b.coach_id = ?
                   ORDER BY s.schedule_date ASC, s.start_time ASC`;
    
    db.query(query, [coachId], (err, schedules) => {
        if (err) {
            console.error('Error fetching schedules:', err);
            return res.status(500).json({ error: err.message });
        }
        console.log('Schedules found for coach', coachId, ':', schedules.length);
        res.json(schedules || []);
    });
});

// GET SINGLE SCHEDULE 
router.get('/:id', authenticateToken, (req, res) => {
    const scheduleId = req.params.id;
    const coachId = req.user.id;
    
    // Use batch's coach_id instead of schedule's coach_id
    const query = `SELECT s.*, b.batch_name 
                   FROM schedules s 
                   JOIN batches b ON s.batch_id = b.id 
                   WHERE s.id = ? AND b.coach_id = ?`;
    
    db.query(query, [scheduleId, coachId], (err, schedule) => {
        if (err) return res.status(500).json({ error: err.message });
        if (schedule.length === 0) return res.status(404).json({ message: 'Schedule not found' });
        res.json(schedule[0]);
    });
});

// Keep ONLY this DELETE route (remove the other one)
router.delete('/:id', authenticateToken, (req, res) => {
    const scheduleId = req.params.id;
    const coachId = req.user.id;
    
    const query = `DELETE FROM schedules WHERE id = ? AND coach_id = ?`;
    
    db.query(query, [scheduleId, coachId], (err, result) => {
        if (err) {
            console.error('Error deleting schedule:', err);
            return res.status(500).json({ error: err.message });
        }
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Schedule not found' });
        res.json({ success: true, message: 'Schedule deleted successfully' });
    });
});

// ADD SCHEDULE
router.post('/', authenticateToken, (req, res) => {
    const { batch_id, schedule_date, start_time, end_time, activity_type, description, location } = req.body;
    const coachId = req.user.id;
    
    console.log('Adding schedule:', { batch_id, schedule_date, start_time, end_time, activity_type, description, location, coachId });
    
    // Verify that this batch belongs to the coach
    db.query('SELECT id FROM batches WHERE id = ? AND coach_id = ?', [batch_id, coachId], (err, batchCheck) => {
        if (err) {
            console.error('Error verifying batch:', err);
            return res.status(500).json({ error: err.message });
        }
        
        if (batchCheck.length === 0) {
            return res.status(403).json({ message: 'You do not have permission to add schedule for this batch' });
        }
        
        const query = `INSERT INTO schedules (batch_id, coach_id, schedule_date, start_time, end_time, activity_type, description, location) 
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
        
        db.query(query, [batch_id, coachId, schedule_date, start_time, end_time, activity_type, description || null, location || 'Main Ground'], (err, result) => {
            if (err) {
                console.error('Error adding schedule:', err);
                return res.status(500).json({ error: err.message });
            }
            console.log('Schedule added successfully, ID:', result.insertId);
            res.json({ success: true, message: 'Schedule added successfully', id: result.insertId });
        });
    });
});

// UPDATE SCHEDULE
router.put('/:id', authenticateToken, (req, res) => {
    const scheduleId = req.params.id;
    const coachId = req.user.id;
    const { schedule_date, start_time, end_time, activity_type, description, location } = req.body;
    
    const query = `UPDATE schedules SET schedule_date = ?, start_time = ?, end_time = ?, activity_type = ?, description = ?, location = ? 
                   WHERE id = ? AND coach_id = ?`;
    
    db.query(query, [schedule_date, start_time, end_time, activity_type, description || null, location || 'Main Ground', scheduleId, coachId], (err, result) => {
        if (err) {
            console.error('Error updating schedule:', err);
            return res.status(500).json({ error: err.message });
        }
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Schedule not found' });
        res.json({ success: true, message: 'Schedule updated successfully' });
    });
});

// DELETE SCHEDULE
router.delete('/:id', authenticateToken, (req, res) => {
    const scheduleId = req.params.id;
    const coachId = req.user.id;
    
    const query = `DELETE FROM schedules WHERE id = ? AND coach_id = ?`;
    
    db.query(query, [scheduleId, coachId], (err, result) => {
        if (err) {
            console.error('Error deleting schedule:', err);
            return res.status(500).json({ error: err.message });
        }
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Schedule not found' });
        res.json({ success: true, message: 'Schedule deleted successfully' });
    });
});

module.exports = router;