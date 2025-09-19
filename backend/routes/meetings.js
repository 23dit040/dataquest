const express = require('express');
const QRCode = require('qrcode');
const Meeting = require('../models/Meeting');
const User = require('../models/User');
const authenticateToken = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/meetings/create
// @desc    Create a new meeting
// @access  Private
router.post('/create', authenticateToken, async (req, res) => {
  try {
    console.log('Creating meeting for user:', req.user._id, req.user.name);
    const { title, description, maxParticipants, requirePassword, meetingPassword, settings } = req.body;

    // Validation
    if (!title || title.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Meeting title is required'
      });
    }

    // Generate unique meeting ID
    const meetingId = await Meeting.generateMeetingId();
    console.log('Generated meeting ID:', meetingId);

    // Create meeting
    const meeting = new Meeting({
      meetingId,
      hostId: req.user._id,
      title: title.trim(),
      description: description?.trim() || '',
      maxParticipants: maxParticipants || 50,
      requirePassword: requirePassword || false,
      meetingPassword: requirePassword ? meetingPassword : null,
      settings: {
        allowChat: settings?.allowChat !== undefined ? settings.allowChat : true,
        allowScreenShare: settings?.allowScreenShare !== undefined ? settings.allowScreenShare : true,
        muteOnJoin: settings?.muteOnJoin !== undefined ? settings.muteOnJoin : false,
        waitingRoom: settings?.waitingRoom !== undefined ? settings.waitingRoom : false
      }
    });

    // Add host as first participant
    meeting.addParticipant(req.user._id, req.user.name, true);

    await meeting.save();
    console.log('Meeting saved to database:', meeting._id);

    // Generate QR code for meeting
    const meetingUrl = `${process.env.FRONTEND_URL}/meeting/${meetingId}`;
    const qrCodeDataUrl = await QRCode.toDataURL(meetingUrl, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    const responseData = {
      success: true,
      message: 'Meeting created successfully',
      data: {
        meeting: {
          id: meeting._id,
          meetingId: meeting.meetingId,
          title: meeting.title,
          description: meeting.description,
          hostId: meeting.hostId,
          isActive: meeting.isActive,
          createdAt: meeting.createdAt,
          expiresAt: meeting.expiresAt,
          participants: meeting.participants,
          maxParticipants: meeting.maxParticipants,
          requirePassword: meeting.requirePassword,
          settings: meeting.settings
        },
        meetingUrl,
        qrCode: qrCodeDataUrl
      }
    };

    console.log('Sending response for created meeting');
    res.status(201).json(responseData);

  } catch (error) {
    console.error('Create meeting error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// @route   GET /api/meetings/public/:meetingId
// @desc    Get public meeting details (no auth required)
// @access  Public
router.get('/public/:meetingId', async (req, res) => {
  try {
    const { meetingId } = req.params;

    const meeting = await Meeting.findOne({ 
      meetingId: meetingId.toUpperCase(),
      isActive: true 
    }).populate('hostId', 'name email').select('-participants.socketId');

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found or has ended'
      });
    }

    // Return limited meeting info for public access
    res.json({
      success: true,
      data: {
        meeting: {
          id: meeting._id,
          meetingId: meeting.meetingId,
          title: meeting.title,
          description: meeting.description,
          hostName: meeting.hostId.name,
          maxParticipants: meeting.maxParticipants,
          currentParticipants: meeting.participants.length,
          requirePassword: meeting.requirePassword,
          isActive: meeting.isActive,
          createdAt: meeting.createdAt,
          settings: meeting.settings
        }
      }
    });

  } catch (error) {
    console.error('Get public meeting error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// @route   POST /api/meetings/join/:meetingId
// @desc    Join a meeting
// @access  Private
router.post('/join/:meetingId', authenticateToken, async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { password } = req.body;

    // Find meeting
    const meeting = await Meeting.findOne({ 
      meetingId: meetingId.toUpperCase(),
      isActive: true 
    }).populate('hostId', 'name email');

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found or has ended'
      });
    }

    // Check if meeting requires password
    if (meeting.requirePassword && meeting.meetingPassword !== password) {
      return res.status(401).json({
        success: false,
        message: 'Invalid meeting password'
      });
    }

    // Check if meeting is full
    if (meeting.participants.length >= meeting.maxParticipants) {
      return res.status(400).json({
        success: false,
        message: 'Meeting is full'
      });
    }

    // Check if user is already in meeting
    const existingParticipant = meeting.participants.find(
      p => p.userId.toString() === req.user._id.toString()
    );

    if (existingParticipant) {
      return res.json({
        success: true,
        message: 'Already in meeting',
        data: {
          meeting: {
            id: meeting._id,
            meetingId: meeting.meetingId,
            title: meeting.title,
            description: meeting.description,
            hostId: meeting.hostId,
            isActive: meeting.isActive,
            participants: meeting.participants,
            settings: meeting.settings
          },
          participant: existingParticipant
        }
      });
    }

    // Add user to meeting
    const participant = meeting.addParticipant(req.user._id, req.user.name);
    await meeting.save();

    // Emit to socket room that new participant joined
    if (req.io) {
      req.io.to(meetingId).emit('participant-joined', {
        participant,
        meeting: {
          id: meeting._id,
          meetingId: meeting.meetingId,
          participants: meeting.participants
        }
      });
    }

    res.json({
      success: true,
      message: 'Successfully joined meeting',
      data: {
        meeting: {
          id: meeting._id,
          meetingId: meeting.meetingId,
          title: meeting.title,
          description: meeting.description,
          hostId: meeting.hostId,
          isActive: meeting.isActive,
          participants: meeting.participants,
          settings: meeting.settings
        },
        participant
      }
    });

  } catch (error) {
    console.error('Join meeting error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// @route   GET /api/meetings/:meetingId
// @desc    Get meeting details
// @access  Private
router.get('/:meetingId', authenticateToken, async (req, res) => {
  try {
    const { meetingId } = req.params;

    const meeting = await Meeting.findOne({ 
      meetingId: meetingId.toUpperCase(),
      isActive: true 
    }).populate('hostId', 'name email');

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found or has ended'
      });
    }

    // Check if user is participant
    const isParticipant = meeting.participants.some(
      p => p.userId.toString() === req.user._id.toString()
    );

    const isHost = meeting.isUserHost(req.user._id);

    if (!isParticipant && !isHost) {
      return res.status(403).json({
        success: false,
        message: 'Access denied - not a participant'
      });
    }

    res.json({
      success: true,
      data: {
        meeting: {
          id: meeting._id,
          meetingId: meeting.meetingId,
          title: meeting.title,
          description: meeting.description,
          hostId: meeting.hostId,
          isActive: meeting.isActive,
          createdAt: meeting.createdAt,
          expiresAt: meeting.expiresAt,
          participants: meeting.participants,
          maxParticipants: meeting.maxParticipants,
          requirePassword: meeting.requirePassword,
          settings: meeting.settings
        },
        isHost
      }
    });

  } catch (error) {
    console.error('Get meeting error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// @route   GET /api/meetings
// @desc    Get user's meetings
// @access  Private
router.get('/', authenticateToken, async (req, res) => {
  try {
    console.log('GET /api/meetings - User ID:', req.user._id);
    const { page = 1, limit = 10, type = 'all' } = req.query;

    let query = {};

    if (type === 'hosted') {
      query.hostId = req.user._id;
    } else if (type === 'joined') {
      query['participants.userId'] = req.user._id;
    } else {
      // All meetings where user is host or participant
      query.$or = [
        { hostId: req.user._id },
        { 'participants.userId': req.user._id }
      ];
    }

    console.log('Query:', JSON.stringify(query, null, 2));

    const meetings = await Meeting.find(query)
      .populate('hostId', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    console.log('Found meetings:', meetings.length);

    const total = await Meeting.countDocuments(query);
    console.log('Total meetings count:', total);

    // Let's also check all meetings in the database
    const allMeetings = await Meeting.find({});
    console.log('All meetings in database:', allMeetings.length);

    res.json({
      success: true,
      data: {
        meetings: meetings.map(meeting => ({
          id: meeting._id,
          meetingId: meeting.meetingId,
          title: meeting.title,
          description: meeting.description,
          hostId: meeting.hostId,
          isActive: meeting.isActive,
          createdAt: meeting.createdAt,
          expiresAt: meeting.expiresAt,
          participantCount: meeting.participants.length,
          maxParticipants: meeting.maxParticipants,
          isHost: meeting.isUserHost(req.user._id)
        })),
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalMeetings: total,
          hasNext: page * limit < total,
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get meetings error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// @route   DELETE /api/meetings/:meetingId
// @desc    Delete meeting permanently (Host only)
// @access  Private
router.delete('/:meetingId', authenticateToken, async (req, res) => {
  try {
    const { meetingId } = req.params;

    const meeting = await Meeting.findOne({ 
      meetingId: meetingId.toUpperCase()
    });

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found'
      });
    }

    // Check if user is the host
    if (!meeting.isUserHost(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Only the host can delete the meeting'
      });
    }

    // Emit to all participants that meeting has been deleted
    if (req.io) {
      req.io.to(meetingId).emit('meeting-deleted', {
        message: 'Meeting has been deleted by the host',
        meetingId: meeting.meetingId
      });
    }

    // Delete the meeting permanently from database
    await Meeting.findOneAndDelete({ meetingId: meetingId.toUpperCase() });

    res.json({
      success: true,
      message: 'Meeting deleted successfully'
    });

  } catch (error) {
    console.error('Delete meeting error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// @route   POST /api/meetings/:meetingId/leave
// @desc    Leave meeting
// @access  Private
router.post('/:meetingId/leave', authenticateToken, async (req, res) => {
  try {
    const { meetingId } = req.params;

    const meeting = await Meeting.findOne({ 
      meetingId: meetingId.toUpperCase(),
      isActive: true 
    });

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found or has ended'
      });
    }

    // Remove participant
    meeting.removeParticipant(req.user._id);
    await meeting.save();

    // Emit to socket room that participant left
    if (req.io) {
      req.io.to(meetingId).emit('participant-left', {
        userId: req.user._id,
        name: req.user.name,
        meeting: {
          id: meeting._id,
          meetingId: meeting.meetingId,
          participants: meeting.participants
        }
      });
    }

    res.json({
      success: true,
      message: 'Successfully left meeting'
    });

  } catch (error) {
    console.error('Leave meeting error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;