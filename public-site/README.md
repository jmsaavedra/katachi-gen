# Katachi Gen - Public Site

The Next.js web application for Katachi Gen, an NFT collection of algorithmically generated 3D Origami forms representing your on-chain journey on Shape Network.

🏆 **Shapecraft2 Hackathon Submission**

## Features

- **Wallet Connection**: Multi-wallet support via RainbowKit
- **NFT Analysis**: Fetch and display all NFTs owned by connected wallet
- **Pattern Generation**: Generate unique origami patterns based on wallet data
- **Shape Network Integration**: Native support for Shape Mainnet and Sepolia
- **Dark Theme**: Minimal, clean interface optimized for Web3 users

## Tech Stack

- **Next.js 15** - React framework with App Router and Turbopack
- **TypeScript** - Type safety throughout the application
- **Wagmi v2** - React hooks for Ethereum interactions
- **RainbowKit** - Beautiful wallet connection UI
- **Alchemy SDK** - NFT data fetching and blockchain queries
- **Tailwind CSS** - Utility-first CSS framework
- **Shadcn/ui** - Modern React component library
- **React Query** - Powerful data synchronization

## Getting Started

### Prerequisites

- Node.js 18+
- Yarn package manager
- Alchemy API key
- WalletConnect Project ID

### Environment Variables

Create a `.env.local` file in the project root:

```bash
# Shape Network Configuration
# Reading chain (for NFT data) - use mainnet for real data
NEXT_PUBLIC_READ_CHAIN_ID=360
# Minting chain (for NFT contract) - use testnet for safe testing
NEXT_PUBLIC_MINT_CHAIN_ID=11011

# Contract Addresses
NEXT_PUBLIC_KATACHI_CONTRACT_TESTNET=0x9FdB107c9AAE301F021e1F34BEB8Ca6F2324de85

# Alchemy API Key (get from https://www.alchemy.com/)
NEXT_PUBLIC_ALCHEMY_KEY=your_alchemy_api_key

# WalletConnect Project ID (get from https://cloud.walletconnect.com/)
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_walletconnect_project_id
```

### Installation

```bash
# Install dependencies
yarn install

# Start development server
yarn dev
# or
npx next dev --turbopack

# Build for production
yarn build

# Start production server
yarn start
```

The application will be available at [http://localhost:3000](http://localhost:3000).

## Project Structure

```bash
public-site/
├── app/                    # Next.js App Router
│   ├── api/get-nfts/      # NFT fetching API route
│   ├── layout.tsx         # Root layout with providers
│   └── page.tsx           # Landing page
├── components/            # React components
│   ├── katachi-generator.tsx  # Main pattern generation UI
│   ├── wallet-connect.tsx     # Wallet connection component
│   └── ui/                # Shadcn/ui components
├── hooks/                 # Custom React hooks
│   └── web3.ts           # NFT fetching and Web3 interactions
├── lib/                  # Utilities and configuration
│   ├── clients.ts        # Alchemy and RPC client setup
│   ├── config.ts         # Environment variable handling
│   └── web3.ts          # Wagmi configuration
└── package.json         # Dependencies and scripts
```

## How It Works

1. **Wallet Connection**: Users connect their wallet using RainbowKit
2. **NFT Analysis**: App fetches all NFTs owned by the wallet via Alchemy
3. **Shape Participation**: Analyzes on-chain activity on Shape Network
4. **Pattern Generation**: Creates unique origami patterns based on:
   - Total NFT count
   - Collection diversity
   - Shape Network participation
   - Stack achievements (coming soon)
5. **Visualization**: Displays interactive 3D origami pattern preview
6. **Minting**: Allows users to mint their generated pattern as an NFT (coming soon)

## Supported Networks

- **Shape Mainnet** (Chain ID: 360) - Primary network
- **Shape Sepolia** (Chain ID: 11011) - Testnet
- **Ethereum Mainnet** - Fallback for broader NFT analysis

## Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Manual Deployment

```bash
# Build the application
yarn build

# The build output will be in the `.next` directory
# Deploy to your preferred hosting platform
```

## Development

### Code Style

- **ESLint**: Enforced linting rules for code quality
- **Prettier**: Automatic code formatting
- **TypeScript**: Strict type checking enabled

### Available Scripts

```bash
yarn dev          # Start development server with Turbopack
yarn build        # Build for production
yarn start        # Start production server
yarn lint         # Run ESLint
yarn lint:fix     # Fix ESLint errors automatically
yarn type-check   # Run TypeScript compiler
```

### Adding New Features

1. Create components in `components/` directory
2. Add custom hooks in `hooks/` directory
3. Update utilities in `lib/` directory
4. Follow existing patterns for consistency

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Make your changes and commit: `git commit -m 'Add new feature'`
4. Push to the branch: `git push origin feature/new-feature`
5. Submit a pull request

## License

This project is part of the Katachi Gen submission for the Shapecraft2 Hackathon.

## Links

- [Shape Network](https://shape.network)
- [Shapecraft2 Hackathon](https://shape.network/shapecraft)
- [Main Repository](https://github.com/jmsaavedra/katachi-gen)

---

## About

Transform your on-chain journey into unique origami art with Katachi Gen.
