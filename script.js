/**
 * Findr — Lost & Found Web Application
 * Client-side Controller & UI Interaction Logic
 * Fully vanilla JavaScript with zero external runtime dependencies.
 */

// Application State
const appState = {
    type: 'all',          // 'all' | 'lost' | 'found' | 'claimed'
    category: 'all',
    search: '',
    sort: 'newest',
    items: [],
    activeDetailItem: null,
    deleteTargetId: null,
    searchDebounceTimer: null
};

// ============================================================================
// INITIALIZATION
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    initEventListeners();
    loadDbStatus();
    loadStats();
    loadItems();

    // Set today's date as default in the report form
    const dateInput = document.getElementById('itemDate');
    if (dateInput) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.value = today;
    }
});

function initEventListeners() {
    // Search input with debounce
    const searchInput = document.getElementById('searchInput');
    const clearSearchBtn = document.getElementById('clearSearchBtn');

    searchInput.addEventListener('input', (e) => {
        const val = e.target.value.trim();
        clearSearchBtn.style.display = val ? 'block' : 'none';

        clearTimeout(appState.searchDebounceTimer);
        appState.searchDebounceTimer = setTimeout(() => {
            appState.search = val;
            updateActiveFiltersBar();
            loadItems();
        }, 280);
    });

    // Close modals on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeAllModals();
        }
    });

    // Close modal when clicking outside of modal container
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closeModal(overlay.id);
            }
        });
    });

    // Setup drag and drop for upload areas
    setupDragAndDrop('reportDropzone', 'itemPhotoInput', 'reportPreviewContainer', 'reportPreviewImg', 'reportUploadPrompt');
    setupDragAndDrop('editDropzone', 'editPhotoInput', 'editPreviewContainer', 'editPreviewImg', 'editUploadPrompt');
}

// ============================================================================
// DATABASE STATUS & METRIC STATS
// ============================================================================
async function loadDbStatus() {
    try {
        const res = await fetch('/api/db-status');
        if (!res.ok) throw new Error('Failed to fetch DB status');
        const data = await res.json();

        const label = document.getElementById('dbStatusLabel');
        const modalEngine = document.getElementById('dbModalEngine');
        const modalDesc = document.getElementById('dbModalDesc');

        if (data.active_db === 'mysql') {
            label.textContent = 'DB: MySQL (Active)';
            modalEngine.textContent = 'MySQL Database Active';
            modalDesc.innerHTML = `Connected to MySQL at <code>${escapeHtml(data.mysql_target)}</code>.`;
        } else {
            label.textContent = 'DB: SQLite (Active)';
            modalEngine.textContent = 'SQLite Database Active';
            modalDesc.innerHTML = `Using local file <code>${escapeHtml(data.sqlite_file)}</code>. Out-of-the-box zero setup mode.`;
        }
    } catch (err) {
        console.warn('Could not load DB status:', err);
    }
}

async function loadStats() {
    try {
        const res = await fetch('/api/stats');
        if (!res.ok) return;
        const stats = await res.json();

        animateNumber('statTotal', stats.total || 0);
        animateNumber('statLost', stats.lost || 0);
        animateNumber('statFound', stats.found || 0);
        animateNumber('statReunited', stats.reunited || 0);
    } catch (err) {
        console.error('Error loading stats:', err);
    }
}

function animateNumber(elementId, targetValue) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.textContent = targetValue;
}

// ============================================================================
// LISTINGS & FILTER LOGIC
// ============================================================================
async function loadItems() {
    const grid = document.getElementById('itemsGrid');
    const emptyState = document.getElementById('emptyState');
    const subtitle = document.getElementById('itemsCountSubtitle');

    // Build URL query params
    const params = new URLSearchParams();
    if (appState.type !== 'all') params.append('type', appState.type);
    if (appState.category !== 'all') params.append('category', appState.category);
    if (appState.search) params.append('search', appState.search);
    if (appState.sort) params.append('sort', appState.sort);

    try {
        const res = await fetch(`/api/items?${params.toString()}`);
        if (!res.ok) throw new Error('Failed to load items');
        const items = await res.json();
        appState.items = items;

        renderItems(items);

        if (items.length === 0) {
            emptyState.style.display = 'block';
            subtitle.textContent = '0 items found matching criteria';
        } else {
            emptyState.style.display = 'none';
            subtitle.textContent = `Showing ${items.length} ${items.length === 1 ? 'item' : 'items'}`;
        }
    } catch (err) {
        console.error('Error fetching items:', err);
        showToast('Failed to load listings. Check server connection.', 'error');
    }
}

