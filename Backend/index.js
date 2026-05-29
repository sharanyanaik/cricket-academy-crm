const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
require('./config/db');

const app = express();
app.use(cors());
app.use(express.json());

// ==================== PREVENT CACHING FOR AUTHENTICATED PAGES ====================
app.use((req, res, next) => {
    // Skip for API routes
    if (req.url.startsWith('/api/')) {
        return next();
    }
    
    // Skip for static assets
    if (req.url.match(/\.(css|js|jpg|jpeg|png|gif|ico|svg|woff|woff2)$/)) {
        return next();
    }
    
    // Set headers to prevent caching for HTML pages
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
});

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../Frontend')));

// ==================== ADMIN ROUTES ====================
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/admin/userRoutes');
const adminDashboardRoutes = require('./routes/admin/dashboardRoutes');
const adminCoachRoutes = require('./routes/admin/coachRoutes');
const adminPlayerRoutes = require('./routes/admin/playerRoutes');
const batchRoutes = require('./routes/admin/batchRoutes');
const feeRoutes = require('./routes/admin/feeRoutes');
const paymentRoutes = require('./routes/admin/paymentRoutes');
const reportRoutes = require('./routes/admin/reportRoutes');

// ==================== ACCOUNTANT ROUTES ====================
const accountantRoutes = require('./routes/accountant/accountantRoutes');
const feeCollectionRoutes = require('./routes/accountant/feecollectionRoutes');
const expensesRoutes = require('./routes/accountant/expensesRoutes');
const ledgerRoutes = require('./routes/accountant/ledgerRoutes');
const profitLossRoutes = require('./routes/accountant/profitLossRoutes');
const balanceSheetRoutes = require('./routes/accountant/balanceSheetRoutes');
const taxReportRoutes = require('./routes/accountant/taxReportRoutes');

// ==================== BILLING ROUTES ====================
const billingDashboardRoutes = require('./routes/billing/dashboardRoutes');
const billingInvoiceRoutes = require('./routes/billing/invoiceRoutes');
const billingPaymentRoutes = require('./routes/billing/paymentRoutes');
const billingOutstandingRoutes = require('./routes/billing/outstandingRoutes');
const feeBillingRoutes = require('./routes/billing/feeBillingRoutes');
const discountRoutes = require('./routes/billing/discountRoutes');

// ==================== COACH ROUTES ====================
const coachDashboardRoutes = require('./routes/coach/dashboardRoutes');
const coachPlayersRoutes = require('./routes/coach/playersRoutes');
const coachBatchesRoutes = require('./routes/coach/batchesRoutes');
const coachAttendanceRoutes = require('./routes/coach/attendanceRoutes');
const coachPerformanceRoutes = require('./routes/coach/performanceRoutes');
const coachNotesRoutes = require('./routes/coach/notesRoutes');
const coachProfileRoutes = require('./routes/coach/profileRoutes');
const coachScheduleRoutes = require('./routes/coach/scheduleRoutes');

// ==================== PLAYER ROUTES ====================
const playerDashboardRoutes = require('./routes/player/dashboardRoutes');
const playerProfileRoutes = require('./routes/player/profileRoutes');
const playerPaymentRoutes = require('./routes/player/paymentRoutes');
const playerAttendanceRoutes = require('./routes/player/attendanceRoutes');

// ==================== MAINTENANCE ROUTES ====================
const maintenanceDashboardRoutes = require('./routes/maintenance/dashboardRoutes');
const maintenanceFacilitiesRoutes = require('./routes/maintenance/facilitiesRoutes');
const maintenanceIssuesRoutes = require('./routes/maintenance/issuesRoutes');
const maintenanceScheduleRoutes = require('./routes/maintenance/scheduleRoutes');
const maintenanceCostRoutes = require('./routes/maintenance/costRoutes');

// ==================== COMMUNICATION ROUTES ====================
const communicationRoutes = require('./routes/communication');

// ==================== CONTACT FORM ROUTES ====================
const contactRoutes = require('./routes/contact');  // ← ADD THIS

// ==================== API ENDPOINTS - ADMIN ====================
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/dashboard', adminDashboardRoutes);
app.use('/api/coaches', adminCoachRoutes);
app.use('/api/players', adminPlayerRoutes);
app.use('/api/batches', batchRoutes);
app.use('/api/fee-structure', feeRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/reports', reportRoutes);

// ==================== API ENDPOINTS - ACCOUNTANT ====================
app.use('/api/accountant', accountantRoutes);
app.use('/api/accountant', feeCollectionRoutes);
app.use('/api/accountant', expensesRoutes);
app.use('/api/accountant', ledgerRoutes);
app.use('/api/accountant', profitLossRoutes);
app.use('/api/accountant', balanceSheetRoutes);
app.use('/api/accountant', taxReportRoutes);

// ==================== API ENDPOINTS - BILLING ====================
app.use('/api/billing', billingDashboardRoutes);
app.use('/api/billing/invoices', billingInvoiceRoutes);
app.use('/api/billing/payments', billingPaymentRoutes);
app.use('/api/billing/outstanding', billingOutstandingRoutes);
app.use('/api/billing/fee-billing', feeBillingRoutes);
app.use('/api/billing/discounts', discountRoutes);

// ==================== API ENDPOINTS - COACH ====================
app.use('/api/coach/dashboard', coachDashboardRoutes);
app.use('/api/coach/players', coachPlayersRoutes);
app.use('/api/coach/batches', coachBatchesRoutes);
app.use('/api/coach/attendance', coachAttendanceRoutes);
app.use('/api/coach/performance', coachPerformanceRoutes);
app.use('/api/coach/notes', coachNotesRoutes);
app.use('/api/coach/profile', coachProfileRoutes);
app.use('/api/coach/schedule', coachScheduleRoutes);

// ==================== API ENDPOINTS - PLAYER ====================
app.use('/api/player/dashboard', playerDashboardRoutes);
app.use('/api/player/profile', playerProfileRoutes);
app.use('/api/player/payments', playerPaymentRoutes);
app.use('/api/player/attendance', playerAttendanceRoutes);

// ==================== API ENDPOINTS - MAINTENANCE ====================
app.use('/api/maintenance/dashboard', maintenanceDashboardRoutes);
app.use('/api/maintenance/facilities', maintenanceFacilitiesRoutes);
app.use('/api/maintenance/issues', maintenanceIssuesRoutes);
app.use('/api/maintenance/schedule', maintenanceScheduleRoutes);
app.use('/api/maintenance/cost', maintenanceCostRoutes);

// ==================== API ENDPOINTS - COMMUNICATION ====================
app.use('/api/communication', communicationRoutes);

// ==================== API ENDPOINTS - CONTACT FORM ====================
app.use('/api/contact', contactRoutes);  // ← ADD THIS

// ==================== TEST API ====================
app.get('/api/test', (req, res) => {
    res.json({ message: 'Cricket CRM API is working!' });
});

// ==================== START SERVER ====================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`API URL: http://localhost:${PORT}/api`);
    console.log(`Frontend URL: http://localhost:${PORT}`);
});