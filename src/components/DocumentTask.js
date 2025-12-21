import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { documentsAPI } from '../api';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import Logo from './Logo';
import './DocumentTask.css';

const DocumentTask = () => {
  const { documentId, taskId } = useParams();
  const navigate = useNavigate();
  const { t, toggleLanguage, language } = useLanguage();
  const toast = useToast();
  const pollInterval = useRef(null);
  
  // State
  const [document, setDocument] = useState(null);
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  
  // Pages state for editing
  const [extractedPages, setExtractedPages] = useState([]);
  const [translatedPages, setTranslatedPages] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [savingPage, setSavingPage] = useState(false);
  
  // Q&A
  const [question, setQuestion] = useState('');
  const [conversations, setConversations] = useState([]);
  const [asking, setAsking] = useState(false);
  const [expandedAnswers, setExpandedAnswers] = useState({});
  
  // View modes
  const [viewMode, setViewMode] = useState('extracted'); // 'extracted' or 'translated'

  // Split text into pages based on actual page count
  const splitIntoPages = useCallback((text, totalPages) => {
    if (!text) return [];
    
    // Try to split by page markers first
    const pageMarkerPattern = /\n\s*---+\s*PAGE\s*(\d+)?\s*---+\s*\n/gi;
    let pages = text.split(pageMarkerPattern).filter(p => p && p.trim() && isNaN(parseInt(p)));
    
    // If we got the right number of pages, use them
    if (pages.length === totalPages) {
      return pages.map((content, index) => ({
        pageNumber: index + 1,
        content: content.trim()
      }));
    }
    
    // Try splitting by form feed or multiple newlines
    const altPattern = /\f|\n{4,}/g;
    pages = text.split(altPattern).filter(p => p.trim());
    
    if (pages.length === totalPages) {
      return pages.map((content, index) => ({
        pageNumber: index + 1,
        content: content.trim()
      }));
    }
    
    // If we still don't have the right count, divide text evenly
    if (totalPages > 1) {
      const charsPerPage = Math.ceil(text.length / totalPages);
      pages = [];
      
      // Split by paragraphs first
      const paragraphs = text.split(/\n{2,}/);
      let currentPageContent = '';
      let currentPageIndex = 0;
      
      for (const para of paragraphs) {
        if (currentPageContent.length + para.length > charsPerPage && currentPageIndex < totalPages - 1) {
          pages.push({
            pageNumber: currentPageIndex + 1,
            content: currentPageContent.trim()
          });
          currentPageContent = para;
          currentPageIndex++;
        } else {
          currentPageContent += (currentPageContent ? '\n\n' : '') + para;
        }
      }
      
      // Add remaining content
      if (currentPageContent.trim()) {
        pages.push({
          pageNumber: currentPageIndex + 1,
          content: currentPageContent.trim()
        });
      }
      
      // If we still don't have enough pages, pad with empty ones or adjust
      while (pages.length < totalPages) {
        pages.push({
          pageNumber: pages.length + 1,
          content: ''
        });
      }
      
      return pages;
    }
    
    // Single page fallback
    return [{
      pageNumber: 1,
      content: text.trim()
    }];
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [docResponse, taskResponse] = await Promise.all([
          documentsAPI.get(documentId),
          documentsAPI.getTask(taskId)
        ]);
        
        setDocument(docResponse.data);
        setTask(taskResponse.data);
        
        // Parse pages from extracted text using the actual page count
        const totalPages = taskResponse.data.processing?.extracted_pages || 1;
        if (taskResponse.data.processing?.extracted_text) {
          setExtractedPages(splitIntoPages(taskResponse.data.processing.extracted_text, totalPages));
        }
        if (taskResponse.data.processing?.translated_text) {
          setTranslatedPages(splitIntoPages(taskResponse.data.processing.translated_text, totalPages));
        }
        
        // Load conversations if KB task
        if (taskResponse.data.task_type !== 'translate_only' && taskResponse.data.status === 'completed') {
          try {
            const convsResponse = await documentsAPI.getConversations(taskId);
            setConversations(convsResponse.data || []);
          } catch (e) {
            console.log('No conversations yet');
          }
        }
        
        // Start polling if task is in progress
        if (['pending', 'extracting', 'translating', 'embedding'].includes(taskResponse.data.status)) {
          startPolling();
        }
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error(t.docTask.loadError);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    return () => {
      if (pollInterval.current) {
        clearInterval(pollInterval.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId, documentId, splitIntoPages]);

  const startPolling = () => {
    if (pollInterval.current) {
      clearInterval(pollInterval.current);
    }
    
    pollInterval.current = setInterval(async () => {
      try {
        const response = await documentsAPI.getTask(taskId);
        setTask(response.data);
        
        if (['completed', 'failed'].includes(response.data.status)) {
          clearInterval(pollInterval.current);
          pollInterval.current = null;
          
          // Parse pages
          const totalPages = response.data.processing?.extracted_pages || 1;
          if (response.data.processing?.extracted_text) {
            setExtractedPages(splitIntoPages(response.data.processing.extracted_text, totalPages));
          }
          if (response.data.processing?.translated_text) {
            setTranslatedPages(splitIntoPages(response.data.processing.translated_text, totalPages));
          }
          
          // Load conversations for completed KB tasks
          if (response.data.status === 'completed' && response.data.task_type !== 'translate_only') {
            try {
              const convsResponse = await documentsAPI.getConversations(taskId);
              setConversations(convsResponse.data || []);
            } catch (e) {
              console.log('No conversations yet');
            }
          }
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 3000);
  };

  const handleProcess = async () => {
    setProcessing(true);
    try {
      const response = await documentsAPI.processTask(taskId);
      setTask(response.data.task);
      
      // If not completed yet, start polling
      if (response.data.task.status !== 'completed') {
        startPolling();
      }
    } catch (error) {
      toast.error(error.response?.data?.error || t.docTask.processError);
    } finally {
      setProcessing(false);
    }
  };

  const handleStartEdit = () => {
    const currentPages = viewMode === 'extracted' ? extractedPages : translatedPages;
    const page = currentPages.find(p => p.pageNumber === currentPage);
    if (page) {
      setEditContent(page.content);
      setIsEditing(true);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditContent('');
  };

  const handleSavePage = async () => {
    setSavingPage(true);
    
    try {
      const isTranslated = viewMode === 'translated';
      const pages = isTranslated ? [...translatedPages] : [...extractedPages];
      const pageIndex = pages.findIndex(p => p.pageNumber === currentPage);
      
      if (pageIndex !== -1) {
        pages[pageIndex] = { ...pages[pageIndex], content: editContent };
      }
      
      // Reconstruct full text
      const fullText = pages.map(p => p.content).join('\n\n---PAGE---\n\n');
      
      await documentsAPI.updateProcessingText(taskId, {
        [isTranslated ? 'translated_text' : 'extracted_text']: fullText
      });
      
      // Update local state
      if (isTranslated) {
        setTranslatedPages(pages);
      } else {
        setExtractedPages(pages);
      }
      
      setIsEditing(false);
      setEditContent('');
      toast.success(t.docTask.pageSaved || 'Page saved successfully!');
    } catch (error) {
      toast.error(error.response?.data?.error || t.docTask.saveError || 'Failed to save');
    } finally {
      setSavingPage(false);
    }
  };

  const handleDeletePage = async () => {
    if (!window.confirm(t.docTask.confirmDeletePage || 'Are you sure you want to delete this page?')) {
      return;
    }
    
    setSavingPage(true);
    
    try {
      const isTranslated = viewMode === 'translated';
      let pages = isTranslated ? [...translatedPages] : [...extractedPages];
      
      // Remove the current page
      pages = pages.filter(p => p.pageNumber !== currentPage);
      
      // Renumber remaining pages
      pages = pages.map((p, index) => ({ ...p, pageNumber: index + 1 }));
      
      // Reconstruct full text
      const fullText = pages.map(p => p.content).join('\n\n---PAGE---\n\n');
      
      await documentsAPI.updateProcessingText(taskId, {
        [isTranslated ? 'translated_text' : 'extracted_text']: fullText
      });
      
      // Update local state
      if (isTranslated) {
        setTranslatedPages(pages);
      } else {
        setExtractedPages(pages);
      }
      
      // Adjust current page if needed
      if (currentPage > pages.length) {
        setCurrentPage(Math.max(1, pages.length));
      }
      
      setIsEditing(false);
      toast.success(t.docTask.pageDeleted || 'Page deleted successfully!');
    } catch (error) {
      toast.error(error.response?.data?.error || t.docTask.saveError || 'Failed to delete');
    } finally {
      setSavingPage(false);
    }
  };

  const handleAsk = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;
    
    setAsking(true);
    try {
      const response = await documentsAPI.askQuestion(taskId, question, language);
      if (response.data.success) {
        setConversations([response.data.conversation, ...conversations]);
        setQuestion('');
        // Auto-expand the new answer
        setExpandedAnswers(prev => ({ ...prev, [response.data.conversation.id]: true }));
      }
    } catch (error) {
      toast.error(error.response?.data?.error || t.docTask.askError);
    } finally {
      setAsking(false);
    }
  };

  const toggleAnswerExpanded = (convId) => {
    setExpandedAnswers(prev => ({
      ...prev,
      [convId]: !prev[convId]
    }));
  };

  const handleDeleteConversation = async (convId) => {
    if (!window.confirm(t.docTask.confirmDeleteQuestion || 'Are you sure you want to delete this question?')) {
      return;
    }
    
    try {
      await documentsAPI.deleteConversation(taskId, convId);
      setConversations(conversations.filter(c => c.id !== convId));
    } catch (error) {
      // If no API exists yet, just remove from local state
      setConversations(conversations.filter(c => c.id !== convId));
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'failed':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        );
      case 'pending':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
        );
    }
  };

  if (loading) {
    return (
      <div className="doc-task-page">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <span>{t.loading}</span>
        </div>
      </div>
    );
  }

  if (!document || !task) {
    return (
      <div className="doc-task-page">
        <div className="error-state">{t.docTask.notFound}</div>
      </div>
    );
  }

  const isProcessing = ['extracting', 'translating', 'embedding'].includes(task.status);
  const hasKB = task.task_type !== 'translate_only';
  const hasTranslation = task.task_type !== 'kb_only';
  const currentPages = viewMode === 'extracted' ? extractedPages : translatedPages;
  const totalPagesCount = currentPages.length;
  const currentPageData = currentPages.find(p => p.pageNumber === currentPage);

  return (
    <div className="doc-task-page">
      <header className="doc-task-header">
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
              <div className="title-info">
                <h1>{document.original_filename}</h1>
                <span className="task-type-badge">{t.docTask.taskTypes[task.task_type]}</span>
              </div>
            </div>
          </div>
          <div className="header-actions">
            <button onClick={toggleLanguage} className="lang-btn">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3" />
              </svg>
              {t.language[language === 'fa' ? 'en' : 'fa']}
            </button>
          </div>
        </div>
      </header>

      <main className="doc-task-content">
        <div className="content-wrapper">
          {/* Status Card */}
          <div className={`status-card status-${task.status} fade-in`}>
            <div className="status-icon">
              {getStatusIcon(task.status)}
            </div>
            <div className="status-info">
              <h2>{t.docTask.status[task.status]}</h2>
              {task.error_message && (
                <p className="error-message">{task.error_message}</p>
              )}
              {isProcessing && (
                <div className="processing-indicator">
                  <div className="progress-bar">
                    <div className="progress-fill"></div>
                  </div>
                  <span>{t.docTask.processingSteps[task.status]}</span>
                </div>
              )}
            </div>
            {task.status === 'pending' && (
              <button 
                onClick={handleProcess} 
                disabled={processing}
                className="process-btn"
              >
                {processing ? (
                  <>
                    <span className="btn-spinner"></span>
                    {t.docTask.starting}
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                    </svg>
                    {t.docTask.startProcessing}
                  </>
                )}
              </button>
            )}
          </div>

          {/* Task Info */}
          <div className="task-info-card fade-in">
            <h3>{t.docTask.taskDetails}</h3>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">{t.docTask.tool}</span>
                <span className="info-value">{task.extraction_tool}</span>
              </div>
              {task.page_start && task.page_end && (
                <div className="info-item">
                  <span className="info-label">{t.docTask.pages}</span>
                  <span className="info-value">{task.page_start} - {task.page_end}</span>
                </div>
              )}
              <div className="info-item">
                <span className="info-label">{t.docTask.sourceLanguage}</span>
                <span className="info-value">{task.source_language}</span>
              </div>
              {hasTranslation && (
                <div className="info-item">
                  <span className="info-label">{t.docTask.targetLanguage}</span>
                  <span className="info-value">{task.target_language}</span>
                </div>
              )}
              <div className="info-item">
                <span className="info-label">{t.docTask.creditCost}</span>
                <span className="info-value">{task.credit_cost}</span>
              </div>
              {task.processing && (
                <>
                  <div className="info-item">
                    <span className="info-label">{t.docTask.wordCount}</span>
                    <span className="info-value">{task.processing.word_count}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">{t.docTask.pagesExtracted}</span>
                    <span className="info-value">{task.processing.extracted_pages}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Results Section */}
          {task.status === 'completed' && task.processing && (
            <div className="results-section fade-in">
              {/* View Toggle */}
              {hasTranslation && task.processing.translated_text && (
                <div className="view-toggle">
                  <button 
                    className={viewMode === 'extracted' ? 'active' : ''}
                    onClick={() => { setViewMode('extracted'); setCurrentPage(1); setIsEditing(false); }}
                  >
                    {t.docTask.extractedText}
                  </button>
                  <button 
                    className={viewMode === 'translated' ? 'active' : ''}
                    onClick={() => { setViewMode('translated'); setCurrentPage(1); setIsEditing(false); }}
                  >
                    {t.docTask.translatedText}
                  </button>
                </div>
              )}
              
              {/* Book View */}
              <div className="book-container">
                <div className="book-header">
                  <h3>
                    {viewMode === 'extracted' ? t.docTask.extractedText : t.docTask.translatedText}
                  </h3>
                  <span className="page-indicator">
                    {t.docTask.pageLabel || 'Page'} {currentPage} / {totalPagesCount}
                  </span>
                </div>
                
                {/* Book Page */}
                <div className="book-page">
                  {isEditing ? (
                    <textarea
                      className="book-page-editor"
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      dir="auto"
                      autoFocus
                    />
                  ) : (
                    <div className="book-page-content" dir="auto">
                      {currentPageData?.content || t.docTask.emptyPage || 'This page is empty'}
                    </div>
                  )}
                </div>
                
                {/* Book Actions */}
                <div className="book-actions">
                  {isEditing ? (
                    <>
                      <button 
                        className="book-action-btn cancel"
                        onClick={handleCancelEdit}
                        disabled={savingPage}
                      >
                        {t.cancel}
                      </button>
                      <button 
                        className="book-action-btn delete"
                        onClick={handleDeletePage}
                        disabled={savingPage || totalPagesCount <= 1}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                        {t.docTask.deletePage || 'Delete'}
                      </button>
                      <button 
                        className="book-action-btn save"
                        onClick={handleSavePage}
                        disabled={savingPage}
                      >
                        {savingPage ? (
                          <span className="btn-spinner-small"></span>
                        ) : (
                          <>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                            {t.save}
                          </>
                        )}
                      </button>
                    </>
                  ) : (
                    <button 
                      className="book-action-btn edit"
                      onClick={handleStartEdit}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                      </svg>
                      {t.edit}
                    </button>
                  )}
                </div>
                
                {/* Book Navigation */}
                <div className="book-navigation">
                  <button 
                    className="nav-btn prev"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage <= 1 || isEditing}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                    </svg>
                    {t.docTask.prevPage || 'Previous'}
                  </button>
                  
                  <div className="page-dots">
                    {Array.from({ length: Math.min(totalPagesCount, 10) }, (_, i) => {
                      let pageNum;
                      if (totalPagesCount <= 10) {
                        pageNum = i + 1;
                      } else {
                        // Show pages around current page
                        const start = Math.max(1, Math.min(currentPage - 4, totalPagesCount - 9));
                        pageNum = start + i;
                      }
                      return (
                        <button
                          key={pageNum}
                          className={`page-dot ${pageNum === currentPage ? 'active' : ''}`}
                          onClick={() => !isEditing && setCurrentPage(pageNum)}
                          disabled={isEditing}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    {totalPagesCount > 10 && currentPage < totalPagesCount - 4 && (
                      <span className="page-ellipsis">...</span>
                    )}
                  </div>
                  
                  <button 
                    className="nav-btn next"
                    onClick={() => setCurrentPage(p => Math.min(totalPagesCount, p + 1))}
                    disabled={currentPage >= totalPagesCount || isEditing}
                  >
                    {t.docTask.nextPage || 'Next'}
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Q&A Section - Only for KB tasks */}
              {hasKB ? (
                <div className="qa-section">
                  <h3>{t.docTask.askQuestions}</h3>
                  <form onSubmit={handleAsk} className="qa-form">
                    <input
                      type="text"
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      placeholder={t.docTask.askPlaceholder}
                      className="qa-input"
                    />
                    <button type="submit" disabled={asking} className="ask-btn">
                      {asking ? <span className="btn-spinner"></span> : t.docTask.ask}
                    </button>
                  </form>
                  
                  {conversations.length > 0 && (
                    <div className="conversations-list">
                      {conversations.map((conv, index) => {
                        const questionNumber = conversations.length - index;
                        const isExpanded = expandedAnswers[conv.id] !== false; // Default to expanded
                        
                        return (
                          <div key={conv.id || index} className="conversation-item fade-in">
                            <div className="conv-header">
                              <div className="conv-question" onClick={() => toggleAnswerExpanded(conv.id)}>
                                <span className="conv-number">{t.docTask.questionLabel || 'Q'}{questionNumber}</span>
                                <p>{conv.question}</p>
                                <svg 
                                  className={`expand-icon ${isExpanded ? 'expanded' : ''}`}
                                  xmlns="http://www.w3.org/2000/svg" 
                                  fill="none" 
                                  viewBox="0 0 24 24" 
                                  strokeWidth={2} 
                                  stroke="currentColor"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                                </svg>
                              </div>
                              <button 
                                className="delete-conv-btn"
                                onClick={() => handleDeleteConversation(conv.id)}
                                title={t.docTask.deleteQuestion || 'Delete question'}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                            {isExpanded && (
                              <div className="conv-answer">
                                <span className="conv-label">{t.docTask.answerLabel || 'A'}{questionNumber}</span>
                                <p>{conv.answer}</p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div className="qa-section qa-disabled">
                  <h3>{t.docTask.askQuestions}</h3>
                  <div className="qa-disabled-message">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                    <p>{t.docTask.qaNotAvailable || 'Q&A is not available for this task.'}</p>
                    <span>{t.docTask.qaNotAvailableHint || 'To ask questions about this document, create a new task with "Knowledge Base" option enabled.'}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default DocumentTask;