function renderItems(items) {
    const grid = document.getElementById('itemsGrid');
    grid.innerHTML = '';

    items.forEach(item => {
        const card = document.createElement('div');
        card.className = 'item-card';

        // Badge styling based on status
        let badgeClass = 'badge-lost';
        let badgeLabel = 'LOST';
        if (item.status === 'found') {
            badgeClass = 'badge-found';
            badgeLabel = 'FOUND';
        } else if (item.status === 'claimed' || item.status === 'returned') {
            badgeClass = 'badge-claimed';
            badgeLabel = item.status === 'returned' ? 'RETURNED' : 'CLAIMED';
        }

        // Image or clean fallback
        let imageHtml = '';
        if (item.image_url) {
            // Can be directly served
            imageHtml = `<img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.title)}" class="card-img" onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\\'card-img-fallback\\'>📦 No Image</div>';">`;
        } else {
            imageHtml = `
                <div class="card-img-fallback">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                    <span>No Photo</span>
                </div>
            `;
        }

        card.innerHTML = `
            <div class="card-media">
                ${imageHtml}
                <div class="card-badges">
                    <span class="status-badge ${badgeClass}">${badgeLabel}</span>
                    <span class="category-badge">${escapeHtml(item.category || 'General')}</span>
                </div>
            </div>

            <div class="card-content">
                <h3 class="card-title" title="${escapeHtml(item.title)}">${escapeHtml(item.title)}</h3>
                <p class="card-desc">${escapeHtml(item.description || 'No detailed description provided.')}</p>

                <div class="card-meta-list">
                    <div class="card-meta-item" title="Location: ${escapeHtml(item.location)}">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                        <span>${escapeHtml(item.location)}</span>
                    </div>
                    <div class="card-meta-item">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                        <span>${escapeHtml(item.item_date)} &bull; ${escapeHtml(item.contact_name)}</span>
                    </div>
                </div>

                <div class="card-actions">
                    <button class="btn-card-view" onclick="openDetailModal(${item.id})">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                        View Details
                    </button>
                    <button class="btn-icon-action" onclick="openEditModal(${item.id})" title="Edit listing">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button class="btn-icon-action delete-hover" onclick="promptDelete(${item.id}, '${escapeJsString(item.title)}')" title="Delete listing">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                </div>
            </div>
        `;

        grid.appendChild(card);
    });
}

// Filter triggers
function filterByType(type) {
    appState.type = type;

    // Update active pill styling
    document.querySelectorAll('.type-pill').forEach(pill => {
        pill.classList.toggle('active', pill.dataset.type === type);
    });

    updateActiveFiltersBar();
    loadItems();
}

function onCategoryChange() {
    const val = document.getElementById('categoryFilter').value;
    appState.category = val;
    updateActiveFiltersBar();
    loadItems();
}

function onSortChange() {
    const val = document.getElementById('sortFilter').value;
    appState.sort = val;
    loadItems();
}

function clearSearch() {
    const searchInput = document.getElementById('searchInput');
    searchInput.value = '';
    document.getElementById('clearSearchBtn').style.display = 'none';
    appState.search = '';
    updateActiveFiltersBar();
    loadItems();
}

function resetAllFilters() {
    appState.type = 'all';
    appState.category = 'all';
    appState.search = '';
    appState.sort = 'newest';

    document.getElementById('searchInput').value = '';
    document.getElementById('clearSearchBtn').style.display = 'none';
    document.getElementById('categoryFilter').value = 'all';
    document.getElementById('sortFilter').value = 'newest';

    document.querySelectorAll('.type-pill').forEach(pill => {
        pill.classList.toggle('active', pill.dataset.type === 'all');
    });

    updateActiveFiltersBar();
    loadItems();
}

