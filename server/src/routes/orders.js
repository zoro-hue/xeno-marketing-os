const express = require('express');
const router = express.Router();
const db = require('../db');

// GET all orders
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, customer_id } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereClause = '';
    let params = [];

    if (customer_id) {
      whereClause = 'WHERE o.customer_id = ?';
      params.push(customer_id);
    }

    const countResult = db.query(`SELECT COUNT(*) as count FROM orders o ${whereClause}`, params);
    const total = countResult.rows[0].count;

    const result = db.query(
      `SELECT o.*, c.name as customer_name, c.email as customer_email
       FROM orders o
       JOIN customers c ON o.customer_id = c.id
       ${whereClause}
       ORDER BY o.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    res.json({
      orders: result.rows,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// POST create order
router.post('/', async (req, res) => {
  try {
    const { customer_id, amount, product, category, status } = req.body;
    if (!customer_id || !amount || !product) {
      return res.status(400).json({ error: 'customer_id, amount, and product are required' });
    }

    const result = db.query(
      'INSERT INTO orders (customer_id, amount, product, category, status) VALUES (?, ?, ?, ?, ?) RETURNING *',
      [customer_id, amount, product, category || null, status || 'completed']
    );

    // Update customer aggregates
    db.query(
      `UPDATE customers SET
        total_spend = (SELECT COALESCE(SUM(amount), 0) FROM orders WHERE customer_id = ?),
        order_count = (SELECT COUNT(*) FROM orders WHERE customer_id = ?),
        last_purchase = (SELECT MAX(created_at) FROM orders WHERE customer_id = ?)
       WHERE id = ?`,
      [customer_id, customer_id, customer_id, customer_id]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

module.exports = router;
