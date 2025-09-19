import React, { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { XMarkIcon, PaperAirplaneIcon, FaceSmileIcon } from '@heroicons/react/24/outline';

const ChatPanel = ({ messages, onSendMessage, onClose }) => {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef(null);
  const { register, handleSubmit, reset, watch } = useForm();

  const messageText = watch('message', '');

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const onSubmit = (data) => {
    if (data.message.trim()) {
      onSendMessage(data.message.trim());
      reset();
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const addEmoji = (emoji) => {
    const currentMessage = messageText || '';
    register('message').onChange({
      target: { value: currentMessage + emoji }
    });
    setShowEmojiPicker(false);
  };

  const commonEmojis = ['😀', '😂', '🥰', '😍', '🤔', '👍', '👏', '🔥', '💯', '❤️'];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Chat</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <p>No messages yet.</p>
            <p className="text-sm">Start the conversation!</p>
          </div>
        ) : (
          messages.map((message, index) => (
            <div key={message.id || index} className="flex flex-col">
              <div className="flex items-start space-x-2">
                {/* Avatar */}
                <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs font-medium">
                    {message.userName
                      .split(' ')
                      .map(n => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2)}
                  </span>
                </div>
                
                {/* Message Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-sm font-medium text-gray-900">
                      {message.userName}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatTime(message.timestamp)}
                    </span>
                  </div>
                  
                  <div className="bg-gray-100 rounded-lg px-3 py-2">
                    <p className="text-sm text-gray-800 break-words">
                      {message.message}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Emoji Picker */}
      {showEmojiPicker && (
        <div className="border-t border-gray-200 p-3">
          <div className="grid grid-cols-5 gap-2">
            {commonEmojis.map((emoji, index) => (
              <button
                key={index}
                onClick={() => addEmoji(emoji)}
                className="text-2xl hover:bg-gray-100 rounded p-1 transition-colors"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Message Input */}
      <div className="border-t border-gray-200 p-4">
        <form onSubmit={handleSubmit(onSubmit)} className="flex space-x-2">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Type a message..."
              className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              {...register('message', { required: true })}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(onSubmit)();
                }
              }}
            />
            
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <FaceSmileIcon className="h-5 w-5" />
            </button>
          </div>
          
          <button
            type="submit"
            disabled={!messageText?.trim()}
            className={`p-2 rounded-lg transition-colors ${
              messageText?.trim()
                ? 'bg-primary-600 hover:bg-primary-700 text-white'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <PaperAirplaneIcon className="h-5 w-5" />
          </button>
        </form>
        
        <p className="text-xs text-gray-500 mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
};

export default ChatPanel;