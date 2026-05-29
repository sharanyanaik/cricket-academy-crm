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

// GET ALL FACILITIES
router.get('/', authenticateToken, (req, res) => {
    const query = `SELECT id, facility_name, type, status, last_maintenance, next_maintenance 
                   FROM facilities ORDER BY facility_name ASC`;
    
    db.query(query, (err, facilities) => {
        if (err) {
            console.error('Error fetching facilities:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json(facilities || []);
    });
});

// GET SINGLE FACILITY
router.get('/:id', authenticateToken, (req, res) => {
    const facilityId = req.params.id;
    
    const query = `SELECT id, facility_name, type, status, last_maintenance, next_maintenance 
                   FROM facilities WHERE id = ?`;
    
    db.query(query, [facilityId], (err, facilities) => {
        if (err) {
            console.error('Error fetching facility:', err);
            return res.status(500).json({ error: err.message });
        }
        if (facilities.length === 0) {
            return res.status(404).json({ message: 'Facility not found' });
        }
        res.json(facilities[0]);
    });
});

// ADD FACILITY
router.post('/', authenticateToken, (req, res) => {
    const { facility_name, type, status, last_maintenance, next_maintenance } = req.body;
    
    if (!facility_name || !type) {
        return res.status(400).json({ message: 'Facility name and type are required' });
    }
    
    const query = `INSERT INTO facilities (facility_name, type, status, last_maintenance, next_maintenance) 
                   VALUES (?, ?, ?, ?, ?)`;
    
    db.query(query, [facility_name, type, status || 'good', last_maintenance || null, next_maintenance || null], 
    (err, result) => {
        if (err) {
            console.error('Error adding facility:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json({ success: true, message: 'Facility added successfully', id: result.insertId });
    });
});

// UPDATE FACILITY
router.put('/:id', authenticateToken, (req, res) => {
    const facilityId = req.params.id;
    const { facility_name, type, status, last_maintenance, next_maintenance } = req.body;
    
    const query = `UPDATE facilities 
                   SET facility_name = ?, type = ?, status = ?, last_maintenance = ?, next_maintenance = ? 
                   WHERE id = ?`;
    
    db.query(query, [facility_name, type, status, last_maintenance || null, next_maintenance || null, facilityId], 
    (err, result) => {
        if (err) {
            console.error('Error updating facility:', err);
            return res.status(500).json({ error: err.message });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Facility not found' });
        }
        res.json({ success: true, message: 'Facility updated successfully' });
    });
});

// DELETE FACILITY
router.delete('/:id', authenticateToken, (req, res) => {
    const facilityId = req.params.id;
    
    //Get facility name for better response
    db.query('SELECT facility_name FROM facilities WHERE id = ?', [facilityId], (err, nameResult) => {
        if (err) {
            console.error('Error getting facility name:', err);
        }
        const facilityName = (nameResult && nameResult[0]) ? nameResult[0].facility_name : facilityId;
        
        // Check if facility has any issues
        db.query('SELECT COUNT(*) as count FROM issues WHERE facility_id = ?', [facilityId], (err, result) => {
            if (err) {
                console.error('Error checking issues:', err);
                return res.status(500).json({ message: 'Error checking related issues', error: err.message });
            }
            
            if (result[0].count > 0) {
                return res.status(400).json({ 
                    message: `Cannot delete facility "${facilityName}". It has ${result[0].count} existing issue(s). Please resolve or delete the issues first.`,
                    issues_count: result[0].count
                });
            }
            
            // Check if facility has any maintenance schedules
            db.query('SELECT COUNT(*) as count FROM maintenance_schedule WHERE facility_id = ?', [facilityId], (err, scheduleResult) => {
                if (err) {
                    console.error('Error checking schedules:', err);
                }
                
                if (scheduleResult && scheduleResult[0] && scheduleResult[0].count > 0) {
                    return res.status(400).json({ 
                        message: `Cannot delete facility "${facilityName}". It has ${scheduleResult[0].count} scheduled maintenance record(s). Please delete them first.`,
                        schedules_count: scheduleResult[0].count
                    });
                }
                
                // If no issues or schedules, proceed with deletion
                db.query('DELETE FROM facilities WHERE id = ?', [facilityId], (err, deleteResult) => {
                    if (err) {
                        console.error('Error deleting facility:', err);
                        return res.status(500).json({ message: 'Error deleting facility', error: err.message });
                    }
                    if (deleteResult.affectedRows === 0) {
                        return res.status(404).json({ message: 'Facility not found' });
                    }
                    
                    // Add audit log for deletion 
                    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
                    // addAuditLog(req.user.id, 'DELETE_FACILITY', `Deleted facility: ${facilityName}`, ip, req);
                    
                    res.json({ success: true, message: 'Facility deleted successfully' });
                });
            });
        });
    });
});

module.exports = router;