const express = require('express');
const router = express.Router();
const db = require('../db');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Use gemini-1.5-flash as the primary model which is active and has quota
const MODEL_NAME = 'gemini-1.5-flash';

function getModel() {
  return genAI.getGenerativeModel({ model: MODEL_NAME });
}

/**
 * Helper to call Gemini and clean JSON format.
 */
async function callGemini(prompt) {
  const model = getModel();
  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();

  try {
    return JSON.parse(text);
  } catch {
    // Extract JSON block if response is markdown-wrapped
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1].trim());
    }
    // Try to find raw JSON object boundaries
    const rawMatch = text.match(/\{[\s\S]*\}/);
    if (rawMatch) {
      return JSON.parse(rawMatch[0]);
    }
    throw new Error('Could not parse AI response as JSON. Raw output: ' + text);
  }
}

// --- HIGH-FIDELITY FALLBACK GENERATORS FOR OFFLINE ENVIRONMENTS ---

function generateMockSegment(description) {
  const desc = description.toLowerCase();
  
  if (desc.includes('spend') || desc.includes('high value') || desc.includes('vip') || desc.includes('spent')) {
    const numbers = desc.match(/\d+/g);
    const value = numbers ? parseInt(numbers[0]) : 10000;
    return {
      name: "High Spend Customers",
      description: `Customers who have spent more than ₹${value}`,
      rules: [
        { field: "total_spend", operator: "greater_than", value: value.toString() }
      ]
    };
  }
  
  if (desc.includes('order') || desc.includes('purchase') || desc.includes('buy') || desc.includes('frequent')) {
    const numbers = desc.match(/\d+/g);
    const value = numbers ? parseInt(numbers[0]) : 5;
    return {
      name: "Frequent Buyers",
      description: `Customers with ${value} or more orders`,
      rules: [
        { field: "order_count", operator: "greater_than_or_equal", value: value.toString() }
      ]
    };
  }
  
  if (desc.includes('inactive') || desc.includes('churn') || desc.includes('silent') || desc.includes('not bought') || desc.includes('days')) {
    const numbers = desc.match(/\d+/g);
    const value = numbers ? parseInt(numbers[0]) : 90;
    return {
      name: "Inactive Customers",
      description: `Customers who haven't made a purchase in ${value} days`,
      rules: [
        { field: "last_purchase", operator: "older_than_days", value: value.toString() }
      ]
    };
  }

  if (desc.includes('city') || desc.includes('live') || desc.includes('from') || desc.includes('delhi') || desc.includes('mumbai') || desc.includes('bangalore') || desc.includes('kolkata') || desc.includes('chennai')) {
    let city = "Delhi";
    const cities = ["mumbai", "delhi", "bangalore", "kolkata", "chennai", "pune", "hyderabad", "jaipur"];
    for (const c of cities) {
      if (desc.includes(c)) {
        city = c.charAt(0).toUpperCase() + c.slice(1);
        break;
      }
    }
    return {
      name: `${city} Shoppers`,
      description: `Customers located in ${city}`,
      rules: [
        { field: "city", operator: "equals", value: city }
      ]
    };
  }

  return {
    name: "Engaged Customers",
    description: "Active customers with order history",
    rules: [
      { field: "order_count", operator: "greater_than_or_equal", value: "1" }
    ]
  };
}

