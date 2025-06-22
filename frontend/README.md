# Miko Vault - Frontend Application

A modern, privacy-focused React frontend for interacting with the Miko Vault system on Solana. Built with TypeScript, Vite, and shadcn/ui components for a seamless user experience.

## 🏗️ Architecture

The frontend is a single-page application (SPA) that provides a complete interface for:

- **Wallet Integration**: Seamless connection with Solana wallets
- **Vault Management**: Create, deposit, and withdraw from personal vaults
- **Token Swaps**: Private swaps via Jupiter aggregator integration
- **Real-time Updates**: Live balance tracking and transaction status
- **Responsive Design**: Mobile-first UI with modern aesthetics

### Tech Stack

- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **UI Components**: shadcn/ui (Tailwind-based)
- **Styling**: Tailwind CSS
- **Solana Integration**: @solana/wallet-adapter
- **State Management**: React Context + Custom Hooks
- **Routing**: React Router (implied from pages structure)

## 📁 Directory Structure

```
frontend/
├── public/                     # Static assets
│   ├── favicon.ico
│   ├── placeholder.svg
│   └── robots.txt
├── src/
│   ├── components/             # Reusable UI components
│   │   ├── ui/                 # shadcn/ui base components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── form.tsx
│   │   │   ├── input.tsx
│   │   │   ├── select.tsx
│   │   │   └── ... (30+ components)
│   │   ├── DepositForm.tsx     # Vault deposit interface
│   │   ├── SwapForm.tsx        # Token swap interface
│   │   ├── SwapHistory.tsx     # Transaction history
│   │   ├── SwapStatus.tsx      # Real-time status tracking
│   │   ├── TokenSelector.tsx   # Token search & selection
│   │   ├── VaultInterface.tsx  # Main vault dashboard
│   │   ├── WalletConnect.tsx   # Wallet connection
│   │   ├── WithdrawForm.tsx    # Vault withdrawal
│   │   └── PrivacyBadge.tsx    # Privacy indicator
│   ├── contexts/               # React Context providers
│   │   ├── VaultContext.tsx    # Vault state management
│   │   └── WalletContext.tsx   # Wallet state management
│   ├── hooks/                  # Custom React hooks
│   │   ├── use-mobile.tsx      # Mobile detection
│   │   ├── use-toast.ts        # Toast notifications
│   │   └── useTokenSearch.ts   # Token search functionality
│   ├── lib/                    # Utility libraries
│   │   ├── constants.ts        # Application constants
│   │   ├── relayerService.ts   # Jupiter swap integration
│   │   ├── tokenService.ts     # Token data fetching
│   │   ├── tokens.ts           # Token definitions
│   │   └── utils.ts            # Helper functions
│   ├── pages/                  # Route components
│   │   ├── Index.tsx           # Main application page
│   │   ├── Landing.tsx         # Landing page
│   │   └── NotFound.tsx        # 404 page
│   ├── services/               # External service integrations
│   │   └── vault.ts            # Solana vault program integration
│   ├── App.tsx                 # Root component
│   ├── main.tsx                # Application entry point
│   └── index.css               # Global styles
├── package.json                # Dependencies and scripts
├── tailwind.config.ts          # Tailwind configuration
├── tsconfig.json               # TypeScript configuration
└── vite.config.ts              # Vite configuration
```

## 🔧 Core Components

### 1. Vault Interface (`VaultInterface.tsx`)
Main dashboard component with step-based navigation:
- **Deposit**: Add funds to personal vault
- **Swap**: Execute private token swaps
- **Status**: Monitor transaction progress
- **Withdraw**: Extract funds from vault
- **History**: View past transactions

### 2. Token Management
**TokenSelector.tsx**: Advanced token search and selection
- Jupiter token list integration
- Real-time price data
- Image caching and fallbacks
- Verification badges
- Popular tokens shortcuts

**TokenService.ts**: Comprehensive token data management
- Jupiter API integration
- Price fetching and caching
- Token metadata and logos
- Search functionality with filtering

### 3. Swap System
**SwapForm.tsx**: Multi-step swap interface
- Input validation and balance checking
- Quote fetching from Jupiter
- Slippage configuration
- Confirmation flow with details
- Success state with transaction links

**RelayerService.ts**: Integration with swap relayer
- Temporary wallet generation
- Quote validation
- Swap execution via relayer
- Transaction monitoring

### 4. Wallet Integration
**WalletContext.tsx**: Solana wallet state management
- Multiple wallet adapter support
- Connection state tracking
- Auto-reconnection logic

**VaultContext.tsx**: Vault-specific state management
- Balance tracking
- Transaction state
- Error handling
- Automatic refresh mechanisms

## 🎨 UI/UX Features

### Design System
- **shadcn/ui Components**: 30+ pre-built, accessible components
- **Dark/Light Mode**: Automatic theme switching
- **Responsive Layout**: Mobile-first design
- **Loading States**: Skeleton loaders and spinners
- **Error Boundaries**: Graceful error handling

