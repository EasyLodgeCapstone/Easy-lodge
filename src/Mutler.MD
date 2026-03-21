const express = require('express');
const multerConfig = require('./config/multerConfig');
const path = require('path');

const app = express();

// Serve static files
app.use('/uploads', express.static(path.join(\_\_dirname, 'uploads')));

// Route with validation
app.post('/upload-profile', (req, res) => {
const upload = multerConfig.uploadSingle('profileImage');

upload(req, res, (err) => {
if (err) return multerConfig.handleMulterError(err, req, res);

    // Custom validation
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    res.json({
      success: true,
      message: 'File uploaded successfully',
      file: multerConfig.formatFileResponse(req.file, req)
    });

});
});

// Route with automatic validation middleware
app.post('/upload-document', (req, res) => {
const upload = multerConfig.uploadSingle('document');

upload(req, res, async (err) => {
if (err) return multerConfig.handleMulterError(err, req, res);

    // File is automatically saved to documents folder
    res.json({
      success: true,
      file: multerConfig.formatFileResponse(req.file, req)
    });

});
});

// Multiple files upload
app.post('/upload-gallery', (req, res) => {
const upload = multerConfig.uploadArray('gallery', 10);

upload(req, res, (err) => {
if (err) return multerConfig.handleMulterError(err, req, res);

    const files = req.files.map(file => multerConfig.formatFileResponse(file, req));

    res.json({
      success: true,
      message: `${files.length} files uploaded`,
      files
    });

});
});

// Periodic cleanup (optional - run this in a cron job)
// setInterval(() => {
// multerConfig.cleanupTempFiles(24); // Clean files older than 24 hours
// }, 60 _ 60 _ 1000); // Run every hour

app.listen(3000, () => console.log('Server running on port 3000'));
