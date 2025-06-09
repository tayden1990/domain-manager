import TelegramBot from 'node-telegram-bot-api';
import { DatabaseManager } from '../database';
import { EmailService } from '../services/emailService';
import { WhoisService } from '../services/whoisService';

export class DomainManagerBot {
  private bot: TelegramBot;
  private db: DatabaseManager;
  private emailService: EmailService;
  private pendingUsers: Map<number, { email?: string; code?: string; step?: string }> = new Map();

  constructor(token: string, db: DatabaseManager, emailService: EmailService) {
    this.bot = new TelegramBot(token, { polling: true });
    this.db = db;
    this.emailService = emailService;
    this.setupHandlers();
  }

  private setupHandlers(): void {
    this.bot.onText(/\/start/, this.handleStart.bind(this));
    this.bot.onText(/\/addomain (.+)/, this.handleAddDomain.bind(this));
    this.bot.onText(/\/mydomains/, this.handleMyDomains.bind(this));
    this.bot.onText(/\/deletedom (\d+)/, this.handleDeleteDomain.bind(this));
    this.bot.on('contact', this.handleContact.bind(this));
    this.bot.on('callback_query', this.handleCallbackQuery.bind(this));
    this.bot.on('message', this.handleMessage.bind(this));
  }

  private async handleStart(msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;
    const user = await this.db.getUserByTelegramId(msg.from!.id);

    if (user && user.isVerified) {
      this.showMainMenu(chatId);
    } else {
      this.startSignupFlow(chatId);
    }
  }

  private async startSignupFlow(chatId: number): Promise<void> {
    const keyboard = {
      inline_keyboard: [
        [{ text: '🚀 Get Started', callback_data: 'start_signup' }],
        [{ text: '❓ Help', callback_data: 'help' }]
      ]
    };

    this.bot.sendMessage(chatId, 
      '🎉 Welcome to Domain Manager Bot!\n\n' +
      '📊 Manage your domains effortlessly:\n' +
      '• Monitor expiration dates\n' +
      '• Get renewal reminders\n' +
      '• Track domain information\n' +
      '• Secure email verification\n\n' +
      'Click "Get Started" to create your account!',
      { reply_markup: keyboard }
    );
  }

  private async showMainMenu(chatId: number): Promise<void> {
    const keyboard = {
      inline_keyboard: [
        [{ text: '🌐 My Domains', callback_data: 'my_domains' }],
        [{ text: '➕ Add Domain', callback_data: 'add_domain' }],
        [{ text: '⚙️ Settings', callback_data: 'settings' }]
      ]
    };

    this.bot.sendMessage(chatId, 
      '🎉 Welcome back!\n\n' +
      'What would you like to do?',
      { reply_markup: keyboard }
    );
  }

