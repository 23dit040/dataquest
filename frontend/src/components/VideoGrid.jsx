import React, { useEffect, useRef } from 'react';
import { MicrophoneIcon, VideoCameraIcon, NoSymbolIcon } from '@heroicons/react/24/outline';

const VideoGrid = ({ participants, localVideoRef, currentUser, remoteStreams = new Map() }) => {
  const remoteVideoRefs = useRef(new Map());

  // Update remote video elements when streams change
  useEffect(() => {
    remoteStreams.forEach((stream, userId) => {
      const videoElement = remoteVideoRefs.current.get(userId);
      if (videoElement && videoElement.srcObject !== stream) {
        console.log(`Setting remote stream for user ${userId}:`, stream);
        videoElement.srcObject = stream;
        videoElement.onloadedmetadata = () => {
          videoElement.play().catch(console.error);
        };
      }
    });
  }, [remoteStreams]);

  const getGridClass = () => {
    const count = participants.length;
    if (count <= 1) return 'grid-cols-1';
    if (count <= 4) return 'grid-cols-2';
    if (count <= 9) return 'grid-cols-3';
    return 'grid-cols-4';
  };

  const getParticipantInitials = (name) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const setRemoteVideoRef = (userId, element) => {
    if (element) {
      remoteVideoRefs.current.set(userId, element);
      // If we already have a stream for this user, set it immediately
      const stream = remoteStreams.get(userId);
      if (stream) {
        element.srcObject = stream;
        element.onloadedmetadata = () => {
          element.play().catch(console.error);
        };
      }
    } else {
      remoteVideoRefs.current.delete(userId);
    }
  };

  return (
    <div className="h-full p-4">
      <div className={`grid ${getGridClass()} gap-4 h-full`}>
        {/* Local Video (Current User) */}
        <div className="video-container relative">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover bg-gray-800 rounded-lg"
            onLoadedMetadata={() => {
              console.log('Local video metadata loaded');
              if (localVideoRef.current) {
                localVideoRef.current.play().catch(console.error);
              }
            }}
            onCanPlay={() => {
              console.log('Local video can play');
            }}
            onPlay={() => {
              console.log('Local video started playing');
            }}
          />
          
          {/* Fallback when no video */}
          {(!localVideoRef.current?.srcObject) && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-800 rounded-lg">
              <div className="text-center">
                <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-white text-xl font-bold">
                    {getParticipantInitials(currentUser?.name || 'You')}
                  </span>
                </div>
                <p className="text-gray-400 text-sm">Camera starting...</p>
              </div>
            </div>
          )}
          
          {/* User Info Overlay */}
          <div className="absolute bottom-4 left-4 right-4">
            <div className="bg-black bg-opacity-60 text-white px-3 py-2 rounded-lg flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">You</span>
                <span className="text-xs text-gray-300">({currentUser?.name})</span>
              </div>
              
              <div className="flex items-center space-x-1">
                {/* Mute/Video indicators will be added here */}
              </div>
            </div>
          </div>
        </div>

        {/* Remote Participants */}
        {participants
          .filter(p => p.userId !== currentUser?.id)
          .map((participant) => {
            const hasRemoteStream = remoteStreams.has(participant.userId);
            
            return (
              <div key={participant.userId} className="video-container relative">
                {participant.isVideoOn && hasRemoteStream ? (
                  <video
                    ref={(el) => setRemoteVideoRef(participant.userId, el)}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover bg-gray-800 rounded-lg"
                    onLoadedMetadata={(e) => {
                      console.log(`Remote video metadata loaded for ${participant.name}`);
                      e.target.play().catch(console.error);
                    }}
                  />
                ) : (
                  /* Video Off or No Stream - Show Avatar */
                  <div className="w-full h-full bg-gray-800 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-primary-600 rounded-full flex items-center justify-center mx-auto mb-2">
                        <span className="text-white text-xl font-bold">
                          {getParticipantInitials(participant.name)}
                        </span>
                      </div>
                      <span className="text-white text-sm">{participant.name}</span>
                      {!hasRemoteStream && (
                        <p className="text-gray-400 text-xs mt-1">Connecting...</p>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Participant Info Overlay */}
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="bg-black bg-opacity-60 text-white px-3 py-2 rounded-lg flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">{participant.name}</span>
                      {participant.isHost && (
                        <span className="text-xs bg-primary-600 px-2 py-1 rounded">Host</span>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      {participant.isMuted && (
                        <div className="relative">
                          <MicrophoneIcon className="h-4 w-4 text-gray-400" />
                          <NoSymbolIcon className="h-3 w-3 text-red-400 absolute -top-1 -right-1" />
                        </div>
                      )}
                      {!participant.isVideoOn && (
                        <div className="relative">
                          <VideoCameraIcon className="h-4 w-4 text-gray-400" />
                          <NoSymbolIcon className="h-3 w-3 text-red-400 absolute -top-1 -right-1" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
};

export default VideoGrid;