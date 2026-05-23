const http = require('http');
const { initDatabase, readTasks, writeTasks } = require('./lib/tasksStore');
const { validateTaskBody, validateTaskUpdateBody } = require('./lib/taskValidation');
const { buildTaskFromBody } = require('./lib/taskFactory');

const PORT = 5000;
const MAX_BODY_SIZE = 1_000_000; // 1MB

// Helper to read request body
function getRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    let rejected = false;
    req.on('data', chunk => {
      body += chunk.toString();
      if (!rejected && body.length > MAX_BODY_SIZE) {
        rejected = true;
        reject(new Error('Request body too large'));
        try {
          req.socket.destroy();
        } catch (e) {
          // ignore socket destroy errors
        }
      }
    });
    req.on('end', () => {
      if (rejected) return;
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(new Error('Invalid JSON format'));
      }
    });
    req.on('error', err => {
      if (!rejected) reject(err);
    });
  });
}

// Helper to write JSON responses
function sendJSONResponse(res, statusCode, data) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

async function createTask(body) {
  const validationError = validateTaskBody(body);
  if (validationError) {
    return { error: validationError };
  }

  const tasks = await readTasks();
  const newTask = buildTaskFromBody(body);
  tasks.push(newTask);

  const success = await writeTasks(tasks);
  if (!success) {
    return { error: 'Failed to write task database', serverError: true };
  }

  return { task: newTask };
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
      const priorityFilter = parsedUrl.searchParams.get('priority');
      const searchFilter = parsedUrl.searchParams.get('q');
      const categoryFilter = parsedUrl.searchParams.get('category');
      
      let filteredTasks = tasks;
      
      if (statusFilter) {
        filteredTasks = filteredTasks.filter(t => t.status === statusFilter);
      }
      
      if (priorityFilter) {
        filteredTasks = filteredTasks.filter(t => t.priority === priorityFilter);
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
        const result = await createTask(body);

        if (result.error) {
          const status = result.serverError ? 500 : 400;
          sendJSONResponse(res, status, { error: result.error });
          return;
        }

        sendJSONResponse(res, 201, result.task);
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
        // Strip immutable fields if sent by client
        const { id: _id, createdAt: _createdAt, ...safeBody } = body;
        const validationError = validateTaskUpdateBody(safeBody);
        if (validationError) {
          sendJSONResponse(res, 400, { error: validationError });
          return;
        }

        const tasks = await readTasks();
        const taskIndex = tasks.findIndex(t => t.id === taskId);
        
        if (taskIndex === -1) {
          sendJSONResponse(res, 404, { error: `Task with ID ${taskId} not found` });
          return;
        }
        
        // Merge updates
        const updatedTask = {
          ...tasks[taskIndex],
          title: safeBody.title !== undefined ? safeBody.title.trim() : tasks[taskIndex].title,
          description: safeBody.description !== undefined ? safeBody.description.trim() : tasks[taskIndex].description,
          status: safeBody.status !== undefined ? safeBody.status : tasks[taskIndex].status,
          priority: safeBody.priority !== undefined ? safeBody.priority : tasks[taskIndex].priority,
          category: safeBody.category !== undefined ? safeBody.category : tasks[taskIndex].category,
          dueDate: safeBody.dueDate !== undefined ? safeBody.dueDate : tasks[taskIndex].dueDate
        };
        
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
