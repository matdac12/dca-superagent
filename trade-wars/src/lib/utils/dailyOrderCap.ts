// File-Based Daily Order Cap System
// Enforces maximum trades per 24-hour period using persistent file storage

import fs from 'fs';
import path from 'path';

// Path to the daily order cap data file
const DAILY_CAP_FILE = path.join(process.cwd(), 'data', 'daily-order-cap.json');

interface DailyOrderCapData {
  date: string; // ISO date string YYYY-MM-DD
  count: number;
}

/**
 * Returns today's date in UTC as YYYY-MM-DD format
 */
function getCurrentDate(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Reads the daily order cap data from file
 * Returns default data if file doesn't exist or read fails
 */
function readDailyOrderCap(): DailyOrderCapData {
  try {
    if (fs.existsSync(DAILY_CAP_FILE)) {
      const fileContent = fs.readFileSync(DAILY_CAP_FILE, 'utf-8');
      const data = JSON.parse(fileContent) as DailyOrderCapData;
      return data;
    }
  } catch (error) {
    console.error('Error reading daily order cap file:', error);
  }

  // Return default data if file doesn't exist or read fails
  return {
    date: getCurrentDate(),
    count: 0,
  };
}

/**
 * Writes the daily order cap data to file
 * Creates the data directory if it doesn't exist
 */
function writeDailyOrderCap(data: DailyOrderCapData): void {
  try {
    // Ensure the data directory exists
    const dataDir = path.dirname(DAILY_CAP_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Write data with pretty formatting
    const fileContent = JSON.stringify(data, null, 2);
    fs.writeFileSync(DAILY_CAP_FILE, fileContent, 'utf-8');
  } catch (error) {
    console.error('Error writing daily order cap file:', error);
    // Don't throw - just log the error
  }
}

/**
 * Checks if a new order is allowed under the daily cap (does NOT increment)
 *
 * @param dailyCap - Maximum number of orders allowed per day (typically 10)
 * @returns Object with allowed flag, current count, and remaining orders
 */
export function checkDailyOrderCap(dailyCap: number): {
  allowed: boolean;
  count: number;
  remaining: number;
} {
  const currentData = readDailyOrderCap();
  const today = getCurrentDate();

  // Check if we need to reset (new day)
  let count = currentData.count;
  if (currentData.date !== today) {
    // New day - count is 0
    count = 0;
  }

  // Check if under cap
  const allowed = count < dailyCap;

  return {
    allowed,
    count,
    remaining: Math.max(0, dailyCap - count),
  };
}

/**
 * Increments the daily order count (call after actual BUY/SELL trade)
 * Should only be called for actual trades, not HOLD decisions
 */
export function incrementDailyOrderCap(): void {
  const currentData = readDailyOrderCap();
  const today = getCurrentDate();

  // Check if we need to reset (new day)
  if (currentData.date !== today) {
    // New day - reset
    currentData.date = today;
    currentData.count = 0;
  }

  // Increment and save
  currentData.count += 1;
  writeDailyOrderCap(currentData);
}

/**
 * @deprecated Use checkDailyOrderCap + incrementDailyOrderCap separately
 * Checks if a new order is allowed under the daily cap, and increments the count if allowed
 */
export function checkAndIncrementDailyOrderCap(dailyCap: number): {
  allowed: boolean;
  count: number;
  remaining: number;
} {
  const result = checkDailyOrderCap(dailyCap);
  if (result.allowed) {
    incrementDailyOrderCap();
  }
  return {
    ...result,
    count: result.count + (result.allowed ? 1 : 0),
  };
}

/**
 * Returns the current daily order count without modifying it
 * Useful for displaying current state without incrementing
 *
 * @returns Current order count for today
 */
export function getDailyOrderCount(): number {
  const currentData = readDailyOrderCap();
  const today = getCurrentDate();

  // If date is old, count is 0 (new day)
  if (currentData.date !== today) {
    return 0;
  }

  return currentData.count;
}
