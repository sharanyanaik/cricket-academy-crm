// ==================== COACH PERFORMANCE JS ====================

let allPlayers = [];
let allEvaluations = [];
let currentSearch = '';

document.addEventListener('DOMContentLoaded', function() {
    console.log('Coach Performance page loaded');
    
    if (!checkCoachAuth()) return;
    
    // Set today's date as default
    var today = new Date();
    var dateInput = document.getElementById('match_date');
    if (dateInput) {
        dateInput.value = today.toISOString().split('T')[0];
    }
    
    loadPlayers();
    loadPerformance();
    loadEvaluations();
    
    // Search functionality
    var searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keyup', function(e) {
            currentSearch = e.target.value.toLowerCase();
            filterEvaluations();
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

// Load players for dropdown
async function loadPlayers() {
    try {
        var token = getToken();
        var response = await fetch(API_URL + '/coach/players', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        
        if (response.ok) {
            var users = await response.json();
            allPlayers = users;
            var playerSelect = document.getElementById('player_id');
            if (playerSelect) {
                var options = '<option value="">Select Player</option>';
                for (var i = 0; i < allPlayers.length; i++) {
                    var player = allPlayers[i];
                    if (player.full_name && player.full_name !== 'DSML' && player.full_name !== 'Loading...') {
                        var playerRecordId = player.player_record_id || player.id;
                        options += '<option value="' + playerRecordId + '">' + player.full_name + '</option>';
                    }
                }
                playerSelect.innerHTML = options;
                console.log('Players loaded:', allPlayers.length);
            }
        }
    } catch (error) {
        console.error('Error loading players:', error);
        showToast('Failed to load players', 'error');
    }
}

// Load performance summary
async function loadPerformance() {
    try {
        var token = getToken();
        var response = await fetch(API_URL + '/coach/performance', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        
        if (response.ok) {
            var performance = await response.json();
            console.log('Performance data:', performance);
            displayPerformance(performance);
        } else {
            console.error('Failed to load performance:', response.status);
        }
    } catch (error) {
        console.error('Error loading performance:', error);
    }
}

function displayPerformance(performance) {
    var tbody = document.getElementById('performanceBody');
    if (!tbody) return;
    
    if (!performance || performance.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No performance records<\/td><\/tr>';
        return;
    }
    
    var html = '';
    for (var i = 0; i < performance.length; i++) {
        var p = performance[i];
        
        if (!p.player_name || p.player_name === 'DSML' || p.player_name === 'Loading...') {
            continue;
        }
        
        html += '<tr>';
        html += '<td><strong>' + escapeHtml(p.player_name) + '<\/strong><\/td>';
        html += '<td>' + (p.matches_played || 0) + '<\/td>';
        html += '<td>' + (p.total_runs || 0) + '<\/td>';
        html += '<td>' + (p.total_wickets || 0) + '<\/td>';
        html += '<td>' + (p.batting_average || '--') + '<\/td>';
        html += '<td>' + (p.bowling_average || '--') + '<\/td>';
        html += '<td><button class="btn-sm btn-warning" onclick="viewPlayerStats(' + p.player_record_id + ')">View Stats<\/button><\/td>';
        html += '<\/tr>';
    }
    
    if (html === '') {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No valid performance records<\/td><\/tr>';
    } else {
        tbody.innerHTML = html;
    }
}

// Load individual evaluations
async function loadEvaluations() {
    try {
        var token = getToken();
        var response = await fetch(API_URL + '/coach/performance/evaluations', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        
        if (response.ok) {
            allEvaluations = await response.json();
            console.log('Evaluations loaded:', allEvaluations);
            displayEvaluations(allEvaluations);
        } else {
            console.error('Failed to load evaluations:', response.status);
        }
    } catch (error) {
        console.error('Error loading evaluations:', error);
    }
}

// Display individual evaluations
function displayEvaluations(evaluations) {
    var tbody = document.getElementById('evaluationsBody');
    if (!tbody) return;
    
    if (!evaluations || evaluations.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">No evaluations found<\/td><\/tr>';
        return;
    }
    
    var html = '';
    for (var i = 0; i < evaluations.length; i++) {
        var e = evaluations[i];
        
        if (!e.player_name || e.player_name === 'DSML' || e.player_name === 'Loading...') {
            continue;
        }
        
        html += '<tr>';
        html += '<td><strong>' + escapeHtml(e.player_name) + '<\/strong><\/td>';
        html += '<td>' + formatDate(e.match_date) + '<\/td>';
        html += '<td>' + (e.match_type || 'Practice') + '<\/td>';
        html += '<td>' + (e.runs || 0) + '<\/td>';
        html += '<td>' + (e.wickets || 0) + '<\/td>';
        html += '<td>' + (e.catches || 0) + '<\/td>';
        html += '<td>' + (e.coach_comments || '--') + '<\/td>';
        html += '<td><button class="btn-sm btn-danger" onclick="deleteEvaluation(' + e.id + ')">Delete<\/button><\/td>';
        html += '<\/tr>';
    }
    tbody.innerHTML = html;
}

// Filter evaluations by search
function filterEvaluations() {
    if (!currentSearch) {
        displayEvaluations(allEvaluations);
        return;
    }
    
    var filtered = allEvaluations.filter(function(e) {
        return e.player_name && e.player_name.toLowerCase().includes(currentSearch);
    });
    displayEvaluations(filtered);
}

// Save evaluation - FIXED
async function saveEvaluation() {
    var player_record_id = document.getElementById('player_id')?.value;
    var match_date = document.getElementById('match_date')?.value;
    var match_type = document.getElementById('match_type')?.value;
    var runs = parseInt(document.getElementById('runs')?.value) || 0;
    var wickets = parseInt(document.getElementById('wickets')?.value) || 0;
    var catches = parseInt(document.getElementById('catches')?.value) || 0;
    var coach_comments = document.getElementById('coach_comments')?.value || '';
    
    console.log('Saving evaluation:', { player_record_id, match_date, match_type, runs, wickets, catches });
    
    if (!player_record_id) {
        showToast('Please select a player', 'error');
        return;
    }
    
    if (!match_date) {
        showToast('Please select match date', 'error');
        return;
    }
    
    var saveBtn = document.querySelector('#performanceModal .btn-save');
    var originalText = saveBtn.innerHTML;
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
    
    try {
        var token = getToken();
        var response = await fetch(API_URL + '/coach/performance', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({
                player_id: parseInt(player_record_id),
                match_date: match_date,
                match_type: match_type,
                runs: runs,
                wickets: wickets,
                catches: catches,
                coach_comments: coach_comments
            })
        });
        
        var data = await response.json();
        console.log('Response:', response.status, data);
        
        if (response.ok) {
            showToast('Evaluation saved successfully!', 'success');
            closeModal();
            document.getElementById('runs').value = '0';
            document.getElementById('wickets').value = '0';
            document.getElementById('catches').value = '0';
            document.getElementById('coach_comments').value = '';
            loadPerformance();
            loadEvaluations();
        } else {
            showToast(data.message || 'Failed to save evaluation', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Error saving evaluation: ' + error.message, 'error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalText;
    }
}

// Delete evaluation
async function deleteEvaluation(id) {
    showConfirmModal({
        title: 'Delete Evaluation',
        message: 'Are you sure you want to delete this evaluation?',
        type: 'warning',
        onConfirm: async () => {
            try {
                var token = getToken();
                var response = await fetch(API_URL + '/coach/performance/' + id, {
                    method: 'DELETE',
                    headers: { 'Authorization': 'Bearer ' + token }
                });
                
                if (response.ok) {
                    showToast('Evaluation deleted successfully!', 'success');
                    loadPerformance();
                    loadEvaluations();
                } else {
                    showToast('Failed to delete evaluation', 'error');
                }
            } catch (error) {
                console.error('Error:', error);
                showToast('Error deleting evaluation', 'error');
            }
        }
    });
}

// View player stats
async function viewPlayerStats(playerRecordId) {
    try {
        var token = getToken();
        var response = await fetch(API_URL + '/coach/performance/stats/' + playerRecordId, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        
        if (response.ok) {
            var stats = await response.json();
            
            var statsHtml = `
                <div id="statsModal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; justify-content: center; align-items: center;">
                    <div style="background: white; border-radius: 16px; width: 400px; max-width: 90%; padding: 0;">
                        <div style="background: #2563eb; color: white; padding: 20px; border-radius: 16px 16px 0 0;">
                            <h3 style="margin: 0;"><i class="fa-solid fa-chart-line"></i> Player Statistics</h3>
                        </div>
                        <div style="padding: 20px;">
                            <p><strong>Matches Played:</strong> ${stats.matches_played || 0}</p>
                            <p><strong>Total Runs:</strong> ${stats.total_runs || 0}</p>
                            <p><strong>Total Wickets:</strong> ${stats.total_wickets || 0}</p>
                            <p><strong>Total Catches:</strong> ${stats.total_catches || 0}</p>
                            <p><strong>Highest Score:</strong> ${stats.highest_score || 0}</p>
                            <p><strong>Best Bowling:</strong> ${stats.best_bowling || 0}</p>
                            <p><strong>Batting Average:</strong> ${stats.batting_average || 0}</p>
                            <p><strong>Bowling Average:</strong> ${stats.bowling_average || 0}</p>
                        </div>
                        <div style="padding: 20px; border-top: 1px solid #e2e8f0; text-align: right;">
                            <button onclick="closeStatsModal()" style="background: #2563eb; color: white; border: none; padding: 8px 20px; border-radius: 8px; cursor: pointer;">Close</button>
                        </div>
                    </div>
                </div>
            `;
            
            var existingModal = document.getElementById('statsModal');
            if (existingModal) existingModal.remove();
            
            var modalDiv = document.createElement('div');
            modalDiv.innerHTML = statsHtml;
            document.body.appendChild(modalDiv);
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Error loading stats', 'error');
    }
}

function closeStatsModal() {
    var modal = document.getElementById('statsModal');
    if (modal) modal.remove();
}

function openPerformanceModal() {
    var modal = document.getElementById('performanceModal');
    if (modal) modal.style.display = 'flex';
}

function closeModal() {
    var modal = document.getElementById('performanceModal');
    if (modal) modal.style.display = 'none';
    document.getElementById('runs').value = '0';
    document.getElementById('wickets').value = '0';
    document.getElementById('catches').value = '0';
    document.getElementById('coach_comments').value = '';
}

function formatDate(dateString) {
    if (!dateString) return '-';
    var date = new Date(dateString);
    return date.toLocaleDateString('en-IN');
}

function escapeHtml(text) {
    if (!text) return '';
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Make functions global
window.saveEvaluation = saveEvaluation;
window.viewPlayerStats = viewPlayerStats;
window.openPerformanceModal = openPerformanceModal;
window.closeModal = closeModal;
window.closeStatsModal = closeStatsModal;
window.deleteEvaluation = deleteEvaluation;