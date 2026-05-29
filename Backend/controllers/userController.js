const db = require('../config/db');
const bcrypt = require('bcryptjs');

// Get all users 
exports.getAllUsers = (req, res) => {
    db.query('SELECT id, username, email, full_name, phone, role, date_of_birth, created_at FROM users ORDER BY id DESC', 
        (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(result);
        }
    );
};

// Get single user 
exports.getUserById = (req, res) => {
    db.query('SELECT id, username, email, full_name, phone, role, date_of_birth FROM users WHERE id = ?', 
        [req.params.id], (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(result[0]);
        }
    );
};

// Add user 
exports.addUser = async (req, res) => {
    const { username, email, password, full_name, phone, role, date_of_birth } = req.body;
    
    // Validate required fields
    if (!full_name || !email || !password || !role || !date_of_birth) {
        return res.status(400).json({ message: 'All required fields must be filled' });
    }
    
    db.query('SELECT id FROM users WHERE email = ? OR username = ?', [email, username], async (err, existing) => {
        if (err) return res.status(500).json({ error: err.message });
        if (existing.length > 0) {
            return res.status(400).json({ message: 'User already exists' });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        
        db.query(
            'INSERT INTO users (username, email, password, full_name, phone, role, date_of_birth, created_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), "active")',
            [username, email, hashedPassword, full_name, phone || null, role || 'player', date_of_birth],
            (err, result) => {
                if (err) return res.status(500).json({ error: err.message });
                
                // If role is player, also insert into players table
                if (role === 'player') {
                    const playerQuery = `
                        INSERT INTO players (user_id, player_name, playing_role, date_of_birth, status, created_at) 
                        VALUES (?, ?, ?, ?, "active", NOW())
                    `;
                    db.query(playerQuery, [result.insertId, full_name, 'Not Specified', date_of_birth], (playerErr) => {
                        if (playerErr) {
                            console.error('Error inserting into players table:', playerErr);
                        }
                    });
                }
                
                res.json({ message: 'User added successfully', id: result.insertId });
            }
        );
    });
};

exports.updateUser = (req, res) => {
    const { full_name, phone, role, date_of_birth, username, email } = req.body;
    
    db.query(
        `UPDATE users SET 
            full_name = ?, 
            phone = ?, 
            role = ?, 
            date_of_birth = ?,
            username = COALESCE(?, username),
            email = COALESCE(?, email)
        WHERE id = ?`,
        [full_name, phone, role, date_of_birth, username, email, req.params.id],
        (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'User updated successfully' });
        }
    );
};

// Delete user
exports.deleteUser = (req, res) => {
    db.query('DELETE FROM users WHERE id = ?', [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'User deleted successfully' });
    });
};