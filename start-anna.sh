#!/usr/bin/env bash

export PATH="$HOME/.local/bin:$PATH"

echo
echo " Anna Vibe Coder"
echo " =============================================================="

# Check if user is logged in
ANNA_WHO=$(npx anna-app whoami 2>&1)

if echo "$ANNA_WHO" | grep -qi "no accounts"; then
    echo
    echo " [!] NOT LOGGED IN — Anna AI LLM will NOT work."
    echo
    echo " Run:"
    echo " npx anna-app login --host https://anna.partners"
    echo

    node Agent/server.js &
    sleep 2

    npx anna-app dev --no-llm
    exit 0
fi

echo " Logged in as: $ANNA_WHO"
echo " =============================================================="
echo

echo " Starting Agent server on port 8787..."
node Agent/server.js &

sleep 2

echo
echo " Starting Anna App harness..."
echo

npx anna-app dev