require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const XLSX = require("xlsx");
const multer = require("multer");

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());

// Serve static files (index.html, app.js) from the current directory
app.use(express.static(__dirname));

// --- Login Route ---
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    // Simple check (Accepts admin/admin or any non-empty credentials for demo)
    if (username && password) {
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false });
    }
});

app.get('/api/sheets', (req, res) => {
    const principalId = req.query.principalId;
    if (!principalId) return res.json({ sheets: {} });
    res.json({ sheets: sheetsData[principalId] || {} });
});

app.post('/api/sheets', (req, res) => {
    const { sheets, principalId } = req.body;
    if (sheets && principalId) {
        sheetsData[principalId] = sheets;
        res.json({ success: true });
    } else {
        res.status(400).json({ error: "Missing data" });
    }
});

// --- Helper: Convert Workbook to JSON ---
function workbookToJson(workbook) {
  const out = {};
  workbook.SheetNames.forEach((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    out[sheetName] = XLSX.utils.sheet_to_json(sheet, { defval: "" });
  });
  return out;
}

// --- Upload Route ---
app.post('/api/upload', upload.single('file'), (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "Missing file" });
        
        const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
        const sheets = workbookToJson(workbook);
        
        res.json({ sheets });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Attendance App running at http://localhost:${PORT}`);
});