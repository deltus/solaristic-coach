// Saving and sharing on the web: download a file, share text (parents' group chat) or copy it.
// Android (Capacitor) versions come later; Radar's src/files.ts shows the pattern.

export function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/** Opens the phone's share sheet with text, or copies it. Returns what happened. */
export async function shareText(text: string, title: string): Promise<'shared' | 'copied' | 'failed'> {
  if (navigator.share) {
    try {
      await navigator.share({ text, title });
      return 'shared';
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'failed';
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    return 'copied';
  } catch {
    return 'failed';
  }
}

export function readFileText(file: File): Promise<string> {
  return file.text();
}