function resetFiltersAndScrollTop() {
    resetAllFilters();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateActiveFiltersBar() {
    const bar = document.getElementById('activeFiltersBar');
    const text = document.getElementById('filterStatusText');

    const activeParts = [];
    if (appState.type !== 'all') activeParts.push(`Type: ${appState.type.toUpperCase()}`);
    if (appState.category !== 'all') activeParts.push(`Category: ${appState.category}`);
    if (appState.search) activeParts.push(`Search: "${appState.search}"`);

    if (activeParts.length > 0) {
        bar.style.display = 'flex';
        text.textContent = `Active Filters: ${activeParts.join(' • ')}`;
    } else {
        bar.style.display = 'none';
    }
}

// ============================================================================
// MODAL CONTROLS & REPORT (ADD) FLOW
// ============================================================================
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('open');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('open');
        document.body.style.overflow = '';
    }
}

function closeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.classList.remove('open');
    });
    document.body.style.overflow = '';
}

function openReportModal(defaultType = 'lost') {
    const form = document.getElementById('reportForm');
    form.reset();

    // Default date to today
    const dateInput = document.getElementById('itemDate');
    if (dateInput) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }

    // Clear previous preview
    resetImagePreview('itemPhotoInput', 'reportPreviewContainer', 'reportUploadPrompt', 'reportPreviewImg');

    // Set radio
    if (defaultType === 'found') {
        document.getElementById('typeRadioFound').checked = true;
    } else {
        document.getElementById('typeRadioLost').checked = true;
    }

    updateFormTypeTheme(defaultType);
    openModal('reportModal');
}

function updateFormTypeTheme(type) {
    const title = document.getElementById('reportModalTitle');
    const submitBtn = document.getElementById('reportSubmitBtn');

    if (type === 'found') {
        title.textContent = 'Report a Found Item';
        submitBtn.textContent = 'Submit Found Item';
        submitBtn.className = 'btn btn-success';
    } else {
        title.textContent = 'Report a Lost Item';
        submitBtn.textContent = 'Submit Lost Item';
        submitBtn.className = 'btn btn-hero btn-lost';
    }
}

