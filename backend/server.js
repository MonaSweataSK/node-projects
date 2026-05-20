const http = require('http');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

const PORT = 5000;
const DATA_FILE = path.join(__dirname, 'data', 'tasks.json');

// Helper to ensure data directory and file exist
async function initDatabase() {
  try {
    await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
    try {
      await fs.access(DATA_FILE);
    } catch {
      await fs.writeFile(DATA_FILE, JSON.stringify([], null, 2));
    }
  } catch (error) {
    console.error('Failed to initialize database file:', error);
  }
}

// Helper to read tasks
async function readTasks() {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading tasks file:', error);
    return [];
  }
}

// Helper to write tasks
async function writeTasks(tasks) {
  try {
    await fs.writeFile(DATA_FILE, JSON.stringify(tasks, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing tasks file:', error);
    return false;
  }
}

// Helper to read request body
function getRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(new Error('Invalid JSON format'));
      }
    });
    req.on('error', err => {
      reject(err);
    });
  });
}

// Helper to write JSON responses
function sendJSONResponse(res, statusCode, data) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

// Main request handler
const server = http.createServer(async (req, res) => {
  // Define CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle CORS preflight options request
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Parse URL and query params
  const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = parsedUrl.pathname;
  
  try {
    // 1. GET /api/tasks -> Get all tasks (supports query filtering)
    if (req.method === 'GET' && pathname === '/api/tasks') {
      const tasks = await readTasks();
      
      // Parse query params for filtering
      const statusFilter = parsedUrl.searchParams.get('status');
      const searchFilter = parsedUrl.searchParams.get('q');
      const categoryFilter = parsedUrl.searchParams.get('category');
      
      let filteredTasks = tasks;
      
      if (statusFilter) {
        filteredTasks = filteredTasks.filter(t => t.status === statusFilter);
      }
      
      if (categoryFilter) {
        filteredTasks = filteredTasks.filter(t => t.category === categoryFilter);
      }
      
      if (searchFilter) {
        const query = searchFilter.toLowerCase();
        filteredTasks = filteredTasks.filter(t => 
          t.title.toLowerCase().includes(query) || 
          t.description.toLowerCase().includes(query)
        );
      }
      
      sendJSONResponse(res, 200, filteredTasks);
      return;
    }

    // 2. GET /api/tasks/:id -> Get specific task
    const singleTaskRegex = /^\/api\/tasks\/([a-zA-Z0-9-]+)$/;
    const match = pathname.match(singleTaskRegex);
    
    if (req.method === 'GET' && match) {
      const taskId = match[1];
      const tasks = await readTasks();
      const task = tasks.find(t => t.id === taskId);
      
      if (task) {
        sendJSONResponse(res, 200, task);
      } else {
        sendJSONResponse(res, 404, { error: `Task with ID ${taskId} not found` });
      }
      return;
    }

    // 3. POST /api/tasks -> Create new task
    if (req.method === 'POST' && pathname === '/api/tasks') {
      try {
        const body = await getRequestBody(req);
        
        // Validation
        if (!body.title || body.title.trim() === '') {
          sendJSONResponse(res, 400, { error: 'Task title is required' });
          return;
        }
        
        const tasks = await readTasks();
        const newTask = {
          id: 'task-' + crypto.randomUUID(),
          title: body.title.trim(),
          description: (body.description || '').trim(),
          status: body.status || 'todo',
          priority: body.priority || 'medium',
          category: body.category || 'work',
          dueDate: body.dueDate || new Date().toISOString().split('T')[0],
          createdAt: new Date().toISOString()
        };
        
        tasks.push(newTask);
        const success = await writeTasks(tasks);
        
        if (success) {
          sendJSONResponse(res, 201, newTask);
        } else {
          sendJSONResponse(res, 500, { error: 'Failed to write task database' });
        }
      } catch (err) {
        sendJSONResponse(res, 400, { error: err.message });
      }
      return;
    }

    // 4. PUT /api/tasks/:id -> Update task
    if (req.method === 'PUT' && match) {
      const taskId = match[1];
      try {
        const body = await getRequestBody(req);
        const tasks = await readTasks();
        const taskIndex = tasks.findIndex(t => t.id === taskId);
        
        if (taskIndex === -1) {
          sendJSONResponse(res, 404, { error: `Task with ID ${taskId} not found` });
          return;
        }
        
        // Merge updates
        const updatedTask = {
          ...tasks[taskIndex],
          title: body.title !== undefined ? body.title.trim() : tasks[taskIndex].title,
          description: body.description !== undefined ? body.description.trim() : tasks[taskIndex].description,
          status: body.status !== undefined ? body.status : tasks[taskIndex].status,
          priority: body.priority !== undefined ? body.priority : tasks[taskIndex].priority,
          category: body.category !== undefined ? body.category : tasks[taskIndex].category,
          dueDate: body.dueDate !== undefined ? body.dueDate : tasks[taskIndex].dueDate
        };
        
        // Title validation if updated
        if (body.title !== undefined && updatedTask.title === '') {
          sendJSONResponse(res, 400, { error: 'Task title cannot be empty' });
          return;
        }
        
        tasks[taskIndex] = updatedTask;
        const success = await writeTasks(tasks);
        
        if (success) {
          sendJSONResponse(res, 200, updatedTask);
        } else {
          sendJSONResponse(res, 500, { error: 'Failed to save updated task' });
        }
      } catch (err) {
        sendJSONResponse(res, 400, { error: err.message });
      }
      return;
    }

    // 5. DELETE /api/tasks/:id -> Delete task
    if (req.method === 'DELETE' && match) {
      const taskId = match[1];
      const tasks = await readTasks();
      const taskIndex = tasks.findIndex(t => t.id === taskId);
      
      if (taskIndex === -1) {
        sendJSONResponse(res, 404, { error: `Task with ID ${taskId} not found` });
        return;
      }
      
      const deletedTask = tasks.splice(taskIndex, 1)[0];
      const success = await writeTasks(tasks);
      
      if (success) {
        sendJSONResponse(res, 200, { message: 'Task deleted successfully', id: taskId, task: deletedTask });
      } else {
        sendJSONResponse(res, 500, { error: 'Failed to write update to storage' });
      }
      return;
    }

    // Route not found
    sendJSONResponse(res, 404, { error: 'Resource not found' });
    
  } catch (error) {
    console.error('Request processing error:', error);
    sendJSONResponse(res, 500, { error: 'Internal Server Error' });
  }
});

// Initialize DB and start listening
initDatabase().then(() => {
  server.listen(PORT, () => {
    console.log(`🚀 Native HTTP Backend Server running on http://localhost:${PORT}`);
  });
});
