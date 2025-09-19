import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.listeners = new Map();
  }

  connect(token) {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
    
    this.socket = io(backendUrl, {
      auth: {
        token: token || null // Allow null token for guest access
      },
      transports: ['websocket', 'polling']
    });

    this.socket.on('connect', () => {
      console.log('Connected to server:', this.socket.id);
      this.isConnected = true;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected from server:', reason);
      this.isConnected = false;
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.listeners.clear();
    }
  }

  // Join a meeting room
  joinMeeting(meetingId) {
    if (this.socket) {
      this.socket.emit('join-meeting', { meetingId });
    }
  }

  // Leave a meeting room
  leaveMeeting() {
    if (this.socket) {
      this.socket.emit('leave-meeting');
    }
  }

  // Send chat message
  sendMessage(meetingId, message, type = 'text') {
    if (this.socket) {
      this.socket.emit('send-message', { meetingId, message, type });
    }
  }

  // Update participant status (mute/video)
  updateParticipantStatus(meetingId, status) {
    if (this.socket) {
      this.socket.emit('update-participant-status', { meetingId, ...status });
    }
  }

  // Screen sharing events
  startScreenShare(meetingId) {
    if (this.socket) {
      this.socket.emit('start-screen-share', { meetingId });
    }
  }

  stopScreenShare(meetingId) {
    if (this.socket) {
      this.socket.emit('stop-screen-share', { meetingId });
    }
  }

  // WebRTC signaling
  sendWebRTCOffer(meetingId, targetUserId, offer) {
    if (this.socket) {
      this.socket.emit('webrtc-offer', { meetingId, targetUserId, offer });
    }
  }

  sendWebRTCAnswer(meetingId, targetUserId, answer) {
    if (this.socket) {
      this.socket.emit('webrtc-answer', { meetingId, targetUserId, answer });
    }
  }

  sendWebRTCIceCandidate(meetingId, targetUserId, candidate) {
    if (this.socket) {
      this.socket.emit('webrtc-ice-candidate', { meetingId, targetUserId, candidate });
    }
  }

  // Host controls
  muteParticipant(meetingId, targetUserId) {
    if (this.socket) {
      this.socket.emit('mute-participant', { meetingId, targetUserId });
    }
  }

  // Event listeners
  on(event, callback) {
    if (this.socket) {
      this.socket.on(event, callback);
      
      // Store listener for cleanup
      if (!this.listeners.has(event)) {
        this.listeners.set(event, []);
      }
      this.listeners.get(event).push(callback);
    }
  }

  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
      
      // Remove from stored listeners
      if (this.listeners.has(event)) {
        const callbacks = this.listeners.get(event);
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    }
  }

  // Remove all listeners for an event
  removeAllListeners(event) {
    if (this.socket) {
      this.socket.removeAllListeners(event);
      this.listeners.delete(event);
    }
  }

  // Get socket instance
  getSocket() {
    return this.socket;
  }

  // Check connection status
  isSocketConnected() {
    return this.isConnected && this.socket?.connected;
  }
}

// Create singleton instance
const socketService = new SocketService();

export default socketService;