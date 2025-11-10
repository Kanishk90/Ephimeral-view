// Viewer for ephemeral images with strong anti-download/screenshot protections
const DB_NAME = 'EphemeralImageDB';
const STORE_NAME = 'images';
let cachedDB = null; // Cache database connection

let currentImageId = null;
let timerInterval = null;
let isSingleView = false; // Track if this is a single-view link
let autoDeleteOnClose = false; // Auto-delete after viewing if single-view

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
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

// Get image from DB
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

async function loadImage() {
  const params = new URLSearchParams(window.location.search);
  const imageId = params.get('id');
  isSingleView = params.get('single') === 'true'; // Check if single-view mode
  autoDeleteOnClose = isSingleView; // Auto-delete on close if single-view

  if (!imageId) {
    showExpired('Invalid link: missing image ID');
    return;
  }

  currentImageId = imageId;

  try {
    const img = await getImage(imageId);

    if (!img) {
      showExpired('Image not found or has been deleted');
      return;
    }

    const now = Date.now();
    if (now > img.expiresAt) {
      await deleteImage(imageId);
      showExpired('Image has expired and been deleted');
      return;
    }

    // Draw image to canvas (prevents direct URL in DOM and right-click save)
    const bitmap = await createImageBitmap(img.blob);
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d', { alpha: false });

    canvas.width = bitmap.width;
    canvas.height = bitmap.height;

    // Draw image
    ctx.drawImage(bitmap, 0, 0);

    // Add dynamic watermark
    updateWatermark(img.originalName, img.expiresAt);

    // Start countdown timer
    startTimer(img.expiresAt);

    // Apply anti-download/screenshot protections
    applyProtections();

    // Setup delete button
    setupDeleteButton(imageId);

  } catch (err) {
    showExpired('Error loading image: ' + err.message);
  }
}

function updateWatermark(filename, expiresAt) {
  const watermark = document.getElementById('watermark');
  const now = new Date();
  const expiryDate = new Date(expiresAt);

  watermark.innerHTML = `
    <div>🔒 PROTECTED</div>
    <div>${filename}</div>
    <div style="font-size: 11px; margin-top: 8px; opacity: 0.6;">Expires: ${expiryDate.toLocaleString()}</div>
  `;
}

function startTimer(expiresAt) {
  const timer = document.getElementById('timer');
  // Hide timer from viewer - don't show when image expires
  if (timer) {
    timer.style.display = 'none';
  }

  function updateTimer() {
    const now = Date.now();
    const remaining = expiresAt - now;

    if (remaining <= 0) {
      clearInterval(timerInterval);
      // Auto-close the tab when image expires (no message shown)
      setTimeout(() => {
        window.close();
      }, 500); // Brief delay before closing
      return;
    }

    // Timer logic runs but is hidden from viewer
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

    // Uncomment below if you want to show timer again
    // timer.textContent = `⏱️ Expires in: ${hours}h ${minutes}m ${seconds}s`;

    // Warning color when less than 5 minutes left
    if (remaining < 5 * 60 * 1000) {
      // timer.classList.add('warning'); // Disabled when timer is hidden
    }
  }

  updateTimer();
  timerInterval = setInterval(updateTimer, 1000);
}

