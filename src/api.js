import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/users/auth/refresh/`, {
            refresh: refreshToken
          });
          
          const { access, refresh } = response.data;
          localStorage.setItem('accessToken', access);
          if (refresh) {
            localStorage.setItem('refreshToken', refresh);
          }
          
          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${access}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, clear tokens and redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  // OTP Flow
  requestOTP: async (identifier) => {
    const response = await api.post('/users/auth/request-otp/', { identifier });
    return response.data;
  },
  
  verifyOTP: async (identifier, code) => {
    const response = await api.post('/users/auth/verify-otp/', { identifier, code });
    if (response.data.tokens) {
      localStorage.setItem('accessToken', response.data.tokens.access);
      localStorage.setItem('refreshToken', response.data.tokens.refresh);
    }
    return response.data;
  },
  
  resendOTP: (identifier) => api.post('/users/auth/resend-otp/', { identifier }),
  
  // Password Flow
  passwordLogin: async (identifier, password) => {
    const response = await api.post('/users/auth/password-login/', { identifier, password });
    if (response.data.tokens) {
      localStorage.setItem('accessToken', response.data.tokens.access);
      localStorage.setItem('refreshToken', response.data.tokens.refresh);
    }
    return response.data;
  },
  
  setupPassword: async (password, passwordConfirm) => {
    const response = await api.post('/users/auth/setup-password/', {
      password,
      password_confirm: passwordConfirm
    });
    if (response.data.tokens) {
      localStorage.setItem('accessToken', response.data.tokens.access);
      localStorage.setItem('refreshToken', response.data.tokens.refresh);
    }
    return response.data;
  },
  
  checkPasswordSetup: () => api.get('/users/auth/check-password/'),
  
  // User
  getCurrentUser: () => api.get('/users/me/'),
  updateProfile: (data) => api.patch('/users/me/update/', data),
  
  logout: async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    try {
      await api.post('/users/auth/logout/', { refresh: refreshToken });
    } catch (e) {
      // Ignore errors on logout
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  },
  
  isAuthenticated: () => {
    return !!localStorage.getItem('accessToken');
  }
};

// Documents API
export const documentsAPI = {
  list: () => api.get('/documents/'),
  
  // List with detailed info (processing status, extracted text preview, etc.)
  listWithInfo: () => api.get('/documents/list/'),
  
  upload: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/documents/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  
  get: (id) => api.get(`/documents/${id}/`),
  
  getInfo: (id) => api.get(`/documents/${id}/info/`),
  
  // Language detection
  detectLanguage: (id) => api.get(`/documents/${id}/detect-language/`),
  
  // Task creation with three options
  createTask: (id, taskData) => {
    return api.post(`/documents/${id}/tasks/create/`, taskData);
  },
  
  getTasks: (id) => api.get(`/documents/${id}/tasks/`),
  
  getTask: (taskId) => api.get(`/documents/tasks/${taskId}/`),
  
  // Process a task
  processTask: (taskId) => api.post(`/documents/tasks/${taskId}/process/`),
  
  // Get document chunks (for KB tasks)
  getChunks: (taskId) => api.get(`/documents/tasks/${taskId}/chunks/`),
  
  // Tools
  getTools: () => api.get('/documents/tools/'),
  
  getToolsForFileType: (fileType, needsOcr = false, needsPersian = true) =>
    api.get(`/documents/tools/`, {
      params: { file_type: fileType, needs_ocr: needsOcr, needs_persian: needsPersian }
    }),
  
  // Translation
  translate: (text, source = 'auto', target = 'en') =>
    api.post('/documents/translate/', { text, source, target }),
  
  // Supported languages
  getLanguages: () => api.get('/documents/languages/'),
  
  // Q&A
  askQuestion: (taskId, question, language = 'fa', topK = 5) =>
    api.post(`/documents/tasks/${taskId}/ask/`, { question, language, top_k: topK }),
  
  getConversations: (taskId) => api.get(`/documents/tasks/${taskId}/conversations/`),
  
  // Delete a conversation
  deleteConversation: (taskId, conversationId) => 
    api.delete(`/documents/tasks/${taskId}/conversations/${conversationId}/`),
  
  // Update extracted/translated text
  updateProcessingText: (taskId, data) => 
    api.patch(`/documents/tasks/${taskId}/processing/`, data),
};

// Knowledge Base API
export const knowledgeBaseAPI = {
  // CRUD
  list: (params = {}) => api.get('/knowledge-base/', { params }),
  create: (data) => api.post('/knowledge-base/', data),
  get: (id, includeDeleted = false) => 
    api.get(`/knowledge-base/${id}/`, { params: { include_deleted: includeDeleted } }),
  update: (id, data) => api.patch(`/knowledge-base/${id}/`, data),
  delete: (id) => api.delete(`/knowledge-base/${id}/`),
  
  // Restore & Hard Delete
  restore: (id) => api.post(`/knowledge-base/${id}/restore/`),
  hardDelete: (id) => api.delete(`/knowledge-base/${id}/hard-delete/`),
  
  // List deleted
  listDeleted: () => api.get('/knowledge-base/deleted/'),
  
  // Document Management
  getDocuments: (id, params = {}) => api.get(`/knowledge-base/${id}/documents/`, { params }),
  addDocument: (id, data) => api.post(`/knowledge-base/${id}/documents/`, data),
  addDocumentsBulk: (id, documents) => 
    api.post(`/knowledge-base/${id}/documents/bulk/`, { documents }),
  getDocument: (id, docId) => api.get(`/knowledge-base/${id}/documents/${docId}/`),
  removeDocument: (id, docId) => api.delete(`/knowledge-base/${id}/documents/${docId}/`),
  
  // Indexing
  index: (id) => api.post(`/knowledge-base/${id}/index/`),
  
  // Search & Q&A
  search: (id, query, topK = 5, documentIds = null) => 
    api.post(`/knowledge-base/${id}/search/`, { query, top_k: topK, document_ids: documentIds }),
  ask: (id, question, language = 'fa', topK = 5, sessionId = null) => 
    api.post(`/knowledge-base/${id}/ask/`, { question, language, top_k: topK, session_id: sessionId }),
  getConversations: (id, sessionId = null) => 
    api.get(`/knowledge-base/${id}/conversations/`, { params: { session_id: sessionId } }),
  
  // Legacy
  saveText: (text, name, description = '', documentId = null) =>
    api.post('/knowledge-base/save-text/', { text, name, description, document_id: documentId }),
};

// Agents API
export const agentsAPI = {
  // CRUD
  list: (params = {}) => api.get('/agents/', { params }),
  create: (data) => api.post('/agents/', data),
  get: (id) => api.get(`/agents/${id}/`),
  update: (id, data) => api.patch(`/agents/${id}/`, data),
  delete: (id) => api.delete(`/agents/${id}/`),
  
  // Knowledge Base Management
  getKnowledgeBases: (id) => api.get(`/agents/${id}/knowledge-bases/`),
  addKnowledgeBase: (id, kbId) => 
    api.post(`/agents/${id}/knowledge-bases/`, { knowledge_base_id: kbId }),
  removeKnowledgeBase: (id, kbId) => 
    api.delete(`/agents/${id}/knowledge-bases/${kbId}/`),
  
  // Chat (new endpoint)
  chat: (id, question, sessionId = null) => 
    api.post(`/agents/${id}/chat/`, { question, session_id: sessionId }),
  
  // Conversations & Sessions
  getConversations: (id, sessionId = null) => 
    api.get(`/agents/${id}/conversations/`, { params: { session_id: sessionId } }),
  getSessions: (id) => api.get(`/agents/${id}/sessions/`),
  
  // Feedback
  submitFeedback: (conversationId, rating, feedbackText = '') => 
    api.post(`/agents/conversations/${conversationId}/feedback/`, { rating, feedback_text: feedbackText }),
  
  // Session Management
  deleteSession: (sessionId) => api.delete(`/agents/sessions/${sessionId}/`),
};

export default api;
