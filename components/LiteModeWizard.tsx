import React, { useState } from 'react';
import { Button } from './Button';
import { DatabaseUser } from '../types';
import { AVAILABLE_ART_STYLES } from '../services/geminiService';

interface LiteModeWizardProps {
    // Global
    currentUser: DatabaseUser | null;
    isGenerating: boolean;

    // Upload & Paste
    uploadedImage: string | null;
    setUploadedImage: (img: string | null) => void;
    fileInputRef: React.RefObject<HTMLInputElement>;
    handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleDragOver: (e: React.DragEvent) => void;
    handleDragLeave: (e: React.DragEvent) => void;
    handleRemixDrop: (e: React.DragEvent) => void;
    handleRemixPaste: (e: React.ClipboardEvent) => void;
    isDragging: boolean;

    // Story Mode Styles & Lore + Create from text styles
    selectedStyles: string[];
    toggleStyle: (id: string) => void;
    selectAllStyles: () => void;
    customRemixNarrative: string;
    setCustomRemixNarrative: (val: string) => void;

    // Custom Mode Traits
    traitBaseImage: string | null;
    setTraitBaseImage: (img: string | null) => void;
    traitMode: 'mix' | 'scenes';
    setTraitMode: (mode: 'mix' | 'scenes') => void;
    traitsInput: string;
    setTraitsInput: (val: string) => void;

    // Create From Text Specific
    customInput: string;
    setCustomInput: (val: string) => void;
    handleGenerateFromCustomInput: () => void;

    // Actions
    handleGenerateFromUpload: () => void;
    handleGenerateTraits: () => void;
}

const STORY_EXAMPLES = [
    'photo_2026-02-25 16.36.28.jpeg', 'photo_2026-02-25 16.36.29.jpeg',
    'photo_2026-02-25 16.36.46.jpeg', 'photo_2026-02-25 16.36.51.jpeg',
    'photo_2026-02-25 16.36.55.jpeg', 'photo_2026-02-25 16.36.56.jpeg',
    'photo_2026-02-25 16.37.00.jpeg', 'photo_2026-02-25 16.37.02.jpeg',
    'photo_2026-02-25 16.37.05.jpeg',
];

const CUSTOM_EXAMPLES = [
    '11.jpeg', '12.jpeg', '13.jpeg', '14.jpeg', '15.jpeg',
    '16.jpeg', '17.jpeg', '18.jpeg', '19.jpeg',
];

