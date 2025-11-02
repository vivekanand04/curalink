import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';

// Pages
import LandingPage from './pages/LandingPage';
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import PatientOnboarding from './pages/Patient/Onboarding';
import PatientDashboard from './pages/Patient/Dashboard';
import RecommendedClinicalTrials from './pages/Patient/RecommendedClinicalTrials';
import RecommendedPublications from './pages/Patient/RecommendedPublications';
import RecommendedExperts from './pages/Patient/RecommendedExperts';
import ResearcherOnboarding from './pages/Researcher/Onboarding';
import ResearcherDashboard from './pages/Researcher/Dashboard';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            <Route
              path="/patient/onboarding"
              element={
                <PrivateRoute>
                  <PatientOnboarding />
                </PrivateRoute>
              }
            />
            <Route
              path="/patient/dashboard"
              element={
                <PrivateRoute allowedRoles={['patient']}>
                  <PatientDashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/patient/recommended/trials"
              element={
                <PrivateRoute allowedRoles={['patient']}>
                  <RecommendedClinicalTrials />
                </PrivateRoute>
              }
            />
            <Route
              path="/patient/recommended/publications"
              element={
                <PrivateRoute allowedRoles={['patient']}>
                  <RecommendedPublications />
                </PrivateRoute>
              }
            />
            <Route
              path="/patient/recommended/experts"
              element={
                <PrivateRoute allowedRoles={['patient']}>
                  <RecommendedExperts />
                </PrivateRoute>
              }
            />
            
            <Route
              path="/researcher/onboarding"
              element={
                <PrivateRoute>
                  <ResearcherOnboarding />
                </PrivateRoute>
              }
            />
            <Route
              path="/researcher/dashboard"
              element={
                <PrivateRoute allowedRoles={['researcher']}>
                  <ResearcherDashboard />
                </PrivateRoute>
              }
            />
            
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <ToastContainer position="top-right" autoClose={3000} />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;

