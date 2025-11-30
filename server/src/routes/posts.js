const express = require('express');
const authMiddleware = require('../middleware/auth');
const upload = require('../middleware/upload');
const router = express.Router();

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

    const postsWithLikes = posts.map(post => ({
      ...post,
      isLiked: post.likes.some(like => like.userId === req.userId),
      likesCount: post.likes.length,
      commentsCount: post.comments.length
    }));

    res.json({ posts: postsWithLikes });
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({ error: 'Failed to get posts' });
  }
});

router.post('/upload-image', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const imageUrl = `/uploads/${req.file.filename}`;
    res.json({ imageUrl });
  } catch (error) {
    console.error('Upload image error:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { content, imageUrl } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Post content is required' });
    }

    const post = await req.prisma.post.create({
      data: {
        content: content.trim(),
        imageUrl: imageUrl || null,
        authorId: req.userId
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatar: true,
            email: true
          }
        },
        likes: true,
        comments: true
      }
    });

    res.status(201).json({
      message: 'Post created successfully',
      post: {
        ...post,
        isLiked: false,
        likesCount: 0,
        commentsCount: 0
      }
    });
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const { content, imageUrl } = req.body;

    const existingPost = await req.prisma.post.findUnique({
      where: { id: postId }
    });

    if (!existingPost) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (existingPost.authorId !== req.userId) {
      return res.status(403).json({ error: 'You can only edit your own posts' });
    }

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Post content is required' });
    }

    const post = await req.prisma.post.update({
      where: { id: postId },
      data: {
        content: content.trim(),
        imageUrl: imageUrl !== undefined ? imageUrl : existingPost.imageUrl
      },
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
      }
    });

    res.json({
      message: 'Post updated successfully',
      post: {
        ...post,
        isLiked: post.likes.some(like => like.userId === req.userId),
        likesCount: post.likes.length,
        commentsCount: post.comments.length
      }
    });
  } catch (error) {
    console.error('Update post error:', error);
    res.status(500).json({ error: 'Failed to update post' });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const postId = parseInt(req.params.id);

    const existingPost = await req.prisma.post.findUnique({
      where: { id: postId }
    });

    if (!existingPost) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (existingPost.authorId !== req.userId) {
      return res.status(403).json({ error: 'You can only delete your own posts' });
    }

    await req.prisma.post.delete({
      where: { id: postId }
    });

    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

router.patch('/:id/like', authMiddleware, async (req, res) => {
  try {
    const postId = parseInt(req.params.id);

    const post = await req.prisma.post.findUnique({
      where: { id: postId }
    });

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const existingLike = await req.prisma.like.findUnique({
      where: {
        postId_userId: {
          postId,
          userId: req.userId
        }
      }
    });

    if (existingLike) {
      await req.prisma.like.delete({
        where: {
          postId_userId: {
            postId,
            userId: req.userId
          }
        }
      });

      res.json({ message: 'Post unliked', liked: false });
    } else {
      await req.prisma.like.create({
        data: {
          postId,
          userId: req.userId
        }
      });

      if (post.authorId !== req.userId) {
        await req.prisma.notification.create({
          data: {
            type: 'like',
            message: 'liked your post',
            userId: post.authorId
          }
        });
      }

      res.json({ message: 'Post liked', liked: true });
    }
  } catch (error) {
    console.error('Like post error:', error);
    res.status(500).json({ error: 'Failed to like/unlike post' });
  }
});

router.post('/:id/comment', authMiddleware, async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    const post = await req.prisma.post.findUnique({
      where: { id: postId }
    });

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const comment = await req.prisma.comment.create({
      data: {
        content: content.trim(),
        postId,
        authorId: req.userId
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        }
      }
    });

    if (post.authorId !== req.userId) {
      await req.prisma.notification.create({
        data: {
          type: 'comment',
          message: 'commented on your post',
          userId: post.authorId
        }
      });
    }

    res.status(201).json({
      message: 'Comment added successfully',
      comment
    });
  } catch (error) {
    console.error('Comment error:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

module.exports = router;
