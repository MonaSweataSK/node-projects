import React, { useState, useEffect } from 'react';
import TaskBoard from './components/TaskBoard';
import TaskForm from './components/TaskForm';
import Toast from './components/Toast';

const API_BASE = 'http://localhost:5000/api';

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Toast Helpers
  const addToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Fetch all tasks from backend API
  const fetchTasks = async () => {
    setLoading(true);
    try {
      // Build query string if filters are selected
      const params = new URLSearchParams();
      if (categoryFilter) params.append('category', categoryFilter);
      if (priorityFilter) params.append('priority', priorityFilter);
      // We do search client-side for smoother real-time typing response,
      // but backend supports it too if needed.
      
      const response = await fetch(`${API_BASE}/tasks?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to load tasks from server');
      }
      const data = await response.json();
      setTasks(data);
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Fetch tasks on initial render and filter changes
  useEffect(() => {
    fetchTasks();
  }, [categoryFilter, priorityFilter]);

  // Create or Update task
  const handleFormSubmit = async (taskData) => {
    try {
      let response;
      let result;
      
      if (editingTask) {
        // Update task
        response = await fetch(`${API_BASE}/tasks/${editingTask.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(taskData)
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to update task');
        }
        
        result = await response.json();
        setTasks(prev => prev.map(t => t.id === editingTask.id ? result : t));
        addToast('Task updated successfully!', 'success');
      } else {
        // Create task
        response = await fetch(`${API_BASE}/tasks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(taskData)
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create task');
        }
        
        result = await response.json();
        setTasks(prev => [result, ...prev]);
        addToast('Task created successfully!', 'success');
      }
      
      setIsModalOpen(false);
      setEditingTask(null);
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  // Quick Status change (lane shift)
  const handleStatusChange = async (taskId, newStatus) => {
    try {
      const response = await fetch(`${API_BASE}/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update task status');
      }
      
      const updated = await response.json();
      setTasks(prev => prev.map(t => t.id === taskId ? updated : t));
      addToast(`Task moved to ${newStatus.replace('-', ' ')}!`, 'success');
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  // Delete Task
  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    
    try {
      const response = await fetch(`${API_BASE}/tasks/${taskId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete task');
      }
      
      setTasks(prev => prev.filter(t => t.id !== taskId));
      addToast('Task deleted successfully.', 'info');
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  // Open Form modal
  const openCreateModal = () => {
    setEditingTask(null);
    setIsModalOpen(true);
  };

  const openEditModal = (task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };


  // Calculate statistics
  const totalCount = tasks.length;
  const todoCount = tasks.filter(t => t.status === 'todo').length;
  const progressCount = tasks.filter(t => t.status === 'in-progress').length;
  const completedCount = tasks.filter(t => t.status === 'completed').length;

  return (
    <div className="container">
      {/* HEADER SECTION */}
      <header>
        <div className="logo-section">
          <h1>SyncBoard</h1>
          <p>Productivity & Task Tracking Workspace</p>
        </div>
        
        <button className="btn btn-primary" onClick={openCreateModal}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '4px' }}>
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Add Task
        </button>
      </header>

      {/* STATISTICS PANELS */}
      <section className="stats-container">
        <div className="stat-card glass" style={{ borderLeft: '4px solid var(--primary)' }}>
          <span className="stat-title">Total Tasks</span>
          <span className="stat-value">{totalCount}</span>
        </div>
        <div className="stat-card glass" style={{ borderLeft: '4px solid var(--todo-color)' }}>
          <span className="stat-title">To Do</span>
          <span className="stat-value">{todoCount}</span>
        </div>
        <div className="stat-card glass" style={{ borderLeft: '4px solid var(--progress-color)' }}>
          <span className="stat-title">In Progress</span>
          <span className="stat-value">{progressCount}</span>
        </div>
        <div className="stat-card glass" style={{ borderLeft: '4px solid var(--completed-color)' }}>
          <span className="stat-title">Completed</span>
          <span className="stat-value">{completedCount}</span>
        </div>
      </section>

      {/* CONTROLS (SEARCH & FILTERS) */}
      <section className="controls-bar">
        <div className="search-filter-group">
          <select
            className="select-filter glass"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            aria-label="Filter by Category"
          >
            <option value="">All Categories</option>
            <option value="work">Work</option>
            <option value="personal">Personal</option>
            <option value="shopping">Shopping</option>
            <option value="other">Other</option>
          </select>

          <select
            className="select-filter glass"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            aria-label="Filter by Priority"
          >
            <option value="">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
      </section>

      {/* MAIN KANBAN BOARD */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid rgba(255,255,255,0.1)',
            borderTopColor: 'var(--primary)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem auto'
          }} />
          <p>Syncing task board...</p>
          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      ) : (
        <TaskBoard
          tasks={tasks}
          onDelete={handleDeleteTask}
          onEdit={openEditModal}
          onStatusChange={handleStatusChange}
        />
      )}

      {/* CREATE/EDIT TASK MODAL */}
      {isModalOpen && (
        <TaskForm
          task={editingTask}
          onSubmit={handleFormSubmit}
          onClose={() => {
            setIsModalOpen(false);
            setEditingTask(null);
          }}
        />
      )}

      {/* TOAST SYSTEM */}
      <Toast toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
