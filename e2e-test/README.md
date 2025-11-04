# E2E Test Application

This directory contains the end-to-end testing application for the SDK.

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

