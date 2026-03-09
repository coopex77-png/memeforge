import React, { useState, useEffect } from 'react';

const loadingSteps = [
  "INITIALIZING_NEURAL_CORE...",
  "TRAINING_LORA_ADAPTERS...",
  "SYNTHESIZING_MEME_DNA...",
  "CALCULATING_VIRAL_COEFFICIENTS...",
  "APPLYING_STYLE_VECTORS...",
  "RENDERING_FINAL_OUTPUT..."
];

export const LoadingScreen: React.FC = () => {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((prev) => (prev + 1) % loadingSteps.length);
    }, 800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] w-full animate-in fade-in duration-700">
      <style>{`
        @keyframes shimmer-slide {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
      `}</style>

      {/* Main Card Container */}
      <div className="relative p-12 bg-navy-900/60 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-[0_0_60px_rgba(0,0,0,0.6)] flex flex-col items-center max-w-md w-full overflow-hidden group">

        {/* Background Effects */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(222,253,65,0.03),transparent_70%)]"></div>
        <div className="absolute top-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
        <div className="absolute bottom-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

        {/* Central Reactor Loader */}
        <div className="relative w-32 h-32 mb-10 flex items-center justify-center">
          {/* Outer Spinning Ring */}
          <div className="absolute inset-0 rounded-full border border-white/5 border-t-accent/60 border-l-accent/20 animate-[spin_3s_linear_infinite]"></div>

          {/* Inner Counter-Spinning Ring */}
          <div className="absolute inset-4 rounded-full border border-white/5 border-b-accent border-r-accent/40 animate-[spin_2s_linear_infinite_reverse]"></div>

          {/* Pulsing Core */}
          <div className="absolute inset-0 m-auto w-12 h-12 bg-accent/10 rounded-full blur-md animate-pulse"></div>
          <div className="absolute inset-0 m-auto w-2 h-2 bg-accent rounded-full shadow-[0_0_20px_rgba(222,253,65,1)]"></div>

          {/* Orbiting Particle */}
          <div className="absolute inset-0 animate-[spin_4s_linear_infinite]">
            <div className="w-1.5 h-1.5 bg-white rounded-full absolute top-0 left-1/2 -translate-x-1/2 shadow-[0_0_10px_white]"></div>
          </div>
        </div>

        {/* Text Interface */}
        <div className="relative z-10 w-full text-center space-y-4">
          <h2 className="text-3xl font-black text-white tracking-tighter uppercase drop-shadow-lg">
            Generating
          </h2>

          {/* Typing Effect / Cycling Text */}
          <div className="h-6 flex items-center justify-center overflow-hidden">
            <span className="font-mono text-accent text-[10px] tracking-[0.25em] uppercase animate-pulse">
              {loadingSteps[step]}
            </span>
          </div>

          {/* High-Tech Progress Bar */}
          <div className="w-full h-1 bg-navy-950 rounded-full overflow-hidden relative mt-4">
            <div className="absolute inset-0 bg-accent/20 animate-pulse"></div>
            <div className="absolute top-0 left-0 h-full w-1/2 bg-accent blur-[2px]" style={{ animation: 'shimmer-slide 1.5s ease-in-out infinite' }}></div>
          </div>
        </div>

        {/* Technical Footer Data */}
        <div className="flex justify-between w-full mt-8 pt-6 border-t border-white/5 text-[9px] font-mono text-slate-600 uppercase tracking-widest">
          <span>SYS.ALLOC.MEM: 64TB</span>
          <span>GPU: ACTIVE</span>
        </div>

      </div>
    </div>
  );
};