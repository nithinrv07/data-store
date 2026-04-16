const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const excel = require('exceljs');
const docx = require('docx');
const translate = require('@iamtraction/google-translate');
const path = require('path');

const { Record, User } = require('./database');
const { generateToken, verifyToken, authMiddleware, errorHandler } = require('./utils/auth');
const { validateRecord, validateLogin, validateSearchQuery, sanitizeRecord } = require('./utils/validation');

const app = express();
const PORT = process.env.PORT || 3000;

// ==================== SECURITY MIDDLEWARE ====================
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Stricter rate limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 attempts per 15 minutes
  message: 'Too many login attempts, please try again later.'
});

// ==================== BODY PARSER ====================
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Serve static files from public directory
const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

// ==================== HEALTH CHECK ====================
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// ==================== AUTHENTICATION ENDPOINTS ====================

/**
 * POST /api/login
 * Login with username and password
 * Returns JWT token if successful
 */
app.post('/api/login', authLimiter, async (req, res, next) => {
  try {
    const { username, password } = req.body;
    
    console.log('🔐 Login attempt:', { username, hasPassword: !!password });
    
    // Validate input
    const validationError = validateLogin(req.body);
    if (validationError) {
      console.log('❌ Validation failed:', validationError);
      return res.status(400).json({ success: false, errors: validationError });
    }

    const user = await User.findOne({ username, password });
    console.log('👤 User lookup result:', !!user);
    
    if (user) {
      const token = generateToken(user._id || user.username, user.username);
      console.log('✅ Login successful for:', username);
      res.json({ 
        success: true, 
        message: 'Logged in successfully',
        token: token,
        user: { username: user.username }
      });
    } else {
      console.log('❌ Invalid credentials for:', username);
      res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
  } catch (err) {
    next(err);
  }
});

// ==================== RECORD ENDPOINTS ====================

/**
 * POST /api/records
 * Create a new record
 * Requires: authentication token
 */
app.post('/api/records', authMiddleware, async (req, res, next) => {
  try {
    // Validate record data
    const validationError = validateRecord(req.body);
    if (validationError) {
      return res.status(400).json({ success: false, errors: validationError });
    }

    // Sanitize data
    const sanitized = sanitizeRecord(req.body);

    const record = await Record.create(sanitized);
    res.status(201).json({ success: true, record });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/records
 * Get all records with optional search/filter
 * Query params: search (searches name, email, phone)
 */
app.get('/api/records', authMiddleware, async (req, res, next) => {
  try {
    const { search, sortBy = 'createdAt', order = 'desc' } = req.query;

    // Validate search query
    if (search) {
      const searchError = validateSearchQuery(search);
      if (searchError) {
        return res.status(400).json({ success: false, message: searchError });
      }
    }

    // Build query
    let query = {};
    if (search) {
      query = {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } }
        ]
      };
    }

    // Build sort
    const sortObj = {};
    sortObj[sortBy] = order === 'asc' ? 1 : -1;

    const records = await Record.find(query).sort(sortObj);
    res.json({ success: true, count: records.length, records });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/records/:id
 * Get a specific record by ID
 */
app.get('/api/records/:id', authMiddleware, async (req, res, next) => {
  try {
    const record = await Record.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Record not found' });
    }
    res.json({ success: true, record });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/records/:id
 * Update a specific record
 */
app.put('/api/records/:id', authMiddleware, async (req, res, next) => {
  try {
    // Validate record data
    const validationError = validateRecord(req.body);
    if (validationError) {
      return res.status(400).json({ success: false, errors: validationError });
    }

    // Sanitize data
    const sanitized = sanitizeRecord(req.body);
    sanitized.updatedAt = new Date();

    const record = await Record.findByIdAndUpdate(
      req.params.id,
      sanitized,
      { new: true, runValidators: true }
    );

    if (!record) {
      return res.status(404).json({ success: false, message: 'Record not found' });
    }

    console.log('✅ Record updated:', req.params.id);
    res.json({ success: true, message: 'Record updated successfully', record });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/records/:id
 * Delete a specific record
 */
app.delete('/api/records/:id', authMiddleware, async (req, res, next) => {
  try {
    const record = await Record.findByIdAndDelete(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Record not found' });
    }
    console.log('✅ Record deleted:', req.params.id);
    res.json({ success: true, message: 'Record deleted successfully' });
  } catch (err) {
    next(err);
  }
});

// ==================== EXPORT ENDPOINTS ====================

/**
 * GET /api/export/excel/:id
 * Export record to Excel (English)
 */
app.get('/api/export/excel/:id', authMiddleware, async (req, res, next) => {
  try {
    const record = await Record.findById(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Record not found' });

    const workbook = new excel.Workbook();
    const worksheet = workbook.addWorksheet('Record Details');

    worksheet.columns = [
      { header: 'Field', key: 'field', width: 20 },
      { header: 'Value', key: 'value', width: 40 }
    ];

    ['name', 'dob', 'address', 'email', 'phone'].forEach(field => {
        if(record[field]) worksheet.addRow({ field: field.toUpperCase(), value: record[field] });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="record-${record.name}.xlsx"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/export/word/:id
 * Export record to Word (Tamil Translation)
 */
app.get('/api/export/word/:id', authMiddleware, async (req, res, next) => {
  try {
    const record = await Record.findById(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Record not found' });

    // Helper to translate to Tamil
    const toTamil = async (text) => {
      try {
        if (!text) return '';
        const response = await translate(text, { to: 'ta' });
        return response.text;
      } catch (e) {
        console.error("Translation fail:", e);
        return text; // fallback to english if translation fails
      }
    };

    const dName = await toTamil(record.name);
    const dDob = await toTamil(record.dob);
    const dAddress = await toTamil(record.address);
    const dEmail = record.email ? await toTamil(record.email) : '';
    const dPhone = record.phone ? await toTamil(record.phone) : '';

    const { Document, Packer, Paragraph, TextRun } = docx;

    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            children: [
              new TextRun({ text: "பெயர் (Name): ", bold: true, font: "Noto Sans Tamil" }),
              new TextRun({ text: dName, font: "Noto Sans Tamil" }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "பிறந்த தேதி (DOB): ", bold: true, font: "Noto Sans Tamil" }),
              new TextRun({ text: dDob, font: "Noto Sans Tamil" }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "முகவரி (Address): ", bold: true, font: "Noto Sans Tamil" }),
              new TextRun({ text: dAddress, font: "Noto Sans Tamil" }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "மின்னஞ்சல் (Email): ", bold: true, font: "Noto Sans Tamil" }),
              new TextRun({ text: dEmail, font: "Noto Sans Tamil" }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "தொலைபேசி (Phone): ", bold: true, font: "Noto Sans Tamil" }),
              new TextRun({ text: dPhone, font: "Noto Sans Tamil" }),
            ],
          }),
        ],
      }],
    });

    const buffer = await Packer.toBuffer(doc);
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="record-tamil-${record.name}.docx"`);
    res.send(buffer);

  } catch (err) {
    next(err);
  }
});

// ==================== SPA FALLBACK ====================
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ==================== ERROR HANDLER ====================
app.use(errorHandler);

// ==================== START SERVER ====================
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
  console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`💡 Access from other devices using your computer's IP address (e.g., http://YOUR_IP:${PORT})`);
});

server.on('error', (err) => {
  console.error('❌ Server error:', err);
  process.exit(1);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});
