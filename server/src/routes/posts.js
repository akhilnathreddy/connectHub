const express = require('express');
const authMiddleware = require('../middleware/auth');
const upload = require('../middleware/upload');
const router = express.Router();

console.log('DEBUG: posts.js route file loaded');

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

router.get('/', authMiddleware, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    const cursor = req.query.cursor ? parseInt(req.query.cursor) : undefined;
    const filter = req.query.filter;
    const sort = req.query.sort;

    let whereClause = {};

    if (filter === 'friends') {
      const friendships = await req.prisma.userFriend.findMany({
        where: {
          OR: [
            { userId: req.userId },
            { friendId: req.userId }
          ]
        }
      });
      const friendIds = friendships.map(f => f.userId === req.userId ? f.friendId : f.userId);
      whereClause.authorId = { in: friendIds };
    }

    const orderBy = sort === 'oldest'
      ? [{ createdAt: 'asc' }, { id: 'asc' }]
      : [{ createdAt: 'desc' }, { id: 'desc' }];

    const posts = await req.prisma.post.findMany({
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
      where: whereClause,
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
      orderBy: orderBy
    });

    let nextCursor = undefined;
    if (posts.length > limit) {
      posts.pop();
      nextCursor = posts[posts.length - 1].id;
    }

    // Verify limit and pagination
    console.log('DEBUG: GET /posts request. Limit:', limit, 'Cursor:', cursor);
    console.log('DEBUG: Fetched posts count:', posts.length);
    console.log('DEBUG: NextCursor:', nextCursor, 'HasMore:', nextCursor !== undefined);

    const postsWithLikes = posts.map(post => ({
      ...post,
      isLiked: post.likes.some(like => like.userId === req.userId),
      likesCount: post.likes.length,
      commentsCount: post.comments.length
    }));

    const responseData = {
      posts: postsWithLikes,
      pagination: {
        nextCursor,
        hasMore: nextCursor !== undefined
      }
    };
    console.log('DEBUG: Sending response:', JSON.stringify({ ...responseData, posts: '...' })); // Don't log full posts

    res.json(responseData);
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({ error: 'Failed to get posts' });
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

router.delete('/:id/comments/:commentId', authMiddleware, async (req, res) => {
  try {
    const { id: postId, commentId } = req.params;

    const comment = await req.prisma.comment.findUnique({
      where: { id: parseInt(commentId) },
      include: { post: true }
    });

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (comment.postId !== parseInt(postId)) {
      return res.status(400).json({ error: 'Comment does not belong to this post' });
    }

    // Allow deleting if user is comment author OR post author
    if (comment.authorId !== req.userId && comment.post.authorId !== req.userId) {
      return res.status(403).json({ error: 'You can only delete your own comments or comments on your posts' });
    }

    await req.prisma.comment.delete({
      where: { id: parseInt(commentId) }
    });

    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

module.exports = router;
