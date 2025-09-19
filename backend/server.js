const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const meetingRoutes = require('./routes/meetings');

// Import socket handlers
const socketHandlers = require('./socket/socketHandlers');

const app = express();
const server = http.createServer(app);

// Configure Socket.io with CORS
const allowedOrigins = [
  'http://localhost:3000',
  'http://192.168.0.114:3000',
  process.env.FRONTEND_URL
].filter(Boolean);

const io = socketIo(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'ngrok-skip-browser-warning']
  }
});

// CORS middleware - MUST be before other middleware

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'ngrok-skip-browser-warning'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

// Additional middleware for handling preflight requests
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    if (allowedOrigins.includes(origin) || !origin) {
      res.header('Access-Control-Allow-Origin', origin || '*');
      res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With, ngrok-skip-browser-warning');
      res.header('Access-Control-Allow-Credentials', 'true');
      return res.sendStatus(200);
    }
  }
  next();
});

app.use(express.json());

// Make io accessible in routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URL)
.then(async () => {
  console.log('Connected to MongoDB Atlas');
  console.log('Database:', mongoose.connection.db.databaseName);
  console.log('Connection state:', mongoose.connection.readyState);
  
  // Test database access
  try {
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Available collections:', collections.map(c => c.name));
    
    // Count documents in collections
    const User = require('./models/User');
    const Meeting = require('./models/Meeting');
    
    const userCount = await User.countDocuments();
    const meetingCount = await Meeting.countDocuments();
    
    console.log(`Users in database: ${userCount}`);
    console.log(`Meetings in database: ${meetingCount}`);
    
  } catch (dbError) {
    console.error('Database access test failed:', dbError);
  }
  
  // One-time cleanup: Drop old username index if it exists
  try {
    const User = require('./models/User');
    await User.collection.dropIndex('username_1');
    console.log('Dropped old username index');
  } catch (error) {
    // Index might not exist, which is fine
    if (error.code !== 27) { // 27 = IndexNotFound
      console.log('Username index cleanup:', error.message);
    }
  }
})
.catch((error) => {
  console.error('MongoDB connection error:', error);
  console.log('Please check your MongoDB connection string and network access');
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/meetings', meetingRoutes);

// Health check route
app.get('/api/health', async (req, res) => {
  // Set CORS headers explicitly for health check
  res.header('Access-Control-Allow-Origin', process.env.FRONTEND_URL || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Content-Type', 'application/json');
  
  try {
    // Test database connection
    const dbState = mongoose.connection.readyState;
    const dbStates = {
      0: 'disconnected',
      1: 'connected', 
      2: 'connecting',
      3: 'disconnecting'
    };

    // Count documents to test DB access
    const User = require('./models/User');
    const Meeting = require('./models/Meeting');
    
    const userCount = await User.countDocuments();
    const meetingCount = await Meeting.countDocuments();

    res.json({ 
      message: 'Meeting Platform Backend is running!',
      database: {
        status: dbStates[dbState],
        connected: dbState === 1,
        users: userCount,
        meetings: meetingCount
      },
      environment: {
        port: process.env.PORT,
        frontendUrl: process.env.FRONTEND_URL,
        nodeEnv: process.env.NODE_ENV || 'development'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      message: 'Backend is running but database error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Socket.io connection handling
socketHandlers(io);

const PORT = process.env.PORT || 5000;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Server accessible at: http://192.168.0.114:${PORT}`);
  console.log(`Frontend URL: ${process.env.FRONTEND_URL}`);
});