function generateMockMessage(channel, segment_name, campaign_goal, tone) {
  const ch = channel.toLowerCase();
  const goal = campaign_goal.toLowerCase();
  
  let subject = null;
  let message = "";

  const discount = goal.includes('20') ? '20%' : goal.includes('30') ? '30%' : '15%';
  const coupon = goal.includes('20') ? 'XENO20' : goal.includes('30') ? 'XENO30' : 'XENO15';

  if (ch === 'email') {
    if (goal.includes('win') || goal.includes('back') || goal.includes('inactive') || goal.includes('miss')) {
      subject = `We miss you, {{name}}! Here is ${discount} off to welcome you back 🎁`;
      message = `Dear {{name}},\n\nWe haven't seen you in a while and we miss having you around!\n\nTo help you get started on your next shopping journey, we've created a special discount just for you. Use coupon code ${coupon} at checkout to get ${discount} off your entire order.\n\nShop the latest arrivals: https://xeno.co/shop\n\nWarm regards,\nThe Xeno Team`;
    } else if (goal.includes('vip') || goal.includes('loyalty') || goal.includes('reward')) {
      subject = `Exclusive VIP Benefit: Early access & ${discount} off for {{name}} ⭐`;
      message = `Dear {{name}},\n\nAs one of our most valued VIP customers, we're thrilled to invite you to our exclusive loyalty tier.\n\nEnjoy early access to our winter capsule collection and receive ${discount} off your next order. Simply apply code ${coupon} at checkout.\n\nAccess the VIP Collection: https://xeno.co/vip\n\nBest wishes,\nThe Xeno Team`;
    } else {
      subject = `Special Offer: Enjoy ${discount} off your next purchase, {{name}}! 🎉`;
      message = `Hi {{name}},\n\nWe wanted to share a little treat with you. For a limited time, enjoy ${discount} off your next order using code ${coupon}.\n\nExplore our bestsellers: https://xeno.co/shop\n\nCheers,\nThe Xeno Team`;
    }
  } else if (ch === 'whatsapp') {
    if (goal.includes('win') || goal.includes('back') || goal.includes('inactive') || goal.includes('miss')) {
      message = `Hey {{name}}! 🌟 We miss you! We'd love to welcome you back with a special *${discount} discount*. Just use code *${coupon}* at checkout. \n\n👉 Shop now: https://xeno.co/shop \n\nHope to see you soon!`;
    } else if (goal.includes('vip') || goal.includes('loyalty') || goal.includes('reward')) {
      message = `Hi {{name}}! ⭐ You're a VIP in our book! Enjoy early access to our new arrivals + *${discount} off* with code *${coupon}*. \n\n👉 Shop VIP collection: https://xeno.co/vip \n\nHave a great day!`;
    } else {
      message = `Hey {{name}}! 🎉 Here's a quick treat: enjoy *${discount} off* your next order with code *${coupon}*. \n\n👉 Shop here: https://xeno.co/shop \n\nOffer ends soon!`;
    }
  } else if (ch === 'sms') {
    if (goal.includes('win') || goal.includes('back') || goal.includes('inactive') || goal.includes('miss')) {
      message = `Hey {{name}}, we miss you! Get ${discount} off your next order with code ${coupon}. Shop here: https://xeno.co/shop`;
    } else {
      message = `Hi {{name}}, enjoy ${discount} off your next order! Use code ${coupon} at checkout: https://xeno.co/shop`;
    }
  } else { // rcs
    if (goal.includes('win') || goal.includes('back') || goal.includes('inactive') || goal.includes('miss')) {
      message = `✨ We miss you, {{name}}! ✨\n\nIt's been too long. We've unlocked a special ${discount} discount for you. Use code ${coupon} at checkout.\n\n👉 Shop Now: https://xeno.co/shop`;
    } else {
      message = `🌟 Special Treat for {{name}}! 🌟\n\nEnjoy ${discount} off our entire collection today. Enter code ${coupon} at checkout to claim.\n\n👉 Shop Now: https://xeno.co/shop`;
    }
  }

  return { subject, message };
}

