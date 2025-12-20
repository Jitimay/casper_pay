import React, { useState, useEffect, useCallback } from 'react';
import './App.css';

const API_BASE = 'http://localhost:3001';

// Utility functions
const formatAmount = (amount) => {
  return (parseInt(amount) / 1000000000).toFixed(2);
};

const getStatusColor = (status) => {
  const colors = {
    'initiated': '#f59e0b',
    'funded': '#3b82f6',
    'payment_initiated': '#8b5cf6',
    'payment_confirmed': '#10b981',
    'settled': '#059669',
    'completed': '#047857',
    'failed': '#ef4444',
    'cancelled': '#6b7280'
  };
  return colors[status] || '#6b7280';
};

const getStatusIcon = (status) => {
  const icons = {
    'initiated': 'fas fa-play-circle',
    'funded': 'fas fa-coins',
    'payment_initiated': 'fas fa-mobile-alt',
    'payment_confirmed': 'fas fa-check-circle',
    'settled': 'fas fa-handshake',
    'completed': 'fas fa-trophy',
    'failed': 'fas fa-exclamation-triangle',
    'cancelled': 'fas fa-times-circle'
  };
  return icons[status] || 'fas fa-question-circle';
};

// Floating Particles Component
const FloatingParticles = () => {
  return (
    <div className="particles">
      {[...Array(9)].map((_, i) => (
        <div key={i} className="particle" />
      ))}
    </div>
  );
};

// Status Badge Component
const StatusBadge = ({ status }) => (
  <span 
    className="status-badge"
    style={{ backgroundColor: getStatusColor(status) }}
  >
    <i className={getStatusIcon(status)} />
    {status.replace('_', ' ')}
  </span>
);

