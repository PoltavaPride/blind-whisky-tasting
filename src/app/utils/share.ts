/**
 * Public join link for a round, resolved against <base href> so the
 * deployment's base path (e.g. /blind-whisky-tasting/ on GitHub Pages)
 * is preserved.
 */
export function joinUrlFor(roundId: string): string {
  return new URL(`tasting/${roundId}/join`, document.baseURI).toString();
}

/**
 * Copies text to the clipboard, falling back to a temporary textarea +
 * execCommand where the Clipboard API is blocked (e.g. embedded iframes).
 */
export async function copyToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const helper = document.createElement('textarea');
    helper.value = text;
    document.body.appendChild(helper);
    helper.select();
    document.execCommand('copy');
    helper.remove();
  }
}
