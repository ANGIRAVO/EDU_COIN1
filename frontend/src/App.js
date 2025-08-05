import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import { AuthClient } from '@dfinity/auth-client';
import { Principal } from '@dfinity/principal';

// ICP canister interface (for future use when DFX is set up)
// const createActor = (canisterId, options) => {
//   const agent = options.agent;
//   return {
//     getBalance: async (principal) => {
//       try {
//         const response = await agent.call(canisterId, {
//           methodName: 'getBalance',
//           args: [principal],
//         });
//         return response;
//       } catch (error) {
//         console.error('Error getting balance:', error);
//         return 1000;
//       }
//     },
//     transfer: async (to, amount) => {
//       try {
//         const response = await agent.call(canisterId, {
//           methodName: 'transfer',
//           args: [Principal.fromText(to), Number(amount)],
//         });
//         return response;
//       } catch (error) {
//         console.error('Error transferring:', error);
//         throw error;
//       }
//     },
//     mint: async (amount) => {
//       try {
//         const response = await agent.call(canisterId, {
//           methodName: 'mint',
//           args: [Number(amount)],
//         });
//         return response;
//       } catch (error) {
//         console.error('Error minting:', error);
//         throw error;
//       }
//     }
//   };
// };

function App() {
  const [authClient, setAuthClient] = useState(null);
  const [actor, setActor] = useState(null);
  const [principal, setPrincipal] = useState('');
  const [balance, setBalance] = useState('1000');
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [transactionHistory, setTransactionHistory] = useState([]);
  const [demoMode] = useState(true); // Demo mode - no setter needed currently
  const [transferMessage, setTransferMessage] = useState('');
  const [transferStatus, setTransferStatus] = useState(''); // 'success' or 'error'
  const [users, setUsers] = useState([
    { id: 'user1-demo', name: 'Demo User 1', balance: 1500 },
    { id: 'user2-demo', name: 'Demo User 2', balance: 800 },
    { id: 'user3-demo', name: 'Demo User 3', balance: 1200 },
    { id: 'user4-demo', name: 'Demo User 4', balance: 600 },
    { id: 'user5-demo', name: 'Demo User 5', balance: 2000 }
  ]);

  const initAuth = useCallback(async () => {
    try {
      const client = await AuthClient.create();
      setAuthClient(client);
      
      const isAuthenticated = await client.isAuthenticated();
      setIsAuthenticated(isAuthenticated);
      
      if (isAuthenticated) {
        const identity = client.getIdentity();
        const principal = identity.getPrincipal().toString();
        setPrincipal(principal);
        
        // In a real app, you would create an actor here with your canister ID
        // const agent = new HttpAgent({ identity });
        // const actor = createActor('your-canister-id', { agent });
        // setActor(actor);
        
        console.log('ICP Identity connected:', principal);
      }
    } catch (error) {
      console.error('Failed to initialize ICP auth:', error);
    }
  }, []);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  const signIn = async () => {
    if (!authClient) return;
    
    try {
      await authClient.login({
        identityProvider: process.env.DFX_NETWORK === 'local' 
          ? `http://localhost:4943/?canisterId=${process.env.CANISTER_ID_INTERNET_IDENTITY}`
          : 'https://identity.ic0.app',
        onSuccess: () => {
          initAuth();
        },
      });
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const signOut = async () => {
    if (!authClient) return;
    
    await authClient.logout();
    setIsAuthenticated(false);
    setPrincipal('');
    setActor(null);
    setBalance('1000');
  };

  const handleDemoTransfer = async () => {
    // Clear previous messages
    setTransferMessage('');
    setTransferStatus('');
    
    if (!recipient || !amount) {
      setTransferMessage('Please enter recipient and amount');
      setTransferStatus('error');
      return;
    }
    
    const transferAmount = parseInt(amount);
    const currentBalance = parseInt(balance);
    
    if (transferAmount <= 0) {
      setTransferMessage('Amount must be greater than 0');
      setTransferStatus('error');
      return;
    }
    
    if (transferAmount > currentBalance) {
      setTransferMessage('❌ Not enough tokens!');
      setTransferStatus('error');
      return;
    }
    
    setLoading(true);
    
    // Simulate network delay
    setTimeout(() => {
      const newBalance = currentBalance - transferAmount;
      setBalance(newBalance.toString());
      
      // Update recipient's balance in users list
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === recipient 
            ? { ...user, balance: user.balance + transferAmount }
            : user
        )
      );
      
      // Add to transaction history
      const newTransaction = {
        id: Date.now(),
        type: 'transfer',
        to: recipient,
        amount: transferAmount,
        timestamp: new Date().toLocaleString()
      };
      setTransactionHistory(prev => [newTransaction, ...prev.slice(0, 4)]);
      
      setRecipient('');
      setAmount('');
      setLoading(false);
      setTransferMessage('✅ Transfer successful!');
      setTransferStatus('success');
      
      // Clear message after 5 seconds
      setTimeout(() => {
        setTransferMessage('');
        setTransferStatus('');
      }, 5000);
    }, 1500);
  };

  const handleTransfer = async () => {
    if (demoMode) {
      handleDemoTransfer();
      return;
    }
    
    if (!actor || !recipient || !amount) return;
    
    setLoading(true);
    try {
      await actor.transfer(recipient, parseInt(amount));
      
      // Refresh balance after transfer
      const newBalance = await actor.getBalance(Principal.fromText(principal));
      setBalance(newBalance.toString());
      setRecipient('');
      setAmount('');
      alert('Transfer successful!');
    } catch (error) {
      console.error('Transfer failed:', error);
      alert('Transfer failed: ' + error.message);
    }
    setLoading(false);
  };

  const mintTokens = async () => {
    const mintAmount = 500;
    
    if (demoMode) {
      const currentBalance = parseInt(balance);
      const newBalance = currentBalance + mintAmount;
      setBalance(newBalance.toString());
      
      const newTransaction = {
        id: Date.now(),
        type: 'mint',
        amount: mintAmount,
        timestamp: new Date().toLocaleString()
      };
      setTransactionHistory(prev => [newTransaction, ...prev.slice(0, 4)]);
      
      alert(`✅ Minted ${mintAmount} EDU tokens!\nNew Balance: ${newBalance} EDU`);
      return;
    }
    
    if (!actor) return;
    
    try {
      await actor.mint(mintAmount);
      
      // Refresh balance after minting
      const newBalance = await actor.getBalance(Principal.fromText(principal));
      setBalance(newBalance.toString());
      alert(`✅ Minted ${mintAmount} EDU tokens!`);
    } catch (error) {
      console.error('Minting failed:', error);
      alert('Minting failed: ' + error.message);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>🎓 EduCoin</h1>
        <p>Educational Token on Internet Computer Protocol (ICP)</p>
        
        {!authClient ? (
          <div>Loading ICP connection...</div>
        ) : !isAuthenticated ? (
          <div className="wallet-info">
            <div className="account-section">
              <h2>🎮 Demo Mode Active</h2>
              <p>Your EduCoin Balance: <strong>{balance} EDU</strong></p>
              <p><small>Connect Internet Identity for full blockchain features</small></p>
              <button onClick={signIn} className="btn-primary" style={{marginTop: '10px'}}>
                🔐 Connect Internet Identity
              </button>
            </div>
            
            <div className="info-section">
              <h3>🌐 User Explorer</h3>
              <p>View all users and their token balances:</p>
              <div className="users-list">
                {users.map(user => (
                  <div key={user.id} className="user-item">
                    <div className="user-details">
                      <span className="user-name">{user.name}</span>
                      <span className="user-id">ID: {user.id}</span>
                    </div>
                    <div className="user-balance">
                      <strong>{user.balance} EDU</strong>
                    </div>
                    <button 
                      className="btn-quick-send"
                      onClick={() => setRecipient(user.id)}
                    >
                      Quick Send
                    </button>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="transfer-section">
              <h3>🎮 Interactive Demo</h3>
              <div className="demo-notice">
                <p>💡 This is a working demo! Try transferring tokens and minting new ones.</p>
              </div>
              
              <h4>Transfer EduCoins</h4>
              <div className="form-group">
                <input
                  type="text"
                  placeholder="Recipient Principal ID"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  className="input-field"
                />
              </div>
              <div className="form-group">
                <input
                  type="number"
                  placeholder="Amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="input-field"
                />
              </div>
              <button 
                onClick={handleTransfer} 
                disabled={loading || !recipient || !amount}
                className="btn-primary"
              >
                {loading ? 'Transferring...' : '💸 Send'}
              </button>
              
              {transferMessage && (
                <div className={`transfer-message ${transferStatus}`}>
                  {transferMessage}
                </div>
              )}
              
              <h4>Mint New Tokens (Demo)</h4>
              <button 
                onClick={mintTokens}
                className="btn-primary"
                style={{marginTop: '10px'}}
              >
                🏭 Mint 500 EDU Tokens
              </button>
            </div>
            
            {transactionHistory.length > 0 && (
              <div className="info-section">
                <h3>📊 Recent Transactions</h3>
                {transactionHistory.map(tx => (
                  <div key={tx.id} className="transaction-item">
                    {tx.type === 'transfer' ? (
                      <p>💸 Sent {tx.amount} EDU to {tx.to}</p>
                    ) : (
                      <p>🏭 Minted {tx.amount} EDU tokens</p>
                    )}
                    <small>{tx.timestamp}</small>
                  </div>
                ))}
              </div>
            )}
            
            <div className="info-section">
              <h3>About EduCoin</h3>
              <p>EduCoin is an educational token built on Internet Computer Protocol to help students learn about blockchain technology and cryptocurrency.</p>
              <p><small>Currently running in demo mode. Connect Internet Identity for full blockchain functionality.</small></p>
            </div>
          </div>
        ) : (
          <div className="wallet-info">
            <div className="account-section">
              <h2>🔐 ICP Identity Connected</h2>
              <p><strong>Principal:</strong> <small>{principal}</small></p>
              <p>Your EduCoin Balance: <strong>{balance} EDU</strong></p>
              <button onClick={signOut} className="btn-secondary">
                Disconnect Identity
              </button>
            </div>
            
            <div className="info-section">
              <h3>🌐 User Explorer</h3>
              <p>View all users and their token balances:</p>
              <div className="users-list">
                {users.map(user => (
                  <div key={user.id} className="user-item">
                    <div className="user-details">
                      <span className="user-name">{user.name}</span>
                      <span className="user-id">ID: {user.id}</span>
                    </div>
                    <div className="user-balance">
                      <strong>{user.balance} EDU</strong>
                    </div>
                    <button 
                      className="btn-quick-send"
                      onClick={() => setRecipient(user.id)}
                    >
                      Quick Send
                    </button>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="transfer-section">
              <h3>🎮 Blockchain Operations</h3>
              <div className="demo-notice">
                <p>💡 {demoMode ? 'Demo mode active' : 'Connected to ICP blockchain!'}</p>
              </div>
              
              <h4>Transfer EduCoins</h4>
              <div className="form-group">
                <input
                  type="text"
                  placeholder="Recipient Principal ID"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  className="input-field"
                />
              </div>
              <div className="form-group">
                <input
                  type="number"
                  placeholder="Amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="input-field"
                />
              </div>
              <button 
                onClick={handleTransfer} 
                disabled={loading || !recipient || !amount}
                className="btn-primary"
              >
                {loading ? 'Transferring...' : '💸 Transfer EDU'}
              </button>
              
              <h4>Mint New Tokens</h4>
              <button 
                onClick={mintTokens}
                className="btn-primary"
                style={{marginTop: '10px'}}
              >
                🏭 Mint 500 EDU Tokens
              </button>
            </div>
            
            {transactionHistory.length > 0 && (
              <div className="info-section">
                <h3>📊 Recent Transactions</h3>
                {transactionHistory.map(tx => (
                  <div key={tx.id} className="transaction-item">
                    {tx.type === 'transfer' ? (
                      <p>💸 Sent {tx.amount} EDU to {tx.to}</p>
                    ) : (
                      <p>🏭 Minted {tx.amount} EDU tokens</p>
                    )}
                    <small>{tx.timestamp}</small>
                  </div>
                ))}
              </div>
            )}
            
            <div className="info-section">
              <h3>About EduCoin</h3>
              <p>EduCoin is an educational token built on Internet Computer Protocol to help students learn about blockchain technology and cryptocurrency.</p>
            </div>
          </div>
        )}
        
      </header>
    </div>
  );
}

export default App;
