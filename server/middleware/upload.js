const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// ─── Storage Engine ───────────────────────────────────────────────────────────
// To switch to Cloudinary later, replace this storage with
// multer-storage-cloudinary and update the getImageUrl() helper below.
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `profile-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (_req, file, cb) => {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (jpg, png, webp, gif, heic).'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
});

/**
 * Returns the public URL for an uploaded file.
 * For local storage: /uploads/<filename>
 * Swap this function body when moving to Cloudinary.
 */
function getImageUrl(req, file) {
  if (!file) return '';
  // file.path is absolute; we expose only the /uploads/<name> portion
  return `/uploads/${file.filename}`;
}

/**
 * Multer error handler middleware.
 * Use after upload middleware: router.post('/route', upload.single('file'), multerErrorHandler, handler)
 */
function multerErrorHandler(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Please select an image under 10MB.' });
    }
    return res.status(400).json({ error: `Upload error: ${err.message}` });
  }
  if (err) {
    return res.status(400).json({ error: err.message || 'File upload failed.' });
  }
  next();
}

module.exports = { upload, getImageUrl, multerErrorHandler };
