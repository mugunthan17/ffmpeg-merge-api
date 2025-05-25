const express = require('express');
const multer = require('multer');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const upload = multer({
    dest: 'uploads/',
    limits: { fieldSize: 50 * 1024 * 1024 } // 50MB
  });
const app = express();

app.post('/merge', upload.fields([{ name: 'image', maxCount: 1 }, { name: 'audio', maxCount: 1 }]), (req, res) => {
  if (!req.files || !req.files.image || !req.files.audio) {
    return res.status(400).send('Please upload both image and audio files');
  }

  const imagePath = req.files.image[0].path;
  const audioPath = req.files.audio[0].path;
  const outputFilename = `output-${Date.now()}.mp4`;
  const outputPath = path.join(__dirname, 'outputs', outputFilename);

  // Ensure outputs folder exists
  if (!fs.existsSync(path.join(__dirname, 'outputs'))) {
    fs.mkdirSync(path.join(__dirname, 'outputs'));
  }

  // FFmpeg command to merge image + audio
  const cmd = `ffmpeg -y -loop 1 -i ${imagePath} -i ${audioPath} -c:v libx264 -c:a aac -b:a 192k -shortest -pix_fmt yuv420p ${outputPath}`;

  exec(cmd, (error, stdout, stderr) => {
    // Delete uploaded files after processing
    fs.unlinkSync(imagePath);
    fs.unlinkSync(audioPath);

    if (error) {
      console.error('FFmpeg error:', error.message);
      return res.status(500).send('Error processing video');
    }

    res.download(outputPath, outputFilename, (err) => {
      if (err) {
        console.error('Download error:', err);
      }
      // Delete output after sending
      fs.unlinkSync(outputPath);
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