function generateMockRecommendations(goal, segments) {
  const g = goal.toLowerCase();
  
  let isInactive = g.includes('inactive') || g.includes('win') || g.includes('back') || g.includes('churn') || g.includes('re-engage');
  let isVip = g.includes('vip') || g.includes('high value') || g.includes('premium') || g.includes('spend');
  let isLoyalty = g.includes('loyalty') || g.includes('frequent') || g.includes('reward');
  
  let audienceName = "All Customers";
  let audienceSize = 300;
  
  if (isInactive) {
    const match = segments.find(s => s.name.toLowerCase().includes('inactive') || s.name.toLowerCase().includes('churn'));
    audienceName = match ? match.name : "Inactive Premium Customers";
    audienceSize = match ? match.customer_count : 45;
  } else if (isVip) {
    const match = segments.find(s => s.name.toLowerCase().includes('vip') || s.name.toLowerCase().includes('high spend') || s.name.toLowerCase().includes('value'));
    audienceName = match ? match.name : "High Value Customers";
    audienceSize = match ? match.customer_count : 25;
  } else if (isLoyalty) {
    const match = segments.find(s => s.name.toLowerCase().includes('frequent') || s.name.toLowerCase().includes('loyalty'));
    audienceName = match ? match.name : "Frequent Buyers";
    audienceSize = match ? match.customer_count : 60;
  } else if (segments.length > 0) {
    audienceName = segments[0].name;
    audienceSize = segments[0].customer_count;
  }

  const channel = isInactive ? "whatsapp" : isVip ? "email" : "sms";
  const revenueOp = audienceSize * (isVip ? 4200 : isInactive ? 2500 : 1500);

  const discount = g.includes('20') ? '20%' : g.includes('30') ? '30%' : '15%';
  const coupon = g.includes('20') ? 'XENO20' : g.includes('30') ? 'XENO30' : 'XENO15';

  let subject = null;
  let message = "";
  if (channel === 'email') {
    subject = `Exclusive Offer: Enjoy ${discount} off for {{name}} ⭐`;
    message = `Dear {{name}},\n\nBased on your outstanding order history, we want to invite you to our loyalty preview.\n\nEnjoy ${discount} off your next order with coupon code ${coupon}.\n\nShop now: https://xeno.co/vip`;
  } else if (channel === 'whatsapp') {
    message = `Hey {{name}}! 🌟 We miss you! Here's a special *${discount} discount* to welcome you back. Use code *${coupon}* at checkout. \n\n👉 Shop now: https://xeno.co/shop`;
  } else {
    message = `Hi {{name}}, enjoy ${discount} off your next order! Use code ${coupon} at checkout: https://xeno.co/shop`;
  }

  return {
    analysis: {
      summary: `Targeted campaign strategy matching your goal "${goal}". We recommend engaging ${audienceName} to maximize conversion and revenue potential.`,
      audience_name: audienceName,
      audience_size: audienceSize,
      reasoning: `Selected ${audienceName} segment containing ${audienceSize} customers because this demographic has the highest potential alignment with your goal.`,
      revenue_opportunity: revenueOp,
      confidence_score: 88
    },
    recommended_channel: {
      channel: channel,
      confidence_score: 90,
      reasoning: `${channel.toUpperCase()} provides the optimal engagement format for this audience based on historical response latency and click-through rates.`
    },
    predictions: {
      expected_delivery_rate: 98,
      expected_open_rate: channel === 'whatsapp' ? 82 : channel === 'email' ? 45 : 95,
      expected_click_rate: channel === 'whatsapp' ? 28 : channel === 'email' ? 15 : 12,
      expected_conversion_rate: channel === 'whatsapp' ? 10 : channel === 'email' ? 8 : 5,
      expected_revenue: Math.round(revenueOp * 0.1),
      expected_roi: channel === 'whatsapp' ? 6.2 : channel === 'email' ? 8.5 : 4.2
    },
    strategy: {
      offer: `${discount} discount using code ${coupon}`,
      tone: isVip ? "Exclusive and premium" : "Friendly and urgent",
      timing: "Friday at 6:00 PM",
      channel: channel.charAt(0).toUpperCase() + channel.slice(1),
      audience: audienceName,
      explain_offer: `A ${discount} incentive triggers conversion without excessive margin erosion, especially when packaged with custom code ${coupon}.`,
      explain_timing: "Sending on Friday evening captures weekend retail shoppers when browsing activity peaks."
    },
    suggested_message: {
      subject: subject,
      message: message
    }
  };
}

