import dotenv from 'dotenv';
import { DatabaseManager } from './database';
import { EmailService } from './services/emailService';
import { DomainManagerBot } from './bot';
import { ReminderService } from './services/reminderService';

dotenv.config();

async function main() {
  // Add global error handlers
  process.on('unhandledRejection', (reason, promise) => {
    if (reason && typeof reason === 'object' && 'message' in reason) {
      const message = (reason as Error).message;
      if (message.includes('query is too old') || message.includes('query ID is invalid')) {
        console.log('⚠️ Telegram callback query timeout - this is normal');
        return;
      }
    }
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  });

  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
  });

  // Validate environment variables
  const requiredEnvVars = [
    'TELEGRAM_BOT_TOKEN',
    'EMAILJS_SERVICE_ID',
    'EMAILJS_TEMPLATE_ID',
    'EMAILJS_PUBLIC_KEY'
  ];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      console.error(`Missing required environment variable: ${envVar}`);
      process.exit(1);
    }
  }

  // Initialize services
  const db = new DatabaseManager(process.env.DATABASE_PATH || './data/database.sqlite');
  
  const emailService = new EmailService(
    process.env.EMAILJS_SERVICE_ID!,
    process.env.EMAILJS_TEMPLATE_ID!,
    process.env.EMAILJS_PUBLIC_KEY!,
    process.env.EMAILJS_PRIVATE_KEY // Optional private key
  );

  const bot = new DomainManagerBot(
    process.env.TELEGRAM_BOT_TOKEN!,
    db,
    emailService
  );

  // Start reminder service
  const reminderService = new ReminderService(bot['bot'], db);

  console.log('🤖 Domain Manager Bot started successfully!');
}

main().catch(console.error);
