const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const bodyParser = require('body-parser');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
  })
);
app.use(cors());
// increase JSON/body size limit to allow base64 file uploads inside JSON
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// friendly error for oversized payloads
app.use((err, req, res, next) => {
  if (err && err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Payload too large. Max size is 10MB.' });
  }
  return next(err);
});

// route modules
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');

const path = require('path');

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);


// serve uploaded files statically (files saved by register endpoint)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/api/ping', (req, res) => res.json({ ok: true, ts: Date.now() }));

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
