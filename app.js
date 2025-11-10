// Static Ephemeral Image App - IndexedDB Storage
const DB_NAME = 'EphemeralImageDB';
const STORE_NAME = 'images';
let selectedTTL = 24 * 60 * 60 * 1000; // Default 24 hours in milliseconds
let isSingleViewMode = false; // Track if single-view is selected in TTL selector
let cachedDB = null; // Cache database connection
let galleryObjectURLs = []; // Track ObjectURLs for cleanup

// Helper function to get base URL that works on both localhost and GitHub Pages
function getBaseUrl() {
  let pathname = window.location.pathname;
  // Remove index.html if present
  if (pathname.endsWith('index.html')) {
    pathname = pathname.replace('index.html', '');
  }
  // Ensure trailing slash
  if (!pathname.endsWith('/')) {
    pathname += '/';
  }
  return window.location.origin + pathname;
}

// Initialize IndexedDB with caching
function initDB() {
  // Return cached connection if available
  if (cachedDB) {
    return Promise.resolve(cachedDB);
  }
  
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      cachedDB = req.result; // Cache the connection
      resolve(cachedDB);
    };
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('expiresAt', 'expiresAt', { unique: false });
      }
    };
  });
}

// Get all images from DB
async function getAllImages() {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
  });
}

// Save image to DB
async function saveImage(id, blob, originalName, ttlMs) {
  const db = await initDB();
  const now = Date.now();
  const image = {
    id,
    blob,
    originalName,
    uploadedAt: now,
    expiresAt: now + ttlMs
  };
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(image);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(image);
  });
}

// Get single image
async function getImage(id) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(id);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
  });
}

// Delete image
async function deleteImage(id) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve();
  });
}

// Clean expired images using index for efficiency
async function cleanExpiredImages() {
  const db = await initDB();
  const now = Date.now();
  
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    
    // Use index to find all images with expiresAt < now
    const index = store.index('expiresAt');
    const range = IDBKeyRange.upperBound(now);
    const req = index.openCursor(range);
    
    req.onerror = () => reject(req.error);
    req.onsuccess = (e) => {
      const cursor = e.target.result;
      if (cursor) {
        // Delete this expired image
        cursor.delete();
        cursor.continue();
      } else {
        resolve();
      }
    };
  });
}

// UI Elements
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const selectBtn = document.getElementById('selectBtn');
const gallerySection = document.getElementById('gallerySection');
const gallery = document.getElementById('gallery');

// Initialize TTL buttons on page load (safer than DOMContentLoaded)
function initializeTTLButtons() {
  const ttlOptions = document.querySelector('.ttl-options');
  const allButtons = document.querySelectorAll('.ttl-btn');
  
  if (ttlOptions && allButtons.length > 0) {
    allButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Remove active from ALL buttons
        allButtons.forEach(b => b.classList.remove('active'));
        
        // Add active to clicked button only
        btn.classList.add('active');
        
        // Check if single-view mode is selected
        isSingleViewMode = btn.dataset.single === 'true';
        
        if (isSingleViewMode) {
          // Single View: 10 seconds
          selectedTTL = 10 * 1000; // 10 seconds in milliseconds
        } else {
          // Normal TTL: hours
          const hours = parseInt(btn.dataset.ttl);
          selectedTTL = hours * 60 * 60 * 1000;
        }
        
        console.log(`[TTL] Selected: ${btn.textContent.trim()}, TTL: ${selectedTTL}ms, SingleView: ${isSingleViewMode}`);
      });
    });
  }
}

// Call initialization as soon as script loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeTTLButtons);
} else {
  // DOM already loaded (script is deferred or at end of body)
  initializeTTLButtons();
}

// Upload handlers
selectBtn.addEventListener('click', () => fileInput.click());

uploadArea.addEventListener('click', () => fileInput.click());

uploadArea.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', () => {
  uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadArea.classList.remove('dragover');
  const files = e.dataTransfer.files;
  if (files.length) {
    handleFileUpload(files[0]);
  }
});

fileInput.addEventListener('change', (e) => {
  if (e.target.files.length) {
    handleFileUpload(e.target.files[0]);
  }
});

