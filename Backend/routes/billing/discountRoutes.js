const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Access denied' });
    
    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET || 'cricket_crm_secret_2026');
        next();
    } catch {
        return res.status(403).json({ message: 'Invalid token' });
    }
};

// ==================== DISCOUNT ROUTES ====================

// Get all discounts
router.get('/discounts', authenticateToken, (req, res) => {
    if (!['billing', 'admin'].includes(req.user.role)) {
        return res.status(403).json({ message: 'Access denied' });
    }
    db.query('SELECT * FROM discounts ORDER BY id DESC', (err, results) => {
        if (err) {
            console.error('Error in /discounts:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json(results || []);
    });
});

// Add discount
router.post('/discounts', authenticateToken, (req, res) => {
    if (!['billing', 'admin'].includes(req.user.role)) {
        return res.status(403).json({ message: 'Access denied' });
    }
    const { discount_type, eligibility, percentage, max_amount, valid_from, valid_to, status } = req.body;
    
    if (!discount_type) {
        return res.status(400).json({ message: 'Discount type is required' });
    }
    
    const query = `INSERT INTO discounts (discount_type, eligibility, percentage, max_amount, valid_from, valid_to, status) 
                   VALUES (?, ?, ?, ?, ?, ?, ?)`;
    
    db.query(query, [discount_type, eligibility || '', percentage || 0, max_amount || 0, valid_from || null, valid_to || null, status || 'active'], 
        (err, result) => {
            if (err) {
                console.error('Error adding discount:', err);
                return res.status(500).json({ error: err.message });
            }
            res.json({ success: true, message: 'Discount added successfully', id: result.insertId });
        });
});

// Update discount
router.put('/discounts/:id', authenticateToken, (req, res) => {
    if (!['billing', 'admin'].includes(req.user.role)) {
        return res.status(403).json({ message: 'Access denied' });
    }
    const { discount_type, eligibility, percentage, max_amount, valid_from, valid_to, status } = req.body;
    const discountId = req.params.id;
    
    const query = `UPDATE discounts SET discount_type=?, eligibility=?, percentage=?, max_amount=?, valid_from=?, valid_to=?, status=? WHERE id=?`;
    
    db.query(query, [discount_type, eligibility, percentage, max_amount, valid_from, valid_to, status, discountId],
        (err) => {
            if (err) {
                console.error('Error updating discount:', err);
                return res.status(500).json({ error: err.message });
            }
            res.json({ success: true, message: 'Discount updated successfully' });
        });
});

// Delete discount
router.delete('/discounts/:id', authenticateToken, (req, res) => {
    if (!['billing', 'admin'].includes(req.user.role)) {
        return res.status(403).json({ message: 'Access denied' });
    }
    const discountId = req.params.id;
    
    db.query('DELETE FROM player_discounts WHERE discount_id = ?', [discountId], (err) => {
        if (err) console.error('Error deleting player discounts:', err);
        
        db.query('DELETE FROM discounts WHERE id = ?', [discountId], (err) => {
            if (err) {
                console.error('Error deleting discount:', err);
                return res.status(500).json({ error: err.message });
            }
            res.json({ success: true, message: 'Discount deleted successfully' });
        });
    });
});

// ==================== SCHOLARSHIP ROUTES ====================

// Get all scholarships
router.get('/scholarships', authenticateToken, (req, res) => {
    if (!['billing', 'admin'].includes(req.user.role)) {
        return res.status(403).json({ message: 'Access denied' });
    }
    db.query(`SELECT 
                id, 
                scholarship_type as scholarship_name,
                reason as eligibility,
                amount,
                valid_from,
                valid_to,
                status
              FROM scholarships ORDER BY id DESC`, 
        (err, results) => {
            if (err) {
                console.error('Error in /scholarships:', err);
                return res.status(500).json({ error: err.message });
            }
            res.json(results || []);
        });
});

// Add scholarship
router.post('/scholarships', authenticateToken, (req, res) => {
    if (!['billing', 'admin'].includes(req.user.role)) {
        return res.status(403).json({ message: 'Access denied' });
    }
    const { scholarship_name, eligibility, amount, valid_from, valid_to, status } = req.body;
    
    if (!scholarship_name || !eligibility || !amount) {
        return res.status(400).json({ message: 'Scholarship name, eligibility, and amount are required' });
    }
    
    const query = `INSERT INTO scholarships (scholarship_type, reason, amount, valid_from, valid_to, status) 
                   VALUES (?, ?, ?, ?, ?, ?)`;
    
    db.query(query, [scholarship_name, eligibility, amount, valid_from || null, valid_to || null, status || 'active'],
        (err, result) => {
            if (err) {
                console.error('Error adding scholarship:', err);
                return res.status(500).json({ error: err.message });
            }
            res.json({ success: true, message: 'Scholarship added successfully', id: result.insertId });
        });
});

// Update scholarship
router.put('/scholarships/:id', authenticateToken, (req, res) => {
    if (!['billing', 'admin'].includes(req.user.role)) {
        return res.status(403).json({ message: 'Access denied' });
    }
    const { scholarship_name, eligibility, amount, valid_from, valid_to, status } = req.body;
    const scholarshipId = req.params.id;
    
    const query = `UPDATE scholarships SET scholarship_type=?, reason=?, amount=?, valid_from=?, valid_to=?, status=? WHERE id=?`;
    
    db.query(query, [scholarship_name, eligibility, amount, valid_from, valid_to, status, scholarshipId],
        (err) => {
            if (err) {
                console.error('Error updating scholarship:', err);
                return res.status(500).json({ error: err.message });
            }
            res.json({ success: true, message: 'Scholarship updated successfully' });
        });
});

// Delete scholarship
router.delete('/scholarships/:id', authenticateToken, (req, res) => {
    if (!['billing', 'admin'].includes(req.user.role)) {
        return res.status(403).json({ message: 'Access denied' });
    }
    const scholarshipId = req.params.id;
    
    db.query('DELETE FROM player_scholarships WHERE scholarship_id = ?', [scholarshipId], (err) => {
        if (err) console.error('Error deleting player scholarships:', err);
        
        db.query('DELETE FROM scholarships WHERE id = ?', [scholarshipId], (err) => {
            if (err) {
                console.error('Error deleting scholarship:', err);
                return res.status(500).json({ error: err.message });
            }
            res.json({ success: true, message: 'Scholarship deleted successfully' });
        });
    });
});

// ==================== SHARED ROUTES ====================

// Get players
router.get('/players', authenticateToken, (req, res) => {
    if (!['billing', 'admin'].includes(req.user.role)) {
        return res.status(403).json({ message: 'Access denied' });
    }
    db.query(`SELECT id, player_name FROM players WHERE status='active' ORDER BY player_name`,
        (err, results) => {
            if (err) {
                console.error('Error loading players:', err);
                return res.status(500).json({ error: err.message });
            }
            res.json(results || []);
        });
});

// Apply discount to player 
router.post('/apply-discount', authenticateToken, (req, res) => {
    if (!['billing', 'admin'].includes(req.user.role)) {
        return res.status(403).json({ message: 'Access denied' });
    }
    const { player_id, discount_id, remarks } = req.body;
    
    console.log('Applying discount:', { player_id, discount_id, remarks });
    
    if (!player_id || !discount_id) {
        return res.status(400).json({ message: 'Player and discount are required' });
    }
    
    // First check if this discount is already applied to this player
    db.query('SELECT id FROM player_discounts WHERE player_id = ? AND discount_id = ?', 
        [player_id, discount_id], 
        (err, existing) => {
            if (err) {
                console.error('Error checking existing:', err);
                return res.status(500).json({ error: err.message });
            }
            
            if (existing.length > 0) {
                return res.status(400).json({ message: 'This discount has already been applied to this player' });
            }
            
            // Get discount details for dates
            db.query('SELECT valid_from, valid_to FROM discounts WHERE id = ?', [discount_id], (err, discountResult) => {
                if (err) {
                    console.error('Error fetching discount:', err);
                    return res.status(500).json({ error: err.message });
                }
                if (discountResult.length === 0) {
                    return res.status(404).json({ message: 'Discount not found' });
                }
                
                const valid_from = discountResult[0].valid_from;
                const valid_to = discountResult[0].valid_to;
                
                console.log('Using dates:', { valid_from, valid_to });
                
                // Use NOW() for applied_date to match existing data format
                const query = `INSERT INTO player_discounts (player_id, discount_id, applied_date, valid_from, valid_to, remarks) 
                               VALUES (?, ?, NOW(), ?, ?, ?)`;
                
                db.query(query, [player_id, discount_id, valid_from, valid_to, remarks], (err, result) => {
                    if (err) {
                        console.error('SQL Error:', err);
                        console.error('SQL Message:', err.sqlMessage);
                        console.error('SQL Code:', err.code);
                        return res.status(500).json({ 
                            error: err.message,
                            sqlMessage: err.sqlMessage,
                            details: 'Check if all columns exist in player_discounts table'
                        });
                    }
                    console.log('Discount applied successfully, ID:', result.insertId);
                    res.json({ success: true, message: 'Discount applied successfully', id: result.insertId });
                });
            });
        });
});

// Apply scholarship to player 
router.post('/apply-scholarship', authenticateToken, (req, res) => {
    if (!['billing', 'admin'].includes(req.user.role)) {
        return res.status(403).json({ message: 'Access denied' });
    }
    const { player_id, scholarship_id, remarks } = req.body;
    
    console.log('Applying scholarship:', { player_id, scholarship_id, remarks });
    
    if (!player_id || !scholarship_id) {
        return res.status(400).json({ message: 'Player and scholarship are required' });
    }
    
    //Checking if this scholarship is already applied to this player
    db.query('SELECT id FROM player_scholarships WHERE player_id = ? AND scholarship_id = ?', 
        [player_id, scholarship_id], 
        (err, existing) => {
            if (err) {
                console.error('Error checking existing:', err);
                return res.status(500).json({ error: err.message });
            }
            
            if (existing.length > 0) {
                return res.status(400).json({ message: 'This scholarship has already been applied to this player' });
            }
            
            // Get scholarship details for dates
            db.query('SELECT valid_from, valid_to FROM scholarships WHERE id = ?', [scholarship_id], (err, scholarshipResult) => {
                if (err) {
                    console.error('Error fetching scholarship:', err);
                    return res.status(500).json({ error: err.message });
                }
                if (scholarshipResult.length === 0) {
                    return res.status(404).json({ message: 'Scholarship not found' });
                }
                
                const valid_from = scholarshipResult[0].valid_from || null;
                const valid_to = scholarshipResult[0].valid_to || null;
                
                console.log('Using dates:', { valid_from, valid_to });
                
                const query = `INSERT INTO player_scholarships (player_id, scholarship_id, applied_date, valid_from, valid_to, remarks) 
                               VALUES (?, ?, CURDATE(), ?, ?, ?)`;
                
                db.query(query, [player_id, scholarship_id, valid_from, valid_to, remarks || null], (err, result) => {
                    if (err) {
                        console.error('Error applying scholarship - DETAILS:', err);
                        return res.status(500).json({ error: err.message, sqlMessage: err.sqlMessage });
                    }
                    console.log('Scholarship applied successfully, ID:', result.insertId);
                    res.json({ success: true, message: 'Scholarship applied successfully', id: result.insertId });
                });
            });
        });
});

// Get active discounts and scholarships for players 
router.get('/active-discounts', authenticateToken, (req, res) => {
    if (!['billing', 'admin'].includes(req.user.role)) {
        return res.status(403).json({ message: 'Access denied' });
    }
    
    console.log('Fetching active benefits...');
    
    const query = `
        SELECT 
            pd.id, 
            p.player_name,
            d.discount_type as benefit_type, 
            d.percentage as benefit_value,
            d.max_amount as amount,
            'discount' as type,
            pd.valid_from, 
            pd.valid_to, 
            pd.remarks,
            d.max_amount as saved_amount,
            CASE 
                WHEN pd.valid_to < CURDATE() THEN 'Expired'
                ELSE 'Active'
            END as status
        FROM player_discounts pd
        JOIN players p ON pd.player_id = p.id
        JOIN discounts d ON pd.discount_id = d.id
        WHERE p.status = 'active'
        
        UNION ALL
        
        SELECT 
            ps.id, 
            p.player_name,
            s.scholarship_type as benefit_type,
            NULL as percentage,
            s.amount,
            'scholarship' as type,
            ps.valid_from, 
            ps.valid_to, 
            ps.remarks,
            s.amount as saved_amount,
            CASE 
                WHEN ps.valid_to < CURDATE() THEN 'Expired'
                ELSE 'Active'
            END as status
        FROM player_scholarships ps
        JOIN players p ON ps.player_id = p.id
        JOIN scholarships s ON ps.scholarship_id = s.id
        WHERE p.status = 'active'
        
        ORDER BY id DESC`;
    
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error in active-discounts:', err);
            return res.status(500).json({ error: err.message });
        }
        console.log('Active benefits found:', results.length);
        res.json(results || []);
    });
});

module.exports = router;