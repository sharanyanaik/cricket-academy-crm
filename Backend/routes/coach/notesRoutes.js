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

// GET ALL NOTES
router.get('/', authenticateToken, (req, res) => {
    const coachId = req.user.id;
    const { player_id, note_type } = req.query;
    
    let query = `SELECT n.*, u.full_name as player_name 
                 FROM notes n 
                 LEFT JOIN users u ON n.player_id = u.id 
                 WHERE n.coach_id = ?`;
    let params = [coachId];
    
    if (player_id && player_id !== '') {
        query += ` AND n.player_id = ?`;
        params.push(player_id);
    }
    
    if (note_type && note_type !== '') {
        query += ` AND n.note_type = ?`;
        params.push(note_type);
    }
    
    query += ` ORDER BY n.created_at DESC`;
    
    db.query(query, params, (err, notes) => {
        if (err) {
            console.error('Error fetching notes:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json(notes || []);
    });
});

// ADD NOTE
router.post('/', authenticateToken, (req, res) => {
    const { player_id, note, note_type, title } = req.body;
    const coachId = req.user.id;
    
    if (!note) {
        return res.status(400).json({ message: 'Note content is required' });
    }
    
    const query = `INSERT INTO notes (player_id, coach_id, note, note_type, title, created_at) 
                   VALUES (?, ?, ?, ?, ?, NOW())`;
    
    db.query(query, [player_id || null, coachId, note, note_type || 'Practice Session', title || null], (err, result) => {
        if (err) {
            console.error('Error adding note:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json({ success: true, message: 'Note added successfully', id: result.insertId });
    });
});

// UPDATE NOTE
router.put('/:id', authenticateToken, (req, res) => {
    const noteId = req.params.id;
    const coachId = req.user.id;
    const { note, note_type, title, player_id } = req.body;
    
    const query = `UPDATE notes SET note = ?, note_type = ?, title = ?, player_id = ? 
                   WHERE id = ? AND coach_id = ?`;
    
    db.query(query, [note, note_type || 'Practice Session', title || null, player_id || null, noteId, coachId], (err, result) => {
        if (err) {
            console.error('Error updating note:', err);
            return res.status(500).json({ error: err.message });
        }
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Note not found' });
        res.json({ success: true, message: 'Note updated successfully' });
    });
});

// DELETE NOTE
router.delete('/:id', authenticateToken, (req, res) => {
    const noteId = req.params.id;
    const coachId = req.user.id;
    
    const query = `DELETE FROM notes WHERE id = ? AND coach_id = ?`;
    
    db.query(query, [noteId, coachId], (err, result) => {
        if (err) {
            console.error('Error deleting note:', err);
            return res.status(500).json({ error: err.message });
        }
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Note not found' });
        res.json({ success: true, message: 'Note deleted successfully' });
    });
});

module.exports = router;