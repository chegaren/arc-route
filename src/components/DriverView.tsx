import { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useSwitchChain } from 'wagmi';
import { MapPin, Clock, Users, DollarSign, Car, ChevronDown, ChevronUp } from 'lucide-react';
import { EscrowStatus, type TxStatus } from './EscrowStatus';
import { RideCard, type RideDisplay } from './RideCard';
import { parseOnchainError } from '@/utils/errors';
import { ROUTE_REGISTRY, ARC_TESTNET_CHAIN_ID } from '@/contracts/config';

interface DriverViewProps {
  myRides: RideDisplay[];
  ridesLoading: boolean;
  onRidePublished?: () => void;
}

export function DriverView({ myRides, ridesLoading, onRidePublished }: DriverViewProps) {
  const { isConnected, chainId } = useAccount();
  const { switchChain } = useSwitchChain();

  const [showForm, setShowForm] = useState(false);
  const [status, setStatus] = useState<TxStatus>({ type: 'idle' });

  const [form, setForm] = useState({
    origin: '',
    destination: '',
    date: '',
    time: '',
    seats: '2',
    priceUsdc: '5',
  });

  const wrongChain = isConnected && chainId !== ARC_TESTNET_CHAIN_ID;

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  if (isConfirming && hash && status.type !== 'confirming') {
    setStatus({ type: 'confirming', hash, label: 'Publishing your ride...' });
  }
  if (isSuccess && hash && status.type !== 'success') {
    setStatus({ type: 'success', hash, label: 'Ride published! Passengers can now book seats.' });
    setShowForm(false);
    setForm({ origin: '', destination: '', date: '', time: '', seats: '2', priceUsdc: '5' });
    onRidePublished?.();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isConnected) return;
    if (wrongChain) {
      switchChain({ chainId: ARC_TESTNET_CHAIN_ID });
      return;
    }

    const departureDateTime = new Date(`${form.date}T${form.time}`);
    const departureTimestamp = BigInt(Math.floor(departureDateTime.getTime() / 1000));

    const totalSeats = parseInt(form.seats, 10);
    const priceBigInt = BigInt(Math.round(parseFloat(form.priceUsdc) * 1_000_000));

    if (isNaN(totalSeats) || totalSeats < 1 || totalSeats > 8) return;
    if (priceBigInt <= 0n) return;

    try {
      setStatus({ type: 'pending', label: 'Publishing ride to blockchain...' });
      writeContract({
        address: ROUTE_REGISTRY.address,
        abi: ROUTE_REGISTRY.abi,
        functionName: 'publishRide',
        args: [form.origin, form.destination, departureTimestamp, totalSeats, priceBigInt],
        chainId: ARC_TESTNET_CHAIN_ID,
      });
    } catch (err) {
      setStatus({ type: 'error', message: parseOnchainError(err) });
    }
  }



  return (
    <div className="space-y-6">
      {/* Status banner */}
      {status.type !== 'idle' && (
        <EscrowStatus status={status} onDismiss={() => setStatus({ type: 'idle' })} />
      )}

      {/* Publish ride card */}
      <section className="glass-card overflow-hidden">
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex w-full items-center justify-between p-5 text-left"
        >
          <div className="flex items-center gap-3">
            <div
              className="flex size-10 items-center justify-center rounded-2xl"
              style={{ background: 'var(--accent)' }}
            >
              <Car className="size-5 text-white" />
            </div>
            <div>
              <p className="display text-base font-semibold" style={{ color: 'var(--ink)' }}>
                Offer a New Ride
              </p>
              <p className="text-xs" style={{ color: 'var(--subtle)' }}>
                Share your route, earn USDC
              </p>
            </div>
          </div>
          {showForm ? (
            <ChevronUp className="size-5" style={{ color: 'var(--subtle)' }} />
          ) : (
            <ChevronDown className="size-5" style={{ color: 'var(--subtle)' }} />
          )}
        </button>

        {showForm && (
          <form onSubmit={handleSubmit} className="border-t px-5 pb-5 pt-4 space-y-4" style={{ borderColor: 'var(--border)' }}>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField icon={<MapPin className="size-4" style={{ color: 'var(--accent-hover)' }} />} label="From">
                <input
                  required
                  value={form.origin}
                  onChange={(e) => setForm((f) => ({ ...f, origin: e.target.value }))}
                  placeholder="Istanbul"
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-300"
                  style={{ color: 'var(--ink)' }}
                />
              </FormField>

              <FormField icon={<MapPin className="size-4" style={{ color: 'var(--success)' }} />} label="To">
                <input
                  required
                  value={form.destination}
                  onChange={(e) => setForm((f) => ({ ...f, destination: e.target.value }))}
                  placeholder="Ankara"
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-300"
                  style={{ color: 'var(--ink)' }}
                />
              </FormField>

              <FormField icon={<Clock className="size-4" style={{ color: 'var(--muted)' }} />} label="Date">
                <input
                  required
                  type="date"
                  value={form.date}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  className="flex-1 bg-transparent text-sm outline-none"
                  style={{ color: 'var(--ink)' }}
                />
              </FormField>

              <FormField icon={<Clock className="size-4" style={{ color: 'var(--muted)' }} />} label="Time">
                <input
                  required
                  type="time"
                  value={form.time}
                  onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
                  className="flex-1 bg-transparent text-sm outline-none"
                  style={{ color: 'var(--ink)' }}
                />
              </FormField>

              <FormField icon={<Users className="size-4" style={{ color: 'var(--muted)' }} />} label="Seats">
                <select
                  value={form.seats}
                  onChange={(e) => setForm((f) => ({ ...f, seats: e.target.value }))}
                  className="flex-1 bg-transparent text-sm outline-none"
                  style={{ color: 'var(--ink)' }}
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                    <option key={n} value={n.toString()}>
                      {n} seat{n > 1 ? 's' : ''}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField icon={<DollarSign className="size-4" style={{ color: 'var(--accent)' }} />} label="Price per seat (USDC)">
                <input
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.priceUsdc}
                  onChange={(e) => setForm((f) => ({ ...f, priceUsdc: e.target.value }))}
                  className="flex-1 bg-transparent text-sm tabular-nums outline-none"
                  style={{ color: 'var(--ink)' }}
                />
              </FormField>
            </div>

            {wrongChain ? (
              <button
                type="button"
                onClick={() => switchChain({ chainId: ARC_TESTNET_CHAIN_ID })}
                className="w-full rounded-2xl py-3 text-sm font-semibold text-white"
                style={{ background: 'var(--danger)' }}
              >
                Switch to Arc Testnet
              </button>
            ) : (
              <button
                type="submit"
                disabled={isPending || isConfirming || !isConnected}
                className="w-full rounded-2xl py-3 text-sm font-semibold text-white transition-all hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
                style={{ background: 'var(--accent)' }}
              >
                {!isConnected
                  ? 'Connect Wallet to Publish'
                  : isPending
                  ? 'Confirm in wallet...'
                  : isConfirming
                  ? 'Publishing...'
                  : 'Publish Ride'}
              </button>
            )}
          </form>
        )}
      </section>

      {/* My rides */}
      <section>
        <h2 className="display mb-3 text-sm font-semibold" style={{ color: 'var(--muted)' }}>
          Your Published Rides
        </h2>
        {!isConnected ? (
          <div className="glass-card flex flex-col items-center justify-center gap-2 py-12 text-center">
            <Car className="size-8 opacity-30" style={{ color: 'var(--muted)' }} />
            <p className="text-sm font-medium" style={{ color: 'var(--muted)' }}>
              Connect your wallet to see your rides
            </p>
          </div>
        ) : ridesLoading ? (
          <div className="space-y-3">
            {[0, 1].map((i) => (
              <div key={i} className="glass-card h-40 animate-pulse" />
            ))}
          </div>
        ) : myRides.length === 0 ? (
          <div className="glass-card flex flex-col items-center justify-center gap-2 py-12 text-center">
            <Car className="size-8 opacity-30" style={{ color: 'var(--muted)' }} />
            <p className="text-sm font-medium" style={{ color: 'var(--muted)' }}>
              No rides published yet
            </p>
            <p className="text-xs" style={{ color: 'var(--subtle)' }}>
              Tap "Offer a New Ride" to share your first trip
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {myRides.map((ride) => (
              <RideCard key={ride.id.toString()} ride={ride} isOwn />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function FormField({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium" style={{ color: 'var(--muted)' }}>
        {label}
      </label>
      <div className="glass-inner flex items-center gap-2 px-3 py-2.5">
        {icon}
        {children}
      </div>
    </div>
  );
}
