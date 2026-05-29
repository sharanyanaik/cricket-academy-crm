// ==================== COACH NOTES JS ====================

let allNotes = [];
let editMode = false;
let editNoteId = null;

document.addEventListener('DOMContentLoaded', function() {
    console.log('Coach Notes page loaded');
    
    if (!checkCoachAuth()) return;
    
    // Set today's date as default
    var today = new Date();
    var dateInput = document.getElementById('noteDate');
    if (dateInput) {
        dateInput.value = today.toISOString().split('T')[0];
    }
    
    loadNotes();
    loadPlayersForSelect();
    
    // Add filter listeners
    var playerFilter = document.getElementById('filterPlayer');
    var typeFilter = document.getElementById('filterType');
    
    if (playerFilter) {
        playerFilter.addEventListener('change', function() {
            loadNotes();
        });
    }
    
    if (typeFilter) {
        typeFilter.addEventListener('change', function() {
            loadNotes();
        });
    }
    
    var logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            logout();
        });
    }
});

async function loadNotes() {
    try {
        var token = getToken();
        var playerId = document.getElementById('filterPlayer')?.value || '';
        var noteType = document.getElementById('filterType')?.value || '';
        
        var url = API_URL + '/coach/notes';
        var params = [];
        
        if (playerId) params.push('player_id=' + playerId);
        if (noteType) params.push('note_type=' + encodeURIComponent(noteType));
        
        if (params.length > 0) {
            url += '?' + params.join('&');
        }
        
        var response = await fetch(url, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        
        if (response.ok) {
            allNotes = await response.json();
            displayNotes(allNotes);
        } else {
            console.error('Failed to load notes');
        }
    } catch (error) {
        console.error('Error loading notes:', error);
    }
}

function displayNotes(notes) {
    var container = document.getElementById('notesList');
    if (!container) return;
    
    if (!notes || notes.length === 0) {
        container.innerHTML = '<div class="text-center text-muted">No notes found. Add your first note above!</div>';
        return;
    }
    
    var html = '';
    for (var i = 0; i < notes.length; i++) {
        var note = notes[i];
        
        var badgeClass = '';
        if (note.note_type === 'Practice Session') badgeClass = 'badge-primary';
        else if (note.note_type === 'Match Report') badgeClass = 'badge-success';
        else badgeClass = 'badge-warning';
        
        html += '<div class="note-card">';
        html += '<div class="note-header">';
        html += '<div class="note-title-section">';
        html += '<h4>📝 ' + escapeHtml(note.title || note.note_type || 'Note') + '</h4>';
        html += '<span class="badge ' + badgeClass + '">' + escapeHtml(note.note_type || 'General') + '</span>';
        html += '</div>';
        html += '<div class="note-actions">';
        html += '<button class="btn-small" onclick="editNote(' + note.id + ')" title="Edit Note">';
        html += '<i class="fa-solid fa-pencil"></i> Edit';
        html += '</button>';
        html += '<button class="delete-note" onclick="deleteNote(' + note.id + ')" title="Delete Note">';
        html += '<i class="fa-solid fa-trash-can"></i> Delete';
        html += '</button>';
        html += '</div>';
        html += '</div>';
        html += '<div class="note-player"><strong>Player:</strong> ' + (note.player_name ? escapeHtml(note.player_name) : 'All Players') + '</div>';
        html += '<div class="note-content">' + escapeHtml(note.note) + '</div>';
        html += '<div class="note-date">';
        html += '<i class="fa-regular fa-clock"></i> ' + formatDateRelative(note.created_at);
        html += '</div>';
        html += '</div>';
    }
    container.innerHTML = html;
}

async function loadPlayersForSelect() {
    try {
        var token = getToken();
        var response = await fetch(API_URL + '/coach/players', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        
        if (response.ok) {
            var players = await response.json();
            
            // For Add Note form
            var playerSelect = document.getElementById('playerId');
            if (playerSelect) {
                var options = '<option value="">All Players</option>';
                for (var i = 0; i < players.length; i++) {
                    options += '<option value="' + players[i].id + '">' + escapeHtml(players[i].full_name) + '</option>';
                }
                playerSelect.innerHTML = options;
            }
            
            // For Filter dropdown
            var filterSelect = document.getElementById('filterPlayer');
            if (filterSelect) {
                var filterOptions = '<option value="">All Players</option>';
                for (var i = 0; i < players.length; i++) {
                    filterOptions += '<option value="' + players[i].id + '">' + escapeHtml(players[i].full_name) + '</option>';
                }
                filterSelect.innerHTML = filterOptions;
            }
        }
    } catch (error) {
        console.error('Error loading players:', error);
    }
}

function resetForm() {
    editMode = false;
    editNoteId = null;
    document.getElementById('noteTitle').value = '';
    document.getElementById('noteType').value = 'Practice Session';
    document.getElementById('playerId').value = '';
    document.getElementById('noteContent').value = '';
    document.getElementById('noteDate').value = new Date().toISOString().split('T')[0];
    
    var saveBtn = document.querySelector('#addNoteForm button');
    if (saveBtn) {
        saveBtn.innerHTML = '<i class="fa-solid fa-save"></i> Save Note';
        saveBtn.style.background = '#2563eb';
    }
}

async function saveNote() {
    var title = document.getElementById('noteTitle')?.value;
    var noteType = document.getElementById('noteType')?.value;
    var playerId = document.getElementById('playerId')?.value;
    var noteText = document.getElementById('noteContent')?.value;
    
    if (!title) {
        showToast('Please enter a title', 'error');
        return;
    }
    
    if (!noteText) {
        showToast('Please enter note content', 'error');
        return;
    }
    
    var saveBtn = document.querySelector('#addNoteForm button');
    var originalText = saveBtn.innerHTML;
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
    
    try {
        var token = getToken();
        var url = editMode ? API_URL + '/coach/notes/' + editNoteId : API_URL + '/coach/notes';
        var method = editMode ? 'PUT' : 'POST';
        
        var response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({
                title: title,
                note_type: noteType,
                note: noteText,
                player_id: playerId || null
            })
        });
        
        var data = await response.json();
        
        if (response.ok) {
            showToast(editMode ? 'Note updated successfully!' : 'Note saved successfully!', 'success');
            resetForm();
            loadNotes();
        } else {
            showToast(data.message || 'Failed to save note', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Error saving note', 'error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalText;
    }
}

async function deleteNote(id) {
    showConfirmModal({
        title: 'Delete Note',
        message: 'Are you sure you want to delete this note?',
        type: 'warning',
        onConfirm: async () => {
            try {
                var token = getToken();
                var response = await fetch(API_URL + '/coach/notes/' + id, {
                    method: 'DELETE',
                    headers: { 'Authorization': 'Bearer ' + token }
                });
                
                if (response.ok) {
                    showToast('Note deleted successfully!', 'success');
                    loadNotes();
                } else {
                    showToast('Failed to delete note', 'error');
                }
            } catch (error) {
                console.error('Error:', error);
                showToast('Error deleting note', 'error');
            }
        }
    });
}

function editNote(id) {
    var note = null;
    for (var i = 0; i < allNotes.length; i++) {
        if (allNotes[i].id === id) {
            note = allNotes[i];
            break;
        }
    }
    
    if (note) {
        editMode = true;
        editNoteId = note.id;
        
        document.getElementById('noteTitle').value = note.title || '';
        document.getElementById('noteType').value = note.note_type || 'Practice Session';
        document.getElementById('noteContent').value = note.note || '';
        if (note.player_id) {
            document.getElementById('playerId').value = note.player_id;
        } else {
            document.getElementById('playerId').value = '';
        }
        
        var saveBtn = document.querySelector('#addNoteForm button');
        if (saveBtn) {
            saveBtn.innerHTML = '<i class="fa-solid fa-pen"></i> Update Note';
            saveBtn.style.background = '#f59e0b';
        }
        
        // Scroll to form
        document.querySelector('.card').scrollIntoView({ behavior: 'smooth' });
        showToast('Editing note - click Update to save changes', 'info');
    }
}

function formatDateRelative(dateString) {
    if (!dateString) return 'recently';
    var date = new Date(dateString);
    var now = new Date();
    var diff = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    if (diff === 0) return 'today';
    if (diff === 1) return 'yesterday';
    return diff + ' days ago';
}

function escapeHtml(text) {
    if (!text) return '';
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function resetFilters() {
    document.getElementById('filterPlayer').value = '';
    document.getElementById('filterType').value = '';
    loadNotes();
}

// Make functions global
window.saveNote = saveNote;
window.editNote = editNote;
window.deleteNote = deleteNote;
window.resetForm = resetForm;
window.resetFilters = resetFilters;
