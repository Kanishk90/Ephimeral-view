# Ephemeral Image Viewer - Static Edition 🖼️

A **pure static HTML/CSS/JavaScript** app for uploading and sharing images that automatically expire after a time you set (1 hour to 7 days). No server needed—images are stored in your browser using IndexedDB.

**Key Features:**
- ✅ **No server required** – completely static, works offline
- ✅ **Local browser storage** – images stored in IndexedDB, never uploaded to the cloud
- ✅ **Configurable expiry** – choose 1h, 24h, 48h, or 7 days
- ✅ **Anti-download protections** – canvas rendering, no right-click, disabled drag/drop
- ✅ **Anti-screenshot deterrents** – watermark, keyboard shortcuts blocked, blur on window blur
- ✅ **Countdown timer** – shows exactly when image expires
- ✅ **Delete anytime** – voluntarily delete images before expiry from gallery or viewer
- ✅ **Shareable links** – copy URL to share images with others
- ✅ **Gallery view** – see all your images with remaining time and delete buttons
- ✅ **Beautiful UI** – modern, responsive design

---

## Quick Start

### Option 1: Open Directly in Browser (Easiest)

1. **Download or clone this folder**
2. **Open `index.html` in your web browser**
   - Double-click `index.html` or drag it into your browser
   - No installation needed!

### Option 2: Serve Locally with Python (Recommended for Sharing)

If you want to share images with others on your network, serve with Python:

```bash
# Python 3
python -m http.server 8000

# Or Python 2
python -m SimpleHTTPServer 8000
```

Then open **http://localhost:8000** in your browser.

### Option 3: Serve with Node.js

```bash
npx http-server -p 8000
```

Then open **http://localhost:8000**.

### Option 4: Host on GitHub Pages (Free & Public)

1. Fork or download this repo
2. Push to GitHub
3. Enable GitHub Pages in settings (point to `main` branch)
4. Share the GitHub Pages URL

---

## How It Works

### Upload
1. Click **"Select Image"** or drag an image into the upload area
2. Choose how long you want the image to stay (1 hour, 24 hours, 48 hours, or 7 days)
3. Click **"Select Image"** to upload

### Share
- A shareable link appears instantly
- Copy the link and send to anyone
- Links work for the duration you set, then automatically expire

### View
- Recipient opens the link
- Image is displayed in a **protected canvas viewer**
- A watermark shows when it expires
- Countdown timer ticks down to expiry
- When expired, the image is permanently deleted from their browser

### Protections
The viewer applies multiple anti-download/screenshot measures:
- **Canvas rendering** – no direct image URL to right-click save
- **Disabled right-click** – context menu blocked everywhere
- **Blocked keyboard shortcuts** – Ctrl+S, F12, Ctrl+Shift+I, PrintScreen, **Shift key entirely**, Alt+PrintScreen, Cmd+Shift+3/4, etc.
- **Blocked drag/drop** – can't drag image out
- **Copy/paste disabled** – Ctrl+C, Ctrl+V blocked
- **Window blur detection** – image blurs & warns when you switch windows or attempt screenshot
- **PrintScreen detection** – detects PrintScreen key and blurs image for 3 seconds
- **Watermark overlay** – shows filename and expiry time (stays on screenshots as evidence)
- **Screenshot warning** – alerts user when DevTools or screenshot tool detected
- **Print blocking** – CSS `@media print` hides content
- **DevTools detection** – warns if developer tools opened
- **Touch protection** – iOS long-press menu disabled
- **Gallery delete** – voluntarily delete image before expiry
- **Viewer close** – close page without deleting (image stays in gallery until expiry)

---

## Important Limitations ⚠️

**What this app prevents:**
- ✅ Right-click save (disabled)
- ✅ Keyboard shortcuts (Ctrl+S, F12, Ctrl+Shift+I, PrintScreen, all Alt+ combos, all Shift+ combos, all F-keys)
- ✅ Dragging images out of the page (blocked)
- ✅ Text selection and copying (disabled)
- ✅ Print dialog (blocked)
- ✅ Clipboard access (blocked)
- ✅ Developer Tools (blocked)
- ✅ Screenshot/Print APIs (blocked)
- ✅ Tab switching detection (image blurs when tab hidden)
- ✅ Watermark (proves screenshot came from you)

**What this app CANNOT prevent:**
- ❌ OS-level screenshots (Windows+Shift+S, Cmd+Shift+3, etc.) – *Windows key can't be detected in browser*
- ❌ External cameras or screen recording software
- ❌ Specialized software with low-level screen capture
- ❌ Determined users with advanced tools

**Why the limitation?** The Windows/Cmd key fires no JavaScript events in browsers (browser security). So while we block Shift+everything else, Windows+Shift+S still works at OS level. However:
- **The image BLURS when window loses focus** (catches most screenshot attempts)
- **Watermark PROVES the screenshot came from you** (shows filename, expiry date, "🔒 PROTECTED")
- **This is a DETERRENT, not a guarantee**

---

