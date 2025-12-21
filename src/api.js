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
    console.log('[API] Request to:', config.url, 'Method:', config.method);
    console.log('[API] Token present:', !!token);
    console.log('[API] Token value (first 30 chars):', token ? token.substring(0, 30) + '...' : 'null');
    
    if (token) {
      // Always set Authorization header
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
      console.log('[API] Authorization header set:', config.headers.Authorization.substring(0, 40) + '...');
    }
    
    // For FormData, let browser set Content-Type with boundary
    if (config.data instanceof FormData) {
      console.log('[API] FormData detected, removing Content-Type header');
      delete config.headers['Content-Type'];
    }
    
    console.log('[API] Final headers:', JSON.stringify(config.headers));
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

// Auth API - New Flow
export const authAPI = {
  /**
   * Step 1: Start login - Returns temp_code, has_password, is_registered
   * If has_password is true, redirect to password login
   * If has_password is false, need to request OTP
   */
  startLogin: async (username) => {
    const response = await api.post('/user/auth/start-login/', { username });
    return response.data;
  },
  
  /**
   * Step 2a: Request OTP code (if user chose OTP or doesn't have password)
   * Uses temp_code from startLogin response
   */
  requestOTP: async (tempCode) => {
    const response = await api.post(`/user/auth/${tempCode}/request-code/`);
    return response.data;
  },
  
  /**
   * Step 2b: Verify OTP code
   * Uses temp_code from startLogin response
   */
  verifyOTP: async (tempCode, code) => {
    const response = await api.post(`/user/auth/${tempCode}/verify/`, { code });
    if (response.data.token) {
      localStorage.setItem('accessToken', response.data.token);
    }
    return { 
      success: true, 
      token: response.data.token,
      is_b2b: response.data.is_b2b
    };
  },
  
  /**
   * Step 2c: Login with password (if user has password)
   * Uses temp_code from startLogin response
   */
  passwordLogin: async (tempCode, password) => {
    const response = await api.post(`/user/auth/${tempCode}/login-with-password/`, { password });
    console.log('[API] Password login response:', response.data);
    if (response.data.token) {
      localStorage.setItem('accessToken', response.data.token);
      console.log('[API] Token stored in localStorage');
    } else {
      console.error('[API] No token in response!');
    }
    return { 
      success: true, 
      token: response.data.token,
      is_b2b: response.data.is_b2b
    };
  },
  
  /**
   * Google Sign In
   */
  googleLogin: async (accessToken) => {
    const response = await api.post('/user/auth/google/', { access_token: accessToken });
    if (response.data.token) {
      localStorage.setItem('accessToken', response.data.token);
    }
    return {
      success: true,
      token: response.data.token,
      new_user: response.data.new_user,
      is_b2b: response.data.is_b2b
    };
  },
  
  /**
   * Set/Change password (requires authentication)
   */
  setPassword: async (password) => {
    const response = await api.patch('/user/profile/change-password/', { password });
    return { success: true };
  },
  
  // User Profile
  getCurrentUser: () => api.get('/user/profile/'),
  updateProfile: (data) => api.patch('/user/profile/', data),
  
  logout: async () => {
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
    console.log('[UPLOAD] Uploading file:', file.name);
    // Let the interceptor handle Authorization header
    return api.post('/documents/', formData);
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
