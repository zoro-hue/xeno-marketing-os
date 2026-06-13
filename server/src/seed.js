const { db: sqliteDb } = require('./db');
const { initializeDatabase } = require('./schema');

const firstNames = [
  'Aarav', 'Priya', 'Rohan', 'Ananya', 'Vikram', 'Sneha', 'Arjun', 'Kavya', 'Rahul', 'Meera',
  'Karan', 'Divya', 'Amit', 'Nisha', 'Siddharth', 'Pooja', 'Varun', 'Riya', 'Aditya', 'Tanvi',
  'Nikhil', 'Ishita', 'Manish', 'Shruti', 'Rajesh', 'Deepika', 'Akash', 'Pallavi', 'Gaurav', 'Swati',
  'Preeti', 'Abhishek', 'Neha', 'Rohit', 'Simran', 'Harsh', 'Shalini', 'Vivek', 'Anjali', 'Manoj',
  'Kiran', 'Sunil', 'Ritu', 'Sanjay', 'Poonam', 'Vijay', 'Aarti', 'Sunita', 'Anil', 'Suresh'
];

const lastNames = [
  'Sharma', 'Patel', 'Gupta', 'Singh', 'Reddy', 'Joshi', 'Nair', 'Menon', 'Verma', 'Iyer',
  'Malhotra', 'Krishnan', 'Deshmukh', 'Agarwal', 'Kapoor', 'Rao', 'Saxena', 'Chopra', 'Bhatt', 'Kulkarni',
  'Pandey', 'Banerjee', 'Tiwari', 'Hegde', 'Kumar', 'Shetty', 'Dubey', 'Mishra', 'Thakur', 'Deshpande',
  'Shah', 'Roy', 'Sen', 'Das', 'Mukherjee', 'Bose', 'Dutta', 'Chatterjee', 'Mehta', 'Vyas',
  'Dave', 'Trivedi', 'Bhat', 'Pai', 'Prabhu', 'Choudhury', 'Sinha', 'Grover', 'Bhasin', 'Jha'
];

const cities = [
  'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Pune', 'Kochi', 'Jaipur',
  'Lucknow', 'Chandigarh', 'Ahmedabad', 'Kolkata', 'Bhopal', 'Indore', 'Patna', 'Nagpur'
];

const products = [
  { name: 'Classic White Tee', category: 'Apparel', price: 1299 },
  { name: 'Slim Fit Jeans', category: 'Apparel', price: 2499 },
  { name: 'Leather Crossbody Bag', category: 'Accessories', price: 3999 },
  { name: 'Running Sneakers', category: 'Footwear', price: 4999 },
  { name: 'Hydrating Face Serum', category: 'Skincare', price: 1899 },
  { name: 'Matte Lipstick Set', category: 'Beauty', price: 999 },
  { name: 'Cashmere Scarf', category: 'Accessories', price: 2999 },
  { name: 'Oversized Hoodie', category: 'Apparel', price: 1999 },
  { name: 'Wireless Earbuds', category: 'Electronics', price: 3499 },
  { name: 'Yoga Mat Premium', category: 'Fitness', price: 1599 },
  { name: 'Sunscreen SPF 50', category: 'Skincare', price: 799 },
  { name: 'Denim Jacket', category: 'Apparel', price: 3499 },
  { name: 'Canvas Sneakers', category: 'Footwear', price: 2299 },
  { name: 'Hair Care Kit', category: 'Beauty', price: 1499 },
  { name: 'Smartwatch Band', category: 'Electronics', price: 899 },
];

function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function toISOString(date) {
  return date.toISOString().replace('T', ' ').substring(0, 19);
}