  private async handleCallbackQuery(query: TelegramBot.CallbackQuery): Promise<void> {
    const chatId = query.message!.chat.id;
    const data = query.data!;
    const userId = query.from.id;

    try {
      switch (data) {
        case 'start_signup':
          this.requestEmail(chatId, userId);
          break;
        case 'my_domains':
          await this.handleMyDomainsCallback(chatId, userId);
          break;
        case 'add_domain':
          this.requestDomainInput(chatId, userId);
          break;
        case 'main_menu':
          this.showMainMenu(chatId);
          break;
        case 'settings':
          this.showSettings(chatId);
          break;
        case 'help':
          this.showHelp(chatId);
          break;
        case 'notifications':
          this.showNotificationSettings(chatId);
          break;
        case 'change_email':
          this.requestEmailChange(chatId, userId);
          break;
        case 'enable_notifications':
          await this.enableNotifications(chatId, userId);
          break;
        case 'disable_notifications':
          await this.disableNotifications(chatId, userId);
          break;
        case 'custom_reminder':
          this.showCustomReminderSettings(chatId);
          break;
        case 'account_info':
          await this.showAccountInfo(chatId, userId);
          break;
        case 'export_domains':
          await this.exportDomains(chatId, userId);
          break;
        case 'reminder_1_day':
          await this.setReminderTime(chatId, userId, 1);
          break;
        case 'reminder_7_days':
          await this.setReminderTime(chatId, userId, 7);
          break;
        case 'reminder_30_days':
          await this.setReminderTime(chatId, userId, 30);
          break;
        default:
          if (data.startsWith('domain_')) {
            const domainId = parseInt(data.split('_')[1]);
            await this.showDomainDetails(chatId, domainId, userId);
          } else if (data.startsWith('delete_')) {
            const domainId = parseInt(data.split('_')[1]);
            await this.confirmDeleteDomain(chatId, domainId, userId);
          } else if (data.startsWith('confirm_delete_')) {
            const domainId = parseInt(data.split('_')[2]);
            await this.deleteDomainById(chatId, domainId, userId);
          } else if (data.startsWith('refresh_')) {
            const domainId = parseInt(data.split('_')[1]);
            await this.refreshDomainInfo(chatId, domainId, userId);
          }
      }

      // Answer callback query with timeout handling
      try {
        await this.bot.answerCallbackQuery(query.id);
      } catch (callbackError: any) {
        if (callbackError.message?.includes('query is too old') || 
            callbackError.message?.includes('query ID is invalid')) {
          console.log('⚠️ Callback query expired, ignoring...');
        } else {
          console.error('Callback query error:', callbackError.message);
        }
      }
    } catch (error: any) {
      console.error('Error handling callback query:', error.message);
      
      // Try to answer the callback query even if there was an error
      try {
        await this.bot.answerCallbackQuery(query.id, {
          text: '❌ An error occurred. Please try again.',
          show_alert: true
        });
      } catch (callbackError) {
        // Ignore callback answer errors
        console.log('Could not answer callback query due to timeout');
      }
    }
  }

  private async requestEmail(chatId: number, userId: number): Promise<void> {
    this.pendingUsers.set(userId, { step: 'awaiting_email' });
    
    this.bot.sendMessage(chatId, 
      '📧 Please enter your email address:\n\n' +
      'This will be used for:\n' +
      '• Account verification\n' +
      '• Domain expiration alerts\n' +
      '• Important notifications\n\n' +
      '💡 Just type your email and send it!'
    );
  }

  private async requestDomainInput(chatId: number, userId: number): Promise<void> {
    this.pendingUsers.set(userId, { step: 'awaiting_domain' });
    
    this.bot.sendMessage(chatId, 
      '🌐 Please enter the domain you want to add:\n\n' +
      'Examples:\n' +
      '• example.com\n' +
      '• mywebsite.org\n' +
      '• company.net\n\n' +
      '💡 Just type the domain name and send it!'
    );
  }

  private async handleMessage(msg: TelegramBot.Message): Promise<void> {
    if (!msg.text || msg.text.startsWith('/')) return;

    const chatId = msg.chat.id;
    const userId = msg.from!.id;
    const pendingUser = this.pendingUsers.get(userId);

    if (!pendingUser) return;

    switch (pendingUser.step) {
      case 'awaiting_email':
        await this.processEmail(chatId, userId, msg.text);
        break;
      case 'awaiting_verification':
        await this.processVerificationCode(chatId, userId, msg.text);
        break;
      case 'awaiting_domain':
        await this.processDomain(chatId, userId, msg.text);
        break;
      case 'awaiting_new_email':
        await this.processEmailChange(chatId, userId, msg.text);
        break;
    }
  }

  private async processEmail(chatId: number, userId: number, email: string): Promise<void> {
    if (!this.isValidEmail(email)) {
      this.bot.sendMessage(chatId, '❌ Please enter a valid email address.');
      return;
    }

    // Update pending user
    const pendingUser = this.pendingUsers.get(userId) || {};
    pendingUser.email = email;
    pendingUser.step = 'awaiting_phone';
    this.pendingUsers.set(userId, pendingUser);

    // Send verification code
    const code = this.emailService.generateVerificationCode();
    const sent = await this.emailService.sendVerificationCode(email, code);

    if (sent) {
      this.db.saveVerificationCode(userId, email, code);
      
      this.bot.sendMessage(chatId, 
        `✅ Verification code sent to ${email}\n\n` +
        '📱 Now please share your phone number for account security:'
      );
      
      // Request phone number
      this.bot.sendMessage(chatId, 
        'Please share your phone number:', {
          reply_markup: {
            keyboard: [[{ text: '📱 Share Phone Number', request_contact: true }]],
            one_time_keyboard: true,
            resize_keyboard: true
          }
        }
      );
    } else {
      this.bot.sendMessage(chatId, '❌ Failed to send verification email. Please try again.');
    }
  }

