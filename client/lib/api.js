const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
const API_BASE_URL = API_URL.replace('/api', '');

export const getImageUrl = (imagePath) => {
  if (!imagePath) return null;
  if (imagePath.startsWith('http')) return imagePath;
  return `${API_BASE_URL}${imagePath}`;
};

const getToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token');
  }
  return null;
};

const apiRequest = async (endpoint, options = {}) => {
  const token = getToken();
  
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  };

  if (options.body instanceof FormData) {
    delete config.headers['Content-Type'];
  }

  const response = await fetch(`${API_URL}${endpoint}`, config);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
};

export const authAPI = {
  register: (data) => apiRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  login: (data) => apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  getMe: () => apiRequest('/auth/me'),
};

export const usersAPI = {
  search: (query) => apiRequest(`/users/search?q=${encodeURIComponent(query)}`),
  
  getById: (id) => apiRequest(`/users/${id}`),
  
  update: (id, data) => apiRequest(`/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  
  uploadAvatar: async (id, file) => {
    const token = getToken();
    const formData = new FormData();
    formData.append('avatar', file);
    
    const response = await fetch(`${API_URL}/users/${id}/avatar`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(error.error || 'Upload failed');
    }
    
    return response.json();
  },
  
  getFriends: (id) => apiRequest(`/users/${id}/friends`),
  
  sendFriendRequest: (id) => apiRequest(`/users/${id}/friend-request`, {
    method: 'POST',
  }),
  
  acceptFriendRequest: (id) => apiRequest(`/users/friend-requests/${id}/accept`, {
    method: 'PATCH',
  }),
  
  rejectFriendRequest: (id) => apiRequest(`/users/friend-requests/${id}/reject`, {
    method: 'PATCH',
  }),
  
  getFriendRequests: () => apiRequest('/users/friend-requests/all'),
  
  removeFriend: (id) => apiRequest(`/users/${id}/friend`, {
    method: 'DELETE',
  }),
};

export const postsAPI = {
  getAll: () => apiRequest('/posts'),
  
  create: (data) => apiRequest('/posts', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  update: (id, data) => apiRequest(`/posts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  
  delete: (id) => apiRequest(`/posts/${id}`, {
    method: 'DELETE',
  }),
  
  like: (id) => apiRequest(`/posts/${id}/like`, {
    method: 'PATCH',
  }),
  
  comment: (id, content) => apiRequest(`/posts/${id}/comment`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  }),
  
  uploadImage: async (file) => {
    const token = getToken();
    const formData = new FormData();
    formData.append('image', file);
    
    const response = await fetch(`${API_URL}/posts/upload-image`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(error.error || 'Upload failed');
    }
    
    return response.json();
  },
};

export const notificationsAPI = {
  getAll: () => apiRequest('/notifications'),
  
  markAsRead: (id) => apiRequest(`/notifications/${id}/read`, {
    method: 'PATCH',
  }),
  
  markAllAsRead: () => apiRequest('/notifications/read-all', {
    method: 'PATCH',
  }),
  
  getUnreadCount: () => apiRequest('/notifications/unread/count'),
};

