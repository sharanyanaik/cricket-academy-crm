// ==================== LEDGER ROUTES ====================
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

// ==================== GET LEDGER DATA ====================
router.get('/ledger', authenticateToken, (req, res) => {
    console.log('Fetching ledger data with filters:', req.query);
    
    if (req.user.role !== 'accountant' && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied' });
    }
    
    const { from, to, type, search } = req.query;
    
    // ==================== COMPLETED PAYMENTS====================
    let completedPaymentQuery = `
        SELECT 
            p.id, 
            DATE_FORMAT(p.payment_date, '%Y-%m-%d') as date, 
            p.amount, 
            CONCAT('PAY-', p.id) as voucher_no, 
            CONCAT('Fee received from ', u.full_name) as description,
            'fee_completed' as trans_type,
            'Fee Collection' as display_type,
            p.amount as debit, 
            0 as credit
        FROM payments p
        JOIN users u ON p.player_id = u.id
        WHERE p.status = 'completed'
    `;
    
    // ==================== PENDING PAYMENTS ====================
    let pendingPaymentQuery = `
        SELECT 
            p.id, 
            DATE_FORMAT(p.payment_date, '%Y-%m-%d') as date, 
            p.amount, 
            CONCAT('PEND-', p.id) as voucher_no, 
            CONCAT('Pending payment from ', u.full_name, ' (Not yet received)') as description,
            'fee_pending' as trans_type,
            'Pending Fee' as display_type,
            0 as debit, 
            0 as credit
        FROM payments p
        JOIN users u ON p.player_id = u.id
        WHERE p.status = 'pending'
    `;
    
    // ==================== EXPENSES ====================
    let expenseQuery = `
        SELECT 
            e.id, 
            DATE_FORMAT(e.expense_date, '%Y-%m-%d') as date, 
            e.amount, 
            CONCAT('EXP-', e.id) as voucher_no, 
            CONCAT(e.description, ' (', e.category, ')') as description,
            'expense' as trans_type,
            'Expense' as display_type,
            0 as debit, 
            e.amount as credit
        FROM expenses e
        WHERE 1=1
    `;
    
    // ==================== APPLY DATE FILTERS ====================
    if (from) {
        completedPaymentQuery += ` AND p.payment_date >= '${from}'`;
        pendingPaymentQuery += ` AND p.payment_date >= '${from}'`;
        expenseQuery += ` AND e.expense_date >= '${from}'`;
    }
    if (to) {
        completedPaymentQuery += ` AND p.payment_date <= '${to}'`;
        pendingPaymentQuery += ` AND p.payment_date <= '${to}'`;
        expenseQuery += ` AND e.expense_date <= '${to}'`;
    }
    
    // ==================== APPLY SEARCH FILTERS ====================
    if (search) {
        completedPaymentQuery += ` AND u.full_name LIKE '%${search}%'`;
        pendingPaymentQuery += ` AND u.full_name LIKE '%${search}%'`;
        expenseQuery += ` AND (e.description LIKE '%${search}%' OR e.category LIKE '%${search}%')`;
    }
    
    // ==================== HANDLE FILTER TYPE ====================
    if (type === 'fee') {
        // Show only fee-related (completed + pending)
        db.query(completedPaymentQuery, (err, completedPayments) => {
            if (err) return res.status(500).json({ error: err.message });
            
            db.query(pendingPaymentQuery, (err, pendingPayments) => {
                if (err) return res.status(500).json({ error: err.message });
                
                let allTransactions = [...completedPayments, ...pendingPayments];
                allTransactions.sort((a, b) => new Date(a.date) - new Date(b.date));
                
                let totalDebits = allTransactions.reduce((sum, t) => sum + (parseFloat(t.debit) || 0), 0);
                let totalCredits = allTransactions.reduce((sum, t) => sum + (parseFloat(t.credit) || 0), 0);
                
                res.json({
                    transactions: allTransactions,
                    opening_balance: 0,
                    total_debits: totalDebits,
                    total_credits: totalCredits,
                    closing_balance: totalDebits - totalCredits,
                    filter_type: 'fee'
                });
            });
        });
    } 
    else if (type === 'expense') {
        // Show only expenses
        db.query(expenseQuery, (err, expenses) => {
            if (err) return res.status(500).json({ error: err.message });
            
            expenses.sort((a, b) => new Date(a.date) - new Date(b.date));
            
            let totalDebits = expenses.reduce((sum, t) => sum + (parseFloat(t.debit) || 0), 0);
            let totalCredits = expenses.reduce((sum, t) => sum + (parseFloat(t.credit) || 0), 0);
            
            res.json({
                transactions: expenses,
                opening_balance: 0,
                total_debits: totalDebits,
                total_credits: totalCredits,
                closing_balance: totalDebits - totalCredits,
                filter_type: 'expense'
            });
        });
    }
    else {
        db.query(completedPaymentQuery, (err, completedPayments) => {
            if (err) return res.status(500).json({ error: err.message });
            
            db.query(pendingPaymentQuery, (err, pendingPayments) => {
                if (err) return res.status(500).json({ error: err.message });
                
                db.query(expenseQuery, (err, expenses) => {
                    if (err) return res.status(500).json({ error: err.message });
                    
                    // Calculate opening balance 
                    let openingBalanceQuery = `
                        SELECT COALESCE(SUM(amount), 0) as total_collected
                        FROM payments
                        WHERE status = 'completed'
                    `;
                    
                    if (from) {
                        openingBalanceQuery += ` AND payment_date < '${from}'`;
                    }
                    
                    db.query(openingBalanceQuery, (err, openingResult) => {
                        if (err) {
                            console.error('Error getting opening balance:', err);
                            return res.status(500).json({ error: err.message });
                        }
                        
                        let openingBalance = parseFloat(openingResult[0]?.total_collected) || 0;
                        
                        // Also subtract expenses before 'from' date
                        if (from) {
                            let pastExpensesQuery = `SELECT COALESCE(SUM(amount), 0) as total_expenses FROM expenses WHERE expense_date < '${from}'`;
                            db.query(pastExpensesQuery, (err, expenseResult) => {
                                if (!err && expenseResult[0]) {
                                    openingBalance -= parseFloat(expenseResult[0].total_expenses) || 0;
                                }
                                
                                // Create balance transactions 
                                let balanceTransactions = [...completedPayments, ...expenses];
                                balanceTransactions.sort((a, b) => new Date(a.date) - new Date(b.date));
                                
                                // Calculate running balance
                                let runningBalance = openingBalance;
                                balanceTransactions = balanceTransactions.map(t => {
                                    if (t.trans_type === 'fee_completed') {
                                        runningBalance += parseFloat(t.debit) || 0;
                                    } else if (t.trans_type === 'expense') {
                                        runningBalance -= parseFloat(t.credit) || 0;
                                    }
                                    t.running_balance = runningBalance;
                                    return t;
                                });
                                
                                // Add pending payments 
                                let pendingWithInfo = pendingPayments.map(p => ({
                                    ...p,
                                    running_balance: null
                                }));
                                
                                let allTransactions = [...pendingWithInfo, ...balanceTransactions];
                                allTransactions.sort((a, b) => new Date(a.date) - new Date(b.date));
                                
                                let totalDebits = balanceTransactions.reduce((sum, t) => sum + (parseFloat(t.debit) || 0), 0);
                                let totalCredits = balanceTransactions.reduce((sum, t) => sum + (parseFloat(t.credit) || 0), 0);
                                let closingBalance = openingBalance + totalDebits - totalCredits;
                                
                                res.json({
                                    transactions: allTransactions,
                                    opening_balance: openingBalance,
                                    total_debits: totalDebits,
                                    total_credits: totalCredits,
                                    closing_balance: closingBalance,
                                    filter_type: 'all'
                                });
                            });
                        } else {
                            
                            let balanceTransactions = [...completedPayments, ...expenses];
                            balanceTransactions.sort((a, b) => new Date(a.date) - new Date(b.date));
                            
                            let runningBalance = openingBalance;
                            balanceTransactions = balanceTransactions.map(t => {
                                if (t.trans_type === 'fee_completed') {
                                    runningBalance += parseFloat(t.debit) || 0;
                                } else if (t.trans_type === 'expense') {
                                    runningBalance -= parseFloat(t.credit) || 0;
                                }
                                t.running_balance = runningBalance;
                                return t;
                            });
                            
                            let pendingWithInfo = pendingPayments.map(p => ({
                                ...p,
                                running_balance: null
                            }));
                            
                            let allTransactions = [...pendingWithInfo, ...balanceTransactions];
                            allTransactions.sort((a, b) => new Date(a.date) - new Date(b.date));
                            
                            let totalDebits = balanceTransactions.reduce((sum, t) => sum + (parseFloat(t.debit) || 0), 0);
                            let totalCredits = balanceTransactions.reduce((sum, t) => sum + (parseFloat(t.credit) || 0), 0);
                            let closingBalance = openingBalance + totalDebits - totalCredits;
                            
                            res.json({
                                transactions: allTransactions,
                                opening_balance: openingBalance,
                                total_debits: totalDebits,
                                total_credits: totalCredits,
                                closing_balance: closingBalance,
                                filter_type: 'all'
                            });
                        }
                    });
                });
            });
        });
    }
});

module.exports = router;