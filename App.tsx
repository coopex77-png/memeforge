
import React, { useState, useRef, useEffect } from 'react';
import { Mascot, MascotIdea, XTrend, Scene } from './types';
import {
    generateMascotIdeas,
    generateMascotImageOnly,
    prepareUploadIdeas,
    generateMascotIdeasFromCustomInput,
    getAvailableKeyCount,
    processWithConcurrencyLimit,
    generateId,
    AVAILABLE_ART_STYLES,
    performXDeepResearch,
    performGlobalNewsResearch,
    performMetaResearch,
    perform4chanResearch,
    performKymResearch,
    performRedditResearch,
    performTikTokResearch,
    performGodModeResearch,
    generateScenarioPrompts,
    generateDexBannerImage,
    generateXCommBannerImage,
    generateSceneImage,
    generateTraitVariations,
    createPaddedBanner,
    createPaddedXBanner
} from './services/geminiService';
import { Button } from './components/Button';
import { MascotCard } from './components/MascotCard';
import { LoadingScreen } from './components/LoadingScreen';
import { MascotDetailView } from './components/MascotDetailView';
import saveAs from 'file-saver';
import JSZip from 'jszip';
import { DatabaseUser } from './types';
import { supabase, deductCredits } from './supabase';
import { LandingPage } from './components/LandingPage';
import { AdminDashboard } from './components/AdminDashboard';
import { LiteModeWizard } from './components/LiteModeWizard';

const LOADING_IMAGE_PLACEHOLDER = "https://placehold.co/1024x1024/1e293b/475569?text=Rendering...";

const InfoTooltip = ({ text }: { text: string }) => (
    <div className="group/tooltip relative inline-flex items-center justify-center">
        <svg className="w-4 h-4 text-slate-500 hover:text-slate-300 cursor-help transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        <div className="absolute bottom-full right-0 mb-2 hidden group-hover/tooltip:block w-48 bg-black/95 border border-white/10 text-slate-300 text-[10px] p-2 rounded shadow-2xl backdrop-blur-sm z-50 pointer-events-none animate-in fade-in zoom-in-95 duration-200 origin-bottom-right">
            {text}
        </div>
    </div>
);

const base64ToJpg = (base64: string): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL('image/jpeg', 0.9));
            } else {
                resolve(base64);
            }
        };
        img.onerror = () => resolve(base64);
        img.src = base64;
    });
};

const sanitizeFilename = (name: string) => {
    return name.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') || "mascot_assets";
};

