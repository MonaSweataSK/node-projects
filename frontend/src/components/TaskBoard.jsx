import React from 'react';
import TaskCard from './TaskCard';

export default function TaskBoard({ tasks, onDelete, onEdit, onStatusChange }) {
  const todoTasks = tasks.filter(t => t.status === 'todo');
  const inProgressTasks = tasks.filter(t => t.status === 'in-progress');
  const completedTasks = tasks.filter(t => t.status === 'completed');

  const renderEmptyState = (statusText) => (
    <div className="empty-state">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
      <p>No tasks in {statusText}</p>
    </div>
  );

  return (
    <div className="board">
      {/* TO DO COLUMN */}
      <div className="column glass">
        <div className="column-header">
          <div className="column-title-group">
            <span className="column-dot todo"></span>
            <h2>To Do</h2>
          </div>
          <span className="column-count">{todoTasks.length}</span>
        </div>
        <div className="cards-container">
          {todoTasks.length > 0 ? (
            todoTasks.map(task => (
              <TaskCard 
                key={task.id}
                task={task}
                onDelete={onDelete}
                onEdit={onEdit}
                onStatusChange={onStatusChange}
              />
            ))
          ) : renderEmptyState('To Do')}
        </div>
      </div>

      {/* IN PROGRESS COLUMN */}
      <div className="column glass">
        <div className="column-header">
          <div className="column-title-group">
            <span className="column-dot progress"></span>
            <h2>In Progress</h2>
          </div>
          <span className="column-count">{inProgressTasks.length}</span>
        </div>
        <div className="cards-container">
          {inProgressTasks.length > 0 ? (
            inProgressTasks.map(task => (
              <TaskCard 
                key={task.id}
                task={task}
                onDelete={onDelete}
                onEdit={onEdit}
                onStatusChange={onStatusChange}
              />
            ))
          ) : renderEmptyState('In Progress')}
        </div>
      </div>

      {/* COMPLETED COLUMN */}
      <div className="column glass">
        <div className="column-header">
          <div className="column-title-group">
            <span className="column-dot completed"></span>
            <h2>Completed</h2>
          </div>
          <span className="column-count">{completedTasks.length}</span>
        </div>
        <div className="cards-container">
          {completedTasks.length > 0 ? (
            completedTasks.map(task => (
              <TaskCard 
                key={task.id}
                task={task}
                onDelete={onDelete}
                onEdit={onEdit}
                onStatusChange={onStatusChange}
              />
            ))
          ) : renderEmptyState('Completed')}
        </div>
      </div>
    </div>
  );
}
