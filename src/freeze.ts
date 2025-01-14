type RelPath = { pathname: string; search: string };

type HistoryItem = {
  cacheKey: string;
  content: string;
  title: string;
  scroll: number;
  scripts: string[];
};

function getHistoryCache(): HistoryItem[] {
  return JSON.parse(
    localStorage.getItem("htmx-history-cache") ?? "[]",
  ) as HistoryItem[];
}

function getCachedHistory(url: RelPath): HistoryItem | null {
  const historyCache = getHistoryCache();

  for (const item of historyCache) {
    if (item.cacheKey === url.pathname + url.search) {
      return item;
    }
  }

  return null;
}

function beforeUnload(subscribedScripts: Set<string>): void {
  const content = document.body.innerHTML;
  const title = document.title;

  const scripts = Array.from(subscribedScripts);

  const historyCache = getHistoryCache();
  const cacheKey = location.pathname + location.search;
  for (let i = 0; i < historyCache.length; i++) {
    if (historyCache[i]?.cacheKey === cacheKey) {
      historyCache.splice(i, 1);
      break;
    }
  }

  const newHistoryItem: HistoryItem = {
    content,
    title,
    scripts,
    cacheKey,
    scroll: window.scrollY,
  };

  historyCache.push(newHistoryItem);

  // keep trying to save the cache until it succeeds or is empty
  while (historyCache.length > 0) {
    try {
      localStorage.setItem("htmx-history-cache", JSON.stringify(historyCache));
      break;
    } catch {
      historyCache.shift(); // shrink the cache and retry
    }
  }
}

let abortController = new AbortController();

async function restorePage(cached: HistoryItem, url: string): Promise<void> {
  abortController.abort();
  abortController = new AbortController();

  document.body.innerHTML = cached.content;

  const titleElt = document.querySelector("title");
  if (titleElt) {
    titleElt.innerHTML = cached.title;
  } else {
    window.document.title = cached.title;
  }

  window.setTimeout(() => window.scrollTo(0, cached.scroll), 0);
  await Promise.all(cached.scripts.map((src) => import(src)));
  history.replaceState({ freeze: true }, "", url);

  savePage();
}

function savePage(): void {
  const subscribedScripts = new Set<string>();

  window.addEventListener(
    "infsub",
    (e: CustomEventInit<string>) => {
      if (e.detail) {
        subscribedScripts.add(e.detail);
      }
    },
    { signal: abortController.signal },
  );

  bindAnchors();

  window.addEventListener(
    "beforeunload",
    () => beforeUnload(subscribedScripts),
    { signal: abortController.signal },
  );

  const originalPopstate = window.onpopstate
    ? window.onpopstate.bind(window)
    : null;

  window.addEventListener("popstate", (event) => {
    if (event.state?.freeze) {
      const newCached = getCachedHistory(location);
      if (newCached) {
        restorePage(newCached, location.href + location.search);
        return;
      }
      location.reload();
    } else if (originalPopstate) {
      originalPopstate(event);
    }
  });
}

function bindAnchors(): void {
  const anchors = document.body.querySelectorAll<HTMLAnchorElement>(
    "a[data-freeze-link]",
  );

  for (const anchor of anchors) {
    anchor.addEventListener("click", (clickEvent) => {
      const cached = getCachedHistory(new URL(anchor.href));
      if (cached) {
        clickEvent.preventDefault();
        restorePage(cached, anchor.href);
      }
    });
  }
}

bindAnchors();

if (document.body.hasAttribute("data-freeze")) {
  savePage();
}