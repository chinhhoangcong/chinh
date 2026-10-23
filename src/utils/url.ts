/**
 * Returns the public shared URL that anyone on any phone can access directly
 * without requiring any Google login or authentication.
 */
export const SHARED_PUBLIC_URL = 'https://ais-pre-cdn6za537525cc5iucwcth-155266384191.asia-southeast1.run.app';

export function getPublicShareUrl(): string {
  if (typeof window === 'undefined') {
    return SHARED_PUBLIC_URL;
  }
  const current = window.location.href;
  if (current.includes('ais-dev-')) {
    return current.replace('ais-dev-', 'ais-pre-');
  }
  if (current.includes('ais-pre-')) {
    return current;
  }
  return SHARED_PUBLIC_URL;
}