function generateUniqueCustomers(count) {
  const list = [];
  const emails = new Set();
  
  while (list.length < count) {
    const fn = firstNames[randomInt(0, firstNames.length - 1)];
    const ln = lastNames[randomInt(0, lastNames.length - 1)];
    const name = `${fn} ${ln}`;
    const email = `${fn.toLowerCase()}.${ln.toLowerCase()}${randomInt(10, 999)}@email.com`;
    
    if (!emails.has(email)) {
      emails.add(email);
      const phone = `+91-${randomInt(7000000000, 9999999999)}`;
      const city = cities[randomInt(0, cities.length - 1)];
      list.push({ name, email, phone, city });
    }
  }
  return list;
}

function seed(shouldExit = true, dropTables = true) {
  try {
    if (dropTables) {
      console.log('Dropping existing tables...');
      sqliteDb.exec('DROP TABLE IF EXISTS communications');
      sqliteDb.exec('DROP TABLE IF EXISTS campaigns');
      sqliteDb.exec('DROP TABLE IF EXISTS segments');
      sqliteDb.exec('DROP TABLE IF EXISTS orders');
      sqliteDb.exec('DROP TABLE IF EXISTS customers');
    }

    console.log('Initializing database schema...');
    initializeDatabase();

    const now = new Date();
    const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

    // Generate 300 customers
    console.log('Generating 300 customers...');
    const customerList = generateUniqueCustomers(300);

    // Insert customers
    console.log('Inserting customers...');
    const insertCustomer = sqliteDb.prepare(
      'INSERT INTO customers (name, email, phone, city) VALUES (?, ?, ?, ?)'
    );
    const customerIds = [];
    for (const c of customerList) {
      const result = insertCustomer.run(c.name, c.email, c.phone, c.city);
      customerIds.push(result.lastInsertRowid);
    }

    // Insert orders
    console.log('Inserting orders...');
    const insertOrder = sqliteDb.prepare(
      'INSERT INTO orders (customer_id, amount, product, category, status, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    );
    const updateCustomer = sqliteDb.prepare(
      'UPDATE customers SET total_spend = ?, order_count = ?, last_purchase = ? WHERE id = ?'
    );

    const insertOrders = sqliteDb.transaction(() => {
      for (const customerId of customerIds) {
        // High spend vs regular spend distributions
        const isHighSpender = Math.random() < 0.25; // 25% chance of being high spender
        const orderCount = isHighSpender ? randomInt(6, 15) : randomInt(1, 5);
        let totalSpend = 0;
        let lastPurchase = null;

        for (let i = 0; i < orderCount; i++) {
          const product = products[randomInt(0, products.length - 1)];
          const quantity = isHighSpender ? randomInt(2, 4) : randomInt(1, 2);
          const amount = product.price * quantity;
          
          // Distribute last purchase dates to create inactive customer segments
          let orderDate;
          if (Math.random() < 0.3) {
            // Inactive (older orders only)
            orderDate = randomDate(oneYearAgo, new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000));
          } else {
            orderDate = randomDate(oneYearAgo, now);
          }

          insertOrder.run(
            customerId, amount, product.name, product.category, 'completed', toISOString(orderDate)
          );

          totalSpend += amount;
          if (!lastPurchase || orderDate > lastPurchase) {
            lastPurchase = orderDate;
          }
        }

        updateCustomer.run(totalSpend, orderCount, toISOString(lastPurchase), customerId);
      }
    });
    insertOrders();

    // Insert segments
    console.log('Inserting segments...');
    const segmentDefs = [
      {
        name: 'High Value Customers',
        description: 'Customers who have spent more than ₹10,000 in total',
        rules: JSON.stringify([{ field: 'total_spend', operator: 'greater_than', value: 10000 }]),
      },
      {
        name: 'Inactive Customers',
        description: "Customers who haven't purchased in the last 90 days",
        rules: JSON.stringify([{ field: 'last_purchase', operator: 'older_than_days', value: 90 }]),
      },
      {
        name: 'Frequent Buyers',
        description: 'Customers with 5 or more orders',
        rules: JSON.stringify([{ field: 'order_count', operator: 'greater_than', value: 4 }]),
      },
      {
        name: 'Mumbai Shoppers',
        description: 'Customers based in Mumbai',
        rules: JSON.stringify([{ field: 'city', operator: 'equals', value: 'Mumbai' }]),
      },
      {
        name: 'New Customers',
        description: 'Customers who joined in the last 30 days',
        rules: JSON.stringify([{ field: 'created_at', operator: 'newer_than_days', value: 30 }]),
      },
    ];

    const insertSegment = sqliteDb.prepare(
      'INSERT INTO segments (name, description, rules, customer_count) VALUES (?, ?, ?, ?)'
    );

    for (const seg of segmentDefs) {
      const count = getSegmentCount(seg.rules);
      insertSegment.run(seg.name, seg.description, seg.rules, count);
    }

    // Insert campaigns with communications and conversion / revenue data
    console.log('Inserting sample campaigns with conversion tracking...');
    const campaignData = [
      {
        name: 'Summer Sale Announcement',
        segment_id: 1,
        channel: 'email',
        subject: 'Exclusive Summer Sale — Up to 50% Off!',
        message_template: 'Hi {{name}}, our biggest summer sale is here! Enjoy up to 50% off on your favorites. Shop now before it ends.',
        status: 'completed',
        sent_at: randomDate(sixMonthsAgo, new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000)),
      },
      {
        name: 'Win-Back Campaign',
        segment_id: 2,
        channel: 'whatsapp',
        subject: null,
        message_template: "Hey {{name}}, we miss you! It's been a while since your last visit. Here's a special 20% discount just for you. Use code COMEBACK20.",
        status: 'completed',
        sent_at: randomDate(sixMonthsAgo, new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000)),
      },
      {
        name: 'Loyalty Rewards',
        segment_id: 3,
        channel: 'sms',
        subject: null,
        message_template: "{{name}}, thank you for being a loyal customer! You've unlocked a ₹500 reward. Redeem it on your next purchase.",
        status: 'completed',
        sent_at: randomDate(sixMonthsAgo, new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000)),
      },
      {
        name: 'New Arrivals Alert',
        segment_id: 4,
        channel: 'email',
        subject: 'Fresh Arrivals Just for You, {{name}}!',
        message_template: 'Hi {{name}}, check out our latest collection — curated just for Mumbai shoppers like you. Free delivery on orders above ₹999.',
        status: 'completed',
        sent_at: randomDate(sixMonthsAgo, new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)),
      },
    ];

    const insertCampaign = sqliteDb.prepare(
      `INSERT INTO campaigns (name, segment_id, channel, subject, message_template, status, total_sent, total_delivered, total_failed, total_opened, total_read, total_clicked, total_converted, revenue_generated, sent_at, completed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const insertComm = sqliteDb.prepare(
      `INSERT INTO communications (campaign_id, customer_id, channel, message, status, sent_at, delivered_at, failed_at, opened_at, read_at, clicked_at, converted_at, conversion_revenue)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    const insertCampaigns = sqliteDb.transaction(() => {
      for (const camp of campaignData) {
        const segRow = sqliteDb.prepare('SELECT rules FROM segments WHERE id = ?').get(camp.segment_id);
        const segCustomers = getSegmentCustomers(segRow.rules);
        const totalSent = segCustomers.length;
        const totalDelivered = Math.floor(totalSent * (0.85 + Math.random() * 0.12));
        const totalFailed = totalSent - totalDelivered;
        const totalOpened = Math.floor(totalDelivered * (0.3 + Math.random() * 0.35));
        const totalRead = Math.floor(totalOpened * (0.6 + Math.random() * 0.3));
        const totalClicked = Math.floor(totalOpened * (0.15 + Math.random() * 0.25));

        // Create actual conversion counts
        let totalConverted = 0;
        let revenueGenerated = 0;

        const sentAtStr = toISOString(camp.sent_at);
        const communicationsToInsert = [];

        for (const customer of segCustomers) {
          const rand = Math.random();
          let status = 'delivered', delivered_at = null, failed_at = null, opened_at = null, read_at = null, clicked_at = null, converted_at = null, conversion_revenue = null;

          if (rand < totalFailed / totalSent) {
            status = 'failed';
            failed_at = toISOString(new Date(camp.sent_at.getTime() + randomInt(1000, 30000)));
          } else {
            delivered_at = toISOString(new Date(camp.sent_at.getTime() + randomInt(1000, 60000)));
            
            // Check if opened
            if (Math.random() < totalOpened / totalDelivered) {
              opened_at = toISOString(new Date(camp.sent_at.getTime() + randomInt(60000, 86400000)));
              
              // Check if read
              if (Math.random() < totalRead / totalOpened) {
                read_at = toISOString(new Date(camp.sent_at.getTime() + randomInt(120000, 86400000)));
              }
              
              // Check if clicked
              if (Math.random() < totalClicked / totalOpened) {
                clicked_at = toISOString(new Date(camp.sent_at.getTime() + randomInt(120000, 86400000)));
                status = 'clicked';

                // Check if converted (40% click to conversion rate)
                if (Math.random() < 0.4) {
                  status = 'converted';
                  converted_at = toISOString(new Date(camp.sent_at.getTime() + randomInt(240000, 172800000)));
                  conversion_revenue = randomInt(1500, 9500); // Realistic purchase amounts
                  totalConverted++;
                  revenueGenerated += conversion_revenue;
                }
              } else if (read_at) {
                status = 'read';
              } else {
                status = 'opened';
              }
            }
          }

          const personalizedMessage = camp.message_template.replace(/\{\{name\}\}/g, customer.name);
          communicationsToInsert.push({
            customerId: customer.id,
            personalizedMessage,
            status,
            delivered_at,
            failed_at,
            opened_at,
            read_at,
            clicked_at,
            converted_at,
            conversion_revenue
          });
        }

        const campResult = insertCampaign.run(
          camp.name, camp.segment_id, camp.channel, camp.subject, camp.message_template, camp.status,
          totalSent, totalDelivered, totalFailed, totalOpened, totalRead, totalClicked, totalConverted, revenueGenerated, sentAtStr, sentAtStr
        );
        const campaignId = campResult.lastInsertRowid;

        for (const comm of communicationsToInsert) {
          insertComm.run(
            campaignId, comm.customerId, camp.channel, comm.personalizedMessage, comm.status,
            sentAtStr, comm.delivered_at, comm.failed_at, comm.opened_at, comm.read_at, comm.clicked_at, comm.converted_at, comm.conversion_revenue
          );
        }
      }
    });
    insertCampaigns();

    console.log('✓ Seed data inserted successfully!');
    console.log(`  - 300 customers generated`);
    console.log(`  - Orders generated for each customer`);
    console.log(`  - ${segmentDefs.length} segments`);
    console.log(`  - ${campaignData.length} campaigns with communication/conversion records`);

    if (shouldExit) {
      process.exit(0);
    }
  } catch (error) {
    console.error('Seed failed:', error);
    if (shouldExit) {
      process.exit(1);
    } else {
      throw error;
    }
  }
}

function buildWhereClause(rules) {
  const parsed = typeof rules === 'string' ? JSON.parse(rules) : rules;
  if (!parsed || parsed.length === 0) return { where: '', params: [] };

  const conditions = [];
  const params = [];

  for (const rule of parsed) {
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
    }
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return { where, params };
}

function getSegmentCount(rulesJson) {
  const { where, params } = buildWhereClause(rulesJson);
  const result = sqliteDb.prepare(`SELECT COUNT(*) as count FROM customers ${where}`).get(...params);
  return result.count;
}

function getSegmentCustomers(rulesJson) {
  const { where, params } = buildWhereClause(rulesJson);
  return sqliteDb.prepare(`SELECT id, name, email, phone, city FROM customers ${where}`).all(...params);
}

module.exports = { seed };

if (require.main === module) {
  seed(true);
}
