#!/bin/bash

set -e

echo "🚀 CasperPay Bridge - MAINNET DEPLOYMENT"
echo "======================================"
echo ""

# Load environment variables
if [ -f "relayer/.env" ]; then
    export $(cat relayer/.env | xargs)
fi

# Ensure necessary environment variables are set
if [ -z "$CASPER_NODE_URL" ] || [ -z "$MAINNET_PUBLIC_KEY" ] || [ -z "$MAINNET_SECRET_KEY_PATH" ]; then
    echo "❌ Error: Please set CASPER_NODE_URL, MAINNET_PUBLIC_KEY, and MAINNET_SECRET_KEY_PATH in relayer/.env"
    exit 1
fi

echo "✅ Using mainnet account:"
echo "📋 Public Key: $MAINNET_PUBLIC_KEY"
echo "🔑 Secret Key Path: $MAINNET_SECRET_KEY_PATH"
echo ""

# Verify files exist
if [ ! -f "$MAINNET_SECRET_KEY_PATH" ]; then
    echo "❌ Private key not found: $MAINNET_SECRET_KEY_PATH"
    exit 1
fi

# Build the contract if it doesn't exist
if [ ! -f "contracts/target/wasm32-unknown-unknown/release/escrow-contract.wasm" ]; then
    echo "Building smart contract..."
    cd contracts
    cargo build --release --target wasm32-unknown-unknown
    cd ..
fi

echo "✅ Contract WASM found."
echo ""
echo "📡 Deploying to Casper Mainnet..."
echo "Please review the details carefully."
echo "Node: $CASPER_NODE_URL"
echo "Chain: casper"
read -p "Do you want to proceed with deployment? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled."
    exit 1
fi

# Deploy the contract
DEPLOY_RESULT=$(casper-client put-deploy \
  --node-address "$CASPER_NODE_URL" \
  --chain-name casper \
  --secret-key "$MAINNET_SECRET_KEY_PATH" \
  --payment-amount 200000000000 \
  --session-path contracts/target/wasm32-unknown-unknown/release/escrow-contract.wasm \
  --session-arg "owner:key='$MAINNET_PUBLIC_KEY'" \
  --session-arg "relayer:key='$MAINNET_PUBLIC_KEY'")

# Extract deploy hash
DEPLOY_HASH=$(echo "$DEPLOY_RESULT" | grep -o '"deploy_hash":"[^""].*"' | cut -d'"' -f4)

if [ -z "$DEPLOY_HASH" ]; then
    echo "❌ Deployment failed!"
    echo "Response:"
    echo "$DEPLOY_RESULT"
    exit 1
fi

echo "🎉 SUCCESS! Contract deployment submitted to Casper Mainnet."
echo "📋 Deploy Hash: $DEPLOY_HASH"
echo "🔍 Track here: https://cspr.live/deploy/$DEPLOY_HASH"
echo ""
echo "⏳ Waiting for confirmation..."
sleep 30

# Get contract hash
CONTRACT_INFO=$(casper-client get-deploy --node-address "$CASPER_NODE_URL" "$DEPLOY_HASH")
CONTRACT_HASH=$(echo "$CONTRACT_INFO" | grep -A 20 "stored_contract_by_hash" | grep -o 'hash-[a-f0-9]*' | head -1)

if [ -z "$CONTRACT_HASH" ]; then
    echo "⚠️ Could not automatically retrieve contract hash. Please find it on the explorer and update relayer/.env manually."
    exit 0
fi

echo "✅ Contract Hash: $CONTRACT_HASH"

# Update configuration
echo "📝 Updating relayer/.env with the new contract hash..."
sed -i "s/CASPER_CONTRACT_HASH=.*/CASPER_CONTRACT_HASH=$CONTRACT_HASH/" relayer/.env

echo ""
echo "🎉🎉🎉 MAINNET DEPLOYMENT COMPLETE! 🎉🎉🎉"
echo "Your bridge is now connected to the Casper Mainnet."
echo "Don't forget to fund your relayer account on mainnet."
