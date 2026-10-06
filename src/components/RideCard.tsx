import { MapPin, Clock, Users, DollarSign, CheckCircle, XCircle, ArrowRight } from 'lucide-react';

export interface RideDisplay {
  id: bigint;
  driver: string;
  origin: string;
  destination: string;
  departureTime: bigint;
  totalSeats: number;
  availableSeats: number;
  pricePerSeat: bigint;
  active: boolean;
}

interface RideCardProps {
  ride: RideDisplay;
  onBook?: (rideId: bigint) => void;
  isBooking?: boolean;
  isOwn?: boolean;
}

function formatAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function formatDeparture(ts: bigint): string {
  const d = new Date(Number(ts) * 1000);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatUsdc(amount: bigint): string {
  const val = Number(amount) / 1_000_000;
  return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function RideCard({ ride, onBook, isBooking, isOwn }: RideCardProps) {
  const nowSec = Math.floor(new Date().getTime() / 1000);
  const departed = nowSec >= Number(ride.departureTime);
  const canBook = ride.active && ride.availableSeats > 0 && !departed && !isOwn;

  return (
    <article
      className="glass-card p-5 transition-shadow hover:shadow-md"
      style={{ opacity: !ride.active ? 0.55 : 1 }}
    >
      {/* Route */}
      <div className="mb-4 flex items-center gap-3">
        <div className="flex flex-col items-center gap-1">
          <MapPin className="size-4" style={{ color: 'var(--accent-hover)' }} />
          <div className="h-6 w-px" style={{ background: 'var(--border-strong)' }} />
          <MapPin className="size-4" style={{ color: 'var(--success)' }} />
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="display text-base font-semibold" style={{ color: 'var(--ink)' }}>
            {ride.origin}
          </span>
          <span className="display text-base font-semibold" style={{ color: 'var(--ink)' }}>
            {ride.destination}
          </span>
        </div>
        <ArrowRight className="ml-auto size-5" style={{ color: 'var(--subtle)' }} />
      </div>

      {/* Meta row */}
      <div className="mb-4 flex flex-wrap gap-3">
        <MetaChip icon={<Clock className="size-3.5" />} label={formatDeparture(ride.departureTime)} />
        <MetaChip
          icon={<Users className="size-3.5" />}
          label={`${ride.availableSeats}/${ride.totalSeats} seats`}
          highlight={ride.availableSeats === 0}
        />
        <MetaChip
          icon={<DollarSign className="size-3.5" />}
          label={`${formatUsdc(ride.pricePerSeat)} USDC`}
          accent
        />
      </div>

      {/* Driver */}
      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs" style={{ color: 'var(--subtle)' }}>
          Driver:{' '}
          <span className="mono font-medium" style={{ color: 'var(--muted)' }}>
            {formatAddress(ride.driver)}
          </span>
        </span>
        {isOwn && (
          <span
            className="rounded-full px-2 py-0.5 text-xs font-semibold"
            style={{ background: 'rgba(18,45,69,0.08)', color: 'var(--accent)' }}
          >
            Your ride
          </span>
        )}
        {!ride.active && (
          <span
            className="flex items-center gap-1 text-xs font-semibold"
            style={{ color: 'var(--danger)' }}
          >
            <XCircle className="size-3.5" /> Cancelled
          </span>
        )}
        {ride.active && departed && (
          <span
            className="flex items-center gap-1 text-xs font-semibold"
            style={{ color: 'var(--warning)' }}
          >
            <CheckCircle className="size-3.5" /> Departed
          </span>
        )}
      </div>

      {/* CTA */}
      {onBook && (
        <button
          disabled={!canBook || isBooking}
          onClick={() => canBook && onBook(ride.id)}
          className="w-full rounded-2xl py-3 text-sm font-semibold text-white transition-all hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
          style={{ background: 'var(--accent)' }}
        >
          {isBooking
            ? 'Confirm in wallet...'
            : ride.availableSeats === 0
            ? 'Fully Booked'
            : departed
            ? 'Already Departed'
            : `Book Seat — ${formatUsdc(ride.pricePerSeat)} USDC`}
        </button>
      )}
    </article>
  );
}

function MetaChip({
  icon,
  label,
  highlight,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  highlight?: boolean;
  accent?: boolean;
}) {
  return (
    <div
      className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
      style={{
        background: accent
          ? 'rgba(18,45,69,0.06)'
          : highlight
          ? 'rgba(186,43,76,0.08)'
          : 'var(--surface-muted)',
        color: accent ? 'var(--accent)' : highlight ? 'var(--danger)' : 'var(--muted)',
      }}
    >
      {icon}
      <span className="tabular-nums">{label}</span>
    </div>
  );
}
