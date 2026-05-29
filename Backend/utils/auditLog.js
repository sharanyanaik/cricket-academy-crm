const db = require('../config/db');

function addAuditLog(userId, actionType, details) {
    const query = `
        INSERT INTO audit_logs (user_id, action_type, details, created_at)
        VALUES (?, ?, ?, NOW())
    `;
    
    db.query(query, [userId, actionType, details], (err) => {
        if (err) console.error('Error adding audit log:', err);
    });
}

module.exports = { addAuditLog };