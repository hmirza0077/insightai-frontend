import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import { documentsAPI } from '../api';
import './DocumentProcess.css';

const DocumentProcess = () => {
  const { id: documentId } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const toast = useToast();
  const [document, setDocument] = useState(null);
  const [docInfo, setDocInfo] = useState(null);
  const [existingTasks, setExistingTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  // Task configuration
  const [taskType, setTaskType] = useState(''); // 'translate_only', 'translate_kb', 'kb_only'
  const [selectedTool, setSelectedTool] = useState('auto');
  const [availableTools, setAvailableTools] = useState([]);
  const [recommendedTool, setRecommendedTool] = useState('');
  const [pageRange, setPageRange] = useState({ start: '', end: '' });
  const [usePageRange, setUsePageRange] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState('en');
  const [ocrLanguage, setOcrLanguage] = useState('fas+eng');
  const [sourceLanguage, setSourceLanguage] = useState('fa');

  useEffect(() => {
    loadDocument();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId]);

  const loadDocument = async () => {
    try {
      const [docResponse, infoResponse, tasksResponse] = await Promise.all([
        documentsAPI.get(documentId),
        documentsAPI.getInfo(documentId),
        documentsAPI.getTasks(documentId)
      ]);
      
      setDocument(docResponse.data);
      setDocInfo(infoResponse.data);
      setExistingTasks(tasksResponse.data || []);
      
      // Debug logging
      console.log('[DocumentProcess] Info response:', infoResponse.data);
      console.log('[DocumentProcess] Available tools:', infoResponse.data.available_tools);
      console.log('[DocumentProcess] Recommended tool:', infoResponse.data.recommended_tool);
      
      setAvailableTools(infoResponse.data.available_tools || []);
      setRecommendedTool(infoResponse.data.recommended_tool || 'auto');
      setSelectedTool(infoResponse.data.recommended_tool || 'auto');
      
      // Set total pages if available
      if (infoResponse.data.total_pages) {
        setPageRange({ start: '1', end: String(infoResponse.data.total_pages) });
      }
      
      // If no existing tasks, show create form by default
      if (!tasksResponse.data || tasksResponse.data.length === 0) {
        setShowCreateForm(true);
      }
    } catch (error) {
      console.error('Error loading document:', error);
      toast.error(t.docProcess.loadError + ': ' + (error.response?.data?.error || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async () => {
    if (!taskType) {
      toast.warning(t.docProcess.whatToDo);
      return;
    }

    setProcessing(true);
    try {
      const taskData = {
        task_type: taskType,
        extraction_tool: selectedTool,
        source_language: sourceLanguage,
        ocr_language: ocrLanguage,
      };

      if (usePageRange && pageRange.start && pageRange.end) {
        taskData.page_start = parseInt(pageRange.start);
        taskData.page_end = parseInt(pageRange.end);
      }

      if (taskType === 'translate_only' || taskType === 'translate_kb') {
        taskData.target_language = targetLanguage;
      }

      const response = await documentsAPI.createTask(documentId, taskData);
      toast.success(t.docProcess.taskCreated);
      navigate(`/document/${documentId}/task/${response.data.id}`);
    } catch (error) {
      toast.error(t.docProcess.taskError + ' ' + (error.response?.data?.error || 'Unknown error'));
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return <div className="loading">{t.loading}</div>;
  }

  if (!document || !docInfo) {
    return <div className="error">{t.docProcess.loadError}</div>;
  }

  const getStatusClass = (status) => {
    switch (status) {
      case 'completed': return 'status-completed';
      case 'failed': return 'status-failed';
      case 'pending': return 'status-pending';
      default: return 'status-processing';
    }
  };

  const getTaskTypeLabel = (type) => {
    switch (type) {
      case 'translate_only': return t.docProcess.translateOnly;
      case 'translate_kb': return t.docProcess.translateKb;
      case 'kb_only': return t.docProcess.kbOnly;
      default: return type;
    }
  };

  return (
    <div className="document-process">
      <div className="header">
        <button onClick={() => navigate('/main')} className="back-button">
          {t.back}
        </button>
        <h1>{document.original_filename}</h1>
        {docInfo.total_pages && (
          <span className="page-count">{docInfo.total_pages} {t.docProcess.pages}</span>
        )}
      </div>

      <div className="content">
        {/* Existing Tasks Section */}
        {existingTasks.length > 0 && (
          <div className="existing-tasks-section">
            <div className="section-header-row">
              <h2>{t.docProcess.existingTasks}</h2>
              <button 
                onClick={() => setShowCreateForm(!showCreateForm)} 
                className="toggle-form-btn"
              >
                {showCreateForm ? t.docProcess.hideCreateForm : t.docProcess.createNewTask}
              </button>
            </div>
            
            <div className="tasks-list">
              {existingTasks.map((task) => (
                <div 
                  key={task.id} 
                  className={`task-card ${getStatusClass(task.status)}`}
                  onClick={() => navigate(`/document/${documentId}/task/${task.id}`)}
                >
                  <div className="task-card-header">
                    <span className="task-type">{getTaskTypeLabel(task.task_type)}</span>
                    <span className={`task-status ${getStatusClass(task.status)}`}>
                      {t.docTask?.status?.[task.status] || task.status}
                    </span>
                  </div>
                  <div className="task-card-details">
                    <span className="task-detail">
                      <strong>{t.docProcess.extractionTool}:</strong> {task.extraction_tool}
                    </span>
                    {task.page_start && task.page_end && (
                      <span className="task-detail">
                        <strong>{t.docProcess.pageRange}:</strong> {task.page_start} - {task.page_end}
                      </span>
                    )}
                    {task.target_language && (
                      <span className="task-detail">
                        <strong>{t.docProcess.targetLanguage}:</strong> {task.target_language}
                      </span>
                    )}
                  </div>
                  <div className="task-card-footer">
                    <span className="task-date">
                      {new Date(task.created_at).toLocaleDateString()}
                    </span>
                    {task.credit_cost > 0 && (
                      <span className="task-cost">
                        {t.docTask?.creditCost || 'Cost'}: ${task.credit_cost}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Create New Task Section */}
        {showCreateForm && (
        <div className="process-section">
          <h2>{existingTasks.length > 0 ? t.docProcess.createNewTask : t.docProcess.whatToDo}</h2>
          
          {/* Task Type Selection */}
          <div className="task-type-selection">
            <div
              className={`task-option ${taskType === 'translate_only' ? 'selected' : ''}`}
              onClick={() => setTaskType('translate_only')}
            >
              <div className="task-icon">🌐</div>
              <div className="task-content">
                <h3>{t.docProcess.translateOnly}</h3>
                <p>{t.docProcess.translateOnlyDesc}</p>
              </div>
              {taskType === 'translate_only' && <div className="checkmark">✓</div>}
            </div>

            <div
              className={`task-option ${taskType === 'translate_kb' ? 'selected' : ''}`}
              onClick={() => setTaskType('translate_kb')}
            >
              <div className="task-icon">🌐📚</div>
              <div className="task-content">
                <h3>{t.docProcess.translateKb}</h3>
                <p>{t.docProcess.translateKbDesc}</p>
              </div>
              {taskType === 'translate_kb' && <div className="checkmark">✓</div>}
            </div>

            <div
              className={`task-option ${taskType === 'kb_only' ? 'selected' : ''}`}
              onClick={() => setTaskType('kb_only')}
            >
              <div className="task-icon">📚</div>
              <div className="task-content">
                <h3>{t.docProcess.kbOnly}</h3>
                <p>{t.docProcess.kbOnlyDesc}</p>
              </div>
              {taskType === 'kb_only' && <div className="checkmark">✓</div>}
            </div>
          </div>

          {taskType && (
            <>
              {/* Translation Language Selection */}
              {(taskType === 'translate_only' || taskType === 'translate_kb') && (
                <div className="config-section">
                  <h3>{t.docProcess.translationSettings}</h3>
                  <div className="form-group">
                    <label>{t.docProcess.targetLanguage}</label>
                    <select
                      value={targetLanguage}
                      onChange={(e) => setTargetLanguage(e.target.value)}
                      className="form-select"
                    >
                      <option value="en">English</option>
                      <option value="fa">Persian (Farsi)</option>
                      <option value="ar">Arabic</option>
                      <option value="de">German</option>
                      <option value="fr">French</option>
                      <option value="es">Spanish</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Extraction Tool Selection */}
              <div className="config-section">
                <h3>{t.docProcess.extractionTool}</h3>
                <div className="form-group">
                  <label>{t.docProcess.selectTool}</label>
                  <select
                    value={selectedTool}
                    onChange={(e) => setSelectedTool(e.target.value)}
                    className="form-select"
                  >
                    <option value="auto">
                      {t.docProcess.autoSelect || 'Auto-select'} 
                      {recommendedTool && recommendedTool !== 'auto' ? ` → ${availableTools.find(t => t.id === recommendedTool)?.name || recommendedTool}` : ''} 
                      ({t.docProcess.recommended || 'Recommended'})
                    </option>
                    {availableTools.map((tool) => (
                      <option key={tool.id} value={tool.id}>
                        {tool.name}
                        {tool.ocr ? ' 🔍' : ''}
                        {tool.id === recommendedTool ? ` (${t.docProcess.recommended || 'Recommended'})` : ''}
                      </option>
                    ))}
                  </select>
                  {availableTools.length === 0 && (
                    <p className="info-text warning">
                      {t.docProcess.noToolsAvailable || 'No extraction tools available for this file type'}
                    </p>
                  )}
                  {availableTools.length === 1 && (
                    <p className="info-text">
                      {t.docProcess.onlyToolAvailable || 'Only'} <strong>{availableTools[0].name}</strong> {t.docProcess.supportsThisFormat || 'supports this file format'}
                    </p>
                  )}
                </div>
                
                {selectedTool && availableTools.find(t => t.id === selectedTool) && (
                  <div className="tool-info-box">
                    {(() => {
                      const tool = availableTools.find(t => t.id === selectedTool);
                      return (
                        <>
                          <h4>{tool.name}</h4>
                          <p>{tool.description}</p>
                          <div className="tool-badges">
                            <span className={`badge ${tool.supports_ocr ? 'badge-success' : 'badge-warning'}`}>
                              {tool.supports_ocr ? '✓ OCR' : '✗ No OCR'}
                            </span>
                            <span className={`badge ${tool.supports_persian ? 'badge-success' : 'badge-warning'}`}>
                              {tool.supports_persian ? '✓ Persian' : '✗ No Persian'}
                            </span>
                            <span className={`badge ${tool.tool_type === 'open_source' ? 'badge-info' : 'badge-commercial'}`}>
                              {tool.tool_type === 'open_source' ? 'Open Source' : 'Commercial'}
                            </span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}

                {/* OCR Language */}
                {docInfo.needs_ocr && (
                  <div className="form-group">
                    <label>OCR Language</label>
                    <select
                      value={ocrLanguage}
                      onChange={(e) => setOcrLanguage(e.target.value)}
                      className="form-select"
                    >
                      <option value="fas">Persian (Farsi)</option>
                      <option value="eng">English</option>
                      <option value="fas+eng">Persian + English</option>
                      <option value="ara">Arabic</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Page Range Selection */}
              {docInfo.total_pages > 1 && (
                <div className="config-section">
                  <h3>{t.docProcess.pageRange}</h3>
                  <div className="form-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={usePageRange}
                        onChange={(e) => setUsePageRange(e.target.checked)}
                      />
                      {t.docProcess.extractPageRange}
                    </label>
                  </div>
                  
                  {usePageRange && (
                    <div className="page-range-inputs">
                      <div className="form-group">
                        <label>{t.docProcess.startPage}</label>
                        <input
                          type="number"
                          min="1"
                          max={docInfo.total_pages}
                          value={pageRange.start}
                          onChange={(e) => setPageRange({ ...pageRange, start: e.target.value })}
                          className="form-input"
                        />
                      </div>
                      <span className="range-separator">{t.docProcess.to}</span>
                      <div className="form-group">
                        <label>{t.docProcess.endPage}</label>
                        <input
                          type="number"
                          min="1"
                          max={docInfo.total_pages}
                          value={pageRange.end}
                          onChange={(e) => setPageRange({ ...pageRange, end: e.target.value })}
                          className="form-input"
                        />
                      </div>
                    </div>
                  )}
                  
                  {!usePageRange && (
                    <p className="info-text">{t.docProcess.allPages}</p>
                  )}
                </div>
              )}

              {/* Source Language */}
              <div className="config-section">
                <h3>{t.docProcess.sourceLanguage}</h3>
                <div className="form-group">
                  <label>{t.docProcess.documentLanguage}</label>
                  <select
                    value={sourceLanguage}
                    onChange={(e) => setSourceLanguage(e.target.value)}
                    className="form-select"
                  >
                    <option value="fa">Persian (Farsi)</option>
                    <option value="en">English</option>
                    <option value="ar">Arabic</option>
                    <option value="de">German</option>
                    <option value="fr">French</option>
                  </select>
                </div>
              </div>

              <button
                onClick={handleCreateTask}
                disabled={processing}
                className="process-button"
              >
                {processing ? t.docProcess.creatingTask : t.docProcess.startProcessing}
              </button>
            </>
          )}
        </div>
        )}
      </div>
    </div>
  );
};

export default DocumentProcess;
