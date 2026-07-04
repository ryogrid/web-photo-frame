function isAppleTouchDevice(): boolean {
  if (typeof navigator === 'undefined') {
    return false;
  }

  const platform = navigator.platform;
  const maxTouchPoints = navigator.maxTouchPoints || 0;

  return /iPad|iPhone|iPod/i.test(navigator.userAgent)
    || (platform === 'MacIntel' && maxTouchPoints > 1);
}

export function isIPadWebKit(): boolean {
  if (typeof navigator === 'undefined') {
    return false;
  }

  const userAgent = navigator.userAgent;
  const platform = navigator.platform;
  const maxTouchPoints = navigator.maxTouchPoints || 0;
  const isIPad = /iPad/i.test(userAgent) || (platform === 'MacIntel' && maxTouchPoints > 1);
  const isWebKit = /AppleWebKit/i.test(userAgent);

  return isIPad && isWebKit;
}

export function isMemoryConstrainedWebKit(): boolean {
  if (typeof navigator === 'undefined') {
    return false;
  }

  return isAppleTouchDevice() && /AppleWebKit/i.test(navigator.userAgent);
}