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

/**
 * Utility to copy an image directly to the system RAM clipboard.
 * Loads the image, renders it onto an HTML5 canvas, and converts it to a PNG Blob
 * to ensure maximum compatibility with modern browser Clipboard API (navigator.clipboard.write).
 */
export async function copyImageToClipboard(imageUrl: string, fileName?: string): Promise<boolean> {
  // If running inside desktop client shell with native helper
  if ((window as any).gsvDesktop && typeof (window as any).gsvDesktop.copyFileToClipboard === 'function') {
    try {
      const fullUrl = imageUrl.startsWith('http') || imageUrl.startsWith('data:') ? imageUrl : `${window.location.origin}${imageUrl}`;
      const res = await (window as any).gsvDesktop.copyFileToClipboard({
        fileUrl: fullUrl,
        fileName: fileName || 'image.png'
      });
      if (res && res.success) {
        return true;
      }
    } catch (e) {
      console.warn('gsvDesktop copyFileToClipboard failed, falling back to web Clipboard API:', e);
    }
  }

  const fullUrl = imageUrl.startsWith('http') || imageUrl.startsWith('data:') ? imageUrl : `${window.location.origin}${imageUrl}`;

  try {
    // 1. Create HTML Image object with crossOrigin
    const img = new Image();
    img.crossOrigin = 'anonymous';

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to load image for clipboard copy'));
      img.src = fullUrl;
    });

    // 2. Draw on canvas to encode image/png
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || img.width || 300;
    canvas.height = img.naturalHeight || img.height || 300;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2D context for canvas');

    ctx.drawImage(img, 0, 0);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('Could not generate PNG blob from image');

    // 3. Write image/png blob to navigator.clipboard
    if (navigator.clipboard && navigator.clipboard.write) {
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      return true;
    }
    throw new Error('navigator.clipboard.write is not supported in this browser environment');
  } catch (err) {
    console.warn('Canvas image copy failed, attempting direct fetch fallback:', err);
    try {
      const res = await fetch(fullUrl);
      const fetchedBlob = await res.blob();
      if (navigator.clipboard && navigator.clipboard.write) {
        const type = fetchedBlob.type.startsWith('image/') ? fetchedBlob.type : 'image/png';
        await navigator.clipboard.write([
          new ClipboardItem({ [type]: fetchedBlob })
        ]);
        return true;
      }
    } catch (fallbackErr) {
      console.error('All image copy attempts failed:', fallbackErr);
    }
    // Fallback: copy link text if binary image copy is disallowed by browser
    return copyTextToClipboard(fullUrl);
  }
}
