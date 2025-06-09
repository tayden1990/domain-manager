import cron from 'node-cron';
import TelegramBot from 'node-telegram-bot-api';
import { DatabaseManager } from '../database';

export class ReminderService {
  private bot: TelegramBot;
  private db: DatabaseManager;

  constructor(bot: TelegramBot, db: DatabaseManager) {
    this.bot = bot;
    this.db = db;
    this.startReminderSchedule();
  }

  private startReminderSchedule(): void {
    // Run every 3 days at 9 AM
    cron.schedule('0 9 */3 * *', async () => {
      await this.sendExpirationReminders();
    });
  }

  private async sendExpirationReminders(): Promise<void> {
    try {
      const expiringDomains = this.db.getExpiringDomains();

      for (const domain of expiringDomains) {
        const user = this.db.getUserByTelegramId(domain.userId);
        if (user && domain.expirationDate) {
          const daysUntilExpiry = Math.ceil(
            (new Date(domain.expirationDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          );

          const message = `⚠️ Domain Expiration Reminder\n\n` +
            `🌐 Domain: ${domain.domain}\n` +
            `📅 Expires in: ${daysUntilExpiry} days\n` +
            `🗓️ Expiry Date: ${new Date(domain.expirationDate).toDateString()}\n\n` +
            `Please renew your domain to avoid losing it!`;

          await this.bot.sendMessage(user.telegramId, message);
        }
      }
    } catch (error) {
      console.error('Error sending reminders:', error);
    }
  }
}
