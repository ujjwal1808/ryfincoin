'use client';

import { useEffect } from 'react';
import { fetchTransactionsByAddress } from '../services/tokenSalesService';
import Page from '@/page';

export default function Home() {
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // Replace with actual address or get it from context/props
        const address = '0x123...'; // placeholder address
        const transactionData = await fetchTransactionsByAddress(address);
        console.log('Transaction data:', transactionData);
        // Handle the transaction data as needed
      } catch (error) {
        console.error('Error fetching initial transaction data:', error);
      }
    };

    fetchInitialData();
  }, []);

  return (
    <Page />
  );
}

// export default function SyntheticV0PageForDeployment() {
//   return <Page />
// }