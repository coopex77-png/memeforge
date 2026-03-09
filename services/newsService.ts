/**
 * NEWS SERVICE — V2: Hybrid RSS Feed Fetcher
 * 
 * 3-Tier Fetch Strategy:
 *   1. Vercel API Route (server-side, via proxy) — most reliable
 *   2. rss2json.com (client-side CORS proxy) — fallback for dev
 *   3. allorigins.win (client-side CORS proxy) — last resort
 * 
 * Features:
 *   - Per-feed timeout (10s) via AbortController
 *   - Automatic retry (1x) with different strategy
 *   - Feed health monitoring & reporting
 *   - Cleaned & expanded feed list
 */

export interface RawNewsItem {
    title: string;
    link: string;
    pubDate: string;
    description: string;
    thumbnail: string;
    sourceName: string;
}

export interface FeedHealthReport {
    totalFeeds: number;
    successfulFeeds: number;
    failedFeeds: number;
    totalArticles: number;
    feedResults: { name: string; status: 'ok' | 'failed'; articles: number; strategy: string; error?: string }[];
}

// --- RSS Feed Sources ---
// Curated list with THEME TAGS for category-based filtering.
// Each feed has `tags` array for theme matching: 'animal', 'hero', 'absurd', 'community', 'all'
// 'all' is implicit — every feed is included in 'all' mode.
const ALL_NEWS_FEEDS: { url: string; name: string; tags: string[] }[] = [
    // ═══════════════════════════════════════════
    // PILLAR 1: WEIRD / ABSURD / BIZARRE
    // ═══════════════════════════════════════════
    { url: "https://rss.upi.com/news/odd_news.rss", name: "UPI Odd News", tags: ['absurd'] },
    { url: "https://odditycentral.com/feed", name: "Oddity Central", tags: ['absurd', 'community'] },
    { url: "https://www.atlasobscura.com/feeds/latest", name: "Atlas Obscura", tags: ['absurd', 'community'] },
    { url: "https://www.damninteresting.com/feed", name: "Damn Interesting", tags: ['absurd', 'hero'] },
    { url: "https://www.dailygrail.com/feed/", name: "The Daily Grail", tags: ['absurd', 'community'] },
    { url: "https://www.neatorama.com/feed/", name: "Neatorama", tags: ['absurd', 'animal'] },
    { url: "https://listverse.com/feed/", name: "Listverse", tags: ['absurd', 'community'] },

    // UK Tabloid Weird Sections
    { url: "https://feeds.skynews.com/feeds/rss/strange.xml", name: "Sky News Weird", tags: ['absurd'] },
    { url: "https://www.mirror.co.uk/news/weird-news/rss.xml", name: "Mirror Weird News", tags: ['absurd', 'animal'] },
    { url: "https://metro.co.uk/entertainment/weird-news/feed/", name: "Metro Weird News", tags: ['absurd'] },
    { url: "https://www.thesun.co.uk/news/weird-news/feed/", name: "The Sun Weird News", tags: ['absurd', 'animal'] },

    // Additional weird/viral sources
    { url: "https://www.vice.com/en/rss", name: "VICE", tags: ['absurd', 'community'] },
    { url: "https://www.mentalfloss.com/feed", name: "Mental Floss", tags: ['absurd', 'animal', 'community'] },
    { url: "https://www.livescience.com/feeds/all", name: "Live Science", tags: ['absurd', 'animal'] },

    // ═══════════════════════════════════════════
    // PILLAR 2: NARRATIVE / HERO / LORE / SURVIVAL
    // ═══════════════════════════════════════════
    { url: "https://www.goodnewsnetwork.org/feed/", name: "Good News Network", tags: ['hero', 'animal', 'community'] },
    { url: "https://www.positive.news/feed/", name: "Positive News", tags: ['hero', 'community'] },
    { url: "https://www.huffpost.com/section/weird-news/feed", name: "HuffPost Weird", tags: ['absurd'] },
    { url: "https://www.boredpanda.com/feed/", name: "Bored Panda", tags: ['absurd', 'animal', 'hero'] },

    // More narrative/lore sources
    { url: "https://www.smithsonianmag.com/rss/latest_articles/", name: "Smithsonian Magazine", tags: ['hero', 'community', 'animal'] },
    { url: "https://www.sciencealert.com/feed", name: "Science Alert", tags: ['absurd', 'animal'] },
    { url: "https://arstechnica.com/feed/", name: "Ars Technica", tags: ['absurd'] },
    { url: "https://mashable.com/feeds/rss/all", name: "Mashable", tags: ['absurd', 'community'] },

    // ═══════════════════════════════════════════
    // PILLAR 3: ANIMAL-FOCUSED SOURCES
    // ═══════════════════════════════════════════
    { url: "https://www.thedodo.com/rss", name: "The Dodo", tags: ['animal', 'hero'] },
    { url: "https://feeds.bbci.co.uk/news/science_and_environment/rss.xml", name: "BBC Science & Nature", tags: ['animal', 'absurd'] },
    { url: "https://www.nationalgeographic.com/animals/feed", name: "NatGeo Animals", tags: ['animal'] },

    // ═══════════════════════════════════════════
    // PILLAR 4: REDDIT COMMUNITIES
    // ═══════════════════════════════════════════
    { url: "https://www.reddit.com/r/nottheonion/.rss", name: "Not The Onion", tags: ['absurd'] },
    { url: "https://www.reddit.com/r/offbeat/.rss", name: "Offbeat", tags: ['absurd'] },
    { url: "https://www.reddit.com/r/WeirdNews/.rss", name: "WeirdNews", tags: ['absurd'] },
    { url: "https://www.reddit.com/r/NewsOfTheStupid/.rss", name: "NewsOfTheStupid", tags: ['absurd'] },
    { url: "https://www.reddit.com/r/UpliftingNews/.rss", name: "UpliftingNews", tags: ['hero', 'community'] },
    { url: "https://www.reddit.com/r/HumansBeingBros/.rss", name: "HumansBeingBros", tags: ['hero', 'community'] },
    { url: "https://www.reddit.com/r/AnimalsBeingBros/.rss", name: "AnimalsBeingBros", tags: ['animal', 'hero'] },
    { url: "https://www.reddit.com/r/nextfuckinglevel/.rss", name: "nextfuckinglevel", tags: ['hero', 'absurd'] },
    { url: "https://www.reddit.com/r/Damnthatsinteresting/.rss", name: "Damnthatsinteresting", tags: ['absurd', 'community'] },
    { url: "https://www.reddit.com/r/todayilearned/.rss", name: "todayilearned", tags: ['absurd', 'community'] },
    { url: "https://www.reddit.com/r/aww/.rss", name: "r/aww", tags: ['animal'] },
    { url: "https://www.reddit.com/r/NatureIsFuckingLit/.rss", name: "NatureIsFuckingLit", tags: ['animal', 'absurd'] },
    { url: "https://www.reddit.com/r/AnimalsBeingDerps/.rss", name: "AnimalsBeingDerps", tags: ['animal', 'absurd'] },
    { url: "https://www.reddit.com/r/rarepuppers/.rss", name: "rarepuppers", tags: ['animal'] },

    // ═══════════════════════════════════════════
    // PILLAR 5: MAJOR NEWS (for hidden gems)
    // ═══════════════════════════════════════════
    { url: "https://feeds.bbci.co.uk/news/rss.xml", name: "BBC News", tags: ['hero', 'absurd'] },
    { url: "https://www.theguardian.com/world/rss", name: "Guardian World", tags: ['hero', 'absurd'] },
    { url: "https://rss.nytimes.com/services/xml/rss/nyt/World.xml", name: "NYT World", tags: ['hero', 'community'] },
    { url: "https://feeds.npr.org/1001/rss.xml", name: "NPR News", tags: ['hero', 'community'] },
];

