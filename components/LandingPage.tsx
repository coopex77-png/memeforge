import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';
import { DatabaseUser, DiscountCode } from '../types';

interface LandingPageProps {
    onLogin: (user: DatabaseUser) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLogin }) => {
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [accessCode, setAccessCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [scrapeFeed, setScrapeFeed] = useState<{ id: string; img: string }[]>([]);
    const [isSlidersHovered, setIsSlidersHovered] = useState(false);
    const [activeSliderMode, setActiveSliderMode] = useState<'trait' | 'remix'>('trait');
    const [activeModal, setActiveModal] = useState<'about' | 'terms' | 'privacy' | 'support' | 'payment' | null>(null);
    const [billingCycle, setBillingCycle] = useState<'weekly' | 'monthly'>('weekly');
    const [selectedPlan, setSelectedPlan] = useState<'Starter' | 'Pro' | 'Max' | null>(null);
    const [showQuotaFull, setShowQuotaFull] = useState(false);
    const [selectedWallet, setSelectedWallet] = useState<string>('');
    const [paymentConfirmed, setPaymentConfirmed] = useState(false);
    const [walletCopied, setWalletCopied] = useState(false);
    const [isGeneratingWallet, setIsGeneratingWallet] = useState(false);
    const [readyToConfirm, setReadyToConfirm] = useState(false);
    const [discountCodeInput, setDiscountCodeInput] = useState('');
    const [appliedDiscount, setAppliedDiscount] = useState<DiscountCode | null>(null);
    const [isApplyingDiscount, setIsApplyingDiscount] = useState(false);
    const [discountError, setDiscountError] = useState('');
    const [discountSuccess, setDiscountSuccess] = useState('');
    const [showDiscountInput, setShowDiscountInput] = useState(false);

    // Scroll-driven cinematic zoom — continuous rAF loop, delta-time lerp, GPU-only
    const showcaseRef = useRef<HTMLDivElement>(null);
    const showcaseTargetScale = useRef(0.92);
    const showcaseCurrentScale = useRef(0.92);
    const lastTimeRef = useRef(0);

    useEffect(() => {
        let rafId: number;
        let alive = true;

        // Scroll handler: ONLY computes the target value. Zero DOM work.
        const computeTarget = () => {
            if (!showcaseRef.current) return;
            const rect = showcaseRef.current.getBoundingClientRect();
            const wH = window.innerHeight;
            const elemCenter = rect.top + rect.height / 2;
            const dist = Math.abs(elemCenter - wH / 2);
            const maxDist = wH / 2 + rect.height / 2;
            const raw = Math.max(0, Math.min(1, 1 - dist / maxDist));
            // Smoothstep
            const t = raw * raw * (3 - 2 * raw);
            // Scale range: 0.92 → 1.02
            showcaseTargetScale.current = 0.92 + t * 0.10;
        };

        // Continuous animation loop — runs EVERY frame, always
        const tick = (now: number) => {
            if (!alive) return;

            const dt = lastTimeRef.current ? (now - lastTimeRef.current) / 1000 : 0.016;
            lastTimeRef.current = now;

            // Exponential decay lerp: speed = 4 means ~98% settled in 1 second
            // Formula: current += (target - current) * (1 - e^(-speed * dt))
            const speed = 4;
            const factor = 1 - Math.exp(-speed * dt);
            const prev = showcaseCurrentScale.current;
            const target = showcaseTargetScale.current;
            const next = prev + (target - prev) * factor;
            showcaseCurrentScale.current = next;

            // Only touch the DOM if the value actually changed
            if (showcaseRef.current && Math.abs(next - prev) > 0.00001) {
                showcaseRef.current.style.transform = `scale3d(${next},${next},1)`;
            }

            rafId = requestAnimationFrame(tick);
        };

        const onScroll = () => computeTarget();

        window.addEventListener('scroll', onScroll, { passive: true });
        computeTarget(); // initial
        rafId = requestAnimationFrame(tick);

        return () => {
            alive = false;
            cancelAnimationFrame(rafId);
            window.removeEventListener('scroll', onScroll);
        };
    }, []);

    // Custom Anchor Component for Precise Smooth Scroll
    const A = ({ href, children, className, onClick }: { href: string, children: React.ReactNode, className: string, onClick?: () => void }) => {
        const handleClick = (e: React.MouseEvent) => {
            if (onClick) onClick();
            e.preventDefault();
            const id = href.replace('#', '');
            const element = document.getElementById(id);
            if (element) {
                const navHeight = scrolled ? 80 : 100;
                const offset = navHeight + 20; // EXTRA PADDING for perfect centering or top alignment
                const elementPosition = element.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - offset;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
                window.history.pushState(null, '', href);
            }
        };

        return (
            <a href={href} onClick={handleClick} className={className}>
                {children}
            </a>
        );
    };

    const applyDiscountCode = async () => {
        setDiscountError('');
        setDiscountSuccess('');
        if (!discountCodeInput.trim()) return;

        setIsApplyingDiscount(true);
        try {
            const { data, error } = await supabase
                .from('discount_codes')
                .select('*')
                .ilike('code', discountCodeInput.trim())
                .eq('is_active', true)
                .single();

            if (error || !data) {
                setDiscountError('Invalid or inactive code.');
                setAppliedDiscount(null);
            } else {
                const discountData = data as DiscountCode;
                if (discountData.expires_at && new Date(discountData.expires_at) < new Date()) {
                    setDiscountError('This discount code has expired.');
                    setAppliedDiscount(null);
                } else {
                    setAppliedDiscount(discountData);
                    setDiscountSuccess(`Applied ${discountData.percentage}% off`);
                }
            }
        } catch (err) {
            setDiscountError('Error applying code.');
        } finally {
            setIsApplyingDiscount(false);
        }
    };

    const resetDiscount = () => {
        setDiscountCodeInput('');
        setAppliedDiscount(null);
        setDiscountError('');
        setDiscountSuccess('');
    };
    useEffect(() => {
        if (activeModal === 'payment') {
            resetDiscount();
            const timer = setTimeout(() => setIsGeneratingWallet(false), 1500);
            return () => clearTimeout(timer);
        }
    }, [activeModal]);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Scrape Feed iPhone Notification Effect Logic
    useEffect(() => {
        const images = [
            'Ekran Resmi 2026-02-25 18.19.01.png',
            'Ekran Resmi 2026-02-25 18.19.11.png',
            'Ekran Resmi 2026-02-25 18.19.19.png',
            'Ekran Resmi 2026-02-25 18.20.39.png',
            'Ekran Resmi 2026-02-25 18.22.36.png',
            'Ekran Resmi 2026-02-25 18.23.04.png',
            'Ekran Resmi 2026-02-25 20.27.16.png',
            'Ekran Resmi 2026-02-25 20.27.57.png'
        ];

        setScrapeFeed([
            { id: Date.now().toString() + '1', img: images[2] },
            { id: Date.now().toString() + '2', img: images[1] },
            { id: Date.now().toString() + '3', img: images[0] }
        ]);

        let index = 3;
        const interval = setInterval(() => {
            const nextImg = images[index % images.length];
            setScrapeFeed(prev => {
                const newFeed = [{ id: Date.now().toString() + Math.random(), img: nextImg }, ...prev];
                return newFeed.slice(0, 5); // Keep 5 items max
            });
            index++;
        }, 3500); // Drop new notification every 3.5 seconds

        return () => clearInterval(interval);
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const codeToUse = accessCode.trim();

        if (!codeToUse) {
            setError('Please enter an access code.');
            return;
        }

        setLoading(true);
        try {
            const { data: user, error: fetchError } = await supabase
                .from('users')
                .select('*')
                .ilike('access_code', codeToUse)
                .single();

            if (fetchError || !user) {
                setError('Invalid Access Code.');
                setLoading(false);
                return;
            }

            if (!user.is_active) {
                setError('Your account has been suspended or is inactive.');
                setLoading(false);
                return;
            }

            let updatedUser = { ...user };
            const updates: Partial<DatabaseUser> = { last_login: new Date().toISOString() };

            if (user.subscription_days && !user.subscription_start) {
                const now = new Date().toISOString();
                updates.subscription_start = now;
                updatedUser.subscription_start = now;
            }

            await supabase
                .from('users')
                .update(updates)
                .eq('access_code', user.access_code);

            onLogin(updatedUser as DatabaseUser);
        } catch (err) {
            setError('An error occurred during login.');
        } finally {
            setLoading(false);
        }
    };

    const paymentBaseAmount = selectedPlan === 'Starter' ? 1 : selectedPlan === 'Pro' ? (billingCycle === 'monthly' ? 8 : 3) : (billingCycle === 'monthly' ? 30 : 10);
    const paymentFinalAmount = appliedDiscount
        ? Number((paymentBaseAmount - (paymentBaseAmount * (appliedDiscount.percentage / 100))).toFixed(2))
        : paymentBaseAmount;

    return (
        <div className="min-h-screen bg-[#02040A] text-slate-200 font-sans selection:bg-accent/30 selection:text-white relative overflow-x-hidden">
            {/* --- Animated Background --- */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-accent/10 rounded-full blur-[120px] animate-float" style={{ animationDelay: '0s' }}></div>
                <div className="absolute top-[40%] right-[-10%] w-[30%] h-[30%] bg-cyan-500/10 rounded-full blur-[100px] animate-float" style={{ animationDelay: '2s' }}></div>
                <div className="absolute bottom-[-20%] left-[20%] w-[50%] h-[50%] bg-purple-500/10 rounded-full blur-[150px] animate-float" style={{ animationDelay: '4s' }}></div>
                <div className="absolute inset-0 bg-grid-white opacity-20 mask-image: linear-gradient(to bottom, black 40%, transparent 100%)"></div>
            </div>

            {/* --- Premium Navbar --- */}
            <nav className={`fixed top-0 w-full z-40 transition-all duration-300 ${scrolled ? 'bg-navy-950/80 backdrop-blur-md py-4 shadow-2xl' : 'bg-transparent py-6'}`}>
                <div className="max-w-[1400px] mx-auto px-6 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <div className="flex-shrink-0 flex items-center gap-3 relative cursor-pointer hover:scale-105 transition-transform duration-300" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                            <img
                                src="/pepe_forge.png"
                                alt="Forge Logo"
                                className="h-[65px] w-auto object-contain drop-shadow-xl"
                                onError={(e) => {
                                    e.currentTarget.onerror = null;
                                    e.currentTarget.src = "https://placehold.co/200x65/transparent/DEFD41?text=FORGE";
                                }}
                            />
                            <span className="bg-accent text-black text-[9px] font-black px-2 py-0.5 rounded-full tracking-widest uppercase shadow-[0_0_15px_rgba(222,253,65,0.4)] absolute -right-12 top-2">
                                Beta
                            </span>
                        </div>
                    </div>

                    <div className="hidden md:flex items-center gap-10">
                        <A href="#features" className="relative group text-sm font-bold text-slate-300 hover:text-white uppercase tracking-widest transition-all duration-300 py-2 hover:-translate-y-1">
                            Features
                            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-[2px] bg-accent transition-all duration-300 ease-out group-hover:w-full group-hover:shadow-[0_0_12px_rgba(222,253,65,0.9)] rounded-full"></span>
                        </A>
                        <A href="#pricing" className="relative group text-sm font-bold text-slate-300 hover:text-white uppercase tracking-widest transition-all duration-300 py-2 hover:-translate-y-1">
                            Pricing
                            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-[2px] bg-accent transition-all duration-300 ease-out group-hover:w-full group-hover:shadow-[0_0_12px_rgba(222,253,65,0.9)] rounded-full"></span>
                        </A>
                        <A href="#contact" className="relative group text-sm font-bold text-slate-300 hover:text-white uppercase tracking-widest transition-all duration-300 py-2 hover:-translate-y-1">
                            Contact
                            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-[2px] bg-accent transition-all duration-300 ease-out group-hover:w-full group-hover:shadow-[0_0_12px_rgba(222,253,65,0.9)] rounded-full"></span>
                        </A>
                    </div>

                    <div className="hidden md:flex items-center gap-6">
                        <button
                            onClick={() => setActiveModal('support')}
                            className="text-slate-400 hover:text-white text-[11px] uppercase font-bold tracking-widest transition-colors flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                            Support
                        </button>
                        <button
                            onClick={() => setShowLoginModal(true)}
                            className="flex items-center gap-2 px-6 py-2.5 bg-accent/10 hover:bg-accent/20 border border-accent/20 hover:border-accent text-accent rounded-full font-black uppercase tracking-widest transition-all hover:scale-105"
                            style={{ boxShadow: '0 0 15px rgba(222, 253, 65, 0.1)' }}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                            Login
                        </button>
                    </div>

                    {/* Mobile Menu Toggle */}
                    <div className="md:hidden flex items-center">
                        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-white p-2 focus:outline-none">
                            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                {mobileMenuOpen ? (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                ) : (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                )}
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Mobile Menu Panel */}
                {mobileMenuOpen && (
                    <div className="md:hidden absolute top-full left-0 w-full bg-navy-950/95 backdrop-blur-xl border-b border-white/10 shadow-2xl py-6 px-6 flex flex-col gap-6 animate-in slide-in-from-top-4 duration-300">
                        <A href="#features" onClick={() => setMobileMenuOpen(false)} className="text-lg font-bold text-slate-200 uppercase tracking-widest w-full text-center">Features</A>
                        <A href="#pricing" onClick={() => setMobileMenuOpen(false)} className="text-lg font-bold text-slate-200 uppercase tracking-widest w-full text-center">Pricing</A>
                        <A href="#contact" onClick={() => setMobileMenuOpen(false)} className="text-lg font-bold text-slate-200 uppercase tracking-widest w-full text-center">Contact</A>
                        <hr className="border-white/10 w-full" />
                        <button onClick={() => { setActiveModal('support'); setMobileMenuOpen(false); }} className="text-slate-400 text-sm uppercase font-bold tracking-widest flex items-center justify-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                            Support
                        </button>
                        <button onClick={() => { setShowLoginModal(true); setMobileMenuOpen(false); }} className="w-full flex justify-center items-center gap-2 px-6 py-3 bg-accent text-navy-950 rounded-full font-black uppercase tracking-widest">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                            Login
                        </button>
                    </div>
                )}
            </nav>

            {/* --- Main Content --- */}
            <main className="relative z-10 pt-32 pb-20">

                {/* Section 1: Hero */}
                <section className="min-h-[65vh] flex flex-col items-center justify-start pt-6 md:pt-24 px-6 text-center animate-fade-in-up relative">

                    <div className="relative z-30">
                        <div className="absolute inset-0 bg-accent/20 blur-[100px] h-[300px] w-[300px] mx-auto rounded-full -z-10 animate-pulse"></div>
                        <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-slate-200 to-slate-500 mb-6 tracking-tight leading-tight max-w-4xl mx-auto">
                            The all-in-one <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-[#a3f000]">dev tool</span>
                        </h1>
                    </div>

                    <p className="text-lg md:text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed relative z-30">
                        Create mascots, arts, banners, and more with dynamic scene creation for your token. Scrape the whole web for viral ideas with one click — all centralized in one powerful platform.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 relative z-30">
                        <A
                            href="#pricing"
                            className="w-full sm:w-auto px-8 py-3 bg-accent hover:bg-accent/90 text-navy-950 rounded-full font-medium text-lg shadow-[0_0_30px_rgba(222,253,65,0.4)] transition-transform hover:-translate-y-1 flex items-center justify-center gap-2 no-underline"
                        >
                            Get Started
                        </A>

                        <div className="flex items-center gap-4 mt-4 sm:mt-0">
                            <a href="https://x.com/memeforgeapp" target="_blank" rel="noopener noreferrer" className="w-12 h-12 border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/30 rounded-full flex items-center justify-center text-white transition-all hover:-translate-y-1 backdrop-blur-md">
                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                            </a>
                            <a href="https://t.me/memeforgeapp" target="_blank" rel="noopener noreferrer" className="w-12 h-12 border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/30 rounded-full flex items-center justify-center text-white transition-all hover:-translate-y-1 backdrop-blur-md">
                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.892-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" /></svg>
                            </a>
                        </div>
                    </div>

                    {/* Features Badges */}
                    <div className="flex flex-wrap items-center justify-center gap-2 md:gap-8 mt-10 md:mt-16 relative z-30">
                        {[
                            { name: 'Art Contents' },
                            { name: 'Dex Banner' },
                            { name: '+10 Art Styles' },
                            { name: 'Viral Narrative Scraper', hasIcons: true }
                        ].map((feature, idx) => (
                            <div key={idx} className="flex items-center gap-1.5 md:gap-2 text-slate-300 font-medium text-xs md:text-base bg-white/5 border border-white/10 px-3 md:px-4 py-1.5 rounded-full backdrop-blur-md">
                                <div className="w-3 h-3 md:w-4 md:h-4 rounded-full bg-accent/20 flex items-center justify-center text-accent">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                </div>
                                <span className="flex items-center gap-2">
                                    {feature.name}
                                    {feature.hasIcons && (
                                        <div className="flex items-center gap-1.5 ml-1 border-l border-white/20 pl-2">
                                            {/* X Logo */}
                                            <svg className="w-3.5 h-3.5 text-slate-400" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                                            {/* TikTok Logo */}
                                            <svg className="w-3.5 h-3.5 text-slate-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" /></svg>
                                            {/* Globe Logo */}
                                            <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        </div>
                                    )}
                                </span>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Section 2: App Screen Showcase */}
                <section id="features" className="scroll-mt-32 pt-4 pb-24 md:-mt-12 overflow-visible relative z-20">
                    <div className="px-6 max-w-[1400px] mx-auto relative z-10">
                        <div
                            ref={showcaseRef}
                            className="relative max-w-[1400px] mx-auto mb-20 group"
                            style={{
                                transform: 'scale3d(0.92,0.92,1)',
                                willChange: 'transform',
                            }}
                        >
                            {/* Inner App Window Screenshot (macOS Style) */}
                            <div
                                className="relative bg-[#02040A] rounded-xl flex flex-col overflow-hidden border border-white/5 z-10 w-full animate-fade-in-up shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),_0_20px_60px_rgba(0,0,0,0.8)]"
                            >

                                {/* macOS Style Title Bar */}
                                <div className="bg-navy-950/80 border-b border-white/10 px-4 py-3 flex items-center justify-start gap-2 w-full z-20 backdrop-blur-md">
                                    <div className="w-3 h-3 rounded-full bg-[#FF5F56] border border-[#E0443E]"></div>
                                    <div className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-[#DEA123]"></div>
                                    <div className="w-3 h-3 rounded-full bg-[#27C93F] border border-[#1AAB29]"></div>
                                </div>

                                {/* Content Area */}
                                <div className="relative w-full">
                                    {/* Subtle reflection on the screen */}
                                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.03] to-white/[0.1] pointer-events-none"></div>
                                    <img src="/app_screenshot_v3.png" alt="MemeForge Art Engine Interface" className="w-full h-auto object-cover relative z-10" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Full Width Sliders */}
                    <div className="w-full px-6">
                        {/* Section Header */}
                        <div className="text-center mb-16 mt-32 md:mt-48 relative z-10">
                            <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight uppercase mb-4">
                                Art <span className="text-accent">Generation</span>
                            </h2>
                            <p className="text-slate-400 text-lg max-w-2xl mx-auto leading-relaxed font-light mb-8">
                                Create your mascot and get bunch of arts in seconds
                            </p>
                        </div>

                        {/* New Video Mode Slider Row */}
                        <div className="relative flex items-center justify-center w-full h-[320px] md:h-[512px] my-4 overflow-hidden md:overflow-visible">
                            {/* Background Slider Container */}
                            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 w-full h-64 z-0">
                                <div
                                    className="slider-container w-full h-full"
                                >
                                    <div className="slider-track gap-6 h-full absolute flex" style={{ animationPlayState: 'running' }}>
                                        {/* Duplicated for infinite scroll illusion */}
                                        {[...Array(2)].flatMap(() => [
                                            'photo_2026-02-25 21.14.59.jpeg', 'photo_2026-02-25 21.15.00.jpeg', 'photo_2026-02-25 21.15.01.jpeg',
                                            'photo_2026-02-25 21.15.02.jpeg', 'photo_2026-02-25 21.15.03.jpeg', 'photo_2026-02-25 21.15.05.jpeg',
                                            'photo_2026-02-25 21.15.09.jpeg', 'photo_2026-02-25 21.15.10.jpeg', 'photo_2026-02-25 21.15.12.jpeg',
                                            'photo_2026-02-25 21.15.13.jpeg', 'photo_2026-02-25 21.15.15.jpeg', 'photo_2026-02-25 21.15.22.jpeg',
                                            'photo_2026-02-25 21.15.25.jpeg', 'photo_2026-02-25 21.15.28.jpeg', 'photo_2026-02-25 21.15.40.jpeg'
                                        ]).map((item, idx) => (
                                            <div key={idx} className="w-40 h-40 md:w-64 md:h-64 bg-navy-950 border border-white/5 rounded-2xl flex-shrink-0 flex items-center justify-center hover:scale-105 hover:border-accent/50 transition-all cursor-pointer shadow-lg overflow-hidden group">
                                                <img src={`/yenii/${item}`} alt={`Video Scene ${idx}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Main Video Showcase (Centered, Double Size) */}
                            <div
                                className="relative z-10 flex flex-col items-center justify-center"
                            >
                                {/* Blur Effect Behind Video for Smooth Transition */}
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[160%] h-[400px] bg-[#02040A] blur-[60px] rounded-[100%] z-0 pointer-events-none opacity-90"></div>

                                {/* Subtle Ambient Glow */}
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[110%] h-[110%] bg-accent/5 blur-[80px] rounded-[100%] z-0 pointer-events-none"></div>

                                <div className="flex-shrink-0 h-[300px] md:h-[512px] bg-[#02040A] rounded-2xl relative flex items-center justify-center overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8),_0_0_0_1px_rgba(255,255,255,0.05)_inset] border border-white/10 group transform transition duration-500 hover:scale-[1.02] z-10 w-[95%] sm:w-auto">
                                    <video
                                        src="/yenii/adsiz.mp4"
                                        className="h-full w-auto object-contain z-0 transition-transform duration-700 group-hover:scale-105"
                                        autoPlay
                                        loop
                                        muted
                                        playsInline
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Spacer between sliders */}
                        <div className="h-12 border-b border-white/5 my-12 hidden md:block w-full"></div>
                        <div className="h-12 md:hidden"></div>

                        {/* Mode Toggle Button */}
                        <div className="flex justify-center mb-8 relative z-20">
                            <div className="bg-navy-950/80 p-1.5 rounded-full border border-white/10 flex items-center gap-2 backdrop-blur-md">
                                <button
                                    onClick={() => setActiveSliderMode('trait')}
                                    className={`px-6 py-2.5 rounded-full text-sm font-bold uppercase tracking-widest transition-all duration-300 ${activeSliderMode === 'trait' ? 'bg-accent text-black shadow-[0_0_20px_rgba(222,253,65,0.4)]' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                                >
                                    Trait Mixer
                                </button>
                                <button
                                    onClick={() => setActiveSliderMode('remix')}
                                    className={`px-6 py-2.5 rounded-full text-sm font-bold uppercase tracking-widest transition-all duration-300 ${activeSliderMode === 'remix' ? 'bg-accent text-black shadow-[0_0_20px_rgba(222,253,65,0.4)]' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                                >
                                    Remix Image
                                </button>
                            </div>
                        </div>

                        {/* Combined Slider Row */}
                        <div className="relative flex items-center justify-center w-full h-[220px] md:h-[280px] my-4 overflow-hidden md:overflow-visible">
                            {/* Background Slider Container */}
                            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 w-full h-44 md:h-56 z-0">
                                <div
                                    className="slider-container w-full h-full"
                                    onMouseEnter={() => setIsSlidersHovered(true)}
                                    onMouseLeave={() => setIsSlidersHovered(false)}
                                >
                                    {activeSliderMode === 'trait' ? (
                                        <div className="slider-track gap-6 h-full absolute flex animate-in fade-in duration-500" style={{ animationDirection: 'reverse', animationPlayState: isSlidersHovered ? 'paused' : 'running' }}>
                                            {/* Duplicated for infinite scroll illusion */}
                                            {[...Array(2)].flatMap(() => ['11.jpeg', '12.jpeg', '13.jpeg', '14.jpeg', '15.jpeg', '16.jpeg', '17.jpeg', '18.jpeg', '19.jpeg', '20.jpeg', '21.jpeg', '22.jpeg', '23.jpeg', '24.jpeg', '26.jpeg', '27.jpeg', '28.jpeg', '29.jpeg']).map((item, idx) => (
                                                <div key={idx} className="w-36 h-36 md:w-48 md:h-48 bg-navy-950 border border-white/5 rounded-2xl flex-shrink-0 flex items-center justify-center hover:scale-105 hover:border-accent/50 transition-all cursor-pointer shadow-lg overflow-hidden group">
                                                    <img src={`/slider_images/${item}`} alt={`Generated Scene ${idx}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="slider-track gap-6 h-full absolute flex animate-in fade-in duration-500" style={{ animationDirection: 'reverse', animationPlayState: isSlidersHovered ? 'paused' : 'running' }}>
                                            {/* Duplicated for infinite scroll illusion */}
                                            {[...Array(2)].flatMap(() => ['photo_2026-02-25 16.36.28.jpeg', 'photo_2026-02-25 16.36.29.jpeg', 'photo_2026-02-25 16.36.46.jpeg', 'photo_2026-02-25 16.36.51.jpeg', 'photo_2026-02-25 16.36.55.jpeg', 'photo_2026-02-25 16.36.56.jpeg', 'photo_2026-02-25 16.37.00.jpeg', 'photo_2026-02-25 16.37.01.jpeg', 'photo_2026-02-25 16.37.02.jpeg', 'photo_2026-02-25 16.37.03.jpeg', 'photo_2026-02-25 16.37.04.jpeg', 'photo_2026-02-25 16.37.05.jpeg', 'photo_2026-02-25 16.37.10.jpeg', 'photo_2026-02-25 16.37.15.jpeg', 'photo_2026-02-25 16.37.16.jpeg', 'photo_2026-02-25 16.37.18.jpeg', 'photo_2026-02-25 16.37.19.jpeg', 'photo_2026-02-25 16.37.24.jpeg']).map((item, idx) => (
                                                <div key={idx} className="w-36 h-36 md:w-48 md:h-48 bg-navy-950 border border-white/5 rounded-2xl flex-shrink-0 flex items-center justify-center hover:scale-105 hover:border-accent/50 transition-all cursor-pointer shadow-lg overflow-hidden group">
                                                    <img src={`/remix_images/${item}`} alt={`Remix Scene ${idx}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Main Mascot Showcase */}
                            <div className="relative z-10 flex flex-col items-center justify-center"
                                onMouseEnter={() => setIsSlidersHovered(true)}
                                onMouseLeave={() => setIsSlidersHovered(false)}
                            >
                                {/* Blur Effect Behind Image for Smooth Transition */}
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[160%] h-[200px] md:h-[256px] bg-[#02040A] blur-[60px] rounded-[100%] z-0 pointer-events-none opacity-90 transition-all duration-500"></div>

                                <div className="flex-shrink-0 w-48 h-48 md:w-64 md:h-64 bg-navy-950/80 border-[3px] border-accent/70 p-2.5 shadow-[0_0_40px_rgba(222,253,65,0.25)] rounded-3xl relative flex items-center justify-center group transform transition duration-500 hover:scale-[1.02] z-10 animate-in zoom-in-95">
                                    <div className="absolute inset-x-0 top-4 z-10 flex justify-center pointer-events-none">
                                        <div className="bg-black/60 px-4 py-1.5 rounded-full border border-white/20 flex items-center backdrop-blur-md shadow-lg h-fit transition-all duration-300">
                                            <span className="text-xs font-bold text-accent uppercase tracking-widest drop-shadow-[0_0_8px_rgba(222,253,65,0.5)]">
                                                Main Mascot
                                            </span>
                                        </div>
                                    </div>
                                    {activeSliderMode === 'trait' ? (
                                        <img src="/slider_images/main.jpeg" key="trait-main" alt="Main Mascot" className="w-full h-full object-cover rounded-2xl z-0 transition-transform duration-700 group-hover:scale-105 animate-in fade-in" />
                                    ) : (
                                        <img src="/remix_images/main.jpeg" key="remix-main" alt="Remix Main Mascot" className="w-full h-full object-cover rounded-2xl z-0 transition-transform duration-700 group-hover:scale-105 animate-in fade-in" />
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Section 3: Scrape Mode Features */}
                <section className="py-24 px-6 max-w-[1400px] mx-auto relative">
                    <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none"></div>

                    <div className="text-center mb-16 relative z-10">
                        <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight uppercase mb-4">
                            Viral Narrative <span className="text-cyan-400">Scraper</span>
                        </h2>
                        <p className="text-slate-400 text-lg max-w-2xl mx-auto leading-relaxed font-light mb-8">
                            Scrape real-time viral news, tweets, videos, and data from multiple deep-web and social channels. Find the next big meta before it explodes.
                        </p>

                        {/* Platform Logos */}
                        <div className="flex items-center justify-center gap-6 md:gap-10 flex-wrap">
                            {/* X (Twitter) */}
                            <div className="text-slate-500 hover:text-slate-200 transition-colors duration-300">
                                <svg className="w-6 h-6 md:w-8 md:h-8" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                </svg>
                            </div>

                            {/* TikTok */}
                            <div className="text-slate-500 hover:text-rose-500 transition-colors duration-300">
                                <svg className="w-6 h-6 md:w-8 md:h-8" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
                                </svg>
                            </div>

                            {/* Reddit */}
                            <div className="text-slate-500 hover:text-orange-500 transition-colors duration-300">
                                <svg className="w-6 h-6 md:w-8 md:h-8" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
                                </svg>
                            </div>

                            {/* Globe (News) */}
                            <div className="text-slate-500 hover:text-cyan-400 transition-colors duration-300">
                                <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>

                            {/* 4chan (Clover) */}
                            <div className="text-slate-500 hover:text-[#00FF00] transition-colors duration-300">
                                <svg className="w-6 h-6 md:w-8 md:h-8" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M11.07 8.82S9.803 1.079 5.145 1.097C2.006 1.109.78 4.124 3.055 4.802c0 0-2.698.973-2.698 2.697 0 1.725 4.274 3.54 10.713 1.32zm1.931 5.924s.904 7.791 5.558 7.991c3.136.135 4.503-2.82 2.262-3.604 0 0 2.74-.845 2.82-2.567.08-1.723-4.105-3.737-10.64-1.82zm-3.672-1.55s-7.532 2.19-6.952 6.813c.39 3.114 3.53 3.969 3.93 1.63 0 0 1.29 2.559 3.002 2.351 1.712-.208 3-4.67.02-10.794zm5.623-2.467s7.727-1.35 7.66-6.008c-.046-3.138-3.074-4.333-3.728-2.051 0 0-1-2.686-2.726-2.668-1.724.018-3.494 4.312-1.206 10.727z" />
                                </svg>
                            </div>

                            {/* KnowYourMeme (Text Logo) */}
                            <div className="text-slate-500 hover:text-slate-200 transition-colors duration-300 flex items-center justify-center pt-1 md:pt-1.5">
                                <span className="font-bold text-xl md:text-2xl tracking-tighter leading-none" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>KYM</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col lg:flex-row gap-12 lg:gap-16 items-center">
                        {/* Left: UI Screenshot */}
                        <div className="w-full lg:w-[55%] relative group perspective-1000">
                            <div className="absolute -inset-4 bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-purple-500/20 rounded-[2.5rem] blur-3xl opacity-50 group-hover:opacity-70 transition-opacity duration-700 pointer-events-none"></div>

                            <div className="relative bg-navy-950/40 border border-white/20 rounded-3xl p-4 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8),_0_0_0_1px_rgba(255,255,255,0.05)_inset,_0_8px_32px_rgba(255,255,255,0.05)_inset] backdrop-blur-2xl overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/10 before:to-transparent before:opacity-50 before:pointer-events-none floating-card">
                                <div className="relative bg-[#02040A] rounded-2xl flex items-center justify-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),_0_20px_40px_rgba(0,0,0,0.6),_0_0_80px_rgba(0,0,0,0.4)] overflow-hidden border border-white/10 group-hover:border-white/20 transition-all duration-500 z-10 w-full">
                                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.03] to-white/[0.1] pointer-events-none"></div>
                                    <img src="/research_module_screenshot.png" alt="Research Module Interface" className="w-full h-auto object-contain relative z-10" />
                                </div>
                            </div>
                        </div>

                        {/* Right: iPhone-style Notification Image Feed */}
                        <div className="w-full lg:w-[45%] flex flex-col justify-center items-center h-[450px] lg:h-[700px] relative pointer-events-none py-8 lg:py-0">
                            <div className="w-full max-w-[340px] md:max-w-[420px] relative h-full flex flex-col items-center">
                                {/* The iPhone stack effect uses map below, we just prepare the container */}
                                {scrapeFeed.map((item, index) => (
                                    <div
                                        key={item.id}
                                        className="absolute w-full rounded-2xl md:rounded-3xl overflow-hidden shadow-[0_20px_40px_-10px_rgba(0,0,0,0.7)] transition-all duration-[800ms] ease-[cubic-bezier(0.175,0.885,0.32,1.1)] pointer-events-auto border border-white/10 glass"
                                        style={{
                                            transform: `translateY(${index * 140}px) scale(${1 - index * 0.05})`,
                                            opacity: index >= 4 ? 0 : 1 - index * 0.15,
                                            zIndex: 20 - index,
                                            filter: `blur(${index * 1.5}px)`
                                        }}
                                    >
                                        <div className="bg-navy-950/80 p-2.5 flex items-center justify-between border-b border-white/5 opacity-80 backdrop-blur-md">
                                            <div className="flex items-center gap-2 pl-2">
                                                <div className="w-4 h-4 rounded bg-cyan-500/20 flex items-center justify-center">
                                                    <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></div>
                                                </div>
                                                <span className="text-[11px] font-bold text-slate-300 tracking-widest uppercase">VIRAL ALERT</span>
                                            </div>
                                            <span className="text-[11px] text-slate-500 pr-2">Just now</span>
                                        </div>
                                        <img src={`/scrape_images/${item.img}`} alt="Scrape Result" className="w-full h-auto object-cover max-h-[220px]" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* Section 4: Pricing */}
                <section className="py-32 px-6 max-w-[1400px] mx-auto relative overflow-hidden">
                    {/* Background Glows */}
                    <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[500px] h-[500px] bg-accent/5 blur-[200px] rounded-full pointer-events-none hidden md:block"></div>
                    <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-[400px] h-[400px] bg-purple-500/5 blur-[200px] rounded-full pointer-events-none hidden md:block"></div>

                    <div id="pricing" className="scroll-mt-32 text-center mb-16 relative z-10">
                        <h2 className="text-4xl md:text-6xl font-black text-white tracking-tight mb-4">Choose Your Plan</h2>
                        <p className="text-slate-400 text-lg max-w-xl mx-auto leading-relaxed mb-10">From solo builders to full-blown degen operations. Pick the plan that matches your grind.</p>

                        {/* Weekly / Monthly Toggle */}
                        <div className="inline-flex items-center p-1 bg-white/5 border border-white/10 rounded-full mx-auto relative backdrop-blur-md">
                            <button
                                onClick={() => setBillingCycle('weekly')}
                                className={`relative z-10 px-8 py-3 rounded-full text-sm font-bold uppercase tracking-widest transition-all ${billingCycle === 'weekly' ? 'text-black' : 'text-slate-400 hover:text-white'}`}
                            >
                                Weekly
                            </button>
                            <button
                                onClick={() => setBillingCycle('monthly')}
                                className={`relative z-10 px-8 py-3 rounded-full text-sm font-bold uppercase tracking-widest transition-all ${billingCycle === 'monthly' ? 'text-black' : 'text-slate-400 hover:text-white'}`}
                            >
                                Monthly
                            </button>
                            {/* Toggle Slider Background */}
                            <div
                                className="absolute top-1 bottom-1 w-[50%] bg-accent rounded-full transition-transform duration-300 ease-out shadow-[0_0_15px_rgba(222,253,65,0.4)]"
                                style={{ transform: billingCycle === 'weekly' ? 'translateX(0)' : 'translateX(calc(100% - 8px))', width: 'calc(50% + 4px)' }}
                            ></div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-[1200px] mx-auto relative z-10 items-stretch">

                        {/* --- STARTER PLAN --- */}
                        <div className={`group relative bg-[#0B1221] border border-white/10 rounded-2xl p-6 md:p-8 flex flex-col justify-between transition-all duration-500 overflow-hidden ${billingCycle === 'monthly' ? 'border-white/5 opacity-80' : 'hover:border-slate-400/40'}`}>

                            {/* Subtle grid pattern */}
                            <div className="absolute inset-0 bg-[radial-gradient(#ffffff03_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none"></div>

                            <div className={`relative z-10 transition-all duration-500`}>
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h3 className="text-xl font-black text-slate-300 uppercase tracking-widest mb-1">Starter</h3>
                                        <p className="text-[10px] text-slate-600 uppercase font-bold tracking-widest">Try MemeForge</p>
                                    </div>
                                    <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                                        <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                    </div>
                                </div>

                                <div className="mb-8 pb-8 border-b border-white/5">
                                    <div className="flex items-end gap-1">
                                        <span className="text-5xl font-black text-white flex items-center">
                                            1
                                            <img src="/solana-sol-logo.png" alt="Solana Logo" className="w-8 h-8 ml-3" />
                                        </span>
                                        <span className="text-slate-500 font-medium mb-1.5 ml-1">/week</span>
                                    </div>
                                </div>

                                {/* Credits */}
                                <div className="grid grid-cols-1 gap-3 mb-8">
                                    <div className="bg-black/40 border border-white/5 rounded-xl p-3 text-center">
                                        <div className="text-2xl font-black text-white">30</div>
                                        <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Art Credits</div>
                                    </div>
                                </div>

                                {/* Features */}
                                <ul className="space-y-4 mb-8">
                                    <li className="flex items-center gap-3 text-slate-300 text-sm">
                                        <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                        All Art Styles
                                    </li>
                                    <li className="flex items-center gap-3 text-slate-300 text-sm">
                                        <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                        All Formats (DEX, X Banner)
                                    </li>
                                    <li className="flex items-center gap-3 text-slate-300 text-sm">
                                        <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                        All Image Gen Modes
                                    </li>
                                    <li className="flex items-center gap-3 text-slate-300 text-sm">
                                        <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                        Optional credit top ups
                                    </li>
                                    <li className="flex items-center gap-3 text-slate-500 text-sm line-through">
                                        <svg className="w-4 h-4 text-slate-700 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                        Full Scraper + God Mode
                                    </li>
                                </ul>
                            </div>

                            <button onClick={() => {
                                setIsGeneratingWallet(true);
                                setReadyToConfirm(false);
                                setSelectedPlan('Starter');
                                const wallets = ['8iy54it4XzpDWxGnRKkvegNBQK3PYcsNoVBGQpr4ZkXg', 'EkuEs7vuxmQ7kypyv6mU53TKL7sSAJsRmQCam1mhmYi8', 'GDACcTncHQQrkr3RjoQzewiQdMyEzBmWAuvoJUy5qyfj', 'Ee43Zwf271hAXzW9JZRk57bu2HzkSVhpmmZ2xZyHs9yd', 'EcccU3bxUZdVrj6RMobgzEzCUKBm5SJsLaVxKMXkyiKq'];
                                setSelectedWallet(wallets[Math.floor(Math.random() * wallets.length)]);
                                setPaymentConfirmed(false);
                                setActiveModal('payment');
                            }} disabled={billingCycle === 'monthly'} className={`w-full py-4 rounded-xl border text-sm font-black tracking-widest uppercase transition-all flex items-center justify-center gap-2 ${billingCycle === 'monthly' ? 'border-white/5 bg-white/5 text-slate-400 cursor-not-allowed opacity-80' : 'border-white/10 text-slate-300 hover:bg-white/5 hover:border-white/30'}`}>
                                {billingCycle === 'monthly' ? (
                                    <>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        Weekly Only
                                    </>
                                ) : 'Get Started'}
                            </button>
                        </div>

                        {/* --- PRO PLAN (RECOMMENDED) --- */}
                        <div className="group relative bg-[#070b14] border-2 border-accent/50 rounded-2xl p-6 md:p-8 flex flex-col justify-between shadow-[0_0_60px_rgba(222,253,65,0.08)] hover:shadow-[0_0_80px_rgba(222,253,65,0.15)] transition-all duration-500">
                            <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
                                {/* Top Glow Bar */}
                                <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-accent to-transparent"></div>
                                {/* Corner Glow */}
                                <div className="absolute -top-20 -right-20 w-40 h-40 bg-accent/10 rounded-full blur-3xl"></div>
                            </div>

                            {/* Recommended Badge */}
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-accent text-black font-black uppercase tracking-[0.15em] text-[10px] py-1.5 px-5 rounded-full shadow-[0_0_20px_rgba(222,253,65,0.4)] z-20">
                                Recommended
                            </div>

                            <div className="relative z-10 mt-2">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h3 className="text-xl font-black text-accent uppercase tracking-widest mb-1">Pro</h3>
                                        <p className="text-[10px] text-accent/50 uppercase font-bold tracking-widest">For everyday deployers</p>
                                    </div>
                                    <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center">
                                        <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                                    </div>
                                </div>

                                <div className="relative mb-8 pb-8 border-b border-accent/10 flex items-center justify-between">
                                    <div className="flex items-end gap-1">
                                        <span className="text-5xl font-black text-white flex items-center">
                                            {billingCycle === 'monthly' ? '8' : '3'}
                                            <img src="/solana-sol-logo.png" alt="Solana Logo" className="w-8 h-8 ml-3" />
                                        </span>
                                        <span className="text-accent/60 font-medium mb-1.5 ml-1">
                                            {billingCycle === 'monthly' ? '/month' : '/week'}
                                        </span>
                                    </div>
                                    {/* Discount / Savings Highlight Badge */}
                                    <div className={`transition-all duration-500 ease-in-out absolute right-0 -translate-y-2 mb-4 md:mb-0 md:-translate-y-0 md:static ${billingCycle === 'monthly' ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none hidden md:block'}`}>
                                        <div className="inline-flex animate-fade-in-up items-center gap-1.5 bg-accent text-black px-3 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase shadow-[0_0_20px_rgba(222,253,65,0.4)]">
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                                            Save 5 SOL
                                        </div>
                                    </div>
                                </div>

                                {/* Credits */}
                                <div className="grid grid-cols-2 gap-3 mb-8">
                                    <div className="bg-accent/5 border border-accent/10 rounded-xl p-3 text-center transition-all duration-300">
                                        <div className="text-2xl font-black text-accent">{billingCycle === 'monthly' ? '480' : '120'}</div>
                                        <div className="text-[9px] font-bold text-accent/40 uppercase tracking-widest">Art Credits</div>
                                    </div>
                                    <div className="bg-accent/5 border border-accent/10 rounded-xl p-3 text-center transition-all duration-300">
                                        <div className="text-2xl font-black text-accent">{billingCycle === 'monthly' ? '480' : '120'}</div>
                                        <div className="text-[9px] font-bold text-accent/40 uppercase tracking-widest">Lore Credits</div>
                                    </div>
                                </div>

                                {/* Features */}
                                <ul className="space-y-4 mb-8">
                                    <li className="flex items-center gap-3 text-white text-sm font-medium">
                                        <svg className="w-4 h-4 text-accent flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                        All Art Styles
                                    </li>
                                    <li className="flex items-center gap-3 text-white text-sm font-medium">
                                        <svg className="w-4 h-4 text-accent flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                        All Formats (DEX, X Banner)
                                    </li>
                                    <li className="flex items-center gap-3 text-white text-sm font-medium">
                                        <svg className="w-4 h-4 text-accent flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                        All Image Gen Modes
                                    </li>
                                    <li className="flex items-center gap-3 text-accent text-sm font-black">
                                        <svg className="w-4 h-4 text-accent flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                        <span>Viral News Scraper</span>
                                    </li>
                                    <li className="flex items-center gap-3 text-white text-sm font-medium">
                                        <svg className="w-4 h-4 text-accent flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                        Optional credit top ups
                                    </li>
                                </ul>
                            </div>

                            <button onClick={() => {
                                setIsGeneratingWallet(true);
                                setReadyToConfirm(false);
                                setSelectedPlan('Pro');
                                const wallets = ['8iy54it4XzpDWxGnRKkvegNBQK3PYcsNoVBGQpr4ZkXg', 'EkuEs7vuxmQ7kypyv6mU53TKL7sSAJsRmQCam1mhmYi8', 'GDACcTncHQQrkr3RjoQzewiQdMyEzBmWAuvoJUy5qyfj', 'Ee43Zwf271hAXzW9JZRk57bu2HzkSVhpmmZ2xZyHs9yd', 'EcccU3bxUZdVrj6RMobgzEzCUKBm5SJsLaVxKMXkyiKq'];
                                setSelectedWallet(wallets[Math.floor(Math.random() * wallets.length)]);
                                setPaymentConfirmed(false);
                                setActiveModal('payment');
                            }} className="w-full py-4 rounded-xl bg-accent text-black font-black tracking-widest uppercase text-sm hover:bg-white transition-all shadow-[0_0_25px_rgba(222,253,65,0.2)] hover:shadow-[0_0_35px_rgba(222,253,65,0.4)]">
                                Go Pro
                            </button>
                        </div>

                        {/* --- MAX PLAN --- */}
                        <div className="group relative bg-[#0a0717] border border-purple-500/30 rounded-2xl p-6 md:p-8 flex flex-col justify-between hover:border-purple-400/60 transition-all duration-500" style={{ background: 'linear-gradient(180deg, #0B0820 0%, rgba(139, 92, 246, 0.05) 100%)' }}>
                            <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
                                {/* Top Glow Bar */}
                                <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-purple-500 to-transparent"></div>
                                {/* Corner Glow */}
                                <div className="absolute -top-20 -left-20 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl"></div>
                            </div>



                            <div className="relative z-10 mt-2">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h3 className="text-xl font-black text-purple-400 uppercase tracking-widest mb-1">Max</h3>
                                        <p className="text-[10px] text-purple-500/50 uppercase font-bold tracking-widest">Deploy best narratives</p>
                                    </div>
                                    <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                                        <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                    </div>
                                </div>

                                <div className="relative mb-8 pb-8 border-b border-purple-500/10 flex items-center justify-between">
                                    <div className="flex items-end gap-1">
                                        <span className="text-5xl font-black text-white flex items-center">
                                            {billingCycle === 'monthly' ? '30' : '10'}
                                            <img src="/solana-sol-logo.png" alt="Solana Logo" className="w-8 h-8 ml-3" />
                                        </span>
                                        <span className="text-purple-500/60 font-medium mb-1.5 ml-1">
                                            {billingCycle === 'monthly' ? '/month' : '/week'}
                                        </span>
                                    </div>
                                    {/* Discount / Savings Highlight Badge */}
                                    <div className={`transition-all duration-500 ease-in-out absolute right-0 -translate-y-2 mb-4 md:mb-0 md:-translate-y-0 md:static ${billingCycle === 'monthly' ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none hidden md:block'}`}>
                                        <div className="inline-flex animate-fade-in-up items-center gap-1.5 bg-purple-500 text-white px-3 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase shadow-[0_0_20px_rgba(139,92,246,0.4)]">
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                                            Save 10 SOL
                                        </div>
                                    </div>
                                </div>

                                {/* Credits */}
                                <div className="grid grid-cols-2 gap-3 mb-8">
                                    <div className="bg-purple-500/5 border border-purple-500/10 rounded-xl p-3 text-center transition-all duration-300">
                                        <div className="text-2xl font-black text-purple-400">{billingCycle === 'monthly' ? '480' : '120'}</div>
                                        <div className="text-[9px] font-bold text-purple-500/40 uppercase tracking-widest">Art Credits</div>
                                    </div>
                                    <div className="bg-purple-500/5 border border-purple-500/10 rounded-xl p-3 text-center transition-all duration-300">
                                        <div className="text-2xl font-black text-purple-400">{billingCycle === 'monthly' ? '960' : '240'}</div>
                                        <div className="text-[9px] font-bold text-purple-500/40 uppercase tracking-widest">Lore Credits</div>
                                    </div>
                                </div>

                                {/* Features */}
                                <ul className="space-y-4 mb-8">
                                    <li className="flex items-center gap-3 text-white text-sm font-medium">
                                        <svg className="w-4 h-4 text-purple-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                        All Art Styles
                                    </li>
                                    <li className="flex items-center gap-3 text-white text-sm font-medium">
                                        <svg className="w-4 h-4 text-purple-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                        All Formats (DEX, X Banner)
                                    </li>
                                    <li className="flex items-center gap-3 text-white text-sm font-medium">
                                        <svg className="w-4 h-4 text-purple-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                        All Image Gen Modes
                                    </li>
                                    <li className="flex items-center gap-3 text-purple-400 text-sm font-black">
                                        <svg className="w-4 h-4 text-purple-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                        <span>Full Scraper + God Mode</span>
                                    </li>
                                    <li className="flex items-center gap-3 text-white text-sm font-medium">
                                        <svg className="w-4 h-4 text-purple-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                        Optional credit top ups
                                    </li>
                                </ul>
                            </div>

                            <div className="relative w-full mt-4">
                                {/* Quota Full Message - Floating and transient */}
                                <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-3 text-center transition-all duration-300 pointer-events-none z-20 ${showQuotaFull ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
                                    <span className="inline-flex items-center gap-1.5 bg-[#0B0820] border border-purple-500/30 text-purple-400 text-[10px] uppercase font-bold tracking-[0.2em] px-3 py-1.5 rounded-full shadow-[0_0_15px_rgba(139,92,246,0.15)] whitespace-nowrap">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                        Quota Full
                                    </span>
                                </div>
                                <button onClick={() => { setShowQuotaFull(true); setTimeout(() => setShowQuotaFull(false), 2500); }} className="w-full relative overflow-hidden py-4 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400/60 font-black tracking-widest uppercase text-sm cursor-not-allowed transition-all duration-300 hover:bg-purple-500/20">
                                    SOLD OUT
                                    <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(139,92,246,0.05)_10px,rgba(139,92,246,0.05)_20px)] pointer-events-none"></div>
                                </button>
                            </div>
                        </div>

                    </div>

                    {/* Footer Note */}
                    <p className="text-center text-slate-600 text-sm mt-12 relative z-10">Need more? <button onClick={() => setActiveModal('support')} className="text-accent hover:text-white transition-colors underline underline-offset-2">Contact us</button> for custom plans.</p>
                </section>

            </main>

            {/* --- Footer --- */}
            <footer className="border-t border-white/10 bg-navy-950/50 pt-16 pb-8 px-6 backdrop-blur-md relative z-20">
                <div id="contact" className="scroll-mt-32 max-w-[1400px] mx-auto flex flex-col md:flex-row justify-between items-start gap-12 border-b border-white/10 pb-12 mb-8">
                    <div className="max-w-xs">
                        <img
                            src="/pepe_forge.png"
                            alt="Forge Logo"
                            className="h-[60px] w-auto object-contain mb-6 opacity-80 transition-transform hover:scale-105"
                            onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = "https://placehold.co/200x60/transparent/DEFD41?text=FORGE";
                            }}
                        />
                        <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
                            Create mascots, art, and banners for your token. Scrape the web for viral ideas — all centralized in one powerful platform.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-8 md:gap-12 w-full md:w-auto">
                        <div>
                            <h4 className="text-white font-bold uppercase tracking-widest mb-6 text-sm">Product</h4>
                            <ul className="space-y-4 text-slate-400 text-sm">
                                <li><A href="#features" className="hover:text-accent transition-colors">Features</A></li>
                                <li><A href="#pricing" className="hover:text-accent transition-colors">Pricing</A></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="text-white font-bold uppercase tracking-widest mb-6 text-sm">Company</h4>
                            <ul className="space-y-4 text-slate-400 text-sm flex flex-col items-start">
                                <li><button onClick={() => setActiveModal('about')} className="hover:text-accent transition-colors text-left">About</button></li>
                                <li><button onClick={() => setActiveModal('terms')} className="hover:text-accent transition-colors text-left">Terms of Service</button></li>
                                <li><button onClick={() => setActiveModal('privacy')} className="hover:text-accent transition-colors text-left">Privacy Policy</button></li>
                            </ul>
                        </div>
                        <div className="col-span-2 md:col-span-1">
                            <h4 className="text-white font-bold uppercase tracking-widest mb-6 text-sm">Contact</h4>
                            <ul className="space-y-4 text-slate-400 text-sm flex flex-col items-start">
                                <li>
                                    <a href="https://x.com/memeforgeapp" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 hover:text-white transition-colors group">
                                        <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white group-hover:bg-accent group-hover:border-accent group-hover:text-black transition-all">
                                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                                        </div>
                                        <span>X (Twitter)</span>
                                    </a>
                                </li>
                                <li>
                                    <a href="https://t.me/memeforgeapp" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 hover:text-white transition-colors group">
                                        <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white group-hover:bg-accent group-hover:border-accent group-hover:text-black transition-all">
                                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.892-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" /></svg>
                                        </div>
                                        <span>Channel</span>
                                    </a>
                                </li>
                                <li>
                                    <button onClick={() => setActiveModal('support')} className="flex items-center gap-3 hover:text-accent transition-colors text-left group">
                                        <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-accent group-hover:bg-accent group-hover:border-accent group-hover:text-black transition-all">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                                        </div>
                                        <span className="font-bold text-accent">Support</span>
                                    </button>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row items-center justify-between text-slate-500 text-xs gap-4">
                    <p>© 2026 MemeStudio. All rights reserved.</p>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-black/50 rounded-full border border-white/5">
                        <div className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse"></div>
                        <span className="font-bold uppercase tracking-widest text-[10px]">System Online</span>
                    </div>
                </div>
            </footer>

            {/* --- Login Modal --- */}
            {
                showLoginModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        {/* 1. Backdrop Layer */}
                        <div
                            className="absolute inset-0 bg-black/70 backdrop-blur-xl animate-in fade-in duration-300"
                            onClick={() => setShowLoginModal(false)}
                        ></div>

                        {/* 3. Card Layer */}
                        <div className="relative w-full max-w-[380px] bg-[#070b14] border border-white/5 rounded-2xl shadow-2xl glass animate-in fade-in zoom-in-95 duration-300 overflow-hidden group">

                            {/* 2. Ambient Glow Layer (Inside Card for containment) */}
                            <div className="absolute inset-0 rounded-2xl pointer-events-none opacity-20 bg-[radial-gradient(circle_at_50%_0%,rgba(222,253,65,0.15),transparent_70%)] transition-opacity duration-500 group-hover:opacity-40"></div>

                            {/* Top Glow Line */}
                            <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-accent to-transparent opacity-70"></div>

                            {/* Close Button */}
                            <button
                                onClick={() => setShowLoginModal(false)}
                                className="absolute top-4 right-4 text-slate-600 hover:text-white transition-colors z-20 mix-blend-screen"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>

                            <div className="p-6 md:p-8 relative z-10">
                                {/* Shield Icon */}
                                <div className="flex justify-center mb-6 relative">
                                    <div className="w-16 h-16 rounded-2xl bg-black/40 border border-white/5 flex items-center justify-center shadow-[0_0_30px_rgba(222,253,65,0.1)] relative z-10 backdrop-blur-sm">
                                        <svg className="w-8 h-8 text-accent animate-pulse drop-shadow-[0_0_8px_rgba(222,253,65,0.8)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                        </svg>
                                    </div>
                                    <div className="absolute inset-0 bg-accent/20 blur-2xl rounded-full scale-110 animate-pulse"></div>
                                </div>

                                <div className="text-center mb-8">
                                    <h3 className="text-2xl font-black text-white mb-1 tracking-[0.2em] uppercase">Access Port</h3>
                                    <p className="text-sm text-slate-500">Enter your secure code to continue</p>
                                </div>

                                <form onSubmit={handleLogin} className="space-y-5">
                                    <div className="relative">
                                        <input
                                            type="password"
                                            placeholder="••••••••"
                                            value={accessCode}
                                            onChange={(e) => setAccessCode(e.target.value)}
                                            className="w-full bg-black/60 border border-white/10 text-white p-4 rounded-xl focus:outline-none focus:border-accent/50 focus:shadow-[0_0_20px_rgba(222,253,65,0.15)] text-center tracking-[0.3em] font-mono transition-all placeholder:text-slate-700 placeholder:tracking-[0.3em]"
                                        />
                                    </div>

                                    {error && (
                                        <div className="animate-in slide-in-from-top-2 fade-in duration-200 text-red-400 text-xs text-center font-bold bg-red-400/10 py-2.5 px-3 border border-red-400/20 rounded-lg flex items-center justify-center gap-2 uppercase tracking-wide">
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                            {error}
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full bg-accent text-black font-black py-4 rounded-xl tracking-widest uppercase transition-all flex justify-center items-center gap-2 hover:bg-white hover:shadow-[0_0_30px_rgba(222,253,65,0.3)] hover:-translate-y-0.5 active:translate-y-0"
                                    >
                                        {loading ? (
                                            <svg className="animate-spin h-5 w-5 text-black" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                        ) : "Authenticate"}
                                    </button>
                                </form>

                                <div className="mt-8 pt-6 border-t border-white/5 text-center">
                                    <p className="text-xs text-slate-600 font-medium">
                                        Don't have an access code? <A href="#pricing" onClick={() => setShowLoginModal(false)} className="text-slate-400 hover:text-accent transition-colors underline underline-offset-4">Get one here</A>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* --- Info Modals --- */}
            {
                activeModal && activeModal !== 'payment' && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                            onClick={() => {
                                if (activeModal !== 'payment') {
                                    setActiveModal(null);
                                }
                            }}
                        ></div>

                        <div className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto overflow-x-hidden bg-[#0B1221] border border-white/10 rounded-2xl p-8 shadow-2xl glass animate-in fade-in zoom-in-95 duration-200 custom-scrollbar">
                            {/* Internal Glow */}
                            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-accent to-transparent"></div>
                            <div className="absolute -top-10 -right-10 w-40 h-40 bg-accent/10 rounded-full blur-3xl pointer-events-none"></div>

                            <button
                                onClick={() => setActiveModal(null)}
                                className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors z-20"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>

                            <div className="p-5 md:p-8 relative z-10 text-slate-300">
                                {activeModal === 'about' && (
                                    <div className="space-y-6">
                                        <h3 className="text-3xl font-black text-white mb-2 tracking-tight">About MemeForge</h3>
                                        <div className="w-12 h-1 bg-accent mb-6"></div>
                                        <p className="leading-relaxed text-lg text-white">MemeForge is the ultimate all-in-one AI platform designed specifically for the crypto, Web3, and memecoin communities.</p>
                                        <p className="leading-relaxed">We empower creators and developers to generate unique mascots, high-quality art, and compelling banners in seconds using our advanced Art Engine.</p>
                                        <p className="leading-relaxed">Beyond art generation, MemeForge provides a powerful Viral Narrative Scraper that monitors the deep web and social networks (X, TikTok, Reddit, etc.) to uncover the next big meta before it goes mainstream. Our mission is to centralize the creative and research process, making viral asset creation accessible and dynamic.</p>
                                    </div>
                                )}
                                {activeModal === 'terms' && (
                                    <div className="space-y-6">
                                        <h3 className="text-3xl font-black text-white mb-2 tracking-tight">Terms of Service</h3>
                                        <div className="w-12 h-1 bg-accent mb-6"></div>
                                        <p className="leading-relaxed">By accessing and using MemeForge, you agree to be bound by our Terms of Service. You must use our platform responsibly and in compliance with all applicable laws.</p>
                                        <div className="bg-white/5 p-5 rounded-xl border border-white/10">
                                            <h4 className="text-white font-bold mb-2">1. Usage Rights</h4>
                                            <p className="text-sm leading-relaxed">Users retain the rights to the AI-generated art they create, subject to their subscription tier. MemeForge is not responsible for copyright infringements resulting from user-provided prompts or scraped content.</p>
                                        </div>
                                        <div className="bg-white/5 p-5 rounded-xl border border-white/10">
                                            <h4 className="text-white font-bold mb-2">2. Prohibited Conduct</h4>
                                            <p className="text-sm leading-relaxed">You agree not to use MemeForge to generate illegal, hateful, or harmful content. We reserve the right to suspend or terminate accounts violating these terms without refund.</p>
                                        </div>
                                        <div className="bg-white/5 p-5 rounded-xl border border-white/10">
                                            <h4 className="text-white font-bold mb-2">3. Service Availability</h4>
                                            <p className="text-sm leading-relaxed">While we strive for 99.9% uptime, MemeForge is provided "as is". We are not liable for temporary service interruptions or data loss during system updates.</p>
                                        </div>
                                    </div>
                                )}
                                {activeModal === 'privacy' && (
                                    <div className="space-y-6">
                                        <h3 className="text-3xl font-black text-white mb-2 tracking-tight">Privacy Policy</h3>
                                        <div className="w-12 h-1 bg-accent mb-6"></div>
                                        <p className="leading-relaxed text-lg text-white">Your privacy is perfectly respected at MemeForge. This policy outlines how we collect, use, and protect your data.</p>
                                        <div className="space-y-6 mt-8">
                                            <div className="border-l-2 border-accent pl-5 py-1">
                                                <h4 className="text-white font-bold mb-2 text-lg">Information Collection</h4>
                                                <p className="text-sm leading-relaxed">We collect necessary data such as your access code, usage metrics (images generated, credits spent), and generated content to provide our services effectively.</p>
                                            </div>
                                            <div className="border-l-2 border-accent pl-5 py-1">
                                                <h4 className="text-white font-bold mb-2 text-lg">Data Usage</h4>
                                                <p className="text-sm leading-relaxed">We use your data securely to authenticate users, manage subscription tiers, and improve our AI models. We do not sell your personal data to third parties.</p>
                                            </div>
                                            <div className="border-l-2 border-accent pl-5 py-1">
                                                <h4 className="text-white font-bold mb-2 text-lg">Security</h4>
                                                <p className="text-sm leading-relaxed">All user data is encrypted and stored securely using industry-standard protocols. Scraped data from public networks is anonymized and aggregated for our research engine.</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {activeModal === 'support' && (
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
                                )}
                            </div>
                        </div>
                    </div>
                )
            }

            {/* --- Standalone Payment Page --- */}
            {activeModal === 'payment' && (
                <div className="fixed inset-0 z-[100] bg-[#050810] overflow-y-auto w-full min-h-screen animate-in zoom-in-95 duration-300">

                    {/* Return to Landing */}
                    <button
                        onClick={() => setActiveModal(null)}
                        className="absolute top-6 left-6 flex items-center gap-2 text-slate-500 hover:text-white transition-all text-sm font-medium z-20"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        Back
                    </button>

                    <div className="min-h-screen flex items-center justify-center px-6">
                        <div className="w-full max-w-md py-16">

                            {/* Logo */}
                            <div className="flex items-center justify-center mb-12">
                                <img src="/pepe_forge.png" className="h-10 w-auto opacity-70" alt="Logo" />
                            </div>

                            {/* Amount Display */}
                            <div className="text-center mb-6">
                                <div className="text-4xl md:text-5xl lg:text-6xl font-black text-accent tracking-tight flex items-center justify-center gap-2 md:gap-3">
                                    {appliedDiscount ? (
                                        <>
                                            <span className="text-2xl md:text-3xl text-slate-500 line-through decoration-slate-600 decoration-2">{paymentBaseAmount}</span>
                                            <span>{paymentFinalAmount} SOL</span>
                                        </>
                                    ) : (
                                        <span>{paymentFinalAmount} SOL</span>
                                    )}
                                </div>
                                <div className="text-slate-500 text-sm mt-3 font-medium">
                                    {selectedPlan} · <span className="capitalize">{billingCycle}</span>
                                </div>
                            </div>

                            {/* Divider */}
                            <div className="border-t border-white/5 my-10"></div>

                            {/* Wallet Address Section */}
                            <div className="mb-10 text-center">
                                <p className="text-slate-500 text-[11px] uppercase tracking-widest font-bold mb-4">
                                    Send to this address
                                </p>

                                <div className="relative w-full overflow-hidden">
                                    {isGeneratingWallet ? (
                                        <div className="bg-white/5 py-4 px-5 rounded-full border border-white/5 w-full flex items-center justify-center gap-3">
                                            <svg className="animate-spin w-4 h-4 text-slate-400" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            <span className="text-xs text-slate-400 font-sans tracking-wide animate-pulse">Generating address...</span>
                                        </div>
                                    ) : (
                                        <div
                                            className={`py-3 px-5 rounded-full border cursor-pointer transition-all w-full flex items-center justify-center gap-3 overflow-hidden ${walletCopied ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'}`}
                                            onClick={() => {
                                                navigator.clipboard.writeText(selectedWallet);
                                                setWalletCopied(true);
                                                setTimeout(() => {
                                                    setWalletCopied(false);
                                                    setReadyToConfirm(true);
                                                }, 2000);
                                            }}
                                        >
                                            <span className="truncate flex-1 text-center font-mono text-[11px] md:text-sm tracking-tight" title={selectedWallet}>{selectedWallet}</span>
                                            {walletCopied ? (
                                                <svg className="w-5 h-5 ml-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                            ) : (
                                                <svg className="w-4 h-4 ml-1 opacity-50 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" strokeWidth="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" strokeWidth="2"></path></svg>
                                            )}
                                        </div>
                                    )}
                                </div>
                                {!isGeneratingWallet ? (
                                    <p className={`text-[11px] mt-4 font-bold tracking-wider uppercase transition-colors ${walletCopied ? 'text-green-400' : 'text-slate-500'}`}>
                                        {walletCopied ? 'Copied to clipboard' : 'Click address to copy'}
                                    </p>
                                ) : (
                                    <div className="h-[26px]"></div>
                                )}
                            </div>

                            {/* CTA Button */}
                            {!paymentConfirmed ? (
                                <div className="text-center">
                                    <button
                                        onClick={() => setPaymentConfirmed(true)}
                                        disabled={!readyToConfirm}
                                        className={`w-full py-4 rounded-full font-bold text-sm transition-all duration-300 ${readyToConfirm ? 'bg-accent text-black hover:bg-white cursor-pointer hover:scale-[1.02]' : 'bg-white/5 text-white/30 cursor-not-allowed'}`}
                                    >
                                        I Have Sent the Payment
                                    </button>
                                    {!readyToConfirm && <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-4 font-bold">Copy the address first</p>}
                                </div>
                            ) : (
                                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 text-center">
                                    <div className="flex flex-col items-center justify-center gap-2 mb-6 text-center">
                                        <div className="flex items-center gap-2 text-green-400">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                            <span className="font-bold text-sm uppercase tracking-wider">Payment Marked as Sent!</span>
                                        </div>
                                        <p className="text-slate-400 text-xs mt-1">Our team needs to manually verify the transaction to activate your plan.</p>
                                    </div>

                                    <a href={`https://t.me/fizzd3gen?text=${encodeURIComponent(`Hi, I have just made a payment for the ${selectedPlan || 'Pro'} plan (${billingCycle}).\n\n- Amount: ${paymentFinalAmount} SOL${appliedDiscount ? ` (with ${appliedDiscount.percentage}% discount via code ${appliedDiscount.code})` : ''}\n- Sent to wallet: ${selectedWallet}\n\nPlease verify and activate my account. Thanks!`)}`} target="_blank" rel="noopener noreferrer" className="w-full py-4 rounded-full bg-accent text-black font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-white transition-all hover:scale-[1.02]">
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.892-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" /></svg>
                                        Verify on Telegram
                                    </a>
                                </div>
                            )}

                            <div className="mt-12 w-full flex flex-col items-center gap-2">
                                {/* Discount Code Section */}
                                {!paymentConfirmed && (
                                    <div className="w-full">
                                        {!showDiscountInput && !appliedDiscount ? (
                                            <p className="text-center text-slate-600 text-xs font-medium">
                                                Have a discount code? <span className="cursor-pointer text-slate-400 hover:text-white transition-colors underline underline-offset-2" onClick={() => setShowDiscountInput(true)}>Redeem</span>
                                            </p>
                                        ) : (
                                            <div className="mb-4 animate-in fade-in zoom-in-95 duration-200">
                                                <div className="flex items-center justify-between mb-2">
                                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Discount Code</p>
                                                    {showDiscountInput && !appliedDiscount && (
                                                        <button onClick={() => setShowDiscountInput(false)} className="text-slate-500 hover:text-white text-xs font-bold uppercase">Cancel</button>
                                                    )}
                                                </div>
                                                <div className="flex bg-[#0a0f1a] border border-white/10 rounded-2xl overflow-hidden focus-within:border-accent/40 transition-colors shadow-inner">
                                                    <input
                                                        type="text"
                                                        placeholder="Enter code"
                                                        value={discountCodeInput}
                                                        onChange={(e) => setDiscountCodeInput(e.target.value.toUpperCase())}
                                                        className="flex-1 bg-transparent px-5 py-3.5 text-sm text-white focus:outline-none placeholder:text-slate-600 uppercase tracking-widest font-mono"
                                                        disabled={isApplyingDiscount || appliedDiscount !== null}
                                                    />
                                                    {appliedDiscount ? (
                                                        <button
                                                            onClick={resetDiscount}
                                                            className="px-5 py-3.5 text-red-500 font-bold hover:bg-red-500/10 transition-colors text-xs uppercase tracking-widest border-l border-white/5"
                                                        >
                                                            Remove
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={applyDiscountCode}
                                                            disabled={isApplyingDiscount || !discountCodeInput.trim()}
                                                            className="px-6 py-3.5 bg-accent/10 hover:bg-accent/20 text-accent disabled:text-slate-600 disabled:bg-white/5 disabled:hover:bg-white/5 font-bold transition-colors text-xs uppercase tracking-widest border-l border-white/5"
                                                        >
                                                            {isApplyingDiscount ? '...' : 'Apply'}
                                                        </button>
                                                    )}
                                                </div>
                                                {discountError && <p className="text-red-400 text-[10px] mt-2 px-2 font-bold uppercase tracking-wider text-center">{discountError}</p>}
                                                {discountSuccess && <p className="text-green-400 text-[10px] mt-2 px-2 font-bold uppercase tracking-wider text-center">{discountSuccess}</p>}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Footer Help */}
                                <p className="text-center text-slate-600 text-xs font-medium">
                                    Need help? <a href="https://t.me/fizzd3gen" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white transition-colors underline underline-offset-2">Contact support</a>
                                </p>
                            </div>

                        </div>
                    </div>
                </div>
            )}
        </div >
    );
};