async function handleReportSubmit(e) {
    e.preventDefault();
    const form = document.getElementById('reportForm');
    const submitBtn = document.getElementById('reportSubmitBtn');

    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';

    const formData = new FormData(form);

    try {
        const res = await fetch('/api/items', {
            method: 'POST',
            body: formData
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Submission failed');

        showToast('Report submitted successfully!', 'success');
        closeModal('reportModal');
        form.reset();
        resetImagePreview('itemPhotoInput', 'reportPreviewContainer', 'reportUploadPrompt', 'reportPreviewImg');

        // Refresh listings and counter numbers
        loadStats();
        loadItems();
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Report';
    }
}

// ============================================================================
// ITEM DETAILS (VIEW) FLOW
// ============================================================================
async function openDetailModal(itemId) {
    try {
        const res = await fetch(`/api/items/${itemId}`);
        if (!res.ok) throw new Error('Could not retrieve item details');
        const item = await res.json();
        appState.activeDetailItem = item;

        // Populate modal data
        document.getElementById('detailItemTitle').textContent = item.title;
        document.getElementById('detailItemDate').textContent = item.item_date;
        document.getElementById('detailItemLocation').textContent = item.location;
        document.getElementById('detailItemDescription').textContent = item.description || 'No detailed description provided.';
        document.getElementById('detailCategoryBadge').textContent = item.category || 'General';

        // Status badge
        const statusBadge = document.getElementById('detailStatusBadge');
        statusBadge.className = 'status-badge';
        if (item.status === 'lost') {
            statusBadge.classList.add('badge-lost');
            statusBadge.textContent = 'LOST';
        } else if (item.status === 'found') {
            statusBadge.classList.add('badge-found');
            statusBadge.textContent = 'FOUND';
        } else {
            statusBadge.classList.add('badge-claimed');
            statusBadge.textContent = item.status === 'returned' ? 'RETURNED' : 'CLAIMED';
        }

        // Image
        const imgBox = document.getElementById('detailImageBox');
        if (item.image_url) {
            imgBox.innerHTML = `<img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.title)}" class="detail-img">`;
        } else {
            imgBox.innerHTML = `
                <div class="card-img-fallback">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                    <span>No Photo Uploaded</span>
                </div>
            `;
        }

        // Contact info
        document.getElementById('detailContactName').textContent = item.contact_name;
        document.getElementById('detailContactPhone').textContent = item.contact_phone;
        const phoneLink = document.getElementById('detailContactPhoneLink');
        phoneLink.href = `tel:${encodeURIComponent(item.contact_phone)}`;

        const emailLink = document.getElementById('detailContactEmailLink');
        if (item.contact_email) {
            emailLink.style.display = 'inline-flex';
            document.getElementById('detailContactEmail').textContent = item.contact_email;
            emailLink.href = `mailto:${encodeURIComponent(item.contact_email)}`;
        } else {
            emailLink.style.display = 'none';
        }

        // Claim button text
        const claimBtn = document.getElementById('detailClaimBtn');
        if (item.status === 'claimed' || item.status === 'returned') {
            claimBtn.textContent = 'Reopen as Active';
            claimBtn.className = 'btn btn-outline';
        } else {
            claimBtn.textContent = 'Mark as Claimed / Returned';
            claimBtn.className = 'btn btn-success';
        }

        openModal('detailModal');
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function toggleClaimedStatusFromDetail() {
    if (!appState.activeDetailItem) return;
    const item = appState.activeDetailItem;

    const nextStatus = (item.status === 'claimed' || item.status === 'returned') ? item.type : 'claimed';

    try {
        const res = await fetch(`/api/items/${item.id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: nextStatus })
        });

        if (!res.ok) throw new Error('Status update failed');
        const data = await res.json();

        showToast(`Item updated to ${nextStatus.toUpperCase()}!`, 'success');
        closeModal('detailModal');
        loadStats();
        loadItems();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// ============================================================================
// EDIT ITEM FLOW
// ============================================================================
function openEditModalFromDetail() {
    if (!appState.activeDetailItem) return;
    closeModal('detailModal');
    openEditModal(appState.activeDetailItem.id);
}

async function openEditModal(itemId) {
    try {
        const res = await fetch(`/api/items/${itemId}`);
        if (!res.ok) throw new Error('Could not retrieve item');
        const item = await res.json();

        // Populate fields
        document.getElementById('editItemId').value = item.id;
        document.getElementById('editStatus').value = item.status;
        document.getElementById('editType').value = item.type;
        document.getElementById('editTitle').value = item.title;
        document.getElementById('editCategory').value = item.category;
        document.getElementById('editDate').value = item.item_date;
        document.getElementById('editLocation').value = item.location;
        document.getElementById('editDescription').value = item.description || '';
        document.getElementById('editContactName').value = item.contact_name;
        document.getElementById('editContactPhone').value = item.contact_phone;
        document.getElementById('editContactEmail').value = item.contact_email || '';

        // Reset photo upload area
        resetImagePreview('editPhotoInput', 'editPreviewContainer', 'editUploadPrompt', 'editPreviewImg');

        // Show current image if exists
        if (item.image_url) {
            const previewContainer = document.getElementById('editPreviewContainer');
            const previewImg = document.getElementById('editPreviewImg');
            const prompt = document.getElementById('editUploadPrompt');

            previewImg.src = item.image_url;
            previewContainer.style.display = 'inline-block';
            prompt.style.display = 'none';
        }

        openModal('editModal');
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function handleEditSubmit(e) {
    e.preventDefault();
    const form = document.getElementById('editForm');
    const itemId = document.getElementById('editItemId').value;
    const submitBtn = document.getElementById('editSubmitBtn');

    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';

    const formData = new FormData(form);

    try {
        const res = await fetch(`/api/items/${itemId}`, {
            method: 'PUT',
            body: formData
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to update item');

        showToast('Item updated successfully!', 'success');
        closeModal('editModal');
        loadStats();
        loadItems();
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Save Changes';
    }
}

// ============================================================================
// DELETE FLOW
// ============================================================================
function confirmDeleteItem() {
    if (!appState.activeDetailItem) return;
    closeModal('detailModal');
    promptDelete(appState.activeDetailItem.id, appState.activeDetailItem.title);
}

function promptDelete(itemId, title) {
    appState.deleteTargetId = itemId;
    const preview = document.getElementById('deleteItemPreview');
    preview.innerHTML = `<strong>${escapeHtml(title)}</strong>`;
    openModal('deleteConfirmModal');
}

async function executeDelete() {
    if (!appState.deleteTargetId) return;

    const btn = document.getElementById('executeDeleteBtn');
    btn.disabled = true;
    btn.textContent = 'Deleting...';

    try {
        const res = await fetch(`/api/items/${appState.deleteTargetId}`, {
            method: 'DELETE'
        });

        if (!res.ok) throw new Error('Failed to delete item');

        showToast('Item deleted successfully!', 'info');
        closeModal('deleteConfirmModal');
        appState.deleteTargetId = null;
        loadStats();
        loadItems();
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Yes, Delete';
    }
}

// ============================================================================
// IMAGE UPLOAD & PREVIEW HELPERS
// ============================================================================
function handleImagePreview(fileInput, containerId, imgId) {
    const file = fileInput.files[0];
    if (!file) return;

    const container = document.getElementById(containerId);
    const img = document.getElementById(imgId);
    const prompt = container.parentElement.querySelector('.upload-prompt');

    const reader = new FileReader();
    reader.onload = function(e) {
        img.src = e.target.result;
        container.style.display = 'inline-block';
        if (prompt) prompt.style.display = 'none';
    };
    reader.readAsDataURL(file);
}

function removeImagePreview(event, inputId, containerId, promptId) {
    if (event) {
        event.stopPropagation();
    }
    const input = document.getElementById(inputId);
    const container = document.getElementById(containerId);
    const prompt = document.getElementById(promptId);

    if (input) input.value = '';
    if (container) container.style.display = 'none';
    if (prompt) prompt.style.display = 'flex';
}

function resetImagePreview(inputId, containerId, promptId, imgId) {
    const input = document.getElementById(inputId);
    const container = document.getElementById(containerId);
    const prompt = document.getElementById(promptId);
    const img = document.getElementById(imgId);

    if (input) input.value = '';
    if (img) img.src = '';
    if (container) container.style.display = 'none';
    if (prompt) prompt.style.display = 'flex';
}

function setupDragAndDrop(dropzoneId, inputId, containerId, imgId, promptId) {
    const dropzone = document.getElementById(dropzoneId);
    if (!dropzone) return;

    ['dragenter', 'dragover'].forEach(name => {
        dropzone.addEventListener(name, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.style.borderColor = 'var(--primary)';
            dropzone.style.background = 'var(--primary-light)';
        });
    });

    ['dragleave', 'drop'].forEach(name => {
        dropzone.addEventListener(name, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.style.borderColor = '';
            dropzone.style.background = '';
        });
    });

    dropzone.addEventListener('drop', (e) => {
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            const input = document.getElementById(inputId);
            input.files = files;
            handleImagePreview(input, containerId, imgId);
        }
    });
}

// ============================================================================
// DATABASE MODAL & TOAST NOTIFICATIONS
// ============================================================================
function openDbModal() {
    loadDbStatus();
    openModal('dbModal');
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let iconSvg = '';
    if (type === 'success') {
        iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" color="var(--found-color)"><polyline points="20 6 9 17 4 12"/></svg>';
    } else if (type === 'error') {
        iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" color="var(--lost-color)"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';
    } else {
        iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" color="var(--primary)"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';
    }

    toast.innerHTML = `${iconSvg}<span>${escapeHtml(message)}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px) scale(0.95)';
        setTimeout(() => toast.remove(), 400);
    }, 3500);
}

// ============================================================================
// UTILITIES (XSS Escaping)
// ============================================================================
function escapeHtml(text) {
    if (!text) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function escapeJsString(str) {
    if (!str) return '';
    return String(str).replace(/'/g, "\\'").replace(/"/g, '\\"');
}
