import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { agentsAPI, knowledgeBaseAPI } from '../api';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import Logo from './Logo';
import './Agents.css';

const Agents = () => {
  const [agents, setAgents] = useState([]);
  const [knowledgeBases, setKnowledgeBases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newAgent, setNewAgent] = useState({ name: '', description: '', knowledge_base: '' });
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [question, setQuestion] = useState('');
  const [conversations, setConversations] = useState([]);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t, toggleLanguage, language } = useLanguage();
  const toast = useToast();

  useEffect(() => {
    loadAgents();
    loadKnowledgeBases();
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

  const handleCreateAgent = async (e) => {
    e.preventDefault();
    try {
      // Convert knowledge_base to knowledge_base_ids array
      const agentData = {
        name: newAgent.name,
        description: newAgent.description,
        status: 'active',  // Set as active by default
      };
      
      // Add knowledge base if selected
      if (newAgent.knowledge_base) {
        agentData.knowledge_base_ids = [parseInt(newAgent.knowledge_base)];
      }
      
      await agentsAPI.create(agentData);
      setShowCreateForm(false);
      setNewAgent({ name: '', description: '', knowledge_base: '' });
      loadAgents();
      toast.success(t.agents.createSuccess);
    } catch (error) {
      toast.error(t.agents.createError + ' ' + (error.response?.data?.error || 'Unknown error'));
    }
  };

  const handleSelectAgent = (agent) => {
    setSelectedAgent(agent);
    setConversations(agent.conversations || []);
  };

  const handleAskQuestion = async (e) => {
    e.preventDefault();
    if (!question.trim() || !selectedAgent) return;

    try {
      const response = await agentsAPI.chat(selectedAgent.id, question);
      if (response.data.success) {
        setConversations([response.data.conversation, ...conversations]);
      }
      setQuestion('');
    } catch (error) {
      toast.error(t.agents.answerError + ' ' + (error.response?.data?.error || 'Unknown error'));
    }
  };

  return (
    <div className="agents-page">
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
                    <input
                      type="text"
                      value={newAgent.name}
                      onChange={(e) => setNewAgent({ ...newAgent, name: e.target.value })}
                      required
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label>{t.agents.knowledgeBase}</label>
                    <select
                      value={newAgent.knowledge_base}
                      onChange={(e) => setNewAgent({ ...newAgent, knowledge_base: e.target.value })}
                      required
                      className="form-select"
                    >
                      <option value="">{t.agents.selectKB}</option>
                      {knowledgeBases.map((kb) => (
                        <option key={kb.id} value={kb.id}>
                          {kb.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>{t.agents.description}</label>
                  <textarea
                    value={newAgent.description}
                    onChange={(e) => setNewAgent({ ...newAgent, description: e.target.value })}
                    rows="3"
                    className="form-textarea"
                  />
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
                    <div
                      key={agent.id}
                      className={`agent-card fade-in ${selectedAgent?.id === agent.id ? 'selected' : ''}`}
                      onClick={() => handleSelectAgent(agent)}
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                      <div className="agent-avatar">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                        </svg>
                      </div>
                      <div className="agent-info">
                        <h3>{agent.name}</h3>
                        {agent.description && <p>{agent.description}</p>}
                        <span className="agent-kb">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                          </svg>
                          {t.agents.kb} {agent.knowledge_bases_count || (agent.knowledge_bases?.length) || 0}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {selectedAgent && (
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
                                    return (
                                      <span key={idx} className="source-tag">
                                        {kb ? kb.name : `KB ${kbId}`}
                                      </span>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                
                <form onSubmit={handleAskQuestion} className="question-form">
                  <input
                    type="text"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder={t.agents.askPlaceholder}
                    className="question-input"
                  />
                  <button type="submit" className="ask-btn">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                    </svg>
                    {t.agents.ask}
                  </button>
                </form>
              </section>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Agents;