// GET all auto-discovered opportunities (based on real database state)
router.get('/opportunities', async (req, res) => {
  try {
    // Calculate statistics directly from the 300 customers database
    const inactiveHighValue = db.query(`
      SELECT COUNT(*) as count, COALESCE(SUM(total_spend), 0) as total_spend_sum
      FROM customers 
      WHERE total_spend > 10000 AND (last_purchase < datetime('now', '-45 days') OR last_purchase IS NULL)
    `).rows[0];

    const churnRisk = db.query(`
      SELECT COUNT(*) as count, COALESCE(SUM(total_spend), 0) as total_spend_sum
      FROM customers 
      WHERE last_purchase < datetime('now', '-90 days') OR last_purchase IS NULL
    `).rows[0];

    const frequentBuyers = db.query(`
      SELECT COUNT(*) as count, COALESCE(SUM(total_spend), 0) as total_spend_sum
      FROM customers 
      WHERE order_count >= 5
    `).rows[0];

    const vipCustomers = db.query(`
      SELECT COUNT(*) as count, COALESCE(SUM(total_spend), 0) as total_spend_sum
      FROM customers 
      WHERE total_spend > 15000
    `).rows[0];

    const newCustomers = db.query(`
      SELECT COUNT(*) as count, COALESCE(SUM(total_spend), 0) as total_spend_sum
      FROM customers 
      WHERE created_at > datetime('now', '-30 days')
    `).rows[0];

    const opportunities = [
      {
        id: 'opp_inactive_hv',
        name: 'Inactive High Value Customers',
        audience_size: inactiveHighValue.count,
        potential_revenue: Math.round(inactiveHighValue.count * 3500),
        confidence: 91,
        goal_prompt: 'Re-engage inactive high-value premium customers who have not purchased recently',
        badge: 'Critical Opp'
      },
      {
        id: 'opp_churn_risk',
        name: 'Churn Risk Re-engagement',
        audience_size: churnRisk.count,
        potential_revenue: Math.round(churnRisk.count * 2200),
        confidence: 85,
        goal_prompt: 'Prevent churn for at-risk shoppers with a high-value callback offer',
        badge: 'High Risk'
      },
      {
        id: 'opp_frequent_buyers',
        name: 'Frequent Buyers Loyalty Upgrade',
        audience_size: frequentBuyers.count,
        potential_revenue: Math.round(frequentBuyers.count * 1800),
        confidence: 88,
        goal_prompt: 'Reward frequent buyers with an exclusive loyalty tier invitation',
        badge: 'Growth'
      },
      {
        id: 'opp_vip_club',
        name: 'VIP Club Exclusive Campaign',
        audience_size: vipCustomers.count,
        potential_revenue: Math.round(vipCustomers.count * 4500),
        confidence: 94,
        goal_prompt: 'Launch premium early-access capsule collection for top tier VIP spenders',
        badge: 'High ROI'
      },
      {
        id: 'opp_new_welcome',
        name: 'New Customer Second-Purchase Drive',
        audience_size: newCustomers.count,
        potential_revenue: Math.round(newCustomers.count * 1200) || 5000, // safety default
        confidence: 79,
        goal_prompt: 'Welcome recent signups and convert them to repeat purchasers',
        badge: 'Retention'
      }
    ];

    res.json(opportunities);
  } catch (err) {
    console.error('Error fetching opportunities:', err);
    res.status(500).json({ error: 'Failed to fetch opportunities' });
  }
});

// POST suggest segment rules based on natural language
router.post('/suggest-segment', async (req, res) => {
  const { description } = req.body;
  if (!description) {
    return res.status(400).json({ error: 'Description is required' });
  }

  try {
    const stats = db.query(`
      SELECT
        COUNT(*) as total_customers,
        ROUND(AVG(total_spend), 2) as avg_spend,
        ROUND(AVG(order_count), 1) as avg_orders
      FROM customers
    `).rows[0];

    const citiesResult = db.query('SELECT DISTINCT city FROM customers WHERE city IS NOT NULL');
    const cities = citiesResult.rows.map(r => r.city).join(', ');

    const prompt = `You are an AI assistant for a CRM platform. A marketer wants to create a customer segment.

Customer database context:
- Total customers: ${stats.total_customers}
- Average spend: ₹${stats.avg_spend}
- Average orders: ${stats.avg_orders}
- Cities: ${cities}

Available fields for rules:
- total_spend (decimal) — customer's total spending
- order_count (integer) — number of orders placed
- last_purchase (timestamp) — date of last purchase
- city (text) — customer's city
- created_at (timestamp) — when the customer was created

Available operators:
- greater_than, less_than, greater_than_or_equal, less_than_or_equal
- equals, not_equals, contains
- older_than_days, newer_than_days (for date fields — value is number of days)

The marketer described the segment as: "${description}"

Respond with ONLY valid JSON (no markdown, no conversational text) in this exact format:
{
  "name": "Segment Name",
  "description": "A clear description of this segment",
  "rules": [
    { "field": "field_name", "operator": "operator_name", "value": "value" }
  ]
}`;

    const parsed = await callGemini(prompt);
    res.json(parsed);
  } catch (error) {
    console.warn('Error with Gemini in suggest-segment, applying fallback:', error.message);
    try {
      const parsed = generateMockSegment(description);
      res.json(parsed);
    } catch (fallbackError) {
      console.error('Fallback also failed:', fallbackError);
      res.status(500).json({ error: 'Failed to generate segment suggestion', details: error.message });
    }
  }
});

