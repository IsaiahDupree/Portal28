#!/bin/bash

# Portal28 Academy - Port Manager
# Handles port conflicts, kill/restart, and robustness checks

PORT="${1:-2828}"
ACTION="${2:-check}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get process using the port
get_pid_on_port() {
    lsof -ti:$PORT 2>/dev/null
}

# Check if port is in use
check_port() {
    local pid=$(get_pid_on_port)
    if [ -n "$pid" ]; then
        local process_name=$(ps -p $pid -o comm= 2>/dev/null)
        echo -e "${YELLOW}⚠ Port $PORT is in use by PID $pid ($process_name)${NC}"
        return 1
    else
        echo -e "${GREEN}✓ Port $PORT is available${NC}"
        return 0
    fi
}

# Kill process on port
kill_port() {
    local pid=$(get_pid_on_port)
    if [ -n "$pid" ]; then
        echo -e "${YELLOW}Killing process on port $PORT (PID: $pid)...${NC}"
        kill -9 $pid 2>/dev/null
        sleep 1
        
        # Verify it's dead
        if [ -z "$(get_pid_on_port)" ]; then
            echo -e "${GREEN}✓ Successfully killed process on port $PORT${NC}"
            return 0
        else
            echo -e "${RED}✗ Failed to kill process on port $PORT${NC}"
            return 1
        fi
    else
        echo -e "${GREEN}✓ No process running on port $PORT${NC}"
        return 0
    fi
}

# Wait for port to be available (with timeout)
wait_for_port() {
    local timeout="${3:-30}"
    local elapsed=0
    
    echo "Waiting for port $PORT to become available (timeout: ${timeout}s)..."
    
    while [ $elapsed -lt $timeout ]; do
        if [ -z "$(get_pid_on_port)" ]; then
            echo -e "${GREEN}✓ Port $PORT is now available${NC}"
            return 0
        fi
        sleep 1
        elapsed=$((elapsed + 1))
    done
    
    echo -e "${RED}✗ Timeout waiting for port $PORT${NC}"
    return 1
}

# Force restart: kill and wait
force_restart() {
    echo -e "${YELLOW}Force restarting port $PORT...${NC}"
    kill_port
    wait_for_port
}

# Health check - verify the app is responding
health_check() {
    local url="http://localhost:$PORT"
    local response=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null)
    
    if [ "$response" = "200" ] || [ "$response" = "302" ] || [ "$response" = "304" ]; then
        echo -e "${GREEN}✓ App is healthy on port $PORT (HTTP $response)${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠ App may not be responding on port $PORT (HTTP $response)${NC}"
        return 1
    fi
}

# Main action handler
case "$ACTION" in
    check)
        check_port
        ;;
    kill)
        kill_port
        ;;
    wait)
        wait_for_port
        ;;
    restart)
        force_restart
        ;;
    health)
        health_check
        ;;
    status)
        echo "=== Port $PORT Status ==="
        check_port
        if [ $? -eq 1 ]; then
            health_check
        fi
        ;;
    *)
        echo "Usage: $0 [port] [action]"
        echo ""
        echo "Actions:"
        echo "  check   - Check if port is in use"
        echo "  kill    - Kill process on port"
        echo "  wait    - Wait for port to be available"
        echo "  restart - Kill and wait for port"
        echo "  health  - Check if app is responding"
        echo "  status  - Full status report"
        echo ""
        echo "Example:"
        echo "  $0 2828 check"
        echo "  $0 2828 kill"
        ;;
esac
