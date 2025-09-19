import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  MicrophoneIcon, 
  VideoCameraIcon, 
  PhoneXMarkIcon,
  ChatBubbleLeftIcon,
  ComputerDesktopIcon,
  UserGroupIcon,
  Cog6ToothIcon,
  NoSymbolIcon,
  ShareIcon,
  ClipboardDocumentIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';
import { meetingAPI } from '../services/api';
import toast from 'react-hot-toast';
import socketService from '../services/socketService';
import webrtcService from '../services/webrtcService';
import ChatPanel from '../components/ChatPanel';
import ParticipantsList from '../components/ParticipantsList';
import VideoGrid from '../components/VideoGrid';

const MeetingRoom = () => {
  const { meetingId } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  
  // Meeting state
  const [meeting, setMeeting] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [participants, setParticipants] = useState([]);
  
  // UI state
  const [showChat, setShowChat] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  // Media state
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [hasMediaAccess, setHasMediaAccess] = useState(false);
  
  // Chat state
  const [messages, setMessages] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Media refs
  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  
  // WebRTC state
  const [remoteStreams, setRemoteStreams] = useState(new Map());

  // Check media permissions on mount
  const checkMediaPermissions = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        return false;
      }

      // Check if we can query permissions
      if (navigator.permissions && navigator.permissions.query) {
        const cameraPermission = await navigator.permissions.query({ name: 'camera' });
        const micPermission = await navigator.permissions.query({ name: 'microphone' });
        
        console.log('Camera permission:', cameraPermission.state);
        console.log('Microphone permission:', micPermission.state);
        
        return cameraPermission.state === 'granted' && micPermission.state === 'granted';
      }
      
      return false;
    } catch (error) {
      console.log('Cannot check permissions:', error);
      return false;
    }
  };

  useEffect(() => {
    initializeMeeting();
    return () => {
      cleanup();
    };
  }, [meetingId]);

  const initializeMeeting = async () => {
    try {
      setIsLoading(true);
      
      // Check media permissions first
      const hasPermissions = await checkMediaPermissions();
      console.log('Has media permissions:', hasPermissions);
      
      // Try to fetch meeting details with auth first, fallback to public API
      let response;
      try {
        response = await meetingAPI.getMeeting(meetingId);
      } catch (authError) {
        console.log('Auth failed, trying public API:', authError);
        // If auth fails, try public API
        response = await meetingAPI.getPublicMeeting(meetingId);
      }
      
      if (response.success) {
        setMeeting(response.data.meeting);
        setIsHost(response.data.isHost || false);
        setParticipants(response.data.meeting.participants || []);
        
        // Connect to socket (with or without authentication)
        socketService.connect(token || null);
        setupSocketListeners();
        
        // Initialize WebRTC service
        webrtcService.initialize(socketService);
        setupWebRTCCallbacks();
        
        // Join meeting room
        socketService.joinMeeting(meetingId);
        webrtcService.joinMeeting(meetingId);
        
        // Initialize media
        await initializeMedia();
      }
    } catch (error) {
      console.error('Error initializing meeting:', error);
      toast.error(error.response?.data?.message || 'Failed to join meeting');
      navigate('/dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const setupWebRTCCallbacks = () => {
    // Handle when a remote stream is added
    webrtcService.setRemoteStreamCallbacks(
      (userId, stream) => {
        console.log(`Remote stream added for user ${userId}:`, stream);
        setRemoteStreams(prev => {
          const newMap = new Map(prev);
          newMap.set(userId, stream);
          return newMap;
        });
      },
      (userId) => {
        console.log(`Remote stream removed for user ${userId}`);
        setRemoteStreams(prev => {
          const newMap = new Map(prev);
          newMap.delete(userId);
          return newMap;
        });
      }
    );
  };

  const setupSocketListeners = () => {
    // Meeting events
    socketService.on('meeting-joined', (data) => {
      console.log('Joined meeting:', data);
      setParticipants(data.participants);
    });

    socketService.on('participant-joined', (data) => {
      setParticipants(data.meeting.participants);
      toast.success(`${data.participant.name} joined the meeting`);
    });

    socketService.on('participant-left', (data) => {
      setParticipants(data.meeting.participants);
      toast(`${data.name} left the meeting`);
    });

    socketService.on('user-connected', (data) => {
      console.log('User connected:', data);
    });

    socketService.on('user-disconnected', (data) => {
      console.log('User disconnected:', data);
    });

    // Chat events
    socketService.on('new-message', (message) => {
      setMessages(prev => [...prev, message]);
      if (!showChat) {
        setUnreadCount(prev => prev + 1);
      }
    });

    // Participant status updates
    socketService.on('participant-status-updated', (data) => {
      setParticipants(prev => 
        prev.map(p => 
          p.userId === data.userId 
            ? { ...p, isMuted: data.isMuted, isVideoOn: data.isVideoOn }
            : p
        )
      );
    });

    // Meeting controls
    socketService.on('meeting-ended', (data) => {
      toast.error('Meeting has been ended by the host');
      navigate('/dashboard');
    });

    socketService.on('meeting-deleted', (data) => {
      toast.error('Meeting has been permanently deleted by the host');
      navigate('/dashboard');
    });

    socketService.on('mute-request', (data) => {
      if (data.fromHost) {
        handleToggleMute(true);
        toast('You have been muted by the host');
      }
    });

    // Screen sharing
    socketService.on('user-started-screen-share', (data) => {
      toast(`${data.userName} started screen sharing`);
    });

    socketService.on('user-stopped-screen-share', (data) => {
      toast(`${data.userName} stopped screen sharing`);
    });

    // Error handling
    socketService.on('error', (error) => {
      console.error('Socket error:', error);
      toast.error(error.message || 'Connection error');
    });
  };

  // Add function to manually request media access
  const requestMediaAccess = async () => {
    try {
      setIsLoading(true);
      console.log('Manually requesting media access...');
      
      // Initialize WebRTC local stream with better error handling
      const stream = await webrtcService.initializeLocalStream(localVideoRef.current);
      
      console.log('Manual media access granted:', stream);
      localStreamRef.current = stream;
      
      setHasMediaAccess(true);
      toast.success('Camera and microphone access granted!');
      
      // Trigger a small delay to ensure the UI updates
      setTimeout(() => {
        if (localVideoRef.current && localVideoRef.current.srcObject) {
          localVideoRef.current.play().catch(console.error);
        }
      }, 100);
      
    } catch (error) {
      console.error('Failed to get media access manually:', error);
      toast.error(error.message || 'Please allow camera access in your browser settings');
    } finally {
      setIsLoading(false);
    }
  };

  const initializeMedia = async () => {
    try {
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast.error('Your browser does not support camera/microphone access. Please use a modern browser like Chrome, Firefox, or Safari.');
        return;
      }

      console.log('Requesting camera and microphone access...');
      
      // Initialize WebRTC local stream with improved error handling
      const stream = await webrtcService.initializeLocalStream(localVideoRef.current);
      
      console.log('Media access granted via WebRTC service, stream:', stream);
      console.log('Video tracks:', stream.getVideoTracks());
      console.log('Audio tracks:', stream.getAudioTracks());
      
      localStreamRef.current = stream;
      
      // Set initial mute state if meeting requires it
      if (meeting?.settings?.muteOnJoin) {
        handleToggleMute(true);
      }
      
      setHasMediaAccess(true);
      console.log('Media initialized successfully');
      
      // Small delay to ensure video element is ready
      setTimeout(() => {
        if (localVideoRef.current && stream) {
          localVideoRef.current.muted = false; // Unmute for local video
          localVideoRef.current.play().catch(err => {
            console.log('Video play failed, trying muted:', err);
            localVideoRef.current.muted = true;
            localVideoRef.current.play().catch(console.error);
          });
        }
      }, 200);
      
    } catch (error) {
      console.error('Error accessing media devices:', error);
      
      // Show specific error messages based on error type
      let errorMessage = 'Failed to access camera/microphone. ';
      
      if (error.message.includes('denied')) {
        errorMessage += 'Please click the camera icon in your browser address bar and allow access, then click "Enable Camera & Microphone" below.';
      } else if (error.message.includes('not found')) {
        errorMessage += 'No camera or microphone found on your device.';
      } else if (error.message.includes('being used')) {
        errorMessage += 'Camera/microphone is being used by another application.';
      } else {
        errorMessage += 'Please check your device settings and browser permissions.';
      }
      
      toast.error(errorMessage);
      setHasMediaAccess(false);
    }
  };

  const handleToggleMute = (forceMute = null) => {
    try {
      const newMutedState = forceMute !== null ? forceMute : !isMuted;
      
      // Update WebRTC service
      webrtcService.toggleAudio(!newMutedState);
      
      setIsMuted(newMutedState);
      
      // Update server
      socketService.updateParticipantStatus(meetingId, { isMuted: newMutedState });
      
      toast.success(newMutedState ? 'Microphone muted' : 'Microphone unmuted');
    } catch (error) {
      console.error('Error toggling mute:', error);
      toast.error('Failed to toggle microphone');
    }
  };

  const handleToggleVideo = () => {
    try {
      const newVideoState = !isVideoOff;
      
      // Update WebRTC service
      webrtcService.toggleVideo(!newVideoState);
      
      setIsVideoOff(newVideoState);
      
      // Update server
      socketService.updateParticipantStatus(meetingId, { isVideoOn: !newVideoState });
      
      toast.success(newVideoState ? 'Camera turned off' : 'Camera turned on');
    } catch (error) {
      console.error('Error toggling video:', error);
      toast.error('Failed to toggle camera');
    }
  };

  const handleScreenShare = async () => {
    try {
      if (isScreenSharing) {
        // Stop screen sharing
        setIsScreenSharing(false);
        socketService.stopScreenShare(meetingId);
        
        // Switch back to camera
        await initializeMedia();
      } else {
        // Start screen sharing
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        });
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }
        
        setIsScreenSharing(true);
        socketService.startScreenShare(meetingId);
        
        // Handle screen share end
        screenStream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false);
          socketService.stopScreenShare(meetingId);
          initializeMedia();
        };
      }
    } catch (error) {
      console.error('Error with screen sharing:', error);
      toast.error('Failed to share screen');
    }
  };

  const handleLeaveMeeting = async () => {
    try {
      await meetingAPI.leaveMeeting(meetingId);
      navigate('/dashboard');
    } catch (error) {
      console.error('Error leaving meeting:', error);
      navigate('/dashboard');
    }
  };

  const handleEndMeeting = async () => {
    if (window.confirm('Are you sure you want to end this meeting for everyone?')) {
      try {
        await meetingAPI.endMeeting(meetingId);
        navigate('/dashboard');
      } catch (error) {
        console.error('Error ending meeting:', error);
        toast.error('Failed to end meeting');
      }
    }
  };

  const sendMessage = (message) => {
    socketService.sendMessage(meetingId, message);
  };

  const generateShareableLink = () => {
    // Get the current network IP address for sharing
    const networkIP = '192.168.0.114'; // Your hotspot IP
    return `http://${networkIP}:3000/meeting/${meetingId}`;
  };

  const handleShareMeeting = async () => {
    const shareLink = generateShareableLink();
    
    try {
      if (navigator.share) {
        // Use native sharing if available
        await navigator.share({
          title: `Join Meeting: ${meeting?.title}`,
          text: `Join my meeting: ${meeting?.title}`,
          url: shareLink
        });
      } else {
        // Fallback to clipboard
        await navigator.clipboard.writeText(shareLink);
        toast.success('Meeting link copied to clipboard!');
      }
    } catch (error) {
      // Manual fallback - show the link in a prompt
      const message = `Share this link with your friend:\n\n${shareLink}\n\nMeeting ID: ${meetingId}`;
      window.prompt('Copy this link to share:', shareLink);
    }
  };

  const cleanup = () => {
    // Cleanup WebRTC connections
    webrtcService.leaveMeeting();
    
    // Leave meeting and disconnect socket
    socketService.leaveMeeting();
    socketService.disconnect();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Joining meeting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <header className="bg-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-white text-xl font-semibold">{meeting?.title}</h1>
          <span className="bg-gray-700 text-gray-300 px-3 py-1 rounded-full text-sm">
            {meetingId}
          </span>
          {isHost && (
            <span className="bg-primary-600 text-white px-3 py-1 rounded-full text-sm">
              Host
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-4">
          <button
            onClick={handleShareMeeting}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            title="Share meeting link"
          >
            <ShareIcon className="h-4 w-4" />
            <span>Share Link</span>
          </button>
          
          <span className="text-gray-300 text-sm">
            {participants.length} participant{participants.length !== 1 ? 's' : ''}
          </span>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Video Area */}
        <div className="flex-1 relative">
          {/* Camera Permission Button */}
          {!hasMediaAccess && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-75 z-10">
              <div className="bg-white rounded-lg p-8 text-center max-w-md">
                <div className="text-red-500 mb-4">
                  <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Camera Access Required
                </h3>
                <p className="text-gray-600 mb-6">
                  To join this meeting, please allow camera and microphone access in your browser.
                </p>
                <button
                  onClick={requestMediaAccess}
                  disabled={isLoading}
                  className="bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 transition disabled:opacity-50"
                >
                  {isLoading ? 'Requesting Access...' : 'Enable Camera & Microphone'}
                </button>
                <p className="text-sm text-gray-500 mt-4">
                  Click the camera icon in your browser's address bar if the button doesn't work.
                </p>
              </div>
            </div>
          )}
          
          <VideoGrid 
            participants={participants}
            localVideoRef={localVideoRef}
            currentUser={user}
            remoteStreams={remoteStreams}
          />
        </div>

        {/* Side Panels */}
        {showChat && (
          <div className="w-80 bg-white border-l border-gray-200">
            <ChatPanel 
              messages={messages}
              onSendMessage={sendMessage}
              onClose={() => {
                setShowChat(false);
                setUnreadCount(0);
              }}
            />
          </div>
        )}

        {showParticipants && (
          <div className="w-80 bg-white border-l border-gray-200">
            <ParticipantsList 
              participants={participants}
              isHost={isHost}
              currentUser={user}
              onClose={() => setShowParticipants(false)}
            />
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="bg-gray-800 px-6 py-4">
        <div className="flex items-center justify-center space-x-4">
          {/* Mute/Unmute */}
          <button
            onClick={() => handleToggleMute()}
            className={`p-3 rounded-full transition-colors ${
              isMuted 
                ? 'bg-red-600 hover:bg-red-700' 
                : 'bg-gray-600 hover:bg-gray-500'
            }`}
          >
            {isMuted ? (
              <div className="relative">
                <MicrophoneIcon className="h-6 w-6 text-white opacity-50" />
                <NoSymbolIcon className="h-4 w-4 text-white absolute -top-1 -right-1" />
              </div>
            ) : (
              <MicrophoneIcon className="h-6 w-6 text-white" />
            )}
          </button>

          {/* Video On/Off */}
          <button
            onClick={handleToggleVideo}
            className={`p-3 rounded-full transition-colors ${
              isVideoOff 
                ? 'bg-red-600 hover:bg-red-700' 
                : 'bg-gray-600 hover:bg-gray-500'
            }`}
          >
            {isVideoOff ? (
              <div className="relative">
                <VideoCameraIcon className="h-6 w-6 text-white opacity-50" />
                <NoSymbolIcon className="h-4 w-4 text-white absolute -top-1 -right-1" />
              </div>
            ) : (
              <VideoCameraIcon className="h-6 w-6 text-white" />
            )}
          </button>

          {/* Screen Share */}
          <button
            onClick={handleScreenShare}
            className={`p-3 rounded-full transition-colors ${
              isScreenSharing 
                ? 'bg-primary-600 hover:bg-primary-700' 
                : 'bg-gray-600 hover:bg-gray-500'
            }`}
          >
            <ComputerDesktopIcon className="h-6 w-6 text-white" />
          </button>

          {/* Chat */}
          <button
            onClick={() => {
              setShowChat(!showChat);
              if (!showChat) setUnreadCount(0);
            }}
            className="relative p-3 bg-gray-600 hover:bg-gray-500 rounded-full transition-colors"
          >
            <ChatBubbleLeftIcon className="h-6 w-6 text-white" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Participants */}
          <button
            onClick={() => setShowParticipants(!showParticipants)}
            className="p-3 bg-gray-600 hover:bg-gray-500 rounded-full transition-colors"
          >
            <UserGroupIcon className="h-6 w-6 text-white" />
          </button>

          {/* Settings */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-3 bg-gray-600 hover:bg-gray-500 rounded-full transition-colors"
          >
            <Cog6ToothIcon className="h-6 w-6 text-white" />
          </button>

          {/* Leave/End Meeting */}
          <div className="flex space-x-2 ml-8">
            <button
              onClick={handleLeaveMeeting}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              Leave
            </button>
            
            {isHost && (
              <button
                onClick={handleEndMeeting}
                className="px-4 py-2 bg-red-700 hover:bg-red-800 text-white rounded-lg transition-colors"
              >
                End Meeting
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MeetingRoom;