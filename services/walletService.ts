/**
 * Service to handle wallet connection and referral data
 */

/**
 * Interface for the wallet connection response
 */
interface WalletConnectionResponse {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Connects a wallet address and handles referral data if present
 * @param {string} address - The wallet address to connect
 * @returns {Promise<WalletConnectionResponse>} - Response from the connection attempt
 */
export const connectWallet = async (address: string): Promise<WalletConnectionResponse> => {
  try {

    const hash = window.location.hash; // Example: "#BuyNow?ref=0xABCDEF..."
    let ref = null;
    if (hash.includes('?')) {
      const queryString = hash.split('?')[1]; // "ref=0xABCDEF..."
      const params = new URLSearchParams(queryString);
      ref = params.get('ref');
    //   setReferral(ref);
    }

    // Get the current URL to extract referral parameter
    // const url = new URL(window.location.href);
    // const refParam = url.searchParams.get('ref');

    console.log(`Connecting wallet with ref parameter: ${ref}`);
    
    // Use environment variable for API URL with fallback
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3004';
    let apiUrl = `${baseUrl}/api/connectwallet`;
    
    // Add ref parameter to query string if present
    if (ref) {
      apiUrl += `?ref=${ref}`;
    }
    
    console.log(`Connecting wallet to: ${apiUrl}`);
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ address, ref })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API request failed with status ${response.status}:`, errorText);
      throw new Error(`API request failed with status ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error connecting wallet:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    };
  }
};