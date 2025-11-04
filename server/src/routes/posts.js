const express = require('express');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

// Get all posts (feed)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const posts = await req.prisma.post.findMany({
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatar: true,
            email: true
          }
        },
        likes: {
          include: {
            user: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        comments: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                avatar: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({ posts });
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({ error: 'Failed to get posts' });
  }
});

module.exports = router;
