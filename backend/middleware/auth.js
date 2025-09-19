const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authenticateToken = async (req, res, next) => {
  try {
    console.log('Auth middleware - Headers:', req.headers.authorization ? 'Token present' : 'No token');
    console.log('Auth middleware - Origin:', req.headers.origin);
    console.log('Auth middleware - Host:', req.headers.host);
    
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      console.log('Auth middleware - No token provided');
      return res.status(401).json({ 
        success: false, 
        message: 'Access token required' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Auth middleware - Token decoded for user:', decoded.userId);
    
    const user = await User.findById(decoded.userId);

    if (!user) {
      console.log('Auth middleware - User not found for ID:', decoded.userId);
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token - user not found' 
      });
    }

    console.log('Auth middleware - User authenticated:', user.name);
    req.user = user;
    next();
  } catch (error) {
    console.log('Auth middleware - Error:', error.message);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token' 
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token expired' 
      });
    }
    
    console.error('Auth middleware error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

module.exports = authenticateToken;