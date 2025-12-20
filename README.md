# 🌍 CasperPay Bridge

**Mobile Money ↔ Multi-chain Settlement Layer**

[![Casper Hackathon 2026](https://img.shields.io/badge/Casper-Hackathon%202026-blue)](https://dorahacks.io/hackathon/casper-hackathon-2026)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Rust](https://img.shields.io/badge/rust-%23000000.svg?style=flat&logo=rust&logoColor=white)](https://www.rust-lang.org/)
[![Node.js](https://img.shields.io/badge/node.js-6DA55F?style=flat&logo=node.js&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/react-%2320232a.svg?style=flat&logo=react&logoColor=%2361DAFB)](https://reactjs.org/)

Real cross-border payment bridge connecting mobile money networks (M-Pesa, MTN MoMo) with Casper blockchain for secure, instant settlements.

## 🎯 Problem Statement

Cross-border payments in Africa are expensive (8-15% fees), slow (3-7 days), and require complex banking relationships. Mobile money networks like M-Pesa and MTN MoMo are popular but isolated within countries.

## 💡 Solution

CasperPay Bridge creates a **real-time settlement layer** using Casper blockchain to connect mobile money networks across borders, enabling instant, low-cost transfers with cryptographic security.

## 🏗️ Architecture

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│   M-Pesa    │◄──►│    Casper    │◄──►│  MTN MoMo   │
│  (Kenya)    │    │  Blockchain  │    │  (Uganda)   │
└─────────────┘    └──────────────┘    └─────────────┘
       │                   │                   │
       ▼                   ▼                   ▼
   API Integration    Smart Contract     API Integration
```

## 🚀 Quick Start (5 Minutes)

```bash
# 1. Check prerequisites
bash check-prerequisites.sh

# 2. Deploy to Casper testnet (requires CSPR tokens)
bash deploy-final.sh

# 3. Start the demo
bash run-demo.sh

# 4. Test the API
bash test-api.sh
```

Then open http://localhost:3000 in your browser!

## 📋 Prerequisites

- **Rust** (1.70+) - Install from https://rustup.rs/
- **Node.js** (18+) - Install from https://nodejs.org/
- **Casper CLI** - Auto-installed by script or: `cargo install casper-client`
- **Testnet CSPR** - Get from https://testnet.cspr.live/tools/faucet

## 🏗️ Architecture

### Smart Contract (Rust)
- Real escrow with purse management
- Secure fund locking and release
- Role-based access control (Owner, Relayer)
- Four states: Initiated → Funded → Settled/Cancelled

### Relayer Service (Node.js)
- Casper blockchain integration
- M-Pesa Daraja API integration
- MTN MoMo API integration
- Webhook handlers for payment confirmations
- Transaction status tracking

### Frontend (React)
- Mobile-first responsive design
- Real-time transaction tracking
- Network selection (M-Pesa ↔ MTN MoMo)
- Live status updates

## 🔄 Transfer Flow

1. **User initiates transfer** → Creates escrow on Casper
2. **Escrow funded** → Locks CSPR in smart contract
3. **Mobile money payment** → Triggers M-Pesa/MoMo API
4. **Payment confirmed** → Webhook receives confirmation
5. **Settlement** → Releases funds to recipient
6. **Completion** → Both parties notified

## 📁 Project Structure

```
casperpay-bridge/
├── contracts/          # Rust smart contract
│   └── src/main.rs    # Escrow contract with real fund handling
├── relayer/           # Node.js bridge service
│   ├── index.js       # API server with blockchain integration
│   ├── .env           # Configuration (API keys, contract hash)
│   └── keys/          # Casper key pair (generated)
├── frontend/          # React UI
│   └── src/App.js     # Main application with real API calls
└── *.sh               # Deployment and testing scripts
```

## 🧪 Testing

### Test API Endpoints
```bash
# Start services first
bash run-demo.sh

# In another terminal, run tests
bash test-api.sh
```

### Manual API Testing
```bash
# Create escrow
curl -X POST http://localhost:3001/bridge/initiate \
  -H "Content-Type: application/json" \
  -d '{
    "amount": "1000000000",
    "from_network": "mpesa",
    "to_network": "momo",
    "recipient": "+256700123456",
    "sender": "+254700123456"
  }'

# Check status
curl http://localhost:3001/bridge/status/ROUTE_ID

# View all transactions
curl http://localhost:3001/bridge/transactions
```

## 🔑 Configuration

### Casper Network
Edit `relayer/.env`:
```bash
CASPER_NODE_URL=https://rpc.testnet.casperlabs.io
CONTRACT_HASH=hash-xxxxx  # Auto-filled by deploy script
PRIVATE_KEY_PATH=./keys/secret_key.pem
```

### Mobile Money APIs (Optional)
See [setup-mobile-money.md](setup-mobile-money.md) for detailed instructions.

**Note**: System works without mobile money APIs configured (uses simulation for testing).

## 🌐 Deployment

### Testnet (Current)
```bash
bash deploy-final.sh
```

### Mainnet (Production)
1. Update `CASPER_NODE_URL` to mainnet RPC
2. Change `chain-name` to `casper`
3. Use production mobile money credentials
4. Add database for transaction persistence
5. Implement proper key management (AWS KMS, etc.)

## 📊 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/bridge/initiate` | POST | Create escrow on Casper |
| `/bridge/fund` | POST | Fund escrow with CSPR |
| `/bridge/pay` | POST | Initiate mobile money payment |
| `/bridge/settle` | POST | Settle escrow after payment |
| `/bridge/status/:id` | GET | Get transaction status |
| `/bridge/transactions` | GET | List all transactions |
| `/webhooks/mpesa` | POST | M-Pesa payment callback |

## 🔍 Monitoring

- **Casper Explorer**: https://testnet.cspr.live
- **Contract**: https://testnet.cspr.live/contract/YOUR_CONTRACT_HASH
- **Deploys**: https://testnet.cspr.live/deploy/YOUR_DEPLOY_HASH

## 🛠️ Development

```bash
# Install dependencies
cd relayer && npm install
cd ../frontend && npm install

# Run relayer in dev mode
cd relayer && npm run dev

# Run frontend in dev mode
cd frontend && npm start
```

## 🐛 Troubleshooting

### Contract deployment fails
- Ensure you have 500+ CSPR in your testnet account
- Check network connectivity: `curl https://rpc.testnet.casperlabs.io`
- Verify keys exist: `ls relayer/keys/`

### Relayer won't start
- Check `.env` file exists: `cat relayer/.env`
- Verify contract hash is set
- Check port 3001 is available: `lsof -i :3001`

### Frontend can't connect
- Ensure relayer is running on port 3001
- Check CORS is enabled in relayer
- Verify API endpoints: `curl http://localhost:3001/bridge/transactions`

## 🏆 Hackathon Submission

This project is built for **Casper Hackathon 2026**:
- ✅ Real blockchain integration (not simulated)
- ✅ Deployed to Casper Testnet
- ✅ Working prototype with on-chain activity
- ✅ Interoperability focus (mobile money ↔ blockchain)
- ✅ Real-world use case (cross-border payments)

## 📄 License

MIT License - See LICENSE file for details

## 🤝 Contributing

Contributions welcome! Please open an issue or PR.

## 📧 Contact

For questions or support, open an issue on GitHub.