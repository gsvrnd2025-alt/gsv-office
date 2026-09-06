/**
 * Utility to copy text to clipboard that works seamlessly in both secure (HTTPS) and non-secure (HTTP/LAN IP) contexts.
 * Uses a fully synchronous path for the legacy copy to preserve Chrome/Edge/Firefox user gesture tokens.
 */
export function copyTextToClipboard(text: string): boolean {
  if (!text) return false;

  // Check if we are in a native secure context
  const isSecure = (window.isSecureContext || window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  if (isSecure && navigator?.clipboard?.writeText) {
    try {
      navigator.clipboard.writeText(text).catch(err => {
        console.warn("navigator.clipboard async write failed, using fallback:", err);
        copyTextFallback(text);
      });
      return true;
    } catch {
      return copyTextFallback(text);
    }
  }

  return copyTextFallback(text);
}

export function copyUrlOrTextToClipboard(target: string): boolean {
  if (!target) return false;
  let textToCopy = target;
  if (target.startsWith('/')) {
    textToCopy = `${window.location.origin}${target}`;
  }
  return copyTextToClipboard(textToCopy);
}

function copyTextFallback(text: string): boolean {
  try {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    
    // Position off-screen without hiding to satisfy browser selection checks
    textArea.style.position = "fixed";
    textArea.style.top = "0";
    textArea.style.left = "-9999px";
    textArea.style.opacity = "0";
    textArea.setAttribute("readonly", "");
    
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    textArea.setSelectionRange(0, text.length + 100);
    
    let success = false;
    try {
      success = document.execCommand('copy');
    } catch (err) {
      console.error("execCommand fallback failed:", err);
    }
    
    document.body.removeChild(textArea);
    return success;
  } catch (err) {
    console.error("copyTextFallback failed:", err);
    return false;
  }
}
