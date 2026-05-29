//=================== FEE STRUCTURE =====================

const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const { authenticateToken, authorizeAdmin } = require('../../middleware/auth');
const { addAuditLog } = require('../../utils/auditLog');


// Get all batches with their fee structures
router.get('/batches-with-fees', authenticateToken, authorizeAdmin, (req, res) => {
    const query = `
        SELECT 
            b.id,
            b.batch_name,
            b.timing,
            b.status as batch_status,
            COALESCE(f.monthly_fee, 0) as monthly_fee,
            COALESCE(f.quarterly_fee, 0) as quarterly_fee,
            COALESCE(f.yearly_fee, 0) as yearly_fee,
            COALESCE(f.registration_fee, 0) as registration_fee,
            f.id as fee_id,
            f.status as fee_status
        FROM batches b
        LEFT JOIN fee_structure f ON b.id = f.batch_id
        WHERE b.status = 'active'
        ORDER BY b.batch_name
    `;
    
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching batches with fees:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

// Get single batch fee structure
router.get('/fee/:batchId', authenticateToken, authorizeAdmin, (req, res) => {
    const batchId = req.params.batchId;
    
    const query = `
        SELECT 
            b.id,
            b.batch_name,
            b.timing,
            COALESCE(f.monthly_fee, 0) as monthly_fee,
            COALESCE(f.quarterly_fee, 0) as quarterly_fee,
            COALESCE(f.yearly_fee, 0) as yearly_fee,
            COALESCE(f.registration_fee, 0) as registration_fee,
            f.status as fee_status,
            f.id as fee_id
        FROM batches b
        LEFT JOIN fee_structure f ON b.id = f.batch_id
        WHERE b.id = ?
    `;
    
    db.query(query, [batchId], (err, results) => {
        if (err) {
            console.error('Error fetching fee structure:', err);
            return res.status(500).json({ error: err.message });
        }
        if (results.length === 0) {
            return res.status(404).json({ message: 'Batch not found' });
        }
        res.json(results[0]);
    });
});

// Create or update fee structure
router.post('/fee', authenticateToken, authorizeAdmin, (req, res) => {
    const { batch_id, monthly_fee, quarterly_fee, yearly_fee, registration_fee, status } = req.body;
    
    if (!batch_id) {
        return res.status(400).json({ message: 'Batch ID is required' });
    }
    
    db.query('SELECT id FROM fee_structure WHERE batch_id = ?', [batch_id], (err, results) => {
        if (err) {
            console.error('Error checking fee structure:', err);
            return res.status(500).json({ error: err.message });
        }
        
        const isUpdate = results.length > 0;
        
        if (isUpdate) {
            db.query(
                `UPDATE fee_structure 
                 SET monthly_fee = ?, quarterly_fee = ?, yearly_fee = ?, registration_fee = ?, status = ?
                 WHERE batch_id = ?`,
                [monthly_fee || 0, quarterly_fee || 0, yearly_fee || 0, registration_fee || 0, status || 'active', batch_id],
                (err) => {
                    if (err) {
                        console.error('Error updating fee structure:', err);
                        return res.status(500).json({ error: err.message });
                    }
                    
                    // Add audit log for update
                    addAuditLog(req.user.id, 'UPDATE_FEE', `Updated fee structure for batch ID: ${batch_id}`);
                    
                    res.json({ message: 'Fee structure updated successfully' });
                }
            );
        } else {
            db.query(
                `INSERT INTO fee_structure (batch_id, monthly_fee, quarterly_fee, yearly_fee, registration_fee, status) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [batch_id, monthly_fee || 0, quarterly_fee || 0, yearly_fee || 0, registration_fee || 0, status || 'active'],
                (err, result) => {
                    if (err) {
                        console.error('Error inserting fee structure:', err);
                        return res.status(500).json({ error: err.message });
                    }
                    
                    // Add audit log for create
                    addAuditLog(req.user.id, 'CREATE_FEE', `Added fee structure for batch ID: ${batch_id}`);
                    
                    res.json({ message: 'Fee structure added successfully', id: result.insertId });
                }
            );
        }
    });
});

// Delete fee structure
router.delete('/fee/:id', authenticateToken, authorizeAdmin, (req, res) => {
    const feeId = req.params.id;
    
    // Get batch info for audit log
    db.query('SELECT batch_id FROM fee_structure WHERE id = ?', [feeId], (err, result) => {
        const batchId = (result && result[0]) ? result[0].batch_id : feeId;
        
        db.query('DELETE FROM fee_structure WHERE id = ?', [feeId], (err) => {
            if (err) {
                console.error('Error deleting fee structure:', err);
                return res.status(500).json({ error: err.message });
            }
            
            // Add audit log
            addAuditLog(req.user.id, 'DELETE_FEE', `Deleted fee structure ID: ${feeId} (Batch ID: ${batchId})`);
            
            res.json({ message: 'Fee structure deleted successfully' });
        });
    });
});


//============================ DISCOUNTS ENDPOINTS========================
// Get all discounts
router.get('/discounts', authenticateToken, authorizeAdmin, (req, res) => {
    db.query('SELECT * FROM discounts ORDER BY created_at DESC', (err, results) => {
        if (err) {
            console.error('Error fetching discounts:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

// Get single discount
router.get('/discounts/:id', authenticateToken, authorizeAdmin, (req, res) => {
    const discountId = req.params.id;
    
    db.query('SELECT * FROM discounts WHERE id = ?', [discountId], (err, results) => {
        if (err) {
            console.error('Error fetching discount:', err);
            return res.status(500).json({ error: err.message });
        }
        if (results.length === 0) {
            return res.status(404).json({ message: 'Discount not found' });
        }
        res.json(results[0]);
    });
});

// Add discount
router.post('/discounts', authenticateToken, authorizeAdmin, (req, res) => {
    const { discount_type, eligibility, percentage, max_amount, valid_from, valid_to, status } = req.body;
    
    if (!discount_type) {
        return res.status(400).json({ message: 'Discount type is required' });
    }
    
    const query = `INSERT INTO discounts (discount_type, eligibility, percentage, max_amount, valid_from, valid_to, status) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    
    db.query(query, [discount_type, eligibility || null, percentage || 0, max_amount || 0, valid_from || null, valid_to || null, status || 'active'], 
    (err, result) => {
        if (err) {
            console.error('Error adding discount:', err);
            return res.status(500).json({ error: err.message });
        }
        
        // Add audit log 
        addAuditLog(req.user.id, 'CREATE_DISCOUNT', `Added discount: ${discount_type} (${percentage}%)`);
        
        res.json({ message: 'Discount added successfully', id: result.insertId });
    });
});

// Update discount
router.put('/discounts/:id', authenticateToken, authorizeAdmin, (req, res) => {
    const discountId = req.params.id;
    const { discount_type, eligibility, percentage, max_amount, valid_from, valid_to, status } = req.body;
    
    const query = `UPDATE discounts SET discount_type = ?, eligibility = ?, percentage = ?, max_amount = ?, valid_from = ?, valid_to = ?, status = ? WHERE id = ?`;
    
    db.query(query, [discount_type, eligibility || null, percentage || 0, max_amount || 0, valid_from || null, valid_to || null, status || 'active', discountId], 
    (err, result) => {
        if (err) {
            console.error('Error updating discount:', err);
            return res.status(500).json({ error: err.message });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Discount not found' });
        }
        
        // Add audit log
        addAuditLog(req.user.id, 'UPDATE_DISCOUNT', `Updated discount ID: ${discountId} - ${discount_type}`);
        
        res.json({ message: 'Discount updated successfully' });
    });
});

// Delete discount
router.delete('/discounts/:id', authenticateToken, authorizeAdmin, (req, res) => {
    const discountId = req.params.id;
    
    // Get discount info for audit log
    db.query('SELECT discount_type FROM discounts WHERE id = ?', [discountId], (err, result) => {
        const discountType = (result && result[0]) ? result[0].discount_type : discountId;
        
        db.query('DELETE FROM discounts WHERE id = ?', [discountId], (err, result) => {
            if (err) {
                console.error('Error deleting discount:', err);
                return res.status(500).json({ error: err.message });
            }
            if (result.affectedRows === 0) {
                return res.status(404).json({ message: 'Discount not found' });
            }
            
            // Add audit log 
            addAuditLog(req.user.id, 'DELETE_DISCOUNT', `Deleted discount: ${discountType} (ID: ${discountId})`);
            
            res.json({ message: 'Discount deleted successfully' });
        });
    });
});

// LATE FEE RULES ENDPOINTS

// Get all late fee rules
router.get('/late-fees', authenticateToken, authorizeAdmin, (req, res) => {
    db.query('SELECT * FROM late_fee_rules ORDER BY min_days ASC', (err, results) => {
        if (err) {
            console.error('Error fetching late fees:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

// Get single late fee rule
router.get('/late-fees/:id', authenticateToken, authorizeAdmin, (req, res) => {
    const ruleId = req.params.id;
    
    db.query('SELECT * FROM late_fee_rules WHERE id = ?', [ruleId], (err, results) => {
        if (err) {
            console.error('Error fetching late fee rule:', err);
            return res.status(500).json({ error: err.message });
        }
        if (results.length === 0) {
            return res.status(404).json({ message: 'Late fee rule not found' });
        }
        res.json(results[0]);
    });
});

// Add late fee rule
router.post('/late-fees', authenticateToken, authorizeAdmin, (req, res) => {
    const { min_days, max_days, fee_amount } = req.body;
    
    if (!min_days || !fee_amount) {
        return res.status(400).json({ message: 'Min days and fee amount are required' });
    }
    
    const query = `INSERT INTO late_fee_rules (min_days, max_days, fee_amount) VALUES (?, ?, ?)`;
    
    db.query(query, [min_days, max_days || null, fee_amount], (err, result) => {
        if (err) {
            console.error('Error adding late fee rule:', err);
            return res.status(500).json({ error: err.message });
        }
        
        // Add audit log 
        addAuditLog(req.user.id, 'CREATE_LATE_FEE', `Added late fee rule: ${min_days}-${max_days || '+'} days = ₹${fee_amount}`);
        
        res.json({ message: 'Late fee rule added successfully', id: result.insertId });
    });
});

// Update late fee rule
router.put('/late-fees/:id', authenticateToken, authorizeAdmin, (req, res) => {
    const ruleId = req.params.id;
    const { min_days, max_days, fee_amount } = req.body;
    
    const query = `UPDATE late_fee_rules SET min_days = ?, max_days = ?, fee_amount = ? WHERE id = ?`;
    
    db.query(query, [min_days, max_days || null, fee_amount, ruleId], (err, result) => {
        if (err) {
            console.error('Error updating late fee rule:', err);
            return res.status(500).json({ error: err.message });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Late fee rule not found' });
        }
        
        // Add audit log - REMOVED ip and req
        addAuditLog(req.user.id, 'UPDATE_LATE_FEE', `Updated late fee rule ID: ${ruleId}`);
        
        res.json({ message: 'Late fee rule updated successfully' });
    });
});

// Delete late fee rule
router.delete('/late-fees/:id', authenticateToken, authorizeAdmin, (req, res) => {
    const ruleId = req.params.id;
    
    db.query('DELETE FROM late_fee_rules WHERE id = ?', [ruleId], (err, result) => {
        if (err) {
            console.error('Error deleting late fee rule:', err);
            return res.status(500).json({ error: err.message });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Late fee rule not found' });
        }
        
        // Add audit log 
        addAuditLog(req.user.id, 'DELETE_LATE_FEE', `Deleted late fee rule ID: ${ruleId}`);
        
        res.json({ message: 'Late fee rule deleted successfully' });
    });
});

module.exports = router;