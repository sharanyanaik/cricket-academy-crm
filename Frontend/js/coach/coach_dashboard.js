// ==================== COACH DASHBOARD JS ====================

let dashboardData = null;

document.addEventListener('DOMContentLoaded', function() {
    console.log('Coach Dashboard loaded');
    
    if (!checkCoachAuth()) return;
    
    loadDashboardData();
});

async function loadDashboardData() {
    try {
        var token = getToken();
        var response = await fetch(API_URL + '/coach/dashboard/stats', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        
        if (response.ok) {
            dashboardData = await response.json();
            console.log('Dashboard data:', dashboardData);
            
            updateSummaryCards(dashboardData);
            displayBatches(dashboardData.batches || []);
            updateQuickStats(dashboardData.playerStats || { batsmen: 0, bowlers: 0, all_rounders: 0, wicket_keepers: 0 });
            displayRecentPlayers(dashboardData.recentPlayers || []);
        } else if (response.status === 401 || response.status === 403) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '../../pages/Authentication/login.html';
        } else {
            var errorData = await response.json();
            showToast(errorData.message || 'Failed to load dashboard data', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Failed to load dashboard data', 'error');
    }
}

function updateSummaryCards(data) {
    var totalPlayersElem = document.getElementById('totalPlayers');
    if (totalPlayersElem) totalPlayersElem.textContent = data.totalPlayers || 0;
    
    var presentTodayElem = document.getElementById('presentToday');
    if (presentTodayElem) presentTodayElem.textContent = data.presentToday || 0;
}

function displayBatches(batches) {
    var container = document.getElementById('batchesList');
    if (!container) return;
    
    if (!batches || batches.length === 0) {
        container.innerHTML = '<div class="text-center text-muted">No batches assigned</div>';
        return;
    }
    
    var html = '';
    for (var i = 0; i < batches.length; i++) {
        var batch = batches[i];
        html += `
            <div class="batch-card">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <strong>${escapeHtml(batch.batch_name)}</strong>
                        <div class="batch-time"><i class="fa-regular fa-clock"></i> ${escapeHtml(batch.timing || 'Time not set')}</div>
                    </div>
                    <div class="batch-players">
                        <i class="fa-solid fa-users"></i> ${batch.player_count || 0} Players
                    </div>
                </div>
            </div>
        `;
    }
    container.innerHTML = html;
}

function updateQuickStats(stats) {
    var batsmenElem = document.getElementById('batsmenCount');
    if (batsmenElem) batsmenElem.textContent = stats.batsmen || 0;
    
    var bowlersElem = document.getElementById('bowlersCount');
    if (bowlersElem) bowlersElem.textContent = stats.bowlers || 0;
    
    var allRoundersElem = document.getElementById('allRoundersCount');
    if (allRoundersElem) allRoundersElem.textContent = stats.all_rounders || 0;
    
    var wicketKeepersElem = document.getElementById('wicketKeepersCount');
    if (wicketKeepersElem) wicketKeepersElem.textContent = stats.wicket_keepers || 0;
}

function displayRecentPlayers(players) {
    var tbody = document.getElementById('playersTableBody');
    if (!tbody) return;
    
    if (!players || players.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center">No players found<\/td><\/tr>';
        return;
    }
    
    var html = '';
    for (var i = 0; i < players.length; i++) {
        var player = players[i];
        html += '<tr>';
        html += '<td>' + (player.player_name || player.full_name || '-') + '<\/td>';
        html += '<td>' + (player.playing_role || 'Not specified') + '<\/td>';
        html += '<td>' + (player.batch_name || 'Unassigned') + '<\/td>';
        html += '<\/tr>';
    }
    tbody.innerHTML = html;
}

async function refreshData() {
    showToast('Refreshing data...', 'info');
    await loadDashboardData();
    showToast('Data refreshed!', 'success');
}

function escapeHtml(text) {
    if (!text) return '';
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

window.refreshData = refreshData;