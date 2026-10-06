import { Loader2, CheckCircle2, XCircle, Clock, ExternalLink } from 'lucide-react';
import { buildTxExplorerUrl } from '@/onchain-facts';

const ARC_TESTNET_CHAIN_ID = 5042002;

export type TxStatus =
  | { type: 'idle' }
  | { type: 'pending'; label: string }
  | { type: 'confirming'; hash: `0x${string}`; label: string }
  | { type: 'success'; hash: `0x${string}`; label: string }
  | { type: 'error'; message: string };

interface EscrowStatusProps {
  status: TxStatus;
  onDismiss?: () => void;
}

export function EscrowStatus({ status, onDismiss }: EscrowStatusProps) {
  if (status.type === 'idle') return null;

  const explorerUrl =
    (status.type === 'confirming' || status.type === 'success') && status.hash
      ? buildTxExplorerUrl(ARC_TESTNET_CHAIN_ID, status.hash)
      : null;

  return (
    <div
      className="glass-card flex items-start gap-3 p-4"
      style={{
        borderColor:
          status.type === 'success'
            ? 'rgba(26,128,71,0.3)'
            : status.type === 'error'
            ? 'rgba(186,43,76,0.3)'
            : 'var(--border)',
      }}
    >
      {/* Icon */}
      <div className="mt-0.5 shrink-0">
        {status.type === 'pending' && (
          <Loader2 className="size-5 animate-spin" style={{ color: 'var(--accent-hover)' }} />
        )}
        {status.type === 'confirming' && (
          <Loader2 className="size-5 animate-spin" style={{ color: 'var(--warning)' }} />
        )}
        {status.type === 'success' && (
          <CheckCircle2 className="size-5" style={{ color: 'var(--success)' }} />
        )}
        {status.type === 'error' && (
          <XCircle className="size-5" style={{ color: 'var(--danger)' }} />
        )}
      </div>

      {/* Copy */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
          {status.type === 'pending' && status.label}
          {status.type === 'confirming' && 'Waiting for confirmation...'}
          {status.type === 'success' && status.label}
          {status.type === 'error' && 'Transaction failed'}
        </p>
        {(status.type === 'pending' || status.type === 'confirming') && (
          <p className="mt-0.5 text-xs" style={{ color: 'var(--muted)' }}>
            <Clock className="mr-1 inline size-3" />
            USDC is being locked in escrow on Arc Testnet
          </p>
        )}
        {status.type === 'error' && (
          <p className="mt-0.5 text-xs" style={{ color: 'var(--danger)' }}>
            {status.message}
          </p>
        )}
        {explorerUrl && (
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium"
            style={{ color: 'var(--accent-hover)' }}
          >
            View on ArcScan <ExternalLink className="size-3" />
          </a>
        )}
      </div>

      {/* Dismiss */}
      {(status.type === 'success' || status.type === 'error') && onDismiss && (
        <button
          onClick={onDismiss}
          className="shrink-0 text-xs font-medium"
          style={{ color: 'var(--subtle)' }}
        >
          Dismiss
        </button>
      )}
    </div>
  );
}
