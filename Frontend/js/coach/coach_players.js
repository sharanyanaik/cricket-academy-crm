// ==================== COACH PLAYERS JS ====================

let allPlayers = [];
let currentBatchFilter = 'all';

document.addEventListener('DOMContentLoaded', function() {
    console.log('Coach Players page loaded');
    
    if (!checkCoachAuth()) return;
    
    loadPlayers();
    loadBatches();
    
    var logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            logout();
        });
    }
    
    var searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keyup', function(e) {
            filterPlayers(e.target.value);
        });
    }
    
    var batchFilter = document.getElementById('batchFilter');
    if (batchFilter) {
        batchFilter.addEventListener('change', function(e) {
            currentBatchFilter = e.target.value;
            filterPlayersByBatch();
        });
    }
});

async function loadBatches() {
    try {
        var token = getToken();
        var response = await fetch(API_URL + '/coach/players/batches', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        
        if (response.ok) {
            var batches = await response.json();
            var batchSelect = document.getElementById('batchFilter');
            if (batchSelect && batches.length > 0) {
                batches.forEach(function(batch) {
                    var option = document.createElement('option');
                    option.value = batch.id;
                    option.textContent = batch.batch_name + ' (' + batch.timing + ')';
                    batchSelect.appendChild(option);
                });
            }
        }
    } catch (error) {
        console.error('Error loading batches:', error);
    }
}

async function loadPlayers() {
    try {
        var token = getToken();
        var response = await fetch(API_URL + '/coach/players', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        
        if (response.ok) {
            allPlayers = await response.json();
            console.log('Players loaded:', allPlayers);
            displayPlayers(allPlayers);
        } else if (response.status === 401 || response.status === 403) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '../../pages/Authentication/login.html';
        } else {
            showToast('Failed to load players', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Failed to load players', 'error');
    }
}

function displayPlayers(players) {
    var tbody = document.getElementById('playersTableBody');
    if (!tbody) return;
    
    if (!players || players.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">No players assigned to you<\/td><\/tr>';
        return;
    }
    
    var html = '';
    for (var i = 0; i < players.length; i++) {
        var player = players[i];
        
        html += '<tr>';
        html += '<td><strong>' + escapeHtml(player.full_name) + '<\/strong><\/td>';
        html += '<td>' + (player.age || '--') + '<\/td>';
        html += '<td>' + getRoleBadge(player.playing_role) + '<\/td>';
        html += '<td>' + (player.batch_name || 'Unassigned') + '<\/td>';
        html += '<td><button class="view-btn" onclick="viewPlayer(' + player.id + ')"><i class="fa-solid fa-eye"></i> View<\/button><\/td>';
        html += '<\/tr>';
    }
    tbody.innerHTML = html;
}

function getRoleBadge(role) {
    if (!role) {
        return '<span class="badge-secondary">Not specified</span>';
    }
    var roleLower = role.toLowerCase();
    if (roleLower === 'batsman') {
        return '<span class="badge-primary">Batsman</span>';
    } else if (roleLower === 'bowler') {
        return '<span class="badge-success">Bowler</span>';
    } else if (roleLower === 'all-rounder') {
        return '<span class="badge-warning">All-rounder</span>';
    } else if (roleLower === 'wicket-keeper') {
        return '<span class="badge-info">WK</span>';
    } else {
        return '<span class="badge-secondary">' + role + '</span>';
    }
}

function filterPlayers(searchTerm) {
    var filtered = allPlayers;
    
    if (searchTerm && searchTerm.trim() !== '') {
        filtered = filtered.filter(function(p) {
            return p.full_name && p.full_name.toLowerCase().includes(searchTerm.toLowerCase());
        });
    }
    
    displayPlayers(filtered);
}

function filterPlayersByBatch() {
    var filtered = allPlayers;
    
    if (currentBatchFilter !== 'all') {
        filtered = filtered.filter(function(p) {
            return p.batch_id == currentBatchFilter;
        });
    }
    
    displayPlayers(filtered);
}

function viewPlayer(id) {
    window.location.href = 'coach_player_view.html?id=' + id;
}

function escapeHtml(text) {
    if (!text) return '';
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}