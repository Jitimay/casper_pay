#!/bin/bash

# Test RPC endpoints and deploy when available

ENDPOINTS=(
    "https://rpc.testnet.casperlabs.io"
    "https://rpc.testnet.caspercommunity.io" 
    "https://rpc.testnet.casper-node.io"
)

echo "🔍 Testing Casper testnet RPC endpoints..."

for endpoint in "${ENDPOINTS[@]}"; do
    echo "Testing: $endpoint"
    if casper-client get-node-status --node-address "$endpoint" >/dev/null 2>&1; then
        echo "✅ $endpoint is working!"
        
        echo "🚀 Deploying contract..."
        casper-client put-deploy \
          --node-address "$endpoint" \
          --chain-name casper-test \
          --secret-key relayer/keys/secret_key.pem \
          --payment-amount 200000000000 \
          --session-path contracts/target/wasm32-unknown-unknown/release/escrow-contract.wasm \
          --session-arg "owner:key='account-hash-6cdfb8ef7421098d150d888f5429d47fd24cd3c3edec1e1f66105dc3c25eebd5'" \
          --session-arg "relayer:key='account-hash-6cdfb8ef7421098d150d888f5429d47fd24cd3c3edec1e1f66105dc3c25eebd5'"
        
        exit 0
    else
        echo "❌ $endpoint is down"
    fi
done

echo "🚫 All RPC endpoints are currently down. Try again later."
exit 1