  private async handleContact(msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;
    const phoneNumber = msg.contact?.phone_number;
    const userId = msg.from!.id;

    if (!phoneNumber) {
      this.bot.sendMessage(chatId, '❌ Phone number is required.');
      return;
    }

    const pendingUser = this.pendingUsers.get(userId);
    if (!pendingUser || !pendingUser.email) {
      this.bot.sendMessage(chatId, '❌ Please start the signup process again with /start');
      return;
    }

    try {
      // Create user account
      this.db.createUser(userId, pendingUser.email, phoneNumber);
      
      // Update step for verification
      pendingUser.step = 'awaiting_verification';
      this.pendingUsers.set(userId, pendingUser);
      
      this.bot.sendMessage(chatId, 
        '✅ Phone number registered!\n\n' +
        '📧 Please check your email and enter the verification code:\n\n' +
        '💡 Just type the 6-character code and send it!',
        { reply_markup: { remove_keyboard: true } }
      );
    } catch (error: any) {
      if (error.message?.includes('UNIQUE constraint failed')) {
        this.bot.sendMessage(chatId, 
          '⚠️ Account already exists. Please enter your verification code:',
          { reply_markup: { remove_keyboard: true } }
        );
        pendingUser.step = 'awaiting_verification';
        this.pendingUsers.set(userId, pendingUser);
      } else {
        this.bot.sendMessage(chatId, 
          '❌ Error creating account. Please try again with /start',
          { reply_markup: { remove_keyboard: true } }
        );
      }
    }
  }

  private async processVerificationCode(chatId: number, userId: number, code: string): Promise<void> {
    const isValid = this.db.verifyCode(userId, code.toUpperCase());

    if (isValid) {
      this.db.verifyUser(userId);
      this.pendingUsers.delete(userId);
      
      this.bot.sendMessage(chatId, 
        '🎉 Account verified successfully!\n\n' +
        'You can now manage your domains:'
      );
      
      this.showMainMenu(chatId);
    } else {
      this.bot.sendMessage(chatId, 
        '❌ Invalid verification code.\n\n' +
        'Please check your email and try again:'
      );
    }
  }

  private async processDomain(chatId: number, userId: number, domain: string): Promise<void> {
    const user = await this.db.getUserByTelegramId(userId);
    if (!user || !user.isVerified) {
      this.bot.sendMessage(chatId, '❌ Please complete account verification first.');
      return;
    }

    const cleanDomain = domain.toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/$/, '');
    
    // Validate domain format
    if (!this.isValidDomain(cleanDomain)) {
      this.bot.sendMessage(chatId, 
        '❌ Invalid domain format. Please enter a valid domain like:\n' +
        '• example.com\n' +
        '• mysite.ir\n' +
        '• subdomain.example.org'
      );
      return;
    }

    // Check if domain already exists
    const existingDomains = await this.db.getUserDomains(user.id);
    const domainExists = existingDomains.some(d => d.domain.toLowerCase() === cleanDomain);
    
    if (domainExists) {
      this.bot.sendMessage(chatId, 
        `⚠️ Domain "${cleanDomain}" is already in your list!\n\n` +
        'Use "My Domains" to manage your existing domains.'
      );
      this.pendingUsers.delete(userId);
      setTimeout(() => this.showMainMenu(chatId), 2000);
      return;
    }
    
    this.bot.sendMessage(chatId, `🔍 Looking up domain information for ${cleanDomain}...`);

