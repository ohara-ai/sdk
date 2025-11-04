# OharaAI SDK

A comprehensive SDK and smart contract library for modular features. This repository provides Solidity smart contracts and a code-first SDK that exposes functional primitives (Match, Scores, App) for building on-chain applications.

You can test the features of contracts and SDK using tests and the `e2e-test` app.

## QUICK START

### Prerequisites
- Node.js 18+
- npm or yarn
- Foundry - for Solidity development and local e2e-test app
```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```
- Doppler
We use [Doppler](https://docs.doppler.com/docs) to manage environment variables. Make sure you have an account, install the CLI, and run `doppler setup` selecting the `sdk` project.
```bash
doppler setup

./bin/setup-npmrc # to be able to publish the new package version
```

### Run tests

```bash
./bin/test
```

### Start the test app

```bash
./bin/start
```

## Key Features

✅ **Functional Primitives** - Simple async functions instead of raw contract calls  
✅ **Type-Safe** - Full TypeScript support with hierarchical context  
✅ **Automatic Address Management** - Fetches contract addresses from backend  
✅ **No UI Lock-in** - Build your own interface on top of primitives  
✅ **Server-Side Operations** - Separate entry point for controller operations  


## Repository Structure

```
/
├── bin/                # Utility scripts
├── contracts/          # Solidity smart contracts
├── sdk/                # TypeScript SDK for on-chain features
├── scripts/            # Contracts -> SDK ABIs update script
└── e2e-test/           # End-to-end testing application (Next.js)
```

* Use [`contracts/README.md`](./contracts/README.md) for info on contracts development and use.
* Use [`sdk/README.md`](./sdk/README.md) for info on SDK development and use.
* Use [`e2e-test/README.md`](./e2e-test/README.md) for info on e2e-test app development and use.