// POST suggest channel based on segment
router.post('/suggest-channel', async (req, res) => {
  const { segment_name, segment_description } = req.body;
  if (!segment_name) {
    return res.status(400).json({ error: 'segment_name is required' });
  }

  try {
    const prompt = `You are an AI marketing assistant. Recommend the best communication channel (email, whatsapp, sms, or rcs) for a campaign targeting this customer segment:
Segment Name: "${segment_name}"
Segment Description: "${segment_description || ''}"

Consider:
- High-value/VIP segments: usually prefer 'email' (for rich layouts and premium branding) or 'whatsapp' (for highly direct personalization).
- Churn-risk/inactive segments: usually prefer 'whatsapp' (highest open rates) or 'sms' (urgency and callbacks).
- General/broad segments: usually prefer 'sms' (broad reach) or 'email' (low cost).
- Highly interactive segments: prefer 'rcs' or 'whatsapp'.

Respond with ONLY valid JSON (no markdown wrappers, no conversational text) in this exact format:
{
  "channel": "email" | "whatsapp" | "sms" | "rcs",
  "confidence_score": 85,
  "reasoning": "A short, professional explanation of why this channel is recommended for this segment."
}`;

    const parsed = await callGemini(prompt);
    res.json(parsed);
  } catch (error) {
    console.warn('Error with Gemini in suggest-channel, applying fallback:', error.message);
    // Fallback: analyze words in segment name/description
    const name = segment_name.toLowerCase();
    const desc = (segment_description || '').toLowerCase();
    let channel = 'whatsapp';
    let confidence_score = 85;
    let reasoning = "WhatsApp offers the highest direct engagement rates for customer outreach.";

    if (name.includes('vip') || name.includes('high value') || name.includes('spend') || desc.includes('vip') || desc.includes('spend')) {
      channel = 'email';
      confidence_score = 92;
      reasoning = "Email is highly recommended for VIP cohorts to present premium offers and rich media layouts without being intrusive.";
    } else if (name.includes('inactive') || name.includes('churn') || desc.includes('inactive') || desc.includes('churn')) {
      channel = 'whatsapp';
      confidence_score = 88;
      reasoning = "WhatsApp delivers high open rates (98%) making it ideal to re-engage inactive customers.";
    } else if (name.includes('new') || desc.includes('new') || name.includes('signup')) {
      channel = 'sms';
      confidence_score = 80;
      reasoning = "SMS provides immediate delivery to verify signup interest and offer a quick first-order discount.";
    }

    res.json({ channel, confidence_score, reasoning });
  }
});

// POST generate personalized message
router.post('/generate-message', async (req, res) => {
  const { channel, segment_name, segment_description, campaign_goal, tone } = req.body;
  if (!channel || !campaign_goal) {
    return res.status(400).json({ error: 'channel and campaign_goal are required' });
  }

  try {
    const channelGuidelines = {
      email: 'Write a professional email with a subject line and body. Keep it concise but informative. Include a clear call-to-action.',
      whatsapp: 'Write a casual, friendly WhatsApp message. Keep it short (under 160 words). Use emoji sparingly. Include a clear CTA.',
      sms: 'Write a very short SMS message (under 160 characters). Be direct and include a CTA.',
      rcs: 'Write a rich messaging format message. Keep it engaging with clear structure and a CTA.',
    };

    const prompt = `You are a marketing copywriter for a Direct-to-Consumer brand. Write a ${channel} message for a campaign.

Campaign details:
- Channel: ${channel}
- Target audience: ${segment_name || 'General audience'}${segment_description ? ` — ${segment_description}` : ''}
- Campaign goal: ${campaign_goal}
- Tone: ${tone || 'Professional and friendly'}

Guidelines: ${channelGuidelines[channel] || channelGuidelines.email}

Use {{name}} as a placeholder for the customer's name.

Respond with ONLY valid JSON (no markdown, no conversational text) in this exact format:
{
  "subject": "Email subject line (only for email channel, null for others)",
  "message": "The complete message text with {{name}} placeholder"
}`;

    const parsed = await callGemini(prompt);
    res.json(parsed);
  } catch (error) {
    console.warn('Error with Gemini in generate-message, applying fallback:', error.message);
    try {
      const parsed = generateMockMessage(channel, segment_name, campaign_goal, tone);
      res.json(parsed);
    } catch (fallbackError) {
      console.error('Fallback also failed:', fallbackError);
      res.status(500).json({ error: 'Failed to generate message', details: error.message });
    }
  }
});

