
import React, { useState } from 'react';
import { Mascot } from '../types';
import { Button } from './Button';
import saveAs from 'file-saver';
import { AVAILABLE_ART_STYLES } from '../services/geminiService';

interface GenerationConfig {
    count: number;
    includeDex: boolean;
    includeXComm: boolean;
    models: string[];
    aspectRatio: string;
}

interface MascotCardProps {
  mascot: Mascot;
  onSelect?: (mascot: Mascot) => void;
  onImageClick?: (mascot: Mascot) => void;
  onGenerateScenes?: (mascotId: string, config: GenerationConfig) => void;
  onEdit?: (mascot: Mascot) => void;
  isGenerating?: boolean;
}

const COUNTS = [0, 2, 4];
const ASPECT_RATIOS = ["1:1", "3:4"];

export const MascotCard: React.FC<MascotCardProps> = ({ mascot, onSelect, onImageClick, onGenerateScenes, onEdit, isGenerating = false }) => {
  const isLoading = mascot.imageUrl === "LOADING";
  const isFlash = mascot.modelUsed?.includes('flash');

  // Generation Configuration State
  const [count, setCount] = useState(2);
  const [includeDex, setIncludeDex] = useState(false);
  const [includeXComm, setIncludeXComm] = useState(false);
  const [selectedModels, setSelectedModels] = useState<string[]>(['pro']);
  const [manualCount, setManualCount] = useState<string>("");
  const [aspectRatio, setAspectRatio] = useState("1:1");

  const handleManualCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setManualCount(val);
      const parsed = parseInt(val);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 50) {
          setCount(parsed);
      }
  };

  const toggleModel = (model: string) => {
      setSelectedModels(prev => 
        prev.includes(model) 
            ? prev.filter(m => m !== model) 
            : [...prev, model]
      );
  };

  const handleGenerateClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (onGenerateScenes) {
          onGenerateScenes(mascot.id, {
              count,
              includeDex,
              includeXComm,
              models: selectedModels,
              aspectRatio
          });
      }
  };

  const handleDownloadMain = (e: React.MouseEvent) => {
      e.stopPropagation();
      const safeName = mascot.name.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'mascot';
      // Determine extension based on data URI or default to png
      let ext = 'png';
      if (mascot.imageUrl.includes('image/jpeg')) ext = 'jpg';
      if (mascot.imageUrl.includes('image/webp')) ext = 'webp';
      
      saveAs(mascot.imageUrl, `${safeName}_main.${ext}`);
  };

  // Format the art style for the badge
  const displayStyle = React.useMemo(() => {
    // 1. Try to find the exact official name from the ID
    if (mascot.styleId) {
        const styleDef = AVAILABLE_ART_STYLES.find(s => s.id === mascot.styleId);
        if (styleDef) return styleDef.name;
    }
    // 2. Fallback to cleaning the string provided by AI
    const s = mascot.artStyle.split(',')[0].trim();
    return s.length > 18 ? s.substring(0, 16) + '..' : s;
  }, [mascot.artStyle, mascot.styleId]);

  return (
    <div className="group relative flex flex-col h-full bg-navy-900 border border-white/5 rounded-xl overflow-hidden transition-all duration-300 hover:border-accent/40 hover:shadow-[0_0_20px_rgba(222,253,65,0.05)]">
      
      {/* Image Container */}
      <div 
        className="relative aspect-square w-full overflow-hidden bg-navy-950 cursor-pointer"
        onClick={() => !isLoading && onImageClick && onImageClick(mascot)}
      >
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full w-full">
             <div className="w-8 h-8 border-2 border-accent/20 border-t-accent rounded-full animate-spin mb-2"></div>
             <span className="text-[10px] font-mono text-accent animate-pulse tracking-widest uppercase">Rendering...</span>
          </div>
        ) : (
          <>
            <img 
              src={mascot.imageUrl} 
              alt={mascot.name} 
              className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 ${isGenerating ? 'blur-sm grayscale' : ''}`} 
            />
            
            {/* Overlay Gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-navy-900 via-transparent to-transparent opacity-60 group-hover:opacity-90 transition-opacity" />

            {/* Top Badges */}
            <div className="absolute top-2 left-2 flex gap-1">
                {isFlash && (
                    <span className="bg-yellow-500 text-black text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider shadow-lg">
                        ⚡
                    </span>
                )}
            </div>

            <div className="absolute top-2 right-2 z-20 flex gap-2">
                 <span className="bg-black/80 backdrop-blur-md border border-white/20 text-white text-[10px] px-2 py-1 rounded font-black uppercase tracking-wider shadow-lg">
                    {displayStyle}
                 </span>
            </div>
            
            {/* Edit Button (Visible on Hover) */}
            <button 
                onClick={(e) => { e.stopPropagation(); onEdit && onEdit(mascot); }}
                className="absolute top-8 right-2 z-20 bg-white/90 text-black p-1.5 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:scale-110 hover:bg-white"
                title="Edit Mascot Image"
            >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
            </button>

            {/* Generation Overlay (Expanded & Reordered) */}
            {!isGenerating && (
                <div className="absolute inset-0 flex flex-col justify-end p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300 bg-gradient-to-t from-navy-950 via-navy-900/98 to-transparent z-10">
                    <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                        
                        {/* Row 1: Aspect Ratio */}
                        <div className="flex gap-2">
                           {ASPECT_RATIOS.map(ratio => (
                               <button 
                                  key={ratio} onClick={() => setAspectRatio(ratio)}
                                  className={`flex-1 text-[10px] py-2 rounded-md border font-bold uppercase transition-colors ${aspectRatio === ratio ? 'bg-white text-black border-white' : 'bg-black/50 border-white/10 text-slate-400 hover:text-white'}`}
                               >
                                   {ratio}
                               </button>
                           ))}
                        </div>

                        {/* Row 2: Model Selection */}
                        <div className="flex gap-2">
                           {['pro', 'basic'].map(m => (
                               <button 
                                  key={m} onClick={() => toggleModel(m)}
                                  className={`flex-1 text-[10px] py-2 rounded-md border font-bold uppercase transition-colors ${selectedModels.includes(m) ? 'bg-accent text-black border-accent' : 'bg-black/50 border-white/10 text-slate-400 hover:text-white'}`}
                               >
                                   {m === 'basic' ? 'BASIC' : 'PRO'}
                               </button>
                           ))}
                        </div>

                        {/* Row 3: Count + Large Input */}
                        <div className="flex gap-2 h-10">
                            {COUNTS.map(c => (
                                <button 
                                   key={c} onClick={() => { setCount(c); setManualCount(""); }}
                                   className={`flex-1 text-xs rounded-md border font-bold transition-colors ${count === c && manualCount === "" ? 'bg-white text-black border-white' : 'bg-black/50 border-white/10 text-slate-400 hover:text-white'}`}
                                >
                                    {c}
                                </button>
                            ))}
                            <input 
                               type="text" placeholder="#" value={manualCount} onChange={handleManualCountChange}
                               className={`w-14 text-sm text-center bg-black/50 border rounded-md outline-none focus:border-accent text-white font-bold ${manualCount !== "" ? 'border-accent text-accent' : 'border-white/10'}`}
                            />
                        </div>

                        {/* Row 4: Banners */}
                        <div className="flex gap-2">
                            <div 
                                onClick={() => setIncludeDex(!includeDex)}
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md border cursor-pointer transition-colors ${includeDex ? 'bg-purple-500/20 border-purple-500' : 'bg-black/50 border-white/10 hover:border-white/30'}`}
                            >
                                <div className={`w-3 h-3 rounded-[1px] border ${includeDex ? 'bg-purple-500 border-purple-500' : 'border-slate-600'}`}></div>
                                <span className="text-[10px] font-bold text-white uppercase">Dex Banner</span>
                            </div>
                            <div 
                                onClick={() => setIncludeXComm(!includeXComm)}
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md border cursor-pointer transition-colors ${includeXComm ? 'bg-blue-500/20 border-blue-500' : 'bg-black/50 border-white/10 hover:border-white/30'}`}
                            >
                                <div className={`w-3 h-3 rounded-[1px] border ${includeXComm ? 'bg-blue-500 border-blue-500' : 'border-slate-600'}`}></div>
                                <span className="text-[10px] font-bold text-white uppercase">X Banner</span>
                            </div>
                        </div>

                        {/* Generate Button */}
                        <Button 
                            onClick={handleGenerateClick}
                            disabled={(count === 0 && !includeDex && !includeXComm) || selectedModels.length === 0}
                            size="md"
                            className="w-full font-black tracking-widest text-xs h-11 shadow-lg"
                        >
                            GENERATE SCENES
                        </Button>
                    </div>
                </div>
            )}
            
            {/* Loading Overlay */}
            {isGenerating && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm z-20">
                    <div className="w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin mb-2"></div>
                    <span className="text-[8px] font-mono text-accent animate-pulse uppercase tracking-widest bg-black/80 px-2 py-0.5 rounded">Working...</span>
                </div>
            )}
          </>
        )}
      </div>

      {/* Content Body (Compact) */}
      <div className="flex flex-col flex-1 p-4 bg-navy-900 z-20 relative">
          <div className="mb-2">
             <div className="flex items-center gap-2 mb-1.5">
                 {mascot.ticker && !isLoading && (
                     <span className="text-[10px] font-mono font-bold text-accent bg-accent/10 px-1.5 py-0.5 rounded border border-accent/20 leading-none">
                         {mascot.ticker}
                     </span>
                 )}
             </div>
             <h3 className="text-base font-black text-white leading-tight group-hover:text-accent transition-colors tracking-tight truncate">
                {isLoading ? <div className="h-5 w-3/4 bg-navy-800 rounded animate-pulse"/> : mascot.name}
             </h3>
          </div>

          <p className="text-[11px] text-slate-400 font-medium leading-relaxed line-clamp-2 mb-3">
             {isLoading ? (
                 <div className="space-y-1 mt-1">
                     <div className="h-2 w-full bg-navy-800 rounded animate-pulse"/>
                     <div className="h-2 w-5/6 bg-navy-800 rounded animate-pulse"/>
                 </div>
             ) : mascot.narrative}
          </p>
          
          <div className="mt-auto pt-3 border-t border-white/5 flex items-center justify-between">
              {!isLoading && (
                  <>
                    <button 
                        onClick={handleDownloadMain}
                        className="text-[10px] font-bold text-slate-500 hover:text-accent transition-colors uppercase tracking-wider flex items-center gap-1.5 group/dl"
                        title="Download Main Image"
                    >
                        <svg className="w-3.5 h-3.5 group-hover/dl:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        Save
                    </button>

                    <span onClick={(e) => { e.stopPropagation(); onSelect && onSelect(mascot); }} className="text-[11px] font-bold text-slate-500 hover:text-white transition-colors cursor-pointer uppercase tracking-wider flex items-center gap-1.5">
                       Details <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                    </span>
                  </>
              )}
          </div>
      </div>
    </div>
  );
};
