// src/hooks/useMultichainWallet.js

import { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { SAFE_VOTE_V2_ABI } from '../utils/SafeVoteV2ABI'; // adjust path if needed

// Your proxy addresses per chain (same as multichain.js)
const CHAIN_CONFIG = {
  11155111: { name: 'Ethereum Sepolia', proxy: '0xd8bFdD7f2bb39D5D78a4Bb1D9D2f70968C63e8F3' },
  84532: { name: 'Base Sepolia', proxy: '0xC724408090C739daD30f5a9d6756DB0d56e060be' },
  421614: { name: 'Arbitrum Sepolia', proxy: '0xfa84a89D170084675b7ECb110a883fD47757916c' },
  97: { name: 'BNB Testnet', proxy: '0x38290e4834FFc92065B921E092BCD0b5D65aD4A0' },
  1328: { name: 'Sei Testnet', proxy: '0x74774C664826c6d5583D0feA0D636205a6986dAc' },
};

export const useMultichainWallet = () => {
  const [address, setAddress] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);

  const updateContractForChain = async (newChainId) => {
    newChainId = parseInt(newChainId, 10);
    setChainId(newChainId);

    const config = CHAIN_CONFIG[newChainId];
    if (!config) {
      console.warn('Unsupported chain:', newChainId);
      window.Contract = null;
      return;
    }

    if (!window.ethereum) return;

    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();

    const contract = new ethers.Contract(config.proxy, SAFE_VOTE_V2_ABI, signer);

    // This is what your ElectionCreationService expects!
    window.Contract = {
      contract,
      provider,
      signer,
      address: await signer.getAddress(),
      chainId: newChainId,
      switchNetwork: async (targetChainId) => {
        const hexChainId = `0x${targetChainId.toString(16)}`;
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: hexChainId }],
          });
          // No reload — React will handle via event listener below
        } catch (err) {
          if (err.code === 4902) {
            throw new Error(`Chain ${targetChainId} not added to wallet`);
          }
          throw err;
        }
      },
    };

    console.log(`Contract updated for ${config.name}: ${config.proxy}`);
  };

  const connectWallet = async () => {
    if (!window.ethereum) {
      setError('Please install MetaMask or another wallet');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      await window.ethereum.request({ method: 'eth_requestAccounts' });

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const network = await provider.getNetwork();
      const accounts = await provider.listAccounts();

      setAddress(accounts[0]);
      await updateContractForChain(network.chainId);
    } catch (err) {
      setError(err.message);
      console.error(err);
    } finally {
      setIsConnecting(false);
    }
  };

  // Auto-connect if already authorized + listen to changes
  useEffect(() => {
    if (!window.ethereum) return;

    const handleChainChanged = (chainIdHex) => {
      const newChainId = parseInt(chainIdHex, 16);
      console.log('Chain changed to:', newChainId);
      updateContractForChain(newChainId);
      // Optional: clear any cache here if needed
    };

    const handleAccountsChanged = async (accounts) => {
      if (accounts.length === 0) {
        setAddress(null);
        window.Contract = null;
      } else {
        setAddress(accounts[0]);
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const network = await provider.getNetwork();
        await updateContractForChain(network.chainId);
      }
    };

    // Initial check
    window.ethereum.request({ method: 'eth_accounts' })
      .then(async (accounts) => {
        if (accounts.length > 0) {
          setAddress(accounts[0]);
          const provider = new ethers.providers.Web3Provider(window.ethereum);
          const network = await provider.getNetwork();
          await updateContractForChain(network.chainId);
        }
      });

    // Listeners
    window.ethereum.on('chainChanged', handleChainChanged);
    window.ethereum.on('accountsChanged', handleAccountsChanged);

    return () => {
      window.ethereum.removeListener('chainChanged', handleChainChanged);
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
    };
  }, []);

  return {
    address,
    chainId,
    isConnecting,
    error,
    connectWallet,
    currentChainName: chainId ? CHAIN_CONFIG[chainId]?.name : null,
  };
};