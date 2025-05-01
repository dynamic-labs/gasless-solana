# Gasless Transactions on Solana Example

This repository demonstrates how to implement gasless transactions on Solana with Dynamic.

## Installation

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a `.env.local` file with your fee payer wallet's private key:

   ```
   FEE_PAYER_PRIVATE_KEY=your_private_key_here
   NEXT_PUBLIC_RPC=https://api.devnet.solana.com
   ```

   > ⚠️ **WARNING**: Never commit your private key to a repository or share it publicly.

3. Run the development server:

   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## How It Works

1. The client sends transaction details to the server
2. The server creates and partially signs the transaction, setting itself as the fee payer
3. The client receives the partially signed transaction
4. The user signs the transaction with their wallet
5. The transaction is submitted to the Solana network with fees paid by the server wallet

## Project Structure

- `/app/api/gas/route.ts` - API endpoint that prepares and partially signs transactions
- `/app/components/Send.tsx` - Frontend component for initiating transfers
- `/app/page.tsx` - Main application page incorporating Dynamic authentication

## Learn More

For a detailed explanation of how this works, check out our [comprehensive guide on implementing gasless transactions on Solana](https://docs.dynamic.xyz/wallets/using-wallets/solana/gasless-transactions).
