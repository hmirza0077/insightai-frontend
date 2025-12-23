import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { ToastProvider } from './contexts/ToastContext';
import { ThemeProvider } from './contexts/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import LandingPage from './components/LandingPage';
import Login from './components/Login';
import MainPage from './components/MainPage';
import DocumentProcess from './components/DocumentProcess';
import DocumentTask from './components/DocumentTask';
import KnowledgeBase from './components/KnowledgeBase';
import KnowledgeBaseDetail from './components/KnowledgeBaseDetail';
import Agents from './components/Agents';
import './App.css';

function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <ToastProvider>
            <Router>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<Login />} />
                <Route
                  path="/main"
                  element={
                    <ProtectedRoute>
                      <MainPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/document/:id/process"
                  element={
                    <ProtectedRoute>
                      <DocumentProcess />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/document/:documentId/task/:taskId"
                  element={
                    <ProtectedRoute>
                      <DocumentTask />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/knowledge-base"
                  element={
                    <ProtectedRoute>
                      <KnowledgeBase />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/knowledge-base/:id"
                  element={
                    <ProtectedRoute>
                      <KnowledgeBaseDetail />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/agents"
                  element={
                    <ProtectedRoute>
                      <Agents />
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </Router>
          </ToastProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;
