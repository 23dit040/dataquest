import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { XMarkIcon, VideoCameraIcon, ClockIcon, UserGroupIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import { meetingAPI } from '../services/api';
import toast from 'react-hot-toast';

const CreateMeetingModal = ({ isOpen, onClose, onMeetingCreated }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [createdMeeting, setCreatedMeeting] = useState(null);
  const [showQR, setShowQR] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors }
  } = useForm({
    defaultValues: {
      title: '',
      description: '',
      maxParticipants: 50,
      requirePassword: false,
      meetingPassword: '',
      allowChat: true,
      allowScreenShare: true,
      muteOnJoin: false,
      waitingRoom: false
    }
  });

  const requirePassword = watch('requirePassword');

  const onSubmit = async (data) => {
    try {
      setIsLoading(true);
      
      const meetingData = {
        title: data.title,
        description: data.description,
        maxParticipants: parseInt(data.maxParticipants),
        requirePassword: data.requirePassword,
        meetingPassword: data.requirePassword ? data.meetingPassword : null,
        settings: {
          allowChat: data.allowChat,
          allowScreenShare: data.allowScreenShare,
          muteOnJoin: data.muteOnJoin,
          waitingRoom: data.waitingRoom
        }
      };

      const response = await meetingAPI.createMeeting(meetingData);
      
      if (response.success) {
        setCreatedMeeting(response.data);
        setShowQR(true);
        toast.success('Meeting created successfully!');
      }
    } catch (error) {
      console.error('Error creating meeting:', error);
      toast.error(error.response?.data?.message || 'Failed to create meeting');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinMeeting = () => {
    if (createdMeeting) {
      onMeetingCreated(createdMeeting.meeting);
    }
  };

  const handleClose = () => {
    reset();
    setCreatedMeeting(null);
    setShowQR(false);
    onClose();
  };

  const copyMeetingInfo = () => {
    if (createdMeeting) {
      const meetingInfo = `
Meeting: ${createdMeeting.meeting.title}
Meeting ID: ${createdMeeting.meeting.meetingId}
Join URL: ${createdMeeting.meetingUrl}
${createdMeeting.meeting.requirePassword ? `Password: ${createdMeeting.meeting.meetingPassword}` : ''}
      `.trim();
      
      navigator.clipboard.writeText(meetingInfo);
      toast.success('Meeting info copied to clipboard!');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <VideoCameraIcon className="h-6 w-6 text-primary-600 mr-3" />
            <h2 className="text-xl font-bold text-gray-900">
              {showQR ? 'Meeting Created!' : 'Create New Meeting'}
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {showQR && createdMeeting ? (
            /* Meeting Created View */
            <div className="text-center space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-green-800 mb-2">
                  {createdMeeting.meeting.title}
                </h3>
                <p className="text-green-600">Meeting ID: {createdMeeting.meeting.meetingId}</p>
              </div>

              {/* QR Code */}
              <div className="flex justify-center">
                <div className="bg-gray-100 p-8 rounded-lg border border-dashed border-gray-300">
                  <p className="text-center text-gray-600">QR Code will appear here</p>
                  <p className="text-center text-sm text-gray-500 mt-2">Meeting URL: {createdMeeting.meetingUrl}</p>
                </div>
              </div>

              <p className="text-gray-600">
                Share this QR code or meeting ID with participants
              </p>

              {/* Meeting Info */}
              <div className="bg-gray-50 rounded-lg p-4 text-left space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium">Meeting URL:</span>
                  <span className="text-sm text-gray-600 break-all">
                    {createdMeeting.meetingUrl}
                  </span>
                </div>
                {createdMeeting.meeting.requirePassword && (
                  <div className="flex justify-between">
                    <span className="font-medium">Password:</span>
                    <span className="text-sm text-gray-600">
                      {createdMeeting.meeting.meetingPassword}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="font-medium">Max Participants:</span>
                  <span className="text-sm text-gray-600">
                    {createdMeeting.meeting.maxParticipants}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex space-x-4">
                <button
                  onClick={copyMeetingInfo}
                  className="btn-outline flex-1"
                >
                  Copy Meeting Info
                </button>
                <button
                  onClick={handleJoinMeeting}
                  className="btn-primary flex-1"
                >
                  Join Meeting Now
                </button>
              </div>
            </div>
          ) : (
            /* Create Meeting Form */
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Meeting Details</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Meeting Title *
                  </label>
                  <input
                    type="text"
                    placeholder="Enter meeting title"
                    className={`input-field ${errors.title ? 'border-red-500' : ''}`}
                    {...register('title', {
                      required: 'Meeting title is required',
                      maxLength: {
                        value: 100,
                        message: 'Title cannot exceed 100 characters'
                      }
                    })}
                  />
                  {errors.title && (
                    <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description (Optional)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Enter meeting description"
                    className="input-field resize-none"
                    {...register('description', {
                      maxLength: {
                        value: 500,
                        message: 'Description cannot exceed 500 characters'
                      }
                    })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Participants
                  </label>
                  <select
                    className="input-field"
                    {...register('maxParticipants')}
                  >
                    <option value={10}>10 participants</option>
                    <option value={25}>25 participants</option>
                    <option value={50}>50 participants</option>
                    <option value={100}>100 participants</option>
                  </select>
                </div>
              </div>

              {/* Security Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Security</h3>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="requirePassword"
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    {...register('requirePassword')}
                  />
                  <label htmlFor="requirePassword" className="ml-2 text-sm text-gray-700">
                    Require password to join
                  </label>
                </div>

                {requirePassword && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Meeting Password
                    </label>
                    <input
                      type="text"
                      placeholder="Enter meeting password"
                      className="input-field"
                      {...register('meetingPassword', {
                        required: requirePassword ? 'Password is required when enabled' : false
                      })}
                    />
                    {errors.meetingPassword && (
                      <p className="mt-1 text-sm text-red-600">{errors.meetingPassword.message}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Meeting Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Meeting Settings</h3>
                
                <div className="space-y-3">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="allowChat"
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      {...register('allowChat')}
                    />
                    <label htmlFor="allowChat" className="ml-2 text-sm text-gray-700">
                      Allow chat messages
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="allowScreenShare"
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      {...register('allowScreenShare')}
                    />
                    <label htmlFor="allowScreenShare" className="ml-2 text-sm text-gray-700">
                      Allow screen sharing
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="muteOnJoin"
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      {...register('muteOnJoin')}
                    />
                    <label htmlFor="muteOnJoin" className="ml-2 text-sm text-gray-700">
                      Mute participants on join
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="waitingRoom"
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      {...register('waitingRoom')}
                    />
                    <label htmlFor="waitingRoom" className="ml-2 text-sm text-gray-700">
                      Enable waiting room
                    </label>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-4 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleClose}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`btn-primary ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isLoading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creating...
                    </div>
                  ) : (
                    'Create Meeting'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateMeetingModal;