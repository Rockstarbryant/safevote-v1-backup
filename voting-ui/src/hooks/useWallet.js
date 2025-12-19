import { useState, useEffect } from 'react';
import { initializeProvider } from '../services/votingService';

export const useWallet = () => {
  const [address, setAddress] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    checkIfWalletIsConnected();
    
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', () => window.location.reload());
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      }
    };
  }, []);

  const checkIfWalletIsConnected = async () => {
    try {
      if (!window.ethereum) return;

      const accounts = await window.ethereum.request({ 
        method: 'eth_accounts' 
      });

      if (accounts.length > 0) {
        setAddress(accounts[0]);
        await initializeProvider();
      }
    } catch (err) {
      console.error('Error checking wallet connection:', err);
    }
  };

  const handleAccountsChanged = (accounts) => {
    if (accounts.length === 0) {
      setAddress(null);
    } else {
      setAddress(accounts[0]);
    }
  };

  const connectWallet = async () => {
    try {
      setIsConnecting(true);
      setError(null);

      if (!window.ethereum) {
        throw new Error('Please install MetaMask');
      }

      await initializeProvider();
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      setAddress(accounts[0]);
      return accounts[0];
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setAddress(null);
  };

  return {
    address,
    isConnecting,
    error,
    connectWallet,
    disconnectWallet
  };
};

export default useWallet;