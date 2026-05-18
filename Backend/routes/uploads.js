const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname) || '';
    const name = Date.now() + '-' + Math.round(Math.random() * 1e9) + ext;
    cb(null, name);
  }
});

const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB

// POST /api/uploads/license
router.post('/license', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  // return a relative path that can be used in DB
  const relative = `/uploads/${req.file.filename}`;
  return res.json({ path: relative, filename: req.file.filename });
});

// POST /api/uploads/product-assets
// fields:
// - images: multiple product images
// - certificate: single certificate file
router.post('/product-assets', upload.fields([
  { name: 'images', maxCount: 10 },
  { name: 'certificate', maxCount: 1 }
]), (req, res) => {
  const imageFiles = (req.files && req.files.images) ? req.files.images : [];
  const certificateFile = (req.files && req.files.certificate && req.files.certificate[0])
    ? req.files.certificate[0]
    : null;

  const imagePaths = imageFiles.map((file) => `/uploads/${file.filename}`);
  const certificationPath = certificateFile ? `/uploads/${certificateFile.filename}` : '';
  return res.json({
    images: imagePaths,
    certification: certificationPath
  });
});

module.exports = router;
