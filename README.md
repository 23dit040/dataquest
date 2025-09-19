# Meeting Platform - MERN Stack

A comprehensive live meeting platform built with the MERN stack, featuring video/audio calls, real-time chat, screen sharing, and more.

## 🚀 Features

### Core Features
- **User Authentication**: Secure signup/login with JWT tokens
- **Meeting Management**: Create, join, and manage meetings
- **Video & Audio**: WebRTC-powered video/audio communication
- **Real-time Chat**: Socket.io-powered messaging
- **Screen Sharing**: Share your screen with participants
- **QR Code Support**: Generate and scan QR codes for easy joining
- **Host Controls**: Meeting management and participant controls

### Technical Features
- **Responsive Design**: Beautiful UI with Tailwind CSS
- **Real-time Updates**: Socket.io for live updates
- **Secure**: JWT authentication and password hashing
- **Scalable**: MongoDB Atlas for cloud database
- **Modern Stack**: React, Node.js, Express, MongoDB

## 📁 Project Structure

```
dataquest/
├── backend/                 # Node.js/Express backend
│   ├── models/             # MongoDB models
│   ├── routes/             # API routes
│   ├── middleware/         # Authentication middleware
│   ├── socket/             # Socket.io handlers
│   ├── .env                # Environment variables
│   ├── package.json        # Backend dependencies
│   └── server.js           # Main server file
│
└── frontend/               # React frontend
    ├── src/
    │   ├── components/     # Reusable components
    │   ├── pages/          # Page components
    │   ├── context/        # React context
    │   ├── services/       # API and socket services
    │   └── index.css       # Tailwind CSS
    ├── .env                # Frontend environment variables
    ├── package.json        # Frontend dependencies
    └── vite.config.js      # Vite configuration
```

## 🛠️ Setup Instructions

### Prerequisites
- Node.js (v20.18.1 or higher)
- MongoDB Atlas account
- npm or yarn package manager

### Backend Setup

1. **Navigate to backend directory**:
   ```bash
   cd backend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   Edit `backend/.env` file:
   ```env
   FRONTEND_URL=http://localhost:5173
   PORT=5000
   MONGODB_URL=your_mongodb_atlas_connection_string_here
   JWT_SECRET=your_super_secure_jwt_secret_key_here
   ```

4. **Start the backend server**:
   ```bash
   npm run dev
   ```
   The backend will run on `http://localhost:5000`

### Frontend Setup

1. **Navigate to frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   Edit `frontend/.env` file:
   ```env
   VITE_BACKEND_URL=http://localhost:5000
   ```

4. **Start the frontend development server**:
   ```bash
   npm run dev
   ```
   The frontend will run on `http://localhost:5173`

### MongoDB Atlas Setup

1. **Create MongoDB Atlas Account**:
   - Go to [MongoDB Atlas](https://cloud.mongodb.com/)
   - Create a free account and cluster

2. **Get Connection String**:
   - In your Atlas dashboard, click "Connect"
   - Choose "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your database password
   - Replace `<dbname>` with your preferred database name

3. **Update Backend .env**:
   ```env
   MONGODB_URL=mongodb+srv://username:password@cluster.mongodb.net/meetingplatform?retryWrites=true&w=majority
   ```

## 🔧 Configuration Details

### Backend Environment Variables
- `FRONTEND_URL`: URL of the frontend application (for CORS)
- `PORT`: Port number for the backend server
- `MONGODB_URL`: MongoDB Atlas connection string
- `JWT_SECRET`: Secret key for JWT token generation (use a long, random string)

### Frontend Environment Variables
- `VITE_BACKEND_URL`: URL of the backend API server

### Database Collections
The application automatically creates two MongoDB collections:

1. **users**: Stores user account information
   ```javascript
   {
     "_id": ObjectId,
     "name": String,
     "email": String,
     "passwordHash": String,
     "createdAt": Date
   }
   ```

2. **meetings**: Stores meeting information and participants
   ```javascript
   {
     "_id": ObjectId,
     "meetingId": String,
     "hostId": ObjectId,
     "title": String,
     "createdAt": Date,
     "expiresAt": Date,
     "participants": Array,
     "settings": Object
   }
   ```

## 🚀 Usage

1. **Start both servers** (backend and frontend)
2. **Open your browser** and go to `http://localhost:5173`
3. **Create an account** or login with existing credentials
4. **Create a meeting** or join an existing one with a meeting ID
5. **Enjoy** video calling, chat, and screen sharing!

## 🎯 Key Features Walkthrough

### Creating a Meeting
1. Click "Create Meeting" on the dashboard
2. Fill in meeting details and settings
3. Get a QR code and meeting ID to share
4. Start the meeting immediately

### Joining a Meeting
1. Click "Join Meeting" on the dashboard
2. Enter the meeting ID or scan a QR code
3. Enter password if required
4. Join the meeting room

### In-Meeting Features
- **Video/Audio Controls**: Toggle camera and microphone
- **Screen Sharing**: Share your screen with participants
- **Chat**: Send real-time messages
- **Participants List**: View and manage participants
- **Host Controls**: Mute participants, end meeting

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt for secure password storage
- **Input Validation**: Server-side validation for all inputs
- **CORS Protection**: Configured for secure cross-origin requests
- **Meeting Passwords**: Optional password protection for meetings

## 🌟 Additional Features Implemented

- **Responsive Design**: Works on desktop, tablet, and mobile
- **Toast Notifications**: User-friendly feedback messages
- **Loading States**: Smooth loading indicators
- **Error Handling**: Comprehensive error handling
- **Auto-cleanup**: Automatic meeting expiry and cleanup
- **Meeting History**: View past and upcoming meetings

## 🚨 Important Notes

1. **MongoDB Atlas**: Make sure to whitelist your IP address in Atlas
2. **JWT Secret**: Use a strong, unique secret for production
3. **HTTPS**: For production, use HTTPS for both frontend and backend
4. **WebRTC**: Some features may require HTTPS in production
5. **Firewall**: Ensure ports 5000 and 5173 are open during development

## 🏗️ Development Commands

### Backend
```bash
npm start          # Start production server
npm run dev        # Start development server with nodemon
```

### Frontend
```bash
npm run dev        # Start development server
npm run build      # Build for production
npm run preview    # Preview production build
```

## 🤝 Contributing

This is a complete meeting platform ready for use. You can extend it with additional features like:
- Recording functionality
- Virtual backgrounds
- Breakout rooms
- Calendar integration
- Mobile app version

---

**Happy Meeting! 🎥✨**