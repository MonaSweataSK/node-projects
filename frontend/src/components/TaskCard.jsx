import React from 'react';

export default function TaskCard({ task, onDelete, onEdit, onStatusChange }) {
  const isOverdue = () => {
    if (task.status === 'completed') return false;
    const today = new Date().toISOString().split('T')[0];
    return task.dueDate < today;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="task-card glass">
      <div className="task-card-header">
        <div className="task-tags">
          <span className={`tag tag-priority-${task.priority}`}>
            {task.priority}
          </span>
          <span className={`tag tag-category-${task.category}`}>
            {task.category}
          </span>
        </div>
        
        <div className="task-actions">
          <button 
            className="action-btn" 
            title="Edit Task"
            onClick={() => onEdit(task)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </button>
          <button 
            className="action-btn delete" 
            title="Delete Task"
            onClick={() => onDelete(task.id)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      </div>

      <h3>{task.title}</h3>
      {task.description && <p>{task.description}</p>}

      <div className="task-card-footer">
        <div className={`task-due ${isOverdue() ? 'overdue' : ''}`}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          <span>
            {isOverdue() ? `Overdue: ` : ''}
            {formatDate(task.dueDate)}
          </span>
        </div>

        <div className="status-change-buttons">
          {task.status !== 'todo' && (
            <button 
              className="status-shift-btn" 
              title="Move to Todo"
              onClick={() => onStatusChange(task.id, 'todo')}
            >
              ←
            </button>
          )}
          
          {task.status === 'todo' && (
            <button 
              className="status-shift-btn" 
              title="Start Work"
              onClick={() => onStatusChange(task.id, 'in-progress')}
            >
              Start
            </button>
          )}
          
          {task.status === 'in-progress' && (
            <button 
              className="status-shift-btn" 
              title="Complete Task"
              onClick={() => onStatusChange(task.id, 'completed')}
            >
              Done
            </button>
          )}
          
          {task.status === 'completed' && (
            <button 
              className="status-shift-btn" 
              title="Reopen Task"
              onClick={() => onStatusChange(task.id, 'in-progress')}
            >
              Reopen
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
