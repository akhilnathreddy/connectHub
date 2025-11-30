const express = require('express');
const authMiddleware = require('../middleware/auth');
const upload = require('../middleware/upload');
const router = express.Router();

router.get('/search', authMiddleware, async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim().length === 0) {
      return res.json({ users: [] });
    }

    const users = await req.prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } }
        ],
        NOT: { id: req.userId }
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        bio: true,
        createdAt: true
      },
      take: 20
    });

    res.json({ users });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ error: 'Failed to search users' });
  }
});

router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    const user = await req.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        bio: true,
        createdAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const friendship = await req.prisma.userFriend.findFirst({
      where: {
        OR: [
          { userId: req.userId, friendId: userId },
          { userId: userId, friendId: req.userId }
        ]
      }
    });

    const friendRequest = await req.prisma.friendRequest.findFirst({
      where: {
        OR: [
          { senderId: req.userId, receiverId: userId },
          { senderId: userId, receiverId: req.userId }
        ],
        status: 'pending'
      }
    });

    res.json({
      user: {
        ...user,
        isFriend: !!friendship,
        friendRequestStatus: friendRequest
          ? friendRequest.senderId === req.userId
            ? 'sent'
            : 'received'
          : null
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

router.post('/:id/avatar', authMiddleware, upload.single('avatar'), async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    if (userId !== req.userId) {
      return res.status(403).json({ error: 'You can only update your own profile' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const avatarUrl = `/uploads/${req.file.filename}`;

    const user = await req.prisma.user.update({
      where: { id: userId },
      data: { avatar: avatarUrl },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        bio: true,
        updatedAt: true
      }
    });

    res.json({ message: 'Avatar uploaded successfully', user });
  } catch (error) {
    console.error('Upload avatar error:', error);
    res.status(500).json({ error: 'Failed to upload avatar' });
  }
});

router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    if (userId !== req.userId) {
      return res.status(403).json({ error: 'You can only update your own profile' });
    }

    const { name, bio, avatar } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (bio !== undefined) updateData.bio = bio;
    if (avatar !== undefined) updateData.avatar = avatar;

    const user = await req.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        bio: true,
        updatedAt: true
      }
    });

    res.json({ message: 'Profile updated successfully', user });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

router.get('/:id/friends', authMiddleware, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    const friendships = await req.prisma.userFriend.findMany({
      where: {
        OR: [
          { userId: userId },
          { friendId: userId }
        ]
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
            email: true,
            bio: true
          }
        },
        friend: {
          select: {
            id: true,
            name: true,
            avatar: true,
            email: true,
            bio: true
          }
        }
      }
    });

    const friends = friendships.map(friendship => {
      return friendship.userId === userId ? friendship.friend : friendship.user;
    });

    res.json({ friends });
  } catch (error) {
    console.error('Get friends error:', error);
    res.status(500).json({ error: 'Failed to get friends' });
  }
});

router.post('/:id/friend-request', authMiddleware, async (req, res) => {
  try {
    const receiverId = parseInt(req.params.id);

    if (receiverId === req.userId) {
      return res.status(400).json({ error: 'Cannot send friend request to yourself' });
    }

    const receiver = await req.prisma.user.findUnique({
      where: { id: receiverId }
    });

    if (!receiver) {
      return res.status(404).json({ error: 'User not found' });
    }

    const existingFriendship = await req.prisma.userFriend.findFirst({
      where: {
        OR: [
          { userId: req.userId, friendId: receiverId },
          { userId: receiverId, friendId: req.userId }
        ]
      }
    });

    if (existingFriendship) {
      return res.status(400).json({ error: 'Already friends' });
    }

    const existingRequest = await req.prisma.friendRequest.findFirst({
      where: {
        OR: [
          { senderId: req.userId, receiverId: receiverId },
          { senderId: receiverId, receiverId: req.userId }
        ],
        status: 'pending'
      }
    });

    if (existingRequest) {
      return res.status(400).json({ error: 'Friend request already exists' });
    }

    const friendRequest = await req.prisma.friendRequest.create({
      data: {
        senderId: req.userId,
        receiverId: receiverId,
        status: 'pending'
      }
    });

    await req.prisma.notification.create({
      data: {
        type: 'friend_request',
        message: 'sent you a friend request',
        userId: receiverId
      }
    });

    res.status(201).json({
      message: 'Friend request sent',
      friendRequest
    });
  } catch (error) {
    console.error('Send friend request error:', error);
    res.status(500).json({ error: 'Failed to send friend request' });
  }
});

