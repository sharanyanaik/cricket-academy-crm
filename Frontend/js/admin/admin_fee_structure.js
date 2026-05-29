// ==================== ADMIN FEE STRUCTURE PAGE ====================
function getToken() {
    return localStorage.getItem('token');
}

function showToast(message, type) {
    type = type || 'success';
    var existingToasts = document.querySelectorAll('.toast-notification');
    for (var i = 0; i < existingToasts.length; i++) {
        existingToasts[i].remove();
    }
    var toast = document.createElement('div');
    toast.className = 'toast-notification ' + type;
    var iconClass = (type === 'success') ? 'fa-check-circle' : (type === 'error') ? 'fa-exclamation-circle' : 'fa-info-circle';
    toast.innerHTML = '<i class="fa-solid ' + iconClass + '"></i><span>' + message + '</span>';
    document.body.appendChild(toast);
    setTimeout(function() { toast.remove(); }, 3000);
}

function showConfirmModal(options) {
    var overlay = document.getElementById('customConfirmOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'customConfirmOverlay';
        overlay.className = 'custom-confirm-overlay';
        overlay.innerHTML = '<div class="custom-confirm-modal"><div class="custom-confirm-header" id="confirmHeader"><i class="fa-solid fa-trash-can"></i><h3 id="confirmTitle">Confirm Delete</h3></div><div class="custom-confirm-body" id="confirmMessage">Are you sure you want to delete this item?</div><div class="custom-confirm-footer"><button class="custom-confirm-btn custom-confirm-btn-cancel" id="confirmCancelBtn"><i class="fa-solid fa-times"></i> Cancel</button><button class="custom-confirm-btn custom-confirm-btn-confirm" id="confirmOkBtn"><i class="fa-solid fa-trash-can"></i> Delete</button></div></div>';
        document.body.appendChild(overlay);
        var style = document.createElement('style');
        style.textContent = '.custom-confirm-overlay{display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:2000;justify-content:center;align-items:center;}.custom-confirm-modal{background:white;border-radius:12px;width:400px;max-width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.3);animation:modalSlideIn 0.3s ease;}@keyframes modalSlideIn{from{transform:translateY(-50px);opacity:0;}to{transform:translateY(0);opacity:1;}}.custom-confirm-header{padding:20px 24px;border-radius:12px 12px 0 0;display:flex;align-items:center;gap:12px;}.custom-confirm-header.warning{background:#ef4444;color:white;}.custom-confirm-header.info{background:#3b82f6;color:white;}.custom-confirm-header i{font-size:24px;}.custom-confirm-header h3{margin:0;font-size:18px;font-weight:600;}.custom-confirm-body{padding:24px;font-size:16px;color:#1e293b;line-height:1.5;}.custom-confirm-footer{padding:16px 24px;border-top:1px solid #e2e8f0;display:flex;justify-content:flex-end;gap:12px;}.custom-confirm-btn{padding:8px 20px;border-radius:6px;font-size:14px;font-weight:500;cursor:pointer;border:none;transition:all 0.2s ease;}.custom-confirm-btn-cancel{background:#e2e8f0;color:#475569;}.custom-confirm-btn-cancel:hover{background:#cbd5e1;}.custom-confirm-btn-confirm{background:#ef4444;color:white;}.custom-confirm-btn-confirm:hover{background:#dc2626;}';
        document.head.appendChild(style);
    }
    var header = overlay.querySelector('#confirmHeader');
    var title = overlay.querySelector('#confirmTitle');
    var messageEl = overlay.querySelector('#confirmMessage');
    var confirmBtn = overlay.querySelector('#confirmOkBtn');
    header.className = 'custom-confirm-header ' + (options.type || 'warning');
    title.textContent = options.title || 'Confirm Delete';
    messageEl.innerHTML = options.message || 'Are you sure you want to delete this item?';
    if (options.type === 'info') {
        confirmBtn.className = 'custom-confirm-btn custom-confirm-btn-confirm info';
        confirmBtn.innerHTML = '<i class="fa-solid fa-check"></i> Confirm';
    } else {
        confirmBtn.className = 'custom-confirm-btn custom-confirm-btn-confirm';
        confirmBtn.innerHTML = '<i class="fa-solid fa-trash-can"></i> Delete';
    }
    var callback = options.onConfirm;
    overlay.style.display = 'flex';
    var cancelBtn = overlay.querySelector('#confirmCancelBtn');
    var newConfirmBtn = overlay.querySelector('#confirmOkBtn');
    cancelBtn.onclick = function() { overlay.style.display = 'none'; if (options.onCancel) options.onCancel(); };
    newConfirmBtn.onclick = function() { overlay.style.display = 'none'; if (callback) callback(); };
    overlay.onclick = function(e) { if (e.target === overlay) { overlay.style.display = 'none'; if (options.onCancel) options.onCancel(); } };
}

