const express = require('express');
const multer = require('multer');
const path = require('path');
const { exec } = require('child_process');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Create upload/output dirs if missing
['uploads', 'outputs'].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, name);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 30 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/png', 'image/jpeg', 'audio/mpeg', 'audio/mp3'];
    cb(allowed.includes(file.mimetype) ? null : new Error('Unsupported file'), true);
  }
}).fields([
  { name: 'image', maxCount: 1 },
  { name: 'audio', maxCount: 1 }
]);

// Health route
app.get('/', (req, res) => {
  res.send('Microservice is running');
});

// /merge endpoint
app.post('/merge', (req, res) => {
  upload(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.files?.image?.[0] || !req.files?.audio?.[0]) {
      return res.status(400).json({ error: 'Both image and audio are required' });
    }

    const imagePath = req.files.image[0].path;
    const audioPath = req.files.audio[0].path;
    const outputPath = path.join('outputs', `video-${Date.now()}.mp4`);

    const cmd = `ffmpeg -y -loop 1 -i "${imagePath}" -i "${audioPath}" -c:v libx264 -tune stillimage -c:a aac -b:a 192k -shortest -pix_fmt yuv420p "${outputPath}"`;

    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.error(stderr);
        return res.status(500).json({ error: 'FFmpeg processing failed' });
      }
      res.json({ video: outputPath });
    });
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
