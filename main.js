

// ── Constants 
const ALLOWED_EXTENSIONS = ['.py', '.java', '.js', '.cpp'];
const MAX_LINES = 10_000;
const BINARY_CHECK_SIZE = 8192; // first 8 KB

const EXTENSION_LANG_MAP = {
    '.py': { name: 'Python', cssClass: 'lang-python', icon: '' },
    '.java': { name: 'Java', cssClass: 'lang-java', icon: '' },
    '.js': { name: 'JavaScript', cssClass: 'lang-javascript', icon: '' },
    '.cpp': { name: 'C++', cssClass: 'lang-cpp', icon: '' },
};

const STATUS = {
    VALID: 'valid',
    INVALID: 'invalid',
    WARNING: 'warning',
};

// ── State 
let fileQueue = []; // Array of validated file objects

// ── DOM refs 
const $ = (sel) => document.querySelector(sel);
const dropzone = $('#dropzone');
const fileInput = $('#file-input');
const dirInput = $('#dir-input');
const btnPickFiles = $('#btn-pick-files');
const btnPickDir = $('#btn-pick-dir');
const fileQueueSec = $('#file-queue-section');
const fileListEl = $('#file-list');
const fileCountEl = $('#file-count');
const btnClear = $('#btn-clear');
const submitArea = $('#submit-area');
const submitSummary = $('#submit-summary');
const btnScan = $('#btn-scan');
const toastContainer = $('#toast-container');

// Language Detector
function getExtension(filename) {
    const idx = filename.lastIndexOf('.');
    return idx !== -1 ? filename.slice(idx).toLowerCase() : '';
}

function detectLanguage(filename) {
    const ext = getExtension(filename);
    return EXTENSION_LANG_MAP[ext] || null;
}

// Validation Engine

/** Check if a buffer likely contains binary content (null bytes). */
function isBinary(buffer) {
    const view = new Uint8Array(buffer);
    const checkLen = Math.min(view.length, BINARY_CHECK_SIZE);
    for (let i = 0; i < checkLen; i++) {
        if (view[i] === 0) return true;
    }
    return false;
}

/** Count newline characters in a string. */
function countLines(text) {
    if (!text) return 0;
    // count \n occurrences; add 1 if file doesn't end with newline
    let count = 0;
    for (let i = 0; i < text.length; i++) {
        if (text.charCodeAt(i) === 10) count++;
    }
    return text.length > 0 ? count + 1 : 0;
}

/** Format bytes to human-readable. */
function formatSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + units[i];
}

/**
 * Validate a single File object.
 * Returns a Promise that resolves to a validation result object.
 */
async function validateFile(file) {
    const result = {
        id: crypto.randomUUID(),
        name: file.name,
        size: file.size,
        sizeFormatted: formatSize(file.size),
        lines: 0,
        language: null,
        status: STATUS.VALID,
        statusLabel: 'Ready',
        message: '',
        file, // keep reference
    };

    // 1. Extension check
    const ext = getExtension(file.name);
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
        result.status = STATUS.INVALID;
        result.statusLabel = 'Unsupported';
        result.message = `File type "${ext || 'none'}" is not supported. Accepted: ${ALLOWED_EXTENSIONS.join(', ')}`;
        return result;
    }

    // 2. Language detection
    result.language = detectLanguage(file.name);

    // 3. Empty file check
    if (file.size === 0) {
        result.status = STATUS.WARNING;
        result.statusLabel = 'Empty';
        result.message = 'This file is empty (0 bytes). Nothing to analyse.';
        return result;
    }

    // 4. Binary detection (read first 8 KB)
    try {
        const slice = file.slice(0, BINARY_CHECK_SIZE);
        const buffer = await slice.arrayBuffer();
        if (isBinary(buffer)) {
            result.status = STATUS.INVALID;
            result.statusLabel = 'Binary';
            result.message = 'This appears to be a binary file, not source code.';
            return result;
        }
    } catch {
        // If we can't read it, continue with a warning
    }

    // 5. Line count check (read full text)
    try {
        const text = await file.text();
        result.lines = countLines(text);

        if (result.lines > MAX_LINES) {
            result.status = STATUS.WARNING;
            result.statusLabel = 'Too Large';
            result.message = `${result.lines.toLocaleString()} lines exceeds the ${MAX_LINES.toLocaleString()}-line limit.`;
            return result;
        }
    } catch {
        result.status = STATUS.INVALID;
        result.statusLabel = 'Unreadable';
        result.message = 'Could not read file contents.';
        return result;
    }

    // All good
    result.statusLabel = 'Ready';
    result.message = `${result.lines.toLocaleString()} lines · ${result.sizeFormatted}`;
    return result;
}

