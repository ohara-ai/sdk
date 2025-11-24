# OharaAI SDK - pre-release, alpha version

A comprehensive SDK and smart contract library for modular features. This repository provides Solidity smart contracts and a code-first SDK that exposes functional primitives (Match, Scores, App) for building on-chain applications.

You can test the features of contracts and SDK using tests and the `e2e-test` app.

## QUICK START

### Prerequisites

- Node.js 18+
- npm or yarn
- [Doppler](https://docs.doppler.com/docs)
- Foundry - for Solidity development and local e2e-test app

```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

### Setup

```bash
./bin/setup
```

### Start the test app

```bash
./bin/start
```

To run the test app **without using Doppler** (local solo mode), use the optional `--solo` flag:

```bash
./bin/start --solo
```

### Run tests

```bash
./bin/test
```

### Cleanup

```bash
npx eslint --config eslint.config.mjs . # --fix
npx prettier . # --write
```

### Publish a new version of the SDK (patch|minor|major) with automated version bump, build, test, and git commit + push

```bash
./bin/publish patch "Some commit message"
```

## Key Features

✅ **Functional Primitives** - Simple async functions instead of raw contract calls  
✅ **Type-Safe** - Full TypeScript support with hierarchical context  
✅ **Automatic Address Management** - Fetches contract addresses from backend  
✅ **No UI Lock-in** - Build your own interface on top of primitives  
✅ **Server-Side Operations** - Separate entry point for controller operations  
✅ **Secure by Default** - API mode for production, optional encryption for dev/backend

## Security Notes

⚠️ **Controller Key Storage:** The SDK stores controller keys locally in `ohara-ai-data/` for development. For production:
- Use **Ohara API mode** (recommended) - keys managed securely by Ohara infrastructure
- Or enable **key encryption** with `OHARA_KEY_ENCRYPTION_SECRET` for backend deployments
- **Never** use local key storage in browser/frontend environments
- **Never** commit `ohara-ai-data/` to version control

See [`sdk/README.md`](./sdk/README.md) for detailed security guidance.

## Repository Structure

```
/
├── bin/                # Utility scripts
├── contracts/          # Solidity smart contracts
├── sdk/                # TypeScript SDK for on-chain features
├── scripts/            # Contracts -> SDK ABIs update script
└── e2e-test/           # End-to-end testing application (Next.js)
```

- Use [`contracts/README.md`](./contracts/README.md) for info on contracts development and use.
- Use [`sdk/README.md`](./sdk/README.md) for info on SDK development and use.
- Use [`e2e-test/README.md`](./e2e-test/README.md) for info on e2e-test app development and use.
