import Database from 'better-sqlite3';
import { User, Domain, VerificationCode } from '../types';

export class DatabaseManager {
  private db: Database.Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.initTables();
  }

  private initTables(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        telegramId INTEGER UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        phoneNumber TEXT NOT NULL,
        isVerified BOOLEAN DEFAULT FALSE,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS domains (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        domain TEXT NOT NULL,
        registrationDate DATETIME,
        expirationDate DATETIME,
        lastRenewDate DATETIME,
        registrar TEXT,
        status TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users (id)
      );

      CREATE TABLE IF NOT EXISTS verification_codes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        telegramId INTEGER NOT NULL,
        email TEXT NOT NULL,
        code TEXT NOT NULL,
        expiresAt DATETIME NOT NULL,
        isUsed BOOLEAN DEFAULT FALSE
      );
    `);
  }

  createUser(telegramId: number, email: string, phoneNumber: string): void {
    const stmt = this.db.prepare('INSERT INTO users (telegramId, email, phoneNumber) VALUES (?, ?, ?)');
    stmt.run(telegramId, email, phoneNumber);
  }

  getUserByTelegramId(telegramId: number): User | null {
    const stmt = this.db.prepare('SELECT * FROM users WHERE telegramId = ?');
    return stmt.get(telegramId) as User | null;
  }

  verifyUser(telegramId: number): void {
    const stmt = this.db.prepare('UPDATE users SET isVerified = TRUE WHERE telegramId = ?');
    stmt.run(telegramId);
  }

  addDomain(userId: number, domain: string, domainInfo: any): void {
    const stmt = this.db.prepare(`
      INSERT INTO domains (userId, domain, registrationDate, expirationDate, 
       lastRenewDate, registrar, status) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      userId,
      domain,
      domainInfo.registrationDate?.toISOString(),
      domainInfo.expirationDate?.toISOString(),
      domainInfo.lastRenewDate?.toISOString(),
      domainInfo.registrar,
      domainInfo.status
    );
  }

  getUserDomains(userId: number): Domain[] {
    const stmt = this.db.prepare('SELECT * FROM domains WHERE userId = ?');
    return stmt.all(userId) as Domain[];
  }

  deleteDomain(userId: number, domainId: number): void {
    const stmt = this.db.prepare('DELETE FROM domains WHERE id = ? AND userId = ?');
    stmt.run(domainId, userId);
  }

  saveVerificationCode(telegramId: number, email: string, code: string): void {
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const stmt = this.db.prepare('INSERT INTO verification_codes (telegramId, email, code, expiresAt) VALUES (?, ?, ?, ?)');
    stmt.run(telegramId, email, code, expiresAt);
  }

  verifyCode(telegramId: number, code: string): boolean {
    const stmt = this.db.prepare(`
      SELECT * FROM verification_codes 
      WHERE telegramId = ? AND code = ? AND isUsed = FALSE AND expiresAt > datetime('now')
    `);
    const row = stmt.get(telegramId, code) as any;
    
    if (row) {
      const updateStmt = this.db.prepare('UPDATE verification_codes SET isUsed = TRUE WHERE id = ?');
      updateStmt.run(row.id);
      return true;
    }
    return false;
  }

  getExpiringDomains(): Domain[] {
    const oneMonthFromNow = new Date();
    oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);
    
    const stmt = this.db.prepare('SELECT * FROM domains WHERE expirationDate <= ? AND expirationDate > datetime("now")');
    return stmt.all(oneMonthFromNow.toISOString()) as Domain[];
  }
}
