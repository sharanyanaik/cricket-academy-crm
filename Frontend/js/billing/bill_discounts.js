// ==================== DISCOUNTS & SCHOLARSHIPS JS (BILLING PANEL - SINGLE TABLE VIEW) ====================

let allDiscounts = [], allPlayers = [], activeBenefits = [];

function formatDateForInput(dateString) {
    if (!dateString) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return dateString;
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

document.addEventListener('DOMContentLoaded', () => {
    if (typeof checkBillingAuth !== 'undefined') {
        if (!checkBillingAuth()) return;
    }
    loadAllData();
    document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
        e.preventDefault();
        logout();
    });
});

async function loadAllData() {
    await Promise.all([
        loadDiscounts(),
        loadPlayers(),
        loadActiveBenefits()
    ]);
}

// ==================== DISCOUNT FUNCTIONS ====================

async function loadDiscounts() {
    try {
        const token = getToken();
        if (!token) return;
        
        const res = await fetch(`${API_URL}/billing/discounts/discounts`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.ok) {
            allDiscounts = await res.json();
            displayDiscounts();
            updateStats();
            updateDiscountSelect();
        } else {
            showToast('Failed to load discounts', 'error');
        }
    } catch (error) {
        console.error('Error loading discounts:', error);
        showToast('Network error loading discounts', 'error');
    }
}

function getDiscountTypeBadge(discount) {
    const name = (discount.discount_type || '').toLowerCase();
    if (name.includes('scholarship') || name.includes('merit') || name.includes('sports') || name.includes('need based')) {
        return '<span class="badge-scholarship">Scholarship</span>';
    }
    return '<span class="badge-discount">Discount</span>';
}

function displayDiscounts() {
    const tbody = document.getElementById('discountsTableBody');
    if (!tbody) return;
    
    if (!allDiscounts || !allDiscounts.length) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">No discounts/scholarships found</td></tr>';
        return;
    }
    
    tbody.innerHTML = allDiscounts.map(d => {
        let valueDisplay = '';
        let maxAmountDisplay = '';
        
        if (d.percentage > 0) {
            valueDisplay = `${d.percentage}% off`;
            maxAmountDisplay = formatCurrency(d.max_amount);
        } else {
            valueDisplay = formatCurrency(d.max_amount);
            maxAmountDisplay = '-';
        }
        
        return `
            <tr>
                <td>${getDiscountTypeBadge(d)}</td>
                <td><strong>${d.discount_type || '-'}</strong></td>
                <td>${d.eligibility || '-'}</td>
                <td>${valueDisplay}</td>
                <td>${maxAmountDisplay}</td>
                <td>${formatDate(d.valid_from)}</td>
                <td>${formatDate(d.valid_to)}</td>
                <td><span class="${d.status === 'active' ? 'badge-active' : 'badge-inactive'}">${d.status === 'active' ? 'Active' : 'Inactive'}</span></td>
            </tr>
        `;
    }).join('');
}

function updateDiscountSelect() {
    const discountSelect = document.getElementById('discountSelect');
    if (discountSelect) {
        const activeDiscounts = allDiscounts.filter(d => d.status === 'active');
        discountSelect.innerHTML = '<option value="">-- Select Discount/Scholarship --</option>' + 
            activeDiscounts.map(d => {
                let valueText = '';
                if (d.percentage > 0) {
                    valueText = `${d.percentage}% off (Max ${formatCurrency(d.max_amount)})`;
                } else {
                    valueText = formatCurrency(d.max_amount);
                }
                return `<option value="${d.id}">${d.discount_type} - ${valueText}</option>`;
            }).join('');
    }
}

// ==================== SHARED FUNCTIONS ====================

async function loadPlayers() {
    try {
        const token = getToken();
        if (!token) return;
        
        const res = await fetch(`${API_URL}/billing/discounts/players`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.ok) {
            allPlayers = await res.json();
            const playerSelect = document.getElementById('playerSelect');
            
            if (playerSelect) {
                playerSelect.innerHTML = '<option value="">-- Select Player --</option>' + 
                    allPlayers.map(p => `<option value="${p.id}">${p.player_name}</option>`).join('');
            }
        }
    } catch (error) {
        console.error('Error loading players:', error);
    }
}

async function loadActiveBenefits() {
    try {
        const token = getToken();
        if (!token) return;
        
        const res = await fetch(`${API_URL}/billing/discounts/active-discounts`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.ok) {
            activeBenefits = await res.json();
            displayActiveBenefits();
            updateStats();
        } else {
            console.error('Failed to load active benefits:', res.status);
        }
    } catch (error) {
        console.error('Error loading active benefits:', error);
    }
}

