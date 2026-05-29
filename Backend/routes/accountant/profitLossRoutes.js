// ==================== PROFIT & LOSS ROUTES ====================
const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const jwt = require('jsonwebtoken');

// Authentication middleware
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

// ==================== GET PROFIT & LOSS DATA ====================
router.get('/profit-loss', authenticateToken, (req, res) => {
    console.log('Fetching Profit & Loss data with params:', req.query);
    
    if (req.user.role !== 'accountant' && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied' });
    }
    
    const { period, month, year } = req.query;
    
    let currentYear = parseInt(year) || new Date().getFullYear();
    let currentMonth = parseInt(month) || new Date().getMonth() + 1;
    
    console.log(`Period: ${period}, Year: ${currentYear}, Month: ${currentMonth}`);
    
    // Build date filters for payments and expenses
    let paymentDateFilter = '';
    let expenseDateFilter = '';
    let periodDisplay = '';
    
    if (period === 'monthly') {
        paymentDateFilter = `AND YEAR(payment_date) = ${currentYear} AND MONTH(payment_date) = ${currentMonth}`;
        expenseDateFilter = `AND YEAR(expense_date) = ${currentYear} AND MONTH(expense_date) = ${currentMonth}`;
        periodDisplay = `${currentMonth}/${currentYear}`;
    } 
    else if (period === 'quarterly') {
        let quarter = Math.ceil(currentMonth / 3);
        let startMonth = (quarter - 1) * 3 + 1;
        let endMonth = quarter * 3;
        paymentDateFilter = `AND YEAR(payment_date) = ${currentYear} AND MONTH(payment_date) BETWEEN ${startMonth} AND ${endMonth}`;
        expenseDateFilter = `AND YEAR(expense_date) = ${currentYear} AND MONTH(expense_date) BETWEEN ${startMonth} AND ${endMonth}`;
        periodDisplay = `Q${quarter} ${currentYear}`;
    } 
    else if (period === 'yearly') {
        paymentDateFilter = `AND YEAR(payment_date) = ${currentYear}`;
        expenseDateFilter = `AND YEAR(expense_date) = ${currentYear}`;
        periodDisplay = `${currentYear}`;
    } 
    else {
        // Default to current month
        paymentDateFilter = `AND YEAR(payment_date) = ${currentYear} AND MONTH(payment_date) = ${currentMonth}`;
        expenseDateFilter = `AND YEAR(expense_date) = ${currentYear} AND MONTH(expense_date) = ${currentMonth}`;
        periodDisplay = `${currentMonth}/${currentYear}`;
    }
    
    // Get total income from completed payments
    const totalIncomeQuery = `
        SELECT COALESCE(SUM(amount), 0) as total 
        FROM payments 
        WHERE status = 'completed' ${paymentDateFilter}
    `;
    
    // Get total expenses
    const totalExpensesQuery = `
        SELECT COALESCE(SUM(amount), 0) as total 
        FROM expenses 
        WHERE 1=1 ${expenseDateFilter}
    `;
    
    // Get income breakdown by payment mode
    const incomeBreakdownQuery = `
        SELECT 
            CASE 
                WHEN payment_mode = 'cash' THEN 'Cash Payment'
                WHEN payment_mode = 'upi' THEN 'UPI Payment'
                WHEN payment_mode = 'card' THEN 'Card Payment'
                WHEN payment_mode = 'bank_transfer' THEN 'Bank Transfer'
                ELSE 'Other Fees'
            END as category,
            COALESCE(SUM(amount), 0) as total
        FROM payments 
        WHERE status = 'completed' ${paymentDateFilter}
        GROUP BY payment_mode
        ORDER BY total DESC
    `;
    
    // Get expenses breakdown by category
    const expensesBreakdownQuery = `
        SELECT 
            COALESCE(category, 'Other') as category,
            COALESCE(SUM(amount), 0) as total
        FROM expenses 
        WHERE 1=1 ${expenseDateFilter}
        GROUP BY category
        ORDER BY total DESC
    `;
    
    // Execute queries
    db.query(totalIncomeQuery, (err, incomeResult) => {
        if (err) {
            console.error('Error getting total income:', err);
            return res.status(500).json({ error: err.message });
        }
        
        const totalIncome = parseFloat(incomeResult[0]?.total) || 0;
        console.log(`Total Income: ${totalIncome}`);
        
        db.query(totalExpensesQuery, (err, expenseResult) => {
            if (err) {
                console.error('Error getting total expenses:', err);
                return res.status(500).json({ error: err.message });
            }
            
            const totalExpenses = parseFloat(expenseResult[0]?.total) || 0;
            const netProfit = totalIncome - totalExpenses;
            const profitMargin = totalIncome > 0 ? ((netProfit / totalIncome) * 100).toFixed(2) : 0;
            
            console.log(`Total Expenses: ${totalExpenses}, Net Profit: ${netProfit}`);
            
            // Get income breakdown
            db.query(incomeBreakdownQuery, (err, incomeBreakdown) => {
                if (err) {
                    console.error('Error getting income breakdown:', err);
                    return res.status(500).json({ error: err.message });
                }
                
                // Get expenses breakdown
                db.query(expensesBreakdownQuery, (err, expensesBreakdown) => {
                    if (err) {
                        console.error('Error getting expenses breakdown:', err);
                        return res.status(500).json({ error: err.message });
                    }
                    
                    // Format income breakdown
                    let incomeList = [];
                    if (incomeBreakdown && incomeBreakdown.length > 0) {
                        incomeBreakdown.forEach(item => {
                            const amount = parseFloat(item.total) || 0;
                            incomeList.push({
                                name: item.category,
                                amount: amount,
                                percentage: totalIncome > 0 ? ((amount / totalIncome) * 100).toFixed(2) : 0
                            });
                        });
                    }
                    
                    // If no income data, show a message
                    if (incomeList.length === 0) {
                        incomeList = [{
                            name: 'No Income Records',
                            amount: 0,
                            percentage: 0
                        }];
                    }
                    
                    // Format expenses breakdown
                    let expenseList = [];
                    if (expensesBreakdown && expensesBreakdown.length > 0) {
                        expensesBreakdown.forEach(item => {
                            const amount = parseFloat(item.total) || 0;
                            expenseList.push({
                                name: item.category,
                                amount: amount,
                                percentage: totalIncome > 0 ? ((amount / totalIncome) * 100).toFixed(2) : 0
                            });
                        });
                    }
                    
                    // If no expense data, show a message
                    if (expenseList.length === 0) {
                        expenseList = [{
                            name: 'No Expense Records',
                            amount: 0,
                            percentage: 0
                        }];
                    }
                    
                    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                                       'July', 'August', 'September', 'October', 'November', 'December'];
                    
                    res.json({
                        period: {
                            month: currentMonth,
                            month_name: monthNames[currentMonth - 1],
                            year: currentYear,
                            type: period || 'monthly',
                            display: periodDisplay
                        },
                        total_income: totalIncome,
                        total_expenses: totalExpenses,
                        net_profit: netProfit,
                        profit_margin: profitMargin,
                        income_breakdown: incomeList,
                        expenses_breakdown: expenseList
                    });
                });
            });
        });
    });
});

module.exports = router;