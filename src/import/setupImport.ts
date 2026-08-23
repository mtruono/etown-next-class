export interface SetupFragmentResult {
  code: string | null;
  hadFragment: boolean;
}

interface LocationLike {
  hash: string;
  pathname: string;
  search: string;
}

interface HistoryLike {
  replaceState(data: unknown, unused: string, url?: string | URL | null): void;
}

export function takeSetupCodeFromFragment(
  location: LocationLike,
  history: HistoryLike,
): SetupFragmentResult {
  if (!location.hash.startsWith("#setup="))
    return { code: null, hadFragment: false };

  const encoded = location.hash.slice("#setup=".length);
  history.replaceState(null, "", `${location.pathname}${location.search}`);

  try {
    return { code: decodeURIComponent(encoded), hadFragment: true };
  } catch {
    return { code: null, hadFragment: true };
  }
}
