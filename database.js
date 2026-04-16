const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Attempt to connect to cloud MongoDB via environment variable
const MONGODB_URI = process.env.MONGODB_URI;

let dbConnected = false;

// Fallback storage file
const FALLBACK_DATA_FILE = path.join(__dirname, 'fallback_data.json');
console.log('📄 Fallback data file path:', FALLBACK_DATA_FILE);

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
    console.log('💾 Attempting to save fallback data...');
    console.log('   File path:', FALLBACK_DATA_FILE);
    console.log('   Records to save:', data.records.length);
    fs.writeFileSync(FALLBACK_DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
    console.log('✅ Successfully saved fallback data to:', FALLBACK_DATA_FILE);
    console.log('   Total records saved:', data.records.length);
  } catch (err) {
    console.error('❌ Error saving fallback data:', err.message);
    console.error('   Stack:', err.stack);
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
  procNo: { 
    type: String, 
    required: [true, 'Proc. No. is required'],
    trim: true
  },
  hosUpdatedPer: { 
    type: Number,
    trim: true
  },
  hosUpdatedTerm: { 
    type: Number,
    trim: true
  },
  hosUpdatedTotal: { 
    type: Number,
    trim: true
  },
  sanctionedPostPer: { 
    type: Number,
    trim: true
  },
  sanctionedPostTerm: { 
    type: Number,
    trim: true
  },
  sanctionedPostTotal: { 
    type: Number,
    trim: true
  },
  filled: { 
    type: Number,
    trim: true
  },
  vacant: { 
    type: Number,
    trim: true
  },
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
  option: { 
    type: String,
    trim: true
  },
  modeOfAppointment: { 
    type: String,
    trim: true
  },
  year: { 
    type: Number,
    trim: true
  },
  rank: { 
    type: String,
    trim: true
  },
  designation: { 
    type: String,
    trim: true
  },
  nativeDistrict: { 
    type: String,
    trim: true
  },
  nativeTaluk: { 
    type: String,
    trim: true
  },
  gender: { 
    type: String,
    trim: true,
    enum: ['Male', 'Female', 'Other', '']
  },
  section: { 
    type: String,
    trim: true
  },
  dateOfJoining: { 
    type: String,
    trim: true
  },
  subDivision: { 
    type: String,
    trim: true
  },
  division: { 
    type: String,
    trim: true
  },
  circle: { 
    type: String,
    trim: true
  },
  region: { 
    type: String,
    trim: true
  },
  remarks: { 
    type: String,
    trim: true,
    maxlength: [1000, 'Remarks must be less than 1000 characters']
  },
  email: { 
    type: String,
    trim: true,
    lowercase: true,
    sparse: true,
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
let fallbackRecords = [...fallbackData.records]; // Create a copy to maintain in memory

console.log('📊 Initializing fallback records:', fallbackRecords.length, 'records loaded');

// Function to get current fallback records (always fresh from in-memory cache)
const getFallbackRecords = () => {
  console.log('📖 Getting fallback records from cache. Current count:', fallbackRecords.length);
  return [...fallbackRecords]; // Return a copy
};

// Function to update fallback records both in-memory and in file
const updateFallbackRecords = (newRecords) => {
  console.log('💾 Updating fallback records. New count:', newRecords.length);
  fallbackRecords = [...newRecords]; // Update in-memory cache
  saveFallbackData({ records: [...newRecords] }); // Save to file
};

// Function to refresh fallback records from file
const refreshFallbackRecords = () => {
  try {
    console.log('🔄 Refreshing fallback records from file');
    const freshData = loadFallbackData();
    fallbackRecords = [...freshData.records]; // Update in-memory cache
    console.log('✅ Refreshed from file:', fallbackRecords.length, 'records');
    return fallbackRecords;
  } catch (err) {
    console.error('❌ Error refreshing fallback records:', err);
    return fallbackRecords; // Return last known state
  }
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
    console.log('🔄 Using fallback storage for record creation');
    const records = getFallbackRecords();
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const record = {
      _id: id,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    console.log('📝 New record object:', JSON.stringify({
      _id: record._id,
      name: record.name,
      dob: record.dob
    }));
    
    records.push(record);
    console.log('📦 Records array now has', records.length, 'items');
    
    // Update both in-memory and file
    updateFallbackRecords(records);
    console.log('✅ Record saved to fallback storage:', id);
    return record;
  }
  return originalRecordCreate(data);
};

// Override Record.find to support fallback
Record.find = function(query = {}) {
  if (!dbConnected) {
    console.log('🔄 Using fallback storage for record find');
    const records = getFallbackRecords();
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
    console.log('🔍 Using fallback storage for record findById');
    const records = getFallbackRecords();
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
    console.log('🔄 Using fallback storage for record update');
    const records = getFallbackRecords();
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
    console.log('🔄 Using fallback storage for record delete');
    const records = getFallbackRecords();
    const index = records.findIndex(r => r._id === id);
    if (index === -1) {
      console.log('❌ Record not found for delete:', id);
      return null;
    }
    const deleted = records.splice(index, 1);
    updateFallbackRecords(records);
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
