import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  PlusIcon, 
  QrCodeIcon, 
  VideoCameraIcon,
  ClockIcon,
  UserGroupIcon,
  CalendarIcon,
  ArrowRightIcon,
  Cog6ToothIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';
import { meetingAPI } from '../services/api';
import toast from 'react-hot-toast';
import CreateMeetingModal from '../components/CreateMeetingModal';
import JoinMeetingModal from '../components/JoinMeetingModal';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [meetings, setMeetings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [meetingToDelete, setMeetingToDelete] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    hosted: 0,
    joined: 0
  });

  useEffect(() => {
    fetchUserMeetings();
  }, []);

  const fetchUserMeetings = async () => {
    try {
      setIsLoading(true);
      
      // Skip the health check and go directly to fetching meetings
      console.log('Fetching user meetings...');
      console.log('Backend URL:', import.meta.env.VITE_BACKEND_URL);
      
      const response = await meetingAPI.getUserMeetings('all', 1, 20);
      console.log('Get meetings response:', response);
      
      if (response.success) {
        setMeetings(response.data.meetings);
        
        // Calculate stats
        const hosted = response.data.meetings.filter(m => m.isHost).length;
        const joined = response.data.meetings.filter(m => !m.isHost).length;
        
        setStats({
          total: response.data.meetings.length,
          hosted,
          joined
        });
      }
    } catch (error) {
      console.error('Error fetching meetings:', error);
      toast.error('Failed to load meetings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMeetingCreated = (newMeeting) => {
    setMeetings(prev => [newMeeting, ...prev]);
    setStats(prev => ({
      ...prev,
      total: prev.total + 1,
      hosted: prev.hosted + 1
    }));
    setShowCreateModal(false);
    
    // Navigate to the meeting room
    navigate(`/meeting/${newMeeting.meetingId}`);
  };

  const handleJoinMeeting = (meetingId) => {
    navigate(`/meeting/${meetingId}`);
  };

  const handleDeleteMeeting = (meetingId, meetingTitle) => {
    setMeetingToDelete({ id: meetingId, title: meetingTitle });
    setShowDeleteModal(true);
  };

  const confirmDeleteMeeting = async () => {
    try {
      setIsLoading(true);
      const response = await meetingAPI.deleteMeeting(meetingToDelete.id);
      
      if (response.success) {
        toast.success('Meeting deleted successfully');
        // Refresh the meetings list
        await fetchUserMeetings();
      }
    } catch (error) {
      console.error('Error deleting meeting:', error);
      toast.error(error.response?.data?.message || 'Failed to delete meeting');
    } finally {
      setIsLoading(false);
      setShowDeleteModal(false);
      setMeetingToDelete(null);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const getMeetingStatus = (meeting) => {
    if (!meeting.isActive) return 'Ended';
    
    const now = new Date();
    const expiresAt = new Date(meeting.expiresAt);
    
    if (now > expiresAt) return 'Expired';
    return 'Active';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Active': return 'text-green-600 bg-green-100';
      case 'Ended': return 'text-red-600 bg-red-100';
      case 'Expired': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <VideoCameraIcon className="h-8 w-8 text-primary-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">MeetSpace</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Welcome, {user?.name}</span>
              <button
                onClick={logout}
                className="btn-secondary"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Create Meeting Card */}
            <div className="card hover:shadow-lg transition-shadow cursor-pointer group" onClick={() => setShowCreateModal(true)}>
              <div className="flex items-center">
                <div className="bg-primary-100 p-3 rounded-lg group-hover:bg-primary-200 transition-colors">
                  <PlusIcon className="h-8 w-8 text-primary-600" />
                </div>
                <div className="ml-4 flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">Create Meeting</h3>
                  <p className="text-gray-600">Start an instant meeting and invite others</p>
                </div>
                <ArrowRightIcon className="h-5 w-5 text-gray-400 group-hover:text-primary-600 transition-colors" />
              </div>
            </div>

            {/* Join Meeting Card */}
            <div className="card hover:shadow-lg transition-shadow cursor-pointer group" onClick={() => setShowJoinModal(true)}>
              <div className="flex items-center">
                <div className="bg-green-100 p-3 rounded-lg group-hover:bg-green-200 transition-colors">
                  <QrCodeIcon className="h-8 w-8 text-green-600" />
                </div>
                <div className="ml-4 flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">Join Meeting</h3>
                  <p className="text-gray-600">Join with meeting ID or scan QR code</p>
                </div>
                <ArrowRightIcon className="h-5 w-5 text-gray-400 group-hover:text-green-600 transition-colors" />
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card">
              <div className="flex items-center">
                <div className="bg-blue-100 p-3 rounded-lg">
                  <CalendarIcon className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-600">Total Meetings</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center">
                <div className="bg-purple-100 p-3 rounded-lg">
                  <UserGroupIcon className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-600">Hosted</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.hosted}</p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center">
                <div className="bg-orange-100 p-3 rounded-lg">
                  <ClockIcon className="h-6 w-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-600">Joined</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.joined}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Meetings */}
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Your Meetings</h2>
            <button
              onClick={fetchUserMeetings}
              className="btn-outline"
            >
              Refresh
            </button>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading meetings...</p>
            </div>
          ) : meetings.length === 0 ? (
            <div className="card text-center py-12">
              <VideoCameraIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No meetings yet</h3>
              <p className="text-gray-600 mb-6">Create your first meeting to get started</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn-primary"
              >
                Create Meeting
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {meetings.map((meeting) => (
                <div key={meeting.id} className="card hover:shadow-lg transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h3 className="text-lg font-semibold text-gray-900">{meeting.title}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(getMeetingStatus(meeting))}`}>
                          {getMeetingStatus(meeting)}
                        </span>
                        {meeting.isHost && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-600">
                            Host
                          </span>
                        )}
                      </div>
                      
                      <div className="mt-2 space-y-1">
                        <p className="text-sm text-gray-600">
                          <strong>Meeting ID:</strong> {meeting.meetingId}
                        </p>
                        <p className="text-sm text-gray-600">
                          <strong>Created:</strong> {formatDate(meeting.createdAt)}
                        </p>
                        <p className="text-sm text-gray-600">
                          <strong>Participants:</strong> {meeting.participantCount}/{meeting.maxParticipants}
                        </p>
                        {meeting.description && (
                          <p className="text-sm text-gray-600">{meeting.description}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      {getMeetingStatus(meeting) === 'Active' && (
                        <button
                          onClick={() => handleJoinMeeting(meeting.meetingId)}
                          className="btn-primary"
                        >
                          Join
                        </button>
                      )}
                      
                      {/* Debug: Show isHost status and always show delete button for testing */}
                      <span className="text-xs text-gray-500">
                        isHost: {meeting.isHost ? 'true' : 'false'}
                      </span>
                      
                      {/* Temporarily show delete button for all meetings for testing */}
                      <button 
                        onClick={() => handleDeleteMeeting(meeting.meetingId, meeting.title)}
                        className="px-3 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex items-center space-x-1"
                        title="Delete Meeting"
                      >
                        <TrashIcon className="h-4 w-4" />
                        <span className="text-sm">Delete</span>
                      </button>
                      
                      <button className="btn-secondary">
                        <Cog6ToothIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreateMeetingModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onMeetingCreated={handleMeetingCreated}
        />
      )}

      {showJoinModal && (
        <JoinMeetingModal
          isOpen={showJoinModal}
          onClose={() => setShowJoinModal(false)}
          onJoinMeeting={handleJoinMeeting}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && meetingToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center space-x-3 mb-4">
              <div className="flex-shrink-0">
                <TrashIcon className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Delete Meeting</h3>
              </div>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-600">
                Are you sure you want to delete the meeting <strong>"{meetingToDelete.title}"</strong>? 
                This action cannot be undone and will permanently remove the meeting from the database.
              </p>
            </div>
            
            <div className="flex space-x-3 justify-end">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setMeetingToDelete(null);
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteMeeting}
                disabled={isLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Deleting...' : 'Delete Meeting'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;