// Detect if we're running in a Vercel-deployed environment
const isProduction = typeof window !== 'undefined' && window.location.hostname !== 'localhost';

// ═══════════════════════════════════════════════════════════
// FETCH STRATEGIES
// ═══════════════════════════════════════════════════════════

/**
 * Strategy 1: Server-side API route (Vercel + Proxy)
 * Most reliable — no CORS issues, uses residential proxy
 * Only works in production (Vercel deployment), skipped on localhost
 */
const fetchViaApiRoute = async (feedUrl: string, signal: AbortSignal): Promise<RawNewsItem[] | null> => {
    // Skip on localhost — Vercel serverless functions only run in production
    if (!isProduction) return null;

    try {
        const apiUrl = `/api/rss?feed=${encodeURIComponent(feedUrl)}`;
        const response = await fetch(apiUrl, { signal });

        if (!response.ok) return null;

        const data = await response.json();
        if (data.status === 'ok' && Array.isArray(data.items)) {
            return data.items.map((item: any) => ({
                title: (item.title || '').trim(),
                link: (item.link || '').trim(),
                pubDate: (item.pubDate || '').trim(),
                description: (item.description || '').substring(0, 300),
                thumbnail: item.thumbnail || '',
                sourceName: '', // Will be set by the caller
            }));
        }
        return null;
    } catch {
        return null;
    }
};