// Tab Switching
function showTab(tabId, event) {
    var tabs = document.querySelectorAll('.tab-content');
    for (var i = 0; i < tabs.length; i++) tabs[i].classList.remove('active');
    var tabButtons = document.querySelectorAll('.tab');
    for (var i = 0; i < tabButtons.length; i++) tabButtons[i].classList.remove('active');
    document.getElementById(tabId).classList.add('active');
    if (event && event.target) event.target.classList.add('active');
}
window.showTab = showTab;

// BATCH FEES FUNCTIONS

async function loadFeeStructures() {
    try {
        var token = getToken();
        var response = await fetch(API_URL + '/fee-structure/batches-with-fees', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (!response.ok) throw new Error('Failed to load fee structures');
        var fees = await response.json();
        var tbody = document.getElementById('feeStructureTable');
        if (!tbody) return;
        
        if (!fees || fees.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">No fee structures found<\/td><\/tr>';
            return;
        }
        var html = '';
        for (var i = 0; i < fees.length; i++) {
            var fee = fees[i];
            var batchId = fee.id;
            var feeId = fee.fee_id;
            
            var statusClass = (fee.fee_status === 'active') ? 'bg-success' : 'bg-danger';
            
            // Escape single quotes in batch name
            var batchName = (fee.batch_name || '').replace(/'/g, "\\'");
            
            html += '<tr>';
            html += '<td>' + (fee.batch_name || '-') + '<\/td>';
            html += '<td>' + (fee.timing || '-') + '<\/td>';
            html += '<td>₹' + (parseFloat(fee.monthly_fee || 0).toLocaleString()) + '<\/td>';
            html += '<td>₹' + (parseFloat(fee.yearly_fee || 0).toLocaleString()) + '<\/td>';
            html += '<td>₹' + (parseFloat(fee.registration_fee || 0).toLocaleString()) + '<\/td>';
            html += '<td><span class="badge ' + statusClass + '">' + (fee.fee_status || 'active') + '<\/span><\/td>';
            html += '<td class="action-buttons">';
            html += '<button class="btn btn-sm btn-warning" onclick="editFee(' + batchId + ', \'' + batchName + '\')" title="Edit Fee">';
            html += '<i class="fa-solid fa-pencil"></i> Edit';
            html += '<\/button>';
            if (feeId) {
                html += '<button class="btn btn-sm btn-danger" onclick="deleteFee(' + feeId + ')" title="Delete Fee">';
                html += '<i class="fa-solid fa-trash-can"></i> Delete';
                html += '<\/button>';
            }
            html += '<\/td>';
            html += '<\/tr>';
        }
        tbody.innerHTML = html;
    } catch (error) {
        console.error('Error:', error);
        var tbody = document.getElementById('feeStructureTable');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center text-danger">Failed to load data<\/td><\/tr>';
        }
    }
}

// Helper function to escape single quotes for onclick attributes
function escapeQuotes(str) {
    if (!str) return '';
    return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

window.showAddFeeModal = function() {
    var modal = document.getElementById('feeModal');
    if (!modal) return;
    
    var modalTitle = document.getElementById('feeModalTitle');
    if (modalTitle) modalTitle.innerText = 'Add Fee Structure';
    
    document.getElementById('feeId').value = '';
    document.getElementById('editBatchId').value = '';
    document.getElementById('batchNameInput').value = '';
    document.getElementById('monthlyFee').value = '';
    document.getElementById('yearlyFee').value = '';
    document.getElementById('registrationFee').value = '';
    document.getElementById('feeStatus').value = 'active';
    
    document.getElementById('addBatchField').style.display = 'block';
    document.getElementById('editBatchField').style.display = 'none';
    
    modal.style.display = 'flex';
};

window.editFee = async function(batchId, batchName) {
    console.log('Editing fee for batch:', batchId, batchName);
    
    if (!batchId) {
        showToast('Invalid batch ID', 'error');
        return;
    }
    
    try {
        var token = getToken();
        var response = await fetch(API_URL + '/fee-structure/fee/' + batchId, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        
        if (!response.ok) throw new Error('Failed to load fee data');
        
        var fee = await response.json();
        console.log('Fee data loaded:', fee);
        
        var modal = document.getElementById('feeModal');
        if (!modal) return;
        
        document.getElementById('feeModalTitle').innerText = 'Edit Fee Structure';
        document.getElementById('feeId').value = fee.fee_id || '';
        document.getElementById('editBatchId').value = batchId;
        document.getElementById('batchNameDisplay').value = batchName;
        document.getElementById('monthlyFee').value = fee.monthly_fee || 0;
        document.getElementById('yearlyFee').value = fee.yearly_fee || 0;
        document.getElementById('registrationFee').value = fee.registration_fee || 0;
        document.getElementById('feeStatus').value = fee.fee_status || 'active';
        
        document.getElementById('addBatchField').style.display = 'none';
        document.getElementById('editBatchField').style.display = 'block';
        
        modal.style.display = 'flex';
        
    } catch (error) {
        console.error('Error:', error);
        showToast('Error loading fee data: ' + error.message, 'error');
    }
};

window.deleteFee = function(feeId) {
    if (!feeId) {
        showToast('Invalid fee structure', 'error');
        return;
    }
    
    showConfirmModal({
        title: 'Delete Fee Structure',
        message: 'Are you sure you want to delete this fee structure?',
        type: 'warning',
        onConfirm: async function() {
            try {
                var token = getToken();
                var response = await fetch(API_URL + '/fee-structure/fee/' + feeId, {
                    method: 'DELETE',
                    headers: { 'Authorization': 'Bearer ' + token }
                });
                if (response.ok) {
                    showToast('Fee structure deleted successfully', 'success');
                    loadFeeStructures();
                } else { 
                    showToast('Delete failed', 'error'); 
                }
            } catch (error) { 
                showToast('Error deleting fee structure', 'error'); 
            }
        }
    });
};

var feeForm = document.getElementById('feeForm');
if (feeForm) {
    feeForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        var feeId = document.getElementById('feeId').value;
        var editBatchId = document.getElementById('editBatchId').value;
        var batchNameInput = document.getElementById('batchNameInput').value;
        
        var batch_id = null;
        
        if (editBatchId && editBatchId !== '') {
            batch_id = parseInt(editBatchId);
            console.log('EDIT MODE: batch_id =', batch_id);
        } 
        else if (batchNameInput && batchNameInput.trim() !== '') {
            console.log('ADD MODE: Finding batch by name:', batchNameInput);
            try {
                var token = getToken();
                var response = await fetch(API_URL + '/batches', {
                    headers: { 'Authorization': 'Bearer ' + token }
                });
                if (response.ok) {
                    var batches = await response.json();
                    var foundBatch = null;
                    for (var i = 0; i < batches.length; i++) {
                        if (batches[i].batch_name.toLowerCase() === batchNameInput.trim().toLowerCase()) {
                            foundBatch = batches[i];
                            break;
                        }
                    }
                    if (foundBatch) {
                        batch_id = foundBatch.id;
                        console.log('Found batch ID:', batch_id);
                    } else {
                        showToast('Batch not found. Please enter a valid batch name', 'error');
                        return;
                    }
                } else {
                    showToast('Unable to fetch batches', 'error');
                    return;
                }
            } catch (error) {
                console.error('Error finding batch:', error);
                showToast('Error finding batch', 'error');
                return;
            }
        } else {
            showToast('Please provide a valid batch name', 'error');
            return;
        }
        
        if (!batch_id) {
            showToast('Please provide a valid batch', 'error');
            return;
        }
        
        var feeData = {
            batch_id: batch_id,
            monthly_fee: parseFloat(document.getElementById('monthlyFee').value) || 0,
            quarterly_fee: 0,
            yearly_fee: parseFloat(document.getElementById('yearlyFee').value) || 0,
            registration_fee: parseFloat(document.getElementById('registrationFee').value) || 0,
            status: document.getElementById('feeStatus').value || 'active'
        };
        
        console.log('Saving fee data:', feeData);
        
        try {
            var token = getToken();
            var response = await fetch(API_URL + '/fee-structure/fee', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
                body: JSON.stringify(feeData)
            });
            
            var data = await response.json();
            
            if (response.ok) {
                showToast('Fee structure saved successfully', 'success');
                closeModal('feeModal');
                loadFeeStructures();
            } else { 
                showToast(data.message || 'Save failed', 'error'); 
            }
        } catch (error) { 
            console.error('Save error:', error);
            showToast('Error saving fee structure', 'error'); 
        }
    });
}

