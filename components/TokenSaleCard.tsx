"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ethers } from 'ethers';
import { useAppKit, useAppKitAccount, useDisconnect } from '@reown/appkit/react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchTotalTokensSold, fetchTokenSalesByAddress, calculateUsdValue, calculateProgress } from '@/services/tokenSalesService';
import { RefreshCw } from 'lucide-react';
import { connectWallet } from '../services/walletService';

// Add type declarations for window.ethereum
declare global {
  interface Window {
    ethereum?: Record<string, unknown>;
  }
}

// Add this component before the TokenSaleCard component
// Memoized component for displaying token price
const TokenPriceDisplay = React.memo(({ 
  tokenPrice, 
  currentPhaseId, 
  isLoadingPhaseId, 
  isLoadingTokenPrice 
}: { 
  tokenPrice: number, 
  currentPhaseId: number, 
  isLoadingPhaseId: boolean, 
  isLoadingTokenPrice: boolean 
}) => {
  // Create the display text
  const displayText = useMemo(() => {
    if (isLoadingPhaseId || isLoadingTokenPrice) {
      return "Loading phase info...";
    }
    
    // Check if the token price is suspiciously high (likely the raw value from contract)
    if (tokenPrice > 100) {
      // Calculate the correct price (1/tokenPrice) and display it
      const correctedPrice = 1 / tokenPrice;
      return `Stage ${currentPhaseId}: 1 RYFN = $${correctedPrice.toFixed(4)}`;
    }
    return `Stage ${currentPhaseId}: 1 RYFN = $${tokenPrice.toFixed(4)}`;
  }, [tokenPrice, currentPhaseId, isLoadingPhaseId, isLoadingTokenPrice]);
  
  return (
    <p className="text-[#F8C91E]">{displayText}</p>
  );
});

// Optional: Add display name for debugging
TokenPriceDisplay.displayName = 'TokenPriceDisplay';