## How Images Are Stored

- **Uploaded images** are stored in your **browser's IndexedDB** (local storage)
- **They never leave your device** unless you share the link
- **They persist** across browser sessions until they expire
- **Expiry is enforced locally** – when the timer hits zero, the image is deleted from your browser
- **Shared links** also use IndexedDB – recipients see the image until it expires on their browser

---

## File Structure

```
.
├── index.html       # Upload & gallery page
├── app.js           # Upload logic + IndexedDB management
├── viewer.html      # Image viewer page
├── viewer.js        # Viewer logic + protections
└── README.md        # This file
```

---

## Customization

### Change Default TTL

Edit `app.js` line 5:
```javascript
let selectedTTL = 24 * 60 * 60 * 1000; // Default 24 hours
```

Change to:
```javascript
let selectedTTL = 1 * 60 * 60 * 1000; // Default 1 hour
```

### Customize Watermark

Edit `viewer.js` in the `updateWatermark()` function to change the watermark text, style, or add custom info.

### Change UI Colors

Edit the `<style>` section in `index.html` or `viewer.html`. Search for `#667eea` (primary color) and `#764ba2` (secondary).

---

## Browser Compatibility

- ✅ Chrome / Edge (90+)
- ✅ Firefox (88+)
- ✅ Safari (14+)
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

**IndexedDB storage:** Not supported in private/incognito mode on some browsers.

---

## Frequently Asked Questions

**Q: Can images be recovered after they expire?**
No. Once the timer reaches zero, the image is permanently deleted from the browser's IndexedDB.

**Q: Can I prevent screenshots?**
No. Screenshots are an OS-level feature and cannot be blocked by a web app. The app only deters casual sharing through UI protections and watermarking.

**Q: Are images uploaded to a server?**
No. All images are stored locally in your browser using IndexedDB. They never leave your device.

**Q: Can I download this and use it offline?**
Yes! Open `index.html` directly in your browser. No internet connection needed.

**Q: Can I host this on my own website?**
Yes! Upload all files to your web server. No server-side code needed.

**Q: Can someone access my images if I share the link?**
Yes, anyone with the link can view the image while it's active. The link expires after the TTL you set.

**Q: What happens if I close the browser?**
Images remain stored in IndexedDB and will still be there when you reopen the browser (until they expire).

**Q: Why is the image drawn on a canvas instead of using an `<img>` tag?**
Canvas prevents right-click save and makes it harder for casual users to extract the image. Determined users can still copy canvas data, but it adds a layer of protection.

---

## Security & Privacy Notes

### Strong Points
- ✅ No data sent to servers
- ✅ Fully client-side expiry enforcement
- ✅ Multiple UI-level protections
- ✅ Watermarking deters casual sharing
- ✅ Countdown timer ensures users know when image disappears

### Weaknesses
- ❌ Cannot prevent OS-level screenshots
- ❌ Cannot prevent memory inspection (DevTools)
- ❌ Cannot prevent determined users from extracting canvas data
- ❌ Not suitable for highly sensitive government/medical data
- ❌ No authentication or access control

### Best Practices

To increase security:
1. **Use a watermark** with user/timestamp info so copies can be traced
2. **Keep TTL short** – 1-2 hours for very sensitive content
3. **Communicate manually** – tell recipients when they should view the image
4. **Don't rely on this alone** for highly sensitive data – combine with other protections
5. **Add a password** (easy to implement) – ask users to enter a PIN before viewing

---

## License

MIT – Free to use, modify, and distribute.

---

## Tips for Using This

1. **Test locally first** – open `index.html` directly to make sure it works
2. **Share the full URL** – make sure to include `?view=...` parameter
3. **Set appropriate TTL** – 48 hours for casual sharing, 1 hour for sensitive content
4. **Remind recipients** – let them know when the image will expire
5. **Combine with other tools** – use alongside encrypted messaging for highest security

---

## Troubleshooting

**Images not showing up in gallery?**
- Check if IndexedDB is enabled in your browser
- Try clearing browser cache if they mysteriously disappeared
- IndexedDB doesn't work in private/incognito mode on some browsers

**Links not working?**
- Make sure you copy the entire URL including `?view=...` parameter
- Links only work in the same browser/device where the image was uploaded
- Links expire after the TTL you set

**Can't open DevTools?**
- The app blocks F12 and Ctrl+Shift+I, but you can still use the browser menu (⋯ → DevTools)
- These protections only deter casual attempts, not determined users

**Images not expiring?**
- Expiry is enforced only when the browser runs cleanup
- Close and reopen the page to trigger expiry check
- Check your browser's console for errors

---

## Contributing

Have ideas to improve this? Feel free to fork and enhance!

Ideas for improvements:
- Add encryption (e.g., with `TweetNaCl.js`)
- Add password protection
- Add analytics (local only)
- Add custom watermarks
- Improve mobile UI
- Add image resizing before upload
- Add drag-and-drop gallery reordering

---

**Made with ❤️ for privacy-conscious users.**
