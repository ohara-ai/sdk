# E2E Test Application

This is a Next.js application that serves as an end-to-end testing environment for the OharaAI SDK. It demonstrates real-world usage patterns and validates SDK functionality in a production-like setting.

## SDK Source Strategy

By default, this app uses the **local SDK source** (`file:../sdk`) for development. This allows you to:
- Test SDK changes immediately without publishing
- Debug SDK code alongside app code
- Iterate quickly during development

To test against the **published SDK** remove the e2e-test app from the workspace and install the published SDK package.

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

## Testing

### Unit Tests (Vitest)

```bash
npm test              # Run unit tests
npm run test:ui       # Run with Vitest UI
```

### Browser Tests (Playwright)

Browser tests validate page content and navigation in a real browser environment.

```bash
npm run test:browser          # Run browser tests (auto-starts dev server)
npm run test:browser:headed   # Run with visible browser
npm run test:browser:ui       # Run with Playwright UI
npm run test:browser:debug    # Run in debug mode
```

#### Docker Setup (Recommended for NixOS)

Run Playwright browsers in a Docker container instead of installing system dependencies:

**Terminal 1 - Start the Playwright server:**
```bash
npm run playwright:docker
# Or manually:
# docker run -p 3100:3100 --rm --init --workdir /home/pwuser --user pwuser \
#   mcr.microsoft.com/playwright:v1.49.0-noble \
#   /bin/sh -c 'npx -y playwright@1.49.0 run-server --port 3100 --host 0.0.0.0'
```

**Terminal 2 - Start your dev server:**
```bash
npm run dev
```

**Terminal 3 - Run the tests:**
```bash
TEST_PORT=3000 npm run test:browser:docker
# Or with custom server port:
# PW_TEST_CONNECT_WS_ENDPOINT=ws://127.0.0.1:3100/ TEST_PORT=3001 npm run test:browser
```

The config automatically uses `host.docker.internal` instead of `localhost` when `PW_TEST_CONNECT_WS_ENDPOINT` is set, since browsers run inside the container.

#### Native Setup

If you prefer running browsers natively:

```bash
npx playwright install        # Download browser binaries
npx playwright install-deps   # Install system dependencies (Linux with apt)
```

**Running against an existing server:**
```bash
BASE_URL=http://localhost:3001 npm run test:browser
```

**CI Environment:**
The browser tests are configured to run in headless Chromium. In CI, ensure the required system libraries are available (e.g., via `npx playwright install-deps` or using a Playwright Docker image).

### Full Test Suite

From the root SDK directory:
```bash
./bin/test    # Runs all tests including browser tests
```

## Project Structure

- `app/` - Next.js app directory with pages and API routes
- `browser-tests/` - Playwright browser tests
- `components/` - React components for the UI
- `contracts/` - Demo contracts, only for testing (DevWorldToken, etc.)
- `lib/` - Utility functions and configuration (wagmi, etc.)
- `scripts/*.sh` - Deployment and utility scripts
- `tests/` - Vitest unit tests
