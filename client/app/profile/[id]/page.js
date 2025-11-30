'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Navbar from '../../../components/Navbar';
import { isAuthenticated, getUser } from '../../../lib/auth';
import { usersAPI, postsAPI, getImageUrl } from '../../../lib/api';

export default function ProfilePage() {
  const router = useRouter();
  const params = useParams();
  const profileId = parseInt(params.id);
  const [currentUser, setCurrentUser] = useState(null);
  const [profileUser, setProfileUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({ name: '', bio: '' });
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }

    const user = getUser();
    setCurrentUser(user);
    loadProfile();
  }, [router, params.id]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const [userData, postsData] = await Promise.all([
        usersAPI.getById(profileId),
        postsAPI.getAll()
      ]);
      
      setProfileUser(userData.user);
      setEditData({ name: userData.user.name || '', bio: userData.user.bio || '' });
      
      const userPosts = postsData.posts.filter(post => post.author.id === profileId);
      setPosts(userPosts);
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingAvatar(true);
    try {
      const data = await usersAPI.uploadAvatar(profileId, file);
      setProfileUser({ ...profileUser, avatar: data.user.avatar });
      if (currentUser.id === profileId) {
        setCurrentUser({ ...currentUser, avatar: data.user.avatar });
        localStorage.setItem('user', JSON.stringify({ ...currentUser, avatar: data.user.avatar }));
      }
    } catch (error) {
      console.error('Failed to upload avatar:', error);
      alert('Failed to upload avatar');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      const data = await usersAPI.update(profileId, editData);
      setProfileUser(data.user);
      setEditing(false);
      if (currentUser.id === profileId) {
        setCurrentUser(data.user);
        localStorage.setItem('user', JSON.stringify(data.user));
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
      alert('Failed to update profile');
    }
  };

  const handleSendFriendRequest = async () => {
    try {
      await usersAPI.sendFriendRequest(profileId);
      loadProfile();
    } catch (error) {
      console.error('Failed to send friend request:', error);
      alert(error.message || 'Failed to send friend request');
    }
  };

  const handleAcceptFriendRequest = async () => {
    try {
      const requests = await usersAPI.getFriendRequests();
      const request = requests.received.find(r => r.sender.id === profileId);
      if (request) {
        await usersAPI.acceptFriendRequest(request.id);
        loadProfile();
      }
    } catch (error) {
      console.error('Failed to accept friend request:', error);
      alert('Failed to accept friend request');
    }
  };

  const handleRemoveFriend = async () => {
    if (!confirm('Are you sure you want to remove this friend?')) return;
    
    try {
      await usersAPI.removeFriend(profileId);
      loadProfile();
    } catch (error) {
      console.error('Failed to remove friend:', error);
      alert('Failed to remove friend');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <p className="text-gray-600 dark:text-gray-400">User not found</p>
        </div>
      </div>
    );
  }

  const isOwnProfile = currentUser?.id === profileId;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="relative">
              {profileUser.avatar ? (
                <img
                  src={getImageUrl(profileUser.avatar)}
                  alt={profileUser.name || profileUser.email}
                  className="w-24 h-24 rounded-full object-cover"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-indigo-600 flex items-center justify-center text-white text-3xl font-semibold">
                  {(profileUser.name || profileUser.email || 'U').charAt(0).toUpperCase()}
                </div>
              )}
              {isOwnProfile && (
                <label className="absolute bottom-0 right-0 bg-indigo-600 text-white rounded-full p-2 cursor-pointer hover:bg-indigo-700">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                    disabled={uploadingAvatar}
                  />
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </label>
              )}
            </div>
            <div className="flex-1">
              {editing ? (
                <div className="space-y-4">
                  <input
                    type="text"
                    value={editData.name}
                    onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                    placeholder="Name"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white outline-none"
                  />
                  <textarea
                    value={editData.bio}
                    onChange={(e) => setEditData({ ...editData, bio: e.target.value })}
                    placeholder="Bio"
                    rows="3"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white outline-none resize-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveProfile}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setEditing(false);
                        setEditData({ name: profileUser.name || '', bio: profileUser.bio || '' });
                      }}
                      className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    {profileUser.name || profileUser.email}
                  </h1>
                  {profileUser.bio && (
                    <p className="text-gray-600 dark:text-gray-400 mb-4">{profileUser.bio}</p>
                  )}
                  <div className="flex gap-2">
                    {isOwnProfile ? (
                      <button
                        onClick={() => setEditing(true)}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                      >
                        Edit Profile
                      </button>
                    ) : (
                      <>
                        {profileUser.isFriend ? (
                          <button
                            onClick={handleRemoveFriend}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                          >
                            Remove Friend
                          </button>
                        ) : profileUser.friendRequestStatus === 'sent' ? (
                          <button
                            disabled
                            className="px-4 py-2 bg-gray-400 text-white rounded-lg cursor-not-allowed"
                          >
                            Request Sent
                          </button>
                        ) : profileUser.friendRequestStatus === 'received' ? (
                          <button
                            onClick={handleAcceptFriendRequest}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                          >
                            Accept Request
                          </button>
                        ) : (
                          <button
                            onClick={handleSendFriendRequest}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                          >
                            Add Friend
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* User Posts */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Posts</h2>
          {posts.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
              <p className="text-gray-600 dark:text-gray-400">No posts yet.</p>
            </div>
          ) : (
            posts.map((post) => (
              <div key={post.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <p className="text-gray-900 dark:text-white mb-4 whitespace-pre-wrap">{post.content}</p>
                  {post.imageUrl && (
                    <img
                      src={getImageUrl(post.imageUrl)}
                      alt="Post"
                      className="w-full rounded-lg mb-4"
                    />
                  )}
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
            ))
          )}
        </div>
      </main>
    </div>
  );
}