// DISCOUNTS FUNCTIONS 

async function loadDiscounts() {
    try {
        var token = getToken();
        var response = await fetch(API_URL + '/fee-structure/discounts', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (!response.ok) throw new Error('Failed to load discounts');
        var discounts = await response.json();
        var tbody = document.getElementById('discountsTable');
        if (!tbody) return;
        
        if (!discounts || discounts.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center">No discounts found<\/td><\/tr>';
            return;
        }
        var html = '';
        for (var i = 0; i < discounts.length; i++) {
            var d = discounts[i];
            var statusClass = (d.status === 'active') ? 'bg-success' : 'bg-danger';
            
            html += '<tr>';
            html += '<td>' + (d.discount_type || '-') + '<\/td>';
            html += '<td>' + (d.eligibility || '-') + '<\/td>';
            html += '<td>' + (d.percentage || 0) + '%<\/td>';
            html += '<td>₹' + (parseFloat(d.max_amount || 0).toLocaleString()) + '<\/td>';
            html += '<td>' + (d.valid_from || '-') + '<\/td>';
            html += '<td>' + (d.valid_to || '-') + '<\/td>';
            html += '<td><span class="badge ' + statusClass + '">' + (d.status || 'active') + '<\/span><\/td>';
            html += '<td class="action-buttons">';
            html += '<button class="btn btn-sm btn-warning" onclick="editDiscount(' + d.id + ')" title="Edit Discount">';
            html += '<i class="fa-solid fa-pencil"></i> Edit';
            html += '<\/button>';
            html += '<button class="btn btn-sm btn-danger" onclick="deleteDiscount(' + d.id + ')" title="Delete Discount">';
            html += '<i class="fa-solid fa-trash-can"></i> Delete';
            html += '<\/button>';
            html += '<\/td>';
            html += '<\/tr>';
        }
        tbody.innerHTML = html;
    } catch (error) { 
        console.error('Error loading discounts:', error);
        showToast('Failed to load discounts', 'error'); 
    }
}

window.showAddDiscountModal = function() {
    var modal = document.getElementById('discountModal');
    if (!modal) return;
    
    document.getElementById('discountModalTitle').innerText = 'Add Discount';
    document.getElementById('discountId').value = '';
    document.getElementById('discountType').value = '';
    document.getElementById('eligibility').value = '';
    document.getElementById('discountPercentage').value = '';
    document.getElementById('maxAmount').value = '';
    document.getElementById('validFrom').value = '';
    document.getElementById('validTo').value = '';
    document.getElementById('discountStatus').value = 'active';
    
    modal.style.display = 'flex';
};

window.editDiscount = async function(id) {
    try {
        var token = getToken();
        var response = await fetch(API_URL + '/fee-structure/discounts/' + id, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (!response.ok) throw new Error('Failed to load discount');
        var d = await response.json();
        
        document.getElementById('discountModalTitle').innerText = 'Edit Discount';
        document.getElementById('discountId').value = d.id;
        document.getElementById('discountType').value = d.discount_type || '';
        document.getElementById('eligibility').value = d.eligibility || '';
        document.getElementById('discountPercentage').value = d.percentage || 0;
        document.getElementById('maxAmount').value = d.max_amount || 0;
        document.getElementById('validFrom').value = d.valid_from || '';
        document.getElementById('validTo').value = d.valid_to || '';
        document.getElementById('discountStatus').value = d.status || 'active';
        
        var modal = document.getElementById('discountModal');
        if (modal) modal.style.display = 'flex';
        
    } catch (error) { 
        console.error('Error loading discount:', error);
        showToast('Error loading discount', 'error'); 
    }
};

window.deleteDiscount = function(id) {
    showConfirmModal({
        title: 'Delete Discount',
        message: 'Delete this discount?',
        onConfirm: async function() {
            try {
                var token = getToken();
                var response = await fetch(API_URL + '/fee-structure/discounts/' + id, {
                    method: 'DELETE',
                    headers: { 'Authorization': 'Bearer ' + token }
                });
                if (response.ok) { 
                    showToast('Discount deleted', 'success'); 
                    loadDiscounts(); 
                }
                else { 
                    showToast('Delete failed', 'error'); 
                }
            } catch (error) { 
                showToast('Error', 'error'); 
            }
        }
    });
};

var discountForm = document.getElementById('discountForm');
if (discountForm) {
    discountForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        var discountId = document.getElementById('discountId').value;
        var discountData = {
            discount_type: document.getElementById('discountType').value,
            eligibility: document.getElementById('eligibility').value,
            percentage: parseFloat(document.getElementById('discountPercentage').value) || 0,
            max_amount: parseFloat(document.getElementById('maxAmount').value) || 0,
            valid_from: document.getElementById('validFrom').value,
            valid_to: document.getElementById('validTo').value,
            status: document.getElementById('discountStatus').value || 'active'
        };
        
        if (!discountData.discount_type) {
            showToast('Discount type is required', 'error');
            return;
        }
        
        try {
            var token = getToken();
            var url = API_URL + '/fee-structure/discounts';
            var method = 'POST';
            
            if (discountId) {
                url = API_URL + '/fee-structure/discounts/' + discountId;
                method = 'PUT';
            }
            
            var response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
                body: JSON.stringify(discountData)
            });
            
            if (response.ok) {
                showToast(discountId ? 'Discount updated' : 'Discount added', 'success');
                closeModal('discountModal');
                loadDiscounts();
            } else {
                var data = await response.json();
                showToast(data.message || 'Save failed', 'error');
            }
        } catch (error) { 
            console.error('Save error:', error);
            showToast('Error saving discount', 'error'); 
        }
    });
}

