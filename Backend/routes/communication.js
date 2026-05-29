const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const { addAuditLog } = require('../utils/auditLog');

// ==================== SEND MESSAGE (Player/Coach to Admin) ====================
router.post('/send-message', authenticateToken, (req, res) => {
    const { subject, message, category } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (!subject || !message) {
        return res.status(400).json({ message: 'Subject and message are required' });
    }

    const query = `
        INSERT INTO messages (sender_id, sender_role, receiver_role, subject, message, category, status, created_at)
        VALUES (?, ?, 'admin', ?, ?, ?, 'unread', NOW())
    `;

    db.query(query, [userId, userRole, subject, message, category || 'general'], (err, result) => {
        if (err) {
            console.error('Error sending message:', err);
            return res.status(500).json({ error: err.message });
        }

        if (addAuditLog) {
            addAuditLog(userId, 'SEND_MESSAGE', `Sent message: ${subject}`);
        }
        
        res.status(201).json({ 
            message: 'Message sent successfully', 
            id: result.insertId 
        });
    });
});

// ==================== GET MY MESSAGES (For Players/Coaches) ====================
router.get('/my-messages', authenticateToken, (req, res) => {
    const userId = req.user.id;

    const query = `
        SELECT 
            id, subject, message, category, status, admin_reply, 
            DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') as created_at,
            DATE_FORMAT(replied_at, '%Y-%m-%d %H:%i:%s') as replied_at
        FROM messages
        WHERE sender_id = ?
        ORDER BY created_at DESC
    `;

    db.query(query, [userId], (err, results) => {
        if (err) {
            console.error('Error fetching messages:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

// ==================== GET ALL MESSAGES (For Admin) ====================
router.get('/all-messages', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const query = `
        SELECT 
            m.*,
            u.full_name as sender_name,
            u.email as sender_email,
            u.phone as sender_phone
        FROM messages m
        JOIN users u ON m.sender_id = u.id
        ORDER BY 
            FIELD(m.status, 'unread', 'read', 'replied', 'closed'),
            m.created_at DESC
    `;

    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching all messages:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

// ==================== REPLY TO MESSAGE (Admin only) ====================
router.post('/reply-message/:id', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const messageId = req.params.id;
    const { reply } = req.body;

    if (!reply) {
        return res.status(400).json({ message: 'Reply message is required' });
    }

    const query = `
        UPDATE messages 
        SET admin_reply = ?, status = 'replied', replied_at = NOW()
        WHERE id = ?
    `;

    db.query(query, [reply, messageId], (err, result) => {
        if (err) {
            console.error('Error replying to message:', err);
            return res.status(500).json({ error: err.message });
        }

        if (addAuditLog) {
            addAuditLog(req.user.id, 'REPLY_MESSAGE', `Replied to message ID: ${messageId}`);
        }
        
        res.json({ message: 'Reply sent successfully' });
    });
});

// ==================== MARK MESSAGE AS READ (Admin only) ====================
router.put('/mark-read/:id', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied' });
    }

    const query = 'UPDATE messages SET status = "read" WHERE id = ?';
    
    db.query(query, [req.params.id], (err) => {
        if (err) {
            console.error('Error marking message as read:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: 'Message marked as read' });
    });
});

// ==================== GET UNREAD MESSAGE COUNT ====================
router.get('/unread-count', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.json({ count: 0 });
    }

    const query = 'SELECT COUNT(*) as count FROM messages WHERE status = "unread"';
    
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching unread count:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json({ count: results[0]?.count || 0 });
    });
});

module.exports = router;