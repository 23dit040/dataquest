import React from 'react';
import { 
  XMarkIcon, 
  MicrophoneIcon, 
  VideoCameraIcon,
  StarIcon,
  EllipsisVerticalIcon,
  NoSymbolIcon
} from '@heroicons/react/24/outline';

const ParticipantsList = ({ participants, isHost, currentUser, onClose }) => {
  const getParticipantInitials = (name) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleMuteParticipant = (participantId) => {
    // Host can mute participants
    if (isHost) {
      // Implement mute functionality
      console.log('Muting participant:', participantId);
    }
  };

  const handleRemoveParticipant = (participantId) => {
    // Host can remove participants
    if (isHost && window.confirm('Remove this participant from the meeting?')) {
      // Implement remove functionality
      console.log('Removing participant:', participantId);
    }
  };

  const sortedParticipants = [...participants].sort((a, b) => {
    // Host first, then alphabetical
    if (a.isHost && !b.isHost) return -1;
    if (!a.isHost && b.isHost) return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Participants</h3>
          <p className="text-sm text-gray-600">{participants.length} in meeting</p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>

      {/* Participants List */}
      <div className="flex-1 overflow-y-auto">
        <div className="divide-y divide-gray-200">
          {sortedParticipants.map((participant) => {
            const isCurrentUser = participant.userId === currentUser?.id;
            
            return (
              <div
                key={participant.userId}
                className="p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  {/* Avatar */}
                  <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-sm font-medium">
                      {getParticipantInitials(participant.name)}
                    </span>
                  </div>
                  
                  {/* Participant Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-medium text-gray-900 truncate">
                        {participant.name}
                        {isCurrentUser && (
                          <span className="ml-1 text-gray-500">(You)</span>
                        )}
                      </h4>
                      
                      {participant.isHost && (
                        <StarIcon className="h-4 w-4 text-yellow-500" />
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-xs text-gray-500">
                        Joined {new Date(participant.joinedAt).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                  
                  {/* Status Icons */}
                  <div className="flex items-center space-x-2">
                    {/* Audio Status */}
                    <div className="flex items-center">
                      {participant.isMuted ? (
                        <div className="relative">
                          <MicrophoneIcon className="h-4 w-4 text-gray-400" />
                          <NoSymbolIcon className="h-3 w-3 text-red-500 absolute -top-1 -right-1" />
                        </div>
                      ) : (
                        <MicrophoneIcon className="h-4 w-4 text-green-500" />
                      )}
                    </div>
                    
                    {/* Video Status */}
                    <div className="flex items-center">
                      {participant.isVideoOn ? (
                        <VideoCameraIcon className="h-4 w-4 text-green-500" />
                      ) : (
                        <div className="relative">
                          <VideoCameraIcon className="h-4 w-4 text-gray-400" />
                          <NoSymbolIcon className="h-3 w-3 text-red-500 absolute -top-1 -right-1" />
                        </div>
                      )}
                    </div>
                    
                    {/* Host Controls */}
                    {isHost && !isCurrentUser && (
                      <div className="relative">
                        <button
                          className="text-gray-400 hover:text-gray-600 p-1"
                          onClick={() => {
                            // Show context menu for host actions
                          }}
                        >
                          <EllipsisVerticalIcon className="h-4 w-4" />
                        </button>
                        
                        {/* Context Menu (would be implemented with proper dropdown) */}
                        <div className="hidden absolute right-0 top-full mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-10">
                          <div className="py-1">
                            <button
                              onClick={() => handleMuteParticipant(participant.userId)}
                              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              {participant.isMuted ? 'Unmute' : 'Mute'}
                            </button>
                            <button
                              onClick={() => handleRemoveParticipant(participant.userId)}
                              className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                            >
                              Remove from meeting
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Info */}
      {isHost && (
        <div className="border-t border-gray-200 p-4">
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="flex items-start">
              <StarIcon className="h-5 w-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-blue-800">Host Controls</p>
                <p className="text-xs text-blue-600 mt-1">
                  You can mute participants and manage the meeting
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ParticipantsList;