const express = require('express');
const router = express.Router();
const db = require('../db');
const axios = require('axios');
const { buildWhereClause } = require('./segments');

// GET all campaigns
router.get('/', async (req, res) => {
  try {
    const result = db.query(
      `SELECT c.*, s.name as segment_name
       FROM campaigns c
       LEFT JOIN segments s ON c.segment_id = s.id
       ORDER BY c.created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
});

// GET single campaign with communications
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const campResult = db.query(
      `SELECT c.*, s.name as segment_name
       FROM campaigns c
       LEFT JOIN segments s ON c.segment_id = s.id
       WHERE c.id = ?`,
      [id]
    );

    if (campResult.rows.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const commsResult = db.query(
      `SELECT cm.*, cu.name as customer_name, cu.email as customer_email
       FROM communications cm
       JOIN customers cu ON cm.customer_id = cu.id
       WHERE cm.campaign_id = ?
       ORDER BY cm.created_at DESC`,
      [id]
    );

    res.json({
      campaign: campResult.rows[0],
      communications: commsResult.rows,
    });
  } catch (error) {
    console.error('Error fetching campaign:', error);
    res.status(500).json({ error: 'Failed to fetch campaign' });
  }
});

// POST create campaign
router.post('/', async (req, res) => {
  try {
    const { name, segment_id, channel, subject, message_template, confidence_rate } = req.body;
    if (!name || !segment_id || !channel || !message_template) {
      return res.status(400).json({ error: 'name, segment_id, channel, and message_template are required' });
    }

    const result = db.query(
      'INSERT INTO campaigns (name, segment_id, channel, subject, message_template, confidence_rate) VALUES (?, ?, ?, ?, ?, ?) RETURNING *',
      [name, segment_id, channel, subject || null, message_template, confidence_rate !== undefined ? confidence_rate : 85]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating campaign:', error);
    res.status(500).json({ error: 'Failed to create campaign' });
  }
});

// POST send campaign
router.post('/:id/send', async (req, res) => {
  try {
    const { id } = req.params;

    const campResult = db.query('SELECT * FROM campaigns WHERE id = ?', [id]);
    if (campResult.rows.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const campaign = campResult.rows[0];
    if (campaign.status === 'sending' || campaign.status === 'completed') {
      return res.status(400).json({ error: 'Campaign already sent or sending' });
    }

    const segResult = db.query('SELECT rules FROM segments WHERE id = ?', [campaign.segment_id]);
    if (segResult.rows.length === 0) {
      return res.status(400).json({ error: 'Segment not found' });
    }

    const rules = typeof segResult.rows[0].rules === 'string'
      ? JSON.parse(segResult.rows[0].rules)
      : segResult.rows[0].rules;
    const { where, params } = buildWhereClause(rules);
    const customersResult = db.query(
      `SELECT id, name, email, phone, city FROM customers ${where}`,
      params
    );

    if (customersResult.rows.length === 0) {
      return res.status(400).json({ error: 'No customers in this segment' });
    }

    // Update campaign status
    const nowStr = new Date().toISOString();
    db.query(
      'UPDATE campaigns SET status = ?, sent_at = ?, total_sent = ? WHERE id = ?',
      ['sending', nowStr, customersResult.rows.length, id]
    );

    // Create communication records
    const channelServiceUrl = process.env.CHANNEL_SERVICE_URL || 'http://localhost:4001';
    const crmReceiptUrl = process.env.CRM_RECEIPT_URL || 'http://localhost:4000/api/receipts';

    const communications = [];

    for (const customer of customersResult.rows) {
      const personalizedMessage = campaign.message_template
        .replace(/\{\{name\}\}/g, customer.name)
        .replace(/\{\{email\}\}/g, customer.email)
        .replace(/\{\{city\}\}/g, customer.city || '');

      const commResult = db.query(
        `INSERT INTO communications (campaign_id, customer_id, channel, message, status, sent_at)
         VALUES (?, ?, ?, ?, 'sent', ?) RETURNING *`,
        [id, customer.id, campaign.channel, personalizedMessage, nowStr]
      );

      communications.push(commResult.rows[0]);
    }

    // Send to channel service asynchronously
    setImmediate(async () => {
      try {
        await axios.post(`${channelServiceUrl}/api/send`, {
          campaign_id: parseInt(id),
          communications: communications.map(c => ({
            communication_id: c.id,
            customer_id: c.customer_id,
            channel: c.channel,
            message: c.message,
            recipient: customersResult.rows.find(cu => cu.id === c.customer_id)?.email || '',
            recipient_phone: customersResult.rows.find(cu => cu.id === c.customer_id)?.phone || '',
          })),
          callback_url: crmReceiptUrl,
        });
      } catch (error) {
        console.error('Error sending to channel service:', error.message);
      }
    });

    res.json({
      message: 'Campaign is being sent',
      total_recipients: customersResult.rows.length,
      campaign_id: parseInt(id),
    });
  } catch (error) {
    console.error('Error sending campaign:', error);
    res.status(500).json({ error: 'Failed to send campaign' });
  }
});

// DELETE campaign
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    db.query('DELETE FROM communications WHERE campaign_id = ?', [id]);
    db.query('DELETE FROM campaigns WHERE id = ?', [id]);
    res.json({ message: 'Campaign deleted successfully' });
  } catch (error) {
    console.error('Error deleting campaign:', error);
    res.status(500).json({ error: 'Failed to delete campaign' });
  }
});

module.exports = router;