router.patch('/friend-requests/:id/accept', authMiddleware, async (req, res) => {
  try {
    const requestId = parseInt(req.params.id);

    const friendRequest = await req.prisma.friendRequest.findUnique({
      where: { id: requestId }
    });

    if (!friendRequest) {
      return res.status(404).json({ error: 'Friend request not found' });
    }

    if (friendRequest.receiverId !== req.userId) {
      return res.status(403).json({ error: 'You can only accept requests sent to you' });
    }

    if (friendRequest.status !== 'pending') {
      return res.status(400).json({ error: 'Friend request already processed' });
    }

    await req.prisma.friendRequest.update({
      where: { id: requestId },
      data: { status: 'accepted' }
    });

    await req.prisma.userFriend.createMany({
      data: [
        { userId: friendRequest.senderId, friendId: friendRequest.receiverId },
        { userId: friendRequest.receiverId, friendId: friendRequest.senderId }
      ],
      skipDuplicates: true
    });

    res.json({ message: 'Friend request accepted' });
  } catch (error) {
    console.error('Accept friend request error:', error);
    res.status(500).json({ error: 'Failed to accept friend request' });
  }
});

router.patch('/friend-requests/:id/reject', authMiddleware, async (req, res) => {
  try {
    const requestId = parseInt(req.params.id);

    const friendRequest = await req.prisma.friendRequest.findUnique({
      where: { id: requestId }
    });

    if (!friendRequest) {
      return res.status(404).json({ error: 'Friend request not found' });
    }

    if (friendRequest.receiverId !== req.userId) {
      return res.status(403).json({ error: 'You can only reject requests sent to you' });
    }

    await req.prisma.friendRequest.update({
      where: { id: requestId },
      data: { status: 'rejected' }
    });

    res.json({ message: 'Friend request rejected' });
  } catch (error) {
    console.error('Reject friend request error:', error);
    res.status(500).json({ error: 'Failed to reject friend request' });
  }
});

router.get('/friend-requests/all', authMiddleware, async (req, res) => {
  try {
    const sentRequests = await req.prisma.friendRequest.findMany({
      where: {
        senderId: req.userId,
        status: 'pending'
      },
      include: {
        receiver: {
          select: {
            id: true,
            name: true,
            avatar: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const receivedRequests = await req.prisma.friendRequest.findMany({
      where: {
        receiverId: req.userId,
        status: 'pending'
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatar: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      sent: sentRequests,
      received: receivedRequests
    });
  } catch (error) {
    console.error('Get friend requests error:', error);
    res.status(500).json({ error: 'Failed to get friend requests' });
  }
});

router.delete('/:id/friend', authMiddleware, async (req, res) => {
  try {
    const friendId = parseInt(req.params.id);

    if (friendId === req.userId) {
      return res.status(400).json({ error: 'Cannot remove yourself' });
    }

    await req.prisma.userFriend.deleteMany({
      where: {
        OR: [
          { userId: req.userId, friendId: friendId },
          { userId: friendId, friendId: req.userId }
        ]
      }
    });

    res.json({ message: 'Friend removed successfully' });
  } catch (error) {
    console.error('Remove friend error:', error);
    res.status(500).json({ error: 'Failed to remove friend' });
  }
});

module.exports = router;
