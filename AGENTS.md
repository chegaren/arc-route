# ArcRoute

> Built with Arc Studio — decentralized ridesharing on Arc Network

## What This App Does

ArcRoute is a decentralized ridesharing and carpooling platform on Arc Testnet. Drivers publish trips with origin, destination, departure time, seats, and USDC price. Passengers book seats with USDC locked in escrow. Funds are released via pull-payment after trip completion. All fees paid in USDC (Arc native gas = USDC).

## Tech Stack

- Frontend: React 18, Vite, TypeScript, Tailwind CSS
- Web3: wagmi v2, viem v2, ConnectKit
- Contracts: Solidity 0.8.20 + Foundry. Sources in `contracts/`. Build with `bun run contracts:build`.
- Chain: Arc Testnet (Chain ID: 5042002)
- Token: USDC (6 decimals, address: 0x3600000000000000000000000000000000000000)

## Deployed Contracts (Arc Testnet)

| Contract | Address | Explorer |
|---|---|---|
| RouteRegistry | `0xaa4c41063f6098d27583318fc943c7c6a94811bb` | https://explorer.testnet.arc.io/address/0xaa4c41063f6098d27583318fc943c7c6a94811bb |
| RideEscrow | `0x2780cb10558dbbf36fe18393390020341494f617` | https://explorer.testnet.arc.io/address/0x2780cb10558dbbf36fe18393390020341494f617 |

## Post-Deploy Setup (Owner Tasks)

After deploying, the platform owner (deployer wallet) must call:
1. `RouteRegistry.setEscrowContract("0x2780cb10558dbbf36fe18393390020341494f617")` — authorizes RideEscrow to update seat counts
2. `RideEscrow.setRouteRegistry("0xaa4c41063f6098d27583318fc943c7c6a94811bb")` — links escrow to registry

## Key Files

- `src/App.tsx` — App shell, mode toggle
- `src/components/Header.tsx` — Nav + wallet connect + mode switcher
- `src/components/PassengerView.tsx` — Search/filter rides, book with USDC
- `src/components/DriverView.tsx` — Publish ride form, my rides list
- `src/components/RideCard.tsx` — Ride listing display
- `src/components/EscrowStatus.tsx` — Tx status/escrow banner
- `src/contracts/config.ts` — Contract addresses + ABIs
- `src/utils/errors.ts` — Onchain error parser
- `contracts/RouteRegistry.sol` — Trip registry
- `contracts/RideEscrow.sol` — Booking escrow + pull-payment

## Security Model

- Pull payments: all USDC payouts go to `pendingWithdrawals[address]`, users call `withdraw()`
- Driver address snapshotted at booking time — registry cannot be repointed to steal funds
- Departure time snapshotted at booking time
- Passenger timeout refund: 48h after departure, passenger can claim full refund if driver hasn't settled
- Pre-departure enforcement on all cancellations
- 1-hour cancellation window: full refund if >1h before departure, 50/50 split if within 1h

## To Run

```bash
bun install
bun run dev
```
