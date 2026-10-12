const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const ADMIN_KEY = process.env.ADMIN_KEY || '';
const DATA_DIR = path.join(__dirname, 'data');
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const DATA_FILE = path.join(DATA_DIR, 'items.json');
const MAX_SIZE = 50 * 1024 * 1024; // 50 MB
const ALLOWED_EXT = ['.rbxm', '.rbxmx'];
const KINDS = ['rbxm', 'toolbox', 'upload'];

for (const dir of [DATA_DIR, UPLOAD_DIR]) fs.mkdirSync(dir, { recursive: true });
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]');

const readItems = () => JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
const writeItems = (items) => {
  const tmp = DATA_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(items, null, 2));
  fs.renameSync(tmp, DATA_FILE);
};

// Cek signature file: binary Roblox = "<roblox!", XML = "<roblox"
function isRobloxFile(filePath) {
  const buf = Buffer.alloc(8);
  const fd = fs.openSync(filePath, 'r');
  fs.readSync(fd, buf, 0, 8, 0);
  fs.closeSync(fd);
  return buf.toString('latin1').startsWith('<roblox');
}

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (req, file, cb) =>
    cb(null, crypto.randomUUID() + path.extname(file.originalname).toLowerCase()),
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE, files: 1 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXT.includes(ext)) {
      return cb(new Error('Hanya file .rbxm atau .rbxmx yang diizinkan'));
    }
    cb(null, true);
  },
});

function publicItem(item) {
  let link;
  if (item.kind === 'rbxm') link = `/download/${item.id}`;
  else if (item.kind === 'toolbox') link = `https://www.roblox.com/library/${item.assetId}`;
  else link = `https://create.roblox.com/store/asset/${item.assetId}`;

  return {
    id: item.id,
    kind: item.kind,
    title: item.title,
    description: item.description,
    createdAt: item.createdAt,
    fileName: item.fileName,
    fileSize: item.fileSize,
    assetId: item.assetId,
    link,
  };
}

const app = express();
app.set('trust proxy', true);
app.use(express.static(path.join(__dirname, 'public')));

// Daftar semua item (publik)
app.get('/api/items', (req, res) => {
  res.json(readItems().map(publicItem));
});

// Tambah item: file .rbxm, ID toolbox, atau ID upload
app.post('/api/items', (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      const msg = err.code === 'LIMIT_FILE_SIZE' ? 'File terlalu besar (maks 50 MB)' : err.message;
      return res.status(400).json({ error: msg });
    }
    handleCreate(req, res);
  });
});

function handleCreate(req, res) {
  const kind = req.body.kind;
  const title = (req.body.title || '').trim().slice(0, 120);
  const description = (req.body.description || '').trim().slice(0, 1000);
  const cleanup = () => req.file && fs.unlink(req.file.path, () => {});

  if (!KINDS.includes(kind)) {
    cleanup();
    return res.status(400).json({ error: 'Jenis tidak valid' });
  }
  if (!title) {
    cleanup();
    return res.status(400).json({ error: 'Judul wajib diisi' });
  }

  const item = {
    id: crypto.randomUUID().slice(0, 8),
    kind,
    title,
    description,
    createdAt: new Date().toISOString(),
  };

  if (kind === 'rbxm') {
    if (!req.file) return res.status(400).json({ error: 'Pilih file .rbxm terlebih dahulu' });
    if (!isRobloxFile(req.file.path)) {
      cleanup();
      return res.status(400).json({ error: 'Isi file bukan format Roblox yang valid' });
    }
    item.fileName = req.file.originalname;
    item.storedName = req.file.filename;
    item.fileSize = req.file.size;
  } else {
    cleanup();
    // Terima angka saja atau link Roblox yang mengandung angka ID
    const match = String(req.body.assetId || '').match(/(\d{4,20})/);
    if (!match) {
      return res.status(400).json({ error: 'ID tidak valid. Masukkan angka ID atau link Roblox' });
    }
    item.assetId = match[1];
  }

  const items = readItems();
  items.unshift(item);
  writeItems(items);
  res.status(201).json(publicItem(item));
}

// Download file .rbxm
app.get('/download/:id', (req, res) => {
  const item = readItems().find((i) => i.id === req.params.id && i.kind === 'rbxm');
  if (!item) return res.status(404).send('File tidak ditemukan');
  res.download(path.join(UPLOAD_DIR, item.storedName), item.fileName);
});

// Hapus item (hanya dengan admin key di header x-admin-key)
app.delete('/api/items/:id', (req, res) => {
  if (!ADMIN_KEY || req.get('x-admin-key') !== ADMIN_KEY) {
    return res.status(401).json({ error: 'Tidak diizinkan' });
  }
  const items = readItems();
  const idx = items.findIndex((i) => i.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: 'Item tidak ditemukan' });

  const [removed] = items.splice(idx, 1);
  if (removed.storedName) fs.unlink(path.join(UPLOAD_DIR, removed.storedName), () => {});
  writeItems(items);
  res.json({ ok: true });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Zet Studio berjalan di http://localhost:${PORT}`);
});
