import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { XMarkIcon, QrCodeIcon, KeyIcon } from '@heroicons/react/24/outline';
import { meetingAPI } from '../services/api';
import toast from 'react-hot-toast';

const JoinMeetingModal = ({ isOpen, onClose, onJoinMeeting }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [meetingInfo, setMeetingInfo] = useState(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors }
  } = useForm({
    defaultValues: {
      meetingId: '',
      password: ''
    }
  });

  const meetingId = watch('meetingId');

  const onSubmit = async (data) => {
    try {
      setIsLoading(true);
      
      const response = await meetingAPI.joinMeeting(data.meetingId.toUpperCase(), data.password);
      
      if (response.success) {
        toast.success('Successfully joined meeting!');
        onJoinMeeting(data.meetingId.toUpperCase());
        handleClose();
      }
    } catch (error) {
      console.error('Error joining meeting:', error);
      
      if (error.response?.status === 401 && error.response?.data?.message?.includes('password')) {
        setNeedsPassword(true);
        setMeetingInfo({ meetingId: data.meetingId.toUpperCase() });
        toast.error('Meeting requires a password');
      } else {
        toast.error(error.response?.data?.message || 'Failed to join meeting');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    reset();
    setNeedsPassword(false);
    setMeetingInfo(null);
    setShowQRScanner(false);
    onClose();
  };

  const handleQRScan = (meetingId) => {
    setValue('meetingId', meetingId);
    setShowQRScanner(false);
  };

  const formatMeetingId = (value) => {
    // Remove any non-alphanumeric characters and convert to uppercase
    const cleaned = value.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    
    // Add dashes for readability (ABC-123-XYZ format)
    if (cleaned.length > 3 && cleaned.length <= 6) {
      return cleaned.substring(0, 3) + '-' + cleaned.substring(3);
    } else if (cleaned.length > 6) {
      return cleaned.substring(0, 3) + '-' + cleaned.substring(3, 6) + '-' + cleaned.substring(6, 9);
    }
    
    return cleaned;
  };

  const handleMeetingIdChange = (e) => {
    const formatted = formatMeetingId(e.target.value);
    setValue('meetingId', formatted);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <QrCodeIcon className="h-6 w-6 text-primary-600 mr-3" />
            <h2 className="text-xl font-bold text-gray-900">Join Meeting</h2>
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
          {showQRScanner ? (
            /* QR Scanner View */
            <div className="text-center space-y-4">
              <div className="bg-gray-100 rounded-lg p-8 mb-4">
                <QrCodeIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">QR Scanner would be implemented here</p>
                <p className="text-sm text-gray-500 mt-2">
                  For now, please enter the meeting ID manually
                </p>
              </div>
              
              <button
                onClick={() => setShowQRScanner(false)}
                className="btn-outline w-full"
              >
                Enter Meeting ID Instead
              </button>
            </div>
          ) : (
            /* Join Form */
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Join Options */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <button
                  type="button"
                  className="p-4 border-2 border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors"
                  onClick={() => setShowQRScanner(true)}
                >
                  <QrCodeIcon className="h-8 w-8 text-gray-600 mx-auto mb-2" />
                  <span className="text-sm font-medium text-gray-700">Scan QR Code</span>
                </button>
                
                <div className="p-4 border-2 border-primary-300 bg-primary-50 rounded-lg">
                  <KeyIcon className="h-8 w-8 text-primary-600 mx-auto mb-2" />
                  <span className="text-sm font-medium text-primary-700">Enter Meeting ID</span>
                </div>
              </div>

              {/* Meeting ID */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Meeting ID
                </label>
                <input
                  type="text"
                  placeholder="ABC-123-XYZ"
                  maxLength="11"
                  className={`input-field text-center text-lg font-mono tracking-wider ${errors.meetingId ? 'border-red-500' : ''}`}
                  {...register('meetingId', {
                    required: 'Meeting ID is required',
                    minLength: {
                      value: 6,
                      message: 'Meeting ID must be at least 6 characters'
                    },
                    pattern: {
                      value: /^[A-Z0-9-]+$/,
                      message: 'Meeting ID can only contain letters, numbers, and dashes'
                    }
                  })}
                  onChange={handleMeetingIdChange}
                />
                {errors.meetingId && (
                  <p className="mt-1 text-sm text-red-600">{errors.meetingId.message}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Format: ABC-123-XYZ (dashes are optional)
                </p>
              </div>

              {/* Password (if needed) */}
              {needsPassword && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Meeting Password
                  </label>
                  <input
                    type="password"
                    placeholder="Enter meeting password"
                    className={`input-field ${errors.password ? 'border-red-500' : ''}`}
                    {...register('password', {
                      required: needsPassword ? 'Password is required for this meeting' : false
                    })}
                  />
                  {errors.password && (
                    <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
                  )}
                </div>
              )}

              {/* Meeting Info */}
              {meetingInfo && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm text-yellow-800">
                    <strong>Meeting ID:</strong> {meetingInfo.meetingId}
                  </p>
                  <p className="text-sm text-yellow-600 mt-1">
                    This meeting requires a password to join.
                  </p>
                </div>
              )}

              {/* Quick Join Options */}
              {!needsPassword && meetingId && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-blue-800 mb-2">Quick Join Options:</h4>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        defaultChecked
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-blue-700">Join with camera on</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        defaultChecked
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-blue-700">Join with microphone on</span>
                    </label>
                  </div>
                </div>
              )}

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
                  disabled={isLoading || !meetingId}
                  className={`btn-primary ${(isLoading || !meetingId) ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isLoading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Joining...
                    </div>
                  ) : (
                    'Join Meeting'
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

export default JoinMeetingModal;