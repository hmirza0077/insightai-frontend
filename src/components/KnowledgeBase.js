import React, { useState, useEffect } from 'react';
import { knowledgeBaseAPI } from '../api';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import Logo from './Logo';
import './KnowledgeBase.css';

const KnowledgeBase = () => {
  const [knowledgeBases, setKnowledgeBases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKBName, setNewKBName] = useState('');
  const [newKBDescription, setNewKBDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();
  const { t, toggleLanguage, language } = useLanguage();
  const toast = useToast();

  useEffect(() => {
    loadKnowledgeBases();
  }, []);

  const loadKnowledgeBases = async () => {
    try {
      const response = await knowledgeBaseAPI.list();
      setKnowledgeBases(response.data.knowledge_bases || response.data || []);
    } catch (error) {
      console.error('Error loading knowledge bases:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAgent = (e, kbId) => {
    e.stopPropagation();
    navigate(`/agents?kb_id=${kbId}`);
  };

  const handleOpenKB = (kbId) => {
    navigate(`/knowledge-base/${kbId}`);
  };

  const handleCreateKB = async (e) => {
    e.preventDefault();
    if (!newKBName.trim()) return;
    
    setCreating(true);
    try {
      const response = await knowledgeBaseAPI.create({
        name: newKBName,
        description: newKBDescription
      });
      setShowCreateModal(false);
      setNewKBName('');
      setNewKBDescription('');
      loadKnowledgeBases();
      // Navigate to the new KB
      navigate(`/knowledge-base/${response.data.id}`);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error creating knowledge base');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="knowledge-base-page">
      <header className="kb-header">
        <div className="header-content">
          <div className="header-left">
            <button onClick={() => navigate('/main')} className="back-btn">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
              {t.back}
            </button>
            <div className="page-title">
              <Logo size={36} className="header-logo" />
              <h1>{t.kb.title}</h1>
            </div>
          </div>
          <div className="header-right">
            <button onClick={toggleLanguage} className="lang-btn">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
              </svg>
              {t.language[language === 'fa' ? 'en' : 'fa']}
            </button>
            <button onClick={() => setShowCreateModal(true)} className="create-kb-btn">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              {t.kb.createNew}
            </button>
          </div>
        </div>
      </header>

      <main className="kb-content">
        <div className="content-wrapper">
          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <span>{t.loading}</span>
            </div>
          ) : knowledgeBases.length === 0 ? (
            <div className="empty-state fade-in">
              <div className="empty-icon-wrapper">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                </svg>
              </div>
              <p>{t.kb.noKB}</p>
              <button onClick={() => setShowCreateModal(true)} className="create-first-btn">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                {t.kb.createNew}
              </button>
            </div>
          ) : (
            <div className="kb-grid">
              {knowledgeBases.map((kb, index) => (
                <div 
                  key={kb.id} 
                  className="kb-card fade-in"
                  style={{ animationDelay: `${index * 0.05}s` }}
                  onClick={() => handleOpenKB(kb.id)}
                >
                  <div className="kb-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                    </svg>
                  </div>
                  <div className="kb-info">
                    <h3>{kb.name}</h3>
                    {kb.description && <p className="kb-description">{kb.description}</p>}
                    <div className="kb-meta">
                      <span>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                        </svg>
                        {t.kb.created} {new Date(kb.created_at).toLocaleDateString()}
                      </span>
                      <span>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                        </svg>
                        {t.kb.items} {kb.total_documents || kb.items?.length || 0}
                      </span>
                      {kb.status && (
                        <span className={`kb-status status-${kb.status}`}>
                          {t.kbDetail?.status?.[kb.status] || kb.status}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="kb-actions">
                    <button onClick={(e) => handleCreateAgent(e, kb.id)} className="create-agent-btn">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                      </svg>
                      {t.kb.createAgent}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{t.kb.createNew}</h3>
            <form onSubmit={handleCreateKB}>
              <div className="form-group">
                <label>{t.agents.name}</label>
                <input
                  type="text"
                  value={newKBName}
                  onChange={(e) => setNewKBName(e.target.value)}
                  placeholder={t.agents.name}
                  className="form-input"
                  required
                />
              </div>
              <div className="form-group">
                <label>{t.agents.description}</label>
                <textarea
                  value={newKBDescription}
                  onChange={(e) => setNewKBDescription(e.target.value)}
                  placeholder={t.agents.description}
                  className="form-textarea"
                  rows="3"
                />
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowCreateModal(false)} className="modal-cancel-btn">
                  {t.cancel}
                </button>
                <button type="submit" disabled={creating || !newKBName.trim()} className="modal-confirm-btn">
                  {creating ? t.loading : t.create}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default KnowledgeBase;

