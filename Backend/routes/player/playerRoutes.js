const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

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

// Dashboard Routes
const dashboardRoutes = require('./dashboardRoutes');
const profileRoutes = require('./profileRoutes');
const paymentRoutes = require('./paymentRoutes');
const attendanceRoutes = require('./attendanceRoutes');

router.use('/dashboard', dashboardRoutes);
router.use('/profile', profileRoutes);
router.use('/payments', paymentRoutes);
router.use('/attendance', attendanceRoutes);

module.exports = router;