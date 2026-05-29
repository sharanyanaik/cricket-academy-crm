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

// GET DASHBOARD STATS
router.get('/', authenticateToken, (req, res) => {
    console.log('Maintenance dashboard API called');
    
    // Get total facilities
    db.query('SELECT COUNT(*) as count FROM facilities', (err, facilities) => {
        if (err) {
            console.error('Error fetching facilities:', err);
            return res.status(500).json({ error: err.message });
        }
        
        // Get open issues 
        db.query('SELECT COUNT(*) as count FROM issues WHERE status != "resolved"', (err, openIssues) => {
            if (err) {
                console.error('Error fetching open issues:', err);
                return res.status(500).json({ error: err.message });
            }
            
            // Get resolved this month
            const resolvedQuery = `SELECT COUNT(*) as count FROM issues 
                                  WHERE status = 'resolved' 
                                  AND MONTH(created_at) = MONTH(CURDATE()) 
                                  AND YEAR(created_at) = YEAR(CURDATE())`;
            
            db.query(resolvedQuery, (err, resolved) => {
                if (err) {
                    console.error('Error fetching resolved issues:', err);
                    return res.status(500).json({ error: err.message });
                }
                
                // Get total maintenance cost
                db.query('SELECT COALESCE(SUM(amount), 0) as total FROM maintenance_expenses', (err, totalCost) => {
                    if (err) {
                        console.error('Error fetching total cost:', err);
                        return res.status(500).json({ error: err.message });
                    }
                    
                    // Get recent issues with facility names
                    const recentQuery = `SELECT i.*, f.facility_name 
                                        FROM issues i 
                                        LEFT JOIN facilities f ON i.facility_id = f.id 
                                        ORDER BY i.created_at DESC 
                                        LIMIT 5`;
                    
                    db.query(recentQuery, (err, recentIssues) => {
                        if (err) {
                            console.error('Error fetching recent issues:', err);
                            return res.status(500).json({ error: err.message });
                        }
                        
                        console.log('Dashboard data fetched successfully');
                        res.json({
                            totalFacilities: facilities[0]?.count || 0,
                            openIssues: openIssues[0]?.count || 0,
                            resolvedThisMonth: resolved[0]?.count || 0,
                            totalCost: totalCost[0]?.total || 0,
                            recentIssues: recentIssues || []
                        });
                    });
                });
            });
        });
    });
});

module.exports = router;