const TokenSaleCard = () => {
  // Get the Reown project ID from environment variables
  const reownProjectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID;
  
  // Log the project ID for debugging (will be removed in production)
  // useEffect(() => {
  //   console.log("Using Reown Project ID:", reownProjectId || "Not found in env");
  // }, []);
  
  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount();
  const { disconnect } = useDisconnect();
  
  // Create a provider using the RPC URL from environment variables
  const getProvider = () => {
    // Check if we have an RPC URL from environment variables
    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL;
    
    // If we have an RPC URL, use it
    if (rpcUrl) {
      try {
        const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
        // Test the provider connection immediately
        return provider;
      } catch (error) {
        console.error("Error creating provider with env RPC URL:", error);
        // Fall through to fallbacks
      }
    }
    
    // Fallback to public Sepolia RPC endpoints
    const fallbackUrls = [
      "https://eth-sepolia.g.alchemy.com/v2/demo",  // Add Alchemy demo endpoint
      "https://rpc.sepolia.org",
      "https://eth-sepolia.public.blastapi.io",
      "https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161" // Public Infura key
    ];
    
    // Try each fallback URL
    for (const url of fallbackUrls) {
      try {
        const provider = new ethers.providers.JsonRpcProvider(url);
        return provider;
      } catch (error) {
        console.error(`Error with fallback URL ${url}:`, error);
        // Continue to next fallback
      }
    }
    
    // If all else fails, throw an error
    throw new Error("Could not connect to any Ethereum network");
  };
  
  const handleConnectWallet = () => {
    open() // Opens the default connect view
    // Alternatively, you can specify a view: open({ view: 'Connect' })
  }

  const [purchaseAmount, setPurchaseAmount] = useState('');
  const [tokenAmount, setTokenAmount] = useState('');
  const [selectedToken, setSelectedToken] = useState('REL');
  const [walletAddress, setWalletAddress] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isTransacting, setIsTransacting] = useState(false);
  const [error, setError] = useState('');
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [phaseEndTimestamp, setPhaseEndTimestamp] = useState<number | null>(null);
  const [referralAddress, setReferralAddress] = useState<string | null>(null);
  const [ethPriceInUsd, setEthPriceInUsd] = useState<number | null>(null);
  const [walletBalance, setWalletBalance] = useState<string>('0');
  const [isLoadingWalletBalance, setIsLoadingWalletBalance] = useState<boolean>(false);
  const [transactionStatus, setTransactionStatus] = useState('');
  const [transactionTimeoutId, setTransactionTimeoutId] = useState<NodeJS.Timeout | null>(null);
  const [showRetry, setShowRetry] = useState(false);
  const [totalTokensSold, setTotalTokensSold] = useState<string>('0');
  const [usdValueRaised, setUsdValueRaised] = useState<number>(0);
  const [progressPercentage, setProgressPercentage] = useState<number>(0);
  const [isLoadingTokenSales, setIsLoadingTokenSales] = useState<boolean>(true);
  const [lastTokenSalesUpdate, setLastTokenSalesUpdate] = useState<number>(0);
  const [userTokensPurchased, setUserTokensPurchased] = useState<string>('0');
  const [isLoadingUserTokens, setIsLoadingUserTokens] = useState<boolean>(false);
  const [lastUserTokensUpdate, setLastUserTokensUpdate] = useState<number>(0);
  const [fetchingBalanceForToken, setFetchingBalanceForToken] = useState<string | null>(null);
  const [currentPhaseId, setCurrentPhaseId] = useState<number>(1); // Default to phase 1
  const [isLoadingPhaseId, setIsLoadingPhaseId] = useState<boolean>(true);
  const [lastPhaseIdUpdate, setLastPhaseIdUpdate] = useState<number>(0);
  const [lastEthPriceUpdate, setLastEthPriceUpdate] = useState<number>(0);
  const [lastPhaseEndUpdate, setLastPhaseEndUpdate] = useState<number>(0);
  const DATA_UPDATE_INTERVAL = 5 * 60 * 1000; // 5 minutes in milliseconds
  const TOKEN_PRICE_UPDATE_INTERVAL = 5 * 60 * 1000; // 5 minutes in milliseconds
  const [tokenPrice, setTokenPrice] = useState<number>(0.0015); // Default price
  const [isLoadingTokenPrice, setIsLoadingTokenPrice] = useState<boolean>(true);
  const [lastTokenPriceUpdate, setLastTokenPriceUpdate] = useState<number>(0);
  
  // Add a ref to track the previous token price
  const prevTokenPriceRef = useRef<number>(0);
  
  // Contract address and ABI
  const contractAddress = process.env.NEXT_PUBLIC_PRESALE_CONTRACT_ADDRESS || "";
  const usdtContractAddress = process.env.NEXT_PUBLIC_USDT_CONTRACT_ADDRESS || "";
  const usdcContractAddress = process.env.NEXT_PUBLIC_USDC_CONTRACT_ADDRESS || "";
  
  // Target USD values for each phase
  const phaseTargets = {
    1: 94500,   // $50,000 for phase 1
    2: 262500,  // $150,000 for phase 2
    3: 315000,  // $250,000 for phase 3
    4: 367500, // phase 4
  };
  
  // Get the target USD value for the current phase
  const getTokenSymbol = () => {
    switch (selectedToken) {
      case 'REL':
        return '♦'; // ETH symbol
      case 'USDT':
        return 'Ⓣ'; // USDT symbol
      case 'USDC':
        return '$'; // USDC symbol
      default:
        return '🪙'; // Default
    }
  };
  
  // Get the target USD value for the current phase
  const getTargetUsdValue = () => {
    // Returns NaN if phase not found
    return phaseTargets[currentPhaseId as keyof typeof phaseTargets] || NaN;
  };
  
  // RYFN token symbol
  const ryfnSymbol = '🪙'; // Using coin emoji as placeholder for RYFN SVG

  // Connect wallet when address is available
  useEffect(() => {
    if (isConnected && address) {
      connectWallet(address).catch(error => {
        console.error('Error connecting wallet:', error);
      });
    }
  }, [isConnected, address]);  
  
  // Log contract addresses for debugging
  useEffect(() => {
    console.log("Contract addresses:");
    console.log("- Presale contract:", contractAddress);
    console.log("- USDT contract:", usdtContractAddress || "Not set");
    console.log("- USDC contract:", usdcContractAddress || "Not set");
    
    // Verify that token addresses are set if needed
    if (!usdtContractAddress) {
      console.warn("USDT contract address is not set in environment variables");
    }
    if (!usdcContractAddress) {
      console.warn("USDC contract address is not set in environment variables");
    }
  }, []);
  
  // ERC20 ABI (minimal for balance checking)
  const erc20ABI = [
    {
      "constant": true,
      "inputs": [{"name": "_owner", "type": "address"}],
      "name": "balanceOf",
      "outputs": [{"name": "balance", "type": "uint256"}],
      "type": "function"
    },
    {
      "constant": true,
      "inputs": [],
      "name": "decimals",
      "outputs": [{"name": "", "type": "uint8"}],
      "type": "function"
    },
    {
      "constant": false,
      "inputs": [
        {"name": "_spender", "type": "address"},
        {"name": "_value", "type": "uint256"}
      ],
      "name": "approve",
      "outputs": [{"name": "success", "type": "bool"}],
      "type": "function"
    },
    {
      "constant": true,
      "inputs": [
        {"name": "_owner", "type": "address"},
        {"name": "_spender", "type": "address"}
      ],
      "name": "allowance",
      "outputs": [{"name": "remaining", "type": "uint256"}],
      "type": "function"
    }
  ];
  
  const contractABI = [{"inputs":[{"internalType":"contract IERC20","name":"_USDT","type":"address"},{"internalType":"contract IERC20","name":"_USDC","type":"address"},{"internalType":"contract IERC20","name":"_token","type":"address"},{"internalType":"address","name":"_treasury","type":"address"},{"internalType":"address","name":"_feeRec","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},{"inputs":[],"name":"ReentrancyGuardReentrantCall","type":"error"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"previousOwner","type":"address"},{"indexed":true,"internalType":"address","name":"newOwner","type":"address"}],"name":"OwnershipTransferred","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"buyer","type":"address"},{"indexed":true,"internalType":"address","name":"referrer","type":"address"},{"indexed":true,"internalType":"uint8","name":"phaseId","type":"uint8"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"referralAmount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"usdValue","type":"uint256"}],"name":"TokenSale","type":"event"},{"inputs":[{"internalType":"address payable","name":"_refferal","type":"address"}],"name":"BuyWithETH","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"uint256","name":"_amt","type":"uint256"},{"internalType":"address","name":"_refferal","type":"address"}],"name":"BuyWithUSDC","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"_amt","type":"uint256"},{"internalType":"address","name":"_refferal","type":"address"}],"name":"BuyWithUSDT","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"_amount","type":"uint256"}],"name":"ETHToToken","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_usdt","type":"address"},{"internalType":"uint256","name":"tokenAmount","type":"uint256"}],"name":"EmergencyUSDT","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"Nulladdress","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"ReferralFee","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"TokenPricePerUsdt","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"TokenSold","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"USDC","outputs":[{"internalType":"contract IERC20","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"USDT","outputs":[{"internalType":"contract IERC20","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_newTreasury","type":"address"}],"name":"changeTreasury","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"_ReferralFee","type":"uint256"}],"name":"change_Fee","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_newFeeReceiver","type":"address"}],"name":"changefeeReceiver","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"contractbalance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"currentPhaseEndTimestamp","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"feeReceiver","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getLatestPriceETH","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"_amt","type":"uint256"}],"name":"getValuePerUsdt","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"isBlacklist","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"maxTokeninPresale","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"onGoingPhaseId","outputs":[{"internalType":"uint8","name":"","type":"uint8"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"presaleStatus","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"priceFeedETH","outputs":[{"internalType":"contract AggregatorV3Interface","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"tokenAddress","type":"address"},{"internalType":"uint256","name":"tokenAmount","type":"uint256"}],"name":"recoverERC20","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"releaseFunds","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"renounceOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"resumePresale","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_addr","type":"address"},{"internalType":"bool","name":"_state","type":"bool"}],"name":"setBlacklist","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"_newPrice","type":"uint256"}],"name":"setPresalePricePerUsdt","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"contract IERC20","name":"_USDC","type":"address"}],"name":"setUSDC","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"contract IERC20","name":"_usdt","type":"address"}],"name":"setUSDT","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"_newTokenPricePerUsdtIn18Decimals","type":"uint256"},{"internalType":"uint256","name":"_newMaxTokenInPresaleIn18Decimals","type":"uint256"},{"internalType":"uint256","name":"_newPhaseEndTimestamp","type":"uint256"}],"name":"setUpNewPhase","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_priceFeedETH","type":"address"}],"name":"setaggregatorv3","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"_value","type":"uint256"}],"name":"setmaxTokeninPresale","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"contract IERC20","name":"_token","type":"address"}],"name":"settoken","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"stopPresale","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"token","outputs":[{"internalType":"contract IERC20","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"treasury","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"_newPhaseEndTimestamp","type":"uint256"}],"name":"updateCurrentPhaseEndTimestamp","outputs":[],"stateMutability":"nonpayable","type":"function"},{"stateMutability":"payable","type":"receive"}];
  
  // Format address for display
  const formatAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };
  
  // Handler for wallet button click
  const handleWalletButtonClick = () => {
    if (isConnected && address) {
      handleViewAccount();
      // connectWallet();
    } else {
      handleConnectWallet();
      // connectWallet();
    }
  };

  // Handler for input change
  const handlePurchaseAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPurchaseAmount(value);
    
    // Calculate token amount based on purchase amount
    if (value) {
      if (selectedToken === 'REL') {
        // For ETH, use the contract's ETHToToken function for accurate calculation
        calculateTokensFromEth(value);
      } else {
        // For USDT/USDC, direct calculation
        setTokenAmount((parseFloat(value) / tokenPrice).toFixed(2));
      }
    } else {
      setTokenAmount('');
    }
  };
  
  // Handler for token amount change
  const handleTokenAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setTokenAmount(value);
    
    // Calculate purchase amount based on token amount
    if (value) {
      if (selectedToken === 'REL' && ethPriceInUsd) {
        // For ETH, calculate USD value first, then convert to ETH
        const tokens = parseFloat(value);
        const usdValue = tokens * tokenPrice;
        const ethAmount = usdValue / ethPriceInUsd;
        setPurchaseAmount(ethAmount.toFixed(6));
      } else {
        // For USDT/USDC, direct calculation
        setPurchaseAmount((parseFloat(value) * tokenPrice).toFixed(6));
      }
    } else {
      setPurchaseAmount('');
    }
  };

  // Handler for token selection change
  const handleTokenSelection = (token: string) => {
    // Check if the token contract address is set
    if ((token === 'USDT' && !usdtContractAddress) || (token === 'USDC' && !usdcContractAddress)) {
      setError(`${token} contract address is not configured. Please use ETH instead.`);
      return;
    }
    
    setError(''); // Clear any previous errors
    
    // Only proceed if selecting a different token
    if (token !== selectedToken) {
      // Immediately clear the wallet balance and show loading state
      setWalletBalance('0');
      setIsLoadingWalletBalance(true);
      
      // Cancel any ongoing fetch by changing the token we're fetching for
      setFetchingBalanceForToken(token);
      
      // Update the selected token
      setSelectedToken(token);
      
      // Recalculate token amount based on new token selection
      if (purchaseAmount) {
        if (token === 'REL') {
          // For ETH, use the contract's ETHToToken function for accurate calculation
          calculateTokensFromEth(purchaseAmount);
        } else {
          // For USDT/USDC, direct calculation
          setTokenAmount((parseFloat(purchaseAmount) / tokenPrice).toFixed(2));
        }
      }
      
      // Fetch new balance when token changes
      fetchBalanceForToken(token);
    }
  };

  // New function to fetch balance for a specific token
  const fetchBalanceForToken = async (token: string) => {
    if (!isConnected || !address) {
      setWalletBalance('0');
      setIsLoadingWalletBalance(false);
      return;
    }

    // Set which token we're currently fetching for
    setFetchingBalanceForToken(token);
    setIsLoadingWalletBalance(true);
    
    // Create a safety timeout to ensure loading state is always cleared
    const safetyTimeout = setTimeout(() => {
      console.log("Safety timeout triggered for balance fetch");
      if (isLoadingWalletBalance) {
        setIsLoadingWalletBalance(false);
        setWalletBalance('Error');
        setError('Balance fetch timed out');
      }
    }, 8000); // 8 second absolute maximum timeout

    try {
      // For ETH, use Alchemy API directly
      if (token === 'REL') {
        // Try different methods to get ETH balance
        let ethBalance = '0';
        let success = false;
        
        // Method 1: Use Alchemy API directly
        try {
          const alchemyApiKey = 'demo'; // Using demo key, replace with your own in production
          const alchemyUrl = `https://eth-sepolia.g.alchemy.com/v2/${alchemyApiKey}`;
          
          // Prepare the JSON-RPC request
          const requestData = {
            jsonrpc: '2.0',
            method: 'eth_getBalance',
            params: [address, 'latest'],
            id: 1
          };
          
          // Use fetch API to call Alchemy directly
          const response = await fetch(alchemyUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
          });
          
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          
          const data = await response.json();
          
          if (data.error) {
            throw new Error(`Alchemy API error: ${data.error.message}`);
          }
          
          if (data.result) {
            // Convert hex result to decimal
            const balanceWei = parseInt(data.result, 16);
            // Convert wei to ETH
            ethBalance = (balanceWei / 1e18).toFixed(4);
            console.log("ETH balance from Alchemy:", ethBalance);
            success = true;
          }
        } catch (alchemyError) {
          console.log("Alchemy ETH balance fetch failed, trying fallback", alchemyError);
        }
        
        // Method 2: If Alchemy fails, try using window.ethereum directly
        if (!success && window.ethereum) {
          try {
            const ethereum = window.ethereum as any;
            const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
            if (accounts && accounts.length > 0) {
              const balanceHex = await ethereum.request({
                method: 'eth_getBalance',
                params: [accounts[0], 'latest'],
              });
              const balanceWei = parseInt(balanceHex, 16);
              ethBalance = (balanceWei / 1e18).toFixed(4);
              success = true;
            }
          } catch (web3Error) {
            console.log("Web3 ETH balance fetch failed, trying fallback", web3Error);
          }
        }
        
        // Method 3: If Method 2 fails, try using ethers with Web3Provider
        if (!success && window.ethereum) {
          try {
            const web3Provider = new ethers.providers.Web3Provider(window.ethereum as any);
            const balance = await web3Provider.getBalance(address);
            ethBalance = ethers.utils.formatEther(balance);
            success = true;
          } catch (ethersWeb3Error) {
            console.log("Ethers Web3Provider balance fetch failed, trying fallback", ethersWeb3Error);
          }
        }
        
        // Method 4: Last resort, try RPC provider
        if (!success) {
          try {
            // Try to get a reliable provider
            const rpcProvider = getProvider();
            const balance = await rpcProvider.getBalance(address);
            ethBalance = ethers.utils.formatEther(balance);
          } catch (rpcError) {
            console.error("All ETH balance fetch methods failed:", rpcError);
            throw new Error("Could not fetch ETH balance");
          }
        }
        
        // Format and set the balance
        setWalletBalance(parseFloat(ethBalance).toFixed(4));
      } 
      // Handle USDT
      else if (token === 'USDT' && usdtContractAddress) {
        // Use Alchemy API for token balances too
        try {
          const alchemyApiKey = 'demo'; // Using demo key, replace with your own in production
          const alchemyUrl = `https://eth-sepolia.g.alchemy.com/v2/${alchemyApiKey}`;
          
          // Prepare the JSON-RPC request for token balance
          const requestData = {
            jsonrpc: '2.0',
            method: 'alchemy_getTokenBalances',
            params: [address, [usdtContractAddress]],
            id: 1
          };
          
          // Use fetch API to call Alchemy directly
          const response = await fetch(alchemyUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
          });
          
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          
          const data = await response.json();
          
          if (data.error) {
            throw new Error(`Alchemy API error: ${data.error.message}`);
          }
          
          if (data.result && data.result.tokenBalances && data.result.tokenBalances.length > 0) {
            // Get token metadata to determine decimals
            const metadataRequest = {
              jsonrpc: '2.0',
              method: 'alchemy_getTokenMetadata',
              params: [usdtContractAddress],
              id: 2
            };
            
            const metadataResponse = await fetch(alchemyUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(metadataRequest)
            });
            
            const metadataData = await metadataResponse.json();
            const decimals = metadataData?.result?.decimals || 6; // Default to 6 for USDT
            
            // Parse balance
            const balanceHex = data.result.tokenBalances[0].tokenBalance;
            const balanceValue = parseInt(balanceHex, 16) / Math.pow(10, decimals);
            setWalletBalance(balanceValue.toFixed(4));
            console.log("USDT balance from Alchemy:", balanceValue.toFixed(4));
          } else {
            // Fallback to ethers provider method
            let tokenProvider;
            if (window.ethereum) {
              tokenProvider = new ethers.providers.Web3Provider(window.ethereum as any);
            } else {
              tokenProvider = getProvider();
            }
            
            const tokenContract = new ethers.Contract(usdtContractAddress, erc20ABI, tokenProvider);
            const decimals = await tokenContract.decimals();
            const tokenBalance = await tokenContract.balanceOf(address);
            const balance = ethers.utils.formatUnits(tokenBalance, decimals);
            setWalletBalance(parseFloat(balance).toFixed(4));
          }
        } catch (tokenError) {
          console.error("Error fetching USDT balance:", tokenError);
          
          // Fallback to standard ethers method
          let tokenProvider;
          if (window.ethereum) {
            tokenProvider = new ethers.providers.Web3Provider(window.ethereum as any);
          } else {
            tokenProvider = getProvider();
          }
          
          const tokenContract = new ethers.Contract(usdtContractAddress, erc20ABI, tokenProvider);
          const decimals = await tokenContract.decimals();
          const tokenBalance = await tokenContract.balanceOf(address);
          const balance = ethers.utils.formatUnits(tokenBalance, decimals);
          setWalletBalance(parseFloat(balance).toFixed(4));
        }
      } 
      // Handle USDC
      else if (token === 'USDC' && usdcContractAddress) {
        // Use same pattern as USDT but with USDC address
        try {
          const alchemyApiKey = 'demo'; // Using demo key, replace with your own in production
          const alchemyUrl = `https://eth-sepolia.g.alchemy.com/v2/${alchemyApiKey}`;
          
          // Prepare the JSON-RPC request for token balance
          const requestData = {
            jsonrpc: '2.0',
            method: 'alchemy_getTokenBalances',
            params: [address, [usdcContractAddress]],
            id: 1
          };
          
          // Use fetch API to call Alchemy directly
          const response = await fetch(alchemyUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
          });
          
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          
          const data = await response.json();
          
          if (data.error) {
            throw new Error(`Alchemy API error: ${data.error.message}`);
          }
          
          if (data.result && data.result.tokenBalances && data.result.tokenBalances.length > 0) {
            // Get token metadata to determine decimals
            const metadataRequest = {
              jsonrpc: '2.0',
              method: 'alchemy_getTokenMetadata',
              params: [usdcContractAddress],
              id: 2
            };
            
            const metadataResponse = await fetch(alchemyUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(metadataRequest)
            });
            
            const metadataData = await metadataResponse.json();
            const decimals = metadataData?.result?.decimals || 6; // Default to 6 for USDC
            
            // Parse balance
            const balanceHex = data.result.tokenBalances[0].tokenBalance;
            const balanceValue = parseInt(balanceHex, 16) / Math.pow(10, decimals);
            setWalletBalance(balanceValue.toFixed(4));
            console.log("USDC balance from Alchemy:", balanceValue.toFixed(4));
          } else {
            // Fallback to ethers provider method
            let tokenProvider;
            if (window.ethereum) {
              tokenProvider = new ethers.providers.Web3Provider(window.ethereum as any);
            } else {
              tokenProvider = getProvider();
            }
            
            const tokenContract = new ethers.Contract(usdcContractAddress, erc20ABI, tokenProvider);
            const decimals = await tokenContract.decimals();
            const tokenBalance = await tokenContract.balanceOf(address);
            const balance = ethers.utils.formatUnits(tokenBalance, decimals);
            setWalletBalance(parseFloat(balance).toFixed(4));
          }
        } catch (tokenError) {
          console.error("Error fetching USDC balance:", tokenError);
          
          // Fallback to standard ethers method
          let tokenProvider;
          if (window.ethereum) {
            tokenProvider = new ethers.providers.Web3Provider(window.ethereum as any);
          } else {
            tokenProvider = getProvider();
          }
          
          const tokenContract = new ethers.Contract(usdcContractAddress, erc20ABI, tokenProvider);
          const decimals = await tokenContract.decimals();
          const tokenBalance = await tokenContract.balanceOf(address);
          const balance = ethers.utils.formatUnits(tokenBalance, decimals);
          setWalletBalance(parseFloat(balance).toFixed(4));
        }
      }

      // If we get here, clear any previous errors
      setError('');
    } catch (error) {
      console.error(`Error fetching ${token} balance:`, error);
      setWalletBalance('Error');
      setError(error instanceof Error ? error.message : 'Failed to fetch balance');
    } finally {
      // Always clear loading state
      setIsLoadingWalletBalance(false);
      setFetchingBalanceForToken(null);
      clearTimeout(safetyTimeout);
    }
  };

  // Function to fetch wallet balance based on selected token
  const fetchWalletBalance = async () => {
    if (selectedToken) {
      fetchBalanceForToken(selectedToken);
    }
  };

  // Function to calculate tokens from ETH amount using contract's ETHToToken function
  const calculateTokensFromEth = async (ethAmount: string) => {
    try {
      // Validate input first
      if (!ethAmount || isNaN(parseFloat(ethAmount)) || parseFloat(ethAmount) <= 0) {
        setTokenAmount('');
        return;
      }

      try {
        // Use the provider with the RPC URL from environment variables
        const provider = getProvider();
        const contract = new ethers.Contract(contractAddress, contractABI, provider);
        
        // Convert ETH amount to wei
        const weiAmount = ethers.utils.parseEther(ethAmount);
        
        // Call the ETHToToken function
        const tokenAmountRaw = await contract.ETHToToken(weiAmount);
        
        // Handle different return types
        let tokens;
        
        if (tokenAmountRaw && typeof tokenAmountRaw.toString === 'function') {
          // If it's a BigNumber or has toString method
          try {
            // Try to format as ethers units (18 decimals)
            tokens = ethers.utils.formatUnits(tokenAmountRaw, 18);
          } catch (formatError) {
            console.error("Error formatting token amount:", formatError);
            // Fallback: try to convert directly
            tokens = (parseFloat(tokenAmountRaw.toString()) / 1e18).toString();
          }
        } else if (typeof tokenAmountRaw === 'number') {
          // If it's already a number, assume it's in wei format
          tokens = (tokenAmountRaw / 1e18).toString();
        } else if (typeof tokenAmountRaw === 'string') {
          // If it's a string, parse it and convert from wei
          tokens = (parseFloat(tokenAmountRaw) / 1e18).toString();
        } else {
          // Fallback to manual calculation
          console.warn("Unexpected token amount format:", tokenAmountRaw);
          throw new Error("Invalid token amount format");
        }
        
        console.log("Calculated tokens:", tokens, "Raw value:", tokenAmountRaw);
        
        // Validate the token amount (should be positive)
        const tokenValue = parseFloat(tokens);
        if (isNaN(tokenValue) || tokenValue <= 0) {
          console.warn("Invalid token amount calculated:", tokenValue, "Using fallback calculation");
          throw new Error("Invalid token amount");
        }
        
        setTokenAmount(tokenValue.toFixed(2));
      } catch (contractError) {
        console.error("Contract call failed:", contractError);
        // Fall back to manual calculation
        useFallbackCalculation(ethAmount);
      }
    } catch (error) {
      console.error("Error in calculateTokensFromEth:", error);
      // Final fallback
      useFallbackCalculation(ethAmount);
    }
  };

  // Helper function for fallback calculation
  const useFallbackCalculation = (ethAmount: string) => {
    if (ethPriceInUsd) {
      try {
        const ethValue = parseFloat(ethAmount);
        const usdValue = ethValue * ethPriceInUsd;
        const tokens = usdValue / tokenPrice;
        setTokenAmount(tokens.toFixed(2));
      } catch (fallbackError) {
        console.error("Error in fallback calculation:", fallbackError);
        setTokenAmount('');
        setError("Could not calculate token amount. Please try again.");
      }
    } else {
      // If we don't have ETH price, use a default value
      try {
        const ethValue = parseFloat(ethAmount);
        // Using a default ETH price of $2000 if we don't have the actual price
        const defaultEthPrice = 2000;
        const usdValue = ethValue * defaultEthPrice;
        const tokens = usdValue / tokenPrice;
        setTokenAmount(tokens.toFixed(2));
        
        // Also set the ETH price so we have it for future calculations
        setEthPriceInUsd(defaultEthPrice);
        setError("Using estimated ETH price for calculation.");
      } catch (defaultError) {
        console.error("Error in default calculation:", defaultError);
        setTokenAmount('');
        setError("Could not calculate token amount. Please try again.");
      }
    }
  };

  const handleViewAccount = async () => {
    open({ view: 'Account' });
  };

  // Function to fetch ETH price from the contract
  const fetchEthPrice = async (forceUpdate = false) => {
    try {
      // Check if we've fetched the price recently and it's not a forced update
      const now = Date.now();
      if (!forceUpdate && 
          ethPriceInUsd !== null && 
          now - lastEthPriceUpdate < DATA_UPDATE_INTERVAL) {
        console.log("Skipping ETH price update - last update was", 
                   Math.round((now - lastEthPriceUpdate) / 1000), "seconds ago");
        return ethPriceInUsd;
      }
      
      // Use the provider with the RPC URL from environment variables
      const provider = getProvider();
      const contract = new ethers.Contract(contractAddress, contractABI, provider);
      
      // Call the getLatestPriceETH function
      const ethPriceRaw = await contract.getLatestPriceETH();
      
      // Handle different return types
      let ethPrice;
      
      if (ethPriceRaw && typeof ethPriceRaw.toNumber === 'function') {
        // If it's a BigNumber
        ethPrice = ethPriceRaw.toNumber() / 100000000; // Adjust divisor based on contract implementation
      } else if (typeof ethPriceRaw === 'number') {
        // If it's already a number
        ethPrice = ethPriceRaw / 100000000;
      } else if (typeof ethPriceRaw === 'string') {
        // If it's a string, parse it
        ethPrice = parseInt(ethPriceRaw, 10) / 100000000;
      } else {
        // Fallback: try to convert to number or use default
        try {
          ethPrice = Number(ethPriceRaw) / 100000000;
        } catch (e) {
          console.error("Could not convert ETH price to number:", e);
          ethPrice = 2000; // Default ETH price
        }
      }
      
      console.log("ETH Price in USD:", ethPrice, "Raw value:", ethPriceRaw);
      
      // Validate the price (should be positive)
      if (isNaN(ethPrice) || ethPrice <= 0) {
        console.warn("Invalid ETH price received:", ethPrice, "Using default price");
        ethPrice = 2000; // Default ETH price
      }
      
      setEthPriceInUsd(ethPrice);
      setLastEthPriceUpdate(now);
      return ethPrice;
    } catch (error) {
      console.error("Error fetching ETH price:", error);
      setError("Failed to fetch ETH price. Using fallback price.");
      // Fallback to a default price if the contract call fails
      setEthPriceInUsd(2000); // Example fallback price
      return 2000;
    }
  };

  // Modify the fetchTokenPrice function to include debouncing
  const fetchTokenPrice = async (forceUpdate = false) => {
    try {
      // Check if we've fetched the price recently and it's not a forced update
      const now = Date.now();
      if (!forceUpdate && 
          tokenPrice > 0 && 
          now - lastTokenPriceUpdate < TOKEN_PRICE_UPDATE_INTERVAL) {
        console.log("Skipping token price update - last update was", 
                   Math.round((now - lastTokenPriceUpdate) / 1000), "seconds ago");
        return tokenPrice;
      }
      
      setIsLoadingTokenPrice(true);
      
      // Use the provider with the RPC URL from environment variables
      const provider = getProvider();
      const contract = new ethers.Contract(contractAddress, contractABI, provider);
      
      // Call the TokenPricePerUsdt function
      const tokenPriceRaw = await contract.TokenPricePerUsdt();
      
      console.log("Raw token price from contract:", tokenPriceRaw);
      if (tokenPriceRaw && typeof tokenPriceRaw.toString === 'function') {
        console.log("TokenPriceRaw as string:", tokenPriceRaw.toString());
      }
      
      // Handle different return types
      let tokensPerUsd;
      
      if (tokenPriceRaw && typeof tokenPriceRaw.toString === 'function') {
        // If it's a BigNumber or has toString method
        try {
          // Try to format as ethers units (18 decimals)
          tokensPerUsd = parseFloat(ethers.utils.formatUnits(tokenPriceRaw, 18));
        } catch (formatError) {
          console.error("Error formatting token price:", formatError);
          // Fallback: try to convert directly
          tokensPerUsd = parseFloat(tokenPriceRaw.toString()) / 1e18;
        }
      } else if (typeof tokenPriceRaw === 'number') {
        // If it's already a number, assume it's in wei format
        tokensPerUsd = tokenPriceRaw / 1e18;
      } else if (typeof tokenPriceRaw === 'string') {
        // If it's a string, parse it and convert from wei
        tokensPerUsd = parseFloat(tokenPriceRaw) / 1e18;
      } else {
        // Fallback to default price
        console.warn("Unexpected token price format:", tokenPriceRaw);
        tokensPerUsd = 1 / tokenPrice; // Use inverse of current price
      }
      
      console.log("Tokens per USD:", tokensPerUsd, "Raw value:", tokenPriceRaw);
      
      // Validate the tokens per USD (should be positive)
      if (isNaN(tokensPerUsd) || tokensPerUsd <= 0) {
        console.warn("Invalid tokens per USD received:", tokensPerUsd, "Using default price");
        // Calculate price per token (default to 0.0015)
        const price = 0.0015;
        
        // Use setTimeout to debounce the state update
        setTimeout(() => {
          setTokenPrice(price);
          setLastTokenPriceUpdate(now);
        }, 0);
        
        console.log("Setting token price to default:", price);
        return price;
      }
      
      // Calculate price per token (1/tokensPerUsd)
      const price = 1 / tokensPerUsd;
      console.log("Calculated token price in USD:", price);
      
      // Check if the price is suspiciously high (might be the raw value)
      if (price > 100) {
        console.warn("Calculated price seems too high, might be the raw value. Inverting it.");
        const correctedPrice = 1 / price;
        console.log("Corrected price:", correctedPrice);
        
        // Use setTimeout to debounce the state update
        setTimeout(() => {
          setTokenPrice(correctedPrice);
          setLastTokenPriceUpdate(now);
        }, 0);
        
        return correctedPrice;
      }
      
      // Update state with debouncing
      setTimeout(() => {
        setTokenPrice(price);
        setLastTokenPriceUpdate(now);
      }, 0);
      
      console.log("Token price state updated to:", price);
      
      return price;
    } catch (error) {
      console.error("Error fetching token price:", error);
      console.warn("Using default token price");
      return tokenPrice; // Return current price
    } finally {
      setIsLoadingTokenPrice(false);
    }
  };

  // Function to fetch the currentPhaseEndTimestamp from the contract
  const fetchPhaseEndTimestamp = async (forceUpdate = false) => {
    try {
      // Check if we've fetched the timestamp recently and it's not a forced update
      const now = Date.now();
      if (!forceUpdate && 
          phaseEndTimestamp !== null && 
          now - lastPhaseEndUpdate < DATA_UPDATE_INTERVAL) {
        console.log("Skipping phase end timestamp update - last update was", 
                   Math.round((now - lastPhaseEndUpdate) / 1000), "seconds ago");
        return phaseEndTimestamp;
      }
      
      // Use the provider with the RPC URL from environment variables
      const provider = getProvider();
      const contract = new ethers.Contract(contractAddress, contractABI, provider);
      
      // Call the currentPhaseEndTimestamp function
      const timestamp = await contract.currentPhaseEndTimestamp();
      
      // Handle different return types
      let timestampInSeconds;
      
      if (timestamp && typeof timestamp.toNumber === 'function') {
        // If it's a BigNumber
        timestampInSeconds = timestamp.toNumber();
      } else if (typeof timestamp === 'number') {
        // If it's already a number
        timestampInSeconds = timestamp;
      } else if (typeof timestamp === 'string') {
        // If it's a string, parse it
        timestampInSeconds = parseInt(timestamp, 10);
      } else {
        // Fallback: try to convert to number or use default
        try {
          timestampInSeconds = Number(timestamp);
        } catch (e) {
          console.error("Could not convert timestamp to number:", e);
          // Don't set a default timestamp if we can't convert it
          setPhaseEndTimestamp(null);
          return null;
        }
      }
      
      console.log("Phase end timestamp:", timestampInSeconds, "Raw value:", timestamp);
      
      // Validate the timestamp (should be in the future)
      const nowInSeconds = Math.floor(Date.now() / 1000);
      if (isNaN(timestampInSeconds) || timestampInSeconds <= nowInSeconds) {
        console.warn("Phase has ended - timestamp is in the past:", timestampInSeconds);
        setPhaseEndTimestamp(null);
        return null;
      }
      
      setPhaseEndTimestamp(timestampInSeconds);
      setLastPhaseEndUpdate(now);
      return timestampInSeconds;
    } catch (error) {
      console.error("Error fetching phase end timestamp:", error);
      setError("Failed to fetch phase end timestamp.");
      setPhaseEndTimestamp(null);
      return null;
    }
  };

  // Function to fetch the current phase ID from the contract
  const fetchCurrentPhaseId = async (forceUpdate = false) => {
    try {
      // Check if we've fetched the phase ID recently and it's not a forced update
      const now = Date.now();
      if (!forceUpdate && 
          currentPhaseId > 0 && 
          now - lastPhaseIdUpdate < DATA_UPDATE_INTERVAL) {
        console.log("Skipping phase ID update - last update was", 
                   Math.round((now - lastPhaseIdUpdate) / 1000), "seconds ago");
        return currentPhaseId;
      }
      
      setIsLoadingPhaseId(true);
      
      // Use the provider with the RPC URL from environment variables
      const provider = getProvider();
      const contract = new ethers.Contract(contractAddress, contractABI, provider);
      
      // Call the onGoingPhaseId function
      const phaseId = await contract.onGoingPhaseId();
      
      // Handle different return types
      let phaseIdNumber;
      
      if (phaseId && typeof phaseId.toNumber === 'function') {
        // If it's a BigNumber
        phaseIdNumber = phaseId.toNumber();
      } else if (typeof phaseId === 'number') {
        // If it's already a number
        phaseIdNumber = phaseId;
      } else if (typeof phaseId === 'string') {
        // If it's a string, parse it
        phaseIdNumber = parseInt(phaseId, 10);
      } else {
        // Fallback: try to convert to number or use default
        try {
          phaseIdNumber = Number(phaseId);
        } catch (e) {
          console.error("Could not convert phase ID to number:", e);
          phaseIdNumber = 1; // Default to phase 1
        }
      }
      
      console.log("Current phase ID:", phaseIdNumber, "Raw value:", phaseId);
      
      // Validate the phase ID (should be a positive integer)
      if (isNaN(phaseIdNumber) || phaseIdNumber <= 0) {
        console.warn("Invalid phase ID received:", phaseIdNumber, "Using default phase 1");
        phaseIdNumber = 1;
      }
      
      // Update state
      setCurrentPhaseId(phaseIdNumber);
      setLastPhaseIdUpdate(now);
      
      return phaseIdNumber;
    } catch (error) {
      console.error("Error fetching current phase ID:", error);
      setError("Failed to fetch current phase ID. Using default phase 1.");
      return 1; // Default to phase 1 if there's an error
    } finally {
      setIsLoadingPhaseId(false);
    }
  };

  // Calculate countdown based on phaseEndTimestamp
  const calculateCountdown = () => {
    if (!phaseEndTimestamp) return;

    const now = Math.floor(Date.now() / 1000); // Current time in seconds
    const timeRemaining = phaseEndTimestamp - now;

    if (timeRemaining <= 0) {
      // Phase has ended - set all values to 0
      setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      return;
    }

    // Calculate days, hours, minutes, seconds
    const days = Math.floor(timeRemaining / (60 * 60 * 24));
    const hours = Math.floor((timeRemaining % (60 * 60 * 24)) / (60 * 60));
    const minutes = Math.floor((timeRemaining % (60 * 60)) / 60);
    const seconds = Math.floor(timeRemaining % 60);

    setCountdown({ days, hours, minutes, seconds });
  };

  // Function to check if the contract already has an allowance
  const checkAllowance = async (tokenAddress: string, ownerAddress: string, spenderAddress: string, amount: ethers.BigNumber) => {
    try {
      const provider = getProvider();
      const tokenContract = new ethers.Contract(tokenAddress, erc20ABI, provider);
      
      // Get current allowance
      const currentAllowance = await tokenContract.allowance(ownerAddress, spenderAddress);
      
      // Return true if current allowance is sufficient
      return currentAllowance.gte(amount);
    } catch (error) {
      console.error("Error checking allowance:", error);
      return false;
    }
  };

  // Function to check if user has sufficient balance for purchase
  const checkSufficientBalance = () => {
    if (!purchaseAmount || !walletBalance) return true;
    
    // Handle case when walletBalance is "Error" or "Loading..."
    if (walletBalance === 'Error' || walletBalance === 'Loading...') {
      return true; // Don't show insufficient balance if we don't know the actual balance
    }
    
    try {
      // Parse values as floats for comparison
      const purchaseValue = parseFloat(purchaseAmount);
      const balance = parseFloat(walletBalance);
      
      // Return true if balance or purchaseValue is NaN (invalid)
      if (isNaN(balance) || isNaN(purchaseValue)) return true;
      
      console.log("Balance Check:", {
        balance: balance,
        purchaseValue: purchaseValue,
        token: selectedToken
      });
      
      // For ETH, we need to leave some for gas
      if (selectedToken === 'REL') {
        // Leave 0.001 ETH for gas (reduced from 0.005 to be more flexible)
        const hasEnough = balance >= (purchaseValue + 0.001);
        console.log(`ETH balance check: ${balance} >= ${purchaseValue + 0.001} = ${hasEnough}`);
        return hasEnough;
      } else {
        // For tokens, we can use the full balance
        const hasEnough = balance >= purchaseValue;
        console.log(`Token balance check: ${balance} >= ${purchaseValue} = ${hasEnough}`);
        return hasEnough;
      }
    } catch (error) {
      console.error("Error comparing balances:", error);
      return true; // Don't show insufficient balance if there's an error in calculation
    }
  };

  // Fetch total tokens sold from API
  const fetchTokenSalesData = async (forceUpdate = false) => {
    try {
      // Check if we've fetched the data recently and it's not a forced update
      const now = Date.now();
      if (!forceUpdate && 
          totalTokensSold !== '0' && 
          now - lastTokenSalesUpdate < DATA_UPDATE_INTERVAL) {
        console.log("Skipping token sales data update - last update was", 
                   Math.round((now - lastTokenSalesUpdate) / 1000), "seconds ago");
        return;
      }
      
      setIsLoadingTokenSales(true);
      
      // Always pass the current phase ID to get phase-specific data
      console.log("Fetching token sales data for phase:", currentPhaseId);
      const totalSold = await fetchTotalTokensSold(currentPhaseId);
      setTotalTokensSold(totalSold);
      
      // Ensure we have the latest token price before calculating USD value
      const currentTokenPrice = await fetchTokenPrice(forceUpdate);
      
      // Calculate USD value with the latest token price
      const usdValue = calculateUsdValue(totalSold, currentTokenPrice);
      setUsdValueRaised(usdValue);
      
      // Calculate progress percentage using the phase-specific target
      const progress = calculateProgress(usdValue, getTargetUsdValue());
      setProgressPercentage(progress);
      
      // Update last update timestamp
      setLastTokenSalesUpdate(now);
    } catch (error) {
      console.error('Error fetching token sales data:', error);
      
      // If we already have data, keep using it instead of resetting to 0
      if (totalTokensSold === '0') {
        // Set fallback values only if we don't have any data yet
        setTotalTokensSold('0');
        setUsdValueRaised(0);
        setProgressPercentage(0);
      }
      
      // Don't show loading indicator if we have some data to display
      if (usdValueRaised > 0) {
        setIsLoadingTokenSales(false);
      }
    } finally {
      // Always set loading to false after a delay to prevent UI flashing
      setTimeout(() => {
        setIsLoadingTokenSales(false);
      }, 500);
    }
  };

  // Function to fetch user's purchased tokens
  const fetchUserTokens = async (forceUpdate = false) => {
    if (!isConnected || !address) {
      setUserTokensPurchased('0');
      return;
    }
    
    // Check if we've fetched the data recently and it's not a forced update
    const now = Date.now();
    if (!forceUpdate && 
        userTokensPurchased !== '0' && 
        now - lastUserTokensUpdate < DATA_UPDATE_INTERVAL) {
      console.log("Skipping user tokens update - last update was", 
                 Math.round((now - lastUserTokensUpdate) / 1000), "seconds ago");
      return;
    }
    
    try {
      setIsLoadingUserTokens(true);
      const tokenData = await fetchTokenSalesByAddress(address, currentPhaseId);
      setUserTokensPurchased(tokenData.formattedAmount);
      setLastUserTokensUpdate(now);
    } catch (error) {
      console.error('Error fetching user token purchases:', error);
      // Keep existing value if we have one
      if (userTokensPurchased === '0') {
        setUserTokensPurchased('0');
      }
    } finally {
      setIsLoadingUserTokens(false);
    }
  };

  // Function to handle token purchase
  const handleBuyToken = async () => {
    if (!isConnected || !address) {
      setError("Please connect your wallet first");
      return;
    }

    if (!purchaseAmount || parseFloat(purchaseAmount) <= 0) {
      setError("Please enter a valid amount");
      return;
    }
    
    // Check if user has sufficient balance
    if (!checkSufficientBalance()) {
      setError(`Insufficient ${selectedToken === 'REL' ? 'ETH' : selectedToken} balance. Please enter a smaller amount.`);
      return;
    }

    // Hide retry button
    setShowRetry(false);

    // Clear any existing timeout
    if (transactionTimeoutId) {
      clearTimeout(transactionTimeoutId);
    }

    // Set a timeout to reset the transaction state after 2 minutes
    const timeoutId = setTimeout(() => {
      if (isTransacting) {
        console.log("Transaction timeout reached");
        setIsTransacting(false);
        setTransactionStatus('');
        setError("Transaction timed out. Please try again or check your wallet for pending transactions.");
        setShowRetry(true);
      }
    }, 120000); // 2 minutes
    
    setTransactionTimeoutId(timeoutId);

    try {
      setIsTransacting(true);
      setTransactionStatus('Preparing transaction...');
      setError(''); // Clear any previous errors
      
      console.log("Starting purchase process with", selectedToken, "for amount", purchaseAmount);
      
      // Check if window.ethereum is available for transactions
      if (window.ethereum) {
        try {
          // Request accounts explicitly to ensure wallet is ready
          // Cast window.ethereum to any to avoid TypeScript errors
          const ethereum = window.ethereum as any;
          await ethereum.request({ method: 'eth_requestAccounts' });
          
          const provider = new ethers.providers.Web3Provider(window.ethereum as any);
          const signer = provider.getSigner();
          const contract = new ethers.Contract(contractAddress, contractABI, signer);
          
          // Use the referral address if available, otherwise use null address
          const refAddress = referralAddress || "0x0000000000000000000000000000000000000000";
          console.log("Using referral address:", refAddress);
          
          // Convert purchase amount to wei (for ETH) or token units (for USDT/USDC)
          let tx;
          
          if (selectedToken === 'REL') {
            // Buy with ETH
            setTransactionStatus('Confirm the ETH transaction in your wallet...');
            console.log("Preparing ETH transaction");
            const ethAmount = ethers.utils.parseEther(purchaseAmount);
            console.log("ETH amount in wei:", ethAmount.toString());
            
            try {
              // Explicitly check if the wallet is on the correct network
              const network = await provider.getNetwork();
              console.log("Current network:", network.name, network.chainId);
              
              // Estimate gas to ensure transaction can proceed
              const gasEstimate = await contract.estimateGas.BuyWithETH(refAddress, { value: ethAmount });
              console.log("Gas estimate:", gasEstimate.toString());
              
              // Add 20% buffer to gas estimate
              const gasLimit = gasEstimate.mul(120).div(100);
              
              tx = await contract.BuyWithETH(refAddress, { 
                value: ethAmount,
                gasLimit: gasLimit
              });
              console.log("ETH transaction submitted:", tx.hash);
            } catch (ethError: any) {
              console.error("Error in ETH transaction:", ethError);
              
              let errorMessage = "ETH transaction failed. Please try again.";
              
              // Check for specific error messages
              if (ethError.message && ethError.message.includes("user rejected")) {
                errorMessage = "Transaction rejected by user";
              } else if (ethError.message && ethError.message.includes("insufficient funds")) {
                errorMessage = "Insufficient ETH for transaction and gas fees";
              } else if (ethError.message && ethError.message.includes("gas required exceeds allowance")) {
                errorMessage = "Gas required exceeds allowance. Try reducing the amount";
              } else if (ethError.message) {
                errorMessage = `ETH transaction failed: ${ethError.message}`;
              }
              
              // Show error in alert dialog
              alert(errorMessage);
              
              throw new Error(errorMessage);
            }
          } else if (selectedToken === 'USDT' || selectedToken === 'USDC') {
            // For USDT and USDC, we need to approve the contract first
            const tokenAddress = selectedToken === 'USDT' ? usdtContractAddress : usdcContractAddress;
            console.log(`Using ${selectedToken} contract address:`, tokenAddress);
            
            if (!tokenAddress) {
              setError(`${selectedToken} contract address not found`);
              setIsTransacting(false);
              return;
            }
            
            // Create token contract instance
            const tokenContract = new ethers.Contract(tokenAddress, erc20ABI, signer);
            
            // Get token decimals
            let decimals;
            try {
              decimals = await tokenContract.decimals();
              console.log(`${selectedToken} decimals:`, decimals);
            } catch (decimalError) {
              console.error("Error getting token decimals:", decimalError);
              setError(`Failed to get ${selectedToken} token decimals. Please try again.`);
              setIsTransacting(false);
              return;
            }
            
            // Convert amount to token units
            const tokenAmount = ethers.utils.parseUnits(purchaseAmount, decimals);
            console.log(`${selectedToken} amount in smallest units:`, tokenAmount.toString());
            
            // Check if we already have sufficient allowance
            setTransactionStatus('Checking token allowance...');
            let hasAllowance = false;
            try {
              hasAllowance = await checkAllowance(tokenAddress, address, contractAddress, tokenAmount);
              console.log("Has sufficient allowance:", hasAllowance);
            } catch (allowanceError) {
              console.error("Error checking allowance:", allowanceError);
              // Continue with approval anyway if we can't check allowance
            }
            
            if (!hasAllowance) {
              // Show approval message
              setTransactionStatus(`Approve ${selectedToken} transfer. Please confirm in your wallet...`);
              
              try {
                // Approve the presale contract to spend tokens
                console.log(`Approving ${selectedToken} for amount:`, tokenAmount.toString());
                
                // Estimate gas for approval
                const approveGasEstimate = await tokenContract.estimateGas.approve(contractAddress, tokenAmount);
                console.log("Approval gas estimate:", approveGasEstimate.toString());
                
                // Add 20% buffer to gas estimate
                const approveGasLimit = approveGasEstimate.mul(120).div(100);
                
                const approveTx = await tokenContract.approve(contractAddress, tokenAmount, {
                  gasLimit: approveGasLimit
                });
                console.log("Approval transaction submitted:", approveTx.hash);
                
                setTransactionStatus('Waiting for approval transaction to be mined...');
                const approveReceipt = await approveTx.wait();
                console.log("Approval transaction confirmed:", approveReceipt);
              } catch (approvalError: any) {
                console.error("Approval error:", approvalError);
                
                let errorMessage = "Failed to approve token transfer. Please try again.";
                
                // Handle user rejection
                if (approvalError.code === 4001 || 
                    (approvalError.message && approvalError.message.includes("user rejected"))) {
                  errorMessage = "Transaction was rejected. Please approve the transaction to continue.";
                } else if (approvalError.message) {
                  errorMessage = `Failed to approve ${selectedToken} transfer: ${approvalError.message}`;
                }
                
                // Show error in alert dialog
                alert(errorMessage);
                
                throw new Error(errorMessage);
              }
            }
            
            // Now make the purchase
            setTransactionStatus(`Confirm the purchase in your wallet...`);
            try {
              // Estimate gas for purchase
              let purchaseGasEstimate;
              
              if (selectedToken === 'USDT') {
                purchaseGasEstimate = await contract.estimateGas.BuyWithUSDT(tokenAmount, refAddress);
              } else {
                purchaseGasEstimate = await contract.estimateGas.BuyWithUSDC(tokenAmount, refAddress);
              }
              
              console.log("Purchase gas estimate:", purchaseGasEstimate.toString());
              
              // Add 20% buffer to gas estimate
              const purchaseGasLimit = purchaseGasEstimate.mul(120).div(100);
              
              if (selectedToken === 'USDT') {
                console.log("Calling BuyWithUSDT with amount:", tokenAmount.toString());
                tx = await contract.BuyWithUSDT(tokenAmount, refAddress, {
                  gasLimit: purchaseGasLimit
                });
              } else {
                console.log("Calling BuyWithUSDC with amount:", tokenAmount.toString());
                tx = await contract.BuyWithUSDC(tokenAmount, refAddress, {
                  gasLimit: purchaseGasLimit
                });
              }
              console.log("Purchase transaction submitted:", tx.hash);
            } catch (purchaseError: any) {
              console.error("Error in purchase transaction:", purchaseError);
              
              let errorMessage = "Purchase transaction failed. Please try again.";
              
              // Check for specific error messages
              if (purchaseError.code === 4001 || 
                  (purchaseError.message && purchaseError.message.includes("user rejected"))) {
                errorMessage = "Transaction was rejected by user";
              } else if (purchaseError.message) {
                errorMessage = `Purchase failed: ${purchaseError.message}`;
              }
              
              // Show error in alert dialog
              alert(errorMessage);
              
              throw new Error(errorMessage);
            }
          }
          
          // Wait for transaction to be mined
          setTransactionStatus('Processing transaction. Please wait...');
          try {
            const receipt = await tx.wait();
            console.log("Transaction confirmed:", receipt);
          } catch (waitError: any) {
            console.error("Error waiting for transaction:", waitError);
            
            let errorMessage = "Error while processing transaction. It may still complete.";
            if (waitError.message) {
              errorMessage = `Transaction processing error: ${waitError.message}`;
            }
            
            // Show error in alert dialog
            alert(errorMessage);
            
            throw new Error(errorMessage);
          }
          
          // Clear inputs after successful purchase
          setPurchaseAmount('');
          setTokenAmount('');
          setTransactionStatus('');
          setError("");
          
          // Show success message
          alert("Purchase successful!");
          
          // Refresh wallet balance
          fetchWalletBalance();
          
          // Refresh token sales data
          fetchTokenSalesData();
          
          // Refresh user's purchased tokens
          if (isConnected && address) {
            try {
              setIsLoadingUserTokens(true);
              const tokenData = await fetchTokenSalesByAddress(address, currentPhaseId);
              setUserTokensPurchased(tokenData.formattedAmount);
            } catch (userTokensError) {
              console.error("Error refreshing user tokens:", userTokensError);
            } finally {
              setIsLoadingUserTokens(false);
            }
          }
        } catch (walletError: any) {
          console.error("Wallet interaction error:", walletError);
          throw walletError;
        }
      } else {
        console.error("Ethereum object not found, install MetaMask.");
        setError("Please install MetaMask to make a purchase.");
      }
    } catch (error: any) {
      console.error("Error making purchase:", error);
      
      let errorMessage = "Transaction failed. Please try again.";
      
      // Handle user rejection
      if (error.code === 4001 || 
          (error.message && error.message.includes("user rejected"))) {
        errorMessage = "Transaction was rejected. Please approve the transaction to continue.";
      } 
      // Handle allowance errors
      else if (error.message && error.message.includes("transfer amount exceeds allowance")) {
        errorMessage = "Insufficient token allowance. Please approve the contract to spend your tokens.";
      }
      // Handle insufficient balance
      else if (error.message && error.message.includes("insufficient funds")) {
        errorMessage = "Insufficient balance for this transaction.";
      }
      // Handle other errors with specific message
      else if (error.message) {
        errorMessage = `Transaction failed: ${error.message}`;
      }
      
      // Show error in alert dialog
      alert(errorMessage);
      
      setTransactionStatus('');
      setShowRetry(true);
    } finally {
      setIsTransacting(false);
      
      // Clear the timeout when the transaction is complete
      if (transactionTimeoutId) {
        clearTimeout(transactionTimeoutId);
        setTransactionTimeoutId(null);
      }
    }
  };

  // Function to reset error state and retry transaction
  const handleRetry = () => {
    setError('');
    setShowRetry(false);
    handleBuyToken();
  };

  // Parse URL for referral parameter when component mounts
  useEffect(() => {
    const parseReferralFromUrl = () => {
      if (typeof window !== 'undefined') {
        // Check for hash in URL
        const hash = window.location.hash;
        
        // Look for the BuyNow section with ref parameter
        if (hash) {
          // Check if the hash contains BuyNow?ref=
          if (hash.includes('BuyNow?ref=')) {
            // Extract the referral address
            const refParam = hash.split('?ref=')[1];
            
            // Validate that it's a proper Ethereum address
            if (refParam && ethers.utils.isAddress(refParam)) {
              console.log("Referral address found:", refParam);
              setReferralAddress(refParam);
            } else {
              console.log("Invalid referral address in URL");
            }
          } else {
            console.log("No referral parameter found in URL hash");
          }
        }
      }
    };
    
    parseReferralFromUrl();
  }, []);

  // Fetch phase end timestamp and ETH price when component mounts
  useEffect(() => {
    const initializeContractData = async () => {
      try {
        // First fetch the current phase ID
        const phaseId = await fetchCurrentPhaseId(true);
        
        // Then fetch the phase end timestamp
        await fetchPhaseEndTimestamp(true);
        
        // Then fetch the token price
        await fetchTokenPrice(true); // Force update on initial load
        
        // Then fetch the ETH price
        await fetchEthPrice(true);
        
        // Finally fetch token sales data after all other data is loaded
        await fetchTokenSalesData(true);
      } catch (error) {
        console.error("Error initializing contract data:", error);
      }
    };
    
    initializeContractData();
  }, []);

  // Update countdown every second
  useEffect(() => {
    if (!phaseEndTimestamp) return;

    const interval = setInterval(calculateCountdown, 1000);
    return () => clearInterval(interval);
  }, [phaseEndTimestamp]);

  // Update useEffect to fetch wallet balance when address or selected token changes
  useEffect(() => {
    if (isConnected && address) {
      // Clear the current balance and show loading state
      setWalletBalance('0');
      setIsLoadingWalletBalance(true);
      
      // Fetch balance for the currently selected token
      if (selectedToken) {
        fetchBalanceForToken(selectedToken);
      }
    } else {
      setWalletBalance('0');
      setIsLoadingWalletBalance(false);
      setFetchingBalanceForToken(null);
    }
  }, [isConnected, address, selectedToken]);

  // Fetch token sales data on component mount
  useEffect(() => {
    // We're now fetching token sales data in initializeContractData
    // to ensure proper order of operations
    // The data will be refreshed when the user clicks the refresh button
  }, []);
  
  // Add a new useEffect to refetch token sales data when phase ID changes
  useEffect(() => {
    // Only fetch if we have a valid phase ID
    if (currentPhaseId > 0) {
      console.log("Phase ID changed to", currentPhaseId, "- refetching token sales data");
      fetchTokenSalesData(true);
    }
  }, [currentPhaseId]);

  // Fetch user's purchased tokens when address changes
  useEffect(() => {
    fetchUserTokens(true);
  }, [isConnected, address, currentPhaseId]);

  // Function to set maximum available balance
  const handleMaxButtonClick = () => {
    if (!isConnected || !address || !walletBalance || parseFloat(walletBalance) <= 0) {
      return;
    }
    
    // For ETH, leave a small amount for gas
    if (selectedToken === 'REL') {
      // Leave 0.001 ETH for gas (reduced from 0.01)
      const balance = parseFloat(walletBalance);
      const gasBuffer = 0.001;
      const maxEth = Math.max(0, balance - gasBuffer);
      
      console.log("Max ETH calculation:", {
        balance: balance,
        gasBuffer: gasBuffer,
        maxEth: maxEth
      });
      
      if (maxEth > 0) {
        setPurchaseAmount(maxEth.toFixed(6));
        calculateTokensFromEth(maxEth.toFixed(6));
      }
    } else {
      // For tokens, use the full balance
      setPurchaseAmount(walletBalance);
      setTokenAmount((parseFloat(walletBalance) / tokenPrice).toFixed(2));
    }
  };

  // Clear any pending timeouts when component unmounts
  useEffect(() => {
    return () => {
      if (transactionTimeoutId) {
        clearTimeout(transactionTimeoutId);
      }
    };
  }, [transactionTimeoutId]);

  // Function to refresh all data
  const refreshAllData = async () => {
    // Fetch phase ID first as it might affect other data
    await fetchCurrentPhaseId(true);
    
    // Then fetch token price as it affects calculations
    await fetchTokenPrice(true); // Force update on refresh
    
    // Then fetch other data
    await fetchPhaseEndTimestamp(true);
    await fetchEthPrice(true);
    await fetchTokenSalesData(true);
    
    // Refresh user tokens if connected
    if (isConnected && address) {
      await fetchUserTokens(true);
    }
  };

  // Replace the existing useEffect for token price logging with this improved version
  useEffect(() => {
    // Only log when the token price actually changes
    if (tokenPrice > 0 && tokenPrice !== prevTokenPriceRef.current) {
      console.log("Token price updated:", tokenPrice, "Previous:", prevTokenPriceRef.current);
      prevTokenPriceRef.current = tokenPrice;
    }
  }, [tokenPrice]);

  return (
    <div className="bg-gray-400/10 rounded-lg p-6 max-w-md mx-auto text-center shadow-lg border border-yellow-500/30">
      <h1 className="text-[#F8C91E] font-bold text-xl mb-6">BUY IN BEFORE PRICE INCREASES!</h1>
      
      <div className="relative">
        <button 
          onClick={handleWalletButtonClick}
          disabled={isConnecting}
          className={`bg-gradient-to-b from-[#F8C91E] via-[#F8C91E] to-[#F0A730] hover:opacity-90 text-white font-bold py-2 px-4 rounded-lg w-4/5 mb-4 shadow-[0px_4px_17px_1px_#F8C91EB2] ${isConnecting ? 'opacity-75 cursor-not-allowed' : ''}`}
        >
          {isConnecting ? 'Connecting...' : isConnected ? formatAddress(address || '') : 'Connect Wallet'}
        </button>
      </div>
      
      {error && (
        <p className="text-red-500 text-sm mb-4">{error}</p>
      )}
      
      {/* Click outside handler for modal */}
      {showDisconnectModal && (
        <div 
          className="fixed inset-0 z-40"
          onClick={() => setShowDisconnectModal(false)}
        />
      )}
      
      <p className="text-[#F8C91E] mb-2">
        {isLoadingPhaseId ? (
          "Loading phase info..."
        ) : (
          `Phase ${currentPhaseId} Ends in`
        )}
      </p>
      
      {/* Countdown Timer Display */}
      <div className="flex justify-center gap-2 mb-4">
        <div className="bg-gray-800 rounded-md p-2 min-w-[60px]">
          <div className="text-[#F8C91E] text-xl font-bold">{countdown.days}</div>
          <div className="text-gray-400 text-xs">Days</div>
        </div>
        <div className="bg-gray-800 rounded-md p-2 min-w-[60px]">
          <div className="text-[#F8C91E] text-xl font-bold">{countdown.hours}</div>
          <div className="text-gray-400 text-xs">Hours</div>
        </div>
        <div className="bg-gray-800 rounded-md p-2 min-w-[60px]">
          <div className="text-[#F8C91E] text-xl font-bold">{countdown.minutes}</div>
          <div className="text-gray-400 text-xs">Mins</div>
        </div>
        <div className="bg-gray-800 rounded-md p-2 min-w-[60px]">
          <div className="text-[#F8C91E] text-xl font-bold">{countdown.seconds}</div>
          <div className="text-gray-400 text-xs">Secs</div>
        </div>
      </div>
      
      <div className="flex items-center justify-center gap-2 mb-4">
        <p className="text-[#F8C91E]">
          {isLoadingTokenSales ? (
            "Loading USD raised..."
          ) : (
            `USD Raised: $${usdValueRaised.toLocaleString(undefined, { maximumFractionDigits: 2 })}${!isNaN(getTargetUsdValue()) ? ` / $${getTargetUsdValue().toLocaleString()}` : ''}`
          )}
        </p>
        <button 
          onClick={() => refreshAllData()}
          disabled={isLoadingTokenSales || isLoadingPhaseId}
          className={`text-[#F8C91E] p-1 rounded-full hover:bg-gradient-to-b hover:from-[#F8C91E]/10 hover:via-[#F8C91E]/10 hover:to-[#F0A730]/10 transition-colors ${(isLoadingTokenSales || isLoadingPhaseId) ? 'opacity-50 cursor-not-allowed' : ''}`}
          title="Refresh data"
        >
          <RefreshCw size={16} className={`${(isLoadingTokenSales || isLoadingPhaseId) ? 'animate-spin' : ''}`} />
        </button>
      </div>
      
      {!isNaN(getTargetUsdValue()) && (
        <>
          <div className="w-full bg-gray-200 rounded-full h-4 mb-4">
            <div 
              className="bg-gradient-to-b from-[#F8C91E] via-[#F8C91E] to-[#F0A730] h-4 rounded-full transition-all duration-500 ease-in-out shadow-[0px_4px_17px_1px_#F8C91EB2]" 
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
        </>
      )}
      
      <p className="text-[#F8C91E] mb-4">
        {isLoadingUserTokens ? (
          "Loading your purchased tokens..."
        ) : (
          `Your Purchased $RYFN: ${parseFloat(userTokensPurchased).toLocaleString(undefined, { maximumFractionDigits: 2 })}`
        )}
      </p>
      
      <div className="border-t border-b border-gray-700 py-2 mb-4">
        <TokenPriceDisplay 
          tokenPrice={tokenPrice}
          currentPhaseId={currentPhaseId}
          isLoadingPhaseId={isLoadingPhaseId}
          isLoadingTokenPrice={isLoadingTokenPrice}
        />
      </div>
      
      <div className="flex justify-center space-x-2 mb-4">
        <button 
          className={`py-1 px-4 rounded-lg flex items-center ${selectedToken === 'REL' ? 'bg-gradient-to-b from-[#F8C91E] via-[#F8C91E] to-[#F0A730] text-white shadow-[0px_4px_17px_1px_#F8C91EB2]' : 'bg-yellow-100 text-gray-800'}`}
          onClick={() => handleTokenSelection('REL')}
        >
          <span className="mr-1">♦</span> ETH
        </button>
        <button 
          className={`py-1 px-4 rounded-lg flex items-center ${selectedToken === 'USDT' ? 'bg-gradient-to-b from-[#F8C91E] via-[#F8C91E] to-[#F0A730] text-white shadow-[0px_4px_17px_1px_#F8C91EB2]' : 'bg-teal-100 text-gray-800'}`}
          onClick={() => handleTokenSelection('USDT')}
        >
          <span className="mr-1">Ⓣ</span> USDT
        </button>
        <button 
          className={`py-1 px-4 rounded-lg flex items-center ${selectedToken === 'USDC' ? 'bg-gradient-to-b from-[#F8C91E] via-[#F8C91E] to-[#F0A730] text-white shadow-[0px_4px_17px_1px_#F8C91EB2]' : 'bg-blue-100 text-gray-800'}`}
          onClick={() => handleTokenSelection('USDC')}
        >
          <span className="mr-1">$</span> USDC
        </button>
      </div>
      
      {isConnected && (
        <p className="text-[#F8C91E] mb-4">
          Your {selectedToken === 'REL' ? 'ETH' : selectedToken} Balance: {
            isLoadingWalletBalance || fetchingBalanceForToken ? 
            'Loading...' : 
            walletBalance
          }
        </p>
      )}
      
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <p className="text-gray-400 text-sm text-left mb-1">You Pay</p>
          <div className="relative">
            <input 
              type="number" 
              value={purchaseAmount}
              onChange={handlePurchaseAmountChange}
              placeholder="0" 
              className={`w-full p-2 pr-20 rounded-lg bg-gray-800 text-white border ${!checkSufficientBalance() && purchaseAmount ? 'border-red-500' : 'border-gray-700'}`}
            />
            <div className="absolute inset-y-0 right-0 flex items-center">
              {isConnected && (
                <button 
                  onClick={handleMaxButtonClick}
                  className="mr-2 text-xs bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 font-medium py-1 px-2 rounded"
                >
                  MAX
                </button>
              )}
              <span className="text-gray-400 pr-3">{getTokenSymbol()}</span>
            </div>
          </div>
          {!checkSufficientBalance() && purchaseAmount && (
            <p className="text-red-500 text-xs text-left mt-1">
              Insufficient balance
            </p>
          )}
        </div>
        <div>
          <p className="text-gray-400 text-sm text-left mb-1">AMOUNT OF TOKENS</p>
          <div className="relative">
            <input 
              type="number" 
              value={tokenAmount}
              onChange={handleTokenAmountChange}
              placeholder="0" 
              className={`w-full p-2 pr-12 rounded-lg bg-gray-800 text-white border ${!checkSufficientBalance() && tokenAmount ? 'border-red-500' : 'border-gray-700'}`}
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              <span className="text-gray-400">
                {/* RYFN token symbol/image */}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="10" fill="#FFD700" fillOpacity="0.2" stroke="#FFD700" strokeWidth="1.5"/>
                  <text x="12" y="16" textAnchor="middle" fill="#FFD700" fontSize="10" fontWeight="bold">R</text>
                </svg>
              </span>
            </div>
          </div>
        </div>
      </div>
      
      <button 
        className={`bg-gradient-to-b from-[#F8C91E] via-[#F8C91E] to-[#F0A730] hover:opacity-90 text-white font-bold py-3 px-4 rounded-lg w-4/5 mb-6 shadow-[0px_4px_17px_1px_#F8C91EB2] ${(!isConnected || isTransacting || (!checkSufficientBalance() && purchaseAmount)) ? 'opacity-75 cursor-not-allowed' : ''}`}
        onClick={handleBuyToken}
        disabled={!isConnected || isTransacting || (!checkSufficientBalance() && !!purchaseAmount)}
      >
        {isTransacting ? 'Processing...' : 'Buy Now'}
      </button>
      
      {showRetry && !isTransacting && (
        <button 
          className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg mb-6"
          onClick={handleRetry}
        >
          Retry Transaction
        </button>
      )}
      
      {transactionStatus && (
        <div className="bg-blue-400/20 border border-blue-400/50 rounded-lg p-3 text-blue-400 text-sm mb-4">
          {transactionStatus}
        </div>
      )}
      
      <div className="bg-gray-100 rounded p-2 text-gray-600 text-xs overflow-hidden">
        <p className="truncate">{contractAddress}</p>
      </div>
    </div>
  );
};

export default TokenSaleCard;