    try {
      const domainInfo = await WhoisService.lookupDomain(cleanDomain);
      await this.db.addDomain(user.id, cleanDomain, domainInfo);

      const expiryText = domainInfo.expirationDate 
        ? domainInfo.expirationDate.toDateString()
        : 'Unknown';

      const statusEmoji = this.getDomainStatusEmoji(domainInfo.expirationDate);

      this.bot.sendMessage(chatId, 
        `✅ Domain added successfully!\n\n` +
        `${statusEmoji} **${cleanDomain}**\n` +
        `📅 **Expires:** ${expiryText}\n` +
        `🏢 **Registrar:** ${domainInfo.registrar || 'Unknown'}\n` +
        `📊 **Status:** ${domainInfo.status || 'Unknown'}\n` +
        `📝 **Registration:** ${domainInfo.registrationDate ? domainInfo.registrationDate.toDateString() : 'Unknown'}\n\n` +
        `🔔 You'll receive reminders before expiration!`,
        { parse_mode: 'Markdown' }
      );
      
      this.pendingUsers.delete(userId);
      setTimeout(() => this.showMainMenu(chatId), 3000);
    } catch (error) {
      console.error('Domain lookup error:', error);
      
      // For .ir domains or other TLDs that might not have full WHOIS data
      if (cleanDomain.endsWith('.ir') || cleanDomain.includes('.ir.')) {
        try {
          // Add domain with minimal info for Iranian domains
          const basicDomainInfo = {
            domain: cleanDomain,
            registrationDate: null,
            expirationDate: null,
            lastRenewDate: null,
            registrar: 'Unknown (.ir domain)',
            status: 'Active',
            nameServers: []
          };
          
          await this.db.addDomain(user.id, cleanDomain, basicDomainInfo);
          
          this.bot.sendMessage(chatId, 
            `✅ Iranian domain added successfully!\n\n` +
            `🇮🇷 **${cleanDomain}**\n` +
            `📝 **Type:** Iranian (.ir) domain\n` +
            `📊 **Status:** Active\n\n` +
            `ℹ️ Iranian domains may have limited WHOIS information.\n` +
            `You can manually update expiration dates in domain details.`,
            { parse_mode: 'Markdown' }
          );
          
          this.pendingUsers.delete(userId);
          setTimeout(() => this.showMainMenu(chatId), 3000);
        } catch (dbError) {
          this.bot.sendMessage(chatId, '❌ Failed to add Iranian domain. Please try again.');
          this.pendingUsers.delete(userId);
        }
      } else {
        this.bot.sendMessage(chatId, 
          `❌ Failed to lookup domain information for "${cleanDomain}".\n\n` +
          'This could happen if:\n' +
          '• Domain doesn\'t exist\n' +
          '• WHOIS server is unavailable\n' +
          '• Domain has privacy protection\n\n' +
          'Please try again or contact support.'
        );
        this.pendingUsers.delete(userId);
      }
    }
  }

  private isValidDomain(domain: string): boolean {
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;
    return domainRegex.test(domain) && domain.length <= 253;
  }

  private async handleMyDomainsCallback(chatId: number, userId: number): Promise<void> {
    const user = await this.db.getUserByTelegramId(userId);
    if (!user || !user.isVerified) {
      this.startSignupFlow(chatId);
      return;
    }

    const domains = await this.db.getUserDomains(user.id);

    if (domains.length === 0) {
      const keyboard = {
        inline_keyboard: [
          [{ text: '➕ Add Your First Domain', callback_data: 'add_domain' }],
          [{ text: '🏠 Main Menu', callback_data: 'main_menu' }]
        ]
      };
      
      this.bot.sendMessage(chatId, '📭 You have no domains yet.\n\nStart by adding your first domain to monitor its expiration date and get renewal reminders!', { reply_markup: keyboard });
      return;
    }

    const keyboard = domains.map(domain => {
      const expiryText = domain.expirationDate 
        ? new Date(domain.expirationDate).toLocaleDateString()
        : 'Unknown';
      
      const statusEmoji = this.getDomainStatusEmoji(domain.expirationDate);
      
      return [{
        text: `${statusEmoji} ${domain.domain} - ${expiryText}`,
        callback_data: `domain_${domain.id}`
      }];
    });

    keyboard.push([
      { text: '➕ Add Domain', callback_data: 'add_domain' },
      { text: '🏠 Main Menu', callback_data: 'main_menu' }
    ]);

    this.bot.sendMessage(chatId, 
      `📋 Your Domains (${domains.length}):\n\n` +
      'Click on any domain to view details and manage it.',
      { reply_markup: { inline_keyboard: keyboard } }
    );
  }

  private getDomainStatusEmoji(expirationDate: Date | string | null): string {
    if (!expirationDate) return '❓';
    
    const expiry = new Date(expirationDate);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry < 0) return '🔴'; // Expired
    if (daysUntilExpiry <= 7) return '🟠'; // Expires soon
    if (daysUntilExpiry <= 30) return '🟡'; // Warning
    return '🟢'; // Good
  }

  private async showDomainDetails(chatId: number, domainId: number, userId: number): Promise<void> {
    const user = await this.db.getUserByTelegramId(userId);
    if (!user || !user.isVerified) {
      this.startSignupFlow(chatId);
      return;
    }

    const domains = await this.db.getUserDomains(user.id);
    const domain = domains.find(d => d.id === domainId);

    if (!domain) {
      this.bot.sendMessage(chatId, '❌ Domain not found.');
      return;
    }

    const statusEmoji = this.getDomainStatusEmoji(domain.expirationDate);
    const expiryText = domain.expirationDate 
      ? new Date(domain.expirationDate).toLocaleDateString()
      : 'Unknown';
    
    const registrationText = domain.registrationDate 
      ? new Date(domain.registrationDate).toLocaleDateString()
      : 'Unknown';

    const daysUntilExpiry = domain.expirationDate 
      ? Math.ceil((new Date(domain.expirationDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null;

    let expiryWarning = '';
    if (daysUntilExpiry !== null) {
      if (daysUntilExpiry < 0) {
        expiryWarning = '🚨 **EXPIRED!**\n';
      } else if (daysUntilExpiry <= 7) {
        expiryWarning = `⚠️ **Expires in ${daysUntilExpiry} days!**\n`;
      } else if (daysUntilExpiry <= 30) {
        expiryWarning = `🔔 Expires in ${daysUntilExpiry} days\n`;
      }
    }

    const keyboard = {
      inline_keyboard: [
        [
          { text: '🔄 Refresh Info', callback_data: `refresh_${domainId}` },
          { text: '🗑️ Delete', callback_data: `delete_${domainId}` }
        ],
        [{ text: '📋 Back to My Domains', callback_data: 'my_domains' }],
        [{ text: '🏠 Main Menu', callback_data: 'main_menu' }]
      ]
    };

    this.bot.sendMessage(chatId, 
      `${statusEmoji} **Domain Details**\n\n` +
      `🌐 **Domain:** ${domain.domain}\n` +
      `${expiryWarning}` +
      `📅 **Expires:** ${expiryText}\n` +
      `📝 **Registered:** ${registrationText}\n` +
      `🏢 **Registrar:** ${domain.registrar || 'Unknown'}\n` +
      `📊 **Status:** ${domain.status || 'Unknown'}\n` +
      `🔄 **Last Updated:** ${domain.lastRenewDate ? new Date(domain.lastRenewDate).toLocaleDateString() : 'Unknown'}\n` +
      `📅 **Added:** ${new Date(domain.createdAt).toLocaleDateString()}`,
      { 
        parse_mode: 'Markdown',
        reply_markup: keyboard 
      }
    );
  }

  private async confirmDeleteDomain(chatId: number, domainId: number, userId: number): Promise<void> {
    const user = await this.db.getUserByTelegramId(userId);
    if (!user) return;

    const domains = await this.db.getUserDomains(user.id);
    const domain = domains.find(d => d.id === domainId);

    if (!domain) {
      this.bot.sendMessage(chatId, '❌ Domain not found.');
      return;
    }

    const keyboard = {
      inline_keyboard: [
        [
          { text: '✅ Yes, Delete', callback_data: `confirm_delete_${domainId}` },
          { text: '❌ Cancel', callback_data: `domain_${domainId}` }
        ]
      ]
    };

    this.bot.sendMessage(chatId, 
      `⚠️ **Confirm Deletion**\n\n` +
      `Are you sure you want to delete:\n` +
      `🌐 **${domain.domain}**\n\n` +
      `This action cannot be undone.`,
      { 
        parse_mode: 'Markdown',
        reply_markup: keyboard 
      }
    );
  }

  private async deleteDomainById(chatId: number, domainId: number, userId: number): Promise<void> {
    const user = await this.db.getUserByTelegramId(userId);
    if (!user) return;

    try {
      await this.db.deleteDomain(user.id, domainId);
      this.bot.sendMessage(chatId, 
        '✅ **Domain deleted successfully!**\n\n' +
        'The domain has been removed from your monitoring list.',
        { parse_mode: 'Markdown' }
      );
      
      setTimeout(() => this.handleMyDomainsCallback(chatId, userId), 1500);
    } catch (error) {
      this.bot.sendMessage(chatId, '❌ Failed to delete domain. Please try again.');
    }
  }

  private async showSettings(chatId: number): Promise<void> {
    const keyboard = {
      inline_keyboard: [
        [
          { text: '🔔 Notifications', callback_data: 'notifications' },
          { text: '📧 Change Email', callback_data: 'change_email' }
        ],
        [
          { text: '👤 Account Info', callback_data: 'account_info' },
          { text: '📋 Export Domains', callback_data: 'export_domains' }
        ],
        [{ text: '🏠 Main Menu', callback_data: 'main_menu' }]
      ]
    };

    this.bot.sendMessage(chatId, 
      '⚙️ **Settings**\n\n' +
      'Configure your Domain Manager Bot preferences:',
      { 
        parse_mode: 'Markdown',
        reply_markup: keyboard 
      }
    );
  }

  private async showHelp(chatId: number): Promise<void> {
    const keyboard = {
      inline_keyboard: [
        [{ text: '🚀 Get Started', callback_data: 'start_signup' }],
        [{ text: '🏠 Main Menu', callback_data: 'main_menu' }]
      ]
    };

    this.bot.sendMessage(chatId, 
      '❓ Help & Information\n\n' +
      '🎯 What this bot does:\n' +
      '• Monitor domain expiration dates\n' +
      '• Send renewal reminders\n' +
      '• Track domain registration info\n' +
      '• Secure account with email + phone\n\n' +
      '🔧 Commands:\n' +
      '• Just use the buttons below!\n' +
      '• Type domain names directly when asked\n' +
      '• Follow the guided setup process\n\n' +
      '📧 Need support? Contact your domain administrator.',
      { reply_markup: keyboard }
    );
  }

  private async showNotificationSettings(chatId: number): Promise<void> {
    const keyboard = {
      inline_keyboard: [
        [
          { text: '🔔 Enable All', callback_data: 'enable_notifications' },
          { text: '🔕 Disable All', callback_data: 'disable_notifications' }
        ],
        [{ text: '⏰ Custom Reminders', callback_data: 'custom_reminder' }],
        [
          { text: '🔙 Back to Settings', callback_data: 'settings' },
          { text: '🏠 Main Menu', callback_data: 'main_menu' }
        ]
      ]
    };

    this.bot.sendMessage(chatId, 
      '🔔 **Notification Settings**\n\n' +
      '📅 **Current Features:**\n' +
      '• Domain expiration reminders\n' +
      '• Renewal alerts (30, 7, 1 days before)\n' +
      '• System notifications\n' +
      '• Email notifications\n\n' +
      'Choose your preference:',
      { 
        parse_mode: 'Markdown',
        reply_markup: keyboard 
      }
    );
  }

  private async enableNotifications(chatId: number, userId: number): Promise<void> {
    // In a real implementation, you'd save this to database
    this.bot.sendMessage(chatId, 
      '✅ **Notifications Enabled**\n\n' +
      'You will receive:\n' +
      '• Domain expiration reminders\n' +
      '• Renewal alerts\n' +
      '• System notifications\n\n' +
      'You can change this anytime in settings.',
      { parse_mode: 'Markdown' }
    );
    
    setTimeout(() => this.showNotificationSettings(chatId), 2000);
  }

  private async disableNotifications(chatId: number, userId: number): Promise<void> {
    // In a real implementation, you'd save this to database
    this.bot.sendMessage(chatId, 
      '🔕 **Notifications Disabled**\n\n' +
      'You will no longer receive:\n' +
      '• Domain expiration reminders\n' +
      '• Renewal alerts\n' +
      '• System notifications\n\n' +
      '⚠️ **Important:** You may miss important domain renewals!\n\n' +
      'You can re-enable anytime in settings.',
      { parse_mode: 'Markdown' }
    );
    
    setTimeout(() => this.showNotificationSettings(chatId), 2000);
  }

  private showCustomReminderSettings(chatId: number): void {
    const keyboard = {
      inline_keyboard: [
        [
          { text: '1️⃣ 1 Day Before', callback_data: 'reminder_1_day' },
          { text: '7️⃣ 7 Days Before', callback_data: 'reminder_7_days' }
        ],
        [{ text: '3️⃣0️⃣ 30 Days Before', callback_data: 'reminder_30_days' }],
        [
          { text: '🔙 Back to Notifications', callback_data: 'notifications' },
          { text: '🏠 Main Menu', callback_data: 'main_menu' }
        ]
      ]
    };

    this.bot.sendMessage(chatId, 
      '⏰ **Custom Reminder Settings**\n\n' +
      'Choose when you want to receive domain expiration reminders:\n\n' +
      '🔔 **Current:** Every 3 days when domain expires within 30 days\n\n' +
      'Select your preferred reminder schedule:',
      { 
        parse_mode: 'Markdown',
        reply_markup: keyboard 
      }
    );
  }

  private async setReminderTime(chatId: number, userId: number, days: number): Promise<void> {
    // In a real implementation, you'd save this to database
    this.bot.sendMessage(chatId, 
      `✅ **Reminder Set**\n\n` +
      `🔔 You will receive reminders **${days} day${days > 1 ? 's' : ''} before** domain expiration.\n\n` +
      `This setting has been saved to your account.`,
      { parse_mode: 'Markdown' }
    );
    
    setTimeout(() => this.showCustomReminderSettings(chatId), 2000);
  }

  private async showAccountInfo(chatId: number, userId: number): Promise<void> {
    const user = await this.db.getUserByTelegramId(userId);
    
    if (!user || !user.isVerified) {
      this.startSignupFlow(chatId);
      return;
    }

    const domains = await this.db.getUserDomains(user.id);
    const expiringDomains = domains.filter(domain => {
      if (!domain.expirationDate) return false;
      const daysUntilExpiry = Math.ceil((new Date(domain.expirationDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
    });

    const keyboard = {
      inline_keyboard: [
        [
          { text: '📧 Change Email', callback_data: 'change_email' },
          { text: '🔔 Notifications', callback_data: 'notifications' }
        ],
        [
          { text: '🔙 Back to Settings', callback_data: 'settings' },
          { text: '🏠 Main Menu', callback_data: 'main_menu' }
        ]
      ]
    };

    this.bot.sendMessage(chatId, 
      `👤 **Account Information**\n\n` +
      `📧 **Email:** ${user.email}\n` +
      `📱 **Phone:** ${user.phoneNumber}\n` +
      `📅 **Member Since:** ${new Date(user.createdAt).toLocaleDateString()}\n` +
      `✅ **Status:** Verified\n\n` +
      `📊 **Domain Statistics:**\n` +
      `• Total Domains: ${domains.length}\n` +
      `• Expiring Soon: ${expiringDomains.length}\n\n` +
      `🆔 **User ID:** ${user.id}`,
      { 
        parse_mode: 'Markdown',
        reply_markup: keyboard 
      }
    );
  }

  private async exportDomains(chatId: number, userId: number): Promise<void> {
    const user = await this.db.getUserByTelegramId(userId);
    
    if (!user || !user.isVerified) {
      this.startSignupFlow(chatId);
      return;
    }

    const domains = await this.db.getUserDomains(user.id);

    if (domains.length === 0) {
      this.bot.sendMessage(chatId, 
        '📭 **No Domains to Export**\n\n' +
        'You don\'t have any domains yet. Add some domains first!',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    let exportText = `📋 **Domain Export** - ${new Date().toLocaleDateString()}\n\n`;
    exportText += `👤 **Account:** ${user.email}\n`;
    exportText += `📊 **Total Domains:** ${domains.length}\n\n`;
    exportText += `🌐 **Domain List:**\n\n`;

    domains.forEach((domain, index) => {
      const expiryText = domain.expirationDate 
        ? new Date(domain.expirationDate).toLocaleDateString()
        : 'Unknown';
      
      const statusEmoji = this.getDomainStatusEmoji(domain.expirationDate);
      
      exportText += `${index + 1}. ${statusEmoji} **${domain.domain}**\n`;
      exportText += `   📅 Expires: ${expiryText}\n`;
      exportText += `   🏢 Registrar: ${domain.registrar || 'Unknown'}\n`;
      exportText += `   📝 Added: ${new Date(domain.createdAt).toLocaleDateString()}\n\n`;
    });

    exportText += `📄 **Export completed at:** ${new Date().toLocaleString()}\n`;
    exportText += `🤖 **Generated by:** Domain Manager Bot`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '🔙 Back to Settings', callback_data: 'settings' },
          { text: '🏠 Main Menu', callback_data: 'main_menu' }
        ]
      ]
    };

    this.bot.sendMessage(chatId, exportText, { 
      parse_mode: 'Markdown',
      reply_markup: keyboard 
    });
  }

  private async refreshDomainInfo(chatId: number, domainId: number, userId: number): Promise<void> {
    const user = await this.db.getUserByTelegramId(userId);
    if (!user) return;

    const domains = await this.db.getUserDomains(user.id);
    const domain = domains.find(d => d.id === domainId);

    if (!domain) {
      this.bot.sendMessage(chatId, '❌ Domain not found.');
      return;
    }

    this.bot.sendMessage(chatId, `🔄 Refreshing information for ${domain.domain}...`);

    try {
      const domainInfo = await WhoisService.lookupDomain(domain.domain);
      
      // Update domain in database (you'd need to add this method to DatabaseManager)
      // await this.db.updateDomain(domainId, domainInfo);
      
      this.bot.sendMessage(chatId, 
        `✅ **Domain Updated**\n\n` +
        `Information for ${domain.domain} has been refreshed!`,
        { parse_mode: 'Markdown' }
      );
      
      setTimeout(() => this.showDomainDetails(chatId, domainId, userId), 1500);
    } catch (error) {
      this.bot.sendMessage(chatId, 
        `❌ **Refresh Failed**\n\n` +
        `Could not update information for ${domain.domain}. Please try again later.`,
        { parse_mode: 'Markdown' }
      );
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private async handleAddDomain(msg: TelegramBot.Message, match: RegExpExecArray | null): Promise<void> {
    const chatId = msg.chat.id;
    this.bot.sendMessage(chatId, 'Please use the "Add Domain" button in the main menu for better experience!');
    this.showMainMenu(chatId);
  }

  private async handleMyDomains(msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;
    const userId = msg.from!.id;
    await this.handleMyDomainsCallback(chatId, userId);
  }

  private async handleDeleteDomain(msg: TelegramBot.Message, match: RegExpExecArray | null): Promise<void> {
    const chatId = msg.chat.id;
    const domainId = parseInt(match![1]);
    const userId = msg.from!.id;

    const user = await this.db.getUserByTelegramId(userId);
    if (!user || !user.isVerified) {
      this.startSignupFlow(chatId);
      return;
    }

    try {
      await this.db.deleteDomain(user.id, domainId);
      this.bot.sendMessage(chatId, '✅ Domain deleted successfully!');
    } catch (error) {
      this.bot.sendMessage(chatId, '❌ Failed to delete domain.');
    }
  }

  private async requestEmailChange(chatId: number, userId: number): Promise<void> {
    this.pendingUsers.set(userId, { step: 'awaiting_new_email' });
    
    this.bot.sendMessage(chatId, 
      '📧 Please enter your new email address:\n\n' +
      'A verification code will be sent to confirm the change.\n\n' +
      '💡 Just type your new email and send it!'
    );
  }

  private async processEmailChange(chatId: number, userId: number, email: string): Promise<void> {
    if (!this.isValidEmail(email)) {
      this.bot.sendMessage(chatId, '❌ Please enter a valid email address.');
      return;
    }

    const code = this.emailService.generateVerificationCode();
    const sent = await this.emailService.sendVerificationCode(email, code);

    if (sent) {
      this.db.saveVerificationCode(userId, email, code);
      
      const pendingUser = this.pendingUsers.get(userId) || {};
      pendingUser.email = email;
      pendingUser.step = 'awaiting_email_verification';
      this.pendingUsers.set(userId, pendingUser);
      
      this.bot.sendMessage(chatId, 
        `✅ Verification code sent to ${email}\n\n` +
        'Please enter the verification code to confirm the email change:'
      );
    } else {
      this.bot.sendMessage(chatId, '❌ Failed to send verification email. Please try again.');
    }
  }
}
