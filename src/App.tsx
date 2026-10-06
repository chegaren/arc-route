import { useState, useCallback } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { Header } from './components/Header';
import { PassengerView } from './components/PassengerView';
import { DriverView } from './components/DriverView';
import { type RideDisplay } from './components/RideCard';
import { ROUTE_REGISTRY, ARC_TESTNET_CHAIN_ID } from './contracts/config';

// ─── Ride data fetching ───────────────────────────────────────────────────────
// Reads nextRideId then fetches each ride slot individually.
// Supports up to 10 rides for testnet demo; extend slot list for production.

function useRides(_refreshKey: number): { rides: RideDisplay[]; isLoading: boolean } {
  const { data: nextRideIdRaw, isLoading: countLoading } = useReadContract({
    address: ROUTE_REGISTRY.address,
    abi: ROUTE_REGISTRY.abi,
    functionName: 'nextRideId',
    chainId: ARC_TESTNET_CHAIN_ID,
    query: { refetchInterval: 15_000 },
  });

  const count = nextRideIdRaw != null ? Number(nextRideIdRaw) : 0;

  const { data: ride0 } = useReadContract(count > 0 ? { address: ROUTE_REGISTRY.address, abi: ROUTE_REGISTRY.abi, functionName: 'getRide', args: [0n], chainId: ARC_TESTNET_CHAIN_ID } : undefined as unknown as Parameters<typeof useReadContract>[0]);
  const { data: ride1 } = useReadContract(count > 1 ? { address: ROUTE_REGISTRY.address, abi: ROUTE_REGISTRY.abi, functionName: 'getRide', args: [1n], chainId: ARC_TESTNET_CHAIN_ID } : undefined as unknown as Parameters<typeof useReadContract>[0]);
  const { data: ride2 } = useReadContract(count > 2 ? { address: ROUTE_REGISTRY.address, abi: ROUTE_REGISTRY.abi, functionName: 'getRide', args: [2n], chainId: ARC_TESTNET_CHAIN_ID } : undefined as unknown as Parameters<typeof useReadContract>[0]);
  const { data: ride3 } = useReadContract(count > 3 ? { address: ROUTE_REGISTRY.address, abi: ROUTE_REGISTRY.abi, functionName: 'getRide', args: [3n], chainId: ARC_TESTNET_CHAIN_ID } : undefined as unknown as Parameters<typeof useReadContract>[0]);
  const { data: ride4 } = useReadContract(count > 4 ? { address: ROUTE_REGISTRY.address, abi: ROUTE_REGISTRY.abi, functionName: 'getRide', args: [4n], chainId: ARC_TESTNET_CHAIN_ID } : undefined as unknown as Parameters<typeof useReadContract>[0]);
  const { data: ride5 } = useReadContract(count > 5 ? { address: ROUTE_REGISTRY.address, abi: ROUTE_REGISTRY.abi, functionName: 'getRide', args: [5n], chainId: ARC_TESTNET_CHAIN_ID } : undefined as unknown as Parameters<typeof useReadContract>[0]);
  const { data: ride6 } = useReadContract(count > 6 ? { address: ROUTE_REGISTRY.address, abi: ROUTE_REGISTRY.abi, functionName: 'getRide', args: [6n], chainId: ARC_TESTNET_CHAIN_ID } : undefined as unknown as Parameters<typeof useReadContract>[0]);
  const { data: ride7 } = useReadContract(count > 7 ? { address: ROUTE_REGISTRY.address, abi: ROUTE_REGISTRY.abi, functionName: 'getRide', args: [7n], chainId: ARC_TESTNET_CHAIN_ID } : undefined as unknown as Parameters<typeof useReadContract>[0]);
  const { data: ride8 } = useReadContract(count > 8 ? { address: ROUTE_REGISTRY.address, abi: ROUTE_REGISTRY.abi, functionName: 'getRide', args: [8n], chainId: ARC_TESTNET_CHAIN_ID } : undefined as unknown as Parameters<typeof useReadContract>[0]);
  const { data: ride9 } = useReadContract(count > 9 ? { address: ROUTE_REGISTRY.address, abi: ROUTE_REGISTRY.abi, functionName: 'getRide', args: [9n], chainId: ARC_TESTNET_CHAIN_ID } : undefined as unknown as Parameters<typeof useReadContract>[0]);

  const rawSlots = [ride0, ride1, ride2, ride3, ride4, ride5, ride6, ride7, ride8, ride9];

  type RawRide = {
    id: bigint;
    driver: string;
    origin: string;
    destination: string;
    departureTime: bigint;
    totalSeats: number;
    availableSeats: number;
    pricePerSeat: bigint;
    active: boolean;
  };

  const rides: RideDisplay[] = rawSlots
    .slice(0, count)
    .filter((r): r is NonNullable<typeof r> => r != null)
    .map((r) => {
      const rd = r as RawRide;
      return {
        id: rd.id,
        driver: rd.driver,
        origin: rd.origin,
        destination: rd.destination,
        departureTime: rd.departureTime,
        totalSeats: rd.totalSeats,
        availableSeats: rd.availableSeats,
        pricePerSeat: rd.pricePerSeat,
        active: rd.active,
      };
    });

  return { rides, isLoading: countLoading };
}

// ─── App ─────────────────────────────────────────────────────────────────────

export default function App() {
  const { address } = useAccount();
  const [mode, setMode] = useState<'passenger' | 'driver'>('passenger');
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const { rides, isLoading } = useRides(refreshKey);

  const myRides = address
    ? rides.filter((r) => r.driver.toLowerCase() === address.toLowerCase())
    : [];

  return (
    <div className="min-h-dvh" style={{ background: 'var(--bg-gradient)' }}>
      <Header mode={mode} onModeChange={setMode} />

      <main className="mx-auto max-w-5xl px-4 py-6">
        {/* Hero headline */}
        <div className="mb-6 text-center">
          <h1
            className="display mb-1 text-3xl font-bold"
            style={{ color: 'var(--ink)', letterSpacing: '-0.03em' }}
          >
            Share the Journey
          </h1>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            Connect with drivers going your way. Pay in USDC, gaslessly on Arc.
          </p>
        </div>

        {/* Testnet info strip */}
        <div
          className="mb-5 rounded-2xl border px-4 py-3 text-xs"
          style={{
            background: 'rgba(18,45,69,0.04)',
            borderColor: 'var(--border)',
            color: 'var(--muted)',
          }}
        >
          <strong style={{ color: 'var(--ink)' }}>Arc Testnet</strong> — All rides and payments run on Arc Testnet. Fees are paid in USDC (no ETH needed). Use the{' '}
          <strong style={{ color: 'var(--ink-2)' }}>Get test USDC</strong> button in the sidebar to fund your wallet before booking.
        </div>

        {mode === 'passenger' ? (
          <PassengerView allRides={rides} ridesLoading={isLoading} />
        ) : (
          <DriverView myRides={myRides} ridesLoading={isLoading} onRidePublished={refresh} />
        )}
      </main>
    </div>
  );
}
