import { useState } from 'react';
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
  useSwitchChain,
  useReadContracts,
} from 'wagmi';
import { erc20Abi } from 'viem';
import { Search, MapPin, CheckCircle2, Loader2, ExternalLink } from 'lucide-react';
import { RideCard, type RideDisplay } from './RideCard';
import { parseOnchainError } from '@/utils/errors';
import { RIDE_ESCROW, ARC_TESTNET_CHAIN_ID, USDC_ADDRESS } from '@/contracts/config';
import { buildTxExplorerUrl } from '@/onchain-facts';

interface PassengerViewProps {
  allRides: RideDisplay[];
  ridesLoading: boolean;
}

export function PassengerView({ allRides, ridesLoading }: PassengerViewProps) {
  const { address, chainId, isConnected } = useAccount();
  const { switchChain } = useSwitchChain();

  const [originFilter, setOriginFilter] = useState('');
  const [destFilter, setDestFilter] = useState('');
  const [bookingRideId, setBookingRideId] = useState<bigint | null>(null);
  const [txError, setTxError] = useState<string | null>(null);

  const wrongChain = isConnected && chainId !== ARC_TESTNET_CHAIN_ID;

  // Approve USDC
  const {
    writeContract: approveUsdc,
    data: approveHash,
    isPending: isApprovePending,
    reset: resetApprove,
  } = useWriteContract();
  const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({ hash: approveHash });

  // Book seat
  const {
    writeContract: bookSeat,
    data: bookHash,
    isPending: isBookPending,
    reset: resetBook,
  } = useWriteContract();
  const { isLoading: isBookConfirming, isSuccess: isBookSuccess } = useWaitForTransactionReceipt({ hash: bookHash });

  // Read allowance for the booking ride
  const { data: allowanceData } = useReadContracts({
    contracts: address && bookingRideId !== null
      ? [
          {
            address: USDC_ADDRESS,
            abi: erc20Abi,
            functionName: 'allowance',
            args: [address, RIDE_ESCROW.address],
            chainId: ARC_TESTNET_CHAIN_ID,
          },
        ]
      : [],
  });
  const allowance: bigint = (allowanceData?.[0]?.result as bigint) ?? 0n;

  const filteredRides = allRides.filter((r) => {
    const orig = originFilter.trim().toLowerCase();
    const dest = destFilter.trim().toLowerCase();
    if (orig && !r.origin.toLowerCase().includes(orig)) return false;
    if (dest && !r.destination.toLowerCase().includes(dest)) return false;
    return true;
  });

  function startBooking(rideId: bigint) {
    if (!isConnected) return;
    if (wrongChain) {
      switchChain({ chainId: ARC_TESTNET_CHAIN_ID });
      return;
    }
    setBookingRideId(rideId);
    setTxError(null);
    resetApprove();
    resetBook();
  }

  function handleApprove() {
    const ride = bookingRideId !== null ? allRides.find((r) => r.id === bookingRideId) : null;
    if (!ride) return;
    setTxError(null);
    approveUsdc({
      address: USDC_ADDRESS,
      abi: erc20Abi,
      functionName: 'approve',
      args: [RIDE_ESCROW.address, ride.pricePerSeat],
      chainId: ARC_TESTNET_CHAIN_ID,
    }, {
      onError: (err) => {
        setTxError(parseOnchainError(err));
      },
    });
  }

  function handleBookSeat() {
    if (bookingRideId === null) return;
    setTxError(null);
    bookSeat({
      address: RIDE_ESCROW.address,
      abi: RIDE_ESCROW.abi,
      functionName: 'bookSeat',
      args: [bookingRideId],
      chainId: ARC_TESTNET_CHAIN_ID,
    }, {
      onError: (err) => {
        setTxError(parseOnchainError(err));
      },
    });
  }

  function handleDismiss() {
    setBookingRideId(null);
    setTxError(null);
    resetApprove();
    resetBook();
  }

  const selectedRide = bookingRideId !== null ? allRides.find((r) => r.id === bookingRideId) : null;
  const pricePerSeat = selectedRide?.pricePerSeat ?? 0n;
  const needsApproval = allowance < pricePerSeat && pricePerSeat > 0n;

  const isAnyPending = isApprovePending || isApproveConfirming || isBookPending || isBookConfirming;

  return (
    <div className="space-y-6">
      {/* Booking sheet overlay */}
      {bookingRideId !== null && selectedRide && (
        <div
          className="glass-card p-5"
          style={{ borderColor: isBookSuccess ? 'rgba(26,128,71,0.3)' : 'var(--border)' }}
        >
          <div className="mb-3 flex items-start justify-between">
            <div>
              <p className="display text-base font-semibold" style={{ color: 'var(--ink)' }}>
                Book: {selectedRide.origin} → {selectedRide.destination}
              </p>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>
                {(Number(pricePerSeat) / 1_000_000).toFixed(2)} USDC — locked in escrow until trip completes
              </p>
            </div>
            <button onClick={handleDismiss} className="text-xs" style={{ color: 'var(--subtle)' }}>
              Cancel
            </button>
          </div>

          {txError && (
            <p className="mb-3 rounded-xl p-3 text-xs" style={{ background: 'rgba(186,43,76,0.06)', color: 'var(--danger)' }}>
              {txError}
            </p>
          )}

          {isBookSuccess ? (
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-5 shrink-0" style={{ color: 'var(--success)' }} />
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--success)' }}>
                  Seat booked! USDC locked in escrow.
                </p>
                {bookHash && (
                  <a
                    href={buildTxExplorerUrl(ARC_TESTNET_CHAIN_ID, bookHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-0.5 inline-flex items-center gap-1 text-xs"
                    style={{ color: 'var(--accent-hover)' }}
                  >
                    View on ArcScan <ExternalLink className="size-3" />
                  </a>
                )}
              </div>
            </div>
          ) : needsApproval && !isApproveSuccess ? (
            <div className="space-y-2">
              <p className="text-xs" style={{ color: 'var(--muted)' }}>
                Step 1 of 2 — Allow the escrow contract to spend your USDC.
              </p>
              <button
                disabled={isAnyPending}
                onClick={handleApprove}
                className="w-full rounded-2xl py-3 text-sm font-semibold text-white transition-all hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
                style={{ background: 'var(--accent)' }}
              >
                {isApprovePending
                  ? <span className="flex items-center justify-center gap-2"><Loader2 className="size-4 animate-spin" />Confirm in wallet...</span>
                  : isApproveConfirming
                  ? <span className="flex items-center justify-center gap-2"><Loader2 className="size-4 animate-spin" />Approving...</span>
                  : 'Approve USDC'}
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {needsApproval === false || isApproveSuccess ? (
                <p className="text-xs" style={{ color: 'var(--muted)' }}>
                  {isApproveSuccess ? 'Step 2 of 2 — ' : ''}Confirm your booking and lock USDC in escrow.
                </p>
              ) : null}
              <button
                disabled={isAnyPending}
                onClick={handleBookSeat}
                className="w-full rounded-2xl py-3 text-sm font-semibold text-white transition-all hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
                style={{ background: 'var(--accent)' }}
              >
                {isBookPending
                  ? <span className="flex items-center justify-center gap-2"><Loader2 className="size-4 animate-spin" />Confirm in wallet...</span>
                  : isBookConfirming
                  ? <span className="flex items-center justify-center gap-2"><Loader2 className="size-4 animate-spin" />Booking...</span>
                  : `Book Seat — ${(Number(pricePerSeat) / 1_000_000).toFixed(2)} USDC`}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Search */}
      <section className="glass-card p-5">
        <h2 className="display mb-4 text-base font-semibold" style={{ color: 'var(--ink)' }}>
          Search Rides
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="glass-inner flex items-center gap-2 px-3 py-2.5">
            <MapPin className="size-4 shrink-0" style={{ color: 'var(--accent-hover)' }} />
            <input
              value={originFilter}
              onChange={(e) => setOriginFilter(e.target.value)}
              placeholder="From city or region"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-300"
              style={{ color: 'var(--ink)' }}
            />
          </div>
          <div className="glass-inner flex items-center gap-2 px-3 py-2.5">
            <MapPin className="size-4 shrink-0" style={{ color: 'var(--success)' }} />
            <input
              value={destFilter}
              onChange={(e) => setDestFilter(e.target.value)}
              placeholder="To city or region"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-300"
              style={{ color: 'var(--ink)' }}
            />
          </div>
        </div>
        {wrongChain && (
          <button
            onClick={() => switchChain({ chainId: ARC_TESTNET_CHAIN_ID })}
            className="mt-3 w-full rounded-2xl py-2.5 text-sm font-semibold text-white"
            style={{ background: 'var(--danger)' }}
          >
            Switch to Arc Testnet
          </button>
        )}
      </section>

      {/* Ride listings */}
      <section>
        <div className="mb-3">
          <h2 className="display text-sm font-semibold" style={{ color: 'var(--muted)' }}>
            <Search className="mr-1.5 inline size-3.5" />
            {ridesLoading
              ? 'Loading rides...'
              : `${filteredRides.length} ride${filteredRides.length !== 1 ? 's' : ''} available`}
          </h2>
        </div>
        {ridesLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="glass-card h-48 animate-pulse" />
            ))}
          </div>
        ) : filteredRides.length === 0 ? (
          <div className="glass-card flex flex-col items-center justify-center gap-2 py-16 text-center">
            <MapPin className="size-8 opacity-30" style={{ color: 'var(--muted)' }} />
            <p className="text-sm font-medium" style={{ color: 'var(--muted)' }}>
              No rides found for this route
            </p>
            <p className="text-xs" style={{ color: 'var(--subtle)' }}>
              Try different cities or check back later
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRides.map((ride) => (
              <RideCard
                key={ride.id.toString()}
                ride={ride}
                onBook={isConnected ? startBooking : undefined}
                isBooking={bookingRideId === ride.id && isAnyPending}
                isOwn={ride.driver.toLowerCase() === address?.toLowerCase()}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
