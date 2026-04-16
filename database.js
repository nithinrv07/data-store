const mongoose = require('mongoose');

// Attempt to connect to cloud MongoDB via environment variable
const MONGODB_URI = process.env.MONGODB_URI;

let dbConnected = false;

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

// Save original findOne method
const originalUserFindOne = User.findOne.bind(User);

// Override findOne to support fallback when DB is down
User.findOne = async function(query) {
  if (!dbConnected) {
    // Use fallback authentication
    const user = fallbackUsers.find(u => u.username === query.username && u.password === query.password);
    if (user) {
      console.log('✅ User authenticated via fallback:', query.username);
      return { username: user.username, password: user.password, _id: 'fallback-user' };
    }
    console.log('❌ Fallback authentication failed for:', query.username);
    return null;
  }
  return originalUserFindOne(query);
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
