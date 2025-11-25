import { useDynamicContext, useIsLoggedIn } from "@dynamic-labs/sdk-react-core";
import { isSolanaWallet } from "@dynamic-labs/solana";
import { useState, useEffect } from "react";
import { PublicKey, Transaction, Connection } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import "./Send.css";
import { RPC_URL, USDC_MINT } from "@/consts";

export default function Send() {
  const isLoggedIn = useIsLoggedIn();
  const { primaryWallet } = useDynamicContext();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [usdcBalance, setUsdcBalance] = useState<string | null>(null);
  const [isBalanceLoading, setIsBalanceLoading] = useState(false);
  const [txSignature, setTxSignature] = useState<string | null>(null);

  const fetchUsdcBalance = async () => {
    if (!primaryWallet || !isSolanaWallet(primaryWallet)) {
      setUsdcBalance(null);
      return;
    }

    setIsBalanceLoading(true);
    try {
      const connection = new Connection(RPC_URL, "confirmed");
      const walletPublicKey = new PublicKey(primaryWallet.address);

      // Find all token accounts owned by the wallet
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
        walletPublicKey,
        { programId: TOKEN_PROGRAM_ID }
      );

      // Find the USDC token account
      let balance = 0;
      for (const tokenAccount of tokenAccounts.value) {
        const accountData = tokenAccount.account.data.parsed.info;
        if (accountData.mint === USDC_MINT.toString()) {
          balance = accountData.tokenAmount.amount;
          break;
        }
      }

      // Convert from raw units to USDC (6 decimal places)
      const balanceInUsdc = (parseInt(balance.toString()) / 1_000_000).toFixed(
        6
      );
      setUsdcBalance(balanceInUsdc);
    } catch (error) {
      console.error("Error fetching USDC balance:", error);
      setUsdcBalance(null);
    } finally {
      setIsBalanceLoading(false);
    }
  };

  useEffect(() => {
    if (isLoggedIn && primaryWallet && isSolanaWallet(primaryWallet)) {
      fetchUsdcBalance();
    } else {
      setUsdcBalance(null);
    }
  }, [isLoggedIn, primaryWallet]);

  const sendUSDC = async () => {
    if (!primaryWallet || !isSolanaWallet(primaryWallet)) {
      setResult("Wallet not connected or not a Solana wallet");
      return;
    }

    if (!recipientAddress || !amount) {
      setResult("Please enter recipient address and amount");
      return;
    }

    try {
      setIsLoading(true);
      setResult("Preparing transaction...");

      let toAddress: PublicKey;
      try {
        toAddress = new PublicKey(recipientAddress);
      } catch (error) {
        setResult("Invalid recipient address");
        setIsLoading(false);
        return;
      }

      const amountInUsdcUnits = parseFloat(amount) * 1_000_000;

      const response = await fetch("/api/gas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          senderAddress: primaryWallet.address,
          recipientAddress: toAddress.toString(),
          amount: amountInUsdcUnits,
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(
          responseData.message || "Failed to prepare transaction"
        );
      }

      const { serializedTransaction } = responseData;
      console.log("Serialized transaction:", serializedTransaction);
      const signer = await primaryWallet.getSigner();

      setResult("Please sign the transaction...");

      try {
        setResult("Signing transaction...");
        const transaction = Transaction.from(
          Buffer.from(serializedTransaction, "base64")
        );

        const { signature } = await signer.signAndSendTransaction(transaction);

        setTxSignature(signature);
        setResult(`USDC transfer successful!`);
      } catch (err) {
        setTxSignature(null);
        setResult(
          `Error signing transaction: ${
            err instanceof Error ? err.message : String(err)
          }`
        );
      }
    } catch (error) {
      setTxSignature(null);
      setResult(
        `Error: ${error instanceof Error ? error.message : String(error)}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="send">
      <div className="usdc-transfer">
        <h2>Send USDC (Gasless)</h2>
        {isLoggedIn && primaryWallet && (
          <div className="balance-container">
            <p>
              Your USDC Balance:
              <span className="balance-amount">
                {isBalanceLoading
                  ? "Loading..."
                  : usdcBalance
                  ? `${usdcBalance} USDC`
                  : "0 USDC"}
              </span>
            </p>
            <button
              onClick={fetchUsdcBalance}
              className="btn btn-refresh"
              title="Refresh balance"
              disabled={isBalanceLoading}
            >
              ↻
            </button>
          </div>
        )}
        <div className="input-group">
          <input
            type="text"
            placeholder="Recipient Address"
            value={recipientAddress}
            onChange={(e) => setRecipientAddress(e.target.value)}
          />
          <input
            type="text"
            placeholder="Amount in USDC"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <button
            className="btn btn-primary"
            onClick={sendUSDC}
            disabled={
              !isLoggedIn ||
              !primaryWallet ||
              isLoading ||
              !recipientAddress ||
              !amount
            }
          >
            {isLoading ? "Processing..." : "Send USDC"}
          </button>
        </div>
      </div>

      {result && (
        <div className="result">
          <p className="result-message">{result}</p>
          {txSignature && (
            <div className="tx-details">
              <p className="tx-signature">
                <span>Signature:</span> {txSignature}
              </p>
              <a
                href={`https://explorer.solana.com/tx/${txSignature}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="explorer-link"
              >
                View on Solana Explorer
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
