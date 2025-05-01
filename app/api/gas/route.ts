import {
  createTransferCheckedInstruction,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";
import { Connection, Keypair, PublicKey, Transaction } from "@solana/web3.js";
import { NextRequest, NextResponse } from "next/server";
import bs58 from "bs58";
import { RPC_URL, USDC_MINT } from "@/consts";

export const dynamic = "force-dynamic";

const PRIVATE_KEY = process.env.FEE_PAYER_PRIVATE_KEY || "";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { senderAddress, recipientAddress, amount } = body;

    if (!senderAddress || !recipientAddress || !amount) {
      return NextResponse.json(
        { success: false, message: "Missing required parameters" },
        { status: 400 }
      );
    }

    console.log(process.env);

    console.log("RPC_URL:", RPC_URL);
    console.log("PRIVATE_KEY:", PRIVATE_KEY);

    if (!RPC_URL || !PRIVATE_KEY) {
      return NextResponse.json(
        {
          success: false,
          message: "Environment variables not properly configured",
        },
        { status: 500 }
      );
    }

    const connection = new Connection(RPC_URL, "confirmed");

    const privateKeyBuffer = bs58.decode(PRIVATE_KEY);
    const feePayer = Keypair.fromSecretKey(new Uint8Array(privateKeyBuffer));

    let sender: PublicKey;
    let recipient: PublicKey;
    try {
      sender = new PublicKey(senderAddress);
      recipient = new PublicKey(recipientAddress);
    } catch (error) {
      return NextResponse.json(
        { success: false, message: "Invalid Solana address" },
        { status: 400 }
      );
    }

    const senderTokenAccount = await getAssociatedTokenAddress(
      USDC_MINT,
      sender
    );
    const recipientTokenAccount = await getAssociatedTokenAddress(
      USDC_MINT,
      recipient
    );

    const recipientTokenInfo = await connection.getAccountInfo(
      recipientTokenAccount
    );

    const instructions = [];

    if (!recipientTokenInfo) {
      instructions.push(
        createAssociatedTokenAccountInstruction(
          feePayer.publicKey,
          recipientTokenAccount,
          recipient,
          USDC_MINT
        )
      );
    }

    instructions.push(
      createTransferCheckedInstruction(
        senderTokenAccount,
        USDC_MINT,
        recipientTokenAccount,
        sender,
        BigInt(amount),
        6
      )
    );

    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash("confirmed");

    const transaction = new Transaction();
    transaction.recentBlockhash = blockhash;
    transaction.lastValidBlockHeight = lastValidBlockHeight;
    transaction.feePayer = feePayer.publicKey;
    instructions.forEach((instruction) => transaction.add(instruction));
    transaction.partialSign(feePayer);

    const serializedTransaction = bs58.encode(
      transaction.serialize({
        requireAllSignatures: false,
        verifySignatures: false,
      })
    );

    return NextResponse.json({
      success: true,
      serializedTransaction,
      message: transaction.serializeMessage().toString("base64"),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}
