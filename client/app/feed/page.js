'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../../components/Navbar';
import { isAuthenticated, getUser } from '../../lib/auth';
import { postsAPI, getImageUrl } from '../../lib/api';

export default function FeedPage() {
  const router = useRouter();
  const [filter, setFilter] = useState('all'); // 'all' or 'friends'
  const [sort, setSort] = useState('latest'); // 'latest' or 'oldest'
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState([]);
  const [user, setUser] = useState(null);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [postContent, setPostContent] = useState('');
  const [postImage, setPostImage] = useState(null);
  const [postImageUrl, setPostImageUrl] = useState('');
  const [creatingPost, setCreatingPost] = useState(false);
  const [commentContent, setCommentContent] = useState({});
  const [commenting, setCommenting] = useState({});

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }

    setUser(getUser());
    loadPosts();
  }, [router]); // Initial load only. Filter/Sort changes handle their own reloads

  // Reload when filter or sort changes
  useEffect(() => {
    if (user) {
      setPosts([]);
      setNextCursor(null);
      setHasMore(true);
      loadPosts(null, filter, sort);
    }
  }, [filter, sort]);

  const loadPosts = async (cursor = null, currentFilter = filter, currentSort = sort) => {
    console.log('loadPosts called with cursor:', cursor, 'filter:', currentFilter, 'sort:', currentSort);
    try {
      if (!cursor) {
        console.log('Loading initial posts...');
        setLoading(true);
      } else {
        console.log('Loading more posts...');
        setLoadingMore(true);
      }

      const data = await postsAPI.getAll(cursor, 5, currentFilter, currentSort);
      console.log('API Response:', data);

      if (!cursor) {
        setPosts(data.posts);
      } else {
        setPosts(prev => {
          // Deduplicate: avoid adding posts that already exist
          const existingIds = new Set(prev.map(p => p.id));
          const newPosts = data.posts.filter(p => !existingIds.has(p.id));
          return [...prev, ...newPosts];
        });
      }

      console.log('Setting nextCursor:', data.pagination.nextCursor);
      console.log('Setting hasMore:', data.pagination.hasMore);
      setNextCursor(data.pagination.nextCursor);
      setHasMore(data.pagination.hasMore);
    } catch (error) {
      console.error('Failed to load posts:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const [editingPost, setEditingPost] = useState(null); // postId
  const [editContent, setEditContent] = useState('');

  const handleStartEdit = (post) => {
    setEditingPost(post.id);
    setEditContent(post.content);
  };

  const handleCancelEdit = () => {
    setEditingPost(null);
    setEditContent('');
  };

  const handleUpdatePost = async (postId) => {
    if (!editContent.trim()) return;

    try {
      await postsAPI.update(postId, { content: editContent });
      setPosts(posts.map(p => p.id === postId ? { ...p, content: editContent } : p));
      setEditingPost(null);
      setEditContent('');
    } catch (error) {
      console.error('Failed to update post:', error);
      alert('Failed to update post');
    }
  };

  const handleDeleteComment = async (postId, commentId) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    try {
      await postsAPI.deleteComment(postId, commentId);
      setPosts(posts.map(p => {
        if (p.id === postId) {
          return {
            ...p,
            comments: p.comments.filter(c => c.id !== commentId),
            commentsCount: p.commentsCount - 1
          };
        }
        return p;
      }));
    } catch (error) {
      console.error('Failed to delete comment:', error);
      alert('Failed to delete comment');
    }
  };

  const handleImageSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setPostImage(file);
    setCreatingPost(true);

    try {
      const data = await postsAPI.uploadImage(file);
      setPostImageUrl(data.imageUrl);
    } catch (error) {
      console.error('Failed to upload image:', error);
      alert('Failed to upload image');
    } finally {
      setCreatingPost(false);
    }
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!postContent.trim() && !postImageUrl) return;

    setCreatingPost(true);
    try {
      await postsAPI.create({
        content: postContent,
        imageUrl: postImageUrl
      });
      setPostContent('');
      setPostImage(null);
      setPostImageUrl('');
      document.getElementById('image-input').value = '';

      // If we are sorting by oldest, we might not see the new post immediately unless we reload or it's logically correct to append.
      // But typically we want to see our new post. 
      // Simplest is to reload if sort is 'latest', otherwise just notify.
      // For now, let's reload to ensure consistency.
      loadPosts(null, filter, sort);
    } catch (error) {
      console.error('Failed to create post:', error);
      alert('Failed to create post');
    } finally {
      setCreatingPost(false);
    }
  };

  const handleLike = async (postId) => {
    try {
      await postsAPI.like(postId);
      // Optimistic update or reload? Reloading is safest for now but could be optimized.
      // Ideally we update the specific post in local state.
      // For now, reloading might reset scroll?
      // Better to update local state logic.
      setPosts(posts.map(p => {
        if (p.id === postId) {
          // Toggle like logic roughly:
          const isLiked = !p.isLiked;
          return {
            ...p,
            isLiked,
            likesCount: isLiked ? p.likesCount + 1 : p.likesCount - 1
          };
        }
        return p;
      }));
    } catch (error) {
      console.error('Failed to like post:', error);
      loadPosts(); // Fallback on error
    }
  };

  const handleComment = async (postId) => {
    const content = commentContent[postId];
    if (!content || !content.trim()) return;

    setCommenting({ ...commenting, [postId]: true });
    try {
      const response = await postsAPI.comment(postId, content);
      setCommentContent({ ...commentContent, [postId]: '' });
      // Update local state with new comment
      setPosts(posts.map(p => {
        if (p.id === postId) {
          return {
            ...p,
            comments: [response.comment, ...(p.comments || [])],
            commentsCount: (p.commentsCount || 0) + 1
          };
        }
        return p;
      }));
    } catch (error) {
      console.error('Failed to add comment:', error);
      alert('Failed to add comment');
    } finally {
      setCommenting({ ...commenting, [postId]: false });
    }
  };

  const handleDeletePost = async (postId) => {
    if (!confirm('Are you sure you want to delete this post?')) return;

    try {
      await postsAPI.delete(postId);
      setPosts(posts.filter(p => p.id !== postId));
    } catch (error) {
      console.error('Failed to delete post:', error);
      alert('Failed to delete post');
    }
  };

  if (loading && posts.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Create Post Form */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <form onSubmit={handleCreatePost} className="space-y-4">
            <textarea
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              placeholder="What's on your mind?"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white outline-none resize-none"
              rows="3"
            />
            {postImageUrl && (
              <div className="relative">
                <img
                  src={getImageUrl(postImageUrl)}
                  alt="Preview"
                  className="w-full max-h-64 object-cover rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => {
                    setPostImageUrl('');
                    setPostImage(null);
                    document.getElementById('image-input').value = '';
                  }}
                  className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-2 hover:bg-red-700"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
            <div className="flex items-center justify-between">
              <label className="cursor-pointer">
                <input
                  id="image-input"
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
                <span className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors inline-flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Add Image
                </span>
              </label>
              <button
                type="submit"
                disabled={creatingPost || (!postContent.trim() && !postImageUrl)}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creatingPost ? 'Posting...' : 'Post'}
              </button>
            </div>
          </form>
        </div>

        {/* Filters and Sort */}
        <div className="flex items-center justify-between mb-6 bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <div className="flex items-center gap-4">
            <span className="text-gray-700 dark:text-gray-300 font-medium">Filter:</span>
            <div className="flex rounded-md shadow-sm" role="group">
              <button
                type="button"
                onClick={() => setFilter('all')}
                className={`px-4 py-2 text-sm font-medium rounded-l-lg border ${filter === 'all'
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                  }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setFilter('friends')}
                className={`px-4 py-2 text-sm font-medium rounded-r-lg border-t border-b border-r ${filter === 'friends'
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                  }`}
              >
                Friends
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-gray-700 dark:text-gray-300 font-medium">Sort:</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md dark:bg-gray-700 dark:text-white"
            >
              <option value="latest">Latest</option>
              <option value="oldest">Oldest</option>
            </select>
          </div>
        </div>

        {/* Posts Feed */}
        <div className="space-y-6">
          {posts.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
              <p className="text-gray-600 dark:text-gray-400">
                {filter === 'friends' ? 'No posts from friends yet.' : 'No posts yet. Be the first to post!'}
              </p>
            </div>
          ) : (
            posts.map((post) => (
              <div key={post.id} className="bg-white dark:bg-gray-800 rounded-lg shadow">
                <div className="p-6">
                  {/* Post Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {post.author.avatar ? (
                        <img
                          src={getImageUrl(post.author.avatar)}
                          alt={post.author.name || post.author.email}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-semibold">
                          {(post.author.name || post.author.email || 'U').charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {post.author.name || post.author.email}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {new Date(post.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                    {post.author.id === user?.id && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleStartEdit(post)}
                          className="text-gray-600 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 p-1"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeletePost(post.id)}
                          className="text-red-600 hover:text-red-700 p-1"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Post Content */}
                  {editingPost === post.id ? (
                    <div className="mb-4">
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white outline-none resize-none"
                        rows="3"
                      />
                      <div className="flex justify-end gap-2 mt-2">
                        <button
                          onClick={handleCancelEdit}
                          className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleUpdatePost(post.id)}
                          className="px-3 py-1 text-sm bg-indigo-600 text-white hover:bg-indigo-700 rounded"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-900 dark:text-white mb-4 whitespace-pre-wrap">{post.content}</p>
                  )}

                  {/* Post Image */}
                  {post.imageUrl && (
                    <img
                      src={getImageUrl(post.imageUrl)}
                      alt="Post"
                      className="w-full rounded-lg mb-4"
                    />
                  )}

                  {/* Post Actions */}
                  <div className="flex items-center gap-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => handleLike(post.id)}
                      className={`flex items-center gap-2 transition-colors ${post.isLiked
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400'
                        }`}
                    >
                      <svg className="w-5 h-5" fill={post.isLiked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                      <span>{post.likesCount || 0}</span>
                    </button>
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <span>{post.commentsCount || 0}</span>
                    </div>
                  </div>

                  {/* Comments Section */}
                  <div className="mt-4 space-y-4">
                    {/* Comment Input */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={commentContent[post.id] || ''}
                        onChange={(e) => setCommentContent({ ...commentContent, [post.id]: e.target.value })}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleComment(post.id);
                          }
                        }}
                        placeholder="Write a comment..."
                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white outline-none"
                      />
                      <button
                        onClick={() => handleComment(post.id)}
                        disabled={commenting[post.id] || !commentContent[post.id]?.trim()}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {commenting[post.id] ? '...' : 'Post'}
                      </button>
                    </div>

                    {/* Comments List */}
                    {post.comments && post.comments.length > 0 && (
                      <div className="space-y-3">
                        {post.comments.map((comment) => (
                          <div key={comment.id} className="flex gap-3 group">
                            {comment.author.avatar ? (
                              <img
                                src={getImageUrl(comment.author.avatar)}
                                alt={comment.author.name}
                                className="w-8 h-8 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-semibold">
                                {(comment.author.name || 'U').charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className="flex-1">
                              <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 relative">
                                <p className="font-semibold text-sm text-gray-900 dark:text-white mb-1">
                                  {comment.author.name || 'Anonymous'}
                                </p>
                                <p className="text-gray-700 dark:text-gray-300 text-sm">{comment.content}</p>
                                {(comment.author.id === user?.id || post.author.id === user?.id) && (
                                  <button
                                    onClick={() => handleDeleteComment(post.id, comment.id)}
                                    className="absolute top-2 right-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Delete comment"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-2">
                                {new Date(comment.createdAt).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Load More Button */}
        {posts.length > 0 && hasMore && (
          <div className="mt-8 text-center">
            <button
              onClick={() => loadPosts(nextCursor)}
              disabled={loadingMore}
              className="px-6 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingMore ? 'Loading...' : 'Load More'}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
