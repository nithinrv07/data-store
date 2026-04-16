require('dotenv').config();

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

// ==================== SECURITY ====================
app.use(helmet());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use('/api/', limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5
});

// ==================== BODY ====================
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// ==================== STATIC ====================
const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

// ==================== HEALTH ====================
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// ==================== AUTH ====================
app.post('/api/login', authLimiter, async (req, res, next) => {
  try {
    const { username, password } = req.body;

    const validationError = validateLogin(req.body);
    if (validationError) {
      return res.status(400).json({ success: false, errors: validationError });
    }

    console.log(`🔐 Login attempt for user: ${username}`);
    const user = await User.findOne({ username, password });

    if (user) {
      const token = generateToken(user._id || user.username, user.username);
      console.log(`✅ Login successful for user: ${username}`);
      res.json({
        success: true,
        token,
        user: { username: user.username }
      });
    } else {
      console.log(`❌ Login failed for user: ${username} (invalid credentials)`);
      res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
  } catch (err) {
    next(err);
  }
});

// ==================== RECORDS ====================
app.post('/api/records', async (req, res, next) => {
  try {
    const validationError = validateRecord(req.body);
    if (validationError) {
      return res.status(400).json({ success: false, errors: validationError });
    }

    const sanitized = sanitizeRecord(req.body);
    const record = await Record.create(sanitized);

    res.status(201).json({ success: true, record });
  } catch (err) {
    next(err);
  }
});

app.get('/api/records', async (req, res, next) => {
  try {
    const { search, sortBy = 'createdAt', order = 'desc' } = req.query;

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

    const sortObj = {};
    sortObj[sortBy] = order === 'asc' ? 1 : -1;

    const records = await Record.find(query).sort(sortObj);

    res.json({ success: true, count: records.length, records });
  } catch (err) {
    next(err);
  }
});

app.get('/api/records/:id', async (req, res, next) => {
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

app.put('/api/records/:id', async (req, res, next) => {
  try {
    const validationError = validateRecord(req.body);
    if (validationError) {
      return res.status(400).json({ success: false, errors: validationError });
    }

    const sanitized = sanitizeRecord(req.body);
    sanitized.updatedAt = new Date();

    const record = await Record.findByIdAndUpdate(
      req.params.id,
      sanitized,
      { new: true }
    );

    if (!record) {
      return res.status(404).json({ success: false, message: 'Record not found' });
    }

    res.json({ success: true, record });
  } catch (err) {
    next(err);
  }
});

app.delete('/api/records/:id', async (req, res, next) => {
  try {
    const record = await Record.findByIdAndDelete(req.params.id);

    if (!record) {
      return res.status(404).json({ success: false, message: 'Record not found' });
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// ==================== EXPORT ====================
app.get('/api/export/excel/:id', async (req, res, next) => {
  try {
    console.log('📥 Excel export request for ID:', req.params.id);
    const record = await Record.findById(req.params.id);
    
    if (!record) {
      console.log('❌ Record not found:', req.params.id);
      return res.status(404).json({ success: false, message: 'Record not found' });
    }

    console.log('✅ Found record, generating Excel:', record.name);
    const workbook = new excel.Workbook();
    const sheet = workbook.addWorksheet('Record Data');

    // Add headers
    sheet.addRow(['Field', 'Value']);
    
    // Add data rows
    sheet.addRow(['Name', record.name]);
    sheet.addRow(['Date of Birth', record.dob]);
    sheet.addRow(['Address', record.address]);
    sheet.addRow(['Email', record.email || '-']);
    sheet.addRow(['Phone', record.phone || '-']);

    // Style headers
    sheet.getRow(1).font = { bold: true };
    sheet.columns = [
      { width: 20 },
      { width: 40 }
    ];

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="record-${record._id}.xlsx"`);
    console.log('✅ Exporting to Excel:', record._id);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('❌ Excel export error:', err.message, err.stack);
    next(err);
  }
});

app.get('/api/export/word/:id', async (req, res, next) => {
  try {
    console.log('📥 Word export request for ID:', req.params.id);
    const record = await Record.findById(req.params.id);
    
    if (!record) {
      console.log('❌ Record not found:', req.params.id);
      return res.status(404).json({ success: false, message: 'Record not found' });
    }

    console.log('✅ Found record, generating Word document:', record.name);
    const doc = new docx.Document({
      sections: [{
        children: [
          new docx.Paragraph({
            text: 'Record Details',
            heading: docx.HeadingLevel.HEADING_1,
            bold: true,
            spacing: { after: 400 }
          }),
          new docx.Paragraph({
            text: `Name: ${record.name}`,
            spacing: { after: 200 }
          }),
          new docx.Paragraph({
            text: `Date of Birth: ${record.dob}`,
            spacing: { after: 200 }
          }),
          new docx.Paragraph({
            text: `Address: ${record.address}`,
            spacing: { after: 200 }
          }),
          new docx.Paragraph({
            text: `Email: ${record.email || 'N/A'}`,
            spacing: { after: 200 }
          }),
          new docx.Paragraph({
            text: `Phone: ${record.phone || 'N/A'}`,
            spacing: { after: 400 }
          })
        ]
      }]
    });

    const buffer = await docx.Packer.toBuffer(doc);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="record-${record._id}.docx"`);
    res.setHeader('Content-Length', buffer.length);
    console.log('✅ Exporting to Word:', record._id, 'Size:', buffer.length);
    res.send(buffer);
  } catch (err) {
    console.error('❌ Word export error:', err.message, err.stack);
    next(err);
  }
});

// ==================== FALLBACK ====================
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ==================== ERROR ====================
app.use(errorHandler);

// ✅ EXPORT FOR VERCEL
module.exports = app;

// 🚀 LOCAL DEVELOPMENT
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`\n✅ Server running at http://localhost:${PORT}`);
    console.log(`🌐 Open in browser: http://localhost:${PORT}`);
    console.log(`📊 API Health: http://localhost:${PORT}/api/health\n`);
  });
}
