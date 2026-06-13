const express = require('express');
const router = express.Router();
const db = require('../db');

// POST receipt callback from channel service
router.post('/', async (req, res) => {
  try {
    const { communication_id, status, timestamp, error_message, conversion_revenue } = req.body;

    if (!communication_id || !status) {
      return res.status(400).json({ error: 'communication_id and status are required' });
    }

    const validStatuses = ['delivered', 'failed', 'opened', 'read', 'clicked', 'converted'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const ts = timestamp || new Date().toISOString();

    if (status === 'failed') {
      db.query(
        `UPDATE communications SET status = ?, failed_at = ?, error_message = ? WHERE id = ?`,
        [status, ts, error_message || 'Unknown error', communication_id]
      );
    } else if (status === 'converted') {
      const rev = conversion_revenue || 1500; // default conversion revenue
      db.query(
        `UPDATE communications SET status = ?, converted_at = ?, conversion_revenue = ? WHERE id = ?`,
        [status, ts, rev, communication_id]
      );
    } else {
      const statusField = `${status}_at`;
      db.query(
        `UPDATE communications SET status = ?, ${statusField} = ? WHERE id = ?`,
        [status, ts, communication_id]
      );
    }

    // Get campaign_id for this communication
    const commResult = db.query(
      'SELECT campaign_id FROM communications WHERE id = ?',
      [communication_id]
    );

    if (commResult.rows.length > 0) {
      const campaignId = commResult.rows[0].campaign_id;

      // Update campaign aggregates using SQLite-compatible queries
      const total = db.query(
        'SELECT COUNT(*) as count FROM communications WHERE campaign_id = ?',
        [campaignId]
      ).rows[0].count;

      const processed = db.query(
        "SELECT COUNT(*) as count FROM communications WHERE campaign_id = ? AND status NOT IN ('queued', 'sent')",
        [campaignId]
      ).rows[0].count;

      const delivered = db.query(
        'SELECT COUNT(*) as count FROM communications WHERE campaign_id = ? AND (delivered_at IS NOT NULL OR status = \'converted\')',
        [campaignId]
      ).rows[0].count;

      const failed = db.query(
        "SELECT COUNT(*) as count FROM communications WHERE campaign_id = ? AND status = 'failed'",
        [campaignId]
      ).rows[0].count;

      const opened = db.query(
        'SELECT COUNT(*) as count FROM communications WHERE campaign_id = ? AND (opened_at IS NOT NULL OR status = \'converted\')',
        [campaignId]
      ).rows[0].count;

      const read = db.query(
        'SELECT COUNT(*) as count FROM communications WHERE campaign_id = ? AND (read_at IS NOT NULL OR status = \'converted\')',
        [campaignId]
      ).rows[0].count;

      const clicked = db.query(
        'SELECT COUNT(*) as count FROM communications WHERE campaign_id = ? AND (clicked_at IS NOT NULL OR status = \'converted\')',
        [campaignId]
      ).rows[0].count;

      const converted = db.query(
        "SELECT COUNT(*) as count FROM communications WHERE campaign_id = ? AND status = 'converted'",
        [campaignId]
      ).rows[0].count;

      const revenue = db.query(
        "SELECT COALESCE(SUM(conversion_revenue), 0) as total FROM communications WHERE campaign_id = ? AND status = 'converted'",
        [campaignId]
      ).rows[0].total;

      const campaignStatus = processed >= total ? 'completed' : 'sending';
      const completedAt = campaignStatus === 'completed' ? new Date().toISOString() : null;

      db.query(
        `UPDATE campaigns SET
          total_delivered = ?, total_failed = ?, total_opened = ?,
          total_read = ?, total_clicked = ?, total_converted = ?,
          revenue_generated = ?, status = ?, completed_at = COALESCE(?, completed_at)
        WHERE id = ?`,
        [delivered, failed, opened, read, clicked, converted, revenue, campaignStatus, completedAt, campaignId]
      );

      // Emit real-time campaign update via socket.io
      const io = req.app.get('io');
      if (io) {
        io.emit('campaign_update', {
          campaignId: parseInt(campaignId),
          status: campaignStatus,
          total_delivered: delivered,
          total_failed: failed,
          total_opened: opened,
          total_read: read,
          total_clicked: clicked,
          total_converted: converted,
          revenue_generated: revenue
        });
      }
    }

    res.json({ message: 'Receipt processed' });
  } catch (error) {
    console.error('Error processing receipt:', error);
    res.status(500).json({ error: 'Failed to process receipt' });
  }
});

module.exports = router;