export const LiteModeWizard: React.FC<LiteModeWizardProps> = ({
    currentUser,
    isGenerating,
    uploadedImage,
    setUploadedImage,
    fileInputRef,
    handleFileUpload,
    handleDragOver,
    handleDragLeave,
    handleRemixDrop,
    handleRemixPaste,
    isDragging,
    selectedStyles,
    toggleStyle,
    selectAllStyles,
    customRemixNarrative,
    setCustomRemixNarrative,
    traitBaseImage,
    setTraitBaseImage,
    traitMode,
    setTraitMode,
    traitsInput,
    setTraitsInput,
    customInput,
    setCustomInput,
    handleGenerateFromCustomInput,
    handleGenerateFromUpload,
    handleGenerateTraits
}) => {
    const [selectedLiteMode, setSelectedLiteMode] = useState<'story' | 'custom' | 'text'>('story');
    const [showExamples, setShowExamples] = useState(false);
    const [exampleCategory, setExampleCategory] = useState<'story' | 'custom'>('story');
    const [showLore, setShowLore] = useState(false);

    const handleModeSelect = (mode: 'story' | 'custom' | 'text') => {
        setSelectedLiteMode(mode);
        if (mode === 'custom' && uploadedImage) {
            setTraitBaseImage(uploadedImage);
        }
    };

    const needsImage = selectedLiteMode === 'story' || selectedLiteMode === 'custom';

    return (
        <div className="w-full max-w-7xl mx-auto flex flex-col relative animate-in fade-in zoom-in-95 duration-500 pb-20">
            {/* Split Panel Layout */}
            <div className="flex flex-col lg:flex-row gap-6 relative">

                {/* LEFT PANEL: UPLOAD ZONE (Sticky on Desktop) */}
                <div className="w-full lg:w-[400px] shrink-0">
                    <div className="lg:sticky lg:top-28">
                        <div className="bg-[#0B1221] border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden flex flex-col">
                            {/* Decorative background glow */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full blur-[100px] pointer-events-none"></div>

                            <div className="flex items-center justify-between mb-6 z-10 relative">
                                <h3 className="text-xl font-black text-white uppercase tracking-tight">Image Base</h3>
                                {needsImage ? (
                                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-widest ${uploadedImage ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-orange-500/20 text-orange-400 border border-orange-500/30 animate-pulse'}`}>
                                        {uploadedImage ? 'Ready' : 'Required'}
                                    </span>
                                ) : (
                                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-widest bg-slate-500/20 text-slate-400 border border-slate-500/30">
                                        Not Required
                                    </span>
                                )}
                            </div>

                            <div
                                onClick={selectedLiteMode === 'text' ? undefined : () => fileInputRef.current?.click()}
                                onDragOver={selectedLiteMode === 'text' ? undefined : handleDragOver}
                                onDragLeave={selectedLiteMode === 'text' ? undefined : handleDragLeave}
                                onDrop={selectedLiteMode === 'text' ? undefined : handleRemixDrop}
                                onPaste={selectedLiteMode === 'text' ? undefined : handleRemixPaste}
                                className={`relative w-full aspect-square border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-6 transition-all duration-300 ${selectedLiteMode !== 'text' ? 'cursor-pointer' : 'cursor-default'} group lite-upload-zone overflow-hidden focus:outline-none z-10
                            ${uploadedImage && selectedLiteMode !== 'text' ? 'border-accent/50 bg-accent/5' : ''}
                            ${!uploadedImage && !isDragging && selectedLiteMode !== 'text' ? 'border-white/10 bg-black/40 hover:border-accent/40 hover:bg-accent/5' : ''}
                            ${isDragging && selectedLiteMode !== 'text' ? 'border-accent bg-accent/10 scale-[1.02] shadow-[0_0_40px_rgba(222,253,65,0.15)]' : ''}
                            ${selectedLiteMode === 'text' ? 'border-white/5 bg-black/30' : ''}
                        `}
                                tabIndex={0}
                            >
                                {selectedLiteMode === 'text' ? (
                                    <div className="flex flex-col items-center justify-center">
                                        <div className="w-16 h-16 rounded-full bg-black/50 border border-white/10 flex items-center justify-center mb-4 text-slate-500">
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        </div>
                                        <h3 className="text-sm font-black uppercase tracking-widest mb-2 text-white">
                                            No Image Required
                                        </h3>
                                        <p className="text-[10px] text-slate-500 font-medium max-w-[200px] text-center uppercase tracking-wider">
                                            This mode generates completely from text
                                        </p>
                                    </div>
                                ) : uploadedImage ? (
                                    <div className="absolute inset-3 rounded-xl overflow-hidden bg-black/50 border border-white/5">
                                        <img src={uploadedImage} alt="Uploaded base" className="w-full h-full object-contain animate-in zoom-in duration-300" />
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setUploadedImage(null); }}
                                            className="absolute top-3 right-3 bg-red-500/80 hover:bg-red-500 text-white p-2 rounded-full shadow-lg backdrop-blur-md transition-all z-20 hover:scale-110"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none"></div>
                                        <div className="absolute bottom-3 left-3 text-left pointer-events-none">
                                            <div className="text-[10px] text-slate-300 font-bold uppercase tracking-wider flex items-center gap-1.5 opacity-80">
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                                Click to replace
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className={`w-16 h-16 rounded-full bg-black/50 border border-white/10 flex items-center justify-center mb-4 float-icon transition-colors ${isDragging ? 'text-accent border-accent/30 bg-accent/10' : 'text-slate-500 group-hover:text-accent group-hover:border-accent/30 group-hover:bg-accent/10'}`}>
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                        </div>
                                        <h3 className={`text-sm font-black uppercase tracking-widest mb-2 transition-colors text-center ${isDragging ? 'text-accent' : 'text-white'}`}>
                                            {isDragging ? 'Drop Image Here' : 'Click, Paste or Drag & Drop'}
                                        </h3>
                                        <p className="text-[10px] text-slate-500 font-medium max-w-[200px] text-center uppercase tracking-wider">
                                            Clear character subjects work best
                                        </p>
                                    </>
                                )}
                                {selectedLiteMode !== 'text' && (
                                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT PANEL: CONTROLS */}
                <div className="flex-1 min-w-0">
                    <div className="bg-[#0B1221] border border-white/10 rounded-3xl shadow-2xl relative overflow-hidden flex flex-col h-full">
                        {/* Decorative background glow based on mode */}
                        {selectedLiteMode === 'story' && <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[150px] pointer-events-none transition-all duration-700"></div>}
                        {selectedLiteMode === 'custom' && <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-orange-500/10 rounded-full blur-[150px] pointer-events-none transition-all duration-700"></div>}
                        {selectedLiteMode === 'text' && <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-accent/5 rounded-full blur-[150px] pointer-events-none transition-all duration-700"></div>}

                        <div className="p-6 md:p-8 flex flex-col h-full z-10 relative">

                            {/* Mode Selection Tabs */}
                            <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/10 mb-8 relative">
                                <button onClick={() => handleModeSelect('story')} className={`relative z-10 flex-1 py-3 text-xs md:text-sm font-black rounded-xl transition-all duration-300 uppercase tracking-widest flex items-center justify-center gap-2 ${selectedLiteMode === 'story' ? 'text-white drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]' : 'text-slate-500 hover:text-slate-300'}`}>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                    <span className="hidden sm:inline">Story Mode</span>
                                    <span className="inline sm:hidden">Story</span>
                                </button>
                                <button onClick={() => handleModeSelect('custom')} className={`relative z-10 flex-1 py-3 text-xs md:text-sm font-black rounded-xl transition-all duration-300 uppercase tracking-widest flex items-center justify-center gap-2 ${selectedLiteMode === 'custom' ? 'text-white drop-shadow-[0_0_8px_rgba(249,115,22,0.6)]' : 'text-slate-500 hover:text-slate-300'}`}>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                                    <span className="hidden sm:inline">Custom Mode</span>
                                    <span className="inline sm:hidden">Custom</span>
                                </button>
                                <button onClick={() => handleModeSelect('text')} className={`relative z-10 flex-1 py-3 text-xs md:text-sm font-black rounded-xl transition-all duration-300 uppercase tracking-widest flex items-center justify-center gap-2 ${selectedLiteMode === 'text' ? 'text-black drop-shadow-[0_0_8px_rgba(222,253,65,0.6)]' : 'text-slate-500 hover:text-slate-300'}`}>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                    <span className="hidden sm:inline">Create New</span>
                                    <span className="inline sm:hidden">New</span>
                                </button>
                                {/* Animated Pill Background */}
                                <div className="absolute inset-1.5 transition-all duration-500 ease-out pointer-events-none flex" style={{
                                    left: selectedLiteMode === 'story' ? '6px' : (selectedLiteMode === 'custom' ? '33.33%' : '66.66%'),
                                    right: selectedLiteMode === 'story' ? '66.66%' : (selectedLiteMode === 'custom' ? '33.33%' : '6px')
                                }}>
                                    <div className={`w-full h-full rounded-xl transition-all duration-500 shadow-lg ${selectedLiteMode === 'story' ? 'bg-blue-600 shadow-blue-600/30' : selectedLiteMode === 'custom' ? 'bg-orange-500 shadow-orange-500/30' : 'bg-accent shadow-accent/30'}`}></div>
                                </div>
                            </div>

                            {/* MODE SPECIFIC CONTENT */}

                            {/* ================= STORY MODE ================= */}
                            {selectedLiteMode === 'story' && (
                                <div className="flex flex-col flex-1 animate-in slide-in-from-right-4 duration-300">
                                    <div className="mb-6">
                                        <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-2">Automated <span className="text-blue-500">Scenes</span></h2>
                                        <p className="text-sm text-slate-400">Generate diverse environments and compositions automatically while retaining your mascot's core identity.</p>
                                    </div>

                                    {/* Art Styles Selection */}
                                    <div className="bg-black/30 border border-white/5 rounded-2xl p-5 mb-6">
                                        <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-3">
                                            <div className="flex items-center gap-3">
                                                <h3 className="text-sm font-black text-white uppercase tracking-widest">Select Art Styles</h3>
                                                {selectedStyles.length > 0 && (
                                                    <span className="bg-blue-500/20 border border-blue-500/30 text-blue-400 text-[9px] font-black px-2 py-0.5 rounded-full uppercase">
                                                        {selectedStyles.length} Selected
                                                    </span>
                                                )}
                                            </div>
                                            <button onClick={selectAllStyles} className="text-[10px] font-bold text-slate-400 hover:text-white uppercase transition-colors flex items-center gap-1.5">
                                                {selectedStyles.length === AVAILABLE_ART_STYLES.length ? "Deselect All" : "Select All"}
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                            {AVAILABLE_ART_STYLES.map((style, idx) => {
                                                const isSelected = selectedStyles.includes(style.id);
                                                return (
                                                    <button
                                                        key={style.id}
                                                        onClick={() => toggleStyle(style.id)}
                                                        className={`
                                                        group relative h-[72px] p-3 rounded-xl border transition-all duration-300 text-left overflow-hidden flex flex-col justify-between
                                                        ${isSelected
                                                                ? 'bg-blue-600 border-blue-400 shadow-[0_0_20px_rgba(37,99,235,0.4)] scale-[1.02] z-10'
                                                                : 'bg-black/50 border-white/10 text-slate-400 hover:border-blue-500/50 hover:bg-black'
                                                            }
                                                    `}
                                                    >
                                                        {isSelected && <div className="absolute inset-0 bg-gradient-to-tr from-blue-700 to-blue-500 opacity-50 z-0"></div>}
                                                        <div className="flex justify-between items-start z-10 w-full mb-1">
                                                            <span className={`text-[9px] font-mono leading-none ${isSelected ? 'text-white/70' : 'text-slate-600'}`}>0{idx + 1}</span>
                                                            <div className="flex items-center gap-1.5">
                                                                {style.id === 'original' && (
                                                                    <div className="w-3 h-3 rounded-full bg-[#DEFD41] flex items-center justify-center shadow-[0_0_10px_rgba(222,253,65,0.4)]" title="Highly Recommended">
                                                                        <svg className="w-2 h-2 text-black" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l2.4 7.2h7.6l-6 4.8 2.4 7.2-6-4.8-6 4.8 2.4-7.2-6-4.8h7.6z" /></svg>
                                                                    </div>
                                                                )}
                                                                {isSelected && (
                                                                    <div className="w-3.5 h-3.5 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center animate-in zoom-in duration-200">
                                                                        <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="z-10">
                                                            <span className={`text-[11px] font-black uppercase tracking-tight leading-none block line-clamp-1 ${isSelected ? 'text-white drop-shadow-md' : 'text-slate-300'}`}>
                                                                {style.name}
                                                            </span>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Optional Lore Input Component */}
                                    <div className="mb-8">
                                        <div onClick={() => setShowLore(!showLore)} className="cursor-pointer bg-black/30 border border-white/5 rounded-xl p-4 hover:border-blue-500/30 transition-all group">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                    </div>
                                                    <div>
                                                        <div className="text-[11px] font-black text-white tracking-widest uppercase">Context & Lore (Optional)</div>
                                                        <div className="text-[10px] text-slate-500 font-medium mt-0.5">Provide context or details about the character for significantly better results</div>
                                                    </div>
                                                </div>
                                                <svg className={`w-5 h-5 transition-transform ${showLore ? 'rotate-180 text-blue-400' : 'text-slate-600 group-hover:text-blue-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                            </div>
                                        </div>
                                        {showLore && (
                                            <div className="mt-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                                <textarea
                                                    placeholder="Describe the character, their backstory, narrative or how you want them portrayed..."
                                                    value={customRemixNarrative}
                                                    onChange={e => setCustomRemixNarrative(e.target.value)}
                                                    className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-sm text-slate-200 placeholder:text-slate-600 focus:border-blue-500 outline-none resize-none leading-relaxed transition-colors shadow-inner font-mono h-24"
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {/* GENERATE BUTTON */}
                                    <div className="mt-auto">
                                        <Button
                                            onClick={handleGenerateFromUpload}
                                            disabled={!uploadedImage || selectedStyles.length === 0 || isGenerating || (!currentUser?.can_use_art && !currentUser?.is_admin)}
                                            className={`w-full py-5 text-sm md:text-base font-black tracking-widest shadow-2xl transition-all duration-300 ${uploadedImage && selectedStyles.length > 0 && !isGenerating ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_30px_rgba(37,99,235,0.4)] hover:-translate-y-1' : 'bg-white/5 text-slate-600 border border-white/10'}`}
                                            icon={isGenerating ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : undefined}
                                        >
                                            {isGenerating ? 'GENERATING...' : 'GENERATE ARTS'}
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* ================= CUSTOM MODE ================= */}
                            {selectedLiteMode === 'custom' && (
                                <div className="flex flex-col flex-1 animate-in slide-in-from-right-4 duration-300">
                                    <div className="mb-6 flex justify-between items-end gap-4">
                                        <div>
                                            <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-2">Targeted <span className="text-orange-500">Prompts</span></h2>
                                            <p className="text-sm text-slate-400">Use text commands to modify the character. Choose 'Mix Mode' for creating trait combinations, or 'Scenes Mode' to define explicit scenes line by line.</p>
                                        </div>
                                    </div>

                                    <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/10 mb-6 w-full md:max-w-xs">
                                        <button onClick={() => setTraitMode('mix')} className={`flex-1 py-2.5 text-[10px] sm:text-[11px] font-black rounded-xl transition-all uppercase tracking-widest ${traitMode === 'mix' ? 'bg-orange-500 text-black shadow-lg shadow-orange-900/30' : 'text-slate-500 hover:text-white'}`}>Mix Mode</button>
                                        <button onClick={() => setTraitMode('scenes')} className={`flex-1 py-2.5 text-[10px] sm:text-[11px] font-black rounded-xl transition-all uppercase tracking-widest ${traitMode === 'scenes' ? 'bg-orange-500 text-black shadow-lg shadow-orange-900/30' : 'text-slate-500 hover:text-white'}`}>Scenes Mode</button>
                                    </div>

                                    <div className="flex flex-col group/terminal bg-[#070A10] border border-white/10 focus-within:border-orange-500/50 rounded-2xl overflow-hidden mb-6 transition-colors shadow-inner flex-1 min-h-[220px]">
                                        <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/10">
                                            <span className="text-[9px] font-black text-orange-400 uppercase tracking-widest flex items-center gap-2">
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                                {traitMode === 'mix' ? 'Combinator Input' : 'Sequencer Input'}
                                            </span>
                                        </div>
                                        <textarea
                                            value={traitsInput}
                                            onChange={(e) => setTraitsInput(e.target.value)}
                                            placeholder={traitMode === 'mix'
                                                ? "Example:\nhat: blue hat, solana hat\nskin: red, green\neyes: laser eyes, tired eyes\n\n(AI will mix these automatically)"
                                                : "Example:\nScene 1: wearing a black suit and sunglasses, rainy day\nScene 2: driving a red sports car, neon city\n\n(Each line generates a distinct image)"}
                                            className="w-full bg-transparent p-4 md:p-5 text-sm md:text-base text-orange-50 placeholder:text-slate-700 outline-none resize-none h-full font-mono leading-relaxed"
                                        />
                                    </div>

                                    {/* GENERATE BUTTON */}
                                    <div className="mt-auto">
                                        <Button
                                            onClick={handleGenerateTraits}
                                            disabled={!uploadedImage || !traitsInput.trim() || isGenerating || (!currentUser?.can_use_art && !currentUser?.is_admin)}
                                            className={`w-full py-5 text-sm md:text-base font-black tracking-widest shadow-xl transition-all duration-300 ${uploadedImage && traitsInput.trim() && !isGenerating ? 'bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-black shadow-[0_0_30px_rgba(249,115,22,0.4)] hover:-translate-y-1' : 'bg-white/5 text-slate-600 border border-white/10'}`}
                                            icon={isGenerating ? <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : undefined}
                                        >
                                            {isGenerating ? 'GENERATING MODIFICATIONS...' : 'GENERATE CUSTOM MODIFICATIONS'}
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* ================= TEXT MODE ================= */}
                            {selectedLiteMode === 'text' && (
                                <div className="flex flex-col flex-1 animate-in slide-in-from-right-4 duration-300">
                                    <div className="mb-6">
                                        <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-2">Create From <span className="text-accent">Text</span></h2>
                                        <p className="text-sm text-slate-400">Describe your concept completely in text.</p>
                                    </div>

                                    <div className="relative group/input mb-6 z-20">
                                        <textarea
                                            value={customInput}
                                            onChange={(e) => setCustomInput(e.target.value)}
                                            placeholder="Describe your character concept, environment, and style in detail..."
                                            className="relative w-full bg-[#0A0A0A] border border-white/10 focus:border-accent/80 rounded-2xl p-4 md:p-5 text-sm md:text-base text-accent placeholder:text-slate-700 outline-none min-h-[140px] resize-none leading-relaxed font-mono transition-colors shadow-inner"
                                        />
                                    </div>

                                    {/* Art Styles Selection */}
                                    <div className="bg-black/30 border border-white/5 rounded-2xl p-5 mb-8 z-10">
                                        <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-3">
                                            <div className="flex items-center gap-3">
                                                <h3 className="text-sm font-black text-white uppercase tracking-widest">Select Art Styles</h3>
                                                {selectedStyles.length > 0 && (
                                                    <span className="bg-accent/20 border border-accent/30 text-accent text-[9px] font-black px-2 py-0.5 rounded-full uppercase">
                                                        {selectedStyles.length} Selected
                                                    </span>
                                                )}
                                            </div>
                                            <button onClick={selectAllStyles} className="text-[10px] font-bold text-slate-400 hover:text-white uppercase transition-colors flex items-center gap-1.5">
                                                {selectedStyles.length === AVAILABLE_ART_STYLES.length ? "Deselect All" : "Select All"}
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                            {AVAILABLE_ART_STYLES.map((style, idx) => {
                                                const isSelected = selectedStyles.includes(style.id);
                                                return (
                                                    <button
                                                        key={style.id}
                                                        onClick={() => toggleStyle(style.id)}
                                                        className={`
                                                        group relative h-[72px] p-3 rounded-xl border transition-all duration-300 text-left overflow-hidden flex flex-col justify-between
                                                        ${isSelected
                                                                ? 'bg-accent/20 border-accent shadow-[0_0_20px_rgba(222,253,65,0.2)] scale-[1.02] z-10'
                                                                : 'bg-black/50 border-white/10 text-slate-400 hover:border-accent/40 hover:bg-black'
                                                            }
                                                    `}
                                                    >
                                                        {isSelected && <div className="absolute inset-0 bg-gradient-to-tr from-accent to-lime-300 opacity-10 z-0"></div>}
                                                        <div className="flex justify-between items-start z-10 w-full mb-1">
                                                            <span className={`text-[9px] font-mono leading-none ${isSelected ? 'text-accent/70' : 'text-slate-600'}`}>0{idx + 1}</span>
                                                            <div className="flex items-center gap-1.5">
                                                                {style.id === 'original' && (
                                                                    <div className="w-3 h-3 rounded-full bg-[#DEFD41] flex items-center justify-center shadow-[0_0_10px_rgba(222,253,65,0.4)]" title="Highly Recommended">
                                                                        <svg className="w-2 h-2 text-black" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l2.4 7.2h7.6l-6 4.8 2.4 7.2-6-4.8-6 4.8 2.4-7.2-6-4.8h7.6z" /></svg>
                                                                    </div>
                                                                )}
                                                                {isSelected && (
                                                                    <div className="w-3.5 h-3.5 rounded-full bg-accent flex items-center justify-center animate-in zoom-in duration-200 shadow-md">
                                                                        <svg className="w-2.5 h-2.5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="z-10">
                                                            <span className={`text-[11px] font-black uppercase tracking-tight leading-none block line-clamp-1 ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                                                                {style.name}
                                                            </span>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* GENERATE BUTTON */}
                                    <div className="mt-auto">
                                        <Button
                                            onClick={handleGenerateFromCustomInput}
                                            disabled={!customInput.trim() || selectedStyles.length === 0 || isGenerating || (!currentUser?.can_use_art && !currentUser?.is_admin)}
                                            className={`w-full py-5 text-sm md:text-base font-black tracking-widest shadow-2xl transition-all duration-300 ${customInput.trim() && selectedStyles.length > 0 && !isGenerating ? 'bg-accent text-black hover:bg-accent/90 shadow-[0_0_30px_rgba(222,253,65,0.3)] hover:-translate-y-1' : 'bg-white/5 text-slate-600 border border-white/10'}`}
                                            icon={isGenerating ? <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : undefined}
                                        >
                                            {isGenerating ? 'GENERATING...' : 'GENERATE A MASCOT'}
                                        </Button>
                                    </div>
                                </div>
                            )}

                        </div>
                    </div>
                </div>
            </div>

            {/* EXAMPLES GALLERY TOGGLE & PANEL */}
            <div className="flex flex-col items-center mt-12 w-full">
                <button
                    onClick={() => setShowExamples(!showExamples)}
                    className="group flex items-center gap-2 px-6 py-2.5 rounded-full border border-white/10 bg-black/40 hover:bg-white/5 hover:border-white/30 text-xs font-bold uppercase tracking-widest text-slate-300 transition-all shadow-lg hover:-translate-y-1 relative overflow-hidden"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-white/5 to-orange-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <span className="relative z-10">Examples Gallery</span>
                    <svg className={`w-4 h-4 text-slate-400 group-hover:text-white transition-all transform relative z-10 ${showExamples ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </button>

                {showExamples && (
                    <div className="w-full mt-6 bg-[#0B1221] border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl animate-in fade-in slide-in-from-top-4 duration-500">
                        <div className="flex flex-col md:flex-row gap-6 lg:gap-8">
                            {/* Left Panel: Main Mascot Preview */}
                            <div className="w-full md:w-1/3 flex flex-col gap-4">
                                <div className="bg-[#070A10] border border-white/10 rounded-2xl p-4 md:p-6 shadow-inner flex flex-col items-center flex-1">
                                    <div className="w-full aspect-square md:aspect-auto md:h-64 rounded-xl overflow-hidden bg-black/50 border border-white/20 shadow-2xl relative mb-6">
                                        <div className="absolute inset-x-0 bottom-0 top-1/2 bg-gradient-to-t from-black/80 to-transparent z-10"></div>
                                        <img src={`/${exampleCategory === 'story' ? 'remix_images' : 'slider_images'}/main.jpeg`} alt="Main Mascot Source" className="w-full h-full object-cover relative z-0" loading="lazy" />
                                        <div className="absolute bottom-4 left-4 z-20">
                                            <div className="text-[10px] font-bold text-accent uppercase tracking-widest mb-1 drop-shadow-md">Source Character</div>
                                            <h4 className="text-lg font-black text-white leading-tight drop-shadow-md">Main Mascot</h4>
                                        </div>
                                    </div>
                                    <p className="text-xs text-slate-400 leading-relaxed text-center mb-6">
                                        This mascot was used to generate all the <strong className="text-white">{exampleCategory === 'story' ? 'Story Mode' : 'Custom Mode'}</strong> examples shown. Note how the core identity gets preserved.
                                    </p>
                                </div>
                            </div>

                            {/* Right Panel: Scrollable Grid */}
                            <div className="w-full md:w-2/3 flex flex-col h-[400px] md:h-auto overflow-hidden pr-2 pb-2">
                                {/* Mode Toggle at top center */}
                                <div className="flex justify-center mb-6 shrink-0">
                                    <div className="bg-black/60 p-1.5 rounded-full border border-white/10 flex items-center relative w-full max-w-xs md:max-w-sm">
                                        <button onClick={() => setExampleCategory('story')} className={`relative flex-1 z-10 py-2.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all duration-300 ${exampleCategory === 'story' ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}>Story Mode</button>
                                        <button onClick={() => setExampleCategory('custom')} className={`relative flex-1 z-10 py-2.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all duration-300 ${exampleCategory === 'custom' ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}>Custom Mode</button>
                                        <div className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] rounded-full transition-all duration-300 ease-out ${exampleCategory === 'story' ? 'bg-blue-500/40 left-1.5' : 'bg-orange-500/40 left-1/2 ml-1.5'}`}></div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 overflow-y-auto custom-scrollbar flex-1 pb-4 pr-2">
                                    {(exampleCategory === 'story' ? STORY_EXAMPLES : CUSTOM_EXAMPLES).map((img, idx) => (
                                        <div key={idx} className="aspect-square rounded-xl overflow-hidden bg-black/50 border border-white/5 group relative shadow-md">
                                            <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none mix-blend-overlay ${exampleCategory === 'story' ? 'bg-blue-500/30' : 'bg-orange-500/30'}`}></div>
                                            <img src={`/${exampleCategory === 'story' ? 'remix_images' : 'slider_images'}/${img}`} alt={`Example ${idx}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out" loading="lazy" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

        </div>
    );
};