/**
 * Strategy 2: rss2json.com (free CORS proxy, returns JSON)
 */
const fetchViaRss2Json = async (feedUrl: string, signal: AbortSignal): Promise<RawNewsItem[] | null> => {
    try {
        const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}`;
        const response = await fetch(apiUrl, { signal });

        if (!response.ok) return null;

        const data = await response.json();
        if (data.status === 'ok' && Array.isArray(data.items) && data.items.length > 0) {
            return data.items.map((item: any) => ({
                title: (item.title || '').trim(),
                link: (item.link || '').trim(),
                pubDate: (item.pubDate || '').trim(),
                description: stripHtml((item.description || '')).substring(0, 300),
                thumbnail: item.thumbnail || item.enclosure?.link || '',
                sourceName: '',
            }));
        }
        return null;
    } catch {
        return null;
    }
};

/**
 * Strategy 3: allorigins.win (free CORS proxy, returns raw XML)
 */
const fetchViaAllOrigins = async (feedUrl: string, signal: AbortSignal): Promise<RawNewsItem[] | null> => {
    try {
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(feedUrl)}`;
        const response = await fetch(proxyUrl, { signal });

        if (!response.ok) return null;

        const xmlText = await response.text();
        return parseRssXml(xmlText);
    } catch {
        return null;
    }
};

// ═══════════════════════════════════════════════════════════
// CORE FETCH FUNCTION (with timeout, retry, 3-tier strategy)
// ═══════════════════════════════════════════════════════════

interface FeedResult {
    items: RawNewsItem[];
    strategy: string;
    error?: string;
}

const FEED_TIMEOUT_MS = 10000; // 10 second timeout per feed

const fetchSingleFeed = async (feedUrl: string, sourceName: string): Promise<FeedResult> => {
    const strategies = [
        { fn: fetchViaApiRoute, name: 'api-route' },
        { fn: fetchViaRss2Json, name: 'rss2json' },
        { fn: fetchViaAllOrigins, name: 'allorigins' },
    ];

    for (const strategy of strategies) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), FEED_TIMEOUT_MS);

        try {
            const items = await strategy.fn(feedUrl, controller.signal);
            clearTimeout(timeoutId);

            if (items && items.length > 0) {
                // Set sourceName on all items
                const taggedItems = items
                    .map(item => ({ ...item, sourceName }))
                    .filter(item => item.title.length > 5 && item.link.length > 10);

                if (taggedItems.length > 0) {
                    console.log(`[NewsService] ✓ ${sourceName} → ${taggedItems.length} items (${strategy.name})`);
                    return { items: taggedItems, strategy: strategy.name };
                }
            }
        } catch (err: any) {
            clearTimeout(timeoutId);
            // AbortError means timeout — try next strategy
            if (err.name === 'AbortError') {
                console.warn(`[NewsService] ⏱ ${sourceName} timeout (${strategy.name})`);
            }
        }
    }

    // All strategies failed
    console.warn(`[NewsService] ✗ ${sourceName} — all strategies failed`);
    return { items: [], strategy: 'none', error: 'All strategies failed' };
};

