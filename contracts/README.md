# Miko Vault - Solana Smart Contracts

A privacy-focused vault system built on Solana using the Anchor framework. This contract enables secure deposits, withdrawals, and private swaps through zero-knowledge proofs.

## 🏗️ Architecture

The vault system consists of a single Anchor program that manages user funds with the following key features:

- **Personal Vaults**: Each user gets their own Program Derived Address (PDA) vault
- **Secure Transfers**: Direct SOL deposits and withdrawals with balance tracking
- **Privacy Layer**: Foundation for zero-knowledge proof integration
- **Access Control**: Seed-based vault derivation ensures only owners can access their funds

## 📁 Directory Structure

```
contracts/
├── Anchor.toml              # Anchor configuration and program addresses
├── Cargo.toml              # Rust workspace configuration
├── package.json            # Node.js dependencies for testing
├── tsconfig.json           # TypeScript configuration
├── migrations/
│   └── deploy.ts           # Deployment scripts
├── programs/
│   └── vault/
│       ├── Cargo.toml      # Rust program dependencies
│       ├── Xargo.toml      # Cross-compilation configuration
│       └── src/
│           └── lib.rs      # Main vault program logic
└── tests/
    └── vault.ts            # Comprehensive test suite
```

## 🔧 Core Components

### Vault Program (`programs/vault/src/lib.rs`)

**Program ID**: `2aur2Det6v69t2iyPNSuZCBkMrU3SZv1EHCHfDS9yjwK`

#### Instructions

1. **`create_vault`**
   - Creates a new personal vault for a user
   - Uses PDA derived from user's public key + "vault" seed
   - Initializes vault account with zero balance

2. **`deposit`**
   - Transfers SOL from user to their vault
   - Updates vault balance tracking
   - Uses system program for native SOL transfers

3. **`withdraw`**
   - Transfers SOL from vault to specified recipient
   - Validates sufficient funds before transfer
   - Reduces vault balance accordingly

#### Account Structures

```rust
#[account]
pub struct VaultAccount {
    pub balance: u64,  // Tracked balance in lamports
}
```

#### PDA Derivation

Vaults are derived using:
- **Seeds**: `[user_public_key, "vault"]`
- **Program**: Vault program ID
- **Result**: Deterministic, unique vault address per user

## 🚀 Setup & Development

### Prerequisites

- [Rust](https://rustlang.org/tools/install) 1.70+
- [Solana CLI](https://docs.solana.com/cli/install-solana-cli-tools) 1.16+
- [Anchor CLI](https://www.anchor.lang.com/docs/installation) 0.31+
- [Node.js](https://nodejs.org/) 18+
- [Yarn](https://yarnpkg.com/)

### Installation

```bash
# Install dependencies
yarn install

# Build the program
anchor build

# Run tests
anchor test
```

### Configuration

The `Anchor.toml` file contains environment-specific configurations:

```toml
[programs.localnet]
vault = "2aur2Det6v69t2iyPNSuZCBkMrU3SZv1EHCHfDS9yjwK"

[programs.devnet]
my_vault_project = "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS"
```

## 🧪 Testing

The test suite (`tests/vault.ts`) covers:

- Vault creation and PDA derivation
- SOL deposits with balance verification
- Withdrawals to external wallets
- Error conditions and edge cases

```bash
# Run all tests
anchor test

# Test with verbose output
anchor test --provider.cluster localnet -- --reporter spec
```

### Test Scenarios

1. **Vault Creation**: Verifies PDA generation and account initialization
2. **Deposit Flow**: Tests SOL transfer and balance updates (0.001 SOL)
3. **Withdrawal Flow**: Tests partial withdrawal to external recipient (0.0005 SOL)
4. **Balance Validation**: Ensures accurate balance tracking throughout operations

## 🌐 Deployment

### Local Development

```bash
# Start local validator
solana-test-validator

# Deploy to localnet
anchor deploy
```

### Devnet Deployment

```bash
# Set cluster to devnet
solana config set --url devnet

# Deploy
anchor deploy --provider.cluster devnet
```

## 🔒 Security Features

- **PDA-based Access Control**: Only vault owners can perform operations
- **Balance Validation**: Prevents overdrafts and unauthorized transfers
- **Deterministic Addresses**: Consistent vault addresses across sessions
- **Native SOL Handling**: Direct integration with Solana's system program

## 🔮 Future Enhancements

- **Multi-token Support**: Extend beyond SOL to SPL tokens
- **Batch Operations**: Multiple deposits/withdrawals in single transaction
- **Governance Integration**: DAO-controlled vault parameters
- **Advanced Privacy**: Full zero-knowledge proof implementation
- **Cross-program Composability**: Integration with DeFi protocols

## 📚 API Reference

### Program Instructions

#### CreateVault
```rust
pub fn create_vault(_ctx: Context<CreateVault>) -> Result<()>
```

#### Deposit
```rust
pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()>
```

#### Withdraw
```rust
pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()>
```

### Error Codes

```rust
#[error_code]
pub enum VaultError {
    #[msg("Not enough funds to withdraw")]
    InsufficientFunds,
}
```


## 📄 License

This project is licensed under the ISC License - see the LICENSE file for details. 