# Abinaya Project - Data Flow App

A full-stack web application for managing and storing records with features like login, data entry, search, and export functionality (Excel & Word with Tamil translations).

## 🚀 Features

- **User Authentication**: Simple login system with admin credentials
- **Record Management**: Create, read, and search records
- **Search Functionality**: Search by name, email, or phone
- **Export Options**:
  - Excel export (English)
  - Word export with Tamil translations
- **White Theme UI**: Clean, modern white interface with blue accents
- **MongoDB Integration**: Persistent data storage
- **Responsive Design**: Mobile-friendly interface

## 📋 Prerequisites

- Node.js (v14+)
- MongoDB (local or cloud)
- npm or yarn

## 🔧 Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd abinaya-project
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file (use `.env.example` as reference):
```
MONGODB_URI=mongodb://127.0.0.1:27017/abinaya_project
PORT=3000
NODE_ENV=development
```

For MongoDB Atlas:
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/abinaya_project
```

4. Start the server:
```bash
npm start
```

5. Open a browser and navigate to `http://localhost:3000`

## 🔐 Default Credentials

**Without MongoDB (Fallback Authentication)**:
- **Username**: `abinaya`
- **Password**: `abinaya@29`

**With MongoDB (Default Admin)**:
- **Username**: `admin`
- **Password**: `password123`

⚠️ **Note**: The app works WITHOUT MongoDB using fallback authentication. If MongoDB is not configured, the app automatically uses the fallback credentials above.

## 📦 Deployment to Vercel

### Prerequisites
- Vercel account (free at vercel.com)
- GitHub account with repository
- MongoDB Atlas account (for cloud database)

### Steps

1. **Prepare MongoDB Atlas**:
   - Go to https://www.mongodb.com/cloud/atlas
   - Create a free cluster
   - Get your connection string
   - Whitelist your IP address

2. **Push to GitHub**:
```bash
git add .
git commit -m "Ready for Vercel deployment"
git push origin main
```

3. **Deploy on Vercel**:
   - Go to https://vercel.com
   - Click "New Project"
   - Import from GitHub
   - Select this repository
   - Add environment variables:
     - `MONGODB_URI`: Your MongoDB Atlas connection string
     - `NODE_ENV`: `production`
   - Click "Deploy"

4. **After Deployment**:
   - Your app will be live at: `https://your-project-name.vercel.app`
   - Check logs for any errors: `vercel logs`

## 📁 Project Structure

```
abinaya-project/
├── server.js              # Express server
├── database.js            # MongoDB schemas & connection
├── package.json           # Dependencies
├── vercel.json           # Vercel configuration
├── .env.example          # Environment variables template
├── .gitignore            # Git ignore rules
└── public/
    ├── index.html        # Main HTML
    ├── app.js            # Frontend JavaScript
    └── style.css         # Styling (White theme)
```

## 🔌 API Endpoints

### Authentication
- `POST /api/login` - User login

### Records
- `GET /api/records` - Get all records
- `POST /api/records` - Create new record
- `GET /api/health` - Health check endpoint

### Export
- `GET /api/export/excel/:id` - Export record to Excel
- `GET /api/export/word/:id` - Export record to Word (Tamil)

## 🎨 Technology Stack

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Node.js, Express.js
- **Database**: MongoDB
- **Libraries**:
  - exceljs - Excel file generation
  - docx - Word document generation
  - @iamtraction/google-translate - Tamil translation
  - cors - Cross-origin support
  - mongoose - MongoDB ODM

## ⚡ Performance Tips

1. Optimize MongoDB queries with indexes
2. Use connection pooling for database
3. Enable gzip compression on Vercel
4. Minify CSS and JavaScript for production

## 🐛 Troubleshooting

### Login Fails on Deployed App (Vercel)

**Issue**: You can login locally but get "Invalid credentials" on Vercel.

**Solution**:
1. **Option A - Use Fallback Auth (No MongoDB needed)**:
   - Use credentials: `abinaya / abinaya@29`
   - Works without any environment variables
   - Good for testing

2. **Option B - Configure MongoDB on Vercel**:
   - Create free MongoDB cluster at https://www.mongodb.com/cloud/atlas
   - Get connection string from MongoDB
   - Add `MONGODB_URI` environment variable in Vercel dashboard:
     - Project Settings → Environment Variables
     - Add `MONGODB_URI=mongodb+srv://...`
   - Redeploy the app
   - Use credentials: `admin / password123`

### MongoDB Connection Issues
- Verify connection string in `.env`
- Check IP whitelist in MongoDB Atlas
- Ensure database is running (if local)

### Login Not Working
- Check browser console for errors (F12)
- Verify credentials: `admin / password123`
- Check server logs: `vercel logs`

### Export Not Working
- Ensure record ID is valid
- Check if translation service is responding
- Verify sufficient permissions

## 📞 Support

For issues or questions, check the implementation plan or contact support.

## 📝 License

ISC
