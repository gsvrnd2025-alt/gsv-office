/**
 * Utility to copy text to clipboard that works in both secure (HTTPS) and non-secure (HTTP) contexts.
 * Uses a fully synchronous path for the legacy copy to preserve Chrome's user gesture token.
 */
export function copyTextToClipboard(text: string): boolean {
  // Check if we are in a secure context
  const isSecure = window.isSecureContext || window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  if (isSecure && navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).catch(err => {
      console.warn("navigator.clipboard async write failed, trying fallback...", err);
      copyTextFallback(text);
    });
    return true; // Secure context standard API trigger
  }

  return copyTextFallback(text);
}

function copyTextFallback(text: string): boolean {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  
  // Clean off-screen positioning to satisfy browser visibility checks
  textArea.style.position = "fixed";
  textArea.style.left = "-9999px";
  textArea.style.top = "0";
  textArea.setAttribute("readonly", ""); // Prevent mobile keyboard popup
  
  document.body.appendChild(textArea);
  textArea.select();
  textArea.setSelectionRange(0, 99999); // Support iOS/mobile selection range
  
  let success = false;
  try {
    success = document.execCommand('copy');
  } catch (err) {
    console.error("execCommand fallback failed:", err);
  }
  
  document.body.removeChild(textArea);
  return success;
}
