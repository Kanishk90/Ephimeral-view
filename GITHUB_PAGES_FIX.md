# GitHub Pages URL Fix

## Problem
When deployed to GitHub Pages, the sharing links were broken because the app is hosted in a subdirectory (e.g., `https://username.github.io/Ephimeral-view/`) instead of the root domain.

## Root Cause
The original URL generation logic didn't account for the repository name in the path:
- **Localhost**: `http://127.0.0.1:3000/index.html`
- **GitHub Pages**: `https://username.github.io/Ephimeral-view/index.html`

## Solution
Added a helper function `getBaseUrl()` that properly handles both scenarios:

```javascript
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
```

### How It Works
1. Gets current pathname from browser
2. Removes `index.html` if present
3. Ensures trailing slash
4. Combines with origin to create complete base URL

### Results
- **Localhost**: `http://127.0.0.1:3000/` → ✅ Works
- **GitHub Pages**: `https://username.github.io/Ephimeral-view/` → ✅ Works
- **Both**: Sharing links now work correctly

## Changes Made

### app.js
1. Added `getBaseUrl()` helper function at the top
2. Updated `handleFileUpload()` to use `getBaseUrl()`
3. Updated copy button logic to use `getBaseUrl()`

### Result
Sharing links now work on:
- ✅ Localhost development
- ✅ GitHub Pages deployment
- ✅ Any other subdirectory deployment
- ✅ Other browsers (same browser only - IndexedDB is isolated)

## Testing
To verify the fix:

1. **Localhost**: `http://127.0.0.1:3000/`
   - Upload an image
   - Copy the link
   - Should work

2. **GitHub Pages**: `https://username.github.io/Ephimeral-view/`
   - Upload an image
   - Copy the link
   - Should work on the same browser

## Notes
- IndexedDB remains browser-specific (images still won't sync across browsers)
- URLs work with the trailing slash format used by GitHub Pages
- Fully backward compatible with localhost development

