import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { DatabaseUser } from '../types';

interface LandingPageProps {
    onLogin: (user: DatabaseUser) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLogin }) => {
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [accessCode, setAccessCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [scrapeFeed, setScrapeFeed] = useState<{ id: string; img: string }[]>([]);
    const [isSlidersHovered, setIsSlidersHovered] = useState(false);
    const [activeSliderMode, setActiveSliderMode] = useState<'trait' | 'remix'>('trait');

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
                        <img
                            src="/pepe_forge.png"
                            alt="Forge Logo"
                            className="h-[65px] w-auto object-contain cursor-pointer hover:scale-105 transition-transform duration-300 drop-shadow-xl"
                            onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = "https://placehold.co/200x65/transparent/DEFD41?text=FORGE";
                            }}
                            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                        />
                    </div>

                    <div className="hidden md:flex items-center gap-10">
                        <a href="#features" className="relative group text-sm font-bold text-slate-300 hover:text-white uppercase tracking-widest transition-all duration-300 py-2 hover:-translate-y-1">
                            Features
                            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-[2px] bg-accent transition-all duration-300 ease-out group-hover:w-full group-hover:shadow-[0_0_12px_rgba(222,253,65,0.9)] rounded-full"></span>
                        </a>
                        <a href="#pricing" className="relative group text-sm font-bold text-slate-300 hover:text-white uppercase tracking-widest transition-all duration-300 py-2 hover:-translate-y-1">
                            Pricing
                            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-[2px] bg-accent transition-all duration-300 ease-out group-hover:w-full group-hover:shadow-[0_0_12px_rgba(222,253,65,0.9)] rounded-full"></span>
                        </a>
                        <a href="#contact" className="relative group text-sm font-bold text-slate-300 hover:text-white uppercase tracking-widest transition-all duration-300 py-2 hover:-translate-y-1">
                            Contact
                            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-[2px] bg-accent transition-all duration-300 ease-out group-hover:w-full group-hover:shadow-[0_0_12px_rgba(222,253,65,0.9)] rounded-full"></span>
                        </a>
                    </div>

                    <div className="flex items-center">
                        <button
                            onClick={() => setShowLoginModal(true)}
                            className="flex items-center gap-2 px-6 py-2.5 bg-accent/10 hover:bg-accent/20 border border-accent/20 hover:border-accent text-accent rounded-full font-black uppercase tracking-widest transition-all hover:scale-105"
                            style={{ boxShadow: '0 0 15px rgba(222, 253, 65, 0.1)' }}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                            Login
                        </button>
                    </div>
                </div>
            </nav>

            {/* --- Main Content --- */}
            <main className="relative z-10 pt-32 pb-20">

                {/* Section 1: Hero */}
                <section className="min-h-[65vh] flex flex-col items-center justify-start pt-12 md:pt-24 px-6 text-center animate-fade-in-up relative">

                    <div className="relative z-30">
                        <div className="absolute inset-0 bg-accent/20 blur-[100px] h-[300px] w-[300px] mx-auto rounded-full -z-10 animate-pulse"></div>
                        <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-slate-200 to-slate-500 mb-6 tracking-tight leading-tight max-w-4xl mx-auto">
                            The all-in-one <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-[#a3f000]">dev tool</span>
                        </h1>
                    </div>

                    <p className="text-lg md:text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed relative z-30">
                        AI-driven character generation, dynamic scene creation, and deep trend research — all centralized in one powerful platform.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 relative z-30">
                        <button
                            onClick={() => setShowLoginModal(true)}
                            className="w-full sm:w-auto px-8 py-4 bg-accent hover:bg-accent/90 text-navy-950 rounded-xl font-black text-lg shadow-[0_0_30px_rgba(222,253,65,0.4)] transition-transform hover:-translate-y-1 flex items-center justify-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            GET STARTED
                        </button>

                        <div className="flex items-center gap-4 mt-4 sm:mt-0">
                            <a href="#" className="w-14 h-14 border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/30 rounded-xl flex items-center justify-center text-white transition-all hover:-translate-y-1 backdrop-blur-md">
                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                            </a>
                            <a href="#" className="w-14 h-14 border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/30 rounded-xl flex items-center justify-center text-white transition-all hover:-translate-y-1 backdrop-blur-md">
                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.892-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" /></svg>
                            </a>
                        </div>
                    </div>

                    {/* Features Badges */}
                    <div className="flex flex-wrap items-center justify-center gap-4 md:gap-8 mt-16 relative z-30">
                        {[
                            { name: 'Art Contents' },
                            { name: 'Dex Banner' },
                            { name: '+10 Art Styles' },
                            { name: 'Viral Narrative Scraper', hasIcons: true }
                        ].map((feature, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-slate-300 font-medium text-sm md:text-base bg-white/5 border border-white/10 px-4 py-1.5 rounded-full backdrop-blur-md">
                                <div className="w-4 h-4 rounded-full bg-accent/20 flex items-center justify-center text-accent">
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
                <section id="features" className="pt-4 pb-24 md:-mt-12 overflow-hidden relative z-20">
                    <div className="px-6 max-w-[1400px] mx-auto relative z-10">
                        <div className="relative max-w-[1400px] mx-auto mb-20 group perspective-1000">
                            {/* Inner App Window Screenshot (macOS Style) */}
                            <div className="relative bg-[#02040A] rounded-xl flex flex-col shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),_0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden border border-white/5 transition-all duration-500 z-10 w-full animate-fade-in-up hover:border-white/10 hover:shadow-[0_20px_80px_rgba(0,0,0,0.9)]">

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
                                    <img src="/app_screenshot_v2.png" alt="MemeForge Art Engine Interface" className="w-full h-auto object-cover relative z-10" />
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
                        <div className="relative flex items-center justify-center w-full h-[512px] my-4">
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
                                            <div key={idx} className="w-64 h-64 bg-navy-950 border border-white/5 rounded-2xl flex-shrink-0 flex items-center justify-center hover:scale-105 hover:border-accent/50 transition-all cursor-pointer shadow-lg overflow-hidden group">
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

                                <div className="flex-shrink-0 h-[512px] bg-[#02040A] rounded-2xl relative flex items-center justify-center overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8),_0_0_0_1px_rgba(255,255,255,0.05)_inset] border border-white/10 group transform transition duration-500 hover:scale-[1.02] z-10">
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
                        <div className="relative flex items-center justify-center w-full h-[280px] my-4">
                            {/* Background Slider Container */}
                            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 w-full h-56 z-0">
                                <div
                                    className="slider-container w-full h-full"
                                    onMouseEnter={() => setIsSlidersHovered(true)}
                                    onMouseLeave={() => setIsSlidersHovered(false)}
                                >
                                    {activeSliderMode === 'trait' ? (
                                        <div className="slider-track gap-6 h-full absolute flex animate-in fade-in duration-500" style={{ animationDirection: 'reverse', animationPlayState: isSlidersHovered ? 'paused' : 'running' }}>
                                            {/* Duplicated for infinite scroll illusion */}
                                            {[...Array(2)].flatMap(() => ['11.jpeg', '12.jpeg', '13.jpeg', '14.jpeg', '15.jpeg', '16.jpeg', '17.jpeg', '18.jpeg', '19.jpeg', '20.jpeg', '21.jpeg', '22.jpeg', '23.jpeg', '24.jpeg', '26.jpeg', '27.jpeg', '28.jpeg', '29.jpeg']).map((item, idx) => (
                                                <div key={idx} className="w-48 h-48 bg-navy-950 border border-white/5 rounded-2xl flex-shrink-0 flex items-center justify-center hover:scale-105 hover:border-accent/50 transition-all cursor-pointer shadow-lg overflow-hidden group">
                                                    <img src={`/slider_images/${item}`} alt={`Generated Scene ${idx}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="slider-track gap-6 h-full absolute flex animate-in fade-in duration-500" style={{ animationDirection: 'reverse', animationPlayState: isSlidersHovered ? 'paused' : 'running' }}>
                                            {/* Duplicated for infinite scroll illusion */}
                                            {[...Array(2)].flatMap(() => ['photo_2026-02-25 16.36.28.jpeg', 'photo_2026-02-25 16.36.29.jpeg', 'photo_2026-02-25 16.36.46.jpeg', 'photo_2026-02-25 16.36.51.jpeg', 'photo_2026-02-25 16.36.55.jpeg', 'photo_2026-02-25 16.36.56.jpeg', 'photo_2026-02-25 16.36.58.jpeg', 'photo_2026-02-25 16.37.00.jpeg', 'photo_2026-02-25 16.37.01.jpeg', 'photo_2026-02-25 16.37.02.jpeg', 'photo_2026-02-25 16.37.03.jpeg', 'photo_2026-02-25 16.37.04.jpeg', 'photo_2026-02-25 16.37.05.jpeg', 'photo_2026-02-25 16.37.10.jpeg', 'photo_2026-02-25 16.37.15.jpeg', 'photo_2026-02-25 16.37.16.jpeg', 'photo_2026-02-25 16.37.18.jpeg', 'photo_2026-02-25 16.37.19.jpeg', 'photo_2026-02-25 16.37.24.jpeg']).map((item, idx) => (
                                                <div key={idx} className="w-48 h-48 bg-navy-950 border border-white/5 rounded-2xl flex-shrink-0 flex items-center justify-center hover:scale-105 hover:border-accent/50 transition-all cursor-pointer shadow-lg overflow-hidden group">
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
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[160%] h-[256px] bg-[#02040A] blur-[60px] rounded-[100%] z-0 pointer-events-none opacity-90 transition-all duration-500"></div>

                                <div className="flex-shrink-0 w-64 h-64 bg-navy-950/80 border-[3px] border-accent/70 p-2.5 shadow-[0_0_40px_rgba(222,253,65,0.25)] rounded-3xl relative flex items-center justify-center group transform transition duration-500 hover:scale-[1.02] z-10 animate-in zoom-in-95">
                                    <div className="absolute inset-x-0 top-3 pt-3 pb-10 z-10 flex justify-center bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-none rounded-t-2xl">
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
                        <div className="w-full lg:w-[45%] flex flex-col justify-center items-center h-[700px] relative pointer-events-none">
                            <div className="w-full max-w-[420px] relative h-full flex flex-col items-center">
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
                <section id="pricing" className="py-24 px-6 max-w-[1400px] mx-auto relative">
                    <div className="absolute inset-0 bg-yellow-500/5 blur-[150px] rounded-full pointer-events-none w-[60%] mx-auto hidden md:block"></div>

                    <div className="text-center mb-16 relative z-10">
                        <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight uppercase mb-4">Choose Your Plan</h2>
                        <p className="text-slate-400 text-lg">Scalable power for every level of meme creation.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto relative z-10">
                        {/* Gold Plan */}
                        <div className="pricing-card bg-[#0B1221] border border-yellow-500/30 rounded-3xl p-8 flex flex-col justify-between" style={{ background: 'linear-gradient(180deg, #0B1221 0%, rgba(234, 179, 8, 0.05) 100%)' }}>
                            <div>
                                <h3 className="text-2xl font-black text-yellow-500 uppercase tracking-widest mb-2">Gold</h3>
                                <p className="text-slate-400 mb-8 border-b border-white/10 pb-8">Perfect for getting started with AI generation.</p>

                                <ul className="space-y-4 mb-auto">
                                    {[1, 2, 3].map(i => (
                                        <li key={i} className="flex items-center gap-3 text-slate-300">
                                            <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                            [ Feature Description {i} ]
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="mt-10 border-t border-white/10 pt-8">
                                <div className="text-4xl font-black text-white mb-6">$XX<span className="text-lg text-slate-500 font-normal">/mo</span></div>
                                <button className="w-full py-4 rounded-xl border border-yellow-500 text-yellow-500 font-bold tracking-widest uppercase hover:bg-yellow-500 hover:text-black transition-colors">
                                    Select Gold
                                </button>
                            </div>
                        </div>

                        {/* Premium Plan */}
                        <div className="pricing-card premium bg-[#070b14] border border-accent rounded-3xl p-8 flex flex-col justify-between relative shadow-2xl shadow-accent/10">
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-accent text-black font-black uppercase tracking-widest text-xs py-1.5 px-4 rounded-full">
                                Recommended
                            </div>

                            <div>
                                <h3 className="text-2xl font-black text-accent uppercase tracking-widest mb-2 flex items-center gap-2">
                                    <span className="text-xl">✦</span> Premium <span className="text-xl">✦</span>
                                </h3>
                                <p className="text-slate-400 mb-8 border-b border-white/10 pb-8">Maximum power and priority access for professionals.</p>

                                <ul className="space-y-4 mb-auto">
                                    {[1, 2, 3, 4, 5].map(i => (
                                        <li key={i} className="flex items-center gap-3 text-white font-medium">
                                            <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                            [ Premium Feature {i} ]
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="mt-10 border-t border-white/10 pt-8">
                                <div className="text-4xl font-black text-white mb-6">$XX<span className="text-lg text-slate-500 font-normal">/mo</span></div>
                                <button className="w-full py-4 rounded-xl bg-accent text-black font-black tracking-widest uppercase hover:bg-white transition-colors animate-[glow-pulse_3s_infinite]">
                                    Select Premium
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

            </main>

            {/* --- Footer --- */}
            <footer id="contact" className="border-t border-white/10 bg-navy-950/50 pt-16 pb-8 px-6 backdrop-blur-md relative z-20">
                <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row justify-between items-start gap-12 border-b border-white/10 pb-12 mb-8">
                    <div className="max-w-xs">
                        <img
                            src="/pepe_forge.png"
                            alt="Forge Logo"
                            className="h-[40px] w-auto object-contain mb-6 opacity-80"
                            onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = "https://placehold.co/200x40/transparent/DEFD41?text=FORGE";
                            }}
                        />
                        <p className="text-slate-500 text-sm leading-relaxed">
                            The ulimate AI infrastructure for creating, iterating, and researching viral assets on the fly.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-12 w-full md:w-auto">
                        <div>
                            <h4 className="text-white font-bold uppercase tracking-widest mb-6 text-sm">Product</h4>
                            <ul className="space-y-4 text-slate-400 text-sm">
                                <li><a href="#features" className="hover:text-accent transition-colors">Features</a></li>
                                <li><a href="#pricing" className="hover:text-accent transition-colors">Pricing</a></li>
                                <li><a href="#" className="hover:text-accent transition-colors">API Limits</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="text-white font-bold uppercase tracking-widest mb-6 text-sm">Company</h4>
                            <ul className="space-y-4 text-slate-400 text-sm">
                                <li><a href="#" className="hover:text-accent transition-colors">About</a></li>
                                <li><a href="#" className="hover:text-accent transition-colors">Terms of Service</a></li>
                                <li><a href="#" className="hover:text-accent transition-colors">Privacy Policy</a></li>
                            </ul>
                        </div>
                        <div className="col-span-2 md:col-span-1">
                            <h4 className="text-white font-bold uppercase tracking-widest mb-6 text-sm">Community</h4>
                            <div className="flex gap-4">
                                <a href="#" className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-accent hover:border-accent hover:text-black transition-all">
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                                </a>
                                <a href="#" className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-accent hover:border-accent hover:text-black transition-all">
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.892-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" /></svg>
                                </a>
                            </div>
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
            {showLoginModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={() => setShowLoginModal(false)}
                    ></div>

                    <div className="relative w-full max-w-md bg-[#0B1221] border border-white/10 rounded-2xl p-8 shadow-2xl overflow-hidden glass  animate-in fade-in zoom-in-95 duration-200">
                        {/* Internal Glow */}
                        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-accent to-transparent"></div>
                        <div className="absolute -top-10 -right-10 w-40 h-40 bg-accent/10 rounded-full blur-3xl pointer-events-none"></div>

                        <button
                            onClick={() => setShowLoginModal(false)}
                            className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>

                        <div className="text-center mb-8 relative z-10">
                            <h3 className="text-3xl font-black text-white mb-2 tracking-tight">Access Port</h3>
                            <p className="text-slate-400 text-sm">Enter your secure access code to continue.</p>
                        </div>

                        <form onSubmit={handleLogin} className="relative z-10 space-y-4">
                            <div>
                                <input
                                    type="password"
                                    placeholder="Access Code"
                                    value={accessCode}
                                    onChange={(e) => setAccessCode(e.target.value)}
                                    className="w-full bg-black/50 border border-white/10 text-white p-4 rounded-xl focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent text-center tracking-widest text-lg transition-all placeholder:text-slate-600"
                                />
                            </div>

                            {error && <div className="text-red-400 text-sm text-center font-bold bg-red-400/10 py-2 border border-red-400/20 rounded-lg">{error}</div>}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-accent hover:bg-white text-black font-black p-4 rounded-xl tracking-widest uppercase transition-colors flex justify-center items-center gap-2 mt-4"
                            >
                                {loading ? (
                                    <svg className="animate-spin h-5 w-5 text-black" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                ) : "Authenticate"}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
