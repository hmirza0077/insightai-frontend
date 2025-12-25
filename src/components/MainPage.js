import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import { useTheme } from '../contexts/ThemeContext';
import { documentsAPI } from '../api';
import { useNavigate, Link } from 'react-router-dom';
import Logo from './Logo';
import WalletModal from './WalletModal';
import './MainPage.css';

const MainPage = () => {
  const { user, logout, refreshUser } = useAuth();
  const { t, toggleLanguage, language } = useLanguage();
  const toast = useToast();
  const { theme, toggleTheme } = useTheme();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [walletBalance, setWalletBalance] = useState(user?.wallet_balance || 0);
  const navigate = useNavigate();
  
  // Document editing state
  const [editingDoc, setEditingDoc] = useState(null);
  const [editName, setEditName] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

  useEffect(() => {
    loadDocuments();
    refreshUser();
  }, []);

  useEffect(() => {
    if (user?.wallet_balance !== undefined) {
      setWalletBalance(user.wallet_balance);
    }
  }, [user?.wallet_balance]);

  const loadDocuments = async () => {
    try {
      const response = await documentsAPI.list();
      setDocuments(response.data);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.warning(t.main.selectFileFirst);
      return;
    }

    setUploading(true);
    try {
      await documentsAPI.upload(selectedFile);
      await loadDocuments();
      setSelectedFile(null);
      document.getElementById('file-input').value = '';
      toast.success(t.main.uploadSuccess);
    } catch (error) {
      toast.error(t.main.uploadError + ' ' + (error.response?.data?.error || 'Unknown error'));
    } finally {
      setUploading(false);
    }
  };

  const handleProcessDocument = (documentId) => {
    navigate(`/document/${documentId}/process`);
  };

  const handleViewDocument = (documentId) => {
    navigate(`/document/${documentId}/process`);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Document editing handlers
  const handleStartEdit = (doc) => {
    setEditingDoc(doc.id);
    setEditName(doc.original_filename);
  };

  const handleCancelEdit = () => {
    setEditingDoc(null);
    setEditName('');
  };

  const handleSaveEdit = async (docId) => {
    if (!editName.trim()) {
      toast.warning(t.main.enterFileName || 'Please enter a file name');
      return;
    }
    
    try {
      await documentsAPI.update(docId, { original_filename: editName });
      await loadDocuments();
      setEditingDoc(null);
      setEditName('');
      toast.success(t.main.renameSuccess || 'Document renamed successfully');
    } catch (error) {
      toast.error(t.main.renameError || 'Failed to rename document');
    }
  };

  const handleDeleteDocument = async (docId) => {
    try {
      await documentsAPI.delete(docId);
      await loadDocuments();
      setShowDeleteConfirm(null);
      toast.success(t.main.deleteSuccess || 'Document deleted successfully');
    } catch (error) {
      toast.error(t.main.deleteError || 'Failed to delete document');
    }
  };

  return (
    <div className={`main-page theme-${theme}`}>
      <header className="main-header">
        <div className="header-content">
          <div className="header-brand">
            <Logo size={44} className="header-logo" />
            <h1>{t.appName}</h1>
          </div>
          
          <div className="header-actions">
            {/* Theme Toggle - Sun/Moon - Leftmost position */}
            <button onClick={toggleTheme} className="theme-toggle" aria-label="Toggle theme">
              <div className={`theme-toggle-track ${theme}`}>
                <div className="theme-toggle-thumb">
                  <svg className="sun-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="5"/>
                    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
                  </svg>
                  <svg className="moon-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                  </svg>
                </div>
              </div>
            </button>
            <span className="welcome-text">
              {t.main.welcome} {user?.email || user?.mobile_number || user?.username}
            </span>
            <div className="wallet-badge" onClick={() => setWalletModalOpen(true)} style={{ cursor: 'pointer' }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
              </svg>
              {t.main.wallet} ${walletBalance}
            </div>
            <nav className="header-nav">
              <Link to="/knowledge-base" className="nav-link">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                </svg>
                {t.main.knowledgeBases}
              </Link>
              <Link to="/agents" className="nav-link">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                </svg>
                {t.main.agents}
              </Link>
            </nav>
            <button onClick={toggleLanguage} className="lang-toggle">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
              </svg>
              {t.language[language === 'fa' ? 'en' : 'fa']}
            </button>
            <button onClick={handleLogout} className="logout-btn">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
              </svg>
              {t.main.logout}
            </button>
          </div>
        </div>
      </header>

      <main className="main-content">
        <div className="content-wrapper">
          {/* Upload Section */}
          <section className="upload-section fade-in">
            <div className="section-header">
              <div className="section-icon">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
              </div>
              <div>
                <h2>{t.main.uploadDocument}</h2>
                <p className="upload-info">{t.main.supportedFormats}</p>
              </div>
            </div>
            
            <div className="upload-area">
              <label htmlFor="file-input" className="file-drop-zone">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12l-3-3m0 0l-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                <span>{t.main.selectFile}</span>
                <input
                  type="file"
                  id="file-input"
                  onChange={handleFileChange}
                  accept=".pdf,.docx,.doc,.jpg,.jpeg,.png,.gif,.bmp,.tiff"
                />
              </label>
              
              {selectedFile && (
                <div className="selected-file fade-in">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                  <span>{t.main.selectedFile} {selectedFile.name}</span>
                </div>
              )}
              
              <button
                onClick={handleUpload}
                disabled={!selectedFile || uploading}
                className="upload-btn"
              >
                {uploading ? (
                  <>
                    <span className="loading-spinner-small"></span>
                    {t.main.uploading}
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                    {t.main.upload}
                  </>
                )}
              </button>
            </div>
          </section>

          {/* Documents Section */}
          <section className="documents-section">
            <div className="section-header">
              <div className="section-icon">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                </svg>
              </div>
              <h2>{t.main.yourDocuments}</h2>
            </div>
            
            {loading ? (
              <div className="loading-state">
                <div className="loading-spinner"></div>
                <span>{t.main.loadingDocuments}</span>
              </div>
            ) : documents.length === 0 ? (
              <div className="empty-state">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="empty-icon">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                <p>{t.main.noDocuments}</p>
              </div>
            ) : (
              <div className="documents-grid">
                {documents.map((doc, index) => (
                  <div 
                    key={doc.id} 
                    className="document-card fade-in"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <div className="doc-icon">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                      </svg>
                    </div>
                    <div className="doc-info">
                      {editingDoc === doc.id ? (
                        <div className="edit-name-form">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="edit-name-input"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit(doc.id);
                              if (e.key === 'Escape') handleCancelEdit();
                            }}
                          />
                          <div className="edit-name-actions">
                            <button onClick={() => handleSaveEdit(doc.id)} className="save-edit-btn" title={t.save}>
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                              </svg>
                            </button>
                            <button onClick={handleCancelEdit} className="cancel-edit-btn" title={t.cancel}>
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <h3>{doc.original_filename}</h3>
                      )}
                      <div className="doc-meta">
                        <span>{t.main.type} {doc.file_type.toUpperCase()}</span>
                        <span>{t.main.uploaded} {new Date(doc.uploaded_at).toLocaleDateString()}</span>
                      </div>
                      {(doc.has_tasks || doc.last_tool_used) && (
                        <div className="doc-badges">
                          {doc.has_tasks && (
                            <span className="processed-badge">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                              </svg>
                              {t.main.hasTasks}
                            </span>
                          )}
                          {doc.last_tool_used && (
                            <span className="doc-tool-used">
                              {t.main.tool} {doc.last_tool_used}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="doc-actions">
                      {/* Edit/Delete buttons */}
                      {editingDoc !== doc.id && (
                        <div className="doc-edit-actions">
                          <button
                            onClick={() => handleStartEdit(doc)}
                            className="doc-edit-btn"
                            title={t.edit || 'Edit'}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setShowDeleteConfirm(doc.id)}
                            className="doc-delete-btn"
                            title={t.delete || 'Delete'}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
                          </button>
                        </div>
                      )}
                      {doc.has_tasks ? (
                        <button
                          onClick={() => handleViewDocument(doc.id)}
                          className="doc-btn secondary"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {t.main.viewTasks}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleProcessDocument(doc.id)}
                          className="doc-btn primary"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                          </svg>
                          {t.main.processDocument}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>{t.main.confirmDelete || 'Delete Document?'}</h3>
            <p>{t.main.confirmDeleteMessage || 'This will permanently delete the document and all associated tasks. This action cannot be undone.'}</p>
            <div className="modal-actions">
              <button onClick={() => setShowDeleteConfirm(null)} className="modal-cancel-btn">
                {t.cancel || 'Cancel'}
              </button>
              <button onClick={() => handleDeleteDocument(showDeleteConfirm)} className="modal-delete-btn">
                {t.delete || 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Wallet Modal */}
      <WalletModal 
        isOpen={walletModalOpen}
        onClose={() => setWalletModalOpen(false)}
        walletBalance={walletBalance}
        onBalanceUpdate={(newBalance) => {
          setWalletBalance(newBalance);
          refreshUser();
        }}
      />
    </div>
  );
};

export default MainPage;
