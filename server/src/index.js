const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const { initializeDatabase } = require('./schema');
const customersRouter = require('./routes/customers');
const ordersRouter = require('./routes/orders');
const segmentsRouter = require('./routes/segments');
const campaignsRouter = require('./routes/campaigns');
const receiptsRouter = require('./routes/receipts');
const analyticsRouter = require('./routes/analytics');
const aiRouter = require('./routes/ai');

const app = express();
const PORT = process.env.PORT || 4000;

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});
app.set('io', io);

io.on('connection', (socket) => {
  console.log('Socket.io client connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('Socket.io client disconnected:', socket.id);
  });
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.path !== '/health') {
      console.log(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
    }
  });
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'crm-server', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/customers', customersRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/segments', segmentsRouter);
app.use('/api/campaigns', campaignsRouter);
app.use('/api/receipts', receiptsRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/ai', aiRouter);

// Error handling
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
async function start() {
  try {
    await initializeDatabase();
    server.listen(PORT, () => {
      console.log(`CRM Server running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
