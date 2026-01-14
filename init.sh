#!/bin/bash
#
# Portal28 Academy - Development Environment Startup Script
# This script initializes all required services for autonomous development
#

set -e  # Exit on any error

# Color codes for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}  Portal28 Academy - Development Setup${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# Function to check if a port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Function to kill process on port
kill_port() {
    local port=$1
    local pids=$(lsof -ti :$port 2>/dev/null)
    if [ ! -z "$pids" ]; then
        echo -e "${YELLOW}Killing process on port $port (PIDs: $pids)${NC}"
        kill -9 $pids 2>/dev/null || true
        sleep 1
    fi
}

# Step 1: Kill existing processes on required ports
echo -e "${YELLOW}[1/6] Checking for conflicting processes...${NC}"
if check_port 2828; then
    echo "  → Port 2828 (Next.js) is in use"
    kill_port 2828
fi
if check_port 28323; then
    echo "  → Supabase Studio already running on port 28323"
else
    echo "  ✓ Ports available"
fi
echo ""

# Step 2: Check Docker is running
echo -e "${YELLOW}[2/6] Checking Docker...${NC}"
if ! docker info >/dev/null 2>&1; then
    echo -e "${RED}ERROR: Docker is not running!${NC}"
    echo "Please start Docker Desktop and run this script again."
    exit 1
fi
echo "  ✓ Docker is running"
echo ""

# Step 3: Check if Supabase is already running
echo -e "${YELLOW}[3/6] Starting Supabase...${NC}"
if check_port 28321; then
    echo "  ℹ Supabase already running"
else
    echo "  → Starting Supabase containers..."
    npm run db:start > /dev/null 2>&1 &

    # Wait for Supabase to be ready
    echo -n "  → Waiting for Supabase API"
    for i in {1..30}; do
        if check_port 28321; then
            echo -e " ${GREEN}✓${NC}"
            break
        fi
        echo -n "."
        sleep 2
    done

    if ! check_port 28321; then
        echo -e "${RED}✗${NC}"
        echo -e "${RED}ERROR: Supabase failed to start${NC}"
        exit 1
    fi
fi
echo ""

# Step 4: Start Next.js dev server
echo -e "${YELLOW}[4/6] Starting Next.js server...${NC}"
npm run dev > /dev/null 2>&1 &
DEV_SERVER_PID=$!

# Wait for Next.js to be ready
echo -n "  → Waiting for Next.js"
for i in {1..30}; do
    if check_port 2828; then
        echo -e " ${GREEN}✓${NC}"
        break
    fi
    echo -n "."
    sleep 2
done

if ! check_port 2828; then
    echo -e "${RED}✗${NC}"
    echo -e "${RED}ERROR: Next.js failed to start${NC}"
    exit 1
fi
echo ""

# Step 5: Health check
echo -e "${YELLOW}[5/6] Running health checks...${NC}"

# Check Supabase API
if curl -s http://127.0.0.1:28321/rest/v1/ > /dev/null 2>&1; then
    echo -e "  ${GREEN}✓${NC} Supabase API (http://127.0.0.1:28321)"
else
    echo -e "  ${RED}✗${NC} Supabase API (http://127.0.0.1:28321)"
fi

# Check Supabase Studio
if check_port 28323; then
    echo -e "  ${GREEN}✓${NC} Supabase Studio (http://localhost:28323)"
else
    echo -e "  ${YELLOW}⚠${NC} Supabase Studio (http://localhost:28323)"
fi

# Check Inbucket (Email)
if check_port 28324; then
    echo -e "  ${GREEN}✓${NC} Inbucket Email (http://localhost:28324)"
else
    echo -e "  ${YELLOW}⚠${NC} Inbucket Email (http://localhost:28324)"
fi

# Check Next.js app
if curl -s http://localhost:2828 > /dev/null 2>&1; then
    echo -e "  ${GREEN}✓${NC} Next.js App (http://localhost:2828)"
else
    echo -e "  ${RED}✗${NC} Next.js App (http://localhost:2828)"
fi
echo ""

# Step 6: Summary
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}  ✓ Development Environment Ready!${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo -e "Available services:"
echo -e "  ${BLUE}→ App:${NC}             http://localhost:2828"
echo -e "  ${BLUE}→ Supabase Studio:${NC} http://localhost:28323"
echo -e "  ${BLUE}→ Email Inbox:${NC}     http://localhost:28324"
echo ""
echo -e "Useful commands:"
echo -e "  ${BLUE}→ Run tests:${NC}       npm run test"
echo -e "  ${BLUE}→ Run E2E:${NC}         npm run test:e2e"
echo -e "  ${BLUE}→ DB Studio:${NC}       npm run db:studio"
echo -e "  ${BLUE}→ DB Reset:${NC}        npm run db:reset"
echo ""
echo -e "${YELLOW}Note:${NC} Press Ctrl+C to stop the dev server"
echo -e "${YELLOW}Note:${NC} Run 'npm run db:stop' to stop Supabase"
echo ""

# Keep script running (wait for dev server)
wait $DEV_SERVER_PID
