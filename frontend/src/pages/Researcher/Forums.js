import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import '../Dashboard.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const Forums = () => {
  const [categories, setCategories] = useState([]);
  const [posts, setPosts] = useState([]);
  const [allPosts, setAllPosts] = useState([]);
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
    fetchAllPosts();
  }, []);

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/forums/categories`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setCategories(response.data);
      // Auto-select first category if available for post form
      if (response.data.length > 0 && !postForm.categoryId) {
        setPostForm(prev => ({ ...prev, categoryId: response.data[0].id.toString() }));
      }
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
      setPostForm({ 
        categoryId: categories.length > 0 ? categories[0].id.toString() : '', 
        title: '', 
        content: '', 
        isQuestion: false 
      });
      fetchAllPosts();
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

  const handleCancelCategoryForm = () => {
    setShowCategoryForm(false);
    setCategoryForm({ name: '', description: '' });
  };

  const handleCancelPostForm = () => {
    setShowPostForm(false);
    setPostForm({ 
      categoryId: categories.length > 0 ? categories[0].id.toString() : '', 
      title: '', 
      content: '', 
      isQuestion: false 
    });
  };

  // Post detail view
  if (selectedPost) {
    return (
      <div className="page-content">
        <button onClick={() => setSelectedPost(null)} className="back-button">
          ← Back to Discussions
        </button>
        <div className="post-detail">
          <h2>{selectedPost.post.title}</h2>
          <p className="post-meta">
            <span className="post-category-badge-reddit">{selectedPost.post.category_name}</span>
            <span className="post-author-reddit" style={{ marginLeft: '10px' }}>
              by {selectedPost.post.author_name || 'Researcher'}
            </span>
            <span className="post-time-reddit" style={{ marginLeft: '10px' }}>
              {new Date(selectedPost.post.created_at).toLocaleDateString()}
            </span>
          </p>
          <div className="post-content">{selectedPost.post.content}</div>

          <h3 style={{ marginTop: '30px', marginBottom: '15px' }}>Replies ({selectedPost.replies.length})</h3>
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

          {selectedPost.replies.length === 0 && (
            <p className="empty-state" style={{ marginTop: '20px' }}>No replies yet. Be the first to respond!</p>
          )}

          {!showReplyForm ? (
            <button
              onClick={() => setShowReplyForm(true)}
              className="primary-button"
              style={{ marginTop: '20px' }}
            >
              Reply
            </button>
          ) : (
            <div className="reply-form" style={{ marginTop: '20px' }}>
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Write your reply..."
                rows="4"
                style={{ width: '100%', padding: '12px', marginBottom: '10px', borderRadius: '8px', border: '1px solid #d0d0d0', fontFamily: 'inherit' }}
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
            Create Community
          </button>
          <button onClick={() => setShowPostForm(true)} className="primary-button">
            Ask Question
          </button>
        </div>
      </div>
      <p className="subtitle">Engage in discussions and help answer patient questions</p>

      {/* Create Category Modal */}
      {showCategoryForm && (
        <div className="modal-overlay" onClick={handleCancelCategoryForm}>
          <div className="modal-content forum-form" onClick={(e) => e.stopPropagation()}>
            <div className="form-header">
              <h2>Create Community</h2>
              <button 
                className="close-button" 
                onClick={handleCancelCategoryForm}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleCreateCategory(); }}>
              <div className="form-grid">
                <div className="form-group full-width">
                  <label htmlFor="categoryName">Community Name <span className="required">*</span></label>
                  <input
                    id="categoryName"
                    type="text"
                    value={categoryForm.name}
                    onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                    placeholder="e.g., Cancer Research, Clinical Trials"
                    required
                  />
                </div>
                <div className="form-group full-width">
                  <label htmlFor="categoryDescription">Description</label>
                  <textarea
                    id="categoryDescription"
                    value={categoryForm.description}
                    onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                    placeholder="Describe this community..."
                    rows="4"
                  />
                </div>
              </div>
              <div className="form-actions">
                <button
                  type="button"
                  onClick={handleCancelCategoryForm}
                  className="secondary-button"
                >
                  Cancel
                </button>
                <button type="submit" className="primary-button">
                  Create Community
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Post Modal */}
      {showPostForm && (
        <div className="modal-overlay" onClick={handleCancelPostForm}>
          <div className="modal-content forum-form" onClick={(e) => e.stopPropagation()}>
            <div className="form-header">
              <h2>Ask a Question or Start a Discussion</h2>
              <button 
                className="close-button" 
                onClick={handleCancelPostForm}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleCreatePost(); }}>
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="postCategory">Community <span className="required">*</span></label>
                  <select
                    id="postCategory"
                    value={postForm.categoryId}
                    onChange={(e) => setPostForm({ ...postForm, categoryId: e.target.value })}
                    required
                  >
                    <option value="">Select a community</option>
                    {(() => {
                      // Use Set to track unique categories by id
                      const seenIds = new Set();
                      const uniqueCategories = categories.filter(cat => {
                        if (seenIds.has(cat.id)) {
                          return false; // Duplicate ID
                        }
                        // Also check for duplicate names (case-insensitive)
                        const duplicateName = categories.some((c, idx) => 
                          idx < categories.indexOf(cat) && 
                          c.name && 
                          cat.name && 
                          c.name.toLowerCase().trim() === cat.name.toLowerCase().trim()
                        );
                        if (duplicateName) {
                          return false; // Duplicate name
                        }
                        seenIds.add(cat.id);
                        return true;
                      });
                      return uniqueCategories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ));
                    })()}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="isQuestion">
                    <input
                      id="isQuestion"
                      type="checkbox"
                      checked={postForm.isQuestion}
                      onChange={(e) => setPostForm({ ...postForm, isQuestion: e.target.checked })}
                      style={{ marginRight: '8px' }}
                    />
                    Mark as Question
                  </label>
                </div>
                <div className="form-group full-width">
                  <label htmlFor="postTitle">Title <span className="required">*</span></label>
                  <input
                    id="postTitle"
                    type="text"
                    value={postForm.title}
                    onChange={(e) => setPostForm({ ...postForm, title: e.target.value })}
                    placeholder="Enter post title"
                    required
                  />
                </div>
                <div className="form-group full-width">
                  <label htmlFor="postContent">Content <span className="required">*</span></label>
                  <textarea
                    id="postContent"
                    value={postForm.content}
                    onChange={(e) => setPostForm({ ...postForm, content: e.target.value })}
                    placeholder="Write your post or question..."
                    rows="6"
                    required
                  />
                </div>
              </div>
              <div className="form-actions">
                <button
                  type="button"
                  onClick={handleCancelPostForm}
                  className="secondary-button"
                >
                  Cancel
                </button>
                <button type="submit" className="primary-button">
                  {postForm.isQuestion ? 'Post Question' : 'Create Post'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Posts List - Reddit Style */}
      <div className="posts-section">
        {loading ? (
          <p>Loading discussions...</p>
        ) : (
          <div className="posts-list-reddit">
            {posts.map((post) => (
              <div
                key={post.id}
                className="post-card-reddit"
                onClick={() => fetchPostDetails(post.id)}
              >
                <div className="post-voting-section">
                  <div className="vote-arrow-up">▲</div>
                  <div className="vote-count">{post.reply_count || 0}</div>
                  <div className="vote-arrow-down">▼</div>
                </div>
                <div className="post-content-section">
                  <div className="post-header-reddit">
                    <span className="post-category-badge-reddit">{post.category_name}</span>
                    <span className="post-author-reddit">by {post.author_name || 'User'}</span>
                    <span className="post-time-reddit">{new Date(post.created_at).toLocaleDateString()}</span>
                  </div>
                  <h3 className="post-title-reddit">{post.title}</h3>
                  <p className="post-body-reddit">{post.content}</p>
                  <div className="post-footer-reddit">
                    <span className="post-comment-link">{post.reply_count || 0} comments</span>
                  </div>
                </div>
              </div>
            ))}
            {posts.length === 0 && !loading && (
              <p className="empty-state">No discussions available yet. Start the first one!</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Forums;
