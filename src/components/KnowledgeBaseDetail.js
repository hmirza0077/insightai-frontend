import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { knowledgeBaseAPI, documentsAPI } from '../api';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import { useTheme } from '../contexts/ThemeContext';
import Logo from './Logo';
import './KnowledgeBaseDetail.css';

const KnowledgeBaseDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, toggleLanguage, language } = useLanguage();
  const toast = useToast();
  const { theme, toggleTheme } = useTheme();
  
  // State
  const [kb, setKb] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [userDocuments, setUserDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('documents');
  
  // Edit mode
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  
  // Add document modal
  const [showAddDoc, setShowAddDoc] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState('');
  const [pageStart, setPageStart] = useState('');
  const [pageEnd, setPageEnd] = useState('');
  
  // Q&A
  const [question, setQuestion] = useState('');
  const [conversations, setConversations] = useState([]);
  const [asking, setAsking] = useState(false);
  
  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  
  // Processing
  const [indexing, setIndexing] = useState(false);
  const [fixingStatus, setFixingStatus] = useState(false);
  const [diagnostics, setDiagnostics] = useState(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  useEffect(() => {
    const fetchKnowledgeBase = async () => {
      try {
        setLoading(true);
        const [kbResponse, docsResponse, convsResponse] = await Promise.all([
          knowledgeBaseAPI.get(id),
          knowledgeBaseAPI.getDocuments(id),
          knowledgeBaseAPI.getConversations(id)
        ]);
        
        setKb(kbResponse.data);
        setEditName(kbResponse.data.name);
        setEditDescription(kbResponse.data.description || '');
        setDocuments(docsResponse.data.documents || []);
        setConversations(convsResponse.data || []);
      } catch (error) {
        console.error('Error loading KB:', error);
        toast.error(t.kbDetail.loadError);
      } finally {
        setLoading(false);
      }
    };

    fetchKnowledgeBase();
    loadUserDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadKnowledgeBase = async () => {
    try {
      setLoading(true);
      const [kbResponse, docsResponse, convsResponse] = await Promise.all([
        knowledgeBaseAPI.get(id),
        knowledgeBaseAPI.getDocuments(id),
        knowledgeBaseAPI.getConversations(id)
      ]);
      
      setKb(kbResponse.data);
      setEditName(kbResponse.data.name);
      setEditDescription(kbResponse.data.description || '');
      setDocuments(docsResponse.data.documents || []);
      setConversations(convsResponse.data || []);
    } catch (error) {
      console.error('Error loading KB:', error);
      toast.error(t.kbDetail.loadError);
    } finally {
      setLoading(false);
    }
  };

  const loadUserDocuments = async () => {
    try {
      const response = await documentsAPI.list();
      setUserDocuments(response.data || []);
    } catch (error) {
      console.error('Error loading user documents:', error);
    }
  };

  const handleSaveEdit = async () => {
    try {
      await knowledgeBaseAPI.update(id, {
        name: editName,
        description: editDescription
      });
      setKb({ ...kb, name: editName, description: editDescription });
      setIsEditing(false);
      toast.success(t.kbDetail.saveSuccess || 'Saved successfully');
    } catch (error) {
      toast.error(t.kbDetail.saveError);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(t.kbDetail.confirmDelete)) return;
    
    try {
      await knowledgeBaseAPI.delete(id);
      toast.success(t.kbDetail.deleteSuccess || 'Deleted successfully');
      navigate('/knowledge-base');
    } catch (error) {
      toast.error(t.kbDetail.deleteError);
    }
  };

  const handleAddDocument = async () => {
    if (!selectedDocId) return;
    
    try {
      await knowledgeBaseAPI.addDocument(id, {
        document_id: parseInt(selectedDocId),
        page_start: pageStart ? parseInt(pageStart) : null,
        page_end: pageEnd ? parseInt(pageEnd) : null
      });
      
      setShowAddDoc(false);
      setSelectedDocId('');
      setPageStart('');
      setPageEnd('');
      loadKnowledgeBase();
      toast.success(t.kbDetail.addDocSuccess || 'Document added successfully');
    } catch (error) {
      toast.error(error.response?.data?.error || t.kbDetail.addDocError);
    }
  };

  const handleRemoveDocument = async (docId) => {
    if (!window.confirm(t.kbDetail.confirmRemoveDoc)) return;
    
    try {
      await knowledgeBaseAPI.removeDocument(id, docId);
      loadKnowledgeBase();
      toast.success(t.kbDetail.removeDocSuccess || 'Document removed');
    } catch (error) {
      toast.error(t.kbDetail.removeDocError);
    }
  };

  const handleIndex = async () => {
    setIndexing(true);
    try {
      // Use async indexing for better handling of OCR-heavy documents
      const response = await knowledgeBaseAPI.indexAsync(id);
      
      if (response.data.success) {
        toast.success(
          `Indexing started for ${response.data.documents_to_index} document(s). This may take a few minutes for scanned PDFs.`
        );
        
        // Poll for completion
        const taskId = response.data.celery_task_id;
        if (taskId) {
          pollIndexingStatus(taskId);
        } else {
          // No celery task, just reload after a delay
          setTimeout(() => loadKnowledgeBase(), 3000);
        }
      } else if (response.data.message) {
        toast.info(response.data.message);
        loadKnowledgeBase();
      }
    } catch (error) {
      console.error('Indexing error:', error);
      
      // If async fails (e.g., Celery not running), fall back to sync
      if (error.response?.status === 500 && error.response?.data?.error?.includes('Celery')) {
        toast.warning('Background processing unavailable. Trying synchronous indexing...');
        try {
          const syncResponse = await knowledgeBaseAPI.index(id);
          if (syncResponse.data.success) {
            const chunksCreated = syncResponse.data.total_chunks || 
              syncResponse.data.results?.reduce((sum, r) => sum + (r.chunks_created || 0), 0) || 0;
            toast.success(
              t.kbDetail.indexSuccess
                .replace('{count}', syncResponse.data.indexed || 0)
                .replace('{chunks}', chunksCreated)
            );
          }
          loadKnowledgeBase();
          
          if (syncResponse.data.errors && syncResponse.data.errors.length > 0) {
            syncResponse.data.errors.forEach(err => {
              toast.error(`Error: ${err.error}`);
            });
          }
        } catch (syncError) {
          toast.error(syncError.response?.data?.error || t.kbDetail.indexError);
        }
      } else {
        toast.error(error.response?.data?.error || t.kbDetail.indexError);
      }
      
      // Try to refresh status to fix stuck state
      try {
        await knowledgeBaseAPI.refreshStatus(id);
        loadKnowledgeBase();
      } catch (e) {
        console.error('Failed to refresh status:', e);
      }
    } finally {
      setIndexing(false);
    }
  };

  const pollIndexingStatus = async (taskId) => {
    const maxAttempts = 60; // 5 minutes max
    let attempts = 0;
    
    const poll = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000/api'}/tasks/${taskId}/`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
          }
        });
        const task = await response.json();
        
        if (task.status === 'completed') {
          toast.success('Indexing completed successfully!');
          loadKnowledgeBase();
          return;
        } else if (task.status === 'failed') {
          toast.error(`Indexing failed: ${task.error || 'Unknown error'}`);
          loadKnowledgeBase();
          return;
        } else if (attempts < maxAttempts) {
          attempts++;
          setTimeout(poll, 5000); // Poll every 5 seconds
        } else {
          toast.warning('Indexing is taking longer than expected. Please refresh the page to check status.');
          loadKnowledgeBase();
        }
      } catch (error) {
        console.error('Error polling task status:', error);
        loadKnowledgeBase();
      }
    };
    
    setTimeout(poll, 3000); // Start polling after 3 seconds
  };

  const handleFixStatus = async () => {
    setFixingStatus(true);
    try {
      const response = await knowledgeBaseAPI.refreshStatus(id);
      const data = response.data;
      let message = `Status: ${data.old_status} → ${data.new_status}`;
      if (data.processing_documents_reset > 0) {
        message += ` (${data.processing_documents_reset} stuck documents reset)`;
      }
      toast.success(message);
      loadKnowledgeBase();
    } catch (error) {
      toast.error('Failed to refresh status');
    } finally {
      setFixingStatus(false);
    }
  };

  const handleShowDiagnostics = async () => {
    try {
      const response = await knowledgeBaseAPI.diagnostics(id);
      setDiagnostics(response.data);
      setShowDiagnostics(true);
    } catch (error) {
      toast.error('Failed to load diagnostics');
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setSearching(true);
    try {
      const response = await knowledgeBaseAPI.search(id, searchQuery);
      setSearchResults(response.data.results || []);
    } catch (error) {
      toast.error(error.response?.data?.error || t.kbDetail.searchError);
    } finally {
      setSearching(false);
    }
  };

  const handleAsk = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;
    
    setAsking(true);
    try {
      const response = await knowledgeBaseAPI.ask(id, question, language);
      if (response.data.success) {
        setConversations([response.data.conversation, ...conversations]);
        setQuestion('');
      }
    } catch (error) {
      toast.error(error.response?.data?.error || t.kbDetail.askError);
    } finally {
      setAsking(false);
    }
  };

  if (loading) {
    return (
      <div className={`kb-detail-page theme-${theme}`}>
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <span>{t.loading}</span>
        </div>
      </div>
    );
  }

  if (!kb) {
    return (
      <div className={`kb-detail-page theme-${theme}`}>
        <div className="error-state">{t.kbDetail.notFound}</div>
      </div>
    );
  }

  const pendingDocs = documents.filter(d => d.status === 'pending').length;
  const indexedDocs = documents.filter(d => d.status === 'indexed').length;
  const totalChunks = kb.total_chunks || 0;
  
  // Derive actual readiness from document states
  // KB is ready for Q&A if it has indexed documents with chunks and no pending ones
  const isKbReady = indexedDocs > 0 && totalChunks > 0 && pendingDocs === 0;
  const effectiveStatus = isKbReady ? 'ready' : (indexedDocs > 0 && totalChunks === 0 ? 'needs_indexing' : kb.status);

  return (
    <div className={`kb-detail-page theme-${theme}`}>
      <header className="kb-detail-header">
        <div className="header-content">
          <div className="header-left">
            <button onClick={() => navigate('/knowledge-base')} className="back-btn">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
              {t.back}
            </button>
            <div className="page-title">
              <Logo size={36} className="header-logo" />
              {isEditing ? (
                <input 
                  type="text" 
                  value={editName} 
                  onChange={(e) => setEditName(e.target.value)}
                  className="edit-title-input"
                />
              ) : (
                <h1>{kb.name}</h1>
              )}
            </div>
          </div>
          <div className="header-actions">
            <span className={`status-badge status-${effectiveStatus}`}>
              {t.kbDetail.status[effectiveStatus] || effectiveStatus}
            </span>
            {(kb.status === 'processing' || kb.status === 'error') && (
              <button onClick={handleFixStatus} disabled={fixingStatus} className="fix-status-btn" title="Fix stuck status">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
                {fixingStatus ? 'Fixing...' : 'Fix Status'}
              </button>
            )}
            <button onClick={handleShowDiagnostics} className="diagnostics-btn" title="Show diagnostics">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
              </svg>
            </button>
            <button onClick={toggleLanguage} className="lang-btn">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3" />
              </svg>
              {t.language[language === 'fa' ? 'en' : 'fa']}
            </button>
            {isEditing ? (
              <>
                <button onClick={handleSaveEdit} className="save-btn">{t.save}</button>
                <button onClick={() => setIsEditing(false)} className="cancel-btn">{t.cancel}</button>
              </>
            ) : (
              <>
                <button onClick={() => setIsEditing(true)} className="edit-btn">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                  </svg>
                  {t.edit}
                </button>
                <button onClick={handleDelete} className="delete-btn">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                  {t.delete}
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="kb-detail-content">
        <div className="content-wrapper">
          {/* KB Info Card */}
          <div className="kb-info-card fade-in">
            {isEditing ? (
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder={t.kbDetail.descriptionPlaceholder}
                className="edit-description-input"
              />
            ) : (
              kb.description && <p className="kb-description">{kb.description}</p>
            )}
            <div className="kb-stats">
              <div className="stat-item">
                <span className="stat-value">{kb.total_documents || documents.length}</span>
                <span className="stat-label">{t.kbDetail.documents}</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{kb.total_chunks || 0}</span>
                <span className="stat-label">{t.kbDetail.chunks}</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{indexedDocs}</span>
                <span className="stat-label">{t.kbDetail.indexed}</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{pendingDocs}</span>
                <span className="stat-label">{t.kbDetail.pending}</span>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="tabs-container">
            <div className="tabs">
              <button 
                className={`tab ${activeTab === 'documents' ? 'active' : ''}`}
                onClick={() => setActiveTab('documents')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                {t.kbDetail.documentsTab}
              </button>
              <button 
                className={`tab ${activeTab === 'search' ? 'active' : ''}`}
                onClick={() => setActiveTab('search')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                {t.kbDetail.searchTab}
              </button>
              <button 
                className={`tab ${activeTab === 'qa' ? 'active' : ''}`}
                onClick={() => setActiveTab('qa')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                </svg>
                {t.kbDetail.qaTab}
              </button>
            </div>
          </div>

          {/* Documents Tab */}
          {activeTab === 'documents' && (
            <div className="tab-content fade-in">
              <div className="tab-header">
                <h2>{t.kbDetail.documentsInKB}</h2>
                <div className="tab-actions">
                  {(pendingDocs > 0 || (documents.length > 0 && totalChunks === 0)) && (
                    <button onClick={handleIndex} disabled={indexing} className="index-btn">
                      {indexing ? (
                        <>
                          <span className="btn-spinner"></span>
                          {t.kbDetail.indexing}
                        </>
                      ) : (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {pendingDocs > 0 
                            ? `${t.kbDetail.indexPending} (${pendingDocs})`
                            : t.kbDetail.indexDocuments || 'Index Documents'}
                        </>
                      )}
                    </button>
                  )}
                  <button onClick={() => setShowAddDoc(true)} className="add-doc-btn">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    {t.kbDetail.addDocument}
                  </button>
                </div>
              </div>

              {documents.length === 0 ? (
                <div className="empty-docs">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                  <p>{t.kbDetail.noDocuments}</p>
                </div>
              ) : (
                <div className="documents-list">
                  {documents.map((doc, index) => (
                    <div key={doc.id} className="doc-item fade-in" style={{ animationDelay: `${index * 0.05}s` }}>
                      <div className="doc-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                        </svg>
                      </div>
                      <div className="doc-info">
                        <h4>{doc.document_name || doc.document?.original_filename || (doc.document_id ? `Document #${doc.document_id}` : `Document #${doc.id}`)}</h4>
                        <div className="doc-meta">
                          {doc.page_start && doc.page_end && (
                            <span>{t.kbDetail.pages}: {doc.page_start}-{doc.page_end}</span>
                          )}
                          {doc.word_count > 0 && (
                            <span>{t.kbDetail.words}: {doc.word_count}</span>
                          )}
                          <span className={`doc-status status-${doc.status}`}>
                            {t.kbDetail.docStatus[doc.status] || doc.status}
                          </span>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleRemoveDocument(doc.id)} 
                        className="remove-doc-btn"
                        title={t.kbDetail.removeDocument}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Search Tab */}
          {activeTab === 'search' && (
            <div className="tab-content fade-in">
              <div className="search-section">
                <form onSubmit={handleSearch} className="search-form">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t.kbDetail.searchPlaceholder}
                    className="search-input"
                    disabled={!isKbReady}
                  />
                  <button type="submit" disabled={searching || !isKbReady} className="search-btn">
                    {searching ? <span className="btn-spinner"></span> : t.search}
                  </button>
                </form>
                
                {!isKbReady && (
                  <p className="status-warning">
                    {effectiveStatus === 'needs_indexing' 
                      ? t.kbDetail.needsIndexing 
                      : t.kbDetail.notReadyForSearch}
                  </p>
                )}
                
                {searchResults.length > 0 && (
                  <div className="search-results">
                    <h3>{t.kbDetail.searchResults} ({searchResults.length})</h3>
                    {searchResults.map((result, index) => (
                      <div key={index} className="search-result-item">
                        <div className="result-score">
                          {(result.score * 100).toFixed(1)}%
                        </div>
                        <p className="result-text">{result.text}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Q&A Tab */}
          {activeTab === 'qa' && (
            <div className="tab-content fade-in">
              <div className="qa-section">
                <form onSubmit={handleAsk} className="qa-form">
                  <input
                    type="text"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder={t.kbDetail.askPlaceholder}
                    className="qa-input"
                    disabled={!isKbReady}
                  />
                  <button type="submit" disabled={asking || !isKbReady} className="ask-btn">
                    {asking ? <span className="btn-spinner"></span> : t.kbDetail.ask}
                  </button>
                </form>
                
                {!isKbReady && (
                  <p className="status-warning">
                    {effectiveStatus === 'needs_indexing' 
                      ? t.kbDetail.needsIndexing 
                      : t.kbDetail.notReadyForQA}
                  </p>
                )}
                
                <div className="conversations-list">
                  {conversations.length === 0 ? (
                    <div className="empty-conversations">
                      <p>{t.kbDetail.noConversations}</p>
                    </div>
                  ) : (
                    conversations.map((conv, index) => (
                      <div key={conv.id || index} className="conversation-item fade-in">
                        <div className="conv-question">
                          <span className="conv-label">{t.kbDetail.question}</span>
                          <p>{conv.question}</p>
                        </div>
                        <div className="conv-answer">
                          <span className="conv-label">{t.kbDetail.answer}</span>
                          <p>{conv.answer}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Add Document Modal */}
      {showAddDoc && (
        <div className="modal-overlay" onClick={() => setShowAddDoc(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{t.kbDetail.addDocumentTitle}</h3>
            <div className="form-group">
              <label>{t.kbDetail.selectDocument}</label>
              <select 
                value={selectedDocId} 
                onChange={(e) => setSelectedDocId(e.target.value)}
                className="form-select"
              >
                <option value="">{t.kbDetail.chooseDocument}</option>
                {userDocuments.map(doc => (
                  <option key={doc.id} value={doc.id}>
                    {doc.original_filename} ({doc.total_pages || 1} {t.kbDetail.pages})
                  </option>
                ))}
              </select>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>{t.kbDetail.pageStart}</label>
                <input 
                  type="number" 
                  value={pageStart} 
                  onChange={(e) => setPageStart(e.target.value)}
                  placeholder={t.kbDetail.optional}
                  className="form-input"
                  min="1"
                />
              </div>
              <div className="form-group">
                <label>{t.kbDetail.pageEnd}</label>
                <input 
                  type="number" 
                  value={pageEnd} 
                  onChange={(e) => setPageEnd(e.target.value)}
                  placeholder={t.kbDetail.optional}
                  className="form-input"
                  min="1"
                />
              </div>
            </div>
            <div className="modal-actions">
              <button onClick={() => setShowAddDoc(false)} className="modal-cancel-btn">
                {t.cancel}
              </button>
              <button onClick={handleAddDocument} disabled={!selectedDocId} className="modal-confirm-btn">
                {t.kbDetail.addDocument}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Diagnostics Modal */}
      {showDiagnostics && diagnostics && (
        <div className="modal-overlay" onClick={() => setShowDiagnostics(false)}>
          <div className="modal diagnostics-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Knowledge Base Diagnostics</h3>
            
            <div className="diagnostics-section">
              <h4>Status</h4>
              <div className="diagnostics-grid">
                <div className="diag-item">
                  <span className="diag-label">Current Status:</span>
                  <span className={`diag-value status-${diagnostics.knowledge_base.current_status}`}>
                    {diagnostics.knowledge_base.current_status}
                  </span>
                </div>
                <div className="diag-item">
                  <span className="diag-label">Expected Status:</span>
                  <span className={`diag-value status-${diagnostics.knowledge_base.expected_status}`}>
                    {diagnostics.knowledge_base.expected_status}
                  </span>
                </div>
                {diagnostics.knowledge_base.status_mismatch && (
                  <div className="diag-warning">
                    ⚠️ Status mismatch detected! Use "Fix Status" button.
                  </div>
                )}
              </div>
            </div>

            <div className="diagnostics-section">
              <h4>Summary</h4>
              <div className="diagnostics-grid">
                <div className="diag-item">
                  <span className="diag-label">Total Documents:</span>
                  <span className="diag-value">{diagnostics.summary.total_documents}</span>
                </div>
                <div className="diag-item">
                  <span className="diag-label">Indexed:</span>
                  <span className="diag-value">{diagnostics.summary.indexed_documents}</span>
                </div>
                <div className="diag-item">
                  <span className="diag-label">With Chunks:</span>
                  <span className="diag-value">{diagnostics.summary.documents_with_chunks}</span>
                </div>
                <div className="diag-item">
                  <span className="diag-label">Total Chunks:</span>
                  <span className="diag-value">{diagnostics.summary.total_chunks}</span>
                </div>
                <div className="diag-item">
                  <span className="diag-label">Pending:</span>
                  <span className="diag-value">{diagnostics.summary.pending_documents}</span>
                </div>
                <div className="diag-item">
                  <span className="diag-label">Errors:</span>
                  <span className="diag-value">{diagnostics.summary.error_documents}</span>
                </div>
              </div>
            </div>

            {diagnostics.recommendations && diagnostics.recommendations.length > 0 && (
              <div className="diagnostics-section">
                <h4>Recommendations</h4>
                <div className="recommendations-list">
                  {diagnostics.recommendations.map((rec, idx) => (
                    <div key={idx} className={`recommendation ${rec.type}`}>
                      <span className="rec-icon">
                        {rec.type === 'status_fix' && '🔧'}
                        {rec.type === 'reindex' && '🔄'}
                        {rec.type === 'document_error' && '❌'}
                        {rec.type === 'stuck_processing' && '⏳'}
                        {rec.type === 'missing_tool' && '⚠️'}
                      </span>
                      <span className="rec-message">{rec.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="diagnostics-section">
              <h4>Documents</h4>
              <div className="documents-diag-list">
                {diagnostics.documents.map((doc, idx) => (
                  <div key={idx} className={`doc-diag-item status-${doc.status}`}>
                    <div className="doc-diag-name">{doc.filename}</div>
                    <div className="doc-diag-details">
                      <span>Status: {doc.status}</span>
                      <span>Chunks: {doc.chunk_count}</span>
                      <span>Words: {doc.word_count}</span>
                    </div>
                    {doc.error_message && (
                      <div className="doc-diag-error">{doc.error_message}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="modal-actions">
              <button onClick={() => setShowDiagnostics(false)} className="modal-cancel-btn">
                Close
              </button>
              <button onClick={handleFixStatus} disabled={fixingStatus} className="modal-confirm-btn">
                {fixingStatus ? 'Fixing...' : 'Fix Status'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KnowledgeBaseDetail;


