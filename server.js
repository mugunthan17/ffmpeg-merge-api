const express = require("express");
const multer = require("multer");
const path = require("path");
const { exec } = require("child_process");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

// Multer storage config to save files with original extensions
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    // Save files with a timestamp + random number + original extension
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, uniqueName);
  },
});

// File filter to accept only PNG, JPG/JPEG, MP3
const fileFilter = (req, file, cb) => {
  const allowedMimes = ["image/png", "image/jpeg", "audio/mpeg", "audio/mp3"];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Unsupported file type: " + file.mimetype));
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 30 * 1024 * 1024 }, // 30 MB limit
  fileFilter,
}).fields([
  { name: "image", maxCount: 1 },
  { name: "audio", maxCount: 1 },
]);

// Ensure upload and output directories exist
const ensureDirExists = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};
ensureDirExists("uploads");
ensureDirExists("outputs");

app.post("/merge", (req, res) => {
  upload(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!req.files || !req.files.image || !req.files.audio) {
      return res
        .status(400)
        .json({ error: "Both image and audio files are required." });
    }

    const imagePath = req.files.image[0].path;
    const audioPath = req.files.audio[0].path;
    const outputFilename = `output-${Date.now()}.mp4`;
    const outputPath = path.join("outputs", outputFilename);

    // FFmpeg command to merge image (looped) and audio into MP4
    // Duration is set to 10 seconds; change -t 10 as needed
    const cmd = `ffmpeg -y -loop 1 -framerate 25 -t 10 -i "${imagePath}" -i "${audioPath}" -c:v libx264 -c:a aac -b:a 192k -shortest -pix_fmt yuv420p "${outputPath}"`;

    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.error("FFmpeg error:", stderr); // Log detailed FFmpeg errors
        return res
          .status(500)
          .json({ error: "Error processing video.", details: stderr });
      }
      res.json({ video: outputPath });
    });
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
