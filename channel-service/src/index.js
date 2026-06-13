const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const app = express();
const PORT = process.env.PORT || 4001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.path !== '/health') {
      console.log(`[Channel] ${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
    }
  });
  next();
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'channel-service', timestamp: new Date().toISOString() });
});

function simulateDeliveryLifecycle(communication) {
  const events = [];
  const now = Date.now();

  // Stage 1: Delivery (90% success rate)
  const deliveryDelay = randomInt(500, 3000); 
  if (Math.random() < 0.9) {
    events.push({
      status: 'delivered',
      delay: deliveryDelay,
      timestamp: new Date(now + deliveryDelay).toISOString(),
    });

    // Stage 2: Opened (45% of delivered)
    if (Math.random() < 0.45) {
      const openDelay = deliveryDelay + randomInt(2000, 10000);
      events.push({
        status: 'opened',
        delay: openDelay,
        timestamp: new Date(now + openDelay).toISOString(),
      });

      // Stage 3: Read (70% of opened)
      if (Math.random() < 0.70) {
        const readDelay = openDelay + randomInt(1000, 5000);
        events.push({
          status: 'read',
          delay: readDelay,
          timestamp: new Date(now + readDelay).toISOString(),
        });
      }

      // Stage 4: Clicked (30% of opened)
      if (Math.random() < 0.30) {
        const clickDelay = openDelay + randomInt(2000, 8000);
        events.push({
          status: 'clicked',
          delay: clickDelay,
          timestamp: new Date(now + clickDelay).toISOString(),
        });

        // Stage 5: Converted (40% of clicked)
        if (Math.random() < 0.40) {
          const conversionDelay = clickDelay + randomInt(4000, 12000);
          const revenue = randomInt(1200, 8900);
          events.push({
            status: 'converted',
            delay: conversionDelay,
            timestamp: new Date(now + conversionDelay).toISOString(),
            conversion_revenue: revenue
          });
        }
      }
    }
  } else {
    // Delivery failed
    events.push({
      status: 'failed',
      delay: deliveryDelay,
      timestamp: new Date(now + deliveryDelay).toISOString(),
      error_message: pickRandom([
        'Recipient address not found',
        'Message rejected by carrier',
        'Rate limit exceeded',
        'Invalid phone number format',
        'Recipient opted out',
      ]),
    });
  }

  return events;
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

app.post('/api/send', async (req, res) => {
  try {
    const { campaign_id, communications, callback_url } = req.body;

    if (!communications || !Array.isArray(communications) || communications.length === 0) {
      return res.status(400).json({ error: 'communications array is required' });
    }

    const callbackEndpoint = callback_url || process.env.CRM_RECEIPT_URL || 'http://localhost:4000/api/receipts';

    console.log(`[Channel] Received ${communications.length} communications for campaign ${campaign_id}`);

    for (const comm of communications) {
      const events = simulateDeliveryLifecycle(comm);

      for (const event of events) {
        setTimeout(async () => {
          try {
            await axios.post(callbackEndpoint, {
              communication_id: comm.communication_id,
              campaign_id: campaign_id,
              status: event.status,
              timestamp: event.timestamp,
              error_message: event.error_message || null,
              conversion_revenue: event.conversion_revenue || null
            });
            console.log(`[Channel] Callback sent: comm=${comm.communication_id} status=${event.status}`);
          } catch (error) {
            console.error(`[Channel] Callback failed for comm=${comm.communication_id}:`, error.message);
            // Retry
            setTimeout(async () => {
              try {
                await axios.post(callbackEndpoint, {
                  communication_id: comm.communication_id,
                  campaign_id: campaign_id,
                  status: event.status,
                  timestamp: event.timestamp,
                  error_message: event.error_message || null,
                  conversion_revenue: event.conversion_revenue || null
                });
              } catch (retryError) {}
            }, 2000);
          }
        }, event.delay);
      }
    }

    res.json({
      message: 'Communications accepted for processing',
      total: communications.length,
      campaign_id,
    });
  } catch (error) {
    console.error('[Channel] Error processing send request:', error);
    res.status(500).json({ error: 'Failed to process communications' });
  }
});

app.get('/api/stats', (req, res) => {
  res.json({
    service: 'channel-service',
    status: 'running',
    uptime: process.uptime(),
  });
});

app.listen(PORT, () => {
  console.log(`Channel Service running on port ${PORT}`);
});
