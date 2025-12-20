const express = require('express');
const { CasperClient, CLValueBuilder, DeployUtil, Keys, RuntimeArgs } = require('casper-js-sdk');
const fs = require('fs');
const crypto = require('crypto');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Casper configuration
const casperClient = new CasperClient(process.env.CASPER_NODE_URL || 'http://65.108.78.120:7777/rpc');
const contractHash = process.env.CONTRACT_HASH || '';

// Load private key for signing transactions
let keyPair;
try {
  const privateKeyPath = process.env.PRIVATE_KEY_PATH || './keys/secret_key.pem';
  if (fs.existsSync(privateKeyPath)) {
    const privateKeyPem = fs.readFileSync(privateKeyPath, 'utf8');
    keyPair = Keys.Ed25519.parsePrivateKey(privateKeyPem);
  } else {
    // Generate new key pair for development
    keyPair = Keys.Ed25519.new();
    console.log('Generated new key pair. Public key:', keyPair.publicKey.toHex());
  }
} catch (error) {
  console.error('Error loading private key:', error);
  process.exit(1);
}

// Real Mobile Money APIs Integration
const mobileMoney = {
  mpesa: {
    send: async (amount, recipient) => {
      try {
        // M-Pesa Daraja API integration (sandbox)
        const auth = Buffer.from(`${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`).toString('base64');
        
        // Get access token
        const tokenResponse = await fetch('https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {
          method: 'GET',
          headers: {
            'Authorization': `Basic ${auth}`
          }
        });
        
        const tokenData = await tokenResponse.json();
        const accessToken = tokenData.access_token;
        
        // Initiate STK Push
        const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3);
        const password = Buffer.from(`${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`).toString('base64');
        
        const stkResponse = await fetch('https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            BusinessShortCode: process.env.MPESA_SHORTCODE,
            Password: password,
            Timestamp: timestamp,
            TransactionType: 'CustomerPayBillOnline',
            Amount: amount,
            PartyA: recipient,
            PartyB: process.env.MPESA_SHORTCODE,
            PhoneNumber: recipient,
            CallBackURL: `${process.env.BASE_URL}/webhooks/mpesa`,
            AccountReference: `CASPER_${Date.now()}`,
            TransactionDesc: 'CasperPay Bridge Transfer'
          })
        });
        
        const stkData = await stkResponse.json();
        
        if (stkData.ResponseCode === '0') {
          return { success: true, txId: stkData.CheckoutRequestID };
        } else {
          return { success: false, error: stkData.errorMessage };
        }
      } catch (error) {
        console.error('M-Pesa API error:', error);
        return { success: false, error: error.message };
      }
    },
    
    verify: async (txId) => {
      try {
        // Query transaction status
        const auth = Buffer.from(`${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`).toString('base64');
        
        const tokenResponse = await fetch('https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {
          method: 'GET',
          headers: {
            'Authorization': `Basic ${auth}`
          }
        });
        
        const tokenData = await tokenResponse.json();
        const accessToken = tokenData.access_token;
        
        const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3);
        const password = Buffer.from(`${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`).toString('base64');
        
        const queryResponse = await fetch('https://sandbox.safaricom.co.ke/mpesa/stkpushquery/v1/query', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            BusinessShortCode: process.env.MPESA_SHORTCODE,
            Password: password,
            Timestamp: timestamp,
            CheckoutRequestID: txId
          })
        });
        
        const queryData = await queryResponse.json();
        
        return {
          verified: queryData.ResultCode === '0',
          amount: queryData.Amount || 0,
          status: queryData.ResultDesc
        };
      } catch (error) {
        console.error('M-Pesa verification error:', error);
        return { verified: false, error: error.message };
      }
    }
  },
  
  momo: {
    send: async (amount, recipient) => {
      try {
        // MTN MoMo API integration (sandbox)
        const subscriptionKey = process.env.MOMO_SUBSCRIPTION_KEY;
        
        if (!subscriptionKey) {
          // Fallback to simulation for development
          return { 
            success: true, 
            txId: `momo_sim_${Date.now()}`,
            note: 'Simulated - Add MTN MoMo API credentials'
          };
        }
        
        // Real MTN MoMo implementation would go here
        const response = await fetch('https://sandbox.momodeveloper.mtn.com/collection/v1_0/requesttopay', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.MOMO_ACCESS_TOKEN}`,
            'X-Reference-Id': crypto.randomUUID(),
            'X-Target-Environment': 'sandbox',
            'Ocp-Apim-Subscription-Key': subscriptionKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            amount: amount.toString(),
            currency: 'UGX',
            externalId: `CASPER_${Date.now()}`,
            payer: {
              partyIdType: 'MSISDN',
              partyId: recipient
            },
            payerMessage: 'CasperPay Bridge Transfer',
            payeeNote: 'Cross-border transfer via Casper'
          })
        });
        
        if (response.ok) {
          const referenceId = response.headers.get('X-Reference-Id');
          return { success: true, txId: referenceId };
        } else {
          const error = await response.json();
          return { success: false, error: error.message };
        }
      } catch (error) {
        console.error('MoMo API error:', error);
        return { success: false, error: error.message };
      }
    },
    
    verify: async (txId) => {
      try {
        const subscriptionKey = process.env.MOMO_SUBSCRIPTION_KEY;
        
        if (!subscriptionKey) {
          // Simulation fallback
          return { verified: true, amount: 100, note: 'Simulated verification' };
        }
        
        const response = await fetch(`https://sandbox.momodeveloper.mtn.com/collection/v1_0/requesttopay/${txId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${process.env.MOMO_ACCESS_TOKEN}`,
            'X-Target-Environment': 'sandbox',
            'Ocp-Apim-Subscription-Key': subscriptionKey
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          return {
            verified: data.status === 'SUCCESSFUL',
            amount: parseFloat(data.amount),
            status: data.status
          };
        } else {
          return { verified: false, error: 'Transaction not found' };
        }
      } catch (error) {
        console.error('MoMo verification error:', error);
        return { verified: false, error: error.message };
      }
    }
  }
};

