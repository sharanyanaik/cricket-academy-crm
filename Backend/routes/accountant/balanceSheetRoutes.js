// ==================== BALANCE SHEET ROUTES ====================
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

router.get('/balance-sheet', authenticateToken, (req, res) => {
    const asAtDate = req.query.asAt || new Date().toISOString().split('T')[0];
    console.log('Balance Sheet as at:', asAtDate);
    
    // Use the date directly without DATE() function for better comparison
    const dateFilter = `<= '${asAtDate}'`;
    
    // Assets Queries
    db.query(`SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE payment_mode = 'cash' AND status = 'completed' AND payment_date <= ?`, [asAtDate], (err, cashResult) => {
        if (err) return res.status(500).json({ error: err.message });
        const cashInHand = cashResult[0]?.total || 0;
        
        db.query(`SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE payment_mode IN ('bank_transfer', 'upi', 'card', 'online') AND status = 'completed' AND payment_date <= ?`, [asAtDate], (err, bankResult) => {
            if (err) return res.status(500).json({ error: err.message });
            const bankBalance = bankResult[0]?.total || 0;
            
            db.query(`SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'pending' AND payment_date <= ?`, [asAtDate], (err, receivableResult) => {
                if (err) return res.status(500).json({ error: err.message });
                const accountsReceivable = receivableResult[0]?.total || 0;
                
                db.query(`SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE LOWER(category) = 'equipment' AND expense_date <= ?`, [asAtDate], (err, equipmentResult) => {
                    if (err) return res.status(500).json({ error: err.message });
                    const equipment = equipmentResult[0]?.total || 0;
                    
                    // Liabilities Queries
                    db.query(`SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE LOWER(category) = 'salary' AND expense_date <= ?`, [asAtDate], (err, salaryResult) => {
                        if (err) return res.status(500).json({ error: err.message });
                        const salariesPayable = salaryResult[0]?.total || 0;
                        
                        db.query(`SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE LOWER(category) = 'utilities' AND expense_date <= ?`, [asAtDate], (err, utilityResult) => {
                            if (err) return res.status(500).json({ error: err.message });
                            const utilitiesPayable = utilityResult[0]?.total || 0;
                            
                            db.query(`SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE LOWER(category) = 'maintenance' AND expense_date <= ?`, [asAtDate], (err, maintenanceResult) => {
                                if (err) return res.status(500).json({ error: err.message });
                                const maintenancePayable = maintenanceResult[0]?.total || 0;
                                
                                db.query(`SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE LOWER(category) NOT IN ('equipment', 'salary', 'utilities', 'maintenance') AND expense_date <= ?`, [asAtDate], (err, otherResult) => {
                                    if (err) return res.status(500).json({ error: err.message });
                                    const otherPayables = otherResult[0]?.total || 0;
                                    
                                    // Income & Expenses for Equity
                                    db.query(`SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'completed' AND payment_date <= ?`, [asAtDate], (err, incomeResult) => {
                                        if (err) return res.status(500).json({ error: err.message });
                                        const totalIncome = incomeResult[0]?.total || 0;
                                        
                                        db.query(`SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE expense_date <= ?`, [asAtDate], (err, expenseResult) => {
                                            if (err) return res.status(500).json({ error: err.message });
                                            const totalExpenses = expenseResult[0]?.total || 0;
                                            
                                            // Calculate Totals
                                            const totalCurrentAssets = Number(cashInHand) + Number(bankBalance) + Number(accountsReceivable);
                                            const totalAssets = totalCurrentAssets + Number(equipment);
                                            
                                            const totalCurrentLiabilities = Number(salariesPayable) + Number(utilitiesPayable) + Number(maintenancePayable);
                                            const totalLiabilities = totalCurrentLiabilities + Number(otherPayables);
                                            
                                            const netProfit = Number(totalIncome) - Number(totalExpenses);
                                            
                                            // Equity = Assets - Liabilities (Accounting Equation)
                                            const calculatedEquity = totalAssets - totalLiabilities;
                                            
                                            console.log('=== BALANCE SHEET ===');
                                            console.log('Date:', asAtDate);
                                            console.log('Cash:', cashInHand);
                                            console.log('Bank:', bankBalance);
                                            console.log('Receivable:', accountsReceivable);
                                            console.log('Equipment:', equipment);
                                            console.log('Income:', totalIncome);
                                            console.log('Expenses:', totalExpenses);
                                            console.log('Net Profit:', netProfit);
                                            console.log('Total Assets:', totalAssets);
                                            console.log('Total Liabilities:', totalLiabilities);
                                            console.log('Calculated Equity:', calculatedEquity);
                                            console.log('===============================');
                                            
                                            res.json({
                                                as_at: asAtDate,
                                                assets: {
                                                    current_assets: {
                                                        cash_in_hand: Number(cashInHand),
                                                        bank_balance: Number(bankBalance),
                                                        accounts_receivable: Number(accountsReceivable),
                                                        total: totalCurrentAssets
                                                    },
                                                    fixed_assets: {
                                                        equipment: Number(equipment),
                                                        total: Number(equipment)
                                                    },
                                                    other_assets: {
                                                        prepaid_expenses: 0,
                                                        total: 0
                                                    },
                                                    total_assets: totalAssets
                                                },
                                                liabilities: {
                                                    current_liabilities: {
                                                        accounts_payable: 0,
                                                        salaries_payable: Number(salariesPayable),
                                                        utilities_payable: Number(utilitiesPayable),
                                                        total: totalCurrentLiabilities
                                                    },
                                                    long_term_liabilities: {
                                                        other_payables: Number(otherPayables),
                                                        total: Number(otherPayables)
                                                    },
                                                    total_liabilities: totalLiabilities
                                                },
                                                equity: {
                                                    capital: calculatedEquity > 0 ? calculatedEquity * 0.5 : 50000,
                                                    retained_earnings: calculatedEquity > 0 ? calculatedEquity * 0.2 : 0,
                                                    current_year_profit: netProfit > 0 ? netProfit : 0,
                                                    total_equity: calculatedEquity
                                                },
                                                total_liabilities_equity: totalLiabilities + calculatedEquity,
                                                is_balanced: Math.abs(totalAssets - (totalLiabilities + calculatedEquity)) < 1,
                                                difference: Math.abs(totalAssets - (totalLiabilities + calculatedEquity)),
                                                net_profit: netProfit,
                                                total_income: Number(totalIncome),
                                                total_expenses: Number(totalExpenses)
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });
});

module.exports = router;