function applyProtections() {
  const overlay = document.getElementById('overlay');

  // 1. Disable right-click context menu everywhere
  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    e.stopPropagation();
    return false;
  }, true);

  // 2. Disable drag/drop on overlay
  overlay.addEventListener('dragstart', (e) => {
    e.preventDefault();
    e.stopPropagation();
  });

  overlay.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
  });

  // 3. AGGRESSIVE keyboard blocking - block ALL keys
  document.addEventListener('keydown', (e) => {
    // BLOCK ALL ALPHABET KEYS (A-Z, a-z)
    const key = e.key.toLowerCase();
    if (/^[a-z]$/.test(key)) {
      e.preventDefault();
      e.stopImmediatePropagation();
      e.returnValue = false;
      return false;
    }

    // BLOCK SHIFT + CTRL (prevents Shift+any, Ctrl+Shift+any)
    if (e.shiftKey || e.ctrlKey) {
      e.preventDefault();
      e.stopImmediatePropagation();
      e.returnValue = false;
      if (e.shiftKey) {
        showWarning('⚠️ Shift key blocked - All screenshots disabled');
      }
      return false;
    }

    // BLOCK ALT (prevents Alt+PrintScreen, Alt+Tab screenshots)
    if (e.altKey) {
      e.preventDefault();
      e.stopImmediatePropagation();
      e.returnValue = false;
      showWarning('⚠️ Alt key blocked');
      return false;
    }

    // BLOCK F-KEYS (F12 = DevTools, F2 = Firefox, F11 = Fullscreen, etc)
    if (e.key && e.key.startsWith('F')) {
      e.preventDefault();
      e.stopImmediatePropagation();
      e.returnValue = false;
      return false;
    }

    // BLOCK PrintScreen
    if (e.key === 'PrintScreen') {
      e.preventDefault();
      e.stopImmediatePropagation();
      e.returnValue = false;
      showWarning('⚠️ Screenshot blocked');
      return false;
    }

    // BLOCK Meta/Windows key
    if (e.metaKey) {
      e.preventDefault();
      e.stopImmediatePropagation();
      e.returnValue = false;
      showWarning('⚠️ Windows/Cmd key blocked');
      return false;
    }
  }, true);

  // ALSO block on keyup to catch screenshots
  document.addEventListener('keyup', (e) => {
    if (e.shiftKey || e.ctrlKey || e.altKey || e.metaKey) {
      e.preventDefault();
      e.stopImmediatePropagation();
      e.returnValue = false;
      return false;
    }
  }, true);

  // 4. Disable copy/cut/paste (single consolidated listener with stopImmediatePropagation)
  document.addEventListener('copy', (e) => {
    e.preventDefault();
    e.stopImmediatePropagation();
  });

  document.addEventListener('cut', (e) => {
    e.preventDefault();
    e.stopImmediatePropagation();
  });

  document.addEventListener('paste', (e) => {
    e.preventDefault();
    e.stopImmediatePropagation();
  });

  // 5. Disable touch callout (iOS long-press menu)
  document.addEventListener('touchstart', (e) => {
    if (e.touches.length > 1) {
      e.preventDefault(); // Disable pinch zoom
    }
  }, { passive: false });

  // 6. Disable text selection on entire page
  document.body.style.userSelect = 'none';
  document.body.style.webkitUserSelect = 'none';
  document.body.style.MozUserSelect = 'none';

  // 7. Block Screenshot/Print API if available
  if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
    const originalGetDisplayMedia = navigator.mediaDevices.getDisplayMedia;
    navigator.mediaDevices.getDisplayMedia = function() {
      showWarning('⚠️ Screen capture API blocked');
      return Promise.reject(new Error('Screen capture is disabled'));
    };
  }

  // 8. Block print dialog
  window.print = function() {
    showWarning('⚠️ Print is disabled');
    return false;
  };

  // 7. Detect DevTools opening and window blur (screenshot attempts)
  let lastCheck = Date.now();
  
  // DevTools detection
  setInterval(() => {
    const start = Date.now();
    debugger;
    const time = Date.now() - start;
    if (time > 100) {
      showWarning('⚠️ Developer Tools detected - viewing protections may be bypassed');
    }
  }, 2000);

  // Window blur detection (screenshot/Alt+Tab)
  let blurWarningShown = false;
  const canvas = document.getElementById('canvas');
  
  window.addEventListener('blur', () => {
    // User switched windows or tried to screenshot
    if (canvas) {
      canvas.classList.add('blur-on-blur');
    }
    showWarning('⚠️ Image blurred - keep window focused to view');
  });

  window.addEventListener('focus', () => {
    // User switched back to window
    if (canvas) {
      canvas.classList.remove('blur-on-blur');
    }
  });

  // Page visibility detection (tab switched)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      // Tab was switched to background
      showWarning('⚠️ Tab hidden - likely screenshot taken');
      if (canvas) {
        canvas.classList.add('blur-on-blur');
      }
    } else {
      // Tab came back to focus
      if (canvas) {
        canvas.classList.remove('blur-on-blur');
      }
    }
  });

  // 9. Disable right-click context menu globally
  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    e.stopImmediatePropagation();
    return false;
  }, true);

  // 10. Block mouse right-click
  document.addEventListener('mousedown', (e) => {
    if (e.button === 2) { // Right-click
      e.preventDefault();
      e.stopImmediatePropagation();
      return false;
    }
  }, true);

  console.log('[viewer] Anti-download protections activated');
}

function showExpired(message) {
  if (timerInterval) clearInterval(timerInterval);
  
  const container = document.getElementById('container');
  container.innerHTML = `
    <div class="expired">
      <h1>⏰ Image Unavailable</h1>
      <p>${message}</p>
      <a href="index.html">← Back to Upload</a>
    </div>
  `;
}

function showWarning(message) {
  // Create or update warning banner
  let warning = document.getElementById('warning-banner');
  if (!warning) {
    warning = document.createElement('div');
    warning.id = 'warning-banner';
    warning.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(220, 53, 69, 0.95);
      color: white;
      padding: 20px 40px;
      border-radius: 12px;
      z-index: 999;
      font-size: 15px;
      font-weight: 600;
      box-shadow: 0 15px 40px rgba(220, 53, 69, 0.4);
      border: 2px solid rgba(255, 107, 107, 1);
      backdrop-filter: blur(10px);
      animation: slideUp 0.4s ease-out;
      max-width: 400px;
      text-align: center;
      letter-spacing: 0.5px;
    `;
    
    // Add CSS animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideUp {
        from { transform: translate(-50%, -40%); opacity: 0; }
        to { transform: translate(-50%, -50%); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(warning);
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      warning.style.opacity = '0';
      warning.style.transition = 'opacity 0.4s ease-out';
      setTimeout(() => warning.remove(), 400);
    }, 5000);
  } else {
    warning.textContent = message;
    warning.style.opacity = '1';
  }
}

async function setupDeleteButton(imageId) {
  const deleteBtn = document.getElementById('deleteBtn');
  if (!deleteBtn) {
    // Try the new ID
    const closeBtn = document.getElementById('closeBtn');
    if (closeBtn) {
      closeBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        // Auto-delete if single-view before closing
        if (autoDeleteOnClose) {
          try {
            await deleteImage(imageId);
            console.log('[viewer] Single-view image auto-deleted on close');
          } catch (err) {
            console.error('Error auto-deleting image:', err);
          }
        }
        // Close the tab immediately
        window.close();
      });
    }
  } else {
    deleteBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      // Just close/go back - don't delete
      window.location.href = 'index.html';
    });
  }
}

// Load image on page load
window.addEventListener('load', loadImage);

// Clean up on page unload
window.addEventListener('beforeunload', () => {
  if (timerInterval) clearInterval(timerInterval);
});