async function handleFileUpload(file) {
  if (!file.type.startsWith('image/')) {
    return;
  }

  if (file.size > 50 * 1024 * 1024) {
    return;
  }

  try {
    const id = generateId();
    await saveImage(id, file, file.name, selectedTTL);

    const hours = Math.round(selectedTTL / (1000 * 60 * 60));
    // Generate viewer URL using helper function (works on both localhost and GitHub Pages)
    const baseUrl = getBaseUrl();
    let shareUrl = `${baseUrl}viewer.html?id=${encodeURIComponent(id)}`;
    
    // Add single-view parameter if selected from TTL
    if (isSingleViewMode) {
      shareUrl += '&single=true';
    }

    fileInput.value = '';
    
    await updateGallery();
  } catch (err) {
    console.error('Upload error:', err.message);
  }
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

async function updateGallery() {
  await cleanExpiredImages();
  
  // Clean up all existing TTL intervals before re-rendering
  const existingItems = gallery.querySelectorAll('.gallery-item');
  existingItems.forEach(item => {
    const ttlInterval = item.dataset.ttlInterval;
    if (ttlInterval) {
      clearInterval(parseInt(ttlInterval));
    }
  });
  
  const images = await getAllImages();

  if (images.length === 0) {
    gallerySection.style.display = 'none';
    // Clean up old ObjectURLs when gallery is empty
    galleryObjectURLs.forEach(url => URL.revokeObjectURL(url));
    galleryObjectURLs = [];
    return;
  }

  // Revoke old ObjectURLs before creating new ones (prevent memory leak)
  galleryObjectURLs.forEach(url => URL.revokeObjectURL(url));
  galleryObjectURLs = [];

  gallerySection.style.display = 'block';
  gallery.innerHTML = '';

  for (const img of images) {
    const timeLeft = img.expiresAt - Date.now();
    if (timeLeft < 0) continue;

    const url = URL.createObjectURL(img.blob);
    galleryObjectURLs.push(url); // Track for cleanup

    const item = document.createElement('div');
    item.className = 'gallery-item';
    
    const imgEl = document.createElement('img');
    imgEl.src = url;
    imgEl.alt = img.originalName;
    
    const ttlEl = document.createElement('div');
    ttlEl.className = 'gallery-item-ttl';
    ttlEl.dataset.expiresAt = img.expiresAt; // Store expiration time
    
    // Function to update TTL display
    const updateTTLDisplay = () => {
      const now = Date.now();
      const remaining = img.expiresAt - now;
      
      if (remaining <= 0) {
        // Image has expired, remove it
        item.remove();
        return;
      }
      
      // Display time remaining in appropriate units
      if (remaining < 60 * 1000) {
        // Less than 1 minute - show seconds
        const seconds = Math.ceil(remaining / 1000);
        ttlEl.textContent = `${seconds}s left`;
        ttlEl.style.background = 'rgba(220, 53, 69, 0.8)'; // Red for warning
      } else if (remaining < 60 * 60 * 1000) {
        // Less than 1 hour - show minutes
        const minutes = Math.ceil(remaining / (60 * 1000));
        ttlEl.textContent = `${minutes}m left`;
        ttlEl.style.background = 'rgba(255, 193, 7, 0.8)'; // Yellow for caution
      } else {
        // More than 1 hour - show hours
        const hours = Math.ceil(remaining / (60 * 60 * 1000));
        ttlEl.textContent = `${hours}h left`;
        ttlEl.style.background = 'rgba(0, 0, 0, 0.7)'; // Normal
      }
    };
    
    // Initial display
    updateTTLDisplay();
    
    // Update every second for real-time countdown
    const ttlInterval = setInterval(updateTTLDisplay, 1000);
    item.dataset.ttlInterval = ttlInterval; // Store interval for cleanup
    
    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'gallery-item-delete';
    deleteBtn.innerHTML = '✕';
    deleteBtn.title = 'Delete image immediately';
    deleteBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      clearInterval(ttlInterval); // Clean up interval
      if (confirm('Delete this image immediately?')) {
        await deleteImage(img.id);
        await updateGallery();
      }
    });

    // Regular view button - opens in new tab instead of redirect
    const viewBtn = document.createElement('button');
    viewBtn.className = 'gallery-item-view';
    viewBtn.innerHTML = '🔍';
    viewBtn.title = 'Open image in new tab';
    viewBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      // Open regular viewer in new tab (completely independent)
      const viewUrl = `viewer.html?id=${encodeURIComponent(img.id)}`;
      window.open(viewUrl, '_blank');
    });

    // Copy button - copies the viewer link to clipboard
    const copyBtn = document.createElement('button');
    copyBtn.className = 'gallery-item-copy';
    copyBtn.innerHTML = '📋';
    copyBtn.title = 'Copy link to clipboard';
    copyBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      // Use helper function to get base URL (works on both localhost and GitHub Pages)
      const baseUrl = getBaseUrl();
      const shareUrl = `${baseUrl}viewer.html?id=${encodeURIComponent(img.id)}`;
      
      try {
        // Copy to clipboard
        await navigator.clipboard.writeText(shareUrl);
        
        // Visual feedback - change to checkmark
        const originalHTML = copyBtn.innerHTML;
        copyBtn.innerHTML = '✓';
        copyBtn.classList.add('copied');
        
        // Revert after 2 seconds
        setTimeout(() => {
          copyBtn.innerHTML = originalHTML;
          copyBtn.classList.remove('copied');
        }, 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
        // Fallback - show alert with link
        alert('Link: ' + shareUrl);
      }
    });

    item.appendChild(imgEl);
    item.appendChild(ttlEl);
    item.appendChild(deleteBtn);
    item.appendChild(viewBtn);
    item.appendChild(copyBtn);

    gallery.appendChild(item);
  }
}

// Load gallery on page load with optimized auto-update
let galleryUpdateInterval = null;

function startGalleryAutoUpdate() {
  // Only start if not already running
  if (galleryUpdateInterval) return;
  
  galleryUpdateInterval = setInterval(async () => {
    // Skip update if page is hidden (save battery/CPU)
    if (document.hidden) return;
    
    await updateGallery();
  }, 60 * 1000);
}

function stopGalleryAutoUpdate() {
  if (galleryUpdateInterval) {
    clearInterval(galleryUpdateInterval);
    galleryUpdateInterval = null;
  }
}

window.addEventListener('load', async () => {
  await updateGallery();
  
  // Only start auto-update if there are images
  const images = await getAllImages();
  if (images.length > 0) {
    startGalleryAutoUpdate();
  }
});

// Pause auto-update when page is hidden, resume when visible
document.addEventListener('visibilitychange', async () => {
  if (document.hidden) {
    stopGalleryAutoUpdate();
  } else {
    // Resume updates and refresh immediately
    await updateGallery();
    startGalleryAutoUpdate();
  }
});

// Clean up on page unload
window.addEventListener('beforeunload', () => {
  stopGalleryAutoUpdate();
  // Revoke all ObjectURLs to free memory
  galleryObjectURLs.forEach(url => URL.revokeObjectURL(url));
  galleryObjectURLs = [];
});
