/**
 * Utility to copy text to clipboard that works in both secure (HTTPS) and non-secure (HTTP) contexts.
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      console.warn("navigator.clipboard failed, trying fallback...", e);
    }
  }

  // Fallback using legacy textarea method
  const textArea = document.createElement("textarea");
  textArea.value = text;
  
  // Keep out of sight and avoid scrolling
  textArea.style.top = "0";
  textArea.style.left = "0";
  textArea.style.position = "fixed";
  textArea.style.opacity = "0";
  textArea.style.pointerEvents = "none";

  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error("Fallback copy failed:", err);
    document.body.removeChild(textArea);
    return false;
  }
}
