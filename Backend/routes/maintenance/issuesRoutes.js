const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ message: 'Access denied' });
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'cricket_crm_secret_2026');
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(403).json({ message: 'Invalid token' });
    }
};

// GET ALL ISSUES
router.get('/', authenticateToken, (req, res) => {
    const query = `
        SELECT 
            i.*, 
            f.facility_name
        FROM issues i 
        LEFT JOIN facilities f ON i.facility_id = f.id 
        ORDER BY i.created_at DESC
    `;
    
    db.query(query, (err, issues) => {
        if (err) {
            console.error('Error fetching issues:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json(issues || []);
    });
});

// GET SINGLE ISSUE
router.get('/:id', authenticateToken, (req, res) => {
    const issueId = req.params.id;
    
    const query = `SELECT i.*, f.facility_name 
                  FROM issues i 
                  LEFT JOIN facilities f ON i.facility_id = f.id 
                  WHERE i.id = ?`;
    
    db.query(query, [issueId], (err, results) => {
        if (err) {
            console.error('Error fetching issue:', err);
            return res.status(500).json({ error: err.message });
        }
        if (results.length === 0) {
            return res.status(404).json({ message: 'Issue not found' });
        }
        res.json(results[0]);
    });
});

// ADD ISSUE
router.post('/', authenticateToken, (req, res) => {
    const { facility_id, issue_title, description, priority, status, cost } = req.body;
    
    if (!facility_id || !issue_title) {
        return res.status(400).json({ message: 'Facility and issue title are required' });
    }
    
    const query = `INSERT INTO issues (facility_id, issue_title, description, priority, status, cost, reported_date) 
                   VALUES (?, ?, ?, ?, ?, ?, CURDATE())`;
    
    db.query(query, [facility_id, issue_title, description || null, priority || 'medium', status || 'open', cost || 0], 
    (err, result) => {
        if (err) {
            console.error('Error adding issue:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json({ success: true, message: 'Issue reported successfully', id: result.insertId });
    });
});

// UPDATE ISSUE
router.put('/:id', authenticateToken, (req, res) => {
    const issueId = req.params.id;
    const { status, cost, remarks } = req.body;
    
    let resolvedDate = null;
    if (status === 'resolved') {
        resolvedDate = new Date().toISOString().split('T')[0];
    }
    
    const query = `UPDATE issues 
                  SET status = ?, cost = ?, resolved_date = ? 
                  WHERE id = ?`;
    
    db.query(query, [status || 'open', cost || 0, resolvedDate, issueId], (err, result) => {
        if (err) {
            console.error('Error updating issue:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json({ success: true, message: 'Issue updated successfully' });
    });
});

// DELETE ISSUE
router.delete('/:id', authenticateToken, (req, res) => {
    const issueId = req.params.id;
    
    db.query('DELETE FROM issues WHERE id = ?', [issueId], (err, result) => {
        if (err) {
            console.error('Error deleting issue:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json({ success: true, message: 'Issue deleted successfully' });
    });
});

module.exports = router;