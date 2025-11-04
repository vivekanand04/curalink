import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import './Auth.css';

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [userType, setUserType] = useState('patient');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const type = searchParams.get('type');
    if (type === 'patient' || type === 'researcher') {
      setUserType(type);
    }
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const user = await register(email, password, userType);
      toast.success('Registration successful!');
      
      // Redirect to onboarding (support current camelCase shape)
      if ((user.userType || user.user_type) === 'patient') {
        navigate('/patient/onboarding');
      } else {
        navigate('/researcher/onboarding');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-progress-track" aria-hidden>
          <div className="auth-progress-bar" style={{ width: '33%' }} />
          <div className="auth-progress-dot" style={{ left: '33%' }} />
          <div className="auth-progress-dot-end" style={{ left: '66%' }} />
        </div>
        <h1>Create Your Account</h1>
        <p className="auth-subtitle">Join CuraLink to discover trials, experts, and publications</p>
        <div className="user-type-toggle" role="group" aria-label="Select account type">
          <button
            type="button"
            className={`user-type-option ${userType === 'patient' ? 'active' : ''}`}
            onClick={() => setUserType('patient')}
          >
            Patient / Caregiver
          </button>
          <button
            type="button"
            className={`user-type-option ${userType === 'researcher' ? 'active' : ''}`}
            onClick={() => setUserType('researcher')}
          >
            Researcher
          </button>
        </div>
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Enter your email"
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Create a password"
              minLength={6}
            />
          </div>
          <div className="form-group">
            <label>Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="Confirm your password"
            />
          </div>
          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>
        <p className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;

