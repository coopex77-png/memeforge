import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Vercel Serverless API Route: /api/rss
 * 
 * Fetches RSS feeds server-side using the ProxyCheap residential proxy.
 * This eliminates CORS issues and free proxy dependencies.
 * 
 * Usage: GET /api/rss?feed=https://rss.upi.com/news/odd_news.rss
 * Returns: Parsed RSS items as JSON
 */

interface ParsedItem {
    title: string;
    link: string;
    pubDate: string;
    description: string;
    thumbnail: string;
}

// Simple HTML tag stripper
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

// Simple XML tag content extractor
const getTagContent = (xml: string, tag: string): string => {
    // Try standard tag
    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
    const match = xml.match(regex);
    if (match) return match[1].trim();

    // Try CDATA
    const cdataRegex = new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`, 'i');
    const cdataMatch = xml.match(cdataRegex);
    if (cdataMatch) return cdataMatch[1].trim();

    return '';
};

// Extract attribute from a tag
const getTagAttribute = (xml: string, tag: string, attr: string): string => {
    const regex = new RegExp(`<${tag}[^>]*\\s${attr}=["']([^"']*)["'][^>]*/?>`, 'i');
    const match = xml.match(regex);
    return match ? match[1].trim() : '';
};

// Parse RSS/Atom XML into items
const parseXmlToItems = (xml: string): ParsedItem[] => {
    const items: ParsedItem[] = [];

    // Determine if RSS or Atom
    const isAtom = xml.includes('<feed') && xml.includes('xmlns="http://www.w3.org/2005/Atom"');

    // Split into items/entries
    const itemRegex = isAtom
        ? /<entry[\s>]([\s\S]*?)<\/entry>/gi
        : /<item[\s>]([\s\S]*?)<\/item>/gi;

    let match;
    while ((match = itemRegex.exec(xml)) !== null) {
        const block = match[1];

        const title = stripHtml(getTagContent(block, 'title'));

        let link = getTagContent(block, 'link');
        if (!link || link.trim() === '') {
            // Atom format: <link href="..." />
            link = getTagAttribute(block, 'link', 'href');
        }

        const pubDate = getTagContent(block, 'pubDate')
            || getTagContent(block, 'published')
            || getTagContent(block, 'updated')
            || getTagContent(block, 'dc:date')
            || '';

        const description = stripHtml(
            getTagContent(block, 'description')
            || getTagContent(block, 'summary')
            || getTagContent(block, 'content')
            || ''
        ).substring(0, 500);

        // Try to get thumbnail
        const thumbnail =
            getTagAttribute(block, 'media:thumbnail', 'url')
            || getTagAttribute(block, 'media:content', 'url')
            || getTagAttribute(block, 'enclosure', 'url')
            || '';

        if (title.length > 5 && link.length > 10) {
            items.push({ title, link, pubDate, description, thumbnail });
        }
    }

    return items;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // CORS headers for the frontend
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const feedUrl = req.query.feed as string;

    if (!feedUrl) {
        return res.status(400).json({ error: 'Missing ?feed= parameter' });
    }

    // Validate URL
    try {
        new URL(feedUrl);
    } catch {
        return res.status(400).json({ error: 'Invalid feed URL' });
    }

    const proxyHost = process.env.PROXY_HOST;
    const proxyPort = process.env.PROXY_PORT;
    const proxyUser = process.env.PROXY_USER;
    const proxyPass = process.env.PROXY_PASS;

    const timeout = 12000; // 12 second timeout

    try {
        let response: Response;

        if (proxyHost && proxyPort && proxyUser && proxyPass) {
            // --- STRATEGY 1: Fetch via ProxyCheap Residential Proxy ---
            // Use https-proxy-agent for HTTP proxy tunneling
            const { HttpsProxyAgent } = await import('https-proxy-agent');
            const proxyUrl = `http://${proxyUser}:${proxyPass}@${proxyHost}:${proxyPort}`;
            const agent = new HttpsProxyAgent(proxyUrl);

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);

            try {
                // node-fetch supports the agent option
                const nodeFetch = (await import('node-fetch')).default;
                const fetchResponse = await nodeFetch(feedUrl, {
                    agent,
                    signal: controller.signal as any,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Accept': 'application/rss+xml, application/xml, application/atom+xml, text/xml, */*',
                    },
                });
                clearTimeout(timeoutId);

                if (!fetchResponse.ok) {
                    throw new Error(`Proxy fetch failed: ${fetchResponse.status} ${fetchResponse.statusText}`);
                }

                const xmlText = await fetchResponse.text();
                const items = parseXmlToItems(xmlText);

                return res.status(200).json({
                    status: 'ok',
                    strategy: 'proxy',
                    itemCount: items.length,
                    items,
                });
            } catch (proxyErr: any) {
                clearTimeout(timeoutId);
                console.warn(`[API/rss] Proxy fetch failed for ${feedUrl}: ${proxyErr.message}`);
                // Fall through to direct fetch
            }
        }

        // --- STRATEGY 2: Direct fetch (no proxy) ---
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
            response = await fetch(feedUrl, {
                signal: controller.signal,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; MemeForge/1.0; +https://memeforge.app)',
                    'Accept': 'application/rss+xml, application/xml, application/atom+xml, text/xml, */*',
                },
            });
            clearTimeout(timeoutId);
        } catch (fetchErr: any) {
            clearTimeout(timeoutId);
            return res.status(502).json({
                error: `Failed to fetch feed: ${fetchErr.message}`,
                strategy: 'direct',
            });
        }

        if (!response.ok) {
            return res.status(502).json({
                error: `Feed returned ${response.status}: ${response.statusText}`,
                strategy: 'direct',
            });
        }

        const xmlText = await response.text();
        const items = parseXmlToItems(xmlText);

        return res.status(200).json({
            status: 'ok',
            strategy: 'direct',
            itemCount: items.length,
            items,
        });

    } catch (err: any) {
        console.error(`[API/rss] Unhandled error for ${feedUrl}:`, err);
        return res.status(500).json({
            error: `Internal error: ${err.message}`,
        });
    }
}