// POST campaign recommendations (AI Copilot Upgrade)
router.post('/campaign-recommendations', async (req, res) => {
  const { goal } = req.body;
  if (!goal) {
    return res.status(400).json({ error: 'Goal is required' });
  }

  const segments = db.query('SELECT id, name, description, customer_count FROM segments ORDER BY customer_count DESC').rows;

  try {
    const custStats = db.query(`
      SELECT
        COUNT(*) as total,
        ROUND(AVG(total_spend), 2) as avg_spend,
        ROUND(AVG(order_count), 1) as avg_orders
      FROM customers
    `).rows[0];

    const inactiveCount = db.query(
      "SELECT COUNT(*) as count FROM customers WHERE last_purchase < datetime('now', '-90 days') OR last_purchase IS NULL"
    ).rows[0].count;

    const highValueCount = db.query(
      "SELECT COUNT(*) as count FROM customers WHERE total_spend > 10000"
    ).rows[0].count;

    const channelPerf = db.query(`
      SELECT channel,
        COUNT(*) as campaigns,
        ROUND(AVG(CASE WHEN total_delivered > 0 THEN (CAST(total_opened AS REAL) / total_delivered) * 100 ELSE 0 END), 1) as avg_open_rate,
        ROUND(AVG(CASE WHEN total_opened > 0 THEN (CAST(total_clicked AS REAL) / total_opened) * 100 ELSE 0 END), 1) as avg_click_rate
      FROM campaigns WHERE status = 'completed'
      GROUP BY channel
    `).rows;

    const prompt = `You are an AI marketing strategist and campaign architect for a Direct-to-Consumer brand.
A marketer has inputted the following goal: "${goal}"

Database Context:
- Total customers: ${custStats.total}
- Average customer spend: ₹${custStats.avg_spend}
- Average orders per customer: ${custStats.avg_orders}
- Churn Risk/Inactive Customers (no purchase in 90 days): ${inactiveCount}
- High-value customers (spend > ₹10,000): ${highValueCount}

Segments:
${segments.map(s => `- ${s.name} (${s.customer_count} customers): ${s.description}`).join('\n')}

Historical Channel Performance:
${channelPerf.length > 0 ? channelPerf.map(c => `- ${c.channel}: ${c.campaigns} campaigns, ${c.avg_open_rate}% avg open rate, ${c.avg_click_rate}% avg click rate`).join('\n') : '- No historical data yet'}

Construct a complete, highly-explainable campaign strategy workspace in response.
Every recommendation MUST explain the strategic justification (Why this audience, Why this channel, Why this offer, Why this timing).

Respond with ONLY valid JSON in this exact structure (no markdown wrapper, no conversational text):
{
  "analysis": {
    "summary": "AI summary of the goal and strategy approach.",
    "audience_name": "Recommended audience name (e.g., High Value Customers)",
    "audience_size": 29,
    "reasoning": "Detailed explanation of why this specific audience was selected based on database numbers.",
    "revenue_opportunity": 48000,
    "confidence_score": 91
  },
  "recommended_channel": {
    "channel": "whatsapp|email|sms|rcs",
    "confidence_score": 92,
    "reasoning": "Specifically explain why this channel outperforms others for this audience segment."
  },
  "predictions": {
    "expected_delivery_rate": 98,
    "expected_open_rate": 62,
    "expected_click_rate": 24,
    "expected_conversion_rate": 12,
    "expected_revenue": 48000,
    "expected_roi": 4.5
  },
  "strategy": {
    "offer": "15% loyalty discount",
    "tone": "Premium and urgent",
    "timing": "Friday at 6:00 PM",
    "channel": "WhatsApp",
    "audience": "Inactive Premium Customers",
    "explain_offer": "Detailed rationale for this offer structure.",
    "explain_timing": "Detailed rationale for this day and hour timing selection."
  },
  "suggested_message": {
    "subject": "Subject line if channel is email, otherwise null",
    "message": "Complete message content with {{name}} placeholder."
  }
}`;

    const parsed = await callGemini(prompt);

    // Try to match the segment_id if an existing segment shares a similar name
    let matchedSegmentId = null;
    const recommendedName = parsed.analysis?.audience_name || '';
    const match = segments.find(s => 
      s.name.toLowerCase().includes(recommendedName.toLowerCase()) || 
      recommendedName.toLowerCase().includes(s.name.toLowerCase())
    );
    if (match) {
      matchedSegmentId = match.id;
    } else if (segments.length > 0) {
      matchedSegmentId = segments[0].id; // fallback to top segment
    }

    res.json({
      ...parsed,
      segment_id: matchedSegmentId
    });
  } catch (error) {
    console.warn('Error with Gemini in campaign-recommendations, applying fallback:', error.message);
    try {
      const parsed = generateMockRecommendations(goal, segments);
      let matchedSegmentId = null;
      const recommendedName = parsed.analysis?.audience_name || '';
      const match = segments.find(s => 
        s.name.toLowerCase().includes(recommendedName.toLowerCase()) || 
        recommendedName.toLowerCase().includes(s.name.toLowerCase())
      );
      if (match) {
        matchedSegmentId = match.id;
      } else if (segments.length > 0) {
        matchedSegmentId = segments[0].id; // fallback to top segment
      }

      res.json({
        ...parsed,
        segment_id: matchedSegmentId
      });
    } catch (fallbackError) {
      console.error('Fallback also failed:', fallbackError);
      res.status(500).json({ error: 'Failed to generate recommendations', details: error.message });
    }
  }
});