function getBenefitTypeBadge(benefit) {
    const type = (benefit.benefit_type || '').toLowerCase();
    if (type.includes('scholarship') || type.includes('merit') || type.includes('sports') || type.includes('need based')) {
        return '<span class="badge-scholarship">Scholarship</span>';
    }
    return '<span class="badge-discount">Discount</span>';
}

function displayActiveBenefits() {
    const tbody = document.getElementById('activeDiscountsTableBody');
    if (!tbody) return;
    
    if (!activeBenefits || !activeBenefits.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No active benefits applied</td></tr>';
        return;
    }
    
    tbody.innerHTML = activeBenefits.map(b => {
        let benefitValue = '';
        if (b.type === 'discount') {
            if (b.percentage && b.percentage > 0) {
                benefitValue = `${b.percentage}% off (Max ${formatCurrency(b.amount)})`;
            } else {
                benefitValue = formatCurrency(b.amount);
            }
        } else {
            benefitValue = formatCurrency(b.amount);
        }
        
        return `
            <tr>
                <td>${b.player_name || '-'}</td>
                <td>${getBenefitTypeBadge(b)}</td>
                <td><strong>${b.benefit_type || '-'}</strong></td>
                <td>${benefitValue}</td>
                <td>${formatDate(b.valid_from)}</td>
                <td>${formatDate(b.valid_to)}</td>
                <td><span class="${b.status === 'Active' ? 'badge-active' : 'badge-inactive'}">${b.status || 'Active'}</span></td>
            </tr>
        `;
    }).join('');
}

function updateStats() {
    // Count discounts vs scholarships from the discounts table
    let discountCount = 0;
    let scholarshipCount = 0;
    
    for (const d of allDiscounts) {
        if (d.status !== 'active') continue;
        const name = (d.discount_type || '').toLowerCase();
        if (name.includes('scholarship') || name.includes('merit') || name.includes('sports') || name.includes('need based')) {
            scholarshipCount++;
        } else {
            discountCount++;
        }
    }
    
    const totalActiveBenefits = activeBenefits.filter(b => b.status === 'Active').length || 0;
    
    // Calculate total savings from both discounts and scholarships
    let totalSavings = 0;
    for (const benefit of activeBenefits) {
        const savedAmount = parseFloat(benefit.saved_amount) || 0;
        totalSavings += savedAmount;
    }
    
    const totalDiscountsElem = document.getElementById('totalDiscounts');
    const totalScholarshipsElem = document.getElementById('totalScholarships');
    const totalPlayersDiscountedElem = document.getElementById('totalPlayersDiscounted');
    const totalSavingsElem = document.getElementById('totalSavings');
    
    if (totalDiscountsElem) totalDiscountsElem.textContent = discountCount;
    if (totalScholarshipsElem) totalScholarshipsElem.textContent = scholarshipCount;
    if (totalPlayersDiscountedElem) totalPlayersDiscountedElem.textContent = totalActiveBenefits;
    if (totalSavingsElem) totalSavingsElem.innerHTML = formatCurrency(totalSavings);
}

// ==================== APPLY FUNCTION ====================

async function applyDiscount() {
    const data = {
        player_id: parseInt(document.getElementById('playerSelect').value),
        discount_id: parseInt(document.getElementById('discountSelect').value),
        remarks: document.getElementById('discountRemarks').value || ''
    };
    
    if (!data.player_id || !data.discount_id) {
        showToast('Please select player and discount/scholarship', 'error');
        return;
    }
    
    try {
        const res = await fetch(`${API_URL}/billing/discounts/apply-discount`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json', 
                'Authorization': `Bearer ${getToken()}` 
            },
            body: JSON.stringify(data)
        });
        
        const result = await res.json();
        if (res.ok) {
            showToast('Discount/Scholarship applied successfully', 'success');
            toggleApplyDiscountForm();
            await loadAllData();
        } else {
            showToast(result.message || 'Failed to apply discount', 'error');
        }
    } catch (error) {
        showToast('Error applying discount', 'error');
    }
}

// ==================== TOGGLE FUNCTIONS ====================

function toggleApplyDiscountForm() {
    const form = document.getElementById('applyDiscountSection');
    if (form.style.display === 'none' || !form.style.display) {
        form.style.display = 'block';
        loadPlayers();
        loadDiscounts();
    } else {
        form.style.display = 'none';
        document.getElementById('applyDiscountForm').reset();
    }
}

function refreshData() {
    loadAllData();
    showToast('Data refreshed', 'success');
}

// Make functions global
window.applyDiscount = applyDiscount;
window.toggleApplyDiscountForm = toggleApplyDiscountForm;
window.refreshData = refreshData;