### User Experience
- **Progressive Disclosure**: Step-by-step workflows
- **Real-time Feedback**: Live balance updates
- **Transaction Tracking**: Status indicators and progress
- **Accessibility**: ARIA labels and keyboard navigation
- **Performance**: Code splitting and lazy loading

## 🚀 Setup & Development

### Prerequisites
- [Node.js](https://nodejs.org/) 18+
- [npm](https://npmjs.com/) or [yarn](https://yarnpkg.com/)

### Installation

```bash
# Install dependencies
npm install
# or
yarn install

# Start development server
npm run dev
# or
yarn dev
```

### Available Scripts

```bash
# Development
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues
```

### Environment Configuration

Create a `.env` file for environment-specific settings:

```env
VITE_SOLANA_RPC_URL=https://api.devnet.solana.com
VITE_RELAYER_URL=http://localhost:3001
```

## 🔌 Integration Points

### Solana Program Integration
```typescript
// Vault operations
import { createVault, depositToVault, withdrawFromVault } from './services/vault';

// Usage in components
const { createUserVault, deposit, withdraw } = useVault();
```

### Jupiter Integration
```typescript
// Token swaps via relayer
import { RelayerService } from './lib/relayerService';

const relayer = new RelayerService();
const quote = await relayer.getSwapQuote(swapRequest);
```

### Wallet Connection
```typescript
// Wallet state management
import { useWallet } from '@solana/wallet-adapter-react';

const { connected, publicKey, connect } = useWallet();
```

## 🎯 Key Features

### 1. Vault Management
- **Create Vault**: One-click vault creation with PDA generation
- **Deposit Funds**: SOL deposits with balance tracking
- **Withdraw Funds**: Secure withdrawals to any address
- **Balance Monitoring**: Real-time balance updates

### 2. Token Swaps
- **Jupiter Integration**: Access to 500+ tokens
- **Price Discovery**: Real-time price feeds
- **Slippage Protection**: Configurable slippage tolerance
- **MEV Protection**: Optional MEV-resistant transactions

### 3. Privacy Features
- **Private Swaps**: Obscured transaction origins
- **Temporary Wallets**: Ephemeral addresses for swaps
- **Zero-Knowledge Ready**: Foundation for ZK proof integration

### 4. User Experience
- **Intuitive Interface**: Step-by-step guided flows
- **Mobile Responsive**: Optimized for all screen sizes
- **Real-time Updates**: Live transaction monitoring
- **Error Recovery**: Graceful error handling and recovery

## 🔧 State Management

### Context Architecture
```typescript
// Vault Context
interface VaultContextType {
  vaultBalance: number;
  isVaultCreated: boolean;
  createUserVault: () => Promise<void>;
  deposit: (amount: number) => Promise<void>;
  withdraw: (recipient: PublicKey, amount: number) => Promise<void>;
}

// Wallet Context
interface WalletContextType {
  connected: boolean;
  publicKey: PublicKey | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
}
```

### Custom Hooks
- **useVault()**: Vault operations and state
- **useTokenSearch()**: Token search with debouncing
- **useToast()**: Notification system
- **useIsMobile()**: Responsive breakpoint detection

## 🧪 Testing Strategy

### Testing Framework
- **Unit Tests**: Component and utility testing
- **Integration Tests**: Context and service testing
- **E2E Tests**: User workflow testing

```bash
# Run tests
npm run test

# Run with coverage
npm run test:coverage
```

## 🚀 Deployment

### Build Process
```bash
# Production build
npm run build

# Preview build locally
npm run preview
```

### Environment Setup
- **Development**: Local development with hot reloading
- **Staging**: Testing environment with devnet
- **Production**: Live environment with mainnet

### Hosting Options
- **Vercel**: Recommended for static deployment
- **Netlify**: Alternative static hosting
- **AWS S3**: Custom cloud deployment

## 🔮 Future Enhancements

### Planned Features
- **Multi-chain Support**: Extend beyond Solana
- **Advanced Charts**: Trading view integration
- **Portfolio Tracking**: Asset management dashboard
- **Social Features**: Shared vaults and collaborative trading
- **DeFi Integration**: Yield farming and staking
- **Mobile App**: React Native version

### Technical Improvements
- **PWA Support**: Offline functionality
- **Web3 Optimization**: Bundle size reduction
- **Performance**: Virtual scrolling for token lists
- **Accessibility**: Enhanced screen reader support

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Install dependencies (`npm install`)
4. Start development server (`npm run dev`)
5. Make your changes
6. Run tests (`npm run test`)
7. Commit your changes (`git commit -m 'Add amazing feature'`)
8. Push to the branch (`git push origin feature/amazing-feature`)
9. Open a Pull Request

### Code Style
- Follow TypeScript best practices
- Use functional components with hooks
- Maintain consistent naming conventions
- Add proper TypeScript types
- Include JSDoc comments for complex functions

## 📄 License

This project is licensed under the ISC License - see the LICENSE file for details.
