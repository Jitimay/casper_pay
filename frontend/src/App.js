import React, { useState, useEffect } from 'react';
import './App.css';

const API_BASE = 'http://localhost:3001';

function App() {
  const [transfer, setTransfer] = useState({
    amount: '',
    fromNetwork: 'mpesa',
    toNetwork: 'momo',
    sender: '',
    recipient: ''
  });
  
  const [currentTransaction, setCurrentTransaction] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch all transactions on component mount
  useEffect(() => {
    fetchTransactions();
  }, []);

  // Poll for transaction updates
  useEffect(() => {
    if (currentTransaction) {
      const interval = setInterval(() => {
        fetchTransactionStatus(currentTransaction.routeId);
      }, 3000);
      
      return () => clearInterval(interval);
    }
  }, [currentTransaction]);

  const fetchTransactions = async () => {
    try {
      const response = await fetch(`${API_BASE}/bridge/transactions`);
      const data = await response.json();
      setTransactions(data);
    } catch (err) {
      console.error('Error fetching transactions:', err);
    }
  };

  const fetchTransactionStatus = async (routeId) => {
    try {
      const response = await fetch(`${API_BASE}/bridge/status/${routeId}`);
      if (response.ok) {
        const data = await response.json();
        setCurrentTransaction(data);
        
        // Update transactions list
        setTransactions(prev => 
          prev.map(tx => tx.routeId === routeId ? data : tx)
        );
      }
    } catch (err) {
      console.error('Error fetching status:', err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setTransfer(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const initiateTransfer = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE}/bridge/initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: transfer.amount + '000000000', // Convert to motes (9 decimals)
          from_network: transfer.fromNetwork,
          to_network: transfer.toNetwork,
          sender: transfer.sender,
          recipient: transfer.recipient
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setCurrentTransaction(data);
        fetchTransactions(); // Refresh list
        
        // Clear form
        setTransfer({
          amount: '',
          fromNetwork: 'mpesa',
          toNetwork: 'momo',
          sender: '',
          recipient: ''
        });
      } else {
        setError(data.error || 'Failed to initiate transfer');
      }
    } catch (err) {
      setError('Network error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fundEscrow = async () => {
    if (!currentTransaction) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/bridge/fund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          routeId: currentTransaction.routeId
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        fetchTransactionStatus(currentTransaction.routeId);
      } else {
        setError(data.error || 'Failed to fund escrow');
      }
    } catch (err) {
      setError('Network error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const initiatePayment = async (network) => {
    if (!currentTransaction) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/bridge/pay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          routeId: currentTransaction.routeId,
          network: network
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        fetchTransactionStatus(currentTransaction.routeId);
      } else {
        setError(data.error || 'Failed to initiate payment');
      }
    } catch (err) {
      setError('Network error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'initiated': return '#ffa500';
      case 'funded': return '#4169e1';
      case 'payment_initiated': return '#9932cc';
      case 'payment_confirmed': return '#32cd32';
      case 'settled': return '#228b22';
      case 'completed': return '#006400';
      default: return '#666';
    }
  };

  const formatAmount = (amount) => {
    return (parseInt(amount) / 1000000000).toFixed(2);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>🌍 CasperPay Bridge</h1>
        <p>Cross-border mobile money transfers via Casper blockchain</p>
      </header>

      <main className="main-content">
        {/* Transfer Form */}
        <div className="card">
          <h2>💸 New Transfer</h2>
          <form onSubmit={initiateTransfer}>
            <div className="form-group">
              <label>Amount (CSPR)</label>
              <input
                type="number"
                name="amount"
                value={transfer.amount}
                onChange={handleInputChange}
                placeholder="Enter amount"
                required
                min="1"
                step="0.01"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>From Network</label>
                <select
                  name="fromNetwork"
                  value={transfer.fromNetwork}
                  onChange={handleInputChange}
                >
                  <option value="mpesa">M-Pesa (Kenya)</option>
                  <option value="momo">MTN MoMo (Uganda)</option>
                </select>
              </div>

              <div className="form-group">
                <label>To Network</label>
                <select
                  name="toNetwork"
                  value={transfer.toNetwork}
                  onChange={handleInputChange}
                >
                  <option value="momo">MTN MoMo (Uganda)</option>
                  <option value="mpesa">M-Pesa (Kenya)</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Sender Phone</label>
                <input
                  type="tel"
                  name="sender"
                  value={transfer.sender}
                  onChange={handleInputChange}
                  placeholder="+254700123456"
                  required
                />
              </div>

              <div className="form-group">
                <label>Recipient Phone</label>
                <input
                  type="tel"
                  name="recipient"
                  value={transfer.recipient}
                  onChange={handleInputChange}
                  placeholder="+256700123456"
                  required
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="btn-primary"
              disabled={loading}
            >
              {loading ? 'Creating...' : '🚀 Initiate Transfer'}
            </button>
          </form>

          {error && (
            <div className="error-message">
              ❌ {error}
            </div>
          )}
        </div>

        {/* Current Transaction */}
        {currentTransaction && (
          <div className="card">
            <h2>📊 Current Transaction</h2>
            <div className="transaction-details">
              <div className="detail-row">
                <span>Route ID:</span>
                <span className="mono">{currentTransaction.routeId}</span>
              </div>
              <div className="detail-row">
                <span>Amount:</span>
                <span>{formatAmount(currentTransaction.amount)} CSPR</span>
              </div>
              <div className="detail-row">
                <span>Status:</span>
                <span 
                  className="status-badge"
                  style={{ backgroundColor: getStatusColor(currentTransaction.status) }}
                >
                  {currentTransaction.status}
                </span>
              </div>
              <div className="detail-row">
                <span>From:</span>
                <span>{currentTransaction.from_network} ({currentTransaction.sender})</span>
              </div>
              <div className="detail-row">
                <span>To:</span>
                <span>{currentTransaction.to_network} ({currentTransaction.recipient})</span>
              </div>
              
              {currentTransaction.deployHash && (
                <div className="detail-row">
                  <span>Deploy Hash:</span>
                  <a 
                    href={`https://testnet.cspr.live/deploy/${currentTransaction.deployHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="blockchain-link"
                  >
                    {currentTransaction.deployHash.substring(0, 16)}...
                  </a>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="action-buttons">
              {currentTransaction.status === 'initiated' && (
                <button 
                  onClick={fundEscrow}
                  className="btn-secondary"
                  disabled={loading}
                >
                  💰 Fund Escrow
                </button>
              )}
              
              {currentTransaction.status === 'funded' && (
                <button 
                  onClick={() => initiatePayment(currentTransaction.from_network)}
                  className="btn-secondary"
                  disabled={loading}
                >
                  📱 Initiate {currentTransaction.from_network.toUpperCase()} Payment
                </button>
              )}
            </div>

            {/* Transaction Steps */}
            {currentTransaction.steps && (
              <div className="transaction-steps">
                <h3>📋 Transaction Steps</h3>
                {currentTransaction.steps.map((step, index) => (
                  <div key={index} className="step">
                    <span className="step-time">{new Date(step.time).toLocaleTimeString()}</span>
                    <span className="step-name">{step.step}</span>
                    {step.deployHash && (
                      <a 
                        href={`https://testnet.cspr.live/deploy/${step.deployHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="step-link"
                      >
                        View on Explorer
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Recent Transactions */}
        <div className="card">
          <h2>📜 Recent Transactions</h2>
          {transactions.length === 0 ? (
            <p className="no-transactions">No transactions yet. Create your first transfer above!</p>
          ) : (
            <div className="transactions-list">
              {transactions.slice(-5).reverse().map((tx) => (
                <div 
                  key={tx.routeId} 
                  className="transaction-item"
                  onClick={() => setCurrentTransaction(tx)}
                >
                  <div className="tx-header">
                    <span className="tx-id">{tx.routeId}</span>
                    <span 
                      className="tx-status"
                      style={{ color: getStatusColor(tx.status) }}
                    >
                      {tx.status}
                    </span>
                  </div>
                  <div className="tx-details">
                    <span>{formatAmount(tx.amount)} CSPR</span>
                    <span>{tx.from_network} → {tx.to_network}</span>
                    <span>{new Date(tx.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <footer className="footer">
        <p>🏆 Built for Casper Hackathon 2026 | 🔗 Powered by Casper Blockchain</p>
        <div className="footer-links">
          <a href="https://testnet.cspr.live" target="_blank" rel="noopener noreferrer">
            Casper Explorer
          </a>
          <a href="https://github.com/Jitimay/casper_pay" target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
        </div>
      </footer>
    </div>
  );
}

export default App;