const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  joinedAt: {
    type: Date,
    default: Date.now
  },
  isMuted: {
    type: Boolean,
    default: false
  },
  isVideoOn: {
    type: Boolean,
    default: true
  },
  isHost: {
    type: Boolean,
    default: false
  }
});

const meetingSchema = new mongoose.Schema({
  meetingId: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    minlength: 6,
    maxlength: 10
  },
  hostId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    default: function() {
      // Default expiry: 24 hours from creation
      return new Date(Date.now() + 24 * 60 * 60 * 1000);
    }
  },
  participants: [participantSchema],
  maxParticipants: {
    type: Number,
    default: 50
  },
  requirePassword: {
    type: Boolean,
    default: false
  },
  meetingPassword: {
    type: String,
    default: null
  },
  settings: {
    allowChat: {
      type: Boolean,
      default: true
    },
    allowScreenShare: {
      type: Boolean,
      default: true
    },
    muteOnJoin: {
      type: Boolean,
      default: false
    },
    waitingRoom: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true
});

// Index for efficient queries
// meetingId already has unique index from schema definition
meetingSchema.index({ hostId: 1 });
meetingSchema.index({ isActive: 1 });
meetingSchema.index({ expiresAt: 1 });

// Generate unique meeting ID
meetingSchema.statics.generateMeetingId = async function() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let meetingId;
  let isUnique = false;
  
  while (!isUnique) {
    meetingId = '';
    for (let i = 0; i < 8; i++) {
      meetingId += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    
    const existingMeeting = await this.findOne({ meetingId });
    if (!existingMeeting) {
      isUnique = true;
    }
  }
  
  return meetingId;
};

// Add participant to meeting
meetingSchema.methods.addParticipant = function(userId, name, isHost = false) {
  const existingParticipant = this.participants.find(p => p.userId.toString() === userId.toString());
  
  if (existingParticipant) {
    return existingParticipant;
  }
  
  if (this.participants.length >= this.maxParticipants) {
    throw new Error('Meeting is full');
  }
  
  const participant = {
    userId,
    name,
    isHost
  };
  
  this.participants.push(participant);
  return participant;
};

// Remove participant from meeting
meetingSchema.methods.removeParticipant = function(userId) {
  this.participants = this.participants.filter(p => p.userId.toString() !== userId.toString());
};

// Update participant status
meetingSchema.methods.updateParticipant = function(userId, updates) {
  const participant = this.participants.find(p => p.userId.toString() === userId.toString());
  if (participant) {
    Object.assign(participant, updates);
  }
  return participant;
};

// Check if user is host
meetingSchema.methods.isUserHost = function(userId) {
  return this.hostId.toString() === userId.toString();
};

// Auto-remove expired meetings (commented out for debugging)
// meetingSchema.pre('find', function() {
//   this.where({ expiresAt: { $gt: new Date() } });
// });

// meetingSchema.pre('findOne', function() {
//   this.where({ expiresAt: { $gt: new Date() } });
// });

module.exports = mongoose.model('Meeting', meetingSchema);