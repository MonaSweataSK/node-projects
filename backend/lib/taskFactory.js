const crypto = require('crypto');

function buildTaskFromBody(body) {
  const now = new Date();
  const todayLocal = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return {
    id: 'task-' + crypto.randomUUID(),
    title: body.title.trim(),
    description: (body.description || '').trim(),
    status: body.status || 'todo',
    priority: body.priority || 'medium',
    category: body.category || 'work',
    dueDate: body.dueDate || todayLocal,
    createdAt: now.toISOString()
  };
}

module.exports = { buildTaskFromBody };
