class WebRTCService {
  constructor() {
    this.localStream = null;
    this.peerConnections = new Map(); // userId -> RTCPeerConnection
    this.remoteStreams = new Map(); // userId -> MediaStream
    this.socketService = null;
    this.currentMeetingId = null;
    this.localVideoElement = null;
    this.onRemoteStreamAdded = null;
    this.onRemoteStreamRemoved = null;
    
    // STUN servers for NAT traversal
    this.iceServers = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' }
    ];
  }

  // Initialize WebRTC with socket service
  initialize(socketService) {
    this.socketService = socketService;
    this.setupSocketListeners();
  }

  // Setup socket listeners for WebRTC signaling
  setupSocketListeners() {
    if (!this.socketService) return;

    // Handle when a new user connects
    this.socketService.on('user-connected', async (data) => {
      console.log('New user connected:', data);
      if (data.userId && data.userId !== this.getCurrentUserId()) {
        await this.createPeerConnection(data.userId, true); // Create offer
      }
    });

    // Handle when a user disconnects
    this.socketService.on('user-disconnected', (data) => {
      console.log('User disconnected:', data);
      this.removePeerConnection(data.userId);
    });

    // Handle WebRTC offer
    this.socketService.on('webrtc-offer', async (data) => {
      console.log('Received WebRTC offer from:', data.fromUserId);
      await this.handleOffer(data.fromUserId, data.offer);
    });

    // Handle WebRTC answer
    this.socketService.on('webrtc-answer', async (data) => {
      console.log('Received WebRTC answer from:', data.fromUserId);
      await this.handleAnswer(data.fromUserId, data.answer);
    });

    // Handle ICE candidates
    this.socketService.on('webrtc-ice-candidate', async (data) => {
      console.log('Received ICE candidate from:', data.fromUserId);
      await this.handleIceCandidate(data.fromUserId, data.candidate);
    });
  }

  // Get current user ID (from localStorage or auth context)
  getCurrentUserId() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user.id || `guest-${Date.now()}`;
  }

  // Initialize local media stream
  async initializeLocalStream(videoElement, audioOnly = false) {
    try {
      // First check if media devices are available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Media devices not supported in this browser');
      }

      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: audioOnly ? false : {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 30, max: 60 },
          facingMode: 'user'
        }
      };

      console.log('Requesting media with constraints:', constraints);
      
      // Try to get user media with retry logic
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (firstError) {
        console.log('First attempt failed, trying with basic constraints:', firstError);
        
        // Fallback to basic constraints
        const basicConstraints = {
          audio: true,
          video: audioOnly ? false : true
        };
        
        stream = await navigator.mediaDevices.getUserMedia(basicConstraints);
      }
      
      this.localStream = stream;
      
      if (videoElement) {
        this.localVideoElement = videoElement;
        videoElement.srcObject = stream;
        
        // Ensure video plays with better error handling
        videoElement.onloadedmetadata = () => {
          videoElement.play()
            .then(() => console.log('Local video playing'))
            .catch(playError => {
              console.error('Error playing local video:', playError);
              // Try to play with muted video first
              videoElement.muted = true;
              return videoElement.play();
            });
        };
      }

      console.log('Local stream initialized:', this.localStream);
      console.log('Video tracks:', this.localStream.getVideoTracks());
      console.log('Audio tracks:', this.localStream.getAudioTracks());

      return this.localStream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      
      // Provide more specific error messages
      switch (error.name) {
        case 'NotAllowedError':
          throw new Error('Camera/microphone access denied. Please allow access and refresh the page.');
        case 'NotFoundError':
          throw new Error('No camera or microphone found on your device.');
        case 'NotReadableError':
          throw new Error('Camera/microphone is being used by another application.');
        case 'OverconstrainedError':
          throw new Error('Camera/microphone constraints could not be satisfied.');
        case 'SecurityError':
          throw new Error('Access denied due to security restrictions.');
        default:
          throw new Error(`Failed to access camera/microphone: ${error.message}`);
      }
    }
  }

  // Create a peer connection for a specific user
  async createPeerConnection(userId, shouldCreateOffer = false) {
    try {
      console.log(`Creating peer connection for user: ${userId}`);
      
      const peerConnection = new RTCPeerConnection({
        iceServers: this.iceServers
      });

      // Add local stream tracks to peer connection
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => {
          console.log(`Adding local track to peer connection:`, track);
          peerConnection.addTrack(track, this.localStream);
        });
      }

      // Handle remote stream
      peerConnection.ontrack = (event) => {
        console.log(`Received remote track from ${userId}:`, event);
        const remoteStream = event.streams[0];
        if (remoteStream) {
          this.remoteStreams.set(userId, remoteStream);
          if (this.onRemoteStreamAdded) {
            this.onRemoteStreamAdded(userId, remoteStream);
          }
        }
      };

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate && this.socketService && this.currentMeetingId) {
          console.log(`Sending ICE candidate to ${userId}:`, event.candidate);
          this.socketService.sendWebRTCIceCandidate(
            this.currentMeetingId, 
            userId, 
            event.candidate
          );
        }
      };

      // Handle connection state changes
      peerConnection.onconnectionstatechange = () => {
        console.log(`Peer connection state with ${userId}:`, peerConnection.connectionState);
        if (peerConnection.connectionState === 'disconnected' || 
            peerConnection.connectionState === 'failed') {
          this.removePeerConnection(userId);
        }
      };

      // Handle ICE connection state changes
      peerConnection.oniceconnectionstatechange = () => {
        console.log(`ICE connection state with ${userId}:`, peerConnection.iceConnectionState);
      };

      this.peerConnections.set(userId, peerConnection);

      // Create offer if this is the initiating side
      if (shouldCreateOffer) {
        await this.createOffer(userId);
      }

      return peerConnection;
    } catch (error) {
      console.error(`Error creating peer connection for ${userId}:`, error);
      throw error;
    }
  }

  // Create and send WebRTC offer
  async createOffer(userId) {
    try {
      const peerConnection = this.peerConnections.get(userId);
      if (!peerConnection) return;

      console.log(`Creating offer for ${userId}`);
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      if (this.socketService && this.currentMeetingId) {
        this.socketService.sendWebRTCOffer(this.currentMeetingId, userId, offer);
      }
    } catch (error) {
      console.error(`Error creating offer for ${userId}:`, error);
    }
  }

  // Handle incoming WebRTC offer
  async handleOffer(userId, offer) {
    try {
      console.log(`Handling offer from ${userId}`);
      
      let peerConnection = this.peerConnections.get(userId);
      if (!peerConnection) {
        peerConnection = await this.createPeerConnection(userId, false);
      }

      // Check connection state before setting remote description
      if (peerConnection.signalingState === 'closed') {
        console.log('Peer connection is closed, recreating...');
        peerConnection = await this.createPeerConnection(userId, false);
      }

      // Only set remote description if we're in the right state
      if (peerConnection.signalingState === 'stable' || peerConnection.signalingState === 'have-local-offer') {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
        
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);

        if (this.socketService && this.currentMeetingId) {
          this.socketService.sendWebRTCAnswer(this.currentMeetingId, userId, answer);
        }
      } else {
        console.log(`Invalid signaling state for setRemoteDescription: ${peerConnection.signalingState}`);
      }
    } catch (error) {
      console.error(`Error handling offer from ${userId}:`, error);
      // Try to recover by recreating the peer connection
      this.removePeerConnection(userId);
    }
  }

  // Handle incoming WebRTC answer
  async handleAnswer(userId, answer) {
    try {
      console.log(`Handling answer from ${userId}`);
      
      const peerConnection = this.peerConnections.get(userId);
      if (peerConnection && peerConnection.signalingState === 'have-local-offer') {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      } else if (peerConnection) {
        console.log(`Invalid signaling state for answer: ${peerConnection.signalingState}`);
      } else {
        console.log(`No peer connection found for user: ${userId}`);
      }
    } catch (error) {
      console.error(`Error handling answer from ${userId}:`, error);
      // Try to recover by recreating the peer connection
      this.removePeerConnection(userId);
    }
  }

  // Handle incoming ICE candidate
  async handleIceCandidate(userId, candidate) {
    try {
      const peerConnection = this.peerConnections.get(userId);
      if (peerConnection && peerConnection.remoteDescription) {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      } else {
        console.log(`Cannot add ICE candidate - peer connection not ready for user: ${userId}`);
        // Store the candidate for later if needed
        // This is a simplified approach - in production you might want to queue candidates
      }
    } catch (error) {
      console.error(`Error handling ICE candidate from ${userId}:`, error);
    }
  }

  // Remove peer connection
  removePeerConnection(userId) {
    console.log(`Removing peer connection for ${userId}`);
    
    const peerConnection = this.peerConnections.get(userId);
    if (peerConnection) {
      peerConnection.close();
      this.peerConnections.delete(userId);
    }

    const remoteStream = this.remoteStreams.get(userId);
    if (remoteStream) {
      this.remoteStreams.delete(userId);
      if (this.onRemoteStreamRemoved) {
        this.onRemoteStreamRemoved(userId);
      }
    }
  }

  // Join a meeting
  joinMeeting(meetingId) {
    this.currentMeetingId = meetingId;
    console.log(`Joined meeting: ${meetingId}`);
  }

  // Leave meeting and cleanup
  leaveMeeting() {
    console.log('Leaving meeting, cleaning up WebRTC connections');
    
    // Close all peer connections
    this.peerConnections.forEach((pc, userId) => {
      pc.close();
    });
    this.peerConnections.clear();
    this.remoteStreams.clear();

    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        track.stop();
      });
      this.localStream = null;
    }

    if (this.localVideoElement) {
      this.localVideoElement.srcObject = null;
    }

    this.currentMeetingId = null;
  }

  // Toggle video track
  toggleVideo(enabled) {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = enabled;
        console.log(`Video ${enabled ? 'enabled' : 'disabled'}`);
      }
    }
  }

  // Toggle audio track
  toggleAudio(enabled) {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = enabled;
        console.log(`Audio ${enabled ? 'enabled' : 'disabled'}`);
      }
    }
  }

  // Get remote stream for a user
  getRemoteStream(userId) {
    return this.remoteStreams.get(userId);
  }

  // Get all remote streams
  getAllRemoteStreams() {
    return Array.from(this.remoteStreams.entries());
  }

  // Set callbacks for remote stream events
  setRemoteStreamCallbacks(onAdded, onRemoved) {
    this.onRemoteStreamAdded = onAdded;
    this.onRemoteStreamRemoved = onRemoved;
  }
}

// Create singleton instance
const webrtcService = new WebRTCService();

export default webrtcService;