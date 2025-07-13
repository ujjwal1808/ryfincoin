/**
 * Service to fetch token sales data from the backend API
 */

/**
 * Interface for the API response structure
 */
interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

/**
 * Interface for token sales data returned by the API
 */
export interface TokenSalesData {
  totalTokensPurchased: string;
  formattedAmount: string;
}

/**
 * Interface for the user progress data returned by the API
 */
export interface UserProgressData {
  address: string;
  totalUsdValue: number;
  rawTotalUsdValue: string;
  progressPercentage: number;
  tokenSales: number;
}

/**
 * Interface for the refresh response
 */
export interface RefreshResponse {
  address: string;
  totalUsdValue: number;
  rawTotalUsdValue: string;
  progressPercentage: number;
  tokenSales: number;
  lastRefreshed: string;
  message?: string;
}

/**
 * Fetches the total tokens sold from the backend API
 * @param {number} phaseId - Optional phase ID to filter by
 * @returns {Promise<string>} - Total amount of tokens sold
 */
export const fetchTotalTokensSold = async (phaseId?: number): Promise<string> => {
  try {
    // Use environment variable for API URL with fallback
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3004';
    let apiUrl = `${baseUrl}/api/token-sales/total`;
    
    // If phaseId is provided, use the phase-specific endpoint
    if (phaseId !== undefined) {
      apiUrl = `${baseUrl}/api/token-sales/phase/${phaseId}/total`;
    }
    
    console.log(`Fetching total tokens sold from: ${apiUrl}`);
    
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API request failed with status ${response.status}:`, errorText);
      throw new Error(`API request failed with status ${response.status}: ${errorText}`);
    }
    
    const data = await response.json() as ApiResponse<{ totalTokensSold: string }>;
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch total tokens sold');
    }
    
    return data.data.totalTokensSold;
  } catch (error) {
    console.error('Error fetching total tokens sold:', error);
    throw error;
  }
};

/**
 * Fetches token sales data for a specific address from the backend API
 * @param {string} address - Ethereum address to query
 * @param {number} phaseId - Optional phase ID to filter by
 * @returns {Promise<TokenSalesData>} - Token purchase data
 */
export const fetchTokenSalesByAddress = async (
  address: string, 
  phaseId?: number
): Promise<TokenSalesData> => {
  try {
    // Normalize the address to lowercase
    const normalizedAddress = address.toLowerCase();
    
    // Use environment variable for API URL with fallback
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3004';
    let apiUrl = `${baseUrl}/api/token-sales/address/${normalizedAddress}`;
    
    // If phaseId is provided, add it as a query parameter
    if (phaseId !== undefined) {
      apiUrl += `?phaseId=${phaseId}`;
    }
    
    console.log(`Fetching token sales for address from: ${apiUrl}`);
    
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API request failed with status ${response.status}:`, errorText);
      throw new Error(`API request failed with status ${response.status}: ${errorText}`);
    }
    
    const data = await response.json() as ApiResponse<TokenSalesData>;
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch token sales for address');
    }
    
    return data.data;
  } catch (error) {
    console.error(`Error fetching token sales for address ${address}:`, error);
    throw error;
  }
};

/**
 * Fetches the total USD value spent by a user across all phases
 * @param {string} address - Ethereum address of the user
 * @param {boolean} forceRefresh - Whether to force a refresh bypassing any caching
 * @returns {Promise<UserProgressData>} - User progress data including total USD value spent and progress percentage
 */
