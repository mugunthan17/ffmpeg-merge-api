const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { exec } = require('child_process');

// Create required directories if they don't exist
const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

ensureDir('uploads');
ensureDir('outputs');

// Input URLs (replace with your actual links)
const imageUrl = 'https://example.com/image.png';
const audioUrl = 'https://example.com/audio.mp3';

// Filenames
const imageName = '07cbe355fd7ed9c99b94eeb898f57764.png';
const audioName = 'c060e43d7962782820b0eaacc964c63d.mp3';
const outputName = `output-${Date.now()}.mp4`;

// Paths
const imagePath = path.resolve(__dirname, 'uploads', imageName);
const audioPath = path.resolve(__dirname, 'uploads', audioName);
const outputPath = path.resolve(__dirname, 'outputs', outputName);

// Download a file from URL
async function downloadFile(url, filePath) {
  const response = await axios.get(url, { responseType: 'arraybuffer' });
  fs.writeFileSync(filePath, response.data);
  console.log(`Downloaded: ${filePath}`);
}

// Main function
async function createVideo() {
  try {
    // Download image and audio
    await downloadFile(imageUrl, imagePath);
    await downloadFile(audioUrl, audioPath);

    // Check existence
    if (!fs.existsSync(imagePath)) throw new Error('Image file missing');
    if (!fs.existsSync(audioPath)) throw new Error('Audio file missing');

    // Build ffmpeg command
    const cmd = `ffmpeg -y -loop 1 -framerate 25 -t 10 -i "${imagePath}" -i "${audioPath}" -c:v libx264 -c:a aac -b:a 192k -shortest -pix_fmt yuv420p "${outputPath}"`;

    // Run ffmpeg
    exec(cmd, (err, stdout, stderr) => {
      if (err) {
        console.error('FFmpeg error:', stderr);
        return;
      }
      console.log('Video created at:', outputPath);
    });

  } catch (error) {
    console.error('Error:', error.message);
  }
}

createVideo();
