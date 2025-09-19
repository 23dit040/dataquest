const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Meeting = require('../models/Meeting');

const socketHandlers = (io) => {
  // Middleware to authenticate socket connections (optional for guests)
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (token) {
        // If token provided, authenticate
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);
        
        if (user) {
          socket.userId = user._id.toString();
          socket.userName = user.name;
          socket.isAuthenticated = true;
        } else {
          socket.isAuthenticated = false;
          socket.userName = 'Guest';
        }
      } else {
        // Allow guest access
        socket.isAuthenticated = false;
        socket.userName = 'Guest';
        socket.userId = null;
      }
      
      next();
    } catch (error) {
      // If auth fails, allow as guest
      socket.isAuthenticated = false;
      socket.userName = 'Guest';
      socket.userId = null;
      next();
    }
  });

  io.on('connection', (socket) => {
    console.log(`User ${socket.userName} connected: ${socket.id}`);

    // Join meeting room
    socket.on('join-meeting', async (data) => {
      try {
        const { meetingId } = data;
        
        const meeting = await Meeting.findOne({ 
          meetingId: meetingId.toUpperCase(),
          isActive: true 
        });

        if (!meeting) {
          socket.emit('error', { message: 'Meeting not found' });
          return;
        }

        // For authenticated users, check if they're participants
        // For guests, allow direct join
        if (socket.isAuthenticated) {
          const isParticipant = meeting.participants.some(
            p => p.userId && p.userId.toString() === socket.userId
          );

          if (!isParticipant) {
            // Auto-add authenticated user as participant
            meeting.participants.push({
              userId: socket.userId,
              name: socket.userName,
              joinedAt: new Date(),
              isHost: false,
              isMuted: false,
              isVideoOn: true,
              socketId: socket.id
            });
            await meeting.save();
          }
        }

        // Join the meeting room
        socket.join(meetingId);
        socket.currentMeeting = meetingId;

        // Notify others in the room
        socket.to(meetingId).emit('user-connected', {
          userId: socket.userId || `guest-${socket.id}`,
          userName: socket.userName,
          socketId: socket.id,
          isGuest: !socket.isAuthenticated
        });

        // Send current participants to the new user
        const participants = meeting.participants.map(p => ({
          userId: p.userId,
          name: p.name,
          isMuted: p.isMuted,
          isVideoOn: p.isVideoOn,
          isHost: p.isHost
        }));

        socket.emit('meeting-joined', {
          meetingId,
          participants,
          isHost: meeting.isUserHost(socket.userId)
        });

        console.log(`User ${socket.userName} joined meeting ${meetingId}`);
      } catch (error) {
        console.error('Join meeting error:', error);
        socket.emit('error', { message: 'Failed to join meeting' });
      }
    });

    // Handle WebRTC signaling
    socket.on('webrtc-offer', (data) => {
      const { targetUserId, offer, meetingId } = data;
      console.log(`WebRTC offer from ${socket.userId} to ${targetUserId}`);
      socket.to(meetingId).emit('webrtc-offer', {
        fromUserId: socket.userId || `guest-${socket.id}`,
        fromUserName: socket.userName,
        offer
      });
    });

    socket.on('webrtc-answer', (data) => {
      const { targetUserId, answer, meetingId } = data;
      console.log(`WebRTC answer from ${socket.userId} to ${targetUserId}`);
      socket.to(meetingId).emit('webrtc-answer', {
        fromUserId: socket.userId || `guest-${socket.id}`,
        answer
      });
    });

    socket.on('webrtc-ice-candidate', (data) => {
      const { targetUserId, candidate, meetingId } = data;
      console.log(`ICE candidate from ${socket.userId} to ${targetUserId}`);
      socket.to(meetingId).emit('webrtc-ice-candidate', {
        fromUserId: socket.userId || `guest-${socket.id}`,
        candidate
      });
    });

    // Handle chat messages
    socket.on('send-message', async (data) => {
      try {
        const { meetingId, message, type = 'text' } = data;

        if (!socket.currentMeeting || socket.currentMeeting !== meetingId) {
          socket.emit('error', { message: 'Not in this meeting' });
          return;
        }

        const chatMessage = {
          id: Date.now().toString(),
          userId: socket.userId,
          userName: socket.userName,
          message: message.trim(),
          type,
          timestamp: new Date(),
        };

        // Broadcast message to all participants in the meeting
        io.to(meetingId).emit('new-message', chatMessage);

        console.log(`Message from ${socket.userName} in ${meetingId}: ${message}`);
      } catch (error) {
        console.error('Send message error:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle participant status updates
    socket.on('update-participant-status', async (data) => {
      try {
        const { meetingId, isMuted, isVideoOn } = data;
        
        if (!socket.currentMeeting || socket.currentMeeting !== meetingId) {
          socket.emit('error', { message: 'Not in this meeting' });
          return;
        }

        const meeting = await Meeting.findOne({ 
          meetingId: meetingId.toUpperCase(),
          isActive: true 
        });

        if (meeting) {
          const participant = meeting.updateParticipant(socket.userId, {
            isMuted: isMuted !== undefined ? isMuted : undefined,
            isVideoOn: isVideoOn !== undefined ? isVideoOn : undefined
          });

          if (participant) {
            await meeting.save();

            // Broadcast status update to all participants
            io.to(meetingId).emit('participant-status-updated', {
              userId: socket.userId,
              userName: socket.userName,
              isMuted: participant.isMuted,
              isVideoOn: participant.isVideoOn
            });
          }
        }
      } catch (error) {
        console.error('Update participant status error:', error);
        socket.emit('error', { message: 'Failed to update status' });
      }
    });

    // Handle screen sharing
    socket.on('start-screen-share', (data) => {
      const { meetingId } = data;
      if (socket.currentMeeting === meetingId) {
        socket.to(meetingId).emit('user-started-screen-share', {
          userId: socket.userId,
          userName: socket.userName
        });
      }
    });

    socket.on('stop-screen-share', (data) => {
      const { meetingId } = data;
      if (socket.currentMeeting === meetingId) {
        socket.to(meetingId).emit('user-stopped-screen-share', {
          userId: socket.userId,
          userName: socket.userName
        });
      }
    });

    // Handle meeting controls (host only)
    socket.on('mute-participant', async (data) => {
      try {
        const { meetingId, targetUserId } = data;
        
        const meeting = await Meeting.findOne({ 
          meetingId: meetingId.toUpperCase(),
          isActive: true 
        });

        if (!meeting || !meeting.isUserHost(socket.userId)) {
          socket.emit('error', { message: 'Not authorized to mute participants' });
          return;
        }

        // Notify the target participant to mute
        io.to(meetingId).emit('mute-request', {
          targetUserId,
          fromHost: true
        });
      } catch (error) {
        console.error('Mute participant error:', error);
        socket.emit('error', { message: 'Failed to mute participant' });
      }
    });

    // Handle disconnection
    socket.on('leave-meeting', async () => {
      if (socket.currentMeeting) {
        const meetingId = socket.currentMeeting;

        // Leave the socket room
        socket.leave(meetingId);
        
        // Notify others in the meeting
        socket.to(meetingId).emit('user-disconnected', {
          userId: socket.userId,
          userName: socket.userName
        });

        console.log(`User ${socket.userName} left meeting ${meetingId}`);
        socket.currentMeeting = null;
      }
    });

    socket.on('disconnect', async () => {
      if (socket.currentMeeting) {
        const meetingId = socket.currentMeeting;
        
        // Notify others in the meeting
        socket.to(meetingId).emit('user-disconnected', {
          userId: socket.userId,
          userName: socket.userName
        });

        console.log(`User ${socket.userName} disconnected from meeting ${meetingId}`);
      }
      
      console.log(`User ${socket.userName} disconnected: ${socket.id}`);
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  });
};

module.exports = socketHandlers;