// File Manager

/** Add files to the queue (deduplicating). */
async function addFiles(fileList) {
    const newFiles = Array.from(fileList);
    if (newFiles.length === 0) return;

    let addedCount = 0;
    let skippedCount = 0;
    let invalidCount = 0;

    for (const file of newFiles) {
        // Deduplicate by name + size
        const exists = fileQueue.some(
            (f) => f.name === file.name && f.size === file.size
        );
        if (exists) {
            skippedCount++;
            continue;
        }

        const result = await validateFile(file);
        fileQueue.push(result);
        addedCount++;

        if (result.status === STATUS.INVALID) invalidCount++;
    }

    // Show toasts
    if (addedCount > 0) {
        const validAdded = addedCount - invalidCount;
        if (validAdded > 0) {
            showToast('success', `${validAdded} file${validAdded > 1 ? 's' : ''} added to queue.`);
        }
        if (invalidCount > 0) {
            showToast('error', `${invalidCount} file${invalidCount > 1 ? 's' : ''} rejected (unsupported or binary).`);
        }
    }
    if (skippedCount > 0) {
        showToast('warning', `${skippedCount} duplicate${skippedCount > 1 ? 's' : ''} skipped.`);
    }

    renderQueue();
}

function removeFile(id) {
    fileQueue = fileQueue.filter((f) => f.id !== id);
    renderQueue();
}

function clearQueue() {
    fileQueue = [];
    renderQueue();
    showToast('info', 'File queue cleared.');
}

// UI Renderer

function renderQueue() {
    const hasFiles = fileQueue.length > 0;
    fileQueueSec.style.display = hasFiles ? '' : 'none';
    submitArea.style.display = hasFiles ? '' : 'none';

    if (!hasFiles) {
        fileListEl.innerHTML = '';
        return;
    }

    // Count stats
    const validFiles = fileQueue.filter((f) => f.status === STATUS.VALID);
    const warningFiles = fileQueue.filter((f) => f.status === STATUS.WARNING);
    const invalidFiles = fileQueue.filter((f) => f.status === STATUS.INVALID);

    fileCountEl.textContent = `${fileQueue.length} file${fileQueue.length > 1 ? 's' : ''} · ${validFiles.length} ready`;

    // Enable scan button only if at least 1 valid file
    btnScan.disabled = validFiles.length === 0;

    // Summary
    submitSummary.innerHTML = `<strong>${validFiles.length}</strong> file${validFiles.length !== 1 ? 's' : ''} ready for analysis` +
        (warningFiles.length > 0 ? ` · <span style="color:var(--warning)">${warningFiles.length} warning${warningFiles.length !== 1 ? 's' : ''}</span>` : '') +
        (invalidFiles.length > 0 ? ` · <span style="color:var(--error)">${invalidFiles.length} invalid</span>` : '');

    // Render cards
    fileListEl.innerHTML = fileQueue.map((f) => renderFileCard(f)).join('');

    // Attach remove handlers
    fileListEl.querySelectorAll('.file-card__remove').forEach((btn) => {
        btn.addEventListener('click', () => removeFile(btn.dataset.id));
    });
}