export const fetchTotalUsdValueSpentByUser = async (address: string, forceRefresh = false): Promise<UserProgressData> => {
  try {
    // Normalize the address to lowercase
    const normalizedAddress = address.toLowerCase();
    
    // Use environment variable for API URL with fallback
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3004';
    
    // Add a cache-busting parameter if forceRefresh is true
    let apiUrl = `${baseUrl}/api/token-sales/address/${normalizedAddress}/usd-value`;
    if (forceRefresh) {
      const timestamp = Date.now();
      apiUrl += `?_=${timestamp}`;
    }
    
    console.log('Fetching user progress from:', apiUrl);
    
    // Use cache: 'no-store' option when forceRefresh is true
    const fetchOptions: RequestInit = forceRefresh ? { cache: 'no-store' } : {};
    const response = await fetch(apiUrl, fetchOptions);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API request failed with status ${response.status}:`, errorText);
      throw new Error(`API request failed with status ${response.status}: ${errorText}`);
    }
    
    const data = await response.json() as ApiResponse<UserProgressData>;
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch total USD value spent by user');
    }
    
    return data.data;
  } catch (error) {
    console.error(`Error fetching total USD value spent for address ${address}:`, error);
    throw error;
  }
};

/**
 * Calculates the USD value of tokens sold
 * @param {string} totalTokensSold - Total amount of tokens sold
 * @param {number} tokenPrice - Price of one token in USD
 * @returns {number} - USD value of tokens sold
 */
export const calculateUsdValue = (totalTokensSold: string, tokenPrice: number): number => {
  try {
    const tokens = parseFloat(totalTokensSold);
    return tokens * tokenPrice;
  } catch (error) {
    console.error('Error calculating USD value:', error);
    return 0;
  }
};

/**
 * Calculates the progress percentage based on the USD value raised and the target
 * @param {number} usdValue - USD value raised
 * @param {number} target - Target USD value
 * @returns {number} - Progress percentage (0-100)
 */
export const calculateProgress = (usdValue: number, target: number): number => {
  if (usdValue <= 0 || target <= 0) {
    return 0;
  }
  
  const percentage = (usdValue / target) * 100;
  return Math.min(percentage, 100); // Cap at 100%
};

/**
 * Forces a refresh of the total USD value spent by a user
 * This will bypass any caching and query the Graph API directly
 * @param {string} address - Ethereum address of the user
 * @returns {Promise<UserProgressData>} - User progress data including total USD value spent and progress percentage
 */
export const refreshTotalUsdValueSpentByUser = async (address: string): Promise<UserProgressData> => {
  try {
    // Normalize the address to lowercase
    const normalizedAddress = address.toLowerCase();
    
    // Use environment variable for API URL with fallback
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3004';
    const apiUrl = `${baseUrl}/api/token-sales/address/${normalizedAddress}/refresh-usd-value`;
    
    console.log('Forcing refresh of user progress from:', apiUrl);
    
    // Use POST method for the refresh endpoint
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      // Check if it's a rate limit error
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After') || '60';
        throw new Error(`Rate limit exceeded. Please try again after ${retryAfter} seconds.`);
      }
      
      const errorText = await response.text();
      console.error(`API request failed with status ${response.status}:`, errorText);
      throw new Error(`API request failed with status ${response.status}: ${errorText}`);
    }
    
    const data = await response.json() as ApiResponse<RefreshResponse>;
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to refresh total USD value spent by user');
    }
    
    console.log('User progress data refreshed:', data.data);
    
    return {
      address: data.data.address,
      totalUsdValue: data.data.totalUsdValue,
      rawTotalUsdValue: data.data.rawTotalUsdValue,
      progressPercentage: data.data.progressPercentage,
      tokenSales: data.data.tokenSales
    };
  } catch (error) {
    console.error(`Error refreshing total USD value spent for address ${address}:`, error);
    throw error;
  }
};

/**
 * Interface for transaction data returned by the API
 */
export interface TransactionData {
  // Add specific transaction fields based on API response
  address: string;
  // Add other transaction-specific fields here
}

/**
 * Fetches transaction data for a specific address from the backend API
 * @param {string} address - Ethereum address to query
 * @returns {Promise<TransactionData>} - Transaction data for the address
 */
export const fetchTransactionsByAddress = async (address: string): Promise<TransactionData> => {
  try {
    // Normalize the address to lowercase
    const normalizedAddress = address.toLowerCase();
    
    // Use environment variable for API URL with fallback
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3004';
    const apiUrl = `${baseUrl}/api/transactions/0x57d580cee957ea3cd8f35cbfa905a1c997c216a3`;
    
    console.log(`Fetching transactions for address from: ${apiUrl}`);
    
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API request failed with status ${response.status}:`, errorText);
      throw new Error(`API request failed with status ${response.status}: ${errorText}`);
    }
    
    const data = await response.json() as ApiResponse<TransactionData>;
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch transactions for address');
    }
    
    return data.data;
  } catch (error) {
    console.error(`Error fetching transactions for address ${address}:`, error);
    throw error;
  }
};