import routeRegistryArtifact from '../../contracts/out/RouteRegistry.sol/RouteRegistry.json';
import rideEscrowArtifact from '../../contracts/out/RideEscrow.sol/RideEscrow.json';
import { getUsdc } from '@/onchain-facts';

export const ARC_TESTNET_CHAIN_ID = 5042002;

const usdcFact = getUsdc(ARC_TESTNET_CHAIN_ID);
if (!usdcFact) throw new Error('USDC not deployed on Arc Testnet');

export const USDC_ADDRESS = usdcFact.address as `0x${string}`;

export const ROUTE_REGISTRY = {
  address: '0xaa4c41063f6098d27583318fc943c7c6a94811bb' as const,
  abi: routeRegistryArtifact.abi,
} as const;

export const RIDE_ESCROW = {
  address: '0x2780cb10558dbbf36fe18393390020341494f617' as const,
  abi: rideEscrowArtifact.abi,
} as const;