function renderFileCard(f) {
    const statusClass = `file-card--${f.status}`;
    const badgeClass = `status-badge--${f.status}`;
    const langBadge = f.language
        ? `<span class="file-card__lang ${f.language.cssClass}">${f.language.name}</span>`
        : '';

    return `
    <div class="file-card ${statusClass}">
      <div class="file-card__info">
        <div class="file-card__name">${escapeHtml(f.name)}</div>
        <div class="file-card__meta">
          ${langBadge}
          <span>Lines: ${f.lines > 0 ? f.lines.toLocaleString() : '—'}</span>
          <span>Size: ${f.sizeFormatted}</span>
        </div>
      </div>
      <div class="file-card__status">
        <span class="status-badge ${badgeClass}">${f.statusLabel}</span>
        <span class="file-card__message">${escapeHtml(f.message)}</span>
      </div>
      <button class="file-card__remove" data-id="${f.id}" title="Remove file">✕</button>
    </div>
  `;
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Toast System

function showToast(type, message) {
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.innerHTML = `
    <span class="toast__text">${escapeHtml(message)}</span>
  `;
    toastContainer.appendChild(toast);

    // Auto-dismiss after 4s
    setTimeout(() => {
        toast.remove();
    }, 4000);
}

// Event Handlers

// --- Drag and Drop ---
['dragenter', 'dragover'].forEach((evt) => {
    dropzone.addEventListener(evt, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.add('dropzone--active');
    });
});

['dragleave', 'drop'].forEach((evt) => {
    dropzone.addEventListener(evt, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.remove('dropzone--active');
    });
});

dropzone.addEventListener('drop', (e) => {
    const files = e.dataTransfer.files;
    if (files.length > 0) addFiles(files);
});

// Click on dropzone also opens file picker
dropzone.addEventListener('click', () => fileInput.click());

// File Picker
btnPickFiles.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) addFiles(fileInput.files);
    fileInput.value = ''; // reset so same file can be re-selected
});

// Directory Picker
btnPickDir.addEventListener('click', () => dirInput.click());
dirInput.addEventListener('change', () => {
    if (dirInput.files.length > 0) {
        // Filter to only supported extensions from the directory
        const all = Array.from(dirInput.files);
        const supported = all.filter((f) => {
            const ext = getExtension(f.name);
            return ALLOWED_EXTENSIONS.includes(ext);
        });

        if (supported.length === 0) {
            showToast('warning', `No supported files found in the selected directory. Expected: ${ALLOWED_EXTENSIONS.join(', ')}`);
        } else {
            const skipped = all.length - supported.length;
            if (skipped > 0) {
                showToast('info', `Found ${supported.length} supported file${supported.length > 1 ? 's' : ''}, skipped ${skipped} unsupported.`);
            }
            // Create a DataTransfer-like list with only supported files
            addFiles(supported);
        }
    }
    dirInput.value = '';
});

// Clear
btnClear.addEventListener('click', clearQueue);

// Start Scan
btnScan.addEventListener('click', () => {
    const validFiles = fileQueue.filter((f) => f.status === STATUS.VALID);
    if (validFiles.length === 0) {
        showToast('error', 'No valid files to scan.');
        return;
    }

    // Placeholder: in Story 2 this will pipe into Parser Manager → Complexity Analyzer
    showToast('success', `Scan initiated for ${validFiles.length} file${validFiles.length > 1 ? 's' : ''}. (Pipeline coming in Story 2)`);

    // Log summary to console for development
    console.group('CodeShield — Scan Submitted');
    validFiles.forEach((f) => {
        console.log(`  ${f.language?.name || '?'} | ${f.name} | ${f.lines} lines | ${f.sizeFormatted}`);
    });
    console.groupEnd();
});

// Prevent default browser file drop
document.addEventListener('dragover', (e) => e.preventDefault());
document.addEventListener('drop', (e) => e.preventDefault());
