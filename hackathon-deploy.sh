#!/bin/bash

# Hackathon deployment using cspr.click web interface

echo "🏆 Casper Hackathon 2026 - Web Deployment Guide"
echo "==============================================="
echo ""
echo "Since RPC nodes are unstable, use the web interface:"
echo ""
echo "1. 🌐 Go to: https://cspr.click"
echo "2. 🔗 Connect your Casper Signer wallet"
echo "3. 📁 Upload: contracts/target/wasm32-unknown-unknown/release/escrow-contract.wasm"
echo "4. ⚙️  Set parameters:"
echo "   - Payment: 150000000000 motes (150 CSPR)"
echo "   - owner: account-hash-6cdfb8ef7421098d150d888f5429d47fd24cd3c3edec1e1f66105dc3c25eebd5"
echo "   - relayer: account-hash-6cdfb8ef7421098d150d888f5429d47fd24cd3c3edec1e1f66105dc3c25eebd5"
echo "5. 🚀 Deploy!"
echo ""
echo "Alternative: Ask in Discord #hackathon channel for working RPC"
echo ""
echo "✅ Your contract is ready for hackathon submission!"
