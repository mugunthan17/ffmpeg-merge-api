const express = require('express');
const multer = require('multer');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();

// Multer storage config
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 30 * 1024 * 1024 // 30MB per file
  },
  fileFilter: (req, file, cb) => {
    // Optional: accept only certain mime types
    const allowedMimes = ['image/png', 'image/jpeg', 'audio/mpeg', 'audio/mp3'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

app.post('/merge', upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'audio', maxCount: 1 }
]), (req, res) => {
  console.log('Request received at /merge');
  console.log('Files:', req.files);
  if (!req.files || !req.files.image || !req.files.audio) {
    console.error('Missing files!');
    return res.status(400).send('Please upload both image and audio files');
  }

  const imagePath = req.files.image[0].path;
  const audioPath = req.files.audio[0].path;
  const outputDir = path.join(__dirname, 'outputs');
  const outputFilename = `output-${Date.now()}.mp4`;
  const outputPath = path.join(outputDir, outputFilename);

  // Ensure outputs folder exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  const cmd = `ffmpeg -y -loop 1 -i "${imagePath}" -i "${audioPath}" -c:v libx264 -c:a aac -b:a 192k -shortest -pix_fmt yuv420p "${outputPath}"`;

  console.log('Running command:', cmd);

  exec(cmd, (error, stdout, stderr) => {
    console.log('FFmpeg stdout:', stdout);
    console.error('FFmpeg stderr:', stderr);

    // Clean up input files
    try {
      fs.unlinkSync(imagePath);
      fs.unlinkSync(audioPath);
    } catch (err) {
      console.warn('Failed to delete temp files:', err.message);
    }

    if (error) {
      console.error('FFmpeg failed:', error.message);
      return res.status(500).send(`Error processing video: ${error.message}`);
    }

    // Send the resulting video
    res.download(outputPath, outputFilename, (err) => {
      if (err) {
        console.error('Error sending video:', err.message);
      }
      try {
        fs.unlinkSync(outputPath); // Clean up output file
      } catch (err) {
        console.warn('Failed to delete output file:', err.message);
      }
    });
  });
});

app.get('/', (req, res) => {
  res.send('FFmpeg API is running. Use /merge endpoint.');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Merge API listening on port ${PORT}`);
});
