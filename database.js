const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Attempt to connect to cloud MongoDB via environment variable
const MONGODB_URI = process.env.MONGODB_URI;

let dbConnected = false;

// Fallback storage file
const FALLBACK_DATA_FILE = path.join(__dirname, 'fallback_data.json');

// Load fallback data from file
const loadFallbackData = () => {
  try {
    if (fs.existsSync(FALLBACK_DATA_FILE)) {
      const data = fs.readFileSync(FALLBACK_DATA_FILE, 'utf8');
      const parsed = JSON.parse(data);
      console.log('✅ Loaded fallback data from file:', parsed.records.length, 'records');
      return parsed;
    } else {
      console.log('📄 Fallback data file does not exist yet');
    }
  } catch (err) {
    console.error('❌ Error loading fallback data:', err.message);
  }
  return { records: [] };
};

// Save fallback data to file
const saveFallbackData = (data) => {
  try {
    fs.writeFileSync(FALLBACK_DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
    console.log('💾 Saved fallback data to file:', FALLBACK_DATA_FILE, 'Records:', data.records.length);
  } catch (err) {
    console.error('❌ Error saving fallback data:', err.message);
  }
};

const connectDB = async () => {
  if (!MONGODB_URI) {
    console.warn('⚠️  MONGODB_URI not set. Using fallback authentication.');
    return;
  }
  
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('✅ Connected to MongoDB');
    dbConnected = true;
    await seedUser();
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    console.warn('⚠️  Using fallback authentication - data will not persist.');
  }
};

// Schema for Records with validation
const recordSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [100, 'Name must be less than 100 characters']
  },
  dob: { 
    type: String, 
    required: [true, 'Date of Birth is required'],
    trim: true
  },
  address: { 
    type: String, 
    required: [true, 'Address is required'],
    trim: true,
    minlength: [5, 'Address must be at least 5 characters'],
    maxlength: [500, 'Address must be less than 500 characters']
  },
  email: { 
    type: String,
    trim: true,
    lowercase: true,
    sparse: true, // Allow null values while maintaining uniqueness for non-null values
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Invalid email format']
  },
  phone: { 
    type: String,
    trim: true,
    sparse: true
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
}, { timestamps: true });

// Schema for simple users (for login Auth)
const userSchema = new mongoose.Schema({
  username: { 
    type: String, 
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters']
  },
  password: { 
    type: String, 
    required: [true, 'Password is required'],
    minlength: [4, 'Password must be at least 4 characters']
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

const Record = mongoose.model('Record', recordSchema);
const User = mongoose.model('User', userSchema);

// Fallback authentication (for when DB is not available)
const fallbackUsers = [
  { username: 'abinaya', password: 'abinaya@29' }
];

// Fallback storage for records (when DB is not available)
const fallbackData = loadFallbackData();
let fallbackRecords = fallbackData.records;

console.log('📊 Initializing fallback records:', fallbackRecords.length, 'records loaded');

// Function to refresh fallback records from file
const refreshFallbackRecords = () => {
  const freshData = loadFallbackData();
  fallbackRecords = freshData.records;
  return fallbackRecords;
};

// Query builder for chaining (mimics Mongoose Query)
class QueryBuilder {
  constructor(results) {
    this._results = results;
  }
  
  sort(sortObj) {
    const [sortKey, sortOrder] = Object.entries(sortObj)[0];
    this._results.sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal < bVal) return sortOrder === 1 ? -1 : 1;
      if (aVal > bVal) return sortOrder === 1 ? 1 : -1;
      return 0;
    });
    return this._results;
  }
}

// Save original methods
const originalUserFindOne = User.findOne.bind(User);
const originalRecordCreate = Record.create.bind(Record);
const originalRecordFind = Record.find.bind(Record);
const originalRecordFindById = Record.findById.bind(Record);
const originalRecordFindByIdAndUpdate = Record.findByIdAndUpdate.bind(Record);
const originalRecordFindByIdAndDelete = Record.findByIdAndDelete.bind(Record);

// Override findOne to support fallback when DB is down
User.findOne = async function(query) {
  console.log('🔍 User.findOne called with query:', query);
  console.log('📊 DB Connected?:', dbConnected);
  
  if (!dbConnected) {
    console.log('🔄 Using fallback authentication...');
    console.log('Available fallback users:', fallbackUsers.map(u => u.username));
    
    const user = fallbackUsers.find(u => {
      const match = u.username === query.username && u.password === query.password;
      console.log(`  Checking ${u.username}: ${match ? '✅ MATCH' : '❌ NO MATCH'}`);
      return match;
    });
    
    if (user) {
      console.log('✅ User authenticated via fallback:', query.username);
      return { username: user.username, password: user.password, _id: 'fallback-user' };
    }
    console.log('❌ Fallback authentication failed for:', query.username);
    return null;
  }
  
  console.log('🗄️  Using MongoDB for authentication');
  return originalUserFindOne(query);
};

