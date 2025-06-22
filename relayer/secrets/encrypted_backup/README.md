# Encrypted Wallet Backup

These files contain encrypted wallet data that was moved during the encryption removal process.

## Files
- These are the original encrypted wallet files from the secrets folder
- They could not be automatically converted to plain format due to decryption issues
- The encryption logic has been removed from the relayer system

## Recovery
If you need to recover these wallets:
1. You'll need the original encryption key used to create them
2. Use the old version of `convert-wallets.js` (before encryption removal)
3. Or manually decrypt using the encryption algorithm that was used

## Current System
The relayer now stores wallet private keys directly as plain JSON in the secrets folder without encryption.
New wallets generated will be stored in plain format.

## Security Note
Make sure to properly secure the secrets folder since private keys are now stored in plain text. 