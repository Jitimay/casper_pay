#!/bin/bash

# CasperPay Contract Deployment Guide

echo "🚀 CasperPay Contract Deployment"
echo "================================"
echo ""

# Method 1: Using existing script
echo "Method 1: Automated deployment"
echo "./deploy-final.sh"
echo ""

# Method 2: Manual deployment
echo "Method 2: Manual deployment"
echo "casper-client put-deploy \\"
echo "  --node-address https://rpc.testnet.casperlabs.io \\"
echo "  --chain-name casper-test \\"
echo "  --secret-key relayer/keys/secret_key.pem \\"
echo "  --payment-amount 200000000000 \\"
echo "  --session-path contracts/target/wasm32-unknown-unknown/release/escrow-contract.wasm \\"
echo "  --session-arg \"owner:key='account-hash-6cdfb8ef7421098d150d888f5429d47fd24cd3c3edec1e1f66105dc3c25eebd5'\" \\"
echo "  --session-arg \"relayer:key='account-hash-6cdfb8ef7421098d150d888f5429d47fd24cd3c3edec1e1f66105dc3c25eebd5'\""
echo ""

# Alternative RPC endpoints
echo "Alternative RPC endpoints:"
echo "- https://rpc.testnet.casperlabs.io"
echo "- http://65.108.78.120:7777/rpc"
echo "- https://testnet.cspr.live/rpc"
echo ""

echo "✅ Contract is ready to deploy!"
echo "📁 WASM file: contracts/target/wasm32-unknown-unknown/release/escrow-contract.wasm"
echo "🔑 Keys: relayer/keys/secret_key.pem"
echo "💰 Payment: 200 CSPR (200000000000 motes)"