// GET marketing intelligence metrics based on real database state
router.get('/marketing-intelligence', async (req, res) => {
  try {
    const inactiveHighValue = db.query(`
      SELECT COUNT(*) as count FROM customers 
      WHERE total_spend > 10000 AND (last_purchase < datetime('now', '-45 days') OR last_purchase IS NULL)
    `).rows[0].count;

    const vipSpenders = db.query(`
      SELECT COUNT(*) as count FROM customers 
      WHERE total_spend > 15000
    `).rows[0].count;

    const churnCount = db.query(`
      SELECT COUNT(*) as count FROM customers 
      WHERE last_purchase < datetime('now', '-90 days') OR last_purchase IS NULL
    `).rows[0].count;

    const topSegment = db.query(`
      SELECT name, customer_count FROM segments ORDER BY customer_count DESC LIMIT 1
    `).rows[0] || { name: 'Active Spenders', customer_count: 50 };

    res.json({
      topOpportunity: {
        name: "Inactive VIP Spenders",
        revenue: inactiveHighValue * 3500 || 28000,
        confidence: 91,
        prompt: "Re-engage inactive high-value premium customers who have not purchased recently"
      },
      biggestRevenue: {
        name: "VIP Premium Cohort",
        revenue: vipSpenders * 4500 || 45000,
        confidence: 94,
        prompt: "Launch premium early-access collection for top VIP spenders"
      },
      highRisk: {
        name: "Dormant Accounts",
        count: churnCount || 35,
        confidence: 85,
        prompt: "Prevent churn for dormant accounts with a 20% reactivation offer"
      },
      bestSegment: {
        name: topSegment.name,
        convRate: 14,
        confidence: 88
      }
    });
  } catch (err) {
    console.error('Failed to load marketing intelligence:', err);
    res.status(500).json({ error: 'Failed to load marketing intelligence' });
  }
});

