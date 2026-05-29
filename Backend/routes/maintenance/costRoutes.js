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

// GET EXPENSE SUMMARY
router.get('/summary', authenticateToken, (req, res) => {
    // This month
    db.query('SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE MONTH(expense_date) = MONTH(CURDATE()) AND YEAR(expense_date) = YEAR(CURDATE())', 
    (err, thisMonth) => {
        if (err) {
            console.error('Error fetching this month:', err);
            return res.status(500).json({ error: err.message });
        }
        
        // This quarter
        db.query('SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE QUARTER(expense_date) = QUARTER(CURDATE()) AND YEAR(expense_date) = YEAR(CURDATE())', 
        (err, thisQuarter) => {
            if (err) {
                console.error('Error fetching this quarter:', err);
                return res.status(500).json({ error: err.message });
            }
            
            // This year
            db.query('SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE YEAR(expense_date) = YEAR(CURDATE())', 
            (err, thisYear) => {
                if (err) {
                    console.error('Error fetching this year:', err);
                    return res.status(500).json({ error: err.message });
                }
                
                // Average monthly (last 12 months)
                db.query('SELECT COALESCE(AVG(monthly_total), 0) as avg FROM (SELECT SUM(amount) as monthly_total FROM expenses WHERE expense_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH) GROUP BY MONTH(expense_date)) as monthly', 
                (err, avgMonthly) => {
                    if (err) {
                        console.error('Error fetching avg monthly:', err);
                        return res.status(500).json({ error: err.message });
                    }
                    
                    res.json({
                        thisMonth: thisMonth[0]?.total || 0,
                        thisQuarter: thisQuarter[0]?.total || 0,
                        thisYear: thisYear[0]?.total || 0,
                        avgMonthly: avgMonthly[0]?.avg || 0
                    });
                });
            });
        });
    });
});

// GET ALL EXPENSES 
router.get('/expenses', authenticateToken, (req, res) => {
    const query = 'SELECT id, category, description, amount, expense_date, payment_mode, created_at FROM expenses ORDER BY expense_date DESC';
    
    db.query(query, (err, expenses) => {
        if (err) {
            console.error('Error fetching expenses:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json(expenses || []);
    });
});

// ADD EXPENSE
router.post('/expenses', authenticateToken, (req, res) => {
    const { category, description, amount, expense_date, payment_mode } = req.body;
    
    if (!category || !amount || !expense_date) {
        return res.status(400).json({ message: 'Category, amount, and date are required' });
    }
    
    const query = `INSERT INTO expenses (category, description, amount, expense_date, payment_mode, created_at) 
                   VALUES (?, ?, ?, ?, ?, NOW())`;
    
    db.query(query, [category, description || null, amount, expense_date, payment_mode || 'cash'], 
    (err, result) => {
        if (err) {
            console.error('Error adding expense:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json({ success: true, message: 'Expense added successfully', id: result.insertId });
    });
});

// UPDATE EXPENSE 
router.put('/expenses/:id', authenticateToken, (req, res) => {
    const expenseId = req.params.id;
    const { category, description, amount, expense_date, payment_mode } = req.body;
    
    const query = `UPDATE expenses 
                   SET category = ?, description = ?, amount = ?, expense_date = ?, payment_mode = ? 
                   WHERE id = ?`;
    
    db.query(query, [category, description || null, amount, expense_date, payment_mode || 'cash', expenseId], 
    (err, result) => {
        if (err) {
            console.error('Error updating expense:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json({ success: true, message: 'Expense updated successfully' });
    });
});

// DELETE EXPENSE
router.delete('/expenses/:id', authenticateToken, (req, res) => {
    const expenseId = req.params.id;
    
    db.query('DELETE FROM expenses WHERE id = ?', [expenseId], (err, result) => {
        if (err) {
            console.error('Error deleting expense:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json({ success: true, message: 'Expense deleted successfully' });
    });
});

// GET CATEGORY SUMMARY
router.get('/category-summary', authenticateToken, (req, res) => {
    const query = `
        SELECT 
            category,
            COALESCE(SUM(CASE WHEN MONTH(expense_date) = MONTH(CURDATE()) AND YEAR(expense_date) = YEAR(CURDATE()) THEN amount ELSE 0 END), 0) as thisMonth,
            COALESCE(SUM(CASE WHEN MONTH(expense_date) = MONTH(CURDATE() - INTERVAL 1 MONTH) AND YEAR(expense_date) = YEAR(CURDATE() - INTERVAL 1 MONTH) THEN amount ELSE 0 END), 0) as lastMonth
        FROM expenses
        GROUP BY category
        ORDER BY thisMonth DESC
    `;
    
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching category summary:', err);
            return res.status(500).json({ error: err.message });
        }
        
        const summary = results.map(item => {
            const thisM = parseFloat(item.thisMonth);
            const lastM = parseFloat(item.lastMonth);
            let percentChange = 0;
            if (lastM > 0) {
                percentChange = ((thisM - lastM) / lastM) * 100;
            } else if (thisM > 0) {
                percentChange = 100;
            }
            return {
                category: item.category,
                thisMonth: thisM,
                lastMonth: lastM,
                percentChange: percentChange.toFixed(1)
            };
        });
        
        res.json(summary);
    });
});

module.exports = router;