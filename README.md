# 🌐 Domain Manager Telegram Bot

A comprehensive Telegram bot for domain management, expiration monitoring, and renewal reminders.

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Telegram](https://img.shields.io/badge/Telegram-2CA5E0?style=for-the-badge&logo=telegram&logoColor=white)

## ✨ Features

- 📧 **Email Verification** - Secure account creation with EmailJS integration
- 📱 **Phone Number Integration** - Two-factor authentication for enhanced security
- 🌐 **Domain Management** - Add, view, edit, and delete domains with ease
- 📅 **Expiration Monitoring** - Real-time tracking of domain expiration dates
- 🔔 **Smart Reminders** - Automated renewal notifications (1, 7, 30 days before expiration)
- 🇮🇷 **Iranian Domain Support** - Special handling for .ir domains with limited WHOIS data
- 📊 **Domain Analytics** - Detailed domain information via WHOIS lookup
- ⚙️ **Settings Management** - Customizable notifications, email changes, and preferences
- 🐳 **Docker Ready** - Production-ready containerized deployment
- 💾 **Data Persistence** - SQLite database with automatic backups
- 🔒 **Secure** - Environment-based configuration with no hardcoded secrets

## 🚀 Quick Start with Docker (Recommended)

### Prerequisites

- Docker installed on your system
- Telegram Bot Token (from @BotFather)
- EmailJS account (free tier available)
- Basic knowledge of environment variables

### Step 1: Get Required API Keys

#### Telegram Bot Setup
```bash
# 1. Open Telegram and search for @BotFather
# 2. Send: /start
# 3. Send: /newbot
# 4. Choose a name: "Domain Manager Bot"
# 5. Choose a username: "your_domain_bot"
# 6. Copy the token (format: 123456789:ABCdefGHIjklMNOpqrsTUVwxyz)
```

#### EmailJS Setup
```bash
# 1. Go to https://www.emailjs.com/ and create a free account
# 2. Add Email Service:
#    - Click "Email Services" → "Add New Service"
#    - Choose your provider (Gmail recommended)
#    - Follow the setup instructions
#    - Note the Service ID (e.g., service_xxxxxxx)
#
# 3. Create Email Template:
#    - Click "Email Templates" → "Create New Template"
#    - Use this template content:
#
#    Subject: {{subject}}
#    
#    Hello {{name}},
#    
#    {{message}}
#    
#    Your verification code is: {{code}}
#    
#    Best regards,
#    Domain Manager Bot
#
#    - Note the Template ID (e.g., template_xxxxxxx)
#
# 4. Get API Keys:
#    - Go to "Account" → "General"
#    - Copy Public Key and Private Key
```

### Step 2: Quick Deployment

#### Option A: One-Command Deployment
```bash
# Pull and run in one command
docker run -d \
  --name domain-bot \
  -e TELEGRAM_BOT_TOKEN=YOUR_BOT_TOKEN \
  -e EMAILJS_SERVICE_ID=YOUR_SERVICE_ID \
  -e EMAILJS_TEMPLATE_ID=YOUR_TEMPLATE_ID \
  -e EMAILJS_PUBLIC_KEY=YOUR_PUBLIC_KEY \
  -e EMAILJS_PRIVATE_KEY=YOUR_PRIVATE_KEY \
  -e DATABASE_PATH=/app/data/database.sqlite \
  -v $(pwd)/data:/app/data \
  --restart unless-stopped \
  taksa1990/domain-manager-bot:latest
```

#### Option B: Using Environment File (Recommended)
```bash
# Create environment file
cat > .env.production << 'EOF'
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
EMAILJS_SERVICE_ID=your_service_id_here
EMAILJS_TEMPLATE_ID=your_template_id_here
EMAILJS_PUBLIC_KEY=your_public_key_here
EMAILJS_PRIVATE_KEY=your_private_key_here
DATABASE_PATH=/app/data/database.sqlite
NODE_ENV=production
EOF

# Edit the file with your actual values
nano .env.production

# Run the container
docker run -d \
  --name domain-bot \
  --env-file .env.production \
  -v $(pwd)/data:/app/data \
  --restart unless-stopped \
  taksa1990/domain-manager-bot:latest
```

#### Option C: Using Docker Compose
```bash
# Download docker-compose file
curl -o docker-compose.yml https://raw.githubusercontent.com/tayden1990/domain-manager-bot/main/docker-compose.yml

# Create environment file
cp .env.example .env.production
nano .env.production  # Edit with your values

# Deploy
docker-compose up -d
```

### Step 3: Verify Deployment

```bash
# Check if container is running
docker ps

# View startup logs
docker logs domain-bot

# You should see: "🤖 Domain Manager Bot started successfully!"

# Follow logs in real-time
docker logs -f domain-bot
```

## 📊 Environment Variables Reference

### Required Variables

| Variable | Description | Example | How to Get |
|----------|-------------|---------|------------|
| `TELEGRAM_BOT_TOKEN` | Your Telegram bot token | `123456789:ABCdef...` | Message @BotFather → /newbot |
| `EMAILJS_SERVICE_ID` | EmailJS service identifier | `service_abc123` | EmailJS Dashboard → Email Services |
| `EMAILJS_TEMPLATE_ID` | EmailJS template identifier | `template_xyz789` | EmailJS Dashboard → Email Templates |
| `EMAILJS_PUBLIC_KEY` | EmailJS public API key | `abcDEF123` | EmailJS Dashboard → Account → General |
| `EMAILJS_PRIVATE_KEY` | EmailJS private API key | `xyz789ABC` | EmailJS Dashboard → Account → General |

### Optional Variables

| Variable | Description | Default | Options |
|----------|-------------|---------|---------|
| `DATABASE_PATH` | SQLite database file path | `/app/data/database.sqlite` | Any valid path |
| `NODE_ENV` | Node.js environment | `production` | `development`, `production` |

## 🔧 Container Management

### Daily Operations

```bash
# Start/Stop/Restart
docker start domain-bot
docker stop domain-bot
docker restart domain-bot

# View logs (last 100 lines)
docker logs --tail 100 domain-bot

# Follow logs in real-time
docker logs -f domain-bot

# Check resource usage
docker stats domain-bot

# Enter container for debugging
docker exec -it domain-bot sh
```

### Updates and Maintenance

```bash
# Update to latest version
docker pull taksa1990/domain-manager-bot:latest
docker stop domain-bot
docker rm domain-bot
docker run -d --name domain-bot --env-file .env.production -v $(pwd)/data:/app/data --restart unless-stopped taksa1990/domain-manager-bot:latest

# Backup database
docker cp domain-bot:/app/data/database.sqlite ./backup-$(date +%Y%m%d).sqlite

# View database info
docker exec domain-bot sqlite3 /app/data/database.sqlite ".tables"
docker exec domain-bot sqlite3 /app/data/database.sqlite "SELECT COUNT(*) as total_users FROM users;"
```

### Health Checks

```bash
# Check container health
docker inspect domain-bot | grep -A 5 '"Health"'

# Manual health check
docker exec domain-bot node -e "console.log('Bot is healthy')"

# Check if bot responds
curl -s https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getMe
```

## 🤖 Bot Usage Guide

### For End Users

#### First Time Setup
1. **Start the bot**: Find your bot on Telegram and send `/start`
2. **Welcome screen**: Click "🚀 Get Started"
3. **Email verification**: 
   - Enter your email address
   - Check your email for verification code
   - Enter the 6-digit code
4. **Phone verification**: Click "📱 Share Phone Number"
5. **Ready to use**: Access the main menu

#### Managing Domains
```
🌐 My Domains → View all your domains with expiration status
➕ Add Domain → Enter domain name (e.g., example.com)
⚙️ Settings → Configure notifications and account settings
```

#### Domain Status Colors
- 🟢 **Green**: Expires in 30+ days (Safe)
- 🟡 **Yellow**: Expires in 7-30 days (Warning)
- 🟠 **Orange**: Expires in 1-7 days (Critical)
- 🔴 **Red**: Already expired (Action required)

### For Administrators

#### User Management
```bash
# View total users
docker exec domain-bot sqlite3 /app/data/database.sqlite "SELECT COUNT(*) FROM users WHERE isVerified=1;"

# View recent signups
docker exec domain-bot sqlite3 /app/data/database.sqlite "SELECT email, createdAt FROM users ORDER BY createdAt DESC LIMIT 10;"

# View domain statistics
docker exec domain-bot sqlite3 /app/data/database.sqlite "SELECT COUNT(*) as total_domains FROM domains;"
```

#### Monitoring
```bash
# Monitor bot activity
docker logs -f domain-bot | grep -E "(started|error|verification|domain)"

# Check email service status
docker logs domain-bot | grep EmailJS

# Monitor database size
docker exec domain-bot du -h /app/data/database.sqlite
```

## 🚀 Production Deployment

### Server Requirements

- **CPU**: 1 vCPU minimum (2 vCPU recommended)
- **RAM**: 512 MB minimum (1 GB recommended)
- **Storage**: 5 GB minimum (includes Docker images and database)
- **Network**: Outbound HTTPS access for Telegram API and EmailJS

### Production Setup

#### Using Docker Compose (Recommended)
```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  domain-manager-bot:
    image: taksa1990/domain-manager-bot:latest
    container_name: domain-manager-bot-prod
    restart: unless-stopped
    env_file:
      - .env.production
    volumes:
      - /var/lib/domain-bot/data:/app/data
    networks:
      - domain-bot-network
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
    healthcheck:
      test: ["CMD", "node", "-e", "console.log('Health check')"]
      interval: 30s
      timeout: 10s
      retries: 3

networks:
  domain-bot-network:
    driver: bridge
```

#### Systemd Service
```bash
# Create service file
sudo tee /etc/systemd/system/domain-manager-bot.service << 'EOF'
[Unit]
Description=Domain Manager Telegram Bot
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/domain-manager-bot
ExecStart=/usr/bin/docker-compose -f docker-compose.prod.yml up -d
ExecStop=/usr/bin/docker-compose -f docker-compose.prod.yml down
ExecReload=/usr/bin/docker-compose -f docker-compose.prod.yml restart
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

# Enable and start
sudo systemctl enable domain-manager-bot
sudo systemctl start domain-manager-bot
sudo systemctl status domain-manager-bot
```

#### Nginx Reverse Proxy (Optional)
```nginx
# /etc/nginx/sites-available/domain-bot-monitoring
server {
    listen 80;
    server_name your-domain.com;
    
    location /bot-health {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Backup Strategy

#### Automated Daily Backups
```bash
# Create backup script
cat > /opt/domain-manager-bot/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/domain-manager-bot/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup database
docker cp domain-manager-bot-prod:/app/data/database.sqlite \
  $BACKUP_DIR/database_$DATE.sqlite

# Keep only last 7 days
find $BACKUP_DIR -name "database_*.sqlite" -mtime +7 -delete

echo "Backup completed: database_$DATE.sqlite"
EOF

chmod +x /opt/domain-manager-bot/backup.sh

# Add to crontab
echo "0 2 * * * /opt/domain-manager-bot/backup.sh" | sudo crontab -
```

## 🔍 Troubleshooting

### Common Issues and Solutions

#### Bot Not Starting
```bash
# Check environment variables
docker exec domain-bot env | grep -E "TELEGRAM|EMAILJS"

# Verify bot token
curl -s "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getMe"

# Check logs for specific errors
docker logs domain-bot | grep -i error
```

#### Email Verification Not Working
```bash
# Test EmailJS configuration
docker logs domain-bot | grep -i "emailjs\|verification"

# Check if template variables match
# Template should include: {{email}}, {{code}}, {{name}}, {{subject}}
```

#### Database Issues
```bash
# Check database permissions
docker exec domain-bot ls -la /app/data/

# Verify database integrity
docker exec domain-bot sqlite3 /app/data/database.sqlite "PRAGMA integrity_check;"

# Reset database (WARNING: Deletes all data)
docker stop domain-bot
docker exec domain-bot rm /app/data/database.sqlite
docker start domain-bot
```

#### Performance Issues
```bash
# Monitor resource usage
docker stats domain-bot

# Check for memory leaks
docker exec domain-bot ps aux

# View detailed container info
docker inspect domain-bot
```

### Error Codes Reference

| Error | Cause | Solution |
|-------|-------|----------|
| `Missing required environment variable: TELEGRAM_BOT_TOKEN` | Bot token not set | Add token to environment file |
| `EmailJS 403 error` | Invalid EmailJS credentials | Verify public/private keys |
| `EmailJS 422 error` | Template parameter mismatch | Check template variables |
| `WHOIS lookup failed` | Domain doesn't exist or WHOIS blocked | Normal for some domains |
| `Database locked` | Multiple access attempts | Restart container |

## 📈 Performance and Scaling

### Single Instance Limits
- **Users**: ~1,000 concurrent users
- **Domains**: ~10,000 domains total
- **Requests**: ~100 requests/minute

### Scaling Options
```bash
# Horizontal scaling with load balancer
docker run -d --name domain-bot-1 --env-file .env.production taksa1990/domain-manager-bot:latest
docker run -d --name domain-bot-2 --env-file .env.production taksa1990/domain-manager-bot:latest

# Database optimization
docker exec domain-bot sqlite3 /app/data/database.sqlite "VACUUM; ANALYZE;"
```

## 🔐 Security Best Practices

### Environment Security
```bash
# Secure environment file permissions
chmod 600 .env.production

# Use Docker secrets (Docker Swarm)
echo "your_bot_token" | docker secret create bot_token -
```

### Container Security
```bash
# Run with non-root user (already configured)
docker exec domain-bot whoami  # Should show 'botuser'

# Limit container resources
docker update --memory=512m --cpus="0.5" domain-bot
```

### Network Security
```bash
# Restrict network access (if needed)
docker network create --internal domain-bot-internal
docker run --network domain-bot-internal taksa1990/domain-manager-bot:latest
```

## 🔗 Useful Links

- **Docker Hub**: https://hub.docker.com/r/taksa1990/domain-manager-bot
- **GitHub Repository**: https://github.com/tayden1990/domain-manager-bot
- **Issues & Bug Reports**: https://github.com/tayden1990/domain-manager-bot/issues
- **EmailJS Documentation**: https://www.emailjs.com/docs/
- **Telegram Bot API**: https://core.telegram.org/bots/api
- **Docker Documentation**: https://docs.docker.com/

## 📞 Support

### Getting Help
1. **Check this README** - Most common issues are covered here
2. **Check existing issues** - Someone might have faced the same problem
3. **Create a new issue** - Provide logs and environment details
4. **Docker Hub comments** - For deployment-specific questions

### Providing Support Information
When reporting issues, please include:
```bash
# System information
docker --version
docker info

# Container logs
docker logs --tail 50 domain-bot

# Container status
docker inspect domain-bot | grep -A 10 "State"

# Environment check (without secrets)
docker exec domain-bot env | grep -v -E "TOKEN|KEY"
```

---

**Made with ❤️ for domain management automation**

*Star ⭐ this project on GitHub if you find it useful!*
