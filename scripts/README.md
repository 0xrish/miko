# Solana Asset Transfer Scripts

This directory contains scripts to transfer all SOL and SPL tokens from a wallet to a specified destination address.

## Files

- `transfer-all-assets-dry-run.js` - Safe analysis script that shows what would be transferred
- `transfer-all-assets.js` - Actual transfer script that executes the transfers
- `README.md` - This documentation file

## Target Destination

All assets will be transferred to: `EQ1iJf9TGTGs163zcsoKq1JgrXdDK2KGAdoYtB1adoev`

## Prerequisites

1. Node.js installed
2. A plain JSON wallet file exists in the relayer/secrets directory
3. The scripts are configured to use the correct wallet file path

## Configuration

The scripts are currently configured to use: `relayer/secrets/G1uzkCoBaw2txLGSPcv4hbgDCh43rpT8nafnmCBmyJXV.json`

To use a different wallet, update the `WALLET_PATH` constant in both scripts.

## Usage

### Step 1: Dry Run (Recommended First)

Always run the dry-run script first to see what assets would be transferred:

```bash
# From the project root directory
node scripts/transfer-all-assets-dry-run.js
```

This will show you:
- The source wallet address
- SOL balance and how much would be transferred
- All SPL tokens with balances
- Summary of what transfers would be executed

### Step 2: Execute Actual Transfers

⚠️ **WARNING: This will actually transfer all assets. Make sure you've reviewed the dry-run output first!**

```bash
# From the project root directory
node scripts/transfer-all-assets.js
```

## Environment Variables

- `SOLANA_RPC` - Custom Solana RPC endpoint (optional, defaults to mainnet-beta)

## How It Works

1. **Wallet Loading**: Loads the wallet from a plain JSON file containing the private key
2. **Asset Discovery**: Scans for SOL balance and all SPL token accounts with non-zero balances
3. **Transfer Execution**: Transfers all assets to the destination wallet
4. **Transaction Confirmation**: Waits for transaction confirmations and provides signatures

## Wallet Format

The scripts expect wallet files in plain JSON format:

```json
{
  "publicKey": "...",
  "secretKey": [1, 2, 3, ...],
  "createdAt": 1234567890,
  "used": false
}
```

## Security Notes

- Wallet files contain unencrypted private keys
- Ensure proper file system permissions on the secrets directory
- Never commit wallet files to version control
- Consider using environment-specific access controls

## Error Handling

The scripts include comprehensive error handling for:
- Network connectivity issues
- Insufficient balance scenarios
- Token account creation failures
- Transaction confirmation timeouts

## Troubleshooting

1. **Wallet not found**: Ensure the wallet file exists at the specified path
2. **Invalid wallet format**: Check that the wallet file contains a `secretKey` array
3. **Network errors**: Verify RPC endpoint connectivity
4. **Insufficient balance**: Ensure the wallet has enough SOL for transaction fees

## Example Output

```
🔄 SOLANA ASSET TRANSFER SCRIPT
================================

🔓 Loading encrypted wallet...
✅ Wallet loaded: 7oQfz3PvfFTvkAVdaf5R72Yx8BfoN7omx4EG2iWDsFrW

🚀 Starting asset transfer process...
📍 Source wallet: 7oQfz3PvfFTvkAVdaf5R72Yx8BfoN7omx4EG2iWDsFrW
📍 Destination wallet: EQ1iJf9TGTGs163zcsoKq1JgrXdDK2KGAdoYtB1adoev

💰 SOL Balance: 0.1 SOL
💎 SPL Tokens: 2 tokens with balances

📦 Transferring SPL tokens...
💎 Transferring 1000000 tokens (EPjFWdd5...)
✅ SPL token transfer completed: 2Z8r...

💰 Transferring remaining SOL...
💰 Transferring 0.099995 SOL...
✅ SOL transfer completed: 3Y9s...

📊 TRANSFER SUMMARY
==================
✅ SOL Transfer: 3Y9s...
✅ SPL Token Transfers: 2 successful

🎉 Asset transfer process completed!
📍 All assets transferred to: EQ1iJf9TGTGs163zcsoKq1JgrXdDK2KGAdoYtB1adoev
``` 