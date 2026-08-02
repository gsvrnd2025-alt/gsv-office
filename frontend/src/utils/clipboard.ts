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
  const fullUrl = imageUrl.startsWith('http') || imageUrl.startsWith('data:') ? imageUrl : `${window.location.origin}${imageUrl}`;

  // 1. If running inside desktop client shell with native helper
  if ((window as any).gsvDesktop && typeof (window as any).gsvDesktop.copyFileToClipboard === 'function') {
    try {
      const res = await (window as any).gsvDesktop.copyFileToClipboard({
        fileUrl: fullUrl,
        fileName: fileName || 'image.png'
      });
      if (res && res.success) {
        return true;
      }
    } catch (e) {
      console.warn('gsvDesktop copyFileToClipboard failed, trying web fallback:', e);
    }
  }

  // 2. Try modern Clipboard API (HTTPS / localhost)
  const isSecure = window.isSecureContext || window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  if (isSecure && navigator.clipboard && navigator.clipboard.write) {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load image for clipboard copy'));
        img.src = fullUrl;
      });

      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width || 300;
      canvas.height = img.naturalHeight || img.height || 300;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
        if (blob) {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]);
          return true;
        }
      }
    } catch (err) {
      console.warn('navigator.clipboard.write failed, trying DOM image copy fallback:', err);
    }
  }

  // 3. Fallback for HTTP non-secure origins (e.g. http://192.168.0.177:8080) using DOM node selection & execCommand
  const domCopySuccess = copyImageViaDOMSelection(fullUrl);
  if (domCopySuccess) {
    return true;
  }

  // 4. Final fallback: copy link URL text
  return copyTextToClipboard(fullUrl);
}

function copyImageViaDOMSelection(imageUrl: string): boolean {
  try {
    const container = document.createElement('div');
    container.contentEditable = 'true';
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '1px';
    container.style.height = '1px';
    container.style.opacity = '0';

    const img = document.createElement('img');
    img.src = imageUrl;
    img.crossOrigin = 'anonymous';

    container.appendChild(img);
    document.body.appendChild(container);

    const range = document.createRange();
    range.selectNode(img);

    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range);
    }

    const success = document.execCommand('copy');

    if (selection) {
      selection.removeAllRanges();
    }
    document.body.removeChild(container);
    return success;
  } catch (err) {
    console.warn('DOM selection image copy failed:', err);
    return false;
  }
}