// Override Record.create to support fallback
Record.create = async function(data) {
  if (!dbConnected) {
    console.log('🔄 Using fallback storage for record creation... refreshing data');
    const records = refreshFallbackRecords();
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const record = {
      _id: id,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    records.push(record);
    fallbackRecords = records; // Update global reference
    saveFallbackData({ records });
    console.log('✅ Record saved to fallback storage:', id);
    return record;
  }
  return originalRecordCreate(data);
};

// Override Record.find to support fallback
Record.find = function(query = {}) {
  if (!dbConnected) {
    console.log('🔄 Using fallback storage for record find... refreshing data');
    const records = refreshFallbackRecords();
    console.log('📊 Total records available:', records.length);
    let results = [...records];
    
    if (query.$or) {
      results = records.filter(record => {
        return query.$or.some(condition => {
          if (condition.name && condition.name.$regex) {
            const regex = new RegExp(condition.name.$regex, condition.name.$options || '');
            return regex.test(record.name);
          }
          if (condition.email && condition.email.$regex) {
            const regex = new RegExp(condition.email.$regex, condition.email.$options || '');
            return regex.test(record.email || '');
          }
          if (condition.phone && condition.phone.$regex) {
            const regex = new RegExp(condition.phone.$regex, condition.phone.$options || '');
            return regex.test(record.phone || '');
          }
          return false;
        });
      });
    }
    
    console.log('✅ Found', results.length, 'records');
    return new QueryBuilder(results);
  }
  
  return originalRecordFind(query);
};

// Override Record.findById to support fallback
Record.findById = async function(id) {
  if (!dbConnected) {
    console.log('🔍 Using fallback storage for record findById... refreshing data');
    const records = refreshFallbackRecords();
    console.log('   Looking for ID:', id);
    console.log('   Available IDs:', records.map(r => r._id));
    const found = records.find(r => r._id === id);
    if (found) {
      console.log('   ✅ Found record:', found.name);
    } else {
      console.log('   ❌ Record not found');
    }
    return found || null;
  }
  return originalRecordFindById(id);
};

// Override Record.findByIdAndUpdate to support fallback
Record.findByIdAndUpdate = async function(id, data, options = {}) {
  if (!dbConnected) {
    console.log('🔄 Using fallback storage for record update... refreshing data');
    const records = refreshFallbackRecords();
    const index = records.findIndex(r => r._id === id);
    if (index === -1) {
      console.log('❌ Record not found for update:', id);
      return null;
    }
    records[index] = {
      ...records[index],
      ...data,
      updatedAt: new Date()
    };
    fallbackRecords = records; // Update global reference
    saveFallbackData({ records });
    console.log('✅ Record updated:', id);
    if (options.new) {
      return records[index];
    }
    return records[index];
  }
  return originalRecordFindByIdAndUpdate(id, data, options);
};

// Override Record.findByIdAndDelete to support fallback
Record.findByIdAndDelete = async function(id) {
  if (!dbConnected) {
    console.log('🔄 Using fallback storage for record delete... refreshing data');
    const records = refreshFallbackRecords();
    const index = records.findIndex(r => r._id === id);
    if (index === -1) {
      console.log('❌ Record not found for delete:', id);
      return null;
    }
    const deleted = records.splice(index, 1);
    fallbackRecords = records; // Update global reference
    saveFallbackData({ records });
    console.log('✅ Record deleted:', id);
    return deleted[0];
  }
  return originalRecordFindByIdAndDelete(id);
};

// Seed a default admin user if it doesn't exist
const seedUser = async () => {
  if (!dbConnected) return; // Skip if DB not connected
  
  try {
    console.log('🔄 Checking for default admin user...');
    const admin = await originalUserFindOne({ username: 'admin' });
    if (!admin) {
      await User.create({ username: 'admin', password: 'password123' });
      console.log('✅ Seeded default admin user: admin / password123');
    } else {
      console.log('✅ Admin user already exists');
    }
  } catch(e) {
    console.error('Failed to seed user:', e.message);
  }
};

connectDB();

module.exports = { Record, User };
