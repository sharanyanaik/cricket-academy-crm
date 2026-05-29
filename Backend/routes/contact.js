const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Submit contact form (Public - No authentication required)
router.post('/submit', (req, res) => {
    const { name, email, phone, subject, message } = req.body;
    
    console.log('Contact form submission:', { name, email, subject });
    
    // Validation
    if (!name || !email || !subject || !message) {
        return res.status(400).json({ message: 'All required fields must be filled' });
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@([^\s@.,]+\.)+[^\s@.,]{2,}$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ message: 'Invalid email address' });
    }
    
    // Phone validation (optional)
    if (phone && !/^[0-9]{10}$/.test(phone)) {
        return res.status(400).json({ message: 'Invalid phone number (10 digits required)' });
    }
    
    const query = `
        INSERT INTO contact_messages (name, email, phone, subject, message, status, created_at)
        VALUES (?, ?, ?, ?, ?, 'unread', NOW())
    `;
    
    db.query(query, [name, email, phone || null, subject, message], (err, result) => {
        if (err) {
            console.error('Error saving contact message:', err);
            return res.status(500).json({ message: 'Database error. Please try again.' });
        }
        
        console.log(`✅ New contact message saved - ID: ${result.insertId} from ${email}`);
        
        res.status(201).json({ 
            message: 'Message sent successfully! We will get back to you soon.',
            id: result.insertId 
        });
    });
});

// Get all contact messages (Admin only)
router.get('/messages', (req, res) => {
    // You can add authentication middleware here
    const query = `
        SELECT id, name, email, phone, subject, message, status, created_at
        FROM contact_messages
        ORDER BY created_at DESC
    `;
    
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching messages:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

// Mark message as read (Admin only)
router.put('/messages/:id/read', (req, res) => {
    const query = 'UPDATE contact_messages SET status = "read" WHERE id = ?';
    
    db.query(query, [req.params.id], (err) => {
        if (err) {
            console.error('Error updating message:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: 'Message marked as read' });
    });
});

module.exports = router;