// --- ICON HELPERS ---
const SourceBadge = ({ source }: { source?: string }) => {
    if (!source) return null;

    let icon = null;
    let colorClass = "bg-slate-700 text-white";
    let label = source.toUpperCase();

    switch (source) {
        case 'x':
            colorClass = "bg-black text-white border border-white/20";
            icon = <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>;
            break;
        case 'reddit':
            colorClass = "bg-orange-600 text-white";
            icon = <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11c-.83 0-1.5-.67-1.5-1.5S16.17 10 17 10s1.5.67 1.5 1.5S17.83 13 17 13zm-5 2c-2.33 0-4.31-1.46-5.11-3.5h10.22c-.8 2.04-2.78 3.5-5.11 3.5zM7 13c-.83 0-1.5-.67-1.5-1.5S6.17 10 7 10s1.5.67 1.5 1.5S7.83 13 7 13z" /></svg>;
            break;
        case '4chan':
            colorClass = "bg-[#00FF00] text-black";
            icon = <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C9.24 2 7 4.24 7 7c0 .26.04.5.09.74-.08-.02-.17-.03-.25-.03-2.76 0-5 2.24-5 5s2.24 5 5 5c.26 0 .5-.04.74-.09-.02.08-.03.17-.03.25 0 2.76 2.24 5 5 5s5-2.24 5-5c0-.26-.04-.5-.09-.74.08.02.17.03.25.03 2.76 0 5-2.24 5-5s-2.24-5-5-5c-.26 0-.5.04-.74.09.02-.08.03-.17.03-.25 0-2.76-2.24-5-5-5S12 2 12 2zm0 2c1.66 0 3 1.34 3 3 0 .42-.1.82-.26 1.18-.7.16-1.26.54-1.68 1.04-.42.5-.66 1.12-.66 1.78s.24 1.28.66 1.78c.42.5.98.88 1.68 1.04.16.36.26.76.26 1.18 0 1.66-1.34 3-3 3s-3-1.34-3-3c0-.42.1-.82.26-1.18.7-.16 1.26-.54 1.68-1.04.42-.5.66-1.12.66-1.78s-.24-1.28-.66-1.78c-.42-.5-.98-.88-1.68-1.04-.16-.36-.26-.76-.26-1.18 0-1.66 1.34-3 3-3z" /></svg>;
            break;
        case 'tiktok':
            colorClass = "bg-[#ff0050] text-white";
            icon = <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" /></svg>;
            break;
        case 'kym':
            colorClass = "bg-cyan-600 text-white";
            label = "KYM";
            break;
        case 'mixed':
            colorClass = "bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 text-black font-bold";
            label = "GOD MODE";
            icon = <span className="text-[8px]">✦</span>;
            break;
        default: // news
            colorClass = "bg-blue-600 text-white";
            label = "NEWS";
    }

    return (
        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${colorClass}`}>
            {icon} {label}
        </span>
    );
};

const App: React.FC = () => {
    const [currentUser, setCurrentUser] = useState<DatabaseUser | null>(null);
    const [showAdmin, setShowAdmin] = useState(false);
    const [showAccessCode, setShowAccessCode] = useState(false);
    const [showAccountPopup, setShowAccountPopup] = useState(false);
    const [showSupportModal, setShowSupportModal] = useState(false);
    const [showMobileMenu, setShowMobileMenu] = useState(false);
    const [artInterfaceMode, setArtInterfaceMode] = useState<'lite' | 'pro'>('lite');
    const accountPopupRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (showAccountPopup && accountPopupRef.current && !accountPopupRef.current.contains(event.target as Node)) {
                setShowAccountPopup(false);
                setShowAccessCode(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showAccountPopup]);

    const [mascots, setMascots] = useState<Mascot[]>([]);
    const [isGenerating, setIsGenerating] = useState(false); // Global initial generation
    const [activeGenerations, setActiveGenerations] = useState<Set<string>>(new Set()); // IDs of mascots currently generating scenes

    const [loadingStep, setLoadingStep] = useState<string>("");
    const [selectedMascotId, setSelectedMascotId] = useState<string | null>(null);
    const [appMode, setAppMode] = useState<'art' | 'scraper'>('art'); // Mode toggle for Art and Scraper tabs
    const [startInEditMode, setStartInEditMode] = useState<boolean>(false); // New state to control edit mode on open
    const [uploadedImage, setUploadedImage] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false); // NEW: State for drag over visual feedback
    const [viewingMascot, setViewingMascot] = useState<Mascot | null>(null);
    const [viewingScene, setViewingScene] = useState<{ scene: Scene, mascotName: string } | null>(null);

    const [customInput, setCustomInput] = useState("");

    const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
    const [targetCount, setTargetCount] = useState<number>(1);
    const [preserveOriginal, setPreserveOriginal] = useState<boolean>(false);

    const [showCustomRemixLore, setShowCustomRemixLore] = useState(false);
    const [customRemixName, setCustomRemixName] = useState("");
    const [customRemixTicker, setCustomRemixTicker] = useState("");
    const [customRemixNarrative, setCustomRemixNarrative] = useState("");
    const [traitsInput, setTraitsInput] = useState(""); // NEW: Trait Mixer Input
    const [traitBaseImage, setTraitBaseImage] = useState<string | null>(null); // NEW: Specific for Trait Mixer
    const [isDraggingTrait, setIsDraggingTrait] = useState(false); // NEW: State for Trait Mixer drag feedback
    const [traitMode, setTraitMode] = useState<'mix' | 'scenes'>('mix'); // NEW: Trait Mixer Mode

    const [xTrends, setXTrends] = useState<XTrend[]>([]);
    const [unlockedTrendsCount, setUnlockedTrendsCount] = useState<number>(0);
    const [isResearching, setIsResearching] = useState(false);
    const [showResearchFeed, setShowResearchFeed] = useState(false);
    const [researchMode, setResearchMode] = useState<'x' | 'news' | 'meta' | '4chan' | 'kym' | 'reddit' | 'tiktok' | 'godmode' | null>(null);
    const [metaInput, setMetaInput] = useState("");
    const [newsInput, setNewsInput] = useState("");
    const [fourChanInput, setFourChanInput] = useState("");
    const [fourChanYear, setFourChanYear] = useState("");
    const [kymInput, setKymInput] = useState("");
    const [redditInput, setRedditInput] = useState("");
    const [godModeInput, setGodModeInput] = useState(""); // NEW

    // New State for Time Range
    const [timeRange, setTimeRange] = useState<'24h' | '48h' | '1w' | 'all'>('24h');

    const [isZippingAll, setIsZippingAll] = useState(false);
    const [editingSceneId, setEditingSceneId] = useState<string | null>(null);
    const [editPrompt, setEditPrompt] = useState("");
    const [isEditing, setIsEditing] = useState(false);

    // NEW LOGIC for credit errors on dashboard
    const [showCreditError, setShowCreditError] = useState<{ show: boolean, required: number }>({ show: false, required: 0 });

    const resultsEndRef = useRef<HTMLDivElement>(null);
    const sceneFeedRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const traitFileInputRef = useRef<HTMLInputElement>(null); // NEW: Ref for Trait Mixer file input
    const topRef = useRef<HTMLDivElement>(null);
    const trendBottomRef = useRef<HTMLDivElement>(null);

    const hasMascots = mascots.length > 0;

    const isSubscriptionExpired = (user: DatabaseUser | null) => {
        if (!user || user.is_admin || !user.subscription_days || !user.subscription_start) return false;
        const start = new Date(user.subscription_start).getTime();
        const daysMs = user.subscription_days * 24 * 60 * 60 * 1000;
        return Date.now() > start + daysMs;
    };
    const isExpired = isSubscriptionExpired(currentUser);

    // --- USER SYNC SUBSCRIPTION ---
    useEffect(() => {
        if (!currentUser) return;
        const channel = supabase
            .channel(`public:users:${currentUser.access_code}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'users', filter: `access_code=eq.${currentUser.access_code}` }, (payload) => {
                setCurrentUser(payload.new as DatabaseUser);
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [currentUser?.access_code]);

    // --- GLOBAL PASTE LISTENER ---
    useEffect(() => {
        const handleGlobalPaste = (e: ClipboardEvent) => {
            // Prevent pasting if we are in a modal or detail view where specific context applies,
            // OR if the research feed is open.
            if (selectedMascotId || showResearchFeed) return;

            // If mouse is over the remix box, we want to prioritize that or just let it happen globally
            // Since we want "pasting when mouse is brought over", a global listener is perfect
            // as long as we check if the user is intending to paste for remix.

            const items = e.clipboardData?.items;
            if (!items) return;

            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                    // If it is an image, grab it and set it as the uploaded image
                    const blob = items[i].getAsFile();
                    if (blob) {
                        e.preventDefault(); // Stop default browser behavior
                        const reader = new FileReader();
                        reader.onload = (event) => {
                            setUploadedImage(event.target?.result as string);
                            // Optional: show a small notification or scroll to the remix section
                            if (!hasMascots) {
                                topRef.current?.scrollIntoView({ behavior: 'smooth' });
                            }
                        };
                        reader.readAsDataURL(blob);
                    }
                    return; // Stop after finding the first image
                }
            }
        };

        window.addEventListener('paste', handleGlobalPaste);
        return () => window.removeEventListener('paste', handleGlobalPaste);
    }, [selectedMascotId, showResearchFeed, hasMascots]);

    // Calculate all scenes from all mascots for the feed
    const allScenes = React.useMemo(() => {
        const scenes: { scene: Scene, mascot: Mascot, isMain?: boolean }[] = [];
        mascots.forEach(m => {
            // Add the main mascot image as a "scene" so it appears in the feed
            if (m.imageUrl && m.imageUrl !== LOADING_IMAGE_PLACEHOLDER) {
                scenes.push({
                    scene: {
                        id: m.id + "_main",
                        imageUrl: m.imageUrl,
                        description: m.originalPrompt || "Main Mascot Image",
                        modelUsed: m.modelUsed
                    },
                    mascot: m,
                    isMain: true
                });
            }
            if (m.scenes) {
                m.scenes.forEach(s => scenes.push({ scene: s, mascot: m }));
            }
        });
        return scenes.reverse(); // Show newest first
    }, [mascots]);

    useEffect(() => {
        if (mascots.length > 0 && isGenerating && !selectedMascotId) {
            resultsEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [mascots.length, isGenerating, selectedMascotId]);

    const toggleStyle = (styleId: string) => {
        setSelectedStyles(prev =>
            prev.includes(styleId)
                ? prev.filter(id => id !== styleId)
                : [...prev, styleId]
        );
    };

    const selectAllStyles = () => {
        if (selectedStyles.length === AVAILABLE_ART_STYLES.length) {
            setSelectedStyles([]);
        } else {
            setSelectedStyles(AVAILABLE_ART_STYLES.map(s => s.id));
        }
    };

    const sortAndDedupTrends = (trends: XTrend[]) => {
        const filteredTrends = trends.filter(t => (t.memeScore || 0) >= 4);
        return filteredTrends.sort((a, b) => (b.memeScore || 0) - (a.memeScore || 0));
    };

    const handleStartResearch = async (mode: 'x' | 'news' | 'meta' | '4chan' | 'kym' | 'reddit' | 'tiktok' | 'godmode') => {
        if (!currentUser) return;
        if (isExpired) {
            alert("Your subscription has expired.");
            return;
        }

        if (mode === 'meta' && !metaInput.trim()) {
            alert("Please enter a Keyword (e.g. Bull, Frog, Dog)!");
            return;
        }

        const hasScrapeAccess = currentUser.is_admin || currentUser.can_use_scrape || (currentUser.can_use_news_scrape && mode === 'news');
        if (!hasScrapeAccess) {
            alert("Scrape mode disabled for your account.");
            return;
        }

        if (!currentUser.is_admin && (currentUser.lore_credits || 0) <= 0) {
            alert("Insufficient Lore Credits.");
            return;
        }

        setIsResearching(true);
        setShowResearchFeed(true);
        setResearchMode(mode);
        setXTrends([]);
        try {
            let trends: XTrend[] = [];
            if (mode === 'x') {
                trends = await performXDeepResearch([]);
            } else if (mode === 'meta') {
                trends = await performMetaResearch(metaInput, [], timeRange === 'all' ? '24h' : timeRange);
            } else if (mode === '4chan') {
                const searchRange = (fourChanYear && fourChanYear.length === 4) ? fourChanYear : timeRange;
                trends = await perform4chanResearch([], searchRange, fourChanInput);
            } else if (mode === 'kym') {
                trends = await performKymResearch([], timeRange, kymInput);
            } else if (mode === 'reddit') {
                trends = await performRedditResearch([], timeRange, redditInput);
            } else if (mode === 'tiktok') {
                trends = await performTikTokResearch([], timeRange === 'all' ? '24h' : timeRange);
            } else if (mode === 'godmode') {
                trends = await performGodModeResearch([], timeRange === 'all' ? '24h' : timeRange, godModeInput);
            } else {
                trends = await performGlobalNewsResearch([], timeRange === 'all' ? '24h' : timeRange, newsInput);
            }

            let filteredTrends = sortAndDedupTrends(trends);
            let toUnlock = 5;

            if (!currentUser.is_admin && currentUser.lore_credits !== undefined) {
                if (toUnlock > currentUser.lore_credits) {
                    toUnlock = currentUser.lore_credits;
                }
            }
            if (currentUser.is_admin) {
                toUnlock = filteredTrends.length;
            } else {
                toUnlock = Math.min(toUnlock, filteredTrends.length);
            }

            if (toUnlock > 0 && !currentUser.is_admin) {
                const deductionSuccess = await deductCredits(currentUser.access_code, 'lore', toUnlock);
                if (!deductionSuccess) {
                    alert("Failed to deduct Lore Credits. Cannot show results.");
                    setShowResearchFeed(false);
                    return;
                }
                setCurrentUser(prev => prev ? { ...prev, lore_credits: (prev.lore_credits || 0) - toUnlock } : null);
            }

            setXTrends(filteredTrends);
            setUnlockedTrendsCount(toUnlock);
        } catch (e) {
            alert("Research failed. Agent down.");
            setShowResearchFeed(false);
        } finally {
            setIsResearching(false);
        }
    };

    const handleLoadMoreTrends = async () => {
        if (isResearching || !researchMode || !currentUser) return;

        const hasScrapeAccess = currentUser.is_admin || currentUser.can_use_scrape || (currentUser.can_use_news_scrape && researchMode === 'news');
        if (!hasScrapeAccess) {
            alert("Scrape mode disabled for your account.");
            return;
        }

        if (!currentUser.is_admin && (currentUser.lore_credits || 0) <= 0) {
            alert("Out of Lore Credits. Cannot load more.");
            return;
        }

        setIsResearching(true);
        try {
            const currentTopics = xTrends.map(t => t.topic);
            let newTrends: XTrend[] = [];

            if (researchMode === 'x') {
                newTrends = await performXDeepResearch(currentTopics);
            } else if (researchMode === 'meta') {
                newTrends = await performMetaResearch(metaInput, currentTopics, timeRange === 'all' ? '24h' : timeRange);
            } else if (researchMode === '4chan') {
                const searchRange = (fourChanYear && fourChanYear.length === 4) ? fourChanYear : timeRange;
                newTrends = await perform4chanResearch(currentTopics, searchRange, fourChanInput);
            } else if (researchMode === 'kym') {
                newTrends = await performKymResearch(currentTopics, timeRange, kymInput);
            } else if (researchMode === 'reddit') {
                newTrends = await performRedditResearch(currentTopics, timeRange, redditInput);
            } else if (researchMode === 'tiktok') {
                newTrends = await performTikTokResearch(currentTopics, timeRange === 'all' ? '24h' : timeRange);
            } else if (researchMode === 'godmode') {
                newTrends = await performGodModeResearch(currentTopics, timeRange === 'all' ? '24h' : timeRange, godModeInput);
            } else {
                newTrends = await performGlobalNewsResearch(currentTopics, timeRange === 'all' ? '24h' : timeRange, newsInput);
            }

            const currentCount = xTrends.length;
            let combined = sortAndDedupTrends([...xTrends, ...newTrends]);
            let addedCount = combined.length - currentCount;

            if (addedCount > 0) {
                let toUnlock = 5;
                if (!currentUser.is_admin && currentUser.lore_credits !== undefined) {
                    if (toUnlock > currentUser.lore_credits) {
                        toUnlock = currentUser.lore_credits;
                    }
                }
                if (currentUser.is_admin) {
                    toUnlock = addedCount;
                } else {
                    toUnlock = Math.min(toUnlock, addedCount);
                }

                if (toUnlock > 0 && !currentUser.is_admin) {
                    const deductionSuccess = await deductCredits(currentUser.access_code, 'lore', toUnlock);
                    if (!deductionSuccess) {
                        alert("Failed to deduct Lore Credits. Cannot load more.");
                        return;
                    }
                    setCurrentUser(prev => prev ? { ...prev, lore_credits: (prev.lore_credits || 0) - toUnlock } : null);
                }

                setUnlockedTrendsCount(prev => prev + toUnlock);
            }

            setXTrends(combined);

            setTimeout(() => {
                trendBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);

        } catch (e) {
            alert("Failed to load more trends.");
        } finally {
            setIsResearching(false);
        }
    };

    const handleUnlockMore = async () => {
        if (!currentUser) return;
        const remainingLocked = xTrends.length - unlockedTrendsCount;
        if (remainingLocked <= 0) return;

        let toUnlock = Math.min(5, remainingLocked);
        if (!currentUser.is_admin) {
            if (toUnlock > (currentUser.lore_credits || 0)) {
                toUnlock = currentUser.lore_credits || 0;
            }
            if (toUnlock === 0) {
                alert("Out of Lore Credits. Cannot unlock more.");
                return;
            }

            const deductionSuccess = await deductCredits(currentUser.access_code, 'lore', toUnlock);
            if (!deductionSuccess) {
                alert("Failed to deduct Lore Credits.");
                return;
            }
            setCurrentUser(prev => prev ? { ...prev, lore_credits: (prev.lore_credits || 0) - toUnlock } : null);
        } else {
            toUnlock = remainingLocked;
        }

        setUnlockedTrendsCount(prev => prev + toUnlock);
    };

    const handleUseTrend = (trend: XTrend) => {
        setCustomInput(`${trend.topic}: ${trend.description}`);
        setShowResearchFeed(false);
        setXTrends([]);
        setResearchMode(null);
        topRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const processMascotBatch = async (ideas: MascotIdea[]) => {
        const initialMascots: Mascot[] = ideas.map(idea => ({
            id: generateId(),
            name: idea.name,
            ticker: idea.ticker,
            narrative: idea.narrative,
            artStyle: idea.artStyleDescription,
            styleId: idea.styleId,
            imageUrl: LOADING_IMAGE_PLACEHOLDER,
            originalPrompt: idea.imagePrompt,
            preserveOriginal: idea.preserveOriginal,
            sourceLink: idea.sourceLink
        }));

        setMascots(prev => [...prev, ...initialMascots]);
        const keys = getAvailableKeyCount();
        const CONCURRENCY = Math.max(2, keys);
        setLoadingStep("Processing...");

        const workItems = initialMascots.map((mascot, index) => ({
            mascotId: mascot.id,
            idea: ideas[index]
        }));

        await processWithConcurrencyLimit(
            workItems,
            async ({ mascotId, idea }) => {
                try {
                    const result = await generateMascotImageOnly(idea);
                    setMascots(prev => prev.map(m =>
                        m.id === mascotId ? { ...m, imageUrl: result.imageUrl, modelUsed: result.model } : m
                    ));
                } catch (e) {
                    setMascots(prev => prev.map(m =>
                        m.id === mascotId ? { ...m, imageUrl: "https://placehold.co/1024x1024/1e293b/475569?text=Failed", modelUsed: "failed" } : m
                    ));
                }
            },
            CONCURRENCY,
            200
        );
    };

    const handleGenerate = async () => {
        if (!currentUser) return;
        if (isExpired) {
            alert("Your subscription has expired.");
            return;
        }
        if (selectedStyles.length === 0) { alert("Please select at least one Art Style."); return; }

        const requiredCredits = targetCount * selectedStyles.length * 1;
        const deductionSuccess = await deductCredits(currentUser.access_code, 'art', requiredCredits);

        if (!deductionSuccess) {
            setShowCreditError({ show: true, required: requiredCredits });
            return;
        }

        setIsGenerating(true);
        setLoadingStep(`Creating random mascots...`);
        try {
            const promises = selectedStyles.map(styleId =>
                generateMascotIdeas(targetCount, [styleId], false)
            );
            const nestedIdeas = await Promise.all(promises);
            const allIdeas = nestedIdeas.flat();
            await processMascotBatch(allIdeas);
        } catch (err) { console.error(err); alert("Service Error."); }
        finally { setIsGenerating(false); setLoadingStep(""); }
    };

    const handleGenerateFromCustomInput = async () => {
        if (!currentUser) return;
        if (isExpired) {
            alert("Your subscription has expired.");
            return;
        }
        if (!customInput.trim()) return;
        if (selectedStyles.length === 0) { alert("Please select at least one Art Style."); return; }

        const requiredCredits = targetCount * selectedStyles.length * 1;
        const deductionSuccess = await deductCredits(currentUser.access_code, 'art', requiredCredits);

        if (!deductionSuccess) {
            setShowCreditError({ show: true, required: requiredCredits });
            return;
        }

        setIsGenerating(true);
        setLoadingStep(`Generating from concept "${customInput}"...`);
        try {
            const promises = selectedStyles.map(styleId =>
                generateMascotIdeasFromCustomInput(customInput, targetCount, [styleId])
            );
            const nestedIdeas = await Promise.all(promises);
            const allIdeas = nestedIdeas.flat();
            await processMascotBatch(allIdeas);
            setCustomInput("");
        } catch (err) { console.error(err); alert("Generation Failed."); }
        finally { setIsGenerating(false); setLoadingStep(""); }
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setUploadedImage(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleRemixDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => setUploadedImage(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    // Keep this handler for specific focus paste, though global handles it too
    const handleRemixPaste = (e: React.ClipboardEvent) => {
        const file = e.clipboardData.files?.[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => setUploadedImage(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    // --- TRAIT MIXER HANDLERS ---
    const handleTraitFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setTraitBaseImage(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleTraitDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDraggingTrait(false);
        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => setTraitBaseImage(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleTraitPaste = (e: React.ClipboardEvent) => {
        const file = e.clipboardData.files?.[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => setTraitBaseImage(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleGenerateFromUpload = async () => {
        if (!currentUser) return;
        if (isExpired) {
            alert("Your subscription has expired.");
            return;
        }
        if (!uploadedImage) return;
        if (selectedStyles.length === 0) { alert("Select a style first."); return; }

        const requiredCredits = targetCount * selectedStyles.length * 1;
        const deductionSuccess = await deductCredits(currentUser.access_code, 'art', requiredCredits);

        if (!deductionSuccess) {
            setShowCreditError({ show: true, required: requiredCredits });
            return;
        }

        setIsGenerating(true);
        setLoadingStep(`Analyzing & Remixing...`);

        try {
            // Master Lore Object from Inputs
            let masterLore: { name?: string, ticker?: string, narrative?: string } = {
                name: customRemixName.trim() || undefined,
                ticker: customRemixTicker.trim() || undefined,
                narrative: customRemixNarrative.trim() || undefined
            };

            const allIdeas: MascotIdea[] = [];
            const processingStyles = [...selectedStyles];

            // STRATEGY: If the user didn't provide a specific Name, we must generate one first 
            // and then ENFORCE it on all other styles to keep them consistent.
            if (!masterLore.name) {
                const firstStyleId = processingStyles.shift(); // Take the first style to "roll" the character
                if (firstStyleId) {
                    const firstStyleName = AVAILABLE_ART_STYLES.find(s => s.id === firstStyleId)?.name || firstStyleId;
                    setLoadingStep(`Establishing Identity (${firstStyleName})...`);

                    // Generate the first batch
                    const firstBatch = await prepareUploadIdeas(uploadedImage, targetCount, [firstStyleId], preserveOriginal, masterLore);

                    if (firstBatch.length > 0) {
                        const leader = firstBatch[0];
                        // LOCK IN the generated identity for the rest of the batch
                        if (!masterLore.name) masterLore.name = leader.name;
                        if (!masterLore.ticker) masterLore.ticker = leader.ticker;
                        if (!masterLore.narrative) masterLore.narrative = leader.narrative;

                        allIdeas.push(...firstBatch);
                    }
                }
            }

            // Process remaining styles with the LOCKED Master Lore
            if (processingStyles.length > 0) {
                setLoadingStep(`Applying identity to ${processingStyles.length} other styles...`);
                const promises = processingStyles.map(styleId =>
                    prepareUploadIdeas(uploadedImage, targetCount, [styleId], preserveOriginal, masterLore)
                );
                const nextBatches = await Promise.all(promises);
                allIdeas.push(...nextBatches.flat());
            }

            await processMascotBatch(allIdeas);
            setUploadedImage(null);
        } catch (err) { console.error(err); alert("Remix failed."); }
        finally { setIsGenerating(false); setLoadingStep(""); }
    };

    const handleGenerateTraits = async () => {
        if (!currentUser) return;
        if (isExpired) {
            alert("Your subscription has expired.");
            return;
        }
        if (isGenerating) return;
        if (!traitBaseImage) { alert("Please upload a base image first."); return; }
        if (!traitsInput.trim()) { alert("Please enter some traits."); return; }

        const deductionSuccess = await deductCredits(currentUser.access_code, 'art', 1);
        if (!deductionSuccess) {
            setShowCreditError({ show: true, required: 1 });
            return;
        }

        setIsGenerating(true);
        setLoadingStep(`Analyzing Traits & Preparing Workspace...`);
        try {
            // 1. Create a "Base Mascot" using the UNTOUCHED image
            const baseMascotId = generateId();
            const baseMascot: Mascot = {
                id: baseMascotId,
                name: "Trait Mascot",
                ticker: "$TRAIT",
                narrative: customRemixNarrative.trim() || "Character variations generated via Trait Mixer.",
                artStyle: "Original",
                styleId: "trait_mixer",
                imageUrl: traitBaseImage,
                originalPrompt: "Trait Mixer Base",
                preserveOriginal: true,
                traitsConfig: traitsInput,
                traitMode: traitMode, // Pass the selected mode
                scenes: []
            };

            // 2. Add it to the mascots list immediately. 
            // CRITICAL: We DO NOT auto-generate scenes here anymore. 
            // This prevents the bug where generation starts automatically upon entering the page.
            setMascots(prev => [...prev, baseMascot]);

            // Give it a moment to transition to the grid view
            await new Promise(r => setTimeout(r, 1000));

        } catch (err) {
            console.error(err);
            alert("Trait mixing initialization failed.");
        } finally {
            setIsGenerating(false);
            setLoadingStep("");
            setActiveGenerations(new Set());
        }
    };

    const handleUpdateMascot = (updatedMascot: Mascot) => {
        setMascots(prev => prev.map(m => m.id === updatedMascot.id ? updatedMascot : m));
    };

    const handleGenerateScenes = async (mascotId: string, config: { count: number, includeDex: boolean, includeXComm: boolean, models: string[], aspectRatio: string }) => {
        if (!currentUser) return;
        if (isExpired) {
            alert("Your subscription has expired.");
            return;
        }
        const mascot = mascots.find(m => m.id === mascotId);
        if (!mascot) return;

        // Calculate needed credits
        let requiredCredits = 0;
        for (const model of config.models) {
            const costPerModel = model === 'pro' ? 1 : 1;
            requiredCredits += config.count * costPerModel;
        }
        if (config.includeDex) requiredCredits += 2; // Dex banner
        if (config.includeXComm) requiredCredits += 2; // X Comm banner

        if (requiredCredits > 0) {
            const deductionSuccess = await deductCredits(currentUser.access_code, 'art', requiredCredits);
            if (!deductionSuccess) {
                setShowCreditError({ show: true, required: requiredCredits });
                return;
            }
        }

        setActiveGenerations(prev => new Set(prev).add(mascotId));
        sceneFeedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

        try {
            let totalPromptsCount = config.count * config.models.length;
            let prompts: string[] = [];
            if (totalPromptsCount > 0) {
                const existingPrompts = (mascot.scenes || []).map(s => s.description);
                prompts = await generateScenarioPrompts(mascot, totalPromptsCount, existingPrompts);
            }

            const tasks: (() => Promise<Scene>)[] = [];
            if (config.includeDex) tasks.push(() => generateDexBannerImage(mascot));
            if (config.includeXComm) tasks.push(() => generateXCommBannerImage(mascot));

            // Distribute prompts across models: Each model gets its own UNIQUE set of prompts
            let pIndex = 0;
            config.models.forEach(model => {
                for (let i = 0; i < config.count; i++) {
                    const currentPrompt = prompts[pIndex++];
                    if (currentPrompt) {
                        tasks.push(() => generateSceneImage(
                            currentPrompt,
                            config.aspectRatio,
                            mascot.imageUrl,
                            "1K",
                            model as 'pro' | 'basic',
                            mascot.preserveOriginal,
                            mascot.styleId
                        ));
                    }
                }
            });

            const keys = getAvailableKeyCount();
            const CONCURRENCY_LIMIT = Math.max(2, keys);
            let index = 0;

            const worker = async () => {
                while (index < tasks.length) {
                    const task = tasks[index++];
                    if (!task) break;
                    try {
                        const scene = await task();
                        setMascots(currentMascots => currentMascots.map(m => {
                            if (m.id === mascotId) {
                                return { ...m, scenes: [...(m.scenes || []), scene] };
                            }
                            return m;
                        }));
                    } catch (e) { console.error(e); }
                }
            }

            const workers = Array(Math.min(tasks.length, CONCURRENCY_LIMIT)).fill(null).map(() => worker());
            await Promise.all(workers);

        } catch (err) {
            console.error("Scene Gen Failed", err);
            alert(`Failed to generate scenes for ${mascot.name}`);
        } finally {
            setActiveGenerations(prev => {
                const next = new Set(prev);
                next.delete(mascotId);
                return next;
            });
        }
    };

    const handleEditScene = async (mascotId: string, scene: Scene, isMain?: boolean) => {
        if (!editPrompt.trim()) return;
        const mascot = mascots.find(m => m.id === mascotId);
        if (!mascot) return;

        setIsEditing(true);
        try {
            const isDex = scene.description.includes('PANORAMIC') || scene.description.includes('PADDED BANNER') || scene.description.includes('Dex Header');
            const isXComm = scene.description.includes('X COMM');

            // Use 16:9 for banners as standard Gemini-supported ratio
            // Others stay 1:1
            const aspectRatio = (isDex || isXComm) ? "16:9" : "1:1";

            let updatedScene = await generateSceneImage(
                editPrompt,
                aspectRatio,
                scene.imageUrl,
                "1K",
                "pro",
                true, // Preserve character lock for edits
                mascot.styleId
            );

            // If it was a banner, the physical image needs re-padding because generateSceneImage returns a 16:9 source
            if (isDex) {
                updatedScene.imageUrl = await createPaddedBanner(updatedScene.imageUrl);
                updatedScene.description = `PADDED BANNER: ${editPrompt}`;
            } else if (isXComm) {
                updatedScene.imageUrl = await createPaddedXBanner(updatedScene.imageUrl);
                updatedScene.description = `X COMM PADDED HEADER: ${editPrompt}`;
            } else {
                updatedScene.description = editPrompt;
            }

            setMascots(currentMascots => currentMascots.map(m => {
                if (m.id === mascotId) {
                    if (isMain) {
                        return { ...m, imageUrl: updatedScene.imageUrl, modelUsed: updatedScene.modelUsed };
                    } else {
                        return {
                            ...m,
                            scenes: m.scenes?.map(s => s.id === scene.id ? updatedScene : s)
                        };
                    }
                }
                return m;
            }));

            setEditingSceneId(null);
            setEditPrompt("");
        } catch (err) {
            console.error("Scene Edit Failed", err);
            alert("Failed to edit asset. Check console for details.");
        } finally {
            setIsEditing(false);
        }
    };

    const handleDownloadScene = (scene: Scene, mascotName: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const ext = scene.imageUrl.includes('image/jpeg') ? 'jpg' : 'png';
        saveAs(scene.imageUrl, `${mascotName.replace(/\s+/g, '_')}_${scene.id.substring(0, 6)}.${ext}`);
    };

    const handleDownloadAllScenes = async () => {
        if (mascots.length === 0) return;
        setIsZippingAll(true);
        try {
            const zip = new JSZip();
            let fileCounter = 1;
            const firstMascotName = mascots[0].name || "mascot_assets";
            const safeFolderName = sanitizeFilename(firstMascotName);
            const folder = zip.folder(safeFolderName);
            if (!folder) throw new Error("Could not create folder in zip");

            for (const mascot of mascots) {
                if (mascot.imageUrl && mascot.imageUrl.startsWith('data:') && mascot.imageUrl !== LOADING_IMAGE_PLACEHOLDER) {
                    try {
                        const mainImgData = await base64ToJpg(mascot.imageUrl);
                        folder.file(`${fileCounter}.jpg`, mainImgData.split(',')[1], { base64: true });
                        fileCounter++;
                    } catch (e) { console.warn("Failed to add main character image"); }
                }
                if (mascot.scenes && mascot.scenes.length > 0) {
                    for (const scene of mascot.scenes) {
                        if (scene.imageUrl && scene.imageUrl.startsWith('data:')) {
                            try {
                                const sceneImgData = await base64ToJpg(scene.imageUrl);
                                folder.file(`${fileCounter}.jpg`, sceneImgData.split(',')[1], { base64: true });
                                fileCounter++;
                            } catch (e) { console.warn("Failed to add scene image"); }
                        }
                    }
                }
            }
            const content = await zip.generateAsync({ type: "blob" });
            saveAs(content, `${safeFolderName}.zip`);
        } catch (e) { console.error("Zip generation failed", e); alert("Failed to zip files."); } finally { setIsZippingAll(false); }
    };

    if (selectedMascotId) {
        const selectedMascot = mascots.find(m => m.id === selectedMascotId);
        if (selectedMascot) return <MascotDetailView mascot={selectedMascot} onUpdateMascot={handleUpdateMascot} onBack={() => { setSelectedMascotId(null); setStartInEditMode(false); }} initialEditMode={startInEditMode} currentUser={currentUser} />;
    }

    // --- RESEARCH MODAL (SHARED) ---
    if (showResearchFeed) {
        let title = ""; let statusText = "";

        let borderColorClass = "border-accent";
        let textColorClass = "text-accent";
        let bgColorClass = "bg-accent";
        let hoverBorderClass = "hover:border-accent";
        let hoverTextClass = "group-hover:text-accent";
        let groupHoverBgClass = "group-hover:bg-accent";
        let numberColor = "text-slate-700";
        let numberHotColor = "text-accent drop-shadow-lg";
        let buttonTextColor = "";

        if (researchMode === 'x') {
            title = "Twitter / X Trends"; statusText = "Searching trending topics...";
        } else if (researchMode === 'news') {
            title = `Viral News${newsInput ? `: "${newsInput}"` : ''}`; statusText = "Searching global news...";
            borderColorClass = "border-blue-500"; textColorClass = "text-blue-500"; bgColorClass = "bg-blue-500";
            hoverBorderClass = "hover:border-blue-500"; hoverTextClass = "group-hover:text-blue-500"; groupHoverBgClass = "group-hover:bg-blue-500";
            numberHotColor = "text-blue-500 drop-shadow-lg";
        } else if (researchMode === 'meta') {
            title = `Search: ${metaInput}`; statusText = `Searching for ${metaInput}...`;
            borderColorClass = "border-emerald-500"; textColorClass = "text-emerald-500"; bgColorClass = "bg-emerald-500";
            hoverBorderClass = "hover:border-emerald-500"; hoverTextClass = "group-hover:text-emerald-500"; groupHoverBgClass = "group-hover:bg-emerald-500";
            numberHotColor = "text-emerald-500 drop-shadow-lg";
        } else if (researchMode === '4chan') {
            title = `4chan /biz/${fourChanInput ? `: "${fourChanInput}"` : ''}`;
            borderColorClass = "border-[#00FF00]"; textColorClass = "text-[#00FF00]"; bgColorClass = "bg-[#00FF00]";
            hoverBorderClass = "hover:border-[#00FF00]"; hoverTextClass = "group-hover:text-[#00FF00]"; groupHoverBgClass = "group-hover:bg-[#00FF00]";
            numberHotColor = "text-[#00FF00] drop-shadow-lg";
            buttonTextColor = "text-black";
            if (fourChanYear && fourChanYear.length === 4) {
                statusText = `Scanning Archives from ${fourChanYear}...`;
            } else {
                statusText = timeRange === 'all' ? "Scanning 4chan Archives (2010+)..." : "Scanning active threads...";
            }
        } else if (researchMode === 'kym') {
            title = `KnowYourMeme${kymInput ? `: "${kymInput}"` : ''}`;
            borderColorClass = "border-cyan-500"; textColorClass = "text-cyan-500"; bgColorClass = "bg-cyan-500";
            hoverBorderClass = "hover:border-cyan-500"; hoverTextClass = "group-hover:text-cyan-500"; groupHoverBgClass = "group-hover:bg-cyan-500";
            numberHotColor = "text-cyan-500 drop-shadow-lg";
            buttonTextColor = "text-black";
            statusText = timeRange === 'all' ? "Scanning History..." : "Scanning Viral Entries...";
        } else if (researchMode === 'reddit') {
            title = `Reddit Lore${redditInput ? `: "${redditInput}"` : ''}`;
            borderColorClass = "border-orange-500"; textColorClass = "text-orange-500"; bgColorClass = "bg-orange-500";
            hoverBorderClass = "hover:border-orange-500"; hoverTextClass = "group-hover:text-orange-500"; groupHoverBgClass = "group-hover:bg-orange-500";
            numberHotColor = "text-orange-500 drop-shadow-lg";
            buttonTextColor = "text-black";
            statusText = timeRange === 'all' ? "Scanning Top Posts of All Time..." : "Scanning Hot Threads...";
        } else if (researchMode === 'tiktok') {
            title = "TikTok Trends";
            borderColorClass = "border-[#ff0050]"; textColorClass = "text-[#ff0050]"; bgColorClass = "bg-[#ff0050]";
            hoverBorderClass = "hover:border-[#ff0050]"; hoverTextClass = "group-hover:text-[#ff0050]"; groupHoverBgClass = "group-hover:bg-[#ff0050]";
            numberHotColor = "text-[#ff0050] drop-shadow-lg";
            buttonTextColor = "text-white";
            statusText = "Scanning Viral Challenges & Sounds...";
        } else if (researchMode === 'godmode') {
            title = "GOD MODE: OMNISCIENT SEARCH";
            borderColorClass = "border-yellow-500"; textColorClass = "text-yellow-400"; bgColorClass = "bg-yellow-500";
            hoverBorderClass = "hover:border-yellow-400"; hoverTextClass = "group-hover:text-yellow-300"; groupHoverBgClass = "group-hover:bg-yellow-500";
            numberHotColor = "text-yellow-400 drop-shadow-lg";
            buttonTextColor = "text-black";
            statusText = "Aggregating X, Reddit, 4chan, TikTok, KYM, and News...";
        }

        return (
            <div className="fixed inset-0 bg-navy-950/95 backdrop-blur-md z-[100] flex flex-col font-mono animate-in fade-in duration-300">

                <div className="max-w-[1600px] w-full mx-auto h-full flex flex-col bg-navy-900 border-x border-white/5 shadow-2xl relative overflow-hidden">

                    {/* Decorative Scan Line */}
                    <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-current to-transparent opacity-50 ${textColorClass}`}></div>

                    {/* HEADER */}
                    <div className="border-b border-white/5 p-4 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center bg-navy-900 z-10 gap-4 md:gap-0">
                        <div className="flex items-center gap-4 md:gap-6 w-full md:w-auto">
                            <div className={`w-3 h-3 rounded-full animate-pulse shadow-[0_0_10px_currentColor] shrink-0 ${bgColorClass} ${textColorClass}`}></div>
                            <div className="flex-1 min-w-0">
                                <h1 className="text-xl md:text-3xl font-black uppercase tracking-tighter text-white truncate">{title}</h1>
                                <p className={`text-xs md:text-sm mt-1 tracking-widest ${textColorClass}`}>{isResearching ? statusText : 'Ready to use'}</p>
                            </div>
                        </div>
                        <Button onClick={() => setShowResearchFeed(false)} variant="outline" className="border-white/20 text-white w-full md:w-auto md:text-lg">CLOSE</Button>
                    </div>

                    {/* CONTENT */}
                    <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar bg-navy-950/50">

                        {isResearching && xTrends.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-48 opacity-70">
                                <div className={`w-24 h-24 border-4 border-t-transparent rounded-full animate-spin mb-8 ${borderColorClass}`}></div>
                                <p className={`font-mono text-lg tracking-[0.2em] animate-pulse ${textColorClass}`}>SEARCHING...</p>
                            </div>
                        )}

                        {!isResearching && xTrends.length === 0 && (
                            <div className="text-center py-48">
                                <p className="text-slate-500 font-mono text-xl mb-8">No results found.</p>
                                <Button onClick={() => setShowResearchFeed(false)} variant="ghost" size="lg">RETURN</Button>
                            </div>
                        )}

                        {(() => {
                            const remainingLockedCount = xTrends.length - unlockedTrendsCount;
                            const possibleUnlockAmount = Math.min(5, remainingLockedCount);
                            const userCredits = currentUser?.lore_credits || 0;
                            const actualUnlockAmount = currentUser?.is_admin ? possibleUnlockAmount : Math.min(possibleUnlockAmount, userCredits);
                            const hasEnoughCredits = currentUser?.is_admin || userCredits > 0;

                            return (
                                <>
                                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                                        {xTrends.map((trend, idx) => {
                                            const score = trend.memeScore || 5;
                                            const isHot = score >= 8;
                                            const displayedTitle = trend.topic;

                                            // --- SMART LINK LOGIC START ---
                                            // Instead of relying on potentially hallucinated deep links from the AI,
                                            // we construct a high-quality search query based on the 'source' field.
                                            const q = encodeURIComponent(trend.topic);
                                            let searchUrl = `https://www.google.com/search?q=${q}`; // Default fallback

                                            const effectiveSource = trend.source || (researchMode === 'godmode' ? 'mixed' : researchMode);

                                            if (effectiveSource === 'x') {
                                                searchUrl = `https://x.com/search?q=${q}&src=typed_query`;
                                            } else if (effectiveSource === 'reddit') {
                                                searchUrl = `https://www.reddit.com/search/?q=${q}`;
                                            } else if (effectiveSource === 'tiktok') {
                                                searchUrl = `https://www.tiktok.com/search?q=${q}`;
                                            } else if (effectiveSource === 'kym') {
                                                searchUrl = `https://www.google.com/search?q=${q}+knowyourmeme`;
                                            } else if (effectiveSource === '4chan') {
                                                searchUrl = `https://www.google.com/search?q=site:4channel.org/biz/+${q}`;
                                            }

                                            // For 'news' or actual grounded links (if they look valid), prefer the direct link if available and not in God Mode
                                            // But for consistency in God Mode, search is often safer.
                                            // CRITICAL FIX: For TikTok, ignore AI-generated URLs as they are often broken deep links or generic landing pages.
                                            // Always use the search query URL constructed above for TikTok.
                                            const isSafeToUseProvidedUrl = researchMode !== 'godmode' && trend.url && trend.url.length > 10 && !trend.url.includes('example.com');

                                            if (isSafeToUseProvidedUrl) {
                                                if (effectiveSource !== 'tiktok' && effectiveSource !== 'kym') {
                                                    searchUrl = trend.url;
                                                }
                                            }
                                            // --- SMART LINK LOGIC END ---

                                            const isLocked = !currentUser?.is_admin && idx >= unlockedTrendsCount;

                                            return (
                                                <div key={idx} className={`relative ${isLocked ? 'cursor-pointer group/locked' : ''}`} onClick={isLocked ? handleUnlockMore : undefined}>
                                                    <div className={`bg-navy-900 border border-white/5 hover:shadow-[0_0_30px_rgba(255,255,255,0.05)] transition-all p-4 md:p-8 rounded-xl flex flex-col md:flex-row gap-4 md:gap-8 group relative overflow-hidden ${hoverBorderClass} ${isLocked ? 'blur-md pointer-events-none opacity-40 grayscale select-none' : ''}`}>

                                                        {/* Score Box */}
                                                        <div className="w-full md:w-32 shrink-0 flex flex-row md:flex-col justify-center items-center border-b md:border-b-0 md:border-r border-white/5 pb-4 md:pb-0 md:pr-8 gap-4 md:gap-0">
                                                            <div className="text-[10px] font-mono uppercase text-slate-500 tracking-[0.2em] md:hidden">SCORE:</div>
                                                            <div className={`text-4xl md:text-6xl font-black font-sans tracking-tighter leading-none ${isHot ? numberHotColor : numberColor}`}>
                                                                {score}
                                                            </div>
                                                            <div className="hidden md:block text-[10px] font-mono uppercase text-slate-500 mt-2 tracking-[0.2em]">SCORE</div>
                                                        </div>

                                                        <div className="flex-1 z-10 flex flex-col justify-center">
                                                            <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3 flex-wrap">
                                                                {/* SOURCE BADGE FOR GOD MODE */}
                                                                {trend.source && <SourceBadge source={trend.source} />}
                                                                <span className="text-[10px] bg-white/5 text-slate-400 px-3 py-1 rounded-full uppercase font-bold tracking-wider border border-white/5 whitespace-nowrap">{trend.category}</span>
                                                            </div>
                                                            <h3 className={`text-lg md:text-2xl font-bold text-white mb-2 md:mb-3 font-sans transition-colors leading-tight ${hoverTextClass}`}>{displayedTitle}</h3>
                                                            <p className="text-xs md:text-sm text-slate-400 leading-relaxed font-mono">{trend.description}</p>
                                                        </div>

                                                        <div className="flex flex-col md:flex-col gap-2 items-center justify-center pt-4 md:pt-0 md:pl-8 border-t md:border-t-0 md:border-l border-white/5 z-10 w-full md:w-48">
                                                            <Button onClick={() => handleUseTrend(trend)} size="md" variant="secondary" className={`w-full group-hover:text-black font-black tracking-wider text-[10px] py-4 md:py-2 ${groupHoverBgClass} ${buttonTextColor}`}>
                                                                CREATE MASCOT
                                                            </Button>
                                                            <div className="w-full grid grid-cols-2 lg:grid-cols-1 gap-2">
                                                                <Button onClick={() => window.open(searchUrl, '_blank')} size="md" variant="outline" className="w-full text-[10px] uppercase font-bold border-white/10 hover:border-white">
                                                                    SOURCE ↗
                                                                </Button>
                                                                {trend.newsUrl && (
                                                                    <Button onClick={() => window.open(trend.newsUrl, '_blank')} size="md" variant="outline" className="w-full text-[10px] uppercase font-bold border-white/10 hover:border-white">
                                                                        📰 NEWS ↗
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Scan Line Effect on Hover */}
                                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-shimmer pointer-events-none"></div>
                                                    </div>

                                                    {isLocked && (
                                                        <div className="absolute inset-0 flex flex-col items-center justify-center z-20 pointer-events-none transition-all group-hover/locked:bg-black/20 rounded-xl">
                                                            <div className={`w-16 h-16 rounded-full bg-black/80 border border-white/10 flex items-center justify-center mb-3 shadow-2xl backdrop-blur-md transition-transform duration-300 group-hover/locked:scale-110 group-hover/locked:bg-black/90 ${hasEnoughCredits ? 'group-hover/locked:border-accent group-hover/locked:shadow-[0_0_30px_rgba(222,253,65,0.2)]' : 'group-hover/locked:border-red-500 group-hover/locked:shadow-[0_0_30px_rgba(239,68,68,0.2)]'}`}>
                                                                <svg className="w-8 h-8 text-slate-400 group-hover/locked:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                                                <svg className={`w-8 h-8 hidden group-hover/locked:block ${hasEnoughCredits ? 'text-accent' : 'text-red-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    {hasEnoughCredits ? (
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                                                                    ) : (
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                                    )}
                                                                </svg>
                                                            </div>
                                                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50 bg-black/60 px-4 py-1.5 rounded-full border border-white/10 group-hover/locked:hidden backdrop-blur-md">Locked</span>
                                                            <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${hasEnoughCredits ? 'text-black bg-accent border-accent shadow-[0_0_15px_rgba(222,253,65,0.4)]' : 'text-white bg-red-600 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)]'} px-4 py-1.5 rounded-full border hidden group-hover/locked:block`}>
                                                                {hasEnoughCredits ? `UNLOCK ${actualUnlockAmount} MORE` : 'NOT ENOUGH CREDITS'}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {xTrends.length > 0 && (
                                        <div className="mt-8 md:mt-12 text-center pb-8 md:pb-12" ref={trendBottomRef}>
                                            {(!currentUser?.is_admin && unlockedTrendsCount < xTrends.length) ? (
                                                <Button onClick={handleUnlockMore} disabled={isResearching} variant="outline" className={`w-full md:w-96 py-4 md:py-6 text-sm md:text-lg border-white/20 hover:border-white hover:text-white bg-black/40 backdrop-blur-md ${hasEnoughCredits ? 'text-white' : 'text-red-500 hover:border-red-500/50 hover:bg-black/80 hover:text-red-400'}`}>
                                                    {hasEnoughCredits ? `UNLOCK ${actualUnlockAmount} MORE (${actualUnlockAmount} CREDITS)` : 'OUT OF CREDITS'}
                                                </Button>
                                            ) : (
                                                <Button onClick={handleLoadMoreTrends} disabled={isResearching} variant="outline" className="w-full md:w-96 py-4 md:py-6 text-sm md:text-lg border-white/20 text-white hover:border-white hover:text-white">
                                                    {isResearching ? 'LOADING...' : 'LOAD MORE (+)'}
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                </>
                            );
                        })()}
                    </div>
                </div>
            </div>
        );
    }

    if (!currentUser) {
        return <LandingPage onLogin={setCurrentUser} />;
    }

    if (showAdmin && currentUser.is_admin) {
        return <AdminDashboard onBack={() => setShowAdmin(false)} />;
    }

    return (
        <div ref={topRef} className="min-h-screen bg-navy-950 text-slate-200 selection:bg-accent selection:text-black">
            {/* ... Navigation (same as before) ... */}
            <nav className="border-b border-white/5 bg-navy-950/90 backdrop-blur-md sticky top-0 z-40 h-20 flex items-center">
                <div className="w-full max-w-[1800px] mx-auto px-6 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <div className="flex-shrink-0 flex items-center gap-3 relative">
                            <img
                                src="/pepe_forge.png"
                                alt="Forge Logo"
                                className="h-[45px] md:h-[65px] w-auto object-contain"
                                onError={(e) => {
                                    e.currentTarget.onerror = null;
                                    e.currentTarget.src = "https://placehold.co/250x65/transparent/DEFD41?text=FORGE";
                                }}
                            />
                            <span className="bg-accent text-black text-[9px] font-black px-2 py-0.5 rounded-full tracking-widest uppercase shadow-[0_0_15px_rgba(222,253,65,0.4)] absolute -right-12 top-2">
                                Beta
                            </span>
                        </div>
                    </div>

                    {/* Navigation Container — Absolutely centered to align with Lite/Pro toggle below */}
                    <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center justify-center z-10">
                        <div className="relative bg-[#02040A]/80 backdrop-blur-xl p-1.5 rounded-full border border-white/15 flex items-center shadow-[0_0_30px_rgba(0,0,0,0.5)]" style={{ boxShadow: appMode === 'art' ? '0 0 25px rgba(222,253,65,0.08), inset 0 1px 0 rgba(255,255,255,0.05)' : '0 0 25px rgba(192,132,252,0.08), inset 0 1px 0 rgba(255,255,255,0.05)' }}>
                            <div className="flex absolute inset-1.5 transition-all duration-500 ease-out pointer-events-none" style={{ padding: '0px', left: appMode === 'art' ? '6px' : '50%', right: appMode === 'art' ? '50%' : '6px', top: '6px', bottom: '6px' }}>
                                <div className={`w-full h-full rounded-full transition-all duration-500 ${appMode === 'art' ? 'bg-accent/15 shadow-[0_0_20px_rgba(222,253,65,0.15)]' : 'bg-purple-500/15 shadow-[0_0_20px_rgba(192,132,252,0.15)]'}`} style={{ border: appMode === 'art' ? '1px solid rgba(222,253,65,0.25)' : '1px solid rgba(192,132,252,0.25)' }}></div>
                            </div>
                            <button onClick={() => setAppMode('art')} className={`relative z-10 w-40 md:w-48 py-2.5 text-[11px] font-black uppercase tracking-[0.15em] transition-all duration-300 flex items-center justify-center gap-2 rounded-full ${appMode === 'art' ? 'text-accent drop-shadow-[0_0_8px_rgba(222,253,65,0.4)]' : 'text-slate-500 hover:text-slate-300'}`}>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                Art Generator
                            </button>
                            <button onClick={() => setAppMode('scraper')} className={`relative z-10 w-40 md:w-48 py-2.5 text-[11px] font-black uppercase tracking-[0.15em] transition-all duration-300 flex items-center justify-center gap-2 rounded-full ${appMode === 'scraper' ? 'text-purple-400 drop-shadow-[0_0_8px_rgba(192,132,252,0.4)]' : 'text-slate-500 hover:text-slate-300'}`}>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                Narrative Scraper
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-0 md:gap-4">
                        {currentUser?.is_admin && (
                            <button
                                onClick={() => setShowAdmin(true)}
                                className="hidden md:flex relative group items-center gap-2.5 px-5 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500 transition-all duration-300 rounded-xl overflow-hidden shadow-[0_0_20px_rgba(239,68,68,0.1)] hover:shadow-[0_0_30px_rgba(239,68,68,0.2)]"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-red-500/0 via-red-500/5 to-red-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out"></div>
                                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div>
                                <span className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em] relative z-10 transition-colors group-hover:text-white">
                                    Admin Area
                                </span>
                            </button>
                        )}
                        <Button
                            onClick={() => setShowSupportModal(true)}
                            variant="ghost"
                            className="hidden md:flex text-slate-500 hover:text-white text-[10px] px-2 uppercase font-bold items-center gap-1.5"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                            Support
                        </Button>
                        <Button
                            onClick={() => setCurrentUser(null)}
                            variant="ghost"
                            className="hidden md:flex text-slate-500 hover:text-white text-[10px] px-2 uppercase font-bold"
                        >
                            Logout
                        </Button>
                        <div ref={accountPopupRef} className="flex items-center md:gap-4 relative">
                            {(() => {
                                const pkg = currentUser?.package_name || 'Starter';
                                let borderColor = 'border-white/10 hover:border-slate-500/50';
                                let bgClass = 'bg-black/40 hover:bg-black/60';
                                let activeBgClass = 'bg-black/80 border-slate-500';
                                let textColor = 'text-white group-hover:text-slate-300';
                                let iconBg = 'bg-white/5 group-hover:bg-white/10';
                                let iconText = 'text-white';
                                let iconBorder = 'border-white/20';

                                if (pkg === 'Cookball') {
                                    borderColor = 'border-[#FF6B00]/30 hover:border-[#FF6B00]/50';
                                    activeBgClass = 'bg-black/80 border-[#FF6B00] shadow-[#FF6B00]/20';
                                    textColor = 'text-[#FF6B00] group-hover:text-[#FF8133]';
                                    iconBg = 'bg-[#FF6B00]/10 group-hover:bg-[#FF6B00]/20';
                                    iconText = 'text-[#FF6B00]';
                                    iconBorder = 'border-[#FF6B00]/20';
                                } else if (pkg === 'Private') {
                                    borderColor = 'border-[#40E0D0]/30 hover:border-[#40E0D0]/50';
                                    activeBgClass = 'bg-black/80 border-[#40E0D0] shadow-[#40E0D0]/20';
                                    textColor = 'text-[#40E0D0] group-hover:text-[#66EBE0]';
                                    iconBg = 'bg-[#40E0D0]/10 group-hover:bg-[#40E0D0]/20';
                                    iconText = 'text-[#40E0D0]';
                                    iconBorder = 'border-[#40E0D0]/20';
                                } else if (pkg === 'Max') {
                                    borderColor = 'border-[#C084FC]/30 hover:border-[#C084FC]/50';
                                    activeBgClass = 'bg-black/80 border-[#C084FC] shadow-[#C084FC]/20';
                                    textColor = 'text-[#C084FC] group-hover:text-[#D1A3FF]';
                                    iconBg = 'bg-[#C084FC]/10 group-hover:bg-[#C084FC]/20';
                                    iconText = 'text-[#C084FC]';
                                    iconBorder = 'border-[#C084FC]/20';
                                } else if (pkg === 'Pro') {
                                    borderColor = 'border-[#DEFD40]/30 hover:border-[#DEFD40]/50';
                                    activeBgClass = 'bg-black/80 border-[#DEFD40] shadow-[#DEFD40]/20';
                                    textColor = 'text-[#DEFD40] group-hover:text-[#E9FF70]';
                                    iconBg = 'bg-[#DEFD40]/10 group-hover:bg-[#DEFD40]/20';
                                    iconText = 'text-[#DEFD40]';
                                    iconBorder = 'border-[#DEFD40]/20';
                                } else { // Starter
                                    borderColor = 'border-slate-400/30 hover:border-slate-300/50';
                                    activeBgClass = 'bg-black/80 border-slate-300';
                                    textColor = 'text-slate-300 group-hover:text-white';
                                    iconBg = 'bg-slate-400/10 group-hover:bg-slate-400/20';
                                    iconText = 'text-slate-300';
                                    iconBorder = 'border-slate-400/20';
                                }

                                return (
                                    <button
                                        onClick={() => setShowAccountPopup(!showAccountPopup)}
                                        className={`hidden md:flex items-center gap-3 px-4 py-1.5 border rounded-2xl shadow-xl backdrop-blur-md transition-all group ${showAccountPopup ? activeBgClass : `${bgClass} ${borderColor}`}`}
                                    >
                                        <div className={`w-8 h-8 rounded-full ${iconBg} border ${iconBorder} flex items-center justify-center ${iconText} transition-colors`}>
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                        </div>
                                        <div className="flex flex-col items-start pr-1 text-left">
                                            <span className={`text-xs font-black ${textColor} uppercase tracking-widest transition-colors leading-none mt-0.5`}>Account</span>
                                            <span className={`text-[8.5px] font-bold ${textColor} uppercase tracking-widest transition-colors leading-none mt-1`}>{pkg} PLAN</span>
                                        </div>
                                    </button>
                                );
                            })()}

                            {showAccountPopup && (() => {
                                const pkg = currentUser?.package_name || 'Starter';
                                let theme = {
                                    primary: 'text-slate-300',
                                    bgGlow: 'shadow-slate-500/20',
                                    border: 'border-slate-400/30',
                                    gradientCore: 'from-slate-400',
                                    gradientLight: 'from-slate-400/20',
                                    badgeBg: 'bg-slate-400/20',
                                    badgeText: 'text-slate-300',
                                    hex: '#94a3b8'
                                };

                                if (pkg === 'Cookball') theme = { primary: 'text-[#FF6B00]', bgGlow: 'shadow-[#FF6B00]/20', border: 'border-[#FF6B00]/30', gradientCore: 'from-[#FF6B00]', gradientLight: 'from-[#FF6B00]/20', badgeBg: 'bg-[#FF6B00]/20', badgeText: 'text-[#FF6B00]', hex: '#FF6B00' };
                                else if (pkg === 'Private') theme = { primary: 'text-[#40E0D0]', bgGlow: 'shadow-[#40E0D0]/20', border: 'border-[#40E0D0]/30', gradientCore: 'from-[#40E0D0]', gradientLight: 'from-[#40E0D0]/20', badgeBg: 'bg-[#40E0D0]/20', badgeText: 'text-[#40E0D0]', hex: '#40E0D0' };
                                else if (pkg === 'Max') theme = { primary: 'text-[#C084FC]', bgGlow: 'shadow-[#C084FC]/20', border: 'border-[#C084FC]/30', gradientCore: 'from-[#C084FC]', gradientLight: 'from-[#C084FC]/20', badgeBg: 'bg-[#C084FC]/20', badgeText: 'text-[#C084FC]', hex: '#C084FC' };
                                else if (pkg === 'Pro') theme = { primary: 'text-[#DEFD40]', bgGlow: 'shadow-[#DEFD40]/20', border: 'border-[#DEFD40]/30', gradientCore: 'from-[#DEFD40]', gradientLight: 'from-[#DEFD40]/20', badgeBg: 'bg-[#DEFD40]/20', badgeText: 'text-[#DEFD40]', hex: '#DEFD40' };

                                let subProgress = 100;
                                let daysRemaining = '∞';
                                if (!currentUser?.is_admin && currentUser?.subscription_start && currentUser?.subscription_days) {
                                    const start = new Date(currentUser.subscription_start).getTime();
                                    const totalDuration = currentUser.subscription_days * 24 * 60 * 60 * 1000;
                                    const end = start + totalDuration;
                                    const now = new Date().getTime();
                                    if (now >= end) {
                                        subProgress = 0;
                                        daysRemaining = '0 days';
                                    } else {
                                        const elapsed = now - start;
                                        subProgress = Math.max(0, Math.min(100, Math.round((elapsed / totalDuration) * 100)));
                                        const leftMs = end - now;
                                        const leftDays = Math.ceil(leftMs / (1000 * 60 * 60 * 24));
                                        daysRemaining = `${leftDays} day${leftDays !== 1 ? 's' : ''}`;
                                    }
                                }

                                return (
                                    <div className={`hidden md:block absolute top-[120%] right-0 w-80 bg-[#070b14] border border-white/10 rounded-2xl shadow-2xl backdrop-blur-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200`} style={{ boxShadow: `0 0 40px -10px ${theme.hex}30` }}>
                                        {/* Glowing top edge */}
                                        <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${theme.gradientCore} via-white to-${theme.gradientCore} opacity-70 z-10`}></div>

                                        <div className="p-6 pb-5 flex flex-col items-center border-b border-white/5 relative">
                                            {/* Background ambient glow inside header */}
                                            <div className="absolute top-0 inset-x-0 h-24 overflow-hidden pointer-events-none rounded-t-2xl">
                                                <div className="absolute inset-x-0 -top-10 h-20 blur-2xl opacity-20" style={{ backgroundColor: theme.hex }}></div>
                                            </div>

                                            <div className="relative mb-3">
                                                <div className="w-14 h-14 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center border-2 z-10 relative" style={{ borderColor: theme.hex }}>
                                                    <svg className={`w-6 h-6 ${theme.primary}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                                </div>
                                                <div className="absolute inset-0 rounded-full animate-ping opacity-20" style={{ backgroundColor: theme.hex }}></div>
                                            </div>

                                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${theme.badgeBg} ${theme.badgeText} border ${theme.border} mb-4`}>
                                                {pkg} PLAN
                                            </span>

                                            <div className="w-full bg-black/40 rounded-xl p-3 border border-white/5 flex justify-between items-center group/access">
                                                <div className="flex flex-col">
                                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Access Code</span>
                                                    <span className="text-sm font-mono text-white tracking-widest">
                                                        {showAccessCode ? currentUser?.access_code : '••••••••'}
                                                    </span>
                                                </div>
                                                <button onClick={() => setShowAccessCode(!showAccessCode)} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group-hover/access:text-white" style={{ color: showAccessCode ? theme.hex : '#64748b' }}>
                                                    {showAccessCode ? (
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="m2 2 20 20" /><path d="M6.71 6.71q2.3-1.71 5.29-1.71 7 0 10 7a15.53 15.53 0 0 1-4.14 5.34m-3.92 1.48Q13 19 12 19q-7 0-10-7a15.08 15.08 0 0 1 2.3-3.61" /><circle cx="12" cy="12" r="3" /></svg>
                                                    ) : (
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
                                                    )}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="p-5 grid grid-cols-2 gap-4 border-b border-white/5">
                                            <div className={`bg-gradient-to-br from-white/5 to-black/60 border border-white/5 rounded-xl p-3 flex flex-col items-center justify-center text-center relative overflow-hidden group/card hover:border-white/10 transition-colors`}>
                                                <div className="absolute inset-0 bg-gradient-to-t via-transparent to-transparent opacity-10" style={{ backgroundImage: `linear-gradient(to top, ${theme.hex} 0%, transparent 100%)` }}></div>
                                                <div className="absolute bottom-0 inset-x-0 h-[1px] opacity-20" style={{ backgroundColor: theme.hex }}></div>
                                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center mb-2 shadow-inner bg-black/50 ${theme.border} border`}>
                                                    <svg className={`w-3.5 h-3.5 ${theme.primary}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                </div>
                                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1 z-10">Art Credits</span>
                                                <span className={`text-2xl font-black ${theme.primary} z-10 drop-shadow-[0_0_8px_rgba(255,255,255,0.1)]`} style={{ textShadow: `0 0 10px ${theme.hex}50` }}>
                                                    {currentUser?.is_admin ? '∞' : (currentUser?.art_credits || 0)}
                                                </span>
                                            </div>
                                            <div className={`bg-gradient-to-br from-white/5 to-black/60 border border-white/5 rounded-xl p-3 flex flex-col items-center justify-center text-center relative overflow-hidden group/card hover:border-white/10 transition-colors`}>
                                                <div className="absolute inset-0 bg-gradient-to-t via-transparent to-transparent opacity-10" style={{ backgroundImage: `linear-gradient(to top, ${theme.hex} 0%, transparent 100%)` }}></div>
                                                <div className="absolute bottom-0 inset-x-0 h-[1px] opacity-20" style={{ backgroundColor: theme.hex }}></div>
                                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center mb-2 shadow-inner bg-black/50 ${theme.border} border`}>
                                                    <svg className={`w-3.5 h-3.5 ${theme.primary}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18 18.247 18.477 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                                                </div>
                                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1 z-10">Lore Credits</span>
                                                <span className={`text-2xl font-black ${theme.primary} z-10 drop-shadow-[0_0_8px_rgba(255,255,255,0.1)]`} style={{ textShadow: `0 0 10px ${theme.hex}50` }}>
                                                    {currentUser?.is_admin ? '∞' : (currentUser?.lore_credits || 0)}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="p-5">
                                            <div className="flex items-center gap-3 mb-4">
                                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Membership Status</h4>
                                                <div className="flex-1 h-[1px] bg-gradient-to-r from-white/10 to-transparent"></div>
                                            </div>
                                            <div className="space-y-3">
                                                <div>
                                                    <div className="flex justify-between text-[9px] font-bold uppercase tracking-wide mb-1.5 text-white">
                                                        <span>Time Left</span>
                                                    </div>
                                                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                        <div className="h-full rounded-full transition-all duration-1000 bg-gradient-to-r to-white/20" style={{ width: `${subProgress}%`, backgroundColor: theme.hex }}></div>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2 pt-2 text-[10px]">
                                                    <div className="bg-black/30 rounded-lg p-2 border border-white/5">
                                                        <div className="text-slate-500 font-black uppercase tracking-wider mb-0.5 text-[8px]">Started</div>
                                                        <div className="font-mono text-slate-300">
                                                            {currentUser?.subscription_start ? new Date(currentUser.subscription_start).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                                                        </div>
                                                    </div>
                                                    <div className="bg-black/30 rounded-lg p-2 border border-white/5">
                                                        <div className="text-slate-500 font-black uppercase tracking-wider mb-0.5 text-[8px]">Expires</div>
                                                        <div className="font-mono text-slate-300">
                                                            {currentUser?.is_admin || !currentUser?.subscription_days
                                                                ? 'Never'
                                                                : new Date(new Date(currentUser.subscription_start!).getTime() + currentUser.subscription_days * 24 * 60 * 60 * 1000).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                                                            }
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-4 bg-gradient-to-t from-black/80 to-transparent flex justify-center border-t border-white/5 relative">
                                            <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
                                            <div className="flex items-center gap-2 px-3 py-1.5 bg-black/60 backdrop-blur-md rounded-full border border-white/5 shadow-inner">
                                                <div className="w-1.5 h-1.5 rounded-full animate-pulse shadow-[0_0_5px_currentColor]" style={{ backgroundColor: theme.hex, color: theme.hex }}></div>
                                                <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: theme.hex }}>System Online</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>

                        {/* Mobile Menu Toggle (Moved inside flex container to push to right) */}
                        <div className="md:hidden flex items-center ml-2">
                            <button
                                onClick={() => setShowMobileMenu(!showMobileMenu)}
                                className="p-2 text-slate-400 hover:text-white transition-colors"
                            >
                                {showMobileMenu ? (
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                ) : (
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile Menu Dropdown */}
                {showMobileMenu && (
                    <div className="md:hidden absolute top-full left-0 right-0 bg-navy-950 border-b border-white/10 shadow-2xl flex flex-col animate-in slide-in-from-top-2 z-50">
                        <div className="flex flex-col p-4 border-b border-white/5">
                            <div className="relative bg-[#02040A]/60 backdrop-blur-xl p-1 rounded-full border border-white/10 flex items-center shadow-xl w-full">
                                <div className="flex absolute inset-1 transition-all duration-300 pointer-events-none" style={{ padding: '4px', left: appMode === 'art' ? '0' : '50%', right: appMode === 'art' ? '50%' : '0' }}>
                                    <div className="w-full h-full rounded-full shadow-[0_0_15px_rgba(255,255,255,0.15)] bg-white/10 backdrop-blur-md"></div>
                                </div>
                                <button onClick={() => { setAppMode('art'); setShowMobileMenu(false); }} className={`relative z-10 flex-1 py-2 text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-1.5 rounded-full ${appMode === 'art' ? 'text-accent' : 'text-slate-400 hover:text-white'}`}>
                                    Art Generator
                                </button>
                                <button onClick={() => { setAppMode('scraper'); setShowMobileMenu(false); }} className={`relative z-10 flex-1 py-2 text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-1.5 rounded-full ${appMode === 'scraper' ? 'text-purple-400' : 'text-slate-400 hover:text-white'}`}>
                                    Scraper
                                </button>
                            </div>
                        </div>
                        <div className="flex flex-col p-2">
                            {currentUser?.is_admin && (
                                <button
                                    onClick={() => { setShowAdmin(true); setShowMobileMenu(false); }}
                                    className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-white/5 transition-colors rounded-xl text-left"
                                >
                                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div>
                                    <span className="text-xs font-bold text-red-500 uppercase tracking-widest flex-1">
                                        Admin Area
                                    </span>
                                </button>
                            )}
                            <button
                                onClick={() => { setShowSupportModal(true); setShowMobileMenu(false); }}
                                className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-white/5 transition-colors rounded-xl text-left"
                            >
                                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                                <span className="text-xs font-bold text-slate-300 uppercase tracking-widest flex-1">Support</span>
                            </button>

                            <div className="h-px bg-white/5 w-full my-1"></div>

                            <button
                                onClick={() => { setShowAccountPopup(true); setShowMobileMenu(false); }}
                                className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-white/5 transition-colors rounded-xl text-left outline-none"
                            >
                                <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                <div className="flex flex-col flex-1">
                                    <span className="text-xs font-bold text-white uppercase tracking-widest">Account</span>
                                </div>
                                <span className="text-[9px] font-black bg-accent/10 border border-accent/20 text-accent px-1.5 py-0.5 rounded leading-none flex items-center justify-center uppercase">{currentUser?.package_name || 'STARTER'}</span>
                            </button>

                            <div className="h-px bg-white/5 w-full my-1"></div>

                            <button
                                onClick={() => { setCurrentUser(null); setShowMobileMenu(false); }}
                                className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-white/5 transition-colors rounded-xl text-left outline-none"
                            >
                                <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                                <span className="text-xs font-bold text-red-500 uppercase tracking-widest flex-1">Logout</span>
                            </button>
                        </div>
                    </div>
                )}
            </nav>

            {/* Mobile Account Popup - Rendered OUTSIDE nav to avoid backdrop-blur containing block issue */}
            {showAccountPopup && (() => {
                const pkg = currentUser?.package_name || 'Starter';
                let theme = {
                    primary: 'text-slate-300',
                    bgGlow: 'shadow-slate-500/20',
                    border: 'border-slate-400/30',
                    gradientCore: 'from-slate-400',
                    gradientLight: 'from-slate-400/20',
                    badgeBg: 'bg-slate-400/20',
                    badgeText: 'text-slate-300',
                    hex: '#94a3b8'
                };

                if (pkg === 'Cookball') theme = { primary: 'text-[#FF6B00]', bgGlow: 'shadow-[#FF6B00]/20', border: 'border-[#FF6B00]/30', gradientCore: 'from-[#FF6B00]', gradientLight: 'from-[#FF6B00]/20', badgeBg: 'bg-[#FF6B00]/20', badgeText: 'text-[#FF6B00]', hex: '#FF6B00' };
                else if (pkg === 'Private') theme = { primary: 'text-[#40E0D0]', bgGlow: 'shadow-[#40E0D0]/20', border: 'border-[#40E0D0]/30', gradientCore: 'from-[#40E0D0]', gradientLight: 'from-[#40E0D0]/20', badgeBg: 'bg-[#40E0D0]/20', badgeText: 'text-[#40E0D0]', hex: '#40E0D0' };
                else if (pkg === 'Max') theme = { primary: 'text-[#C084FC]', bgGlow: 'shadow-[#C084FC]/20', border: 'border-[#C084FC]/30', gradientCore: 'from-[#C084FC]', gradientLight: 'from-[#C084FC]/20', badgeBg: 'bg-[#C084FC]/20', badgeText: 'text-[#C084FC]', hex: '#C084FC' };
                else if (pkg === 'Pro') theme = { primary: 'text-[#DEFD40]', bgGlow: 'shadow-[#DEFD40]/20', border: 'border-[#DEFD40]/30', gradientCore: 'from-[#DEFD40]', gradientLight: 'from-[#DEFD40]/20', badgeBg: 'bg-[#DEFD40]/20', badgeText: 'text-[#DEFD40]', hex: '#DEFD40' };

                let subProgress = 100;
                let daysRemaining = '∞';
                if (!currentUser?.is_admin && currentUser?.subscription_start && currentUser?.subscription_days) {
                    const start = new Date(currentUser.subscription_start).getTime();
                    const totalDuration = currentUser.subscription_days * 24 * 60 * 60 * 1000;
                    const end = start + totalDuration;
                    const now = new Date().getTime();
                    if (now >= end) {
                        subProgress = 0;
                        daysRemaining = '0 days';
                    } else {
                        const elapsed = now - start;
                        subProgress = Math.max(0, Math.min(100, Math.round((elapsed / totalDuration) * 100)));
                        const leftMs = end - now;
                        const leftDays = Math.ceil(leftMs / (1000 * 60 * 60 * 24));
                        daysRemaining = `${leftDays} day${leftDays !== 1 ? 's' : ''}`;
                    }
                }

                return (
                    <div className="md:hidden">
                        <div className="fixed inset-0 z-[55] bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setShowAccountPopup(false)}></div>
                        <div className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100vw-2rem)] max-w-[320px] max-h-[85vh] overflow-y-auto custom-scrollbar bg-[#070b14] border border-white/10 rounded-2xl shadow-2xl backdrop-blur-xl z-[60] animate-in fade-in duration-200`} style={{ boxShadow: `0 0 40px -10px ${theme.hex}30` }}>
                            {/* Glowing top edge */}
                            <div className={`sticky top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${theme.gradientCore} via-white to-${theme.gradientCore} opacity-70 z-10`}></div>

                            <div className="p-6 pb-5 flex flex-col items-center border-b border-white/5 relative">
                                <div className="absolute top-0 inset-x-0 h-24 overflow-hidden pointer-events-none rounded-t-2xl">
                                    <div className="absolute inset-x-0 -top-10 h-20 blur-2xl opacity-20" style={{ backgroundColor: theme.hex }}></div>
                                </div>
                                <div className="relative mb-3">
                                    <div className="w-14 h-14 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center border-2 z-10 relative" style={{ borderColor: theme.hex }}>
                                        <svg className={`w-6 h-6 ${theme.primary}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                    </div>
                                    <div className="absolute inset-0 rounded-full animate-ping opacity-20" style={{ backgroundColor: theme.hex }}></div>
                                </div>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${theme.badgeBg} ${theme.badgeText} border ${theme.border} mb-4`}>
                                    {pkg} PLAN
                                </span>
                                <div className="w-full bg-black/40 rounded-xl p-3 border border-white/5 flex justify-between items-center group/access">
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Access Code</span>
                                        <span className="text-sm font-mono text-white tracking-widest">
                                            {showAccessCode ? currentUser?.access_code : '••••••••'}
                                        </span>
                                    </div>
                                    <button onClick={() => setShowAccessCode(!showAccessCode)} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors" style={{ color: showAccessCode ? theme.hex : '#64748b' }}>
                                        {showAccessCode ? (
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="m2 2 20 20" /><path d="M6.71 6.71q2.3-1.71 5.29-1.71 7 0 10 7a15.53 15.53 0 0 1-4.14 5.34m-3.92 1.48Q13 19 12 19q-7 0-10-7a15.08 15.08 0 0 1 2.3-3.61" /><circle cx="12" cy="12" r="3" /></svg>
                                        ) : (
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
                                        )}
                                    </button>
                                </div>
                            </div>

                            <div className="p-5 grid grid-cols-2 gap-4 border-b border-white/5">
                                <div className="bg-gradient-to-br from-white/5 to-black/60 border border-white/5 rounded-xl p-3 flex flex-col items-center justify-center text-center relative overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-t via-transparent to-transparent opacity-10" style={{ backgroundImage: `linear-gradient(to top, ${theme.hex} 0%, transparent 100%)` }}></div>
                                    <div className="absolute bottom-0 inset-x-0 h-[1px] opacity-20" style={{ backgroundColor: theme.hex }}></div>
                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center mb-2 shadow-inner bg-black/50 ${theme.border} border`}>
                                        <svg className={`w-3.5 h-3.5 ${theme.primary}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                    </div>
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1 z-10">Art Credits</span>
                                    <span className={`text-2xl font-black ${theme.primary} z-10`} style={{ textShadow: `0 0 10px ${theme.hex}50` }}>
                                        {currentUser?.is_admin ? '∞' : (currentUser?.art_credits || 0)}
                                    </span>
                                </div>
                                <div className="bg-gradient-to-br from-white/5 to-black/60 border border-white/5 rounded-xl p-3 flex flex-col items-center justify-center text-center relative overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-t via-transparent to-transparent opacity-10" style={{ backgroundImage: `linear-gradient(to top, ${theme.hex} 0%, transparent 100%)` }}></div>
                                    <div className="absolute bottom-0 inset-x-0 h-[1px] opacity-20" style={{ backgroundColor: theme.hex }}></div>
                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center mb-2 shadow-inner bg-black/50 ${theme.border} border`}>
                                        <svg className={`w-3.5 h-3.5 ${theme.primary}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18 18.247 18.477 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                                    </div>
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1 z-10">Lore Credits</span>
                                    <span className={`text-2xl font-black ${theme.primary} z-10`} style={{ textShadow: `0 0 10px ${theme.hex}50` }}>
                                        {currentUser?.is_admin ? '∞' : (currentUser?.lore_credits || 0)}
                                    </span>
                                </div>
                            </div>

                            <div className="p-5">
                                <div className="flex items-center gap-3 mb-4">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Membership Status</h4>
                                    <div className="flex-1 h-[1px] bg-gradient-to-r from-white/10 to-transparent"></div>
                                </div>
                                <div className="space-y-3">
                                    <div>
                                        <div className="flex justify-between text-[9px] font-bold uppercase tracking-wide mb-1.5 text-white">
                                            <span>Time Left</span>
                                        </div>
                                        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                                            <div className="h-full rounded-full transition-all duration-1000 bg-gradient-to-r to-white/20" style={{ width: `${subProgress}%`, backgroundColor: theme.hex }}></div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 pt-2 text-[10px]">
                                        <div className="bg-black/30 rounded-lg p-2 border border-white/5">
                                            <div className="text-slate-500 font-black uppercase tracking-wider mb-0.5 text-[8px]">Started</div>
                                            <div className="font-mono text-slate-300">
                                                {currentUser?.subscription_start ? new Date(currentUser.subscription_start).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                                            </div>
                                        </div>
                                        <div className="bg-black/30 rounded-lg p-2 border border-white/5">
                                            <div className="text-slate-500 font-black uppercase tracking-wider mb-0.5 text-[8px]">Expires</div>
                                            <div className="font-mono text-slate-300">
                                                {currentUser?.is_admin || !currentUser?.subscription_days
                                                    ? 'Never'
                                                    : new Date(new Date(currentUser.subscription_start!).getTime() + currentUser.subscription_days * 24 * 60 * 60 * 1000).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                                                }
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 bg-gradient-to-t from-black/80 to-transparent flex justify-center border-t border-white/5 relative">
                                <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-black/60 backdrop-blur-md rounded-full border border-white/5 shadow-inner">
                                    <div className="w-1.5 h-1.5 rounded-full animate-pulse shadow-[0_0_5px_currentColor]" style={{ backgroundColor: theme.hex, color: theme.hex }}></div>
                                    <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: theme.hex }}>System Online</span>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {isExpired && (
                <div className="bg-red-500 text-white text-center py-3 font-bold uppercase tracking-widest shadow-lg border-y border-red-600 z-50 relative">
                    ⚠️ Membership duration ended. Your account is deactivated. You cannot use generation or research features.
                </div>
            )}

            <main className="w-full max-w-[1800px] mx-auto px-3 md:px-6 py-4 md:py-8 relative">
                {!hasMascots && !isGenerating && (
                    <div className="space-y-4 md:space-y-8 relative z-10">
                        {appMode === 'art' && (
                            <>
                                {/* Lite/Pro Toggle */}
                                <div className="flex justify-center mb-6">
                                    <div className="relative bg-[#02040A]/60 backdrop-blur-xl p-1 rounded-full border border-white/10 flex items-center shadow-xl">
                                        <div className="flex absolute inset-1 transition-all duration-300 pointer-events-none" style={{ padding: '4px', left: artInterfaceMode === 'lite' ? '0' : '50%', right: artInterfaceMode === 'lite' ? '50%' : '0' }}>
                                            <div className="w-full h-full rounded-full shadow-[0_0_15px_rgba(255,255,255,0.15)] bg-white/10 backdrop-blur-md"></div>
                                        </div>
                                        <button onClick={() => setArtInterfaceMode('lite')} className={`relative z-10 w-24 md:w-32 py-2 text-xs font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-1.5 rounded-full ${artInterfaceMode === 'lite' ? 'text-accent' : 'text-slate-400 hover:text-white'}`}>
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                            LITE
                                        </button>
                                        <button onClick={() => setArtInterfaceMode('pro')} className={`relative z-10 w-24 md:w-32 py-2 text-xs font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-1.5 rounded-full ${artInterfaceMode === 'pro' ? 'text-blue-400' : 'text-slate-400 hover:text-white'}`}>
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
                                            PRO
                                        </button>
                                    </div>
                                </div>

                                {artInterfaceMode === 'lite' ? (
                                    <LiteModeWizard
                                        currentUser={currentUser}
                                        isGenerating={isGenerating}
                                        uploadedImage={uploadedImage}
                                        setUploadedImage={setUploadedImage}
                                        fileInputRef={fileInputRef}
                                        handleFileUpload={handleFileUpload}
                                        handleDragOver={handleDragOver}
                                        handleDragLeave={handleDragLeave}
                                        handleRemixDrop={handleRemixDrop}
                                        isDragging={isDragging}
                                        selectedStyles={selectedStyles}
                                        toggleStyle={toggleStyle}
                                        selectAllStyles={selectAllStyles}
                                        customRemixNarrative={customRemixNarrative}
                                        setCustomRemixNarrative={setCustomRemixNarrative}
                                        traitBaseImage={traitBaseImage}
                                        setTraitBaseImage={setTraitBaseImage}
                                        traitMode={traitMode}
                                        setTraitMode={setTraitMode}
                                        traitsInput={traitsInput}
                                        setTraitsInput={setTraitsInput}
                                        handleGenerateFromUpload={handleGenerateFromUpload}
                                        handleGenerateTraits={handleGenerateTraits}
                                        handleRemixPaste={handleRemixPaste}
                                        customInput={customInput}
                                        setCustomInput={setCustomInput}
                                        handleGenerateFromCustomInput={handleGenerateFromCustomInput}
                                    />
                                ) : (
                                    <div className="space-y-4 md:space-y-8 animate-in fade-in zoom-in-95 duration-500">
                                        {/* 1. TOP CONTROL BAR (Styles + Quantity) */}
                                        <div className="bg-navy-900/40 backdrop-blur-xl border border-white/10 rounded-3xl p-4 md:p-8 shadow-2xl flex flex-col xl:flex-row gap-4 md:gap-8 items-stretch xl:items-center animate-in slide-in-from-top-4 duration-500">
                                            <div className="flex-1 w-full">
                                                <div className="flex justify-between items-end mb-4">
                                                    <div>
                                                        <div className="flex items-center gap-3">
                                                            <h2 className="text-lg md:text-2xl font-black text-white tracking-tighter">SELECT ART STYLE</h2>
                                                            {selectedStyles.length > 0 && (
                                                                <span className="bg-accent/10 border border-accent/20 text-accent text-[10px] font-black px-2 py-0.5 rounded-full animate-in fade-in zoom-in duration-300">
                                                                    {selectedStyles.length} ACTIVE
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-4">
                                                        <button onClick={selectAllStyles} className="text-[10px] font-bold text-slate-500 hover:text-accent uppercase transition-colors flex items-center gap-1.5">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-current"></div>
                                                            {selectedStyles.length === AVAILABLE_ART_STYLES.length ? "Deselect All" : "Select All"}
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 xl:grid-cols-5 gap-3">
                                                    {AVAILABLE_ART_STYLES.map((style, idx) => {
                                                        const isSelected = selectedStyles.includes(style.id);

                                                        return (
                                                            <button
                                                                key={style.id}
                                                                onClick={() => toggleStyle(style.id)}
                                                                className={`
                                                    group relative h-16 p-3 rounded-xl border transition-all duration-300 text-left overflow-hidden flex flex-col justify-between
                                                    ${isSelected
                                                                        ? 'bg-accent border-accent shadow-[0_0_25px_rgba(222,253,65,0.2)] scale-[1.02] z-10'
                                                                        : 'bg-black border-white/5 text-slate-500 hover:border-white/20 hover:bg-navy-900'
                                                                    }
                                                `}
                                                            >
                                                                <div className="flex justify-between items-start z-10 w-full mb-1">
                                                                    <span className={`text-[8px] font-mono leading-none ${isSelected ? 'text-black/60' : 'text-slate-500'}`}>0{idx + 1}</span>
                                                                    <div className="flex items-center gap-1.5">
                                                                        {style.id === 'original' && (
                                                                            <div className="w-3.5 h-3.5 rounded-full bg-[#DEFD41] flex items-center justify-center shadow-[0_0_10px_rgba(222,253,65,0.4)]" title="Highly Recommended">
                                                                                <svg className="w-2 h-2 text-black" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l2.4 7.2h7.6l-6 4.8 2.4 7.2-6-4.8-6 4.8 2.4-7.2-6-4.8h7.6z" /></svg>
                                                                            </div>
                                                                        )}
                                                                        {isSelected && (
                                                                            <div className="w-3 h-3 rounded-full bg-black flex items-center justify-center animate-in zoom-in duration-200">
                                                                                <svg className="w-2 h-2 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                <div className="z-10">
                                                                    <span className={`text-[10px] font-black uppercase tracking-tight leading-none block ${isSelected ? 'text-black' : 'text-white'}`}>
                                                                        {style.name}
                                                                    </span>
                                                                </div>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>

                                        {/* 2. GENERATORS ROW */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                            {/* ... (Remix, Random, Text components - same as previous) ... */}
                                            <div className="relative bg-[#0B1221] border border-white/10 rounded-2xl p-4 md:p-6 hover:border-blue-400/50 transition-all hover:z-50 group flex flex-col h-full shadow-2xl">
                                                <div className="absolute inset-0 bg-[radial-gradient(#ffffff05_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none"></div>
                                                <div className="relative z-10 flex flex-col h-full">
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div>
                                                            <div className="inline-flex items-center gap-2 px-2 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-300 text-[9px] font-bold uppercase tracking-widest mb-3">
                                                                <span className={`w-1.5 h-1.5 rounded-full ${uploadedImage ? 'bg-blue-400' : 'bg-slate-600'} animate-pulse`}></span>
                                                                {uploadedImage ? 'Image Ready' : 'Upload Source'}
                                                            </div>
                                                            <h3 className="text-xl md:text-3xl font-black text-white tracking-tight leading-none">STORY MODE</h3>
                                                            <p className="text-sm text-slate-400 mt-1 font-medium">Place character in new scenes.</p>
                                                        </div>
                                                        <div className="flex flex-col items-end gap-2">
                                                            <InfoTooltip text="Upload an existing image to create new variations." />
                                                            <div className="text-blue-500/20 group-hover:text-blue-500/40 transition-colors">
                                                                <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div
                                                        onClick={() => fileInputRef.current?.click()}
                                                        onDragOver={handleDragOver}
                                                        onDragLeave={handleDragLeave}
                                                        onDrop={handleRemixDrop}
                                                        onPaste={handleRemixPaste}
                                                        className={`relative w-full flex-1 min-h-[100px] md:min-h-[140px] rounded-xl transition-all duration-200 cursor-pointer overflow-hidden group/drop flex items-center justify-center mb-4 
                                    ${uploadedImage ? 'bg-black border border-white/10' : ''}
                                    ${!uploadedImage && !isDragging ? 'bg-black/20 border-2 border-dashed border-white/10 hover:border-blue-400 hover:bg-blue-500/5' : ''}
                                    ${isDragging ? 'bg-blue-500/20 border-2 border-blue-500 scale-[1.02] shadow-[0_0_20px_rgba(59,130,246,0.2)]' : ''}
                                `}
                                                    >
                                                        {uploadedImage ? (
                                                            <>
                                                                <img src={uploadedImage} className="w-full h-full object-contain" />
                                                                <button onClick={(e) => { e.stopPropagation(); setUploadedImage(null) }} className="absolute top-2 right-2 bg-red-500/80 hover:bg-red-500 text-white p-1.5 rounded-lg backdrop-blur-sm transition-colors"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                                                            </>
                                                        ) : (
                                                            <div className="text-center p-4 pointer-events-none">
                                                                <div className="mb-2">
                                                                    <svg className={`w-8 h-8 mx-auto mb-2 transition-colors ${isDragging ? 'text-blue-400' : 'text-slate-600 group-hover/drop:text-blue-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                                                    </svg>
                                                                </div>
                                                                <span className={`text-[10px] font-bold uppercase tracking-widest transition-colors block mb-1 ${isDragging ? 'text-blue-300' : 'text-slate-500 group-hover/drop:text-blue-400'}`}>
                                                                    {isDragging ? 'DROP TO UPLOAD' : 'Click, Drop or Paste'}
                                                                </span>
                                                                <span className="text-[8px] text-slate-700 font-mono uppercase tracking-tighter block mt-1">Supports Clipboard (Ctrl+V)</span>
                                                            </div>
                                                        )}
                                                        <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-2 mb-4">
                                                        <div onClick={() => setPreserveOriginal(!preserveOriginal)} className={`cursor-pointer border rounded-lg p-2 flex flex-col justify-center transition-all ${preserveOriginal ? 'bg-blue-500/10 border-blue-500/50' : 'bg-black/20 border-white/5 hover:border-white/20'}`}>
                                                            <div className="flex items-center justify-between mb-1"><span className={`text-[9px] font-bold uppercase ${preserveOriginal ? 'text-blue-300' : 'text-slate-500'}`}>Lock Pose</span><div className={`w-1.5 h-1.5 rounded-full ${preserveOriginal ? 'bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]' : 'bg-slate-700'}`}></div></div>
                                                        </div>
                                                        <div onClick={() => setShowCustomRemixLore(!showCustomRemixLore)} className={`cursor-pointer border rounded-lg p-2 flex flex-col justify-center transition-all ${showCustomRemixLore ? 'bg-white/10 border-white/20' : 'bg-black/20 border-white/5 hover:border-white/20'}`}>
                                                            <div className="flex items-center justify-between"><span className={`text-[9px] font-bold uppercase ${showCustomRemixLore ? 'text-white' : 'text-slate-500'}`}>Add Lore</span><svg className={`w-3 h-3 transition-transform ${showCustomRemixLore ? 'rotate-180 text-white' : 'text-slate-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg></div>
                                                        </div>
                                                    </div>
                                                    {showCustomRemixLore && <textarea placeholder="Add specific backstory..." value={customRemixNarrative} onChange={e => setCustomRemixNarrative(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-xs text-slate-200 placeholder:text-slate-700 focus:border-blue-500 outline-none resize-none mb-4" rows={2} />}
                                                    <div className="mt-auto relative">
                                                        {!currentUser?.can_use_art && !currentUser?.is_admin && (
                                                            <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] z-20 flex items-center justify-center rounded-lg border border-red-500/50">
                                                                <div className="flex items-center gap-2 text-red-500">
                                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                                                    <span className="text-[10px] font-black tracking-widest uppercase">Art Access Locked</span>
                                                                </div>
                                                            </div>
                                                        )}
                                                        {currentUser?.can_use_art && !currentUser?.is_admin && (currentUser?.art_credits || 0) <= 0 && (
                                                            <div className="absolute inset-0 bg-black/80 backdrop-blur-[2px] z-20 flex items-center justify-center rounded-lg border border-orange-500/50 opacity-0 hover:opacity-100 transition-opacity">
                                                                <div className="flex items-center gap-2 text-orange-500">
                                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                                    <span className="text-[10px] font-black tracking-widest uppercase">Out of Art Credits</span>
                                                                </div>
                                                            </div>
                                                        )}
                                                        <Button onClick={handleGenerateFromUpload} disabled={!uploadedImage || selectedStyles.length === 0 || (!currentUser?.can_use_art && !currentUser?.is_admin)} className={`w-full py-3 md:py-4 text-sm md:text-lg font-black tracking-widest shadow-lg ${uploadedImage ? 'bg-blue-500 text-white hover:bg-blue-400 border-transparent shadow-blue-900/20' : 'bg-white/5 text-slate-600 border-white/5'}`}>REMIX</Button>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* TRAIT MIXER */}
                                            <div className="relative bg-[#100B05] border border-white/10 rounded-2xl p-4 md:p-6 hover:border-orange-400/50 transition-all hover:z-50 group flex flex-col h-full shadow-2xl">
                                                <div className="absolute inset-0 bg-[radial-gradient(#f9731605_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none"></div>
                                                <div className="relative z-10 flex flex-col h-full">
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div>
                                                            <div className="inline-flex items-center gap-2 px-2 py-1 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-300 text-[9px] font-bold uppercase tracking-widest mb-3">
                                                                <span className={`w-1.5 h-1.5 rounded-full ${traitBaseImage ? 'bg-orange-400' : 'bg-slate-600'} animate-pulse`}></span>
                                                                {traitBaseImage ? 'Identity Lock' : 'Upload Base'}
                                                            </div>
                                                            <h3 className="text-xl md:text-3xl font-black text-white tracking-tight leading-none">CUSTOM MODE</h3>
                                                            <p className="text-xs md:text-sm text-slate-400 mt-1 font-medium">Equip items, change backgrounds, characters and modify traits.</p>
                                                        </div>
                                                        <div className="flex flex-col items-end gap-2">
                                                            <InfoTooltip text="Upload a focused character image, then list traits or scenarios to generate variations." />
                                                            <div className="text-orange-500/20 group-hover:text-orange-500/40 transition-colors">
                                                                <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24"><path d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div
                                                        onClick={() => traitFileInputRef.current?.click()}
                                                        onDragOver={(e) => { e.preventDefault(); setIsDraggingTrait(true); }}
                                                        onDragLeave={(e) => { e.preventDefault(); setIsDraggingTrait(false); }}
                                                        onDrop={handleTraitDrop}
                                                        className={`relative w-full flex-1 min-h-[100px] md:min-h-[140px] rounded-xl transition-all duration-200 cursor-pointer overflow-hidden group/drop flex items-center justify-center mb-4 
                                    ${traitBaseImage ? 'bg-black border border-white/10' : ''}
                                    ${!traitBaseImage && !isDraggingTrait ? 'bg-black/20 border-2 border-dashed border-white/10 hover:border-orange-400 hover:bg-orange-500/5' : ''}
                                    ${isDraggingTrait ? 'bg-orange-500/20 border-2 border-orange-500 scale-[1.02] shadow-[0_0_20px_rgba(249,115,22,0.2)]' : ''}
                                `}
                                                    >
                                                        {traitBaseImage ? (
                                                            <>
                                                                <img src={traitBaseImage} className="w-full h-full object-contain" />
                                                                <button onClick={(e) => { e.stopPropagation(); setTraitBaseImage(null) }} className="absolute top-2 right-2 bg-red-500/80 hover:bg-red-500 text-white p-1.5 rounded-lg backdrop-blur-sm transition-colors"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                                                            </>
                                                        ) : (
                                                            <div className="text-center p-4 pointer-events-none">
                                                                <div className="mb-2 text-orange-500/40 group-hover/drop:text-orange-500 transition-colors">
                                                                    <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                                </div>
                                                                <span className={`text-[10px] font-bold uppercase tracking-widest transition-colors block mb-1 ${isDraggingTrait ? 'text-orange-300' : 'text-slate-500 group-hover/drop:text-orange-400'}`}>
                                                                    {isDraggingTrait ? 'DROP TO UPLOAD' : 'Click or Drop Base Image'}
                                                                </span>
                                                            </div>
                                                        )}
                                                        <input type="file" ref={traitFileInputRef} onChange={handleTraitFileUpload} accept="image/*" className="hidden" />
                                                    </div>

                                                    {/* MODE TERMINAL UI */}
                                                    <div className="flex bg-black/40 p-1 rounded-xl border border-white/5 mb-3">
                                                        <button onClick={() => setTraitMode('mix')} className={`flex-1 py-2 text-[9px] font-black rounded-lg transition-all uppercase tracking-widest ${traitMode === 'mix' ? 'bg-orange-500 text-black shadow-lg shadow-orange-950/20' : 'text-slate-500 hover:text-white'}`}>Mix Mode</button>
                                                        <button onClick={() => setTraitMode('scenes')} className={`flex-1 py-2 text-[9px] font-black rounded-lg transition-all uppercase tracking-widest ${traitMode === 'scenes' ? 'bg-orange-500 text-black shadow-lg shadow-orange-950/20' : 'text-slate-500 hover:text-white'}`}>Scenes Mode</button>
                                                    </div>

                                                    <div className="flex flex-col group/terminal bg-black/40 border border-white/10 rounded-xl overflow-hidden mb-4">
                                                        <div className="flex items-center justify-between px-3 py-1.5 bg-white/5 border-b border-white/10">
                                                            <span className="text-[8px] font-black text-orange-500/60 uppercase tracking-widest">{traitMode === 'mix' ? 'Combinator' : 'Sequencer'} ACTIVE</span>
                                                            <div className="flex gap-1.5">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-orange-500/20 italic animate-pulse"></div>
                                                            </div>
                                                        </div>
                                                        <textarea
                                                            value={traitsInput}
                                                            onChange={(e) => setTraitsInput(e.target.value)}
                                                            placeholder={traitMode === 'mix'
                                                                ? "hat: blue hat, solana hat\nskin: red, yellow"
                                                                : "Scene 1: black suit, sunglasses, wagmi hat\nScene 2: red suit, solana hat, solana necklace"}
                                                            className="w-full bg-transparent p-3 text-xs text-orange-100 placeholder:text-slate-800 outline-none resize-none min-h-[90px] font-mono leading-relaxed"
                                                            onPaste={handleTraitPaste}
                                                        />
                                                    </div>

                                                    <div className="mt-auto relative">
                                                        {!currentUser?.can_use_art && !currentUser?.is_admin && (
                                                            <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] z-20 flex items-center justify-center rounded-lg border border-red-500/50">
                                                                <div className="flex items-center gap-2 text-red-500">
                                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                                                    <span className="text-[10px] font-black tracking-widest uppercase">Art Access Locked</span>
                                                                </div>
                                                            </div>
                                                        )}
                                                        {currentUser?.can_use_art && !currentUser?.is_admin && (currentUser?.art_credits || 0) <= 0 && (
                                                            <div className="absolute inset-0 bg-black/80 backdrop-blur-[2px] z-20 flex items-center justify-center rounded-lg border border-orange-500/50 opacity-0 hover:opacity-100 transition-opacity">
                                                                <div className="flex items-center gap-2 text-orange-500">
                                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                                    <span className="text-[10px] font-black tracking-widest uppercase">Out of Art Credits</span>
                                                                </div>
                                                            </div>
                                                        )}
                                                        <Button
                                                            onClick={handleGenerateTraits}
                                                            disabled={isGenerating || !traitBaseImage || (!currentUser?.can_use_art && !currentUser?.is_admin)}
                                                            className={`w-full py-3 md:py-4 text-sm md:text-lg font-black tracking-widest shadow-lg ${isGenerating || !traitBaseImage ? 'bg-white/5 text-slate-700' : 'bg-orange-600 text-white hover:bg-orange-500 shadow-orange-950/20'}`}
                                                            icon={isGenerating ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : undefined}
                                                        >
                                                            {isGenerating ? 'GENESIS...' : 'LAUNCH'}
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>

                                            <div id="create-from-text-card" className="bg-black border border-white/10 rounded-2xl p-4 md:p-6 hover:border-white/30 transition-all hover:z-50 flex flex-col justify-between h-full shadow-2xl relative">
                                                <div className="absolute top-4 md:top-6 right-4 md:right-6 z-20"><InfoTooltip text="Describe your specific idea in text and let the AI visualize it." /></div>
                                                <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-0 pointer-events-none bg-[length:100%_2px,3px_100%]"></div>
                                                <div className="relative z-10 mt-4">
                                                    <div className="inline-flex items-center gap-2 px-2 py-1 rounded-full bg-white/5 border border-white/10 text-slate-400 text-[9px] font-bold uppercase tracking-widest mb-6">Custom Input</div>
                                                    <h3 className="text-xl md:text-3xl font-black text-white mb-2 tracking-tight">CREATE FROM TEXT</h3>
                                                    <p className="text-xs md:text-sm text-slate-500 mb-4 font-medium">Turn your text concepts into visual assets.</p>
                                                    <div className="relative group/input"><textarea value={customInput} onChange={(e) => setCustomInput(e.target.value)} placeholder="Describe your character idea..." className="relative w-full bg-[#0A0A0A] border-2 border-white/10 rounded-xl p-4 text-sm text-accent placeholder:text-slate-700 focus:border-accent outline-none h-32 resize-none leading-relaxed font-mono tracking-wide" /></div>
                                                </div>
                                                <div className="mt-auto pt-4 relative z-10">
                                                    {!currentUser?.can_use_art && !currentUser?.is_admin && (
                                                        <div className="absolute inset-0 top-4 bg-black/60 backdrop-blur-[2px] z-20 flex items-center justify-center rounded-lg border border-red-500/50">
                                                            <div className="flex items-center gap-2 text-red-500">
                                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                                                <span className="text-[10px] font-black tracking-widest uppercase">Art Access Locked</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {currentUser?.can_use_art && !currentUser?.is_admin && (currentUser?.art_credits || 0) <= 0 && (
                                                        <div className="absolute inset-0 top-4 bg-black/80 backdrop-blur-[2px] z-20 flex items-center justify-center rounded-lg border border-orange-500/50 opacity-0 hover:opacity-100 transition-opacity">
                                                            <div className="flex items-center gap-2 text-orange-500">
                                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                                <span className="text-[10px] font-black tracking-widest uppercase">Out of Art Credits</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                    <Button
                                                        onClick={handleGenerateFromCustomInput}
                                                        disabled={!customInput.trim() || selectedStyles.length === 0 || isGenerating || (!currentUser?.can_use_art && !currentUser?.is_admin)}
                                                        className="w-full py-3 md:py-4 text-sm md:text-lg font-black tracking-widest bg-white/5 hover:bg-white/10 text-white border-accent/20 hover:border-accent shadow-xl"
                                                    >
                                                        GENERATE
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {appMode === 'scraper' && (
                            <>
                                {/* 3. TREND FINDER ROW (4x2 GRID) */}
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 pt-4">

                                    {/* 1. GOD MODE CARD (Compact) */}
                                    <div className="h-auto md:h-48 min-h-[12rem] relative bg-[#181100] border-2 border-yellow-500/50 rounded-2xl text-left hover:border-yellow-400 transition-all hover:z-50 group shadow-[0_0_50px_rgba(234,179,8,0.1)] flex flex-col justify-between p-4 md:p-6">
                                        <div className="absolute top-4 right-4 z-20" onClick={(e) => e.stopPropagation()}>
                                            <InfoTooltip text="GOD MODE: Scans ALL platforms (X, TikTok, Reddit, 4chan, News, KYM) to find the ultimate viral intersection." />
                                        </div>
                                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-30 transition-opacity pointer-events-none">
                                            <svg className="w-24 h-24 text-yellow-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l2.4 7.2h7.6l-6 4.8 2.4 7.2-6-4.8-6 4.8 2.4-7.2-6-4.8h7.6z" /></svg>
                                        </div>
                                        {!currentUser?.can_use_scrape && !currentUser?.is_admin && (
                                            <div className="absolute inset-0 bg-black/80 backdrop-blur-[2px] z-40 rounded-xl flex flex-col items-center justify-center border border-red-500/50 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                                <svg className="w-8 h-8 text-red-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                                <span className="text-xs text-red-500 font-black tracking-widest uppercase">Scrape Locked</span>
                                            </div>
                                        )}
                                        {currentUser?.can_use_scrape && !currentUser?.is_admin && (currentUser?.lore_credits || 0) <= 0 && (
                                            <div className="absolute inset-0 bg-black/80 backdrop-blur-[2px] z-40 rounded-xl flex flex-col items-center justify-center border border-orange-500/50 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                                <svg className="w-8 h-8 text-orange-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                <span className="text-xs text-orange-500 font-black tracking-widest uppercase">Out of Lore Credits</span>
                                            </div>
                                        )}

                                        <div className="relative z-10 pointer-events-none">
                                            <h3 className="text-xl font-black text-white tracking-tighter group-hover:text-yellow-400 transition-colors">GOD MODE</h3>
                                            <p className="text-[10px] text-slate-400 mt-1 font-medium leading-tight">Scans X, Reddit, 4chan, TikTok & News.</p>
                                        </div>

                                        <div className="relative z-10 flex flex-col gap-2">
                                            <div className="flex self-start bg-black/40 rounded-lg p-1 border border-white/10 backdrop-blur-sm z-30 items-center" onClick={(e) => e.stopPropagation()}>
                                                {['24h', '48h', '1w'].map(t => (
                                                    <button
                                                        key={t}
                                                        onClick={() => setTimeRange(t as any)}
                                                        className={`px-1.5 py-0.5 text-[8px] font-bold rounded transition-colors uppercase ${timeRange === t ? 'bg-yellow-500 text-black shadow-lg' : 'text-slate-500 hover:text-white'}`}
                                                    >
                                                        {t.toUpperCase()}
                                                    </button>
                                                ))}
                                                <button
                                                    onClick={() => setTimeRange('all')}
                                                    className={`px-1.5 py-0.5 text-[8px] font-bold rounded transition-colors uppercase ml-1 ${timeRange === 'all' ? 'bg-yellow-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                                                >
                                                    ALL
                                                </button>
                                            </div>

                                            <div className="flex gap-0 group/input bg-black border border-yellow-500/30 rounded-lg overflow-hidden focus-within:border-yellow-400 transition-colors shadow-lg z-30 relative" onClick={(e) => e.stopPropagation()}>
                                                <input
                                                    placeholder="TOPIC (OPTIONAL)..."
                                                    value={godModeInput} onChange={e => setGodModeInput(e.target.value)}
                                                    className="flex-1 bg-transparent px-2 py-1.5 text-xs font-bold text-white outline-none uppercase font-mono placeholder:text-yellow-700/50"
                                                    disabled={!currentUser?.can_use_scrape && !currentUser?.is_admin}
                                                />
                                                <button
                                                    onClick={() => handleStartResearch('godmode')}
                                                    disabled={!currentUser?.can_use_scrape && !currentUser?.is_admin}
                                                    className="px-3 bg-yellow-500 hover:bg-yellow-400 text-black font-black transition-colors text-[10px]"
                                                >
                                                    SCAN
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 2. X SCANNER */}
                                    <button disabled={!currentUser?.can_use_scrape && !currentUser?.is_admin} onClick={() => handleStartResearch('x')} className="h-auto md:h-48 min-h-[12rem] relative bg-black border-2 border-white/10 rounded-2xl text-left hover:border-[#1DA1F2] transition-all hover:z-50 group shadow-xl flex flex-col justify-between p-4 md:p-6 w-full">
                                        {!currentUser?.can_use_scrape && !currentUser?.is_admin && (
                                            <div className="absolute inset-0 bg-black/80 backdrop-blur-[2px] z-40 rounded-xl flex flex-col items-center justify-center border border-red-500/50 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <svg className="w-8 h-8 text-red-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                                <span className="text-xs text-red-500 font-black tracking-widest uppercase">Scrape Locked</span>
                                            </div>
                                        )}
                                        {currentUser?.can_use_scrape && !currentUser?.is_admin && (currentUser?.lore_credits || 0) <= 0 && (
                                            <div className="absolute inset-0 bg-black/80 backdrop-blur-[2px] z-40 rounded-xl flex flex-col items-center justify-center border border-orange-500/50 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <svg className="w-8 h-8 text-orange-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                <span className="text-xs text-orange-500 font-black tracking-widest uppercase">Out of Lore Credits</span>
                                            </div>
                                        )}
                                        <div className="absolute top-4 right-4 z-20" onClick={(e) => e.stopPropagation()}>
                                            <InfoTooltip text="Scans Twitter/X for the top trending topics right now." />
                                        </div>
                                        <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-40 transition-opacity">
                                            <svg className="w-20 h-20" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                                        </div>
                                        <div className="relative z-10">
                                            <h3 className="text-xl font-black text-white tracking-tighter group-hover:text-[#1DA1F2] transition-colors">X TRENDS</h3>
                                            <p className="text-[10px] text-slate-400 mt-1 font-medium leading-tight">Viral narratives & breaking topics.</p>
                                        </div>
                                        <div className="relative z-10 flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-slate-500 group-hover:text-white transition-colors">
                                                <span className="text-[10px] font-mono uppercase">Start Scan</span>
                                                <svg className="w-3 h-3 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                                            </div>
                                            <span className="text-[9px] font-mono text-[#1DA1F2] bg-[#1DA1F2]/10 border border-[#1DA1F2]/30 px-2 py-0.5 rounded">24H Only</span>
                                        </div>
                                    </button>

                                    {/* 3. TIKTOK TRENDS RESEARCH */}
                                    <div className="h-auto md:h-48 min-h-[12rem] relative bg-[#0d0205] border-2 border-white/10 rounded-2xl text-left hover:border-[#ff0050] transition-all hover:z-50 group shadow-xl flex flex-col justify-between p-4 md:p-6">
                                        {!currentUser?.can_use_scrape && !currentUser?.is_admin && (
                                            <div className="absolute inset-0 bg-black/80 backdrop-blur-[2px] z-40 rounded-xl flex flex-col items-center justify-center border border-red-500/50 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <svg className="w-8 h-8 text-red-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                                <span className="text-xs text-red-500 font-black tracking-widest uppercase">Scrape Locked</span>
                                            </div>
                                        )}
                                        {currentUser?.can_use_scrape && !currentUser?.is_admin && (currentUser?.lore_credits || 0) <= 0 && (
                                            <div className="absolute inset-0 bg-black/80 backdrop-blur-[2px] z-40 rounded-xl flex flex-col items-center justify-center border border-orange-500/50 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <svg className="w-8 h-8 text-orange-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                <span className="text-xs text-orange-500 font-black tracking-widest uppercase">Out of Lore Credits</span>
                                            </div>
                                        )}
                                        <div className="absolute top-4 right-4 z-20" onClick={(e) => e.stopPropagation()}><InfoTooltip text="Scans TikTok for viral challenges." /></div>
                                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-30 transition-opacity pointer-events-none"><svg className="w-24 h-24 text-[#ff0050]" fill="currentColor" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" /></svg></div>
                                        <div className="relative z-10 pointer-events-none">
                                            <h3 className="text-xl font-black text-white tracking-tighter group-hover:text-[#ff0050] transition-colors">TIKTOK TRENDS</h3>
                                            <p className="text-[10px] text-slate-400 mt-1 font-medium leading-tight">Trending sounds & viral challenges.</p>
                                        </div>
                                        <div className="relative z-10 flex items-center justify-between gap-2 z-30">
                                            <div className="flex bg-black/40 rounded-lg p-1 border border-white/10 backdrop-blur-sm" onClick={(e) => e.stopPropagation()}>
                                                {['24h', '48h', '1w'].map(t => (<button key={t} onClick={() => setTimeRange(t as any)} className={`px-1.5 py-0.5 text-[8px] font-bold rounded transition-colors uppercase ${timeRange === t ? 'bg-[#ff0050] text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>{t.toUpperCase()}</button>))}
                                            </div>
                                            <button disabled={!currentUser?.can_use_scrape && !currentUser?.is_admin} onClick={() => handleStartResearch('tiktok')} className="px-3 py-1 bg-[#ff0050] hover:bg-[#d60045] text-white font-black rounded-lg text-[10px] tracking-wider transition-all shadow-lg hover:shadow-[#ff0050]/50 h-full">SCAN</button>
                                        </div>
                                    </div>

                                    {/* 4. VIRAL NEWS (GLOBAL NEWS) */}
                                    <div className="h-auto md:h-48 min-h-[12rem] relative bg-[#050A18] border-2 border-white/10 rounded-2xl text-left hover:border-blue-500 transition-all hover:z-50 group shadow-xl flex flex-col justify-between p-4 md:p-6">
                                        {!currentUser?.can_use_scrape && !currentUser?.can_use_news_scrape && !currentUser?.is_admin && (
                                            <div className="absolute inset-0 bg-black/80 backdrop-blur-[2px] z-40 rounded-xl flex flex-col items-center justify-center border border-red-500/50 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <svg className="w-8 h-8 text-red-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                                <span className="text-xs text-red-500 font-black tracking-widest uppercase">Scrape Locked</span>
                                            </div>
                                        )}
                                        {(currentUser?.can_use_scrape || currentUser?.can_use_news_scrape) && !currentUser?.is_admin && (currentUser?.lore_credits || 0) <= 0 && (
                                            <div className="absolute inset-0 bg-black/80 backdrop-blur-[2px] z-40 rounded-xl flex flex-col items-center justify-center border border-orange-500/50 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <svg className="w-8 h-8 text-orange-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                <span className="text-xs text-orange-500 font-black tracking-widest uppercase">Out of Lore Credits</span>
                                            </div>
                                        )}
                                        <div className="absolute top-4 right-4 z-20" onClick={(e) => e.stopPropagation()}>
                                            <InfoTooltip text="Scans global news sources for absurd or funny stories." />
                                        </div>
                                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-30 transition-opacity pointer-events-none">
                                            <svg className="w-20 h-20 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        </div>
                                        <div className="relative z-10 pointer-events-none">
                                            <h3 className="text-xl font-black text-white tracking-tighter group-hover:text-blue-400 transition-colors">VIRAL NEWS</h3>
                                            <p className="text-[10px] text-slate-400 mt-1 font-medium leading-tight">Absurd global events & oddities.</p>
                                        </div>
                                        <div className="relative z-10 flex flex-col gap-2">
                                            <div className="flex self-start bg-black/40 rounded-lg p-1 border border-white/10 backdrop-blur-sm mb-1 z-30" onClick={(e) => e.stopPropagation()}>
                                                {['24h', '48h', '1w'].map(t => (
                                                    <button
                                                        key={t}
                                                        onClick={() => setTimeRange(t as any)}
                                                        className={`px-1.5 py-0.5 text-[8px] font-bold rounded transition-colors uppercase ${timeRange === t ? 'bg-blue-500 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                                                    >
                                                        {t.toUpperCase()}
                                                    </button>
                                                ))}
                                            </div>
                                            <div className="flex gap-0 group/input bg-black border border-white/20 rounded-lg overflow-hidden focus-within:border-blue-500 transition-colors shadow-lg z-30 relative" onClick={(e) => e.stopPropagation()}>
                                                {!currentUser?.can_use_scrape && !currentUser?.can_use_news_scrape && !currentUser?.is_admin && (
                                                    <div className="absolute inset-0 bg-black/80 backdrop-blur-[1px] z-20 flex items-center justify-center border border-red-500/50 opacity-0 group-hover/input:opacity-100 transition-opacity">
                                                    </div>
                                                )}
                                                <input
                                                    placeholder="TOPIC..."
                                                    value={newsInput} onChange={e => setNewsInput(e.target.value)}
                                                    className="flex-1 bg-transparent px-2 py-1.5 text-xs font-bold text-white outline-none uppercase font-mono placeholder:text-slate-700"
                                                    disabled={!currentUser?.can_use_scrape && !currentUser?.can_use_news_scrape && !currentUser?.is_admin}
                                                />
                                                <button disabled={!currentUser?.can_use_scrape && !currentUser?.can_use_news_scrape && !currentUser?.is_admin} onClick={() => handleStartResearch('news')} className="px-3 bg-blue-600 hover:bg-blue-500 text-white font-black transition-colors text-[10px]">SCAN</button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 5. 4CHAN SCANNER */}
                                    <div className="h-auto md:h-48 min-h-[12rem] relative bg-[#051105] border-2 border-white/10 rounded-2xl text-left hover:border-[#00FF00] transition-all hover:z-50 group shadow-xl flex flex-col justify-between p-4 md:p-6">
                                        {!currentUser?.can_use_scrape && !currentUser?.is_admin && (
                                            <div className="absolute inset-0 bg-black/80 backdrop-blur-[2px] z-40 rounded-xl flex flex-col items-center justify-center border border-red-500/50 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <svg className="w-8 h-8 text-red-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                                <span className="text-xs text-red-500 font-black tracking-widest uppercase">Scrape Locked</span>
                                            </div>
                                        )}
                                        {currentUser?.can_use_scrape && !currentUser?.is_admin && (currentUser?.lore_credits || 0) <= 0 && (
                                            <div className="absolute inset-0 bg-black/80 backdrop-blur-[2px] z-40 rounded-xl flex flex-col items-center justify-center border border-orange-500/50 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <svg className="w-8 h-8 text-orange-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                <span className="text-xs text-orange-500 font-black tracking-widest uppercase">Out of Lore Credits</span>
                                            </div>
                                        )}
                                        <div className="absolute top-4 right-4 z-20" onClick={(e) => e.stopPropagation()}><InfoTooltip text="Scans 4chan /biz/ and other boards." /></div>
                                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-30 transition-opacity pointer-events-none">
                                            <img src="/4chan-logo.png" alt="4chan Logo" className="w-24 h-24 object-contain opacity-80" />
                                        </div>
                                        <div className="relative z-10 pointer-events-none">
                                            <h3 className="text-xl font-black text-white tracking-tighter group-hover:text-[#00FF00] transition-colors">4CHAN /BIZ/</h3>
                                            <p className="text-[10px] text-slate-400 mt-1 font-medium leading-tight">/biz/ alpha & legendary lore.</p>
                                        </div>
                                        <div className="relative z-10 flex flex-col gap-2">
                                            <div className="flex self-start bg-black/40 rounded-lg p-1 border border-white/10 backdrop-blur-sm z-30 items-center" onClick={(e) => e.stopPropagation()}>
                                                {['24h', '48h', '1w'].map(t => (<button key={t} onClick={() => { setTimeRange(t as any); setFourChanYear(""); }} className={`px-1.5 py-0.5 text-[8px] font-bold rounded transition-colors uppercase ${timeRange === t && !fourChanYear ? 'bg-green-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>{t.toUpperCase()}</button>))}
                                                <button onClick={() => { setTimeRange('all'); setFourChanYear(""); }} className={`px-1.5 py-0.5 text-[8px] font-bold rounded transition-colors uppercase ml-1 ${timeRange === 'all' && !fourChanYear ? 'bg-[#00FF00] text-black shadow-lg shadow-[#00FF00]/50' : 'text-slate-500 hover:text-white'}`}>ALL</button>
                                                <input type="text" placeholder="YEAR" value={fourChanYear} onChange={(e) => setFourChanYear(e.target.value.replace(/\D/g, '').slice(0, 4))} className={`w-10 ml-2 bg-transparent border-b border-white/20 text-[9px] font-mono text-center outline-none focus:border-[#00FF00] ${fourChanYear ? 'text-[#00FF00] border-[#00FF00]' : 'text-slate-500'}`} />
                                            </div>
                                            <div className="flex gap-0 group/input bg-black border border-white/20 rounded-lg overflow-hidden focus-within:border-[#00FF00] transition-colors shadow-lg z-30 relative" onClick={(e) => e.stopPropagation()}>
                                                {!currentUser?.can_use_scrape && !currentUser?.is_admin && (
                                                    <div className="absolute inset-0 bg-black/80 backdrop-blur-[1px] z-20 flex items-center justify-center border border-red-500/50 opacity-0 group-hover/input:opacity-100 transition-opacity">
                                                    </div>
                                                )}
                                                <input disabled={!currentUser?.can_use_scrape && !currentUser?.is_admin} placeholder="KEYWORD..." value={fourChanInput} onChange={e => setFourChanInput(e.target.value)} className="flex-1 bg-transparent px-2 py-1.5 text-xs font-bold text-white outline-none uppercase font-mono placeholder:text-slate-700" />
                                                <button disabled={!currentUser?.can_use_scrape && !currentUser?.is_admin} onClick={() => handleStartResearch('4chan')} className="px-3 bg-[#009900] hover:bg-[#00FF00] hover:text-black text-white font-black transition-colors text-[10px]">SCAN</button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 6. KNOW YOUR MEME (KYM) */}
                                    <div className="h-auto md:h-48 min-h-[12rem] relative bg-[#080d1a] border-2 border-white/10 rounded-2xl text-left hover:border-cyan-500 transition-all hover:z-50 group shadow-xl flex flex-col justify-between p-4 md:p-6">
                                        {!currentUser?.can_use_scrape && !currentUser?.is_admin && (
                                            <div className="absolute inset-0 bg-black/80 backdrop-blur-[2px] z-40 rounded-xl flex flex-col items-center justify-center border border-red-500/50 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <svg className="w-8 h-8 text-red-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                                <span className="text-xs text-red-500 font-black tracking-widest uppercase">Scrape Locked</span>
                                            </div>
                                        )}
                                        {currentUser?.can_use_scrape && !currentUser?.is_admin && (currentUser?.lore_credits || 0) <= 0 && (
                                            <div className="absolute inset-0 bg-black/80 backdrop-blur-[2px] z-40 rounded-xl flex flex-col items-center justify-center border border-orange-500/50 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <svg className="w-8 h-8 text-orange-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                <span className="text-xs text-orange-500 font-black tracking-widest uppercase">Out of Lore Credits</span>
                                            </div>
                                        )}
                                        <div className="absolute top-4 right-4 z-20" onClick={(e) => e.stopPropagation()}><InfoTooltip text="Scans KnowYourMeme.com for viral memes." /></div>
                                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-30 transition-opacity pointer-events-none"><svg className="w-24 h-24 text-cyan-500" fill="currentColor" viewBox="0 0 24 24"><path d="M19 2H9c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM9 20V4h10v16H9zm-4-2h2v-2H5v2zm0-4h2v-2H5v2zm0-4h2V8H5v2zm0-4h2V4H5v2z" /></svg></div>
                                        <div className="relative z-10 pointer-events-none">
                                            <h3 className="text-xl font-black text-white tracking-tighter group-hover:text-cyan-500 transition-colors">KnowYourMeme</h3>
                                            <p className="text-[10px] text-slate-400 mt-1 font-medium leading-tight">Meme database & history.</p>
                                        </div>
                                        <div className="relative z-10 flex flex-col gap-2">
                                            <div className="flex self-start bg-black/40 rounded-lg p-1 border border-white/10 backdrop-blur-sm z-30 items-center" onClick={(e) => e.stopPropagation()}>
                                                {['24h', '48h', '1w'].map(t => (<button key={t} onClick={() => setTimeRange(t as any)} className={`px-1.5 py-0.5 text-[8px] font-bold rounded transition-colors uppercase ${timeRange === t ? 'bg-cyan-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>{t.toUpperCase()}</button>))}
                                                <button onClick={() => setTimeRange('all')} className={`px-1.5 py-0.5 text-[8px] font-bold rounded transition-colors uppercase ml-1 ${timeRange === 'all' ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/50' : 'text-slate-500 hover:text-white'}`}>ALL</button>
                                            </div>
                                            <div className="flex gap-0 group/input bg-black border border-white/20 rounded-lg overflow-hidden focus-within:border-cyan-500 transition-colors shadow-lg z-30 relative" onClick={(e) => e.stopPropagation()}>
                                                {!currentUser?.can_use_scrape && !currentUser?.is_admin && (
                                                    <div className="absolute inset-0 bg-black/80 backdrop-blur-[1px] z-20 flex items-center justify-center border border-red-500/50 opacity-0 group-hover/input:opacity-100 transition-opacity">
                                                    </div>
                                                )}
                                                <input disabled={!currentUser?.can_use_scrape && !currentUser?.is_admin} placeholder="KEYWORD..." value={kymInput} onChange={e => setKymInput(e.target.value)} className="flex-1 bg-transparent px-2 py-1.5 text-xs font-bold text-white outline-none uppercase font-mono placeholder:text-slate-700" />
                                                <button disabled={!currentUser?.can_use_scrape && !currentUser?.is_admin} onClick={() => handleStartResearch('kym')} className="px-3 bg-cyan-600 hover:bg-cyan-500 text-white font-black transition-colors text-[10px]">SCAN</button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 7. REDDIT LORE RESEARCH */}
                                    <div className="h-auto md:h-48 min-h-[12rem] relative bg-[#1a0b05] border-2 border-white/10 rounded-2xl text-left hover:border-orange-500 transition-all hover:z-50 group shadow-xl flex flex-col justify-between p-4 md:p-6">
                                        {!currentUser?.can_use_scrape && !currentUser?.is_admin && (
                                            <div className="absolute inset-0 bg-black/80 backdrop-blur-[2px] z-40 rounded-xl flex flex-col items-center justify-center border border-red-500/50 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <svg className="w-8 h-8 text-red-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                                <span className="text-xs text-red-500 font-black tracking-widest uppercase">Scrape Locked</span>
                                            </div>
                                        )}
                                        {currentUser?.can_use_scrape && !currentUser?.is_admin && (currentUser?.lore_credits || 0) <= 0 && (
                                            <div className="absolute inset-0 bg-black/80 backdrop-blur-[2px] z-40 rounded-xl flex flex-col items-center justify-center border border-orange-500/50 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <svg className="w-8 h-8 text-orange-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                <span className="text-xs text-orange-500 font-black tracking-widest uppercase">Out of Lore Credits</span>
                                            </div>
                                        )}
                                        <div className="absolute top-4 right-4 z-20" onClick={(e) => e.stopPropagation()}><InfoTooltip text="Scans Reddit for memeable threads." /></div>
                                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-30 transition-opacity pointer-events-none">
                                            <img src="/reddit-logo.webp" alt="Reddit Logo" className="w-24 h-24 object-contain opacity-80" />
                                        </div>
                                        <div className="relative z-10 pointer-events-none">
                                            <h3 className="text-xl font-black text-white tracking-tighter group-hover:text-orange-500 transition-colors">REDDIT LORE</h3>
                                            <p className="text-[10px] text-slate-400 mt-1 font-medium leading-tight">Community threads & stories.</p>
                                        </div>
                                        <div className="relative z-10 flex flex-col gap-2">
                                            <div className="flex self-start bg-black/40 rounded-lg p-1 border border-white/10 backdrop-blur-sm z-30 items-center" onClick={(e) => e.stopPropagation()}>
                                                {['24h', '48h', '1w'].map(t => (<button key={t} onClick={() => setTimeRange(t as any)} className={`px-1.5 py-0.5 text-[8px] font-bold rounded transition-colors uppercase ${timeRange === t ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>{t.toUpperCase()}</button>))}
                                                <button onClick={() => setTimeRange('all')} className={`px-1.5 py-0.5 text-[8px] font-bold rounded transition-colors uppercase ml-1 ${timeRange === 'all' ? 'bg-orange-500 text-black shadow-lg shadow-orange-500/50' : 'text-slate-500 hover:text-white'}`}>ALL</button>
                                            </div>
                                            <div className="flex gap-0 group/input bg-black border border-white/20 rounded-lg overflow-hidden focus-within:border-orange-500 transition-colors shadow-lg z-30 relative" onClick={(e) => e.stopPropagation()}>
                                                {!currentUser?.can_use_scrape && !currentUser?.is_admin && (
                                                    <div className="absolute inset-0 bg-black/80 backdrop-blur-[1px] z-20 flex items-center justify-center border border-red-500/50 opacity-0 group-hover/input:opacity-100 transition-opacity">
                                                    </div>
                                                )}
                                                <input disabled={!currentUser?.can_use_scrape && !currentUser?.is_admin} placeholder="KEYWORD..." value={redditInput} onChange={e => setRedditInput(e.target.value)} className="flex-1 bg-transparent px-2 py-1.5 text-xs font-bold text-white outline-none uppercase font-mono placeholder:text-slate-700" />
                                                <button disabled={!currentUser?.can_use_scrape && !currentUser?.is_admin} onClick={() => handleStartResearch('reddit')} className="px-3 bg-orange-600 hover:bg-orange-500 text-white font-black transition-colors text-[10px]">SCAN</button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 8. META HUNTER */}
                                    <div className="h-auto md:h-48 min-h-[12rem] relative bg-[#0a1812] border-2 border-white/10 rounded-2xl p-4 md:p-6 hover:border-emerald-500 transition-all hover:z-50 group shadow-xl flex flex-col justify-between">
                                        {!currentUser?.can_use_scrape && !currentUser?.is_admin && (
                                            <div className="absolute inset-0 bg-black/80 backdrop-blur-[2px] z-40 rounded-xl flex flex-col items-center justify-center border border-red-500/50 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <svg className="w-8 h-8 text-red-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                                <span className="text-xs text-red-500 font-black tracking-widest uppercase">Scrape Locked</span>
                                            </div>
                                        )}
                                        {currentUser?.can_use_scrape && !currentUser?.is_admin && (currentUser?.lore_credits || 0) <= 0 && (
                                            <div className="absolute inset-0 bg-black/80 backdrop-blur-[2px] z-40 rounded-xl flex flex-col items-center justify-center border border-orange-500/50 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <svg className="w-8 h-8 text-orange-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                <span className="text-xs text-orange-500 font-black tracking-widest uppercase">Out of Lore Credits</span>
                                            </div>
                                        )}
                                        <div className="absolute top-4 right-4 z-20"><InfoTooltip text="Search for specific keywords (e.g. 'Bull', 'Pepe') to find niche viral content." /></div>
                                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-30 transition-opacity pointer-events-none">
                                            <svg className="w-32 h-32 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" strokeWidth="0.5" /><circle cx="12" cy="12" r="6" strokeWidth="0.5" /><circle cx="12" cy="12" r="2" strokeWidth="1" className="fill-emerald-500/20" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M12 2v20M2 12h20" /></svg>
                                        </div>
                                        <div className="relative z-10 pointer-events-none">
                                            <h3 className="text-xl font-black text-white tracking-tighter group-hover:text-emerald-400 transition-colors">META HUNTER</h3>
                                            <p className="text-[10px] text-slate-400 mt-1 font-medium leading-tight">Track specific keywords.</p>
                                        </div>
                                        <div className="relative z-10 flex flex-col gap-2">
                                            <div className="flex self-start bg-black/40 rounded-lg p-1 border border-white/10 backdrop-blur-sm mb-1 z-30" onClick={(e) => e.stopPropagation()}>
                                                {['24h', '48h', '1w'].map(t => (
                                                    <button
                                                        key={t}
                                                        onClick={() => setTimeRange(t as any)}
                                                        className={`px-1.5 py-0.5 text-[8px] font-bold rounded transition-colors uppercase ${timeRange === t ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                                                    >
                                                        {t.toUpperCase()}
                                                    </button>
                                                ))}
                                            </div>
                                            <div className="flex gap-0 group/input bg-black border border-white/20 rounded-lg overflow-hidden focus-within:border-emerald-500 transition-colors shadow-lg z-30 relative" onClick={(e) => e.stopPropagation()}>
                                                {!currentUser?.can_use_scrape && !currentUser?.is_admin && (
                                                    <div className="absolute inset-0 bg-black/80 backdrop-blur-[1px] z-20 flex items-center justify-center border border-red-500/50 opacity-0 group-hover/input:opacity-100 transition-opacity">
                                                    </div>
                                                )}
                                                <input disabled={!currentUser?.can_use_scrape && !currentUser?.is_admin} placeholder="KEYWORD..." value={metaInput} onChange={e => setMetaInput(e.target.value)} className="flex-1 bg-transparent px-2 py-1.5 text-xs font-bold text-white outline-none uppercase font-mono placeholder:text-slate-700" />
                                                <button onClick={() => handleStartResearch('meta')} disabled={!metaInput.trim() || (!currentUser?.can_use_scrape && !currentUser?.is_admin)} className="px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-[10px]">HUNT</button>
                                            </div>
                                        </div>
                                    </div>

                                </div>
                            </>
                        )}

                    </div>
                )}

                {/* LOADING STATE */}
                {!hasMascots && isGenerating && <LoadingScreen />}

                {/* RESULTS GRID */}
                {hasMascots && (
                    <div className="animate-in fade-in duration-500">
                        {/* ... (Output Header and Grid same as previous) ... */}
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-0 mb-8 pb-6 border-b border-white/5 sticky top-16 md:top-20 bg-navy-950/95 backdrop-blur z-30 pt-4">
                            <div>
                                <h2 className="text-xl md:text-3xl font-black text-white uppercase tracking-tighter">Session Output</h2>
                                <div className="flex items-center gap-2 mt-1 md:mt-2">
                                    <span className="w-2 h-2 bg-accent rounded-full animate-pulse"></span>
                                    <p className="text-xs md:text-sm text-slate-400 font-mono uppercase tracking-widest">{mascots.length} Assets Generated</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                {isGenerating && (
                                    <div className="flex items-center gap-4 px-6 py-3 bg-navy-900 border border-accent/20 rounded-full">
                                        <div className="w-2 h-2 bg-accent rounded-full animate-pulse" />
                                        <span className="text-sm font-bold text-accent font-mono uppercase tracking-widest">{loadingStep || "Processing..."}</span>
                                    </div>
                                )}
                                {!isGenerating && (
                                    <div className="flex gap-3 relative">
                                        <Button onClick={() => { setMascots([]); setUploadedImage(null); }} variant="secondary" size="lg" icon={<span className="text-xs">✕</span>} className="font-bold">
                                            CLEAR
                                        </Button>
                                        <div className="relative w-full md:w-auto">
                                            {!currentUser?.can_use_art && !currentUser?.is_admin && (
                                                <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] z-20 flex items-center justify-center rounded-lg border border-red-500/50">
                                                    <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                                </div>
                                            )}
                                            {currentUser?.can_use_art && !currentUser?.is_admin && (currentUser?.art_credits || 0) <= 0 && (
                                                <div className="absolute inset-0 bg-black/80 backdrop-blur-[2px] z-20 flex items-center justify-center rounded-lg border border-orange-500/50 opacity-0 hover:opacity-100 transition-opacity">
                                                    <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                </div>
                                            )}
                                            <Button onClick={handleGenerate} disabled={!currentUser?.can_use_art && !currentUser?.is_admin} size="lg" icon={<span className="text-xs">+</span>} className="font-bold w-full md:w-auto">
                                                GENERATE MORE
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-12">
                            {mascots.map((mascot) => (
                                <MascotCard
                                    key={mascot.id}
                                    mascot={mascot}
                                    onSelect={(m) => setSelectedMascotId(m.id)}
                                    onImageClick={(m) => setViewingMascot(m)}
                                    onGenerateScenes={handleGenerateScenes}
                                    onUpdateMascot={handleUpdateMascot}
                                    isGenerating={activeGenerations.has(mascot.id)}
                                />
                            ))}
                        </div>

                        {/* LIVE SCENE FEED */}
                        {hasMascots && (
                            <div className="mt-12 pt-12 border-t border-white/5 animate-in slide-in-from-bottom-4" ref={sceneFeedRef}>
                                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-0 mb-8">
                                    <div className="flex items-center gap-2 md:gap-4 flex-wrap">
                                        <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(168,85,247,0.5)]"></div>
                                        <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-tighter">Live Scene Feed</h2>
                                        <span className="text-xs md:text-sm font-mono text-slate-500 uppercase tracking-widest">({allScenes.length} Rendered)</span>
                                    </div>
                                    <Button onClick={handleDownloadAllScenes} disabled={isZippingAll} variant="secondary" className="w-full md:w-auto" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>}>
                                        {isZippingAll ? 'Zipping All Images...' : 'Download All Images'}
                                    </Button>
                                </div>

                                {allScenes.length > 0 && (
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                        {allScenes.map((item, idx) => {
                                            const isDex = item.scene.description.includes('PANORAMIC') || item.scene.description.includes('PADDED BANNER') || item.scene.description.includes('Dex Header');
                                            const isXComm = item.scene.description.includes('X COMM');
                                            let gridClass = 'aspect-square';
                                            if (isDex) { gridClass = 'col-span-1 md:col-span-2 aspect-[3/1]'; }
                                            else if (isXComm) { gridClass = 'col-span-1 md:col-span-2 aspect-[2.5/1]'; }
                                            const isFlash = item.scene.modelUsed?.includes('flash');

                                            return (
                                                <div key={item.scene.id} onClick={() => setViewingScene({ scene: item.scene, mascotName: item.mascot.name })} className={`group relative bg-navy-900 border border-white/5 rounded-xl overflow-hidden cursor-pointer hover:border-accent hover:shadow-lg transition-all ${gridClass}`}>
                                                    <img src={item.scene.imageUrl} className="w-full h-full object-cover" loading="lazy" />
                                                    <div className="absolute top-2 right-2 z-20 flex flex-col items-end gap-1">
                                                        <div className="bg-black/60 backdrop-blur-md border border-white/10 text-white text-[8px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide shadow-lg">
                                                            {AVAILABLE_ART_STYLES.find(s => s.id === item.mascot.styleId)?.name || (item.mascot.artStyle.length > 15 ? item.mascot.artStyle.substring(0, 12) + "..." : item.mascot.artStyle)}
                                                        </div>
                                                        {isFlash && (
                                                            <div className="bg-yellow-500 text-black text-[8px] px-1.5 py-0.5 rounded font-black uppercase tracking-wider shadow-lg backdrop-blur-sm border border-yellow-400/30">
                                                                ⚡
                                                            </div>
                                                        )}
                                                        {isDex && (<div className="bg-purple-600/90 text-white text-[8px] px-1.5 py-0.5 rounded font-black uppercase tracking-wider shadow-lg backdrop-blur-sm border border-purple-400/30">DEX BANNER</div>)}
                                                        {isXComm && (<div className="bg-blue-500/90 text-white text-[8px] px-1.5 py-0.5 rounded font-black uppercase tracking-wider shadow-lg backdrop-blur-sm border border-blue-400/30">X COMM HEADER</div>)}
                                                        {item.isMain && (<div className="bg-accent text-black text-[8px] px-1.5 py-0.5 rounded font-black uppercase tracking-wider shadow-lg backdrop-blur-sm border border-accent/30">MAIN CHARACTER</div>)}
                                                    </div>
                                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-end justify-end p-2 gap-2 opacity-0 group-hover:opacity-100">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setEditingSceneId(item.scene.id);
                                                                setEditPrompt("");
                                                            }}
                                                            className="bg-white text-black p-1.5 rounded-lg hover:bg-yellow-400 shadow-xl transition-transform hover:scale-110"
                                                            title="Edit Image"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                        </button>
                                                        <button onClick={(e) => handleDownloadScene(item.scene, item.mascot.name, e)} className="bg-white text-black p-1.5 rounded-lg hover:bg-accent shadow-xl transition-transform hover:scale-110" title="Download Image"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg></button>
                                                    </div>

                                                    {/* EDIT OVERLAY */}
                                                    {editingSceneId === item.scene.id && (
                                                        <div className="absolute inset-0 bg-navy-950/90 backdrop-blur-sm z-30 flex flex-col p-4 animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                                                            <div className="flex justify-between items-center mb-2">
                                                                <span className="text-[10px] font-black text-white uppercase tracking-widest">Edit Prompt</span>
                                                                <button onClick={() => setEditingSceneId(null)} className="text-white hover:text-red-500"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                                                            </div>
                                                            <textarea
                                                                autoFocus
                                                                value={editPrompt}
                                                                onChange={(e) => setEditPrompt(e.target.value)}
                                                                placeholder="Enter modification (e.g. Add a red hat, Change background to space)..."
                                                                className="flex-1 bg-black/50 border border-white/10 rounded-lg p-2 text-xs text-white placeholder:text-slate-600 focus:border-accent outline-none resize-none mb-3 font-mono"
                                                            />
                                                            <Button
                                                                onClick={() => handleEditScene(item.mascot.id, item.scene, item.isMain)}
                                                                disabled={isEditing || !editPrompt.trim()}
                                                                className="w-full py-2 text-xs font-black bg-accent text-black hover:bg-white"
                                                            >
                                                                {isEditing ? 'GENERATING...' : 'REFINE ASSET'}
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        <div ref={resultsEndRef} />
                    </div>
                )}
            </main>

            {/* Lightbox for Mascot */}
            {
                viewingMascot && (
                    <div className="fixed inset-0 bg-black/95 z-[60] flex items-center justify-center p-4 md:p-8 backdrop-blur-md animate-in fade-in duration-200" onClick={() => setViewingMascot(null)}>
                        <img src={viewingMascot.imageUrl} className="max-h-[90vh] max-w-full rounded-xl border-2 border-white/10 shadow-[0_0_100px_rgba(255,255,255,0.1)] object-contain" onClick={e => e.stopPropagation()} />
                        <Button variant="ghost" className="absolute top-4 right-4 md:top-6 md:right-6 text-white hover:text-red-500 scale-125 md:scale-150" onClick={() => setViewingMascot(null)}>✕</Button>
                    </div>
                )
            }

            {/* Lightbox for Scene */}
            {
                viewingScene && (
                    <div className="fixed inset-0 bg-black/95 z-[60] flex items-center justify-center p-4 md:p-8 backdrop-blur-md animate-in fade-in duration-200" onClick={() => setViewingScene(null)}>
                        <img src={viewingScene.scene.imageUrl} className="max-h-[85vh] max-w-full rounded-xl border-2 border-white/10 shadow-[0_0_100px_rgba(255,255,255,0.1)] object-contain" onClick={e => e.stopPropagation()} />
                        <div className="absolute bottom-4 md:bottom-8 left-0 w-full text-center pointer-events-none p-4"><span className="bg-black/80 text-white px-4 py-2 rounded text-[10px] md:text-sm font-mono inline-block border border-white/10 backdrop-blur-md max-w-full truncate">{viewingScene.mascotName} // {viewingScene.scene.description.substring(0, 60)}...</span></div>
                        <Button variant="ghost" className="absolute top-4 right-4 md:top-6 md:right-6 text-white hover:text-red-500 scale-125 md:scale-150" onClick={() => setViewingScene(null)}>✕</Button>
                    </div>
                )
            }

            {/* Global Credit Error Popup */}
            {showCreditError.show && (
                <div
                    className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 transition-opacity"
                    onClick={() => setShowCreditError({ show: false, required: 0 })}
                >
                    <div
                        className="bg-navy-900 border border-red-500/30 rounded-2xl p-6 max-w-xs w-full shadow-2xl animate-in fade-in zoom-in duration-200"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex flex-col items-center text-center">
                            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                                <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                            </div>
                            <h3 className="text-lg font-black text-white mb-2">Not Enough Credits</h3>
                            <p className="text-slate-400 text-xs mb-4 leading-relaxed">
                                You need <span className="text-red-400 font-bold tracking-wider">{showCreditError.required} Art Credits</span> to perform this action.
                                <br /><span className="text-slate-500 mt-1 block">Current balance: <span className="text-white font-black">{currentUser?.art_credits || 0}</span></span>
                            </p>
                            <Button
                                onClick={() => setShowCreditError({ show: false, required: 0 })}
                                className="w-full bg-slate-800 hover:bg-slate-700 text-white border-transparent py-2.5 font-bold tracking-widest text-[10px]"
                            >
                                CLOSE
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- Support Modal --- */}
            {showSupportModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={() => setShowSupportModal(false)}
                    ></div>

                    <div className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto bg-[#0B1221] border border-white/10 rounded-2xl p-8 shadow-2xl glass animate-in fade-in zoom-in-95 duration-200 custom-scrollbar">
                        {/* Internal Glow */}
                        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-accent to-transparent"></div>
                        <div className="absolute -top-10 -right-10 w-40 h-40 bg-accent/10 rounded-full blur-3xl pointer-events-none"></div>

                        <button
                            onClick={() => setShowSupportModal(false)}
                            className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors z-20"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>

                        <div className="relative z-10 text-slate-300">
                            <div className="space-y-6 text-center py-8">
                                <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-accent/20">
                                    <svg className="w-10 h-10 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                                </div>
                                <h3 className="text-3xl font-black text-white mb-2 tracking-tight">Need Help?</h3>
                                <p className="leading-relaxed text-lg text-slate-400 mb-8 max-w-sm mx-auto">Whether you're struggling with generations, account limits, or have a partnership inquiry, we're here to assist you.</p>

                                <div className="pt-4">
                                    <a href="https://t.me/fizzd3gen" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-3 px-8 py-5 w-full sm:w-auto bg-accent text-black rounded-xl font-black text-[15px] uppercase tracking-widest hover:bg-white transition-all shadow-[0_0_30px_rgba(222,253,65,0.2)] hover:shadow-[0_0_40px_rgba(222,253,65,0.5)] hover:-translate-y-1">
                                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.892-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" /></svg>
                                        Contact on Telegram
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
};

export default App;
