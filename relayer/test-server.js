const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Mock transaction store
const transactions = new Map();

// Mock API endpoints for testing the UI
app.get('/bridge/transactions', (req, res) => {
  const allTransactions = Array.from(transactions.values());
  res.json(allTransactions);
});

app.post('/bridge/initiate', (req, res) => {
  const { amount, from_network, to_network, recipient, sender } = req.body;
  const routeId = `route_${Date.now()}`;
  const deployHash = `deploy_${Date.now()}_mock`;
  
  const transaction = {
    routeId,
    amount,
    from_network,
    to_network,
    recipient,
    sender,
    status: 'initiated',
    deployHash,
    createdAt: new Date(),
    steps: [
      { step: 'initiated', time: new Date().toISOString(), deployHash }
    ]
  };
  
  transactions.set(routeId, transaction);
  
  res.json({ 
    success: true,
    routeId, 
    status: 'initiated',
    deployHash,
    message: 'Escrow created on Casper blockchain (DEMO MODE)'
  });
});

app.post('/bridge/fund', (req, res) => {
  const { routeId } = req.body;
  const transaction = transactions.get(routeId);
  
  if (!transaction) {
    return res.status(404).json({ error: 'Transaction not found' });
  }
  
  const deployHash = `fund_${Date.now()}_mock`;
  transaction.status = 'funded';
  transaction.fundDeployHash = deployHash;
  transaction.steps.push({
    step: 'funded',
    time: new Date().toISOString(),
    deployHash
  });
  
  res.json({ 
    success: true,
    status: 'funded',
    deployHash 
  });
});

app.post('/bridge/pay', (req, res) => {
  const { routeId, network } = req.body;
  const transaction = transactions.get(routeId);
  
  if (!transaction) {
    return res.status(404).json({ error: 'Transaction not found' });
  }
  
  const mobileTxId = `${network}_${Date.now()}_mock`;
  transaction.status = 'payment_initiated';
  transaction.mpesaTxId = mobileTxId;
  transaction.steps.push({
    step: 'payment_initiated',
    time: new Date().toISOString(),
    mobileTxId
  });
  
  // Auto-complete after 3 seconds for demo
  setTimeout(() => {
    transaction.status = 'completed';
    transaction.steps.push({
      step: 'completed',
      time: new Date().toISOString(),
      deployHash: `settle_${Date.now()}_mock`
    });
  }, 3000);
  
  res.json({
    success: true,
    status: 'payment_initiated',
    mobileTxId,
    message: `${network.toUpperCase()} payment initiated (DEMO MODE)`
  });
});

app.get('/bridge/status/:routeId', (req, res) => {
  const { routeId } = req.params;
  const transaction = transactions.get(routeId);
  
  if (!transaction) {
    return res.status(404).json({ error: 'Transaction not found' });
  }
  
  res.json(transaction);
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`🚀 CasperPay Bridge Demo Server running on port ${PORT}`);
  console.log(`📊 Demo mode - showing stunning UI with mock data`);
  console.log(`🔗 Ready for frontend connection`);
});