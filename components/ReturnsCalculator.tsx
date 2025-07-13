"use client";

import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';

const ReturnsCalculator = () => {
  const [tokenAmount, setTokenAmount] = useState(0);
  const [tokenPrice, setTokenPrice] = useState(0.01);
  const [worth, setWorth] = useState(0);
  const [currentPrice, setCurrentPrice] = useState(0.0015); // Starting with default but will fetch from contract
  
  // Create a provider using the RPC URL from environment variables (similar to TokenSaleCard)
  const getProvider = () => {
    // Check if we have an RPC URL from environment variables
    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL;
    
    // If we have an RPC URL, use it
    if (rpcUrl) {
      try {
        return new ethers.providers.JsonRpcProvider(rpcUrl);
      } catch (error) {
        console.error("Error creating provider with env RPC URL:", error);
        // Fall through to fallbacks
      }
    }
    
    // Fallback to public Sepolia RPC endpoints
    const fallbackUrls = [
      "https://rpc.sepolia.org",
      "https://eth-sepolia.public.blastapi.io",
      "https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161" // Public Infura key
    ];
    
    // Try each fallback URL
    for (const url of fallbackUrls) {
      try {
        return new ethers.providers.JsonRpcProvider(url);
      } catch (error) {
        console.error(`Error with fallback URL ${url}:`, error);
        // Continue to next fallback
      }
    }
    
    // If all else fails, throw an error
    throw new Error("Could not connect to any Ethereum network");
  };

  useEffect(() => {
    // Fetch the token price from the contract on component mount
    const fetchCurrentTokenPrice = async () => {
      try {
        const contractAddress = process.env.NEXT_PUBLIC_PRESALE_CONTRACT_ADDRESS || "";
        
        // Skip if contract address is not available
        if (!contractAddress) {
          console.error("Contract address not available");
          return;
        }
        
        // Basic ABI for the TokenPricePerUsdt function
        const contractABI = [
          "function TokenPricePerUsdt() view returns (uint256)"
        ];
        
        // Use the getProvider function to create a provider
        const provider = getProvider();
        const contract = new ethers.Contract(contractAddress, contractABI, provider);
        
        // Call the TokenPricePerUsdt function
        const tokenPriceRaw = await contract.TokenPricePerUsdt();
        
        // Process the token price from the contract
        let tokensPerUsd;
        
        if (tokenPriceRaw && typeof tokenPriceRaw.toString === 'function') {
          try {
            // Try to format as ethers units (18 decimals)
            tokensPerUsd = parseFloat(ethers.utils.formatUnits(tokenPriceRaw, 18));
          } catch (formatError) {
            // Fallback: try to convert directly
            tokensPerUsd = parseFloat(tokenPriceRaw.toString()) / 1e18;
          }
        } else if (typeof tokenPriceRaw === 'number') {
          tokensPerUsd = tokenPriceRaw / 1e18;
        } else if (typeof tokenPriceRaw === 'string') {
          tokensPerUsd = parseFloat(tokenPriceRaw) / 1e18;
        } else {
          throw new Error("Unexpected token price format");
        }
        
        // Calculate price per token (1/tokensPerUsd)
        let price = 1 / tokensPerUsd;
        
        // Sanity check: if price seems way too high, it might be the raw value
        if (price > 100) {
          price = 1 / price;
        }
        
        if (!isNaN(price) && price > 0) {
          setCurrentPrice(price);
        }
      } catch (error) {
        console.error("Error fetching token price:", error);
        // Keep the default price on error
      }
    };

    fetchCurrentTokenPrice();
  }, []);

  useEffect(() => {
    if (tokenAmount && tokenPrice) {
      // Calculate worth based on token amount and future price
      setWorth(tokenAmount * tokenPrice);
    } else {
      setWorth(0);
    }
  }, [tokenAmount, tokenPrice]);

  const handleTokenAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value) || 0;
    setTokenAmount(value);
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTokenPrice(parseFloat(e.target.value));
  };

  // Calculate investment amount in USD
  const investmentAmount = tokenAmount * currentPrice;

  // Calculate slider percentage for positioning the handle
  const sliderPercentage = (tokenPrice / 0.1) * 100;

  return (
    <div className="w-full mx-auto p-4 sm:p-6 rounded-xl bg-gray-900 border border-gray-800 shadow-lg">
      <h2 className="text-xl sm:text-2xl font-bold text-center text-[#F7C71F] mb-2 sm:mb-3">Returns Calculator</h2>
      
      <p className="text-center text-[#F7C71F] text-sm sm:text-base mb-4 sm:mb-6">
        Input the amount of $RYFN you're purchasing, and see what it would be worth at different prices.
      </p>
      
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-2 sm:mb-3">
        <label className="text-[#F7C71F] font-medium text-sm sm:text-base">RYFN TOKENS</label>
        <span className="text-[#F7C71F] font-medium text-sm sm:text-base mt-1 sm:mt-0">(${investmentAmount.toFixed(2)})</span>
      </div>
      
      <input
        type="number"
        value={tokenAmount || ''}
        onChange={handleTokenAmountChange}
        className="w-full mb-4 sm:mb-6 p-2 border border-gray-700 rounded bg-gray-800 text-[#F7C71F]"
        placeholder="0"
      />
      
      <div className="mb-2">
        <p className="text-[#F7C71F] text-sm sm:text-base mb-2">And the token price reaches: $ {tokenPrice.toFixed(3)}</p>
      </div>
      
      <div className="relative mb-4 sm:mb-6 pt-3 pb-3">
        {/* Custom slider track */}
        <div className="w-full h-2 bg-gray-700 rounded-full"></div>
        
        {/* Custom slider handle that moves with the value */}
        <div 
          className="absolute top-1/2 transform -translate-y-1/2"
          style={{ left: `${sliderPercentage}%` }}
        >
          <div className="w-4 h-4 sm:w-6 sm:h-6 bg-[#F7C71F] rounded-full shadow-md"></div>
        </div>
        
        {/* Hidden native slider for functionality */}
        <input
          type="range"
          min="0"
          max="0.1"
          step="0.001"
          value={tokenPrice}
          onChange={handleSliderChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>
      
      <div className="flex justify-between items-center">
        <div className="text-[#F7C71F] font-medium whitespace-nowrap text-left text-sm sm:text-base">
          <span className="inline-block">Your $RYFN</span><br />
          <span className="inline-block">would be worth</span>
        </div>
        <div className="text-[#F7C71F] text-xl sm:text-3xl font-bold">${worth.toFixed(2)}</div>
      </div>
    </div>
  );
};

export default ReturnsCalculator; 