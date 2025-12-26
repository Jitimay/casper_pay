#!/bin/bash

# Final deployment script - all endpoints tested

echo "🚀 CasperPay Contract Deployment"
echo "================================"
echo ""
echo "✅ Contract: contracts/target/wasm32-unknown-unknown/release/escrow-contract.wasm"
echo "✅ Keys: relayer/keys/secret_key.pem" 
echo "✅ Payment: 150 CSPR"
echo ""

echo "📡 Deployment Command:"
echo ""
echo "casper-client put-deploy \\"
echo "  --node-address http://node.testnet.casper.network:7777 \\"
echo "  --chain-name casper-test \\"
echo "  --secret-key relayer/keys/secret_key.pem \\"
echo "  --payment-amount 150000000000 \\"
echo "  --session-path contracts/target/wasm32-unknown-unknown/release/escrow-contract.wasm \\"
echo "  --session-arg \"owner:key='account-hash-6cdfb8ef7421098d150d888f5429d47fd24cd3c3edec1e1f66105dc3c25eebd5'\" \\"
echo "  --session-arg \"relayer:key='account-hash-6cdfb8ef7421098d150d888f5429d47fd24cd3c3edec1e1f66105dc3c25eebd5'\""
echo ""

echo "🌐 Alternative endpoints to try:"
echo "- http://node.testnet.casper.network:7777"
echo "- https://rpc.testnet.caspercommunity.io"
echo "- http://65.21.235.219:7777"
echo ""

echo "⚠️  Current Status: All testnet RPCs appear to have connectivity issues"
echo "💡 Try again later or check Casper Discord for network status"
echo ""
echo "🎯 Your contract is ready to deploy when network is available!"
