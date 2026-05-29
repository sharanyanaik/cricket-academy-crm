// ==================== SIMPLIFIED TAX REPORT ROUTES ====================
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

router.get('/tax-report', authenticateToken, (req, res) => {
    console.log('Fetching Tax Report data');
    
    // Get total income from payments
    db.query(`SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'completed'`, (err, incomeResult) => {
        if (err) return res.status(500).json({ error: err.message });
        const totalIncome = incomeResult[0]?.total || 0;
        
        // Get total expenses
        db.query(`SELECT COALESCE(SUM(amount), 0) as total FROM expenses`, (err, expenseResult) => {
            if (err) return res.status(500).json({ error: err.message });
            const totalExpenses = expenseResult[0]?.total || 0;
            
            // Get equipment expenses for ITC
            db.query(`SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE LOWER(category) = 'equipment'`, (err, equipmentResult) => {
                if (err) return res.status(500).json({ error: err.message });
                const equipmentExpenses = equipmentResult[0]?.total || 0;
                
                // Calculate GST (18% on income)
                const gstRate = 0.18;
                const totalGST = totalIncome * gstRate;
                
                // Calculate ITC (18% on equipment)
                const inputTaxCredit = equipmentExpenses * gstRate;
                
                // Net GST Payable
                const netGSTPayable = totalGST - inputTaxCredit;
                
                // Taxable income
                const taxableIncome = totalIncome - totalExpenses;
                
                // Simple tax calculation (assume 30% tax on profit)
                const estimatedTax = taxableIncome > 0 ? taxableIncome * 0.30 : 0;
                
                res.json({
                    total_income: totalIncome,
                    total_expenses: totalExpenses,
                    taxable_income: taxableIncome,
                    gst_collected: totalGST,
                    input_tax_credit: inputTaxCredit,
                    net_gst_payable: netGSTPayable > 0 ? netGSTPayable : 0,
                    estimated_income_tax: estimatedTax,
                    total_tax_liability: (netGSTPayable > 0 ? netGSTPayable : 0) + estimatedTax
                });
            });
        });
    });
});

module.exports = router;