// Transaction Step Component
const TransactionStep = ({ step, index }) => (
  <div className="step">
    <div className="step-icon">
      {index + 1}
    </div>
    <div className="step-content">
      <div className="step-time">
        {new Date(step.time).toLocaleTimeString()}
      </div>
      <div className="step-name">
        {step.step.replace('_', ' ')}
      </div>
    </div>
    {step.deployHash && (
      <a 
        href={`https://testnet.cspr.live/deploy/${step.deployHash}`}
        target="_blank"
        rel="noopener noreferrer"
        className="step-link"
      >
        <i className="fas fa-external-link-alt" />
        View on Explorer
      </a>
    )}
  </div>
);

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
  const [success, setSuccess] = useState('');
  const [stats, setStats] = useState({
    totalTransactions: 0,
    totalVolume: 0,
    successRate: 0
  });

  // Fetch all transactions
  const fetchTransactions = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/bridge/transactions`);
      const data = await response.json();
      setTransactions(data);
      
      // Calculate stats
      const total = data.length;
      const completed = data.filter(tx => tx.status === 'completed').length;
      const volume = data.reduce((sum, tx) => sum + parseInt(tx.amount || 0), 0);
      
      setStats({
        totalTransactions: total,
        totalVolume: formatAmount(volume.toString()),
        successRate: total > 0 ? Math.round((completed / total) * 100) : 0
      });
    } catch (err) {
      console.error('Error fetching transactions:', err);
    }
  }, []);

  // Fetch transaction status
  const fetchTransactionStatus = useCallback(async (routeId) => {
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
  }, []);

  // Effects
  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  useEffect(() => {
    if (currentTransaction) {
      const interval = setInterval(() => {
        fetchTransactionStatus(currentTransaction.routeId);
      }, 5000);
      
      return () => clearInterval(interval);
    }
  }, [currentTransaction, fetchTransactionStatus]);

  // Clear messages after 5 seconds
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError('');
        setSuccess('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setTransfer(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Initiate transfer
  const initiateTransfer = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`${API_BASE}/bridge/initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: transfer.amount + '000000000', // Convert to motes
          from_network: transfer.fromNetwork,
          to_network: transfer.toNetwork,
          sender: transfer.sender,
          recipient: transfer.recipient
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setCurrentTransaction(data);
        setSuccess('🎉 Transfer initiated successfully! Escrow created on Casper blockchain.');
        fetchTransactions();
        
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

  // Fund escrow
  const fundEscrow = async () => {
    if (!currentTransaction) return;
    
    setLoading(true);
    setError('');
    
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
        setSuccess('💰 Escrow funded successfully!');
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

  // Initiate payment
  const initiatePayment = async (network) => {
    if (!currentTransaction) return;
    
    setLoading(true);
    setError('');
    
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
        setSuccess(`📱 ${network.toUpperCase()} payment initiated successfully!`);
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

  return (
    <div className="App">
      <FloatingParticles />
      
      <header className="App-header">
        <div className="header-content">
          <h1>
            <i className="fas fa-globe-africa" /> CasperPay Bridge
          </h1>
          <p>
            Revolutionary cross-border mobile money transfers powered by Casper blockchain. 
            Instant, secure, and low-cost payments between M-Pesa and MTN MoMo networks.
          </p>
          
          <div className="header-stats">
            <div className="stat-item">
              <span className="stat-number">{stats.totalTransactions}</span>
              <span className="stat-label">Total Transfers</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{stats.totalVolume}</span>
              <span className="stat-label">CSPR Volume</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{stats.successRate}%</span>
              <span className="stat-label">Success Rate</span>
            </div>
          </div>
        </div>
      </header>

      <main className="main-content">
        {/* Transfer Form */}
        <div className="card">
          <h2>
            <i className="fas fa-paper-plane" />
            New Cross-Border Transfer
          </h2>
          
          <form onSubmit={initiateTransfer}>
            <div className="form-group">
              <label>
                <i className="fas fa-coins" />
                Amount (CSPR)
              </label>
              <input
                type="number"
                name="amount"
                value={transfer.amount}
                onChange={handleInputChange}
                placeholder="Enter amount (e.g., 10.50)"
                required
                min="0.01"
                step="0.01"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>
                  <i className="fas fa-arrow-right" />
                  From Network
                </label>
                <select
                  name="fromNetwork"
                  value={transfer.fromNetwork}
                  onChange={handleInputChange}
                >
                  <option value="mpesa">🇰🇪 M-Pesa (Kenya)</option>
                  <option value="momo">🇺🇬 MTN MoMo (Uganda)</option>
                </select>
              </div>

              <div className="form-group">
                <label>
                  <i className="fas fa-arrow-left" />
                  To Network
                </label>
                <select
                  name="toNetwork"
                  value={transfer.toNetwork}
                  onChange={handleInputChange}
                >
                  <option value="momo">🇺🇬 MTN MoMo (Uganda)</option>
                  <option value="mpesa">🇰🇪 M-Pesa (Kenya)</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>
                  <i className="fas fa-user" />
                  Sender Phone
                </label>
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
                <label>
                  <i className="fas fa-user-friends" />
                  Recipient Phone
                </label>
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
              className={`btn btn-primary ${loading ? 'btn-loading' : ''}`}
              disabled={loading}
            >
              {loading ? '' : (
                <>
                  <i className="fas fa-rocket" />
                  Initiate Transfer
                </>
              )}
            </button>
          </form>

          {error && (
            <div className="alert alert-error">
              <i className="fas fa-exclamation-triangle" />
              {error}
            </div>
          )}

          {success && (
            <div className="alert alert-success">
              <i className="fas fa-check-circle" />
              {success}
            </div>
          )}
        </div>

        {/* Current Transaction */}
        {currentTransaction && (
          <div className="card">
            <h2>
              <i className="fas fa-chart-line" />
              Live Transaction Tracking
            </h2>
            
            <div className="transaction-details">
              <div className="detail-row">
                <span className="detail-label">
                  <i className="fas fa-fingerprint" />
                  Route ID
                </span>
                <span className="detail-value mono">{currentTransaction.routeId}</span>
              </div>
              
              <div className="detail-row">
                <span className="detail-label">
                  <i className="fas fa-coins" />
                  Amount
                </span>
                <span className="detail-value">
                  {formatAmount(currentTransaction.amount)} CSPR
                </span>
              </div>
              
              <div className="detail-row">
                <span className="detail-label">
                  <i className="fas fa-info-circle" />
                  Status
                </span>
                <StatusBadge status={currentTransaction.status} />
              </div>
              
              <div className="detail-row">
                <span className="detail-label">
                  <i className="fas fa-route" />
                  Transfer Route
                </span>
                <span className="detail-value">
                  {currentTransaction.from_network.toUpperCase()} ({currentTransaction.sender}) 
                  → {currentTransaction.to_network.toUpperCase()} ({currentTransaction.recipient})
                </span>
              </div>
              
              {currentTransaction.deployHash && (
                <div className="detail-row">
                  <span className="detail-label">
                    <i className="fas fa-link" />
                    Blockchain Proof
                  </span>
                  <a 
                    href={`https://testnet.cspr.live/deploy/${currentTransaction.deployHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="blockchain-link"
                  >
                    <i className="fas fa-external-link-alt" />
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
                  className={`btn btn-success ${loading ? 'btn-loading' : ''}`}
                  disabled={loading}
                >
                  {loading ? '' : (
                    <>
                      <i className="fas fa-wallet" />
                      Fund Escrow
                    </>
                  )}
                </button>
              )}
              
              {currentTransaction.status === 'funded' && (
                <button 
                  onClick={() => initiatePayment(currentTransaction.from_network)}
                  className={`btn btn-secondary ${loading ? 'btn-loading' : ''}`}
                  disabled={loading}
                >
                  {loading ? '' : (
                    <>
                      <i className="fas fa-mobile-alt" />
                      Initiate {currentTransaction.from_network.toUpperCase()} Payment
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Transaction Steps */}
            {currentTransaction.steps && currentTransaction.steps.length > 0 && (
              <div className="transaction-steps">
                <h3>
                  <i className="fas fa-list-ol" />
                  Transaction Timeline
                </h3>
                <div className="steps-container">
                  {currentTransaction.steps.map((step, index) => (
                    <TransactionStep key={index} step={step} index={index} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Recent Transactions */}
        <div className="card">
          <h2>
            <i className="fas fa-history" />
            Transaction History
          </h2>
          
          {transactions.length === 0 ? (
            <div className="no-transactions">
              <i className="fas fa-inbox" style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.3 }} />
              <p>No transactions yet. Create your first cross-border transfer above!</p>
            </div>
          ) : (
            <div className="transactions-list">
              {transactions.slice(-10).reverse().map((tx) => (
                <div 
                  key={tx.routeId} 
                  className="transaction-item"
                  onClick={() => setCurrentTransaction(tx)}
                >
                  <div className="tx-header">
                    <span className="tx-id">
                      <i className="fas fa-fingerprint" />
                      {tx.routeId}
                    </span>
                    <StatusBadge status={tx.status} />
                  </div>
                  
                  <div className="tx-details">
                    <div className="tx-detail-item">
                      <span className="tx-detail-label">Amount</span>
                      <span className="tx-detail-value">{formatAmount(tx.amount)} CSPR</span>
                    </div>
                    <div className="tx-detail-item">
                      <span className="tx-detail-label">Route</span>
                      <span className="tx-detail-value">
                        {tx.from_network.toUpperCase()} → {tx.to_network.toUpperCase()}
                      </span>
                    </div>
                    <div className="tx-detail-item">
                      <span className="tx-detail-label">Created</span>
                      <span className="tx-detail-value">
                        {new Date(tx.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <footer className="footer">
        <p>
          <i className="fas fa-trophy" />
          Built for Casper Hackathon 2026 | 
          <i className="fas fa-link" />
          Powered by Casper Blockchain
        </p>
        <div className="footer-links">
          <a href="https://testnet.cspr.live" target="_blank" rel="noopener noreferrer">
            <i className="fas fa-search" />
            Casper Explorer
          </a>
          <a href="https://github.com/Jitimay/casper_pay" target="_blank" rel="noopener noreferrer">
            <i className="fab fa-github" />
            GitHub Repository
          </a>
          <a href="https://casper.network" target="_blank" rel="noopener noreferrer">
            <i className="fas fa-globe" />
            Casper Network
          </a>
        </div>
      </footer>
    </div>
  );
}

export default App;