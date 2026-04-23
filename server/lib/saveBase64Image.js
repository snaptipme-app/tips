const fs = require('fs');
const path = require('path');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

/**
 * Save a base64-encoded image string to /uploads and return the public URL.
 *
 * Accepts:
 *   - Raw base64:  "/9j/4AAQ..."
 *   - Data URI:    "data:image/jpeg;base64,/9j/4AAQ..."
 *
 * @param {string} base64String - The base64 image data
 * @param {string} prefix       - Filename prefix (e.g. 'profile', 'logo')
 * @returns {string} The public URL path: /uploads/<filename>
 */
function saveBase64Image(base64String, prefix = 'profile') {
  if (!base64String) return '';

  // Ensure uploads directory exists
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }

  // Strip the data URI header if present
  const base64Data = base64String.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');

  const filename = `${prefix}_${Date.now()}_${Math.floor(Math.random() * 10000)}.jpg`;
  const filepath = path.join(UPLOADS_DIR, filename);
  fs.writeFileSync(filepath, buffer);

  return `/uploads/${filename}`;
}

module.exports = { saveBase64Image };