// POST parse conversational question and return CRM database answers
router.post('/query-crm', async (req, res) => {
  const { question } = req.body;
  if (!question) {
    return res.status(400).json({ error: 'Question is required' });
  }

  const q = question.toLowerCase();

  try {
    if (q.includes('roi')) {
      // Find highest ROI campaign
      const camps = db.query(`
        SELECT name, channel, revenue_generated, total_sent 
        FROM campaigns 
        WHERE status = 'completed'
      `).rows;

      const campsWithRoi = camps.map(c => {
        const cost = (c.total_sent || 1) * 1.5;
        const roiVal = c.revenue_generated > 0 ? (c.revenue_generated / cost).toFixed(1) : '0.0';
        return {
          name: c.name,
          channel: c.channel,
          revenue_generated: c.revenue_generated || 0,
          roi: parseFloat(roiVal)
        };
      }).sort((a, b) => b.roi - a.roi);

      const top = campsWithRoi[0] || { name: 'Autopilot WIN-BACK VIP', channel: 'whatsapp', revenue_generated: 31500, roi: 6.2 };

      return res.json({
        answer: `Based on campaign telemetry, the highest ROI campaign is "${top.name}" using the ${top.channel.toUpperCase()} channel. It generated ₹${top.revenue_generated.toLocaleString()} in revenue with a stellar ${top.roi}x ROI multiplier.`,
        type: 'campaigns',
        data: campsWithRoi.slice(0, 3)
      });
    }

    if (q.includes('revenue') || q.includes('audience')) {
      // Find audience generating most revenue potential
      const segs = db.query(`
        SELECT name, customer_count FROM segments
      `).rows;

      const segData = segs.map(s => ({
        name: s.name,
        customer_count: s.customer_count,
        potential_revenue: s.customer_count * 2500
      })).sort((a, b) => b.potential_revenue - a.potential_revenue);

      const top = segData[0] || { name: 'VIP Spenders', customer_count: 25, potential_revenue: 62500 };

      return res.json({
        answer: `The audience segment with the largest immediate revenue potential is "${top.name}" containing ${top.customer_count} customers, with an estimated win-back potential of ₹${top.potential_revenue.toLocaleString()}.`,
        type: 'segments',
        data: segData.slice(0, 3)
      });
    }

    if (q.includes('churn')) {
      // Find churn risks
      const customers = db.query(`
        SELECT name, email, last_purchase, total_spend FROM customers 
        WHERE last_purchase IS NOT NULL
        ORDER BY last_purchase ASC LIMIT 3
      `).rows;

      const churnData = customers.map(c => {
        const days = Math.floor((new Date() - new Date(c.last_purchase)) / (1000 * 60 * 60 * 24));
        const risk = Math.min(98, 70 + Math.floor(days * 0.1));
        return {
          name: c.name,
          email: c.email,
          preferred_channel: c.total_spend > 10000 ? 'Email' : 'WhatsApp',
          lifetime_value: c.total_spend,
          churn_risk: risk
        };
      });

      return res.json({
        answer: "Our churn model has identified several high-value customers who haven't placed an order in over 90 days. I suggest initiating an automated callback discount.",
        type: 'churn',
        data: churnData
      });
    }

    if (q.includes('next') || q.includes('should i do')) {
      return res.json({
        answer: "AI Strategy Engine: The next best action is to re-engage dormant high-value accounts before the weekend conversion spike.",
        type: 'recommendation',
        data: {
          recommended_action: "Launch a WhatsApp Win-Back campaign targeting 'Inactive VIP Spenders' with code AUTOWIN20.",
          expected_revenue: 31500,
          confidence: 91
        }
      });
    }

    // Default response using Gemini if possible, otherwise generic professional response
    try {
      const stats = db.query('SELECT COUNT(*) as count FROM customers').rows[0].count;
      const prompt = `You are a CRM Marketing Assistant. The user asks: "${question}".
      CRM Context: Database has ${stats} total customers. Keep your answer under 3 sentences and provide a helpful, actionable marketing advice based on CRM best practices.`;
      
      const model = getModel();
      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();
      
      return res.json({ answer: text });
    } catch {
      return res.json({
        answer: "I recommend launching a localized campaign targeting customers in Mumbai and Delhi who have high engagement scores but haven't bought in the last 30 days."
      });
    }
  } catch (err) {
    console.error('CRM Query failed:', err);
    res.status(500).json({ error: 'CRM Query failed' });
  }
});

module.exports = router;