// ═══════════════════════════════════════════════════════════
// XML PARSING (for allorigins fallback)
// ═══════════════════════════════════════════════════════════

const parseRssXml = (xmlText: string): RawNewsItem[] => {
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(xmlText, 'text/xml');

        const parseError = doc.querySelector('parsererror');
        if (parseError) return [];

        const items: RawNewsItem[] = [];

        // Try RSS 2.0 first, then Atom
        let entries = doc.querySelectorAll('item');
        if (entries.length === 0) {
            entries = doc.querySelectorAll('entry');
        }

        entries.forEach(entry => {
            const title = entry.querySelector('title')?.textContent?.trim() || '';

            let link = entry.querySelector('link')?.textContent?.trim() || '';
            if (!link) {
                link = entry.querySelector('link')?.getAttribute('href') || '';
            }

            const pubDate = (
                entry.querySelector('pubDate')?.textContent ||
                entry.querySelector('published')?.textContent ||
                entry.querySelector('updated')?.textContent ||
                entry.querySelector('dc\\:date')?.textContent ||
                ''
            ).trim();

            const description = stripHtml(
                entry.querySelector('description')?.textContent ||
                entry.querySelector('summary')?.textContent ||
                entry.querySelector('content')?.textContent ||
                ''
            ).substring(0, 300);

            const thumbnail =
                entry.querySelector('media\\:thumbnail')?.getAttribute('url') ||
                entry.querySelector('media\\:content')?.getAttribute('url') ||
                entry.querySelector('enclosure')?.getAttribute('url') ||
                '';

            if (title.length > 5 && link.length > 10) {
                items.push({ title, link, pubDate, description, thumbnail, sourceName: '' });
            }
        });

        return items;
    } catch {
        return [];
    }
};

// ═══════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════

const stripHtml = (html: string): string => {
    return html
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim();
};

const isWithinTimeRange = (dateStr: string, timeRange: '24h' | '48h' | '1w'): boolean => {
    try {
        const articleDate = new Date(dateStr).getTime();
        if (isNaN(articleDate)) return true; // If date unparseable, include it

        const now = Date.now();
        const hourMs = 60 * 60 * 1000;

        let cutoff: number;
        switch (timeRange) {
            case '24h': cutoff = now - (24 * hourMs); break;
            case '48h': cutoff = now - (48 * hourMs); break;
            case '1w': cutoff = now - (7 * 24 * hourMs); break;
            default: cutoff = now - (24 * hourMs);
        }

        return articleDate >= cutoff;
    } catch {
        return true;
    }
};

const areTitlesSimilar = (a: string, b: string): boolean => {
    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
    const na = normalize(a);
    const nb = normalize(b);

    if (na === nb) return true;

    // Check containment
    if (na.length > 15 && nb.length > 15) {
        if (na.includes(nb) || nb.includes(na)) return true;
    }

    // Word overlap check (>70% = same story)
    const wordsA = new Set(na.split(/\s+/).filter(w => w.length > 3));
    const wordsB = new Set(nb.split(/\s+/).filter(w => w.length > 3));

    if (wordsA.size === 0 || wordsB.size === 0) return false;

    let overlap = 0;
    for (const w of wordsA) {
        if (wordsB.has(w)) overlap++;
    }

    const overlapRatio = overlap / Math.min(wordsA.size, wordsB.size);
    return overlapRatio > 0.7;
};

// ═══════════════════════════════════════════════════════════
// MAIN EXPORT
// ═══════════════════════════════════════════════════════════

/**
 * Fetch all news feeds with 3-tier strategy, deduplicate, filter by time & keyword.
 * Returns clean, real, verified news items + a health report.
 */
