import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { agentsAPI, knowledgeBaseAPI } from '../api';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import { useTheme } from '../contexts/ThemeContext';
import Logo from './Logo';
import './Agents.css';

const Agents = () => {
  const [agents, setAgents] = useState([]);
  const [knowledgeBases, setKnowledgeBases] = useState([]);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newAgent, setNewAgent] = useState({ 
    name: '', 
    description: '', 
    knowledge_base: '',
    provider: 'openai',
    model: 'gpt-4o-mini'
  });
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [question, setQuestion] = useState('');
  const [conversations, setConversations] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t, toggleLanguage, language } = useLanguage();
  const toast = useToast();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    loadAgents();
    loadKnowledgeBases();
    loadProviders();
    const kbId = searchParams.get('kb_id');
    if (kbId) {
      setNewAgent(prev => ({ ...prev, knowledge_base: kbId }));
      setShowCreateForm(true);
    }
  }, [searchParams]);

  const loadAgents = async () => {
    try {
      const response = await agentsAPI.list();
      setAgents(response.data.agents || response.data || []);
    } catch (error) {
      console.error('Error loading agents:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadKnowledgeBases = async () => {
    try {
      const response = await knowledgeBaseAPI.list();
      setKnowledgeBases(response.data.knowledge_bases || response.data || []);
    } catch (error) {
      console.error('Error loading knowledge bases:', error);
    }
  };

  const loadProviders = async () => {
    try {
      const response = await agentsAPI.getProviders();
      setProviders(response.data.providers || []);
    } catch (error) {
      console.error('Error loading providers:', error);
    }
  };

  const getModelsForProvider = (providerId) => {
    const provider = providers.find(p => p.id === providerId);
    return provider?.models || [];
  };

  const handleProviderChange = (providerId) => {
    const provider = providers.find(p => p.id === providerId);
    setNewAgent(prev => ({
      ...prev,
      provider: providerId,
      model: provider?.default_model || ''
    }));
  };

  const loadSessions = useCallback(async (agentId) => {
    try {
      const response = await agentsAPI.getSessions(agentId);
      setSessions(response.data || []);
    } catch (error) {
      console.error('Error loading sessions:', error);
      setSessions([]);
    }
  }, []);

  const loadConversations = useCallback(async (agentId, sessionId = null) => {
    try {
      const response = await agentsAPI.getConversations(agentId, sessionId);
      const convs = response.data.results || response.data || [];
      setConversations(convs.reverse());
    } catch (error) {
      console.error('Error loading conversations:', error);
      setConversations([]);
    }
  }, []);

  const handleCreateAgent = async (e) => {
    e.preventDefault();
    try {
      const agentData = {
        name: newAgent.name,
        description: newAgent.description,
        status: 'active',
        provider: newAgent.provider,
        model: newAgent.model,
      };
      if (newAgent.knowledge_base) {
        agentData.knowledge_base_ids = [parseInt(newAgent.knowledge_base)];
      }
      await agentsAPI.create(agentData);
      setShowCreateForm(false);
      setNewAgent({ name: '', description: '', knowledge_base: '', provider: 'openai', model: 'gpt-4o-mini' });
      loadAgents();
      toast.success(t.agents.createSuccess);
    } catch (error) {
      toast.error(t.agents.createError + ' ' + (error.response?.data?.error || 'Unknown error'));
    }
  };

  const handleDeleteAgent = async (agentId) => {
    try {
      await agentsAPI.delete(agentId);
      setShowDeleteConfirm(null);
      if (selectedAgent?.id === agentId) {
        setSelectedAgent(null);
        setConversations([]);
        setSessions([]);
      }
      loadAgents();
      toast.success(t.agents.deleteSuccess || 'Agent deleted successfully');
    } catch (error) {
      toast.error(t.agents.deleteError || 'Failed to delete agent');
    }
  };

  const handleSelectAgent = async (agent) => {
    setSelectedAgent(agent);
    setCurrentSessionId(null);
    setConversations([]);
    await loadSessions(agent.id);
  };

  const handleSelectSession = async (session) => {
    setCurrentSessionId(session.session_id);
    await loadConversations(selectedAgent.id, session.session_id);
  };

  const handleNewConversation = () => {
    setCurrentSessionId(null);
    setConversations([]);
  };

  const handleDeleteSession = async (sessionId, e) => {
    e.stopPropagation();
    try {
      await agentsAPI.deleteSession(sessionId);
      if (currentSessionId === sessionId) {
        setCurrentSessionId(null);
        setConversations([]);
      }
      await loadSessions(selectedAgent.id);
      toast.success(t.agents.sessionDeleted || 'Session deleted');
    } catch (error) {
      toast.error(t.agents.sessionDeleteError || 'Failed to delete session');
    }
  };

  const handleAskQuestion = async (e) => {
    e.preventDefault();
    if (!question.trim() || !selectedAgent || chatLoading) return;

    setChatLoading(true);
    try {
      const response = await agentsAPI.chat(selectedAgent.id, question, currentSessionId);
      if (response.data.success) {
        const newConv = response.data.conversation;
        setConversations(prev => [...prev, newConv]);
        
        // Update session ID if new session was created
        if (response.data.session_id && !currentSessionId) {
          setCurrentSessionId(response.data.session_id);
          await loadSessions(selectedAgent.id);
        }
      }
      setQuestion('');
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Unknown error';
      toast.error(t.agents.answerError + ' ' + errorMsg);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className={`agents-page theme-${theme}`}>
      <header className="agents-header">
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
              <h1>{t.agents.title}</h1>
            </div>
          </div>
          <div className="header-right">
            {/* Theme Toggle */}
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
            <button onClick={toggleLanguage} className="lang-btn">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
              </svg>
              {t.language[language === 'fa' ? 'en' : 'fa']}
            </button>
            <button onClick={() => setShowCreateForm(!showCreateForm)} className="create-btn">
              {showCreateForm ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  {t.cancel}
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  {t.agents.createAgent}
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="agents-content">
        <div className="content-wrapper">
          {showCreateForm && (
            <section className="create-form-section fade-in">
              <div className="section-header">
                <div className="section-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                  </svg>
                </div>
                <h2>{t.agents.createNewAgent}</h2>
              </div>
              <form onSubmit={handleCreateAgent} className="agent-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>{t.agents.name}</label>
                    <input type="text" value={newAgent.name} onChange={(e) => setNewAgent({ ...newAgent, name: e.target.value })} required className="form-input" />
                  </div>
                  <div className="form-group">
                    <label>{t.agents.knowledgeBase}</label>
                    <select value={newAgent.knowledge_base} onChange={(e) => setNewAgent({ ...newAgent, knowledge_base: e.target.value })} required className="form-select">
                      <option value="">{t.agents.selectKB}</option>
                      {knowledgeBases.map((kb) => (
                        <option key={kb.id} value={kb.id}>{kb.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>{t.agents.provider || 'LLM Provider'}</label>
                    <select 
                      value={newAgent.provider} 
                      onChange={(e) => handleProviderChange(e.target.value)} 
                      className="form-select"
                    >
                      {providers.map((provider) => (
                        <option key={provider.id} value={provider.id} disabled={!provider.available}>
                          {provider.name} {!provider.available && '(Not Configured)'}
                        </option>
                      ))}
                    </select>
                    {providers.length > 0 && (
                      <div className="provider-status">
                        {providers.find(p => p.id === newAgent.provider)?.available ? (
                          <span className="status-available">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" width="14" height="14">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                            {t.agents.providerAvailable || 'Available'}
                          </span>
                        ) : (
                          <span className="status-unavailable">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" width="14" height="14">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            {t.agents.providerUnavailable || 'API Key Required'}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="form-group">
                    <label>{t.agents.model || 'Model'}</label>
                    <select 
                      value={newAgent.model} 
                      onChange={(e) => setNewAgent({ ...newAgent, model: e.target.value })} 
                      className="form-select"
                    >
                      {getModelsForProvider(newAgent.provider).map(([modelId, modelName]) => (
                        <option key={modelId} value={modelId}>{modelName}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>{t.agents.description}</label>
                  <textarea value={newAgent.description} onChange={(e) => setNewAgent({ ...newAgent, description: e.target.value })} rows="3" className="form-textarea" />
                </div>
                <button type="submit" className="submit-btn">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                  {t.create} {t.agents.title.slice(0, -2)}
                </button>
              </form>
            </section>
          )}

          <div className="agents-layout">
            <section className="agents-list-section">
              <div className="section-header compact">
                <h2>{t.agents.yourAgents}</h2>
              </div>
              {loading ? (
                <div className="loading-state">
                  <div className="loading-spinner"></div>
                  <span>{t.loading}</span>
                </div>
              ) : agents.length === 0 ? (
                <div className="empty-state-small">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                  <p>{t.agents.noAgents}</p>
                </div>
              ) : (
                <div className="agents-list">
                  {agents.map((agent, index) => (
                    <div key={agent.id} className={`agent-card fade-in ${selectedAgent?.id === agent.id ? 'selected' : ''}`} style={{ animationDelay: `${index * 0.05}s` }}>
                      <div className="agent-card-main" onClick={() => handleSelectAgent(agent)}>
                        <div className="agent-avatar">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                          </svg>
                        </div>
                        <div className="agent-info">
                          <h3>{agent.name}</h3>
                          {agent.description && <p>{agent.description}</p>}
                          <div className="agent-meta">
                            <span className="agent-kb">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                              </svg>
                              {t.agents.kb} {agent.knowledge_bases_count || (agent.knowledge_bases?.length) || 0}
                            </span>
                            <span className="agent-provider">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 6.75v10.5a2.25 2.25 0 002.25 2.25zm.75-12h9v9h-9v-9z" />
                              </svg>
                              {agent.provider || 'openai'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <button className="agent-delete-btn" onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(agent.id); }} title={t.delete || 'Delete'}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {selectedAgent && (
              <>
                <section className="sessions-section fade-in">
                  <div className="sessions-header">
                    <h3>{t.agents.conversations || 'Conversations'}</h3>
                    <button className="new-chat-btn" onClick={handleNewConversation}>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                      </svg>
                      {t.agents.newChat || 'New Chat'}
                    </button>
                  </div>
                  <div className="sessions-list">
                    {sessions.length === 0 ? (
                      <div className="no-sessions">
                        <p>{t.agents.noSessions || 'No conversations yet'}</p>
                      </div>
                    ) : (
                      sessions.map((session) => (
                        <div key={session.session_id} className={`session-item ${currentSessionId === session.session_id ? 'active' : ''}`} onClick={() => handleSelectSession(session)}>
                          <div className="session-info">
                            <span className="session-title">{session.title || t.agents.untitledChat || 'Untitled Chat'}</span>
                            <span className="session-meta">{session.message_count} {t.agents.messages || 'messages'}</span>
                          </div>
                          <button className="session-delete-btn" onClick={(e) => handleDeleteSession(session.session_id, e)}>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </section>

                <section className="chat-section fade-in">
                  <div className="chat-header">
                    <div className="chat-agent-info">
                      <div className="chat-avatar">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                        </svg>
                      </div>
                      <h2>{t.agents.chatWith} {selectedAgent.name}</h2>
                    </div>
                  </div>
                  
                  <div className="conversations">
                    {conversations.length === 0 ? (
                      <div className="no-conversations">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                        </svg>
                        <p>{t.agents.noConversations}</p>
                      </div>
                    ) : (
                      conversations.map((conv, index) => (
                        <div key={conv.id || index} className="conversation fade-in">
                          <div className="message question">
                            <div className="message-icon user">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                              </svg>
                            </div>
                            <div className="message-content">
                              <span className="message-label">{t.agents.question}</span>
                              <p>{conv.question}</p>
                            </div>
                          </div>
                          <div className="message answer">
                            <div className="message-icon agent">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                              </svg>
                            </div>
                            <div className="message-content">
                              <span className="message-label">{t.agents.answer}</span>
                              <p>{conv.answer}</p>
                              {conv.knowledge_bases_used && conv.knowledge_bases_used.length > 0 && (
                                <div className="kb-sources">
                                  <span className="sources-label">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                                    </svg>
                                    {t.agents.sources || 'Sources'}:
                                  </span>
                                  <div className="sources-list">
                                    {conv.knowledge_bases_used.map((kbId, idx) => {
                                      const kb = knowledgeBases.find(k => k.id === kbId);
                                      return <span key={idx} className="source-tag">{kb ? kb.name : `KB ${kbId}`}</span>;
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                    {chatLoading && (
                      <div className="chat-loading">
                        <div className="loading-spinner small"></div>
                        <span>{t.agents.thinking || 'Thinking...'}</span>
                      </div>
                    )}
                  </div>
                  
                  <form onSubmit={handleAskQuestion} className="question-form">
                    <input type="text" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder={t.agents.askPlaceholder} className="question-input" disabled={chatLoading} />
                    <button type="submit" className="ask-btn" disabled={chatLoading || !question.trim()}>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                      </svg>
                      {t.agents.ask}
                    </button>
                  </form>
                </section>
              </>
            )}
          </div>
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon danger">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <h3>{t.agents.deleteConfirmTitle || 'Delete Agent?'}</h3>
            <p>{t.agents.deleteConfirmMessage || 'This will permanently delete the agent and all its conversations. This action cannot be undone.'}</p>
            <div className="modal-actions">
              <button className="modal-btn cancel" onClick={() => setShowDeleteConfirm(null)}>
                {t.cancel}
              </button>
              <button className="modal-btn danger" onClick={() => handleDeleteAgent(showDeleteConfirm)}>
                {t.delete || 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Agents;