// LATE FEE FUNCTIONS

async function loadLateFees() {
    try {
        var token = getToken();
        var response = await fetch(API_URL + '/fee-structure/late-fees', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (!response.ok) throw new Error('Failed to load late fees');
        var fees = await response.json();
        var tbody = document.getElementById('lateFeeTable');
        if (!tbody) return;
        
        if (!fees || fees.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="text-center">No late fee rules found<\/td><\/tr>';
            return;
        }
        var html = '';
        for (var i = 0; i < fees.length; i++) {
            var fee = fees[i];
            var daysRange = fee.min_days + (fee.max_days ? ' - ' + fee.max_days + ' days' : '+ days');
            html += '<tr>';
            html += '<td>' + daysRange + '<\/td>';
            html += '<td>₹' + (parseFloat(fee.fee_amount || 0).toLocaleString()) + '<\/td>';
            html += '<td class="action-buttons">';
            html += '<button class="btn btn-sm btn-warning" onclick="editLateFee(' + fee.id + ')" title="Edit Late Fee">';
            html += '<i class="fa-solid fa-pencil"></i> Edit';
            html += '<\/button>';
            html += '<button class="btn btn-sm btn-danger" onclick="deleteLateFee(' + fee.id + ')" title="Delete Late Fee">';
            html += '<i class="fa-solid fa-trash-can"></i> Delete';
            html += '<\/button>';
            html += '<\/td>';
            html += '<\/tr>';
        }
        tbody.innerHTML = html;
    } catch (error) { 
        console.error('Error loading late fees:', error);
        showToast('Failed to load late fees', 'error'); 
    }
}

window.showAddLateFeeModal = function() {
    var modal = document.getElementById('lateFeeModal');
    if (!modal) return;
    
    document.getElementById('lateFeeId').value = '';
    document.getElementById('minDays').value = '';
    document.getElementById('maxDays').value = '';
    document.getElementById('lateFeeAmount').value = '';
    
    modal.style.display = 'flex';
};

window.editLateFee = async function(id) {
    try {
        var token = getToken();
        var response = await fetch(API_URL + '/fee-structure/late-fees/' + id, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (!response.ok) throw new Error('Failed to load late fee');
        var fee = await response.json();
        
        document.getElementById('lateFeeId').value = fee.id;
        document.getElementById('minDays').value = fee.min_days || '';
        document.getElementById('maxDays').value = fee.max_days || '';
        document.getElementById('lateFeeAmount').value = fee.fee_amount || 0;
        
        var modal = document.getElementById('lateFeeModal');
        if (modal) modal.style.display = 'flex';
        
    } catch (error) { 
        console.error('Error loading late fee:', error);
        showToast('Error loading late fee', 'error'); 
    }
};

window.deleteLateFee = function(id) {
    showConfirmModal({
        title: 'Delete Late Fee Rule',
        message: 'Delete this late fee rule?',
        onConfirm: async function() {
            try {
                var token = getToken();
                var response = await fetch(API_URL + '/fee-structure/late-fees/' + id, {
                    method: 'DELETE',
                    headers: { 'Authorization': 'Bearer ' + token }
                });
                if (response.ok) { 
                    showToast('Late fee rule deleted', 'success'); 
                    loadLateFees(); 
                }
                else { 
                    showToast('Delete failed', 'error'); 
                }
            } catch (error) { 
                showToast('Error', 'error'); 
            }
        }
    });
};

var lateFeeForm = document.getElementById('lateFeeForm');
if (lateFeeForm) {
    lateFeeForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        var lateFeeId = document.getElementById('lateFeeId').value;
        var lateFeeData = {
            min_days: parseInt(document.getElementById('minDays').value),
            max_days: document.getElementById('maxDays').value ? parseInt(document.getElementById('maxDays').value) : null,
            fee_amount: parseFloat(document.getElementById('lateFeeAmount').value) || 0
        };
        
        if (!lateFeeData.min_days || !lateFeeData.fee_amount) {
            showToast('Min days and fee amount are required', 'error');
            return;
        }
        
        try {
            var token = getToken();
            var url = API_URL + '/fee-structure/late-fees';
            var method = 'POST';
            
            if (lateFeeId) {
                url = API_URL + '/fee-structure/late-fees/' + lateFeeId;
                method = 'PUT';
            }
            
            var response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
                body: JSON.stringify(lateFeeData)
            });
            
            if (response.ok) {
                showToast(lateFeeId ? 'Late fee rule updated' : 'Late fee rule added', 'success');
                closeModal('lateFeeModal');
                loadLateFees();
            } else {
                var data = await response.json();
                showToast(data.message || 'Save failed', 'error');
            }
        } catch (error) { 
            console.error('Save error:', error);
            showToast('Error saving late fee rule', 'error'); 
        }
    });
}

// COMMON FUNCTIONS

function closeModal(modalId) {
    var modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}
window.closeModal = closeModal;

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    if (!getToken()) {
        window.location.href = '../../pages/Authentication/login.html';
        return;
    }
    loadFeeStructures();
    loadDiscounts();
    loadLateFees();
});