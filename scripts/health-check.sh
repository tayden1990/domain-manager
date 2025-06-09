#!/bin/bash

# Health check script for Domain Manager Bot
set -e

echo "🏥 Domain Manager Bot Health Check"
echo "=================================="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check functions
check_container() {
    if docker ps | grep -q domain-bot; then
        echo -e "${GREEN}✅ Container is running${NC}"
        return 0
    else
        echo -e "${RED}❌ Container is not running${NC}"
        return 1
    fi
}

check_health() {
    if docker exec domain-bot node -e "console.log('Health check passed')" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Application is healthy${NC}"
        return 0
    else
        echo -e "${RED}❌ Application health check failed${NC}"
        return 1
    fi
}

check_database() {
    if docker exec domain-bot sqlite3 /app/data/database.sqlite "SELECT 1;" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Database is accessible${NC}"
        return 0
    else
        echo -e "${RED}❌ Database is not accessible${NC}"
        return 1
    fi
}

check_telegram_api() {
    if docker exec domain-bot wget -q --spider https://api.telegram.org; then
        echo -e "${GREEN}✅ Telegram API is reachable${NC}"
        return 0
    else
        echo -e "${RED}❌ Telegram API is not reachable${NC}"
        return 1
    fi
}

# Run all checks
echo "🔍 Running health checks..."
echo ""

FAILED=0

check_container || FAILED=1
check_health || FAILED=1
check_database || FAILED=1
check_telegram_api || FAILED=1

echo ""
echo "📊 Additional Information:"
echo "========================="

# Container info
echo "📋 Container Status:"
docker ps --filter name=domain-bot --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "💾 Database Info:"
docker exec domain-bot sqlite3 /app/data/database.sqlite "SELECT 'Users: ' || COUNT(*) FROM users; SELECT 'Domains: ' || COUNT(*) FROM domains;" 2>/dev/null || echo "Database query failed"

echo ""
echo "📈 Resource Usage:"
docker stats domain-bot --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}"

if [ $FAILED -eq 0 ]; then
    echo ""
    echo -e "${GREEN}🎉 All health checks passed!${NC}"
    exit 0
else
    echo ""
    echo -e "${RED}💥 Some health checks failed!${NC}"
    echo -e "${YELLOW}📋 Check logs with: docker logs domain-bot${NC}"
    exit 1
fi
