# E2E Test Application

This directory contains the end-to-end testing application for the on-chain gaming features SDK.

## Overview

This Next.js application provides a web interface for testing and demonstrating the functionality of the on-chain gaming features SDK.

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- The contracts must be deployed to a local or test network
- The SDK must be built (`npm run sdk:build` from the root directory)

### Installation

```bash
npm install
```

### Development

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### Testing Scripts

- `npm run deploy-factories` - Deploy factory contracts to the network
- `npm run deploy-devworld-token` - Deploy DEVWORLD demo ERC20 token for testing
- `npm run fund-controller` - Fund the controller address with test tokens
- `npm run test` - Run Vitest tests
- `npm run test:ui` - Run Vitest with UI

## Project Structure

- `app/` - Next.js app directory with pages and API routes
- `components/` - React components for the UI
- `contracts/` - Demo contracts for testing (DevWorldToken, etc.)
- `lib/` - Utility functions and configuration (wagmi, etc.)
- `*.sh` - Deployment and utility scripts

## Environment Variables

Copy `.env.example` from the root directory and configure:

- `PRIVATE_KEY` - Your wallet private key for deployments
- `RPC_URL` - RPC endpoint URL
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` - WalletConnect project ID
- Other contract addresses as needed
