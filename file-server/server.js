/**
 * File: server.js
 * Description: Handles file uploads and downloads.
 * 
 * Steps before running:
 * 1. Navigate to the file-server folder.
 * 2. Run `npm install` to install dependencies.
 * 3. Create an "uploads" folder inside the file-server folder.
 * 4. Start the server with `npm start` or `node server.js`.
 */

const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Configure Multer storage to save files in "uploads" folder
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function(req, file, cb) {
    // Append a unique suffix to avoid filename conflicts
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });

// POST endpoint for file upload
app.post('/api/files', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).send('No file uploaded.');
  res.json({
    message: 'File uploaded successfully',
    file: req.file
  });
});

// Serve static files from the "uploads" directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// GET endpoint to download a file by its filename
app.get('/api/files/:filename', (req, res) => {
  const filename = req.params.filename;
  const filepath = path.join(__dirname, 'uploads', filename);
  res.sendFile(filepath, function(err) {
    if (err) {
      res.status(404).send('File not found.');
    }
  });
});

// Start the server on port 5000
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`File Server running on port ${PORT}`);
});
