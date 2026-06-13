const express = require('express');
const router = express.Router();
const db = require('../db');

// GET dashboard analytics
router.get('/dashboard', async (req, res) => {
  try {
    // Total customers
    const totalCustomers = db.query('SELECT COUNT(*) as total FROM customers').rows[0].total;

    // Active segments
    const activeSegments = db.query('SELECT COUNT(*) as total FROM segments').rows[0].total;

    // Campaign stats
    const campStats = db.query(
      `SELECT
        COUNT(*) as total_campaigns,
        COALESCE(SUM(total_sent), 0) as total_sent,
        COALESCE(SUM(total_delivered), 0) as total_delivered,
        COALESCE(SUM(total_failed), 0) as total_failed,
        COALESCE(SUM(total_opened), 0) as total_opened,
        COALESCE(SUM(total_read), 0) as total_read,
        COALESCE(SUM(total_clicked), 0) as total_clicked,
        COALESCE(SUM(total_converted), 0) as total_converted,
        COALESCE(SUM(revenue_generated), 0) as revenue_generated
       FROM campaigns WHERE status IN ('completed', 'sending')`
    ).rows[0];

    const totalSent = campStats.total_sent;
    const totalDelivered = campStats.total_delivered;
    const totalOpened = campStats.total_opened;
    const totalClicked = campStats.total_clicked;
    const totalConverted = campStats.total_converted;
    const campaignRevenue = campStats.revenue_generated;

    const openRate = totalDelivered > 0 ? ((totalOpened / totalDelivered) * 100).toFixed(1) : 0;
    const clickRate = totalOpened > 0 ? ((totalClicked / totalOpened) * 100).toFixed(1) : 0;
    const conversionRate = totalSent > 0 ? ((totalConverted / totalSent) * 100).toFixed(1) : 0;

    // Total Store Revenue (all orders)
    const totalRevenue = db.query("SELECT COALESCE(SUM(amount), 0) as total FROM orders WHERE status = 'completed'").rows[0].total;

    // Recent campaigns
    const recentCampaigns = db.query(
      `SELECT c.*, s.name as segment_name
       FROM campaigns c
       LEFT JOIN segments s ON c.segment_id = s.id
       ORDER BY c.created_at DESC LIMIT 5`
    );

    // Campaign performance over time (last 6 months)
    const performance = db.query(
      `SELECT
        strftime('%m/%Y', sent_at) as month,
        strftime('%Y', sent_at) as year,
        strftime('%m', sent_at) as month_num,
        COUNT(*) as campaigns,
        COALESCE(SUM(total_sent), 0) as sent,
        COALESCE(SUM(total_delivered), 0) as delivered,
        COALESCE(SUM(total_opened), 0) as opened,
        COALESCE(SUM(total_clicked), 0) as clicked,
        COALESCE(SUM(total_converted), 0) as converted,
        COALESCE(SUM(revenue_generated), 0) as revenue
       FROM campaigns
       WHERE sent_at IS NOT NULL AND sent_at > datetime('now', '-6 months')
       GROUP BY strftime('%m/%Y', sent_at)
       ORDER BY year, month_num`
    );

    // Top segments
    const topSegments = db.query('SELECT * FROM segments ORDER BY customer_count DESC LIMIT 5');

    // Channel distribution
    const channelDistribution = db.query(
      `SELECT channel, COUNT(*) as count
       FROM campaigns
       WHERE status = 'completed'
       GROUP BY channel`
    );

    // --- NEW PREMIUM WIDGETS & INTELLIGENCE ---

    // 1. AI Insights (Opportunity Discovery)
    // Query actual numbers from DB to make the insights 100% accurate to seed data
    const inactiveHighValueCount = db.query(`
      SELECT COUNT(*) as count 
      FROM customers 
      WHERE total_spend > 10000 
        AND (last_purchase < datetime('now', '-45 days') OR last_purchase IS NULL)
    `).rows[0].count;

    const frequentBuyersCount = db.query(`
      SELECT COUNT(*) as count 
      FROM customers 
      WHERE order_count >= 5
    `).rows[0].count;

    const churnRiskCount = db.query(`
      SELECT COUNT(*) as count 
      FROM customers 
      WHERE last_purchase < datetime('now', '-90 days') OR last_purchase IS NULL
    `).rows[0].count;

    const aiInsights = [
      {
        id: 'insight_1',
        title: `${inactiveHighValueCount} Inactive High-Value Customers`,
        type: 'churn_risk',
        audience_size: inactiveHighValueCount,
        revenue_opportunity: Math.round(inactiveHighValueCount * 3200),
        confidence_score: 91,
        suggested_action: 'Launch win-back WhatsApp campaign with a premium gift offer'
      },
      {
        id: 'insight_2',
        title: `${frequentBuyersCount} Frequent Buyers`,
        type: 'loyalty',
        audience_size: frequentBuyersCount,
        revenue_opportunity: Math.round(frequentBuyersCount * 1800),
        confidence_score: 87,
        suggested_action: 'Offer early access to winter collection via Email'
      },
      {
        id: 'insight_3',
        title: `${churnRiskCount} Churn-Risk Customers`,
        type: 'at_risk',
        audience_size: churnRiskCount,
        revenue_opportunity: Math.round(churnRiskCount * 2100),
        confidence_score: 79,
        suggested_action: 'Send SMS callback voucher of ₹500 discount'
      }
    ];

    // 2. Revenue Forecast Widget
    // Get historical monthly revenue from orders
    const monthlyRevenue = db.query(`
      SELECT 
        strftime('%Y-%m', created_at) as month,
        SUM(amount) as revenue
      FROM orders
      WHERE created_at > datetime('now', '-6 months')
      GROUP BY month
      ORDER BY month ASC
    `).rows;

    // Build forecast for next 3 months based on linear growth
    const forecast = [];
    let lastRevenue = 45000; // baseline if empty
    if (monthlyRevenue.length > 0) {
      lastRevenue = monthlyRevenue[monthlyRevenue.length - 1].revenue;
    }

    const nextMonths = [];
    const date = new Date();
    for (let i = 1; i <= 3; i++) {
      date.setMonth(date.getMonth() + 1);
      const yearMonth = date.toISOString().substring(0, 7);
      // Simulate steady growth rate of 4.5% month over month
      const forecastedAmount = Math.round(lastRevenue * Math.pow(1.045, i));
      forecast.push({
        month: yearMonth,
        historical: null,
        forecasted: forecastedAmount
      });
    }

    const revenueForecast = [
      ...monthlyRevenue.map(mr => ({
        month: mr.month,
        historical: Math.round(mr.revenue),
        forecasted: null
      })),
      ...forecast
    ];

    // 3. Best Performing Channel Widget
    const bestChannels = db.query(`
      SELECT 
        channel,
        COUNT(*) as total_campaigns,
        COALESCE(SUM(total_sent), 0) as sent,
        COALESCE(SUM(total_delivered), 0) as delivered,
        COALESCE(SUM(total_opened), 0) as opened,
        COALESCE(SUM(total_clicked), 0) as clicked,
        COALESCE(SUM(total_converted), 0) as converted,
        COALESCE(SUM(revenue_generated), 0) as revenue
      FROM campaigns
      WHERE status IN ('completed', 'sending')
      GROUP BY channel
      ORDER BY revenue DESC
    `).rows.map(row => {
      const sent = row.sent || 1;
      const opened = row.opened || 1;
      return {
        channel: row.channel,
        campaign_count: row.total_campaigns,
        revenue: Math.round(row.revenue),
        open_rate: Math.round((row.opened / row.delivered) * 1000) / 10 || 0,
        click_rate: Math.round((row.clicked / opened) * 1000) / 10 || 0,
        conversion_rate: Math.round((row.converted / sent) * 1000) / 10 || 0,
        roi: row.revenue > 0 ? (row.revenue / (sent * 1.5)).toFixed(1) : 0 // Cost estimated at ₹1.5 per message
      };
    });

    // 4. Segment Performance Widget
    const segmentPerformance = db.query(`
      SELECT 
        s.id,
        s.name,
        s.customer_count,
        COUNT(c.id) as campaigns_count,
        COALESCE(SUM(c.revenue_generated), 0) as total_revenue,
        COALESCE(AVG(CASE WHEN c.total_delivered > 0 THEN (CAST(c.total_opened AS REAL) / c.total_delivered) * 100 ELSE 0 END), 0) as avg_open_rate,
        COALESCE(AVG(CASE WHEN c.total_sent > 0 THEN (CAST(c.total_converted AS REAL) / c.total_sent) * 100 ELSE 0 END), 0) as avg_conversion_rate
      FROM segments s
      LEFT JOIN campaigns c ON c.segment_id = s.id AND c.status IN ('completed', 'sending')
      GROUP BY s.id
      ORDER BY total_revenue DESC
    `).rows.map(row => ({
      id: row.id,
      name: row.name,
      customer_count: row.customer_count,
      campaigns_count: row.campaigns_count,
      total_revenue: Math.round(row.total_revenue),
      avg_open_rate: Math.round(row.avg_open_rate * 10) / 10,
      avg_conversion_rate: Math.round(row.avg_conversion_rate * 10) / 10
    }));

    res.json({
      summary: {
        totalCustomers,
        activeSegments,
        campaignsSent: campStats.total_campaigns,
        openRate: parseFloat(openRate),
        clickRate: parseFloat(clickRate),
        conversionRate: parseFloat(conversionRate),
        totalRevenue: parseFloat(totalRevenue),
        campaignRevenue: parseFloat(campaignRevenue),
        totalSent,
        totalDelivered,
        totalFailed: campStats.total_failed,
        totalOpened,
        totalRead: campStats.total_read,
        totalClicked,
        totalConverted,
      },
      recentCampaigns: recentCampaigns.rows,
      performance: performance.rows,
      topSegments: topSegments.rows,
      channelDistribution: channelDistribution.rows,
      aiInsights,
      revenueForecast,
      bestChannels,
      segmentPerformance
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// GET campaign-level analytics
router.get('/campaigns', async (req, res) => {
  try {
    const result = db.query(
      `SELECT
        c.*,
        s.name as segment_name,
        CASE WHEN c.total_delivered > 0
          THEN ROUND((CAST(c.total_opened AS REAL) / c.total_delivered) * 100, 1)
          ELSE 0 END as open_rate,
        CASE WHEN c.total_opened > 0
          THEN ROUND((CAST(c.total_clicked AS REAL) / c.total_opened) * 100, 1)
          ELSE 0 END as click_rate,
        CASE WHEN c.total_sent > 0
          THEN ROUND((CAST(c.total_delivered AS REAL) / c.total_sent) * 100, 1)
          ELSE 0 END as delivery_rate,
        CASE WHEN c.total_sent > 0
          THEN ROUND((CAST(c.total_converted AS REAL) / c.total_sent) * 100, 1)
          ELSE 0 END as conversion_rate,
        COALESCE(c.revenue_generated, 0) as revenue,
        CASE WHEN c.total_sent > 0
          THEN ROUND(COALESCE(c.revenue_generated, 0) / (c.total_sent * 1.5), 1)
          ELSE 0 END as roi
       FROM campaigns c
       LEFT JOIN segments s ON c.segment_id = s.id
       WHERE c.status IN ('completed', 'sending')
       ORDER BY c.sent_at DESC`
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching campaign analytics:', error);
    res.status(500).json({ error: 'Failed to fetch campaign analytics' });
  }
});

// GET communication status breakdown for a campaign
router.get('/campaigns/:id/breakdown', async (req, res) => {
  try {
    const { id } = req.params;

    const statusResult = db.query(
      `SELECT status, COUNT(*) as count
       FROM communications
       WHERE campaign_id = ?
       GROUP BY status`,
      [id]
    );

    res.json({
      statusBreakdown: statusResult.rows,
    });
  } catch (error) {
    console.error('Error fetching campaign breakdown:', error);
    res.status(500).json({ error: 'Failed to fetch campaign breakdown' });
  }
});

module.exports = router;
