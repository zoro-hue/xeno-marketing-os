const Database = require('better-sqlite3');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const dbPath = path.resolve(__dirname, '../../data/xeno.db');

// Ensure data directory exists
const fs = require('fs');
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

/**
 * Wrapper to match the pg-style query interface so route code stays clean.
 * Supports both SELECT (returns { rows }) and INSERT/UPDATE/DELETE (returns { rows, changes }).
 */
function query(sql, params = []) {
  // Normalize $1, $2 ... placeholders to ? for SQLite
  let normalizedSql = sql;
  let normalizedParams = params;

  if (sql.includes('$')) {
    // Replace $N placeholders with ?
    // We need to map positional $N to sequential ?
    const paramMap = {};
    normalizedSql = sql.replace(/\$(\d+)/g, (_, num) => {
      paramMap[num] = true;
      return '?';
    });
    // params are already in order for positional $1,$2,...
    normalizedParams = params;
  }

  // Replace PostgreSQL-specific syntax for SQLite compatibility
  normalizedSql = normalizedSql
    // Replace ILIKE with LIKE (SQLite is case-insensitive for ASCII by default)
    .replace(/\bILIKE\b/gi, 'LIKE')
    // Replace NOW() with datetime('now')
    .replace(/\bNOW\(\)/gi, "datetime('now')")
    // Replace INTERVAL 'N days' with SQLite equivalent
    .replace(/INTERVAL\s+'(\d+)\s+days'/gi, "'$1 days'")
    // Replace PostgreSQL date subtraction: datetime('now') - '30 days' → datetime('now', '-30 days')
    .replace(/datetime\('now'\)\s*-\s*'(\d+)\s+days'/gi, "datetime('now', '-$1 days')")
    // Replace JSONB with TEXT (SQLite stores JSON as text)
    .replace(/\bJSONB\b/gi, 'TEXT')
    // Replace SERIAL PRIMARY KEY with INTEGER PRIMARY KEY AUTOINCREMENT
    .replace(/SERIAL\s+PRIMARY\s+KEY/gi, 'INTEGER PRIMARY KEY AUTOINCREMENT')
    // Replace DECIMAL(x,y) with REAL
    .replace(/DECIMAL\(\d+,\d+\)/gi, 'REAL')
    // Replace VARCHAR(N) with TEXT
    .replace(/VARCHAR\(\d+\)/gi, 'TEXT')
    // Replace TIMESTAMP with TEXT
    .replace(/\bTIMESTAMP\b/gi, 'TEXT')
    // Replace DEFAULT NOW() → DEFAULT (datetime('now'))
    .replace(/DEFAULT\s+datetime\('now'\)/gi, "DEFAULT (datetime('now'))")
    // Remove RETURNING * (handle separately)
    // Remove CREATE INDEX IF NOT EXISTS ... ON ... for compatibility
    ;

  const trimmed = normalizedSql.trim().toUpperCase();
  const isSelect = trimmed.startsWith('SELECT') || trimmed.startsWith('WITH');
  const hasReturning = /\bRETURNING\b/i.test(normalizedSql);

  try {
    if (isSelect) {
      const stmt = db.prepare(normalizedSql);
      const rows = stmt.all(...normalizedParams);
      return { rows };
    } else if (hasReturning) {
      // SQLite doesn't support RETURNING, so we simulate it
      const cleanSql = normalizedSql.replace(/\s+RETURNING\s+.*/i, '');
      const stmt = db.prepare(cleanSql);
      const result = stmt.run(...normalizedParams);
      
      // Get the inserted/updated row
      if (result.lastInsertRowid) {
        // Figure out the table from the SQL
        const tableMatch = normalizedSql.match(/(?:INSERT\s+INTO|UPDATE)\s+(\w+)/i);
        if (tableMatch) {
          const table = tableMatch[1];
          const row = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(result.lastInsertRowid);
          return { rows: row ? [row] : [], changes: result.changes };
        }
      }
      return { rows: [], changes: result.changes };
    } else {
      const stmt = db.prepare(normalizedSql);
      const result = stmt.run(...normalizedParams);
      return { rows: [], changes: result.changes, lastInsertRowid: result.lastInsertRowid };
    }
  } catch (error) {
    // Handle unique constraint violations (similar to pg error code 23505)
    if (error.message.includes('UNIQUE constraint failed')) {
      const pgError = new Error(error.message);
      pgError.code = '23505';
      throw pgError;
    }
    throw error;
  }
}

module.exports = {
  query,
  db, // expose raw db for transactions if needed
};
