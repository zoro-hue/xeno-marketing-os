const express = require('express');
const router = express.Router();
const db = require('../db');

// Shared utility to build WHERE clause from segment rules (SQLite compatible)
function buildWhereClause(rules) {
  if (!rules || rules.length === 0) return { where: '', params: [] };

  const conditions = [];
  const params = [];

  for (const rule of rules) {
    const allowedFields = ['total_spend', 'order_count', 'last_purchase', 'city', 'name', 'email', 'created_at'];
    if (!allowedFields.includes(rule.field)) continue;

    switch (rule.operator) {
      case 'greater_than':
        conditions.push(`${rule.field} > ?`);
        params.push(rule.value);
        break;
      case 'less_than':
        conditions.push(`${rule.field} < ?`);
        params.push(rule.value);
        break;
      case 'equals':
        conditions.push(`${rule.field} = ?`);
        params.push(rule.value);
        break;
      case 'not_equals':
        conditions.push(`${rule.field} != ?`);
        params.push(rule.value);
        break;
      case 'older_than_days':
        conditions.push(`${rule.field} < datetime('now', '-${parseInt(rule.value)} days')`);
        break;
      case 'newer_than_days':
        conditions.push(`${rule.field} > datetime('now', '-${parseInt(rule.value)} days')`);
        break;
      case 'contains':
        conditions.push(`${rule.field} LIKE ?`);
        params.push(`%${rule.value}%`);
        break;
      case 'greater_than_or_equal':
        conditions.push(`${rule.field} >= ?`);
        params.push(rule.value);
        break;
      case 'less_than_or_equal':
        conditions.push(`${rule.field} <= ?`);
        params.push(rule.value);
        break;
    }
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return { where, params };
}

// Helper to compute segment analytics dynamically
function computeSegmentAnalytics(segment) {
  try {
    const rules = typeof segment.rules === 'string' ? JSON.parse(segment.rules) : segment.rules;
    const { where, params } = buildWhereClause(rules);

    const statsResult = db.query(`
      SELECT 
        COUNT(*) as count,
        COALESCE(AVG(total_spend), 0) as avg_spend,
        COALESCE(AVG(order_count), 0) as avg_orders,
        COALESCE(SUM(total_spend), 0) as total_spend_sum
      FROM customers
      ${where}
    `, params);

    const stats = statsResult.rows[0];
    const customerCount = stats.count || 0;
    const avgSpend = Math.round(stats.avg_spend * 100) / 100;
    const avgOrders = Math.round(stats.avg_orders * 10) / 10;
    
    // Revenue Potential calculation (15% of total segment lifetime value as potential campaign revenue)
    const revenuePotential = Math.round(stats.total_spend_sum * 0.15);

    // Predict open rates based on segment types
    let predictedOpenRate = 55;
    if (segment.name.includes('High Value') || segment.name.includes('VIP')) predictedOpenRate = 78;
    else if (segment.name.includes('Inactive')) predictedOpenRate = 38;
    else if (segment.name.includes('New')) predictedOpenRate = 72;
    else if (segment.name.includes('Frequent')) predictedOpenRate = 65;

    // Predict conversion rates based on segment types
    let predictedConversionRate = 8;
    if (segment.name.includes('High Value') || segment.name.includes('VIP')) predictedConversionRate = 18;
    else if (segment.name.includes('Inactive')) predictedConversionRate = 5;
    else if (segment.name.includes('New')) predictedConversionRate = 14;
    else if (segment.name.includes('Frequent')) predictedConversionRate = 12;

    return {
      ...segment,
      customer_count: customerCount,
      average_spend: avgSpend,
      average_orders: avgOrders,
      revenue_potential: revenuePotential,
      predicted_open_rate: predictedOpenRate,
      predicted_conversion_rate: predictedConversionRate
    };
  } catch (err) {
    console.error('Error computing segment stats:', err);
    return {
      ...segment,
      average_spend: 0,
      average_orders: 0,
      revenue_potential: 0,
      predicted_open_rate: 50,
      predicted_conversion_rate: 10
    };
  }
}

// GET all segments
router.get('/', async (req, res) => {
  try {
    const result = db.query('SELECT * FROM segments ORDER BY created_at DESC');
    const segments = result.rows.map(computeSegmentAnalytics);
    res.json(segments);
  } catch (error) {
    console.error('Error fetching segments:', error);
    res.status(500).json({ error: 'Failed to fetch segments' });
  }
});

// GET single segment with customers
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const segResult = db.query('SELECT * FROM segments WHERE id = ?', [id]);
    if (segResult.rows.length === 0) {
      return res.status(404).json({ error: 'Segment not found' });
    }

    const enrichedSegment = computeSegmentAnalytics(segResult.rows[0]);
    const rules = typeof enrichedSegment.rules === 'string' ? JSON.parse(enrichedSegment.rules) : enrichedSegment.rules;
    const { where, params } = buildWhereClause(rules);

    const customersResult = db.query(
      `SELECT id, name, email, city, total_spend, order_count, last_purchase FROM customers ${where} ORDER BY total_spend DESC`,
      params
    );

    res.json({
      segment: enrichedSegment,
      customers: customersResult.rows,
    });
  } catch (error) {
    console.error('Error fetching segment:', error);
    res.status(500).json({ error: 'Failed to fetch segment' });
  }
});

// POST create segment
router.post('/', async (req, res) => {
  try {
    const { name, description, rules } = req.body;
    if (!name || !rules) {
      return res.status(400).json({ error: 'Name and rules are required' });
    }

    const parsedRules = typeof rules === 'string' ? JSON.parse(rules) : rules;
    const { where, params } = buildWhereClause(parsedRules);
    const countResult = db.query(`SELECT COUNT(*) as count FROM customers ${where}`, params);
    const customerCount = countResult.rows[0].count;

    const result = db.query(
      'INSERT INTO segments (name, description, rules, customer_count) VALUES (?, ?, ?, ?) RETURNING *',
      [name, description || null, JSON.stringify(parsedRules), customerCount]
    );

    const enriched = computeSegmentAnalytics(result.rows[0]);
    res.status(201).json(enriched);
  } catch (error) {
    console.error('Error creating segment:', error);
    res.status(500).json({ error: 'Failed to create segment' });
  }
});

// POST preview segment
router.post('/preview', async (req, res) => {
  try {
    const { rules } = req.body;
    if (!rules) {
      return res.status(400).json({ error: 'Rules are required' });
    }

    const parsedRules = typeof rules === 'string' ? JSON.parse(rules) : rules;
    const { where, params } = buildWhereClause(parsedRules);

    const countResult = db.query(`SELECT COUNT(*) as count FROM customers ${where}`, params);
    const count = countResult.rows[0].count;

    const sampleResult = db.query(
      `SELECT id, name, email, city, total_spend, order_count FROM customers ${where} LIMIT 5`,
      params
    );

    res.json({
      count,
      sample: sampleResult.rows,
    });
  } catch (error) {
    console.error('Error previewing segment:', error);
    res.status(500).json({ error: 'Failed to preview segment' });
  }
});

// DELETE segment
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    db.query('DELETE FROM segments WHERE id = ?', [id]);
    res.json({ message: 'Segment deleted' });
  } catch (error) {
    console.error('Error deleting segment:', error);
    res.status(500).json({ error: 'Failed to delete segment' });
  }
});

module.exports = router;
module.exports.buildWhereClause = buildWhereClause;
