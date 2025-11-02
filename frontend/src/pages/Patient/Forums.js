import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import '../Dashboard.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const Forums = () => {
  const [categories, setCategories] = useState([]);
  const [posts, setPosts] = useState([]);
  const [allPosts, setAllPosts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedPost, setSelectedPost] = useState(null);
  const [showPostForm, setShowPostForm] = useState(false);
  const [postForm, setPostForm] = useState({
    categoryId: '',
    title: '',
    content: '',
  });
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchCategories();
    fetchAllPosts();
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      filterPosts(searchQuery);
    } else {
      setPosts(allPosts);
    }
  }, [searchQuery, allPosts]);

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/forums/categories`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Failed to fetch categories');
    }
  };

  const fetchAllPosts = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/forums/posts`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setAllPosts(response.data);
      setPosts(response.data);
    } catch (error) {
      toast.error('Failed to fetch posts');
    } finally {
      setLoading(false);
    }
  };

  const filterPosts = (query) => {
    const filtered = allPosts.filter(post => 
      post.title.toLowerCase().includes(query.toLowerCase()) ||
      post.content.toLowerCase().includes(query.toLowerCase()) ||
      (post.category_name && post.category_name.toLowerCase().includes(query.toLowerCase()))
    );
    setPosts(filtered);
  };

  const fetchPosts = async (categoryId) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/forums/categories/${categoryId}/posts`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setPosts(response.data);
    } catch (error) {
      toast.error('Failed to fetch posts');
    } finally {
      setLoading(false);
    }
  };

  const fetchPostDetails = async (postId) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/forums/posts/${postId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setSelectedPost(response.data);
    } catch (error) {
      toast.error('Failed to fetch post details');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async () => {
    if (!postForm.categoryId || !postForm.title || !postForm.content) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/forums/posts`, {
        ...postForm,
        isQuestion: true, // Patients can only ask questions
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      toast.success('Question posted successfully');
      setShowPostForm(false);
      setPostForm({ categoryId: '', title: '', content: '' });
      if (selectedCategory) {
        fetchPosts(selectedCategory);
      }
    } catch (error) {
      toast.error('Failed to post question');
    }
  };

  if (selectedPost) {
    return (
      <div className="page-content">
        <button onClick={() => setSelectedPost(null)} className="back-button">
          ← Back to Posts
        </button>
        <div className="post-detail">
          <h2>{selectedPost.post.title}</h2>
          <p className="post-meta">
            Category: {selectedPost.post.category_name} | Posted:{' '}
            {new Date(selectedPost.post.created_at).toLocaleDateString()}
          </p>
          <div className="post-content">{selectedPost.post.content}</div>

          <h3>Replies ({selectedPost.replies.length})</h3>
          <div className="replies-list">
            {selectedPost.replies.map((reply) => (
              <div key={reply.id} className="reply-card">
                <p className="reply-author">
                  {reply.name || 'Researcher'} | {new Date(reply.created_at).toLocaleDateString()}
                </p>
                <p className="reply-content">{reply.content}</p>
              </div>
            ))}
            {selectedPost.replies.length === 0 && (
              <p className="empty-state">No replies yet. Researchers will respond here.</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content">
      <div className="forums-header">
        <h1>Forums</h1>
        <button onClick={() => setShowPostForm(true)} className="primary-button">
          Ask a Question
        </button>
      </div>
      <p className="subtitle">Join discussions and get answers from researchers</p>

      <div className="search-bar">
        <input
          type="text"
          placeholder="Search posts by title, content, or category..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && filterPosts(searchQuery)}
        />
        <button onClick={() => filterPosts(searchQuery)} className="primary-button">Search</button>
        {searchQuery && (
          <button onClick={() => {
            setSearchQuery('');
            setPosts(allPosts);
          }} className="secondary-button">Clear</button>
        )}
      </div>

      {showPostForm && (
        <div className="modal-overlay" onClick={() => setShowPostForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Ask a Question</h2>
            <div className="form-group">
              <label>Category *</label>
              <select
                value={postForm.categoryId}
                onChange={(e) => setPostForm({ ...postForm, categoryId: e.target.value })}
              >
                <option value="">Select a category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Title *</label>
              <input
                type="text"
                value={postForm.title}
                onChange={(e) => setPostForm({ ...postForm, title: e.target.value })}
                placeholder="Enter your question title"
              />
            </div>
            <div className="form-group">
              <label>Question *</label>
              <textarea
                value={postForm.content}
                onChange={(e) => setPostForm({ ...postForm, content: e.target.value })}
                placeholder="Ask your question here..."
                rows="6"
              />
            </div>
            <div className="form-actions">
              <button onClick={() => setShowPostForm(false)} className="secondary-button">
                Cancel
              </button>
              <button onClick={handleCreatePost} className="primary-button">
                Post Question
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="posts-section">
        <h2>All Posts</h2>
        {loading ? (
          <p>Loading...</p>
        ) : (
          <div className="posts-list">
            {posts.map((post) => (
              <div
                key={post.id}
                className="post-card"
                onClick={() => fetchPostDetails(post.id)}
              >
                <div className="post-header">
                  <span className="post-category-badge">{post.category_name}</span>
                </div>
                <h3>{post.title}</h3>
                <p className="post-meta">
                  {new Date(post.created_at).toLocaleDateString()} |{' '}
                  {post.reply_count || 0} replies
                </p>
                <p className="post-preview">{post.content.substring(0, 150)}...</p>
              </div>
            ))}
            {posts.length === 0 && !loading && (
              <p className="empty-state">
                {searchQuery ? 'No posts found matching your search.' : 'No posts available yet.'}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Forums;