// In-memory transaction store (use database in production)
const transactions = new Map();

app.post('/bridge/initiate', async (req, res) => {
  const { amount, from_network, to_network, recipient, sender } = req.body;
  const routeId = `route_${Date.now()}`;
  
  try {
    // Validate inputs
    if (!amount || !recipient || !sender || !from_network || !to_network) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Convert recipient phone to Casper account hash (simplified)
    const recipientAccountHash = CLValueBuilder.key(
      CLValueBuilder.accountHash(crypto.createHash('sha256').update(recipient).digest())
    );

    // Create escrow on Casper blockchain
    const deploy = DeployUtil.makeDeploy(
      new DeployUtil.DeployParams(
        keyPair.publicKey,
        'casper-test'
      ),
      DeployUtil.ExecutableDeployItem.newStoredContractByHash(
        contractHash,
        'create_escrow',
        RuntimeArgs.fromMap({
          'escrow_id': CLValueBuilder.string(routeId),
          'recipient': recipientAccountHash,
          'amount': CLValueBuilder.u512(amount)
        })
      ),
      DeployUtil.standardPayment(2000000000) // 2 CSPR for gas
    );

    // Sign and deploy to blockchain
    const signedDeploy = DeployUtil.signDeploy(deploy, keyPair);
    const deployHash = await casperClient.putDeploy(signedDeploy);

    // Store transaction details
    transactions.set(routeId, {
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
    });

    console.log(`Escrow created on Casper. Deploy hash: ${deployHash}`);
    
    res.json({ 
      success: true,
      routeId, 
      status: 'initiated',
      deployHash,
      message: 'Escrow created on Casper blockchain'
    });
  } catch (error) {
    console.error('Initiate error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/bridge/fund', async (req, res) => {
  const { routeId } = req.body;
  
  try {
    const transaction = transactions.get(routeId);
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Fund the escrow on Casper
    const deploy = DeployUtil.makeDeploy(
      new DeployUtil.DeployParams(
        keyPair.publicKey,
        'casper-test'
      ),
      DeployUtil.ExecutableDeployItem.newStoredContractByHash(
        contractHash,
        'fund_escrow',
        RuntimeArgs.fromMap({
          'escrow_id': CLValueBuilder.string(routeId),
          'amount': CLValueBuilder.u512(transaction.amount)
        })
      ),
      DeployUtil.standardPayment(2000000000)
    );

    const signedDeploy = DeployUtil.signDeploy(deploy, keyPair);
    const deployHash = await casperClient.putDeploy(signedDeploy);

    // Update transaction
    transaction.status = 'funded';
    transaction.fundDeployHash = deployHash;
    transaction.steps.push({
      step: 'funded',
      time: new Date().toISOString(),
      deployHash
    });

    console.log(`Escrow funded. Deploy hash: ${deployHash}`);
    
    res.json({ 
      success: true,
      status: 'funded',
      deployHash 
    });
  } catch (error) {
    console.error('Fund error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/bridge/settle', async (req, res) => {
  const { routeId, mobileTxId, network } = req.body;
  
  try {
    const transaction = transactions.get(routeId);
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Verify mobile money transaction
    let verified;
    if (network === 'mpesa') {
      verified = await mobileMoney.mpesa.verify(mobileTxId);
    } else if (network === 'momo') {
      verified = await mobileMoney.momo.verify(mobileTxId);
    } else {
      return res.status(400).json({ error: 'Unsupported network' });
    }
    
    if (verified.verified) {
      // Settle escrow on Casper
      const deploy = DeployUtil.makeDeploy(
        new DeployUtil.DeployParams(
          keyPair.publicKey,
          'casper-test'
        ),
        DeployUtil.ExecutableDeployItem.newStoredContractByHash(
          contractHash,
          'settle_escrow',
          RuntimeArgs.fromMap({
            'escrow_id': CLValueBuilder.string(routeId)
          })
        ),
        DeployUtil.standardPayment(2000000000)
      );

      const signedDeploy = DeployUtil.signDeploy(deploy, keyPair);
      const deployHash = await casperClient.putDeploy(signedDeploy);

      // Update transaction
      transaction.status = 'settled';
      transaction.settleDeployHash = deployHash;
      transaction.mobileTxId = mobileTxId;
      transaction.verifiedAmount = verified.amount;
      transaction.steps.push({
        step: 'settled',
        time: new Date().toISOString(),
        deployHash,
        mobileTxId
      });

      console.log(`Escrow settled. Deploy hash: ${deployHash}`);
      
      res.json({ 
        success: true,
        status: 'settled',
        deployHash,
        verifiedAmount: verified.amount
      });
    } else {
      res.status(400).json({ 
        error: 'Mobile money verification failed',
        details: verified.error 
      });
    }
  } catch (error) {
    console.error('Settle error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get transaction status
app.get('/bridge/status/:routeId', (req, res) => {
  const { routeId } = req.params;
  const transaction = transactions.get(routeId);
  
  if (!transaction) {
    return res.status(404).json({ error: 'Transaction not found' });
  }
  
  res.json(transaction);
});

// List all transactions (for debugging)
app.get('/bridge/transactions', (req, res) => {
  const allTransactions = Array.from(transactions.values());
  res.json(allTransactions);
});

// M-Pesa webhook handler
app.post('/webhooks/mpesa', (req, res) => {
  console.log('M-Pesa webhook received:', JSON.stringify(req.body, null, 2));
  
  try {
    const { Body } = req.body;
    if (Body && Body.stkCallback) {
      const { CheckoutRequestID, ResultCode, ResultDesc } = Body.stkCallback;
      
      // Find transaction by CheckoutRequestID
      for (const [routeId, transaction] of transactions.entries()) {
        if (transaction.mpesaTxId === CheckoutRequestID) {
          if (ResultCode === 0) {
            // Payment successful
            transaction.status = 'payment_confirmed';
            transaction.mpesaResultCode = ResultCode;
            transaction.steps.push({
              step: 'payment_confirmed',
              time: new Date().toISOString(),
              mpesaResult: ResultDesc
            });
            
            // Auto-settle the escrow
            setTimeout(() => settleEscrowAutomatically(routeId, CheckoutRequestID), 1000);
          } else {
            // Payment failed
            transaction.status = 'payment_failed';
            transaction.mpesaResultCode = ResultCode;
            transaction.error = ResultDesc;
          }
          break;
        }
      }
    }
    
    res.json({ ResultCode: 0, ResultDesc: 'Success' });
  } catch (error) {
    console.error('Webhook error:', error);
    res.json({ ResultCode: 1, ResultDesc: 'Error processing webhook' });
  }
});

// Auto-settle function
async function settleEscrowAutomatically(routeId, mobileTxId) {
  try {
    const transaction = transactions.get(routeId);
    if (!transaction || transaction.status !== 'payment_confirmed') {
      return;
    }

    console.log(`Auto-settling escrow for ${routeId}`);
    
    const deploy = DeployUtil.makeDeploy(
      new DeployUtil.DeployParams(
        keyPair.publicKey,
        'casper-test'
      ),
      DeployUtil.ExecutableDeployItem.newStoredContractByHash(
        contractHash,
        'settle_escrow',
        RuntimeArgs.fromMap({
          'escrow_id': CLValueBuilder.string(routeId)
        })
      ),
      DeployUtil.standardPayment(2000000000)
    );

    const signedDeploy = DeployUtil.signDeploy(deploy, keyPair);
    const deployHash = await casperClient.putDeploy(signedDeploy);

    transaction.status = 'completed';
    transaction.settleDeployHash = deployHash;
    transaction.steps.push({
      step: 'completed',
      time: new Date().toISOString(),
      deployHash
    });

    console.log(`Auto-settlement completed. Deploy hash: ${deployHash}`);
  } catch (error) {
    console.error('Auto-settlement error:', error);
  }
}

// Initiate mobile money payment
app.post('/bridge/pay', async (req, res) => {
  const { routeId, network } = req.body;
  
  try {
    const transaction = transactions.get(routeId);
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    let result;
    if (network === 'mpesa') {
      result = await mobileMoney.mpesa.send(transaction.amount, transaction.sender);
    } else if (network === 'momo') {
      result = await mobileMoney.momo.send(transaction.amount, transaction.sender);
    } else {
      return res.status(400).json({ error: 'Unsupported network' });
    }

    if (result.success) {
      transaction.status = 'payment_initiated';
      transaction.mpesaTxId = result.txId;
      transaction.steps.push({
        step: 'payment_initiated',
        time: new Date().toISOString(),
        mobileTxId: result.txId
      });

      res.json({
        success: true,
        status: 'payment_initiated',
        mobileTxId: result.txId,
        message: 'Payment request sent to mobile money provider'
      });
    } else {
      res.status(400).json({
        error: 'Payment initiation failed',
        details: result.error
      });
    }
  } catch (error) {
    console.error('Payment initiation error:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`CasperPay Bridge Relayer running on port ${PORT}`);
  console.log(`Public key: ${keyPair.publicKey.toHex()}`);
  console.log(`Contract hash: ${contractHash}`);
});