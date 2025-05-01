import { PublicKey } from "@solana/web3.js";

export const USDC_MINT = new PublicKey(
  "Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr"
);
export const RPC_URL =
  process.env.NEXT_PUBLIC_RPC || "https://api.devnet.solana.com";
