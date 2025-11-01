import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import '../Dashboard.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const Forums = () => {
  const [categories, setCategories] = useState([]);
  const [posts, setPosts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedPost, setSelectedPost] = useState(null);
  const [showPostForm, setShowPostForm] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [postForm, setPostForm] = useState({
    categoryId: '',
    title: '',
    content: '',
    isQuestion: false,
  });
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
  });
  const [replyContent, setReplyContent] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      fetchPosts(selectedCategory);
    }
  }, [selectedCategory]);

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

  const handleCreateCategory = async () => {
    if (!categoryForm.name.trim()) {
      toast.error('Category name is required');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/forums/categories`, categoryForm, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      toast.success('Category created successfully');
      setShowCategoryForm(false);
      setCategoryForm({ name: '', description: '' });
      fetchCategories();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create category');
    }
  };

  const handleCreatePost = async () => {
    if (!postForm.categoryId || !postForm.title || !postForm.content) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/forums/posts`, postForm, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      toast.success('Post created successfully');
      setShowPostForm(false);
      setPostForm({ categoryId: '', title: '', content: '', isQuestion: false });
      if (selectedCategory) {
        fetchPosts(selectedCategory);
      }
    } catch (error) {
      toast.error('Failed to create post');
    }
  };

  const handleReply = async () => {
    if (!replyContent.trim()) {
      toast.error('Please enter a reply');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/forums/posts/${selectedPost.post.id}/replies`, {
        content: replyContent,
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      toast.success('Reply posted successfully');
      setReplyContent('');
      setShowReplyForm(false);
      fetchPostDetails(selectedPost.post.id);
    } catch (error) {
      toast.error('Failed to post reply');
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
          </div>

          {!showReplyForm ? (
            <button
              onClick={() => setShowReplyForm(true)}
              className="primary-button"
              style={{ marginTop: '20px' }}
            >
              Reply
            </button>
          ) : (
            <div className="reply-form">
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Write your reply..."
                rows="4"
                style={{ width: '100%', padding: '10px', marginBottom: '10px' }}
              />
              <div className="form-actions">
                <button
                  onClick={() => {
                    setShowReplyForm(false);
                    setReplyContent('');
                  }}
                  className="secondary-button"
                >
                  Cancel
                </button>
                <button onClick={handleReply} className="primary-button">
                  Post Reply
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="page-content">
      <div className="forums-header">
        <h1>Forums</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => setShowCategoryForm(true)} className="secondary-button">
            Create Category
          </button>
          <button onClick={() => setShowPostForm(true)} className="primary-button">
            Create Post
          </button>
        </div>
      </div>
      <p className="subtitle">Engage in discussions and help answer patient questions</p>

      {showCategoryForm && (
        <div className="modal-overlay" onClick={() => setShowCategoryForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Create New Category</h2>
            <div className="form-group">
              <label>Category Name *</label>
              <input
                type="text"
                value={categoryForm.name}
                onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                placeholder="e.g., Cancer Research"
              />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea
                value={categoryForm.description}
                onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                placeholder="Describe this category..."
                rows="3"
              />
            </div>
            <div className="form-actions">
              <button onClick={() => setShowCategoryForm(false)} className="secondary-button">
                Cancel
              </button>
              <button onClick={handleCreateCategory} className="primary-button">
                Create Category
              </button>
            </div>
          </div>
        </div>
      )}

      {showPostForm && (
        <div className="modal-overlay" onClick={() => setShowPostForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Create Post</h2>
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
                placeholder="Enter post title"
              />
            </div>
            <div className="form-group">
              <label>Content *</label>
              <textarea
                value={postForm.content}
                onChange={(e) => setPostForm({ ...postForm, content: e.target.value })}
                placeholder="Write your post..."
                rows="6"
              />
            </div>
            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={postForm.isQuestion}
                  onChange={(e) => setPostForm({ ...postForm, isQuestion: e.target.checked })}
                />
                This is a question
              </label>
            </div>
            <div className="form-actions">
              <button onClick={() => setShowPostForm(false)} className="secondary-button">
                Cancel
              </button>
              <button onClick={handleCreatePost} className="primary-button">
                Create Post
              </button>
            </div>
          </div>
        </div>
      )}

      {categories.length === 0 ? (
        <div className="empty-state">
          <p>No forum categories available. Create your first category to get started!</p>
        </div>
      ) : (
        <div className="categories-grid">
          {categories.map((category) => (
            <div
              key={category.id}
              className="category-card"
              onClick={() => setSelectedCategory(category.id)}
            >
              <h3>{category.name}</h3>
              <p>{category.description || 'No description'}</p>
            </div>
          ))}
        </div>
      )}

      {selectedCategory && (
        <div className="posts-section">
          <h2>Posts</h2>
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
                  <h3>{post.title}</h3>
                  <p className="post-meta">
                    {new Date(post.created_at).toLocaleDateString()} |{' '}
                    {post.reply_count || 0} replies
                  </p>
                  <p className="post-preview">{post.content.substring(0, 150)}...</p>
                </div>
              ))}
              {posts.length === 0 && (
                <p className="empty-state">No posts in this category yet.</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Forums;

