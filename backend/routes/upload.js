import express from 'express';
import multer from 'multer';
import path from 'path';

const router = express.Router();

// 🔧 Konfiguracja zapisu plików
const storage = multer.diskStorage({
  destination: path.resolve('public/generated'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `media-${Date.now()}${ext}`;
    cb(null, name);
  }
});

const upload = multer({ storage });

// 📤 POST /api/upload – przyjmuje jeden plik i zwraca publiczny URL
router.post('/', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  const publicUrl = `http://localhost:3001/public/generated/${req.file.filename}`;
  res.json({ url: publicUrl });
});

export default router;