export const fetchAllNewsFeeds = async (
    timeRange: '24h' | '48h' | '1w' = '24h',
    targetKeyword?: string,
    excludedTopics: string[] = [],
    themeFilter?: string
): Promise<RawNewsItem[]> => {
    // Filter feeds by theme if specified
    const feedsToScan = (!themeFilter || themeFilter === 'all')
        ? ALL_NEWS_FEEDS
        : ALL_NEWS_FEEDS.filter(feed => feed.tags.includes(themeFilter));

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`[NewsService] Starting full scan: ${feedsToScan.length} feeds (theme: ${themeFilter || 'all'})`);
    console.log(`${'═'.repeat(60)}`);

    // Fetch ALL feeds in parallel with per-feed timeout
    const feedPromises = feedsToScan.map(feed =>
        fetchSingleFeed(feed.url, feed.name)
    );
    const feedResults = await Promise.all(feedPromises);

    // ─── Build Health Report ───
    const healthReport: FeedHealthReport = {
        totalFeeds: feedsToScan.length,
        successfulFeeds: 0,
        failedFeeds: 0,
        totalArticles: 0,
        feedResults: [],
    };

    let allItems: RawNewsItem[] = [];

    feedResults.forEach((result, i) => {
        const feedName = feedsToScan[i].name;
        const articleCount = result.items.length;

        if (articleCount > 0) {
            healthReport.successfulFeeds++;
            healthReport.totalArticles += articleCount;
            allItems.push(...result.items);
        } else {
            healthReport.failedFeeds++;
        }

        healthReport.feedResults.push({
            name: feedName,
            status: articleCount > 0 ? 'ok' : 'failed',
            articles: articleCount,
            strategy: result.strategy,
            error: result.error,
        });
    });

    // ─── Log Health Report ───
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`[NewsService] 📊 FEED HEALTH REPORT`);
    console.log(`  ✓ Successful: ${healthReport.successfulFeeds}/${healthReport.totalFeeds}`);
    console.log(`  ✗ Failed:     ${healthReport.failedFeeds}/${healthReport.totalFeeds}`);
    console.log(`  📰 Total Articles: ${healthReport.totalArticles}`);
    console.log(`${'─'.repeat(60)}\n`);

    // Log failed feeds for debugging
    const failedFeeds = healthReport.feedResults.filter(f => f.status === 'failed');
    if (failedFeeds.length > 0) {
        console.log(`[NewsService] Failed feeds:`);
        failedFeeds.forEach(f => console.log(`  ✗ ${f.name}: ${f.error || 'unknown'}`));
    }

    // ─── Blacklist Filter ───
    const BANNED_KEYWORDS = ['trump', 'biden', 'harris', 'putin', 'zelensky', 'election', 'democrat', 'republican'];
    allItems = allItems.filter(item => {
        const text = (item.title + ' ' + item.description).toLowerCase();
        return !BANNED_KEYWORDS.some(banned => text.includes(banned));
    });

    // ─── Time Range Filter ───
    allItems = allItems.filter(item => isWithinTimeRange(item.pubDate, timeRange));

    // ─── Keyword Filter ───
    if (targetKeyword && targetKeyword.trim().length > 0) {
        const kw = targetKeyword.toLowerCase().trim();
        const keywords = kw.split(/\s+/);
        allItems = allItems.filter(item => {
            const text = (item.title + ' ' + item.description).toLowerCase();
            return keywords.some(k => text.includes(k));
        });
    }

    // ─── Excluded Topics Filter ───
    if (excludedTopics.length > 0) {
        allItems = allItems.filter(item => {
            return !excludedTopics.some(excluded =>
                areTitlesSimilar(item.title, excluded)
            );
        });
    }

    // ─── Deduplicate ───
    const deduped: RawNewsItem[] = [];
    for (const item of allItems) {
        const isDupe = deduped.some(existing => areTitlesSimilar(existing.title, item.title));
        if (!isDupe) {
            deduped.push(item);
        }
    }

    // ─── Shuffle for variety ───
    for (let i = deduped.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deduped[i], deduped[j]] = [deduped[j], deduped[i]];
    }

    console.log(`[NewsService] Final: ${deduped.length} unique articles (from ${healthReport.totalArticles} total, ${healthReport.successfulFeeds} feeds)`);

    return deduped;
};
