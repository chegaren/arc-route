export function parseOnchainError(error: unknown): string {
  const raw = (error as { message?: string })?.message?.toLowerCase() ?? '';

  if (raw.includes('user rejected') || (error as { code?: number })?.code === 4001) {
    return 'Transaction cancelled.';
  }
  if (raw.includes('insufficient funds') || raw.includes('exceeds balance')) {
    return 'Insufficient USDC balance. Get test USDC from the sidebar.';
  }
  if (raw.includes('already departed')) {
    return 'This ride has already departed and can no longer be booked.';
  }
  if (raw.includes('no seats available')) {
    return 'No seats remaining on this ride.';
  }
  if (raw.includes('not active')) {
    return 'This ride is no longer active.';
  }
  if (raw.includes('reverted')) {
    const reasonMatch = raw.match(/reason="([^"]+)"/);
    return reasonMatch ? `Transaction failed: ${reasonMatch[1]}` : 'Transaction failed. Please try again.';
  }
  if (raw.includes('network') || raw.includes('timeout')) {
    return 'Network error. Please check your connection and retry.';
  }
  return 'Something went wrong. Please try again.';
}
