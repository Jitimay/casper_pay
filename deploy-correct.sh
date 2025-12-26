#!/bin/bash

# Updated deployment with correct RPC endpoints

echo "🚀 Deploying to Casper Testnet with correct endpoints..."

# Try official endpoints
ENDPOINTS=(
    "https://node.testnet.cspr.cloud"
    "http://node.testnet.casper.network:7777"
)

for endpoint in "${ENDPOINTS[@]}"; do
    echo "Trying: $endpoint"
    
    casper-client put-deploy \
      --node-address "$endpoint" \
      --chain-name casper-test \
      --secret-key relayer/keys/secret_key.pem \
      --payment-amount 150000000000 \
      --session-path contracts/target/wasm32-unknown-unknown/release/escrow-contract.wasm \
      --session-arg "owner:key='account-hash-6cdfb8ef7421098d150d888f5429d47fd24cd3c3edec1e1f66105dc3c25eebd5'" \
      --session-arg "relayer:key='account-hash-6cdfb8ef7421098d150d888f5429d47fd24cd3c3edec1e1f66105dc3c25eebd5'"
    
    if [ $? -eq 0 ]; then
        echo "✅ Deployment successful!"
        exit 0
    fi
done

echo "❌ All endpoints failed. Check network or try later."
