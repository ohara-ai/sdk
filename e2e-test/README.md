# E2E Test Application

This is a Next.js application that serves as an end-to-end testing environment for the OharaAI SDK. It demonstrates real-world usage patterns and validates SDK functionality in a production-like setting.

## SDK Source Strategy

By default, this app uses the **local SDK source** (`file:../sdk`) for development. This allows you to:
- Test SDK changes immediately without publishing
- Debug SDK code alongside app code
- Iterate quickly during development

To test against the **published SDK** (e.g., before releasing):
```bash
npm run use-published-sdk
```

To switch back to local development:
```bash
npm run use-local-sdk
```

## Overview

This Next.js application provides a web interface for testing and demonstrating the functionality of the SDK.

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- The contracts must be deployed to a local or test network
- The SDK must be built (`npm run sdk:build` from the root directory)

### Installation

```bash
npm install
```

### Setup

- `anvil` - Start an Anvil node with local network
- `npm run setup` - Deploy testing contracts to the local network

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Project Structure

- `app/` - Next.js app directory with pages and API routes
- `components/` - React components for the UI
- `contracts/` - Demo contracts, only for testing (DevWorldToken, etc.)
- `lib/` - Utility functions and configuration (wagmi, etc.)
- `scripts/*.sh` - Deployment and utility scripts
