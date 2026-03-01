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
    const [wizardStep, setWizardStep] = useState<'upload' | 'choose-mode' | 'configure' | 'create-from-text'>('upload');
    const [selectedLiteMode, setSelectedLiteMode] = useState<'story' | 'custom' | null>(null);
    const [showExamplesInline, setShowExamplesInline] = useState(false);
    const [exampleCategory, setExampleCategory] = useState<'story' | 'custom'>('story');
    const [showLore, setShowLore] = useState(false);

    const goToStep2 = () => {
        if (uploadedImage) {
            setWizardStep('choose-mode');
        }
    };

    const handleModeSelect = (mode: 'story' | 'custom') => {
        setSelectedLiteMode(mode);
        setWizardStep('configure');

        if (mode === 'custom' && uploadedImage) {
            setTraitBaseImage(uploadedImage);
        }
    };

    return (
        <div className="w-full max-w-4xl mx-auto min-h-[500px] flex flex-col relative animate-in fade-in zoom-in-95 duration-500">
            {/* Step Container */}
            <div className="bg-[#0B1221] border border-white/10 rounded-3xl p-6 md:p-10 shadow-2xl relative overflow-hidden form-step-container">

                {/* Subtle grid background */}
                <div className="absolute inset-0 bg-[radial-gradient(#ffffff04_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none"></div>
                {(wizardStep === 'upload' || wizardStep === 'choose-mode' || wizardStep === 'create-from-text') && <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-accent/5 rounded-full blur-[150px] pointer-events-none"></div>}
                {wizardStep === 'configure' && selectedLiteMode === 'story' && <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[150px] pointer-events-none"></div>}
                {wizardStep === 'configure' && selectedLiteMode === 'custom' && <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-orange-500/10 rounded-full blur-[150px] pointer-events-none"></div>}

                {/* Wizard Header Progress */}
                <div className="flex items-center justify-between mb-8 relative z-10">
                    <div className="flex items-center gap-3">
                        {wizardStep !== 'upload' && (
                            <button
                                onClick={() => {
                                    if (wizardStep === 'configure') setWizardStep('choose-mode');
                                    else if (wizardStep === 'choose-mode') setWizardStep('upload');
                                    else if (wizardStep === 'create-from-text') setWizardStep('upload');
                                }}
                                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                            </button>
                        )}
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1.5">
                                <div className={`w-2 h-2 rounded-full transition-all duration-300 ${(wizardStep === 'upload' || wizardStep === 'create-from-text') ? 'bg-accent w-6' : 'bg-accent/40'}`}></div>
                                <div className={`w-2 h-2 rounded-full transition-all duration-300 ${wizardStep === 'choose-mode' ? 'bg-accent w-6' : (wizardStep === 'configure' ? 'bg-accent/40' : 'bg-white/10')}`}></div>
                                <div className={`w-2 h-2 rounded-full transition-all duration-300 ${wizardStep === 'configure' ? 'bg-accent w-6' : 'bg-white/10'}`}></div>
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-2">
                                STEP {(wizardStep === 'upload' || wizardStep === 'create-from-text') ? '1' : wizardStep === 'choose-mode' ? '2' : '3'} OF 3
                            </span>
                        </div>
                    </div>
                </div>

                <div className="relative z-10 flex flex-col h-full min-h-[300px]">
                    {/* STAGE 1: UPLOAD */}
                    {wizardStep === 'upload' && (
                        <div className="step-animate flex flex-col items-center text-center h-full flex-1">
                            <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight uppercase mb-4">Upload Your <span className="text-accent">Mascot</span></h2>
                            <p className="text-slate-400 text-sm md:text-base mb-10 max-w-lg mx-auto">Upload the core character image you want to use as the base for all your generations.</p>

                            <div
                                onClick={() => fileInputRef.current?.click()}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleRemixDrop}
                                onPaste={handleRemixPaste}
                                className={`relative w-full max-w-2xl min-h-[300px] border-2 border-dashed rounded-3xl flex flex-col items-center justify-center p-8 transition-all duration-300 cursor-pointer group lite-upload-zone overflow-hidden mb-auto focus:outline-none
                            ${uploadedImage ? 'border-accent/50 bg-accent/5' : ''}
                            ${!uploadedImage && !isDragging ? 'border-white/10 bg-black/40 hover:border-accent/40 hover:bg-accent/5' : ''}
                            ${isDragging ? 'border-accent bg-accent/10 scale-[1.02] shadow-[0_0_40px_rgba(222,253,65,0.15)]' : ''}
                        `}
                                tabIndex={0}
                            >
                                {uploadedImage ? (
                                    <div className="absolute inset-4 rounded-xl overflow-hidden bg-black/50 border border-white/5">
                                        <img src={uploadedImage} alt="Uploaded base" className="w-full h-full object-contain animate-in zoom-in duration-300" />
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setUploadedImage(null); }}
                                            className="absolute top-4 right-4 bg-red-500 hover:bg-red-400 text-white p-2 rounded-full shadow-lg transition-colors z-20"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none"></div>
                                        <div className="absolute bottom-4 left-4 text-left pointer-events-none">
                                            <div className="text-xs font-black text-accent tracking-widest uppercase mb-1 flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-accent animate-pulse"></div>
                                                Image Ready
                                            </div>
                                            <div className="text-[10px] text-slate-300">Click to change</div>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className={`w-20 h-20 rounded-full bg-black/50 border border-white/10 flex items-center justify-center mb-6 float-icon transition-colors ${isDragging ? 'text-accent border-accent/30 bg-accent/10' : 'text-slate-500 group-hover:text-accent group-hover:border-accent/30 group-hover:bg-accent/10'}`}>
                                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                        </div>
                                        <h3 className={`text-xl font-black uppercase tracking-widest mb-2 transition-colors ${isDragging ? 'text-accent' : 'text-white'}`}>
                                            {isDragging ? 'Drop Image Here' : 'Click, Paste or Drag & Drop'}
                                        </h3>
                                        <p className="text-sm text-slate-500 font-medium max-w-xs text-center">Best results with clear character subjects.</p>
                                    </>
                                )}
                                <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />
                            </div>

                            {uploadedImage && (
                                <div className="mt-8 pt-4 animate-in slide-in-from-bottom-4 flex flex-col w-full max-w-md mx-auto">
                                    <Button onClick={goToStep2} className="w-full py-4 text-base font-black tracking-widest shadow-xl text-black bg-accent hover:bg-accent/90 focus:ring-accent focus:ring-offset-2 focus:ring-opacity-50">
                                        CONTINUE <svg className="w-4 h-4 ml-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                    </Button>
                                </div>
                            )}

                            {!uploadedImage && (
                                <div className="mt-8 pt-4">
                                    <button onClick={() => setWizardStep('create-from-text')} className="group flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors uppercase tracking-widest">
                                        <svg className="w-4 h-4 text-accent/70 group-hover:text-accent transition-colors" fill="currentColor" viewBox="0 0 24 24"><path d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                                        CLICK HERE TO CREATE A MASCOT
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* STAGE 1b: CREATE FROM TEXT (Stays in Lite Mode) */}
                    {wizardStep === 'create-from-text' && (
                        <div className="step-animate flex flex-col text-left h-full flex-1">
                            <div className="mb-6">
                                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/30 text-accent text-[10px] font-bold uppercase tracking-widest mb-4">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                                    Create From Text
                                </div>
                                <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight uppercase mb-4">Describe <span className="text-accent">Mascot</span></h2>
                                <p className="text-slate-400 text-sm md:text-base max-w-2xl">Describe your specific idea in text and let the AI visualize it. Turn your concepts into visual assets using multiple styles.</p>
                            </div>

                            {/* Text Input Area */}
                            <div className="relative group/input mb-8 z-20">
                                <textarea
                                    value={customInput}
                                    onChange={(e) => setCustomInput(e.target.value)}
                                    placeholder="Describe your character concept to generate from scratch..."
                                    className="relative w-full bg-[#0A0A0A] border-2 border-white/10 rounded-xl p-4 text-sm text-accent placeholder:text-slate-700 focus:border-accent outline-none min-h-[140px] resize-none leading-relaxed font-mono tracking-wide transition-colors z-20"
                                />
                            </div>

                            {/* Art Styles Selection (Reused from Story Mode but rendered for Create Mode) */}
                            <div className="bg-black/30 border border-white/5 rounded-2xl p-6 mb-8 z-10">
                                <div className="flex justify-between items-center mb-6">
                                    <div className="flex items-center gap-3">
                                        <h3 className="text-lg font-black text-white tracking-tighter uppercase">Select Art Styles</h3>
                                        {selectedStyles.length > 0 && (
                                            <span className="bg-accent/20 border border-accent/30 text-accent text-[10px] font-black px-2 py-0.5 rounded-full">
                                                {selectedStyles.length} SELECTED
                                            </span>
                                        )}
                                    </div>
                                    <button onClick={selectAllStyles} className="text-[10px] font-bold text-slate-400 hover:text-white uppercase transition-colors flex items-center gap-1">
                                        {selectedStyles.length === AVAILABLE_ART_STYLES.length ? "Deselect All" : "Select All"}
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
                                    {AVAILABLE_ART_STYLES.map((style, idx) => {
                                        const isSelected = selectedStyles.includes(style.id);
                                        return (
                                            <button
                                                key={style.id}
                                                onClick={() => toggleStyle(style.id)}
                                                className={`
                                                group relative h-20 p-3 rounded-xl border transition-all duration-300 text-left overflow-hidden flex flex-col justify-between
                                                ${isSelected
                                                        ? 'bg-accent/20 border-accent shadow-[0_0_20px_rgba(222,253,65,0.15)] scale-[1.02] z-10'
                                                        : 'bg-black/50 border-white/10 text-slate-500 hover:border-accent/50 hover:bg-black'
                                                    }
                                              `}
                                            >
                                                <div className="flex justify-between items-start z-10 w-full mb-1">
                                                    <span className={`text-[9px] font-mono leading-none ${isSelected ? 'text-accent/70' : 'text-slate-600'}`}>0{idx + 1}</span>
                                                    <div className="flex items-center gap-1.5">
                                                        {style.id === 'original' && (
                                                            <div className="w-4 h-4 rounded-full bg-accent flex items-center justify-center shadow-[0_0_10px_rgba(222,253,65,0.4)]" title="Highly Recommended">
                                                                <svg className="w-2.5 h-2.5 text-black" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l2.4 7.2h7.6l-6 4.8 2.4 7.2-6-4.8-6 4.8 2.4-7.2-6-4.8h7.6z" /></svg>
                                                            </div>
                                                        )}
                                                        {isSelected && (
                                                            <div className="w-4 h-4 rounded-full bg-black/30 flex items-center justify-center animate-in zoom-in duration-200">
                                                                <svg className="w-3 h-3 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="z-10">
                                                    <span className={`text-[11px] font-black uppercase tracking-tight leading-none block ${isSelected ? 'text-white drop-shadow-md' : 'text-slate-300'}`}>
                                                        {style.name}
                                                    </span>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Action Row */}
                            <div className="mt-auto pt-6 flex flex-col relative w-full z-20">
                                {(!customInput.trim() || selectedStyles.length === 0) && (
                                    <div className="text-center mb-4 pointer-events-none animate-in fade-in slide-in-from-bottom-2">
                                        <div className="inline-flex items-center gap-2 bg-red-500/20 text-red-400 text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-widest border border-red-500/30 backdrop-blur-md">
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                            Input and at least one style required
                                        </div>
                                    </div>
                                )}
                                <Button
                                    onClick={handleGenerateFromCustomInput}
                                    disabled={!customInput.trim() || selectedStyles.length === 0 || isGenerating || (!currentUser?.can_use_art && !currentUser?.is_admin)}
                                    className={`w-full py-4 text-base md:text-lg font-black tracking-widest shadow-2xl transition-all duration-300 ${customInput.trim() && selectedStyles.length > 0 && !isGenerating ? 'bg-accent text-black hover:bg-accent/90 shadow-[0_0_30px_rgba(222,253,65,0.2)] hover:-translate-y-1 hover:shadow-[0_0_40px_rgba(222,253,65,0.3)]' : 'bg-white/5 text-slate-600'}`}
                                    icon={isGenerating ? <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : undefined}
                                >
                                    {isGenerating ? 'GENERATING...' : 'GENERATE FROM SCRATCH'}
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* STAGE 2: CHOOSE MODE or INLINE EXAMPLES */}
                    {wizardStep === 'choose-mode' && (
                        <>
                            {!showExamplesInline ? (
                                <div className="step-animate flex flex-col items-center">
                                    <div className="text-center mb-10">
                                        <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight uppercase mb-4">Choose <span className="text-white">Mode</span></h2>
                                        <p className="text-slate-400 text-sm md:text-base mb-6 max-w-lg mx-auto">Select how you want to transform your uploaded mascot.</p>
                                        <button
                                            onClick={() => { setExampleCategory('story'); setShowExamplesInline(true); }}
                                            className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-white/10 bg-black/40 hover:bg-white/5 hover:border-white/30 text-xs font-bold uppercase tracking-widest text-slate-300 transition-all shadow-lg hover:-translate-y-0.5"
                                        >
                                            <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                            See Examples Gallery
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
                                        {/* Story Mode */}
                                        <div
                                            className="group relative bg-[#0B1221] border-2 border-blue-500/30 rounded-3xl p-6 md:p-8 hover:border-blue-500/70 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col h-full shadow-[0_0_20px_rgba(59,130,246,0.15)] hover:shadow-[0_0_40px_rgba(59,130,246,0.3)] hover:-translate-y-1 ring-2 ring-blue-500/20 ring-offset-[#0B1221] ring-offset-[2px]"
                                            onClick={() => handleModeSelect('story')}
                                        >
                                            <div className="absolute inset-0 bg-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-40 transition-opacity">
                                                <svg className="w-24 h-24 text-blue-500" fill="currentColor" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                            </div>
                                            <div className="relative z-10">
                                                <div className="flex flex-col items-start mb-6">
                                                    <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                    </div>
                                                    <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500/20 border border-blue-400/40 text-[10px] font-bold text-blue-200 tracking-widest uppercase shadow-[0_0_20px_rgba(59,130,246,0.25)]">
                                                        <svg className="w-3.5 h-3.5 text-blue-400 animate-pulse" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l2.4 7.2h7.6l-6 4.8 2.4 7.2-6-4.8-6 4.8 2.4-7.2-6-4.8h7.6z" /></svg>
                                                        Recommended
                                                    </div>
                                                </div>
                                                <h3 className="text-3xl font-black text-white tracking-tight mb-4 group-hover:text-blue-200 transition-colors">Story Mode</h3>
                                                <p className="text-slate-400 text-sm leading-relaxed mb-6">Automated scene generation using selected art styles. Creates diverse environments and compositions while keeping your mascot recognizable.</p>

                                                <div className="mt-auto space-y-3 pt-6 border-t border-blue-500/20">
                                                    <div className="flex items-center gap-2 text-xs text-slate-300 font-medium"><svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg> Select multiple art styles</div>
                                                    <div className="flex items-center gap-2 text-xs text-slate-300 font-medium"><svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg> Best for generating scenes for mascot</div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Custom Mode */}
                                        <div
                                            className="group relative bg-[#0B1221] border border-white/10 rounded-3xl p-6 md:p-8 hover:border-orange-500/50 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col h-full shadow-xl hover:shadow-[0_0_40px_rgba(249,115,22,0.15)] hover:-translate-y-1"
                                            onClick={() => handleModeSelect('custom')}
                                        >
                                            <div className="absolute inset-0 bg-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-40 transition-opacity">
                                                <svg className="w-24 h-24 text-orange-500" fill="currentColor" viewBox="0 0 24 24"><path d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                                            </div>
                                            <div className="relative z-10">
                                                <div className="flex flex-col items-start mb-6">
                                                    <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400 group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(249,115,22,0.2)]">
                                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                                                    </div>
                                                    <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-orange-500/10 border border-orange-500/20 text-[9px] font-bold text-orange-300 tracking-widest uppercase">
                                                        Advanced Control
                                                    </div>
                                                </div>
                                                <h3 className="text-3xl font-black text-white tracking-tight mb-4 group-hover:text-orange-200 transition-colors">Custom Mode</h3>
                                                <p className="text-slate-400 text-sm leading-relaxed mb-6">Precise control via text prompts. Equip items, modify specific traits, or define exact scenarios while keeping identity locked.</p>

                                                <div className="mt-auto space-y-3 pt-6 border-t border-white/10 group-hover:border-orange-500/20 transition-colors">
                                                    <div className="flex items-center gap-2 text-xs text-slate-300 font-medium"><svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg> Text-driven targeted inpainting</div>
                                                    <div className="flex items-center gap-2 text-xs text-slate-300 font-medium"><svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg> Best for changing outfits/backgrounds</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col h-full animate-in slide-in-from-right-8 duration-500 relative z-10 w-full">
                                    {/* Header & Back Button */}
                                    <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10 w-full">
                                        <button
                                            onClick={() => setShowExamplesInline(false)}
                                            className="group flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-white transition-colors"
                                        >
                                            <div className="w-8 h-8 rounded-full bg-white/5 group-hover:bg-white/10 flex items-center justify-center transition-colors">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                                            </div>
                                            Back to Mode Selection
                                        </button>
                                        <h2 className="text-xl font-black text-white uppercase tracking-tight hidden md:block">Generation Examples</h2>
                                    </div>

                                    {/* Horizontal Layout containing Mascot and Grid */}
                                    <div className="flex flex-col md:flex-row gap-6 lg:gap-8 flex-1 w-full">
                                        {/* Left Panel: Main Mascot Preview */}
                                        <div className="w-full md:w-1/3 flex flex-col gap-4">
                                            <div className="bg-[#070A10] border border-white/10 rounded-2xl p-4 md:p-6 shadow-inner flex flex-col items-center flex-1 h-full h-auto">
                                                <div className="w-full aspect-square md:aspect-auto md:h-64 rounded-xl overflow-hidden bg-black/50 border border-white/20 shadow-2xl relative mb-6">
                                                    <div className="absolute inset-x-0 bottom-0 top-1/2 bg-gradient-to-t from-black/80 to-transparent z-10"></div>
                                                    <img
                                                        src={`/${exampleCategory === 'story' ? 'remix_images' : 'slider_images'}/main.jpeg`}
                                                        alt="Main Mascot Source"
                                                        className="w-full h-full object-cover relative z-0"
                                                        loading="lazy"
                                                    />
                                                    <div className="absolute bottom-4 left-4 z-20">
                                                        <div className="text-[10px] font-bold text-accent uppercase tracking-widest mb-1 shadow-black drop-shadow-md">Source Character</div>
                                                        <h4 className="text-lg font-black text-white leading-tight drop-shadow-md">Main Mascot</h4>
                                                    </div>
                                                </div>

                                                <p className="text-xs text-slate-400 leading-relaxed text-center mb-6">
                                                    This mascot was used to generate all the <strong className="text-white">{exampleCategory === 'story' ? 'Story Mode' : 'Custom Mode'}</strong> examples shown off its base. Note how the core identity gets preserved without any quality loss.
                                                </p>

                                                <div className="mt-auto hidden"></div>
                                            </div>
                                        </div>

                                        {/* Right Panel: Scrollable Grid */}
                                        <div className="w-full md:w-2/3 flex flex-col h-[400px] md:h-auto overflow-hidden pr-2 pb-8">
                                            {/* Mode Toggle at top center */}
                                            <div className="flex justify-center mb-6 shrink-0 mt-4 md:mt-0">
                                                <div className="bg-black/60 p-1.5 rounded-full border border-white/10 flex items-center relative w-full max-w-xs md:max-w-sm">
                                                    <button
                                                        onClick={() => setExampleCategory('story')}
                                                        className={`relative flex-1 z-10 py-2.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all duration-300 ${exampleCategory === 'story' ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
                                                    >
                                                        Story Mode
                                                    </button>
                                                    <button
                                                        onClick={() => setExampleCategory('custom')}
                                                        className={`relative flex-1 z-10 py-2.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all duration-300 ${exampleCategory === 'custom' ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
                                                    >
                                                        Custom Mode
                                                    </button>
                                                    {/* Animated Pill Background */}
                                                    <div
                                                        className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] rounded-full transition-all duration-300 ease-out ${exampleCategory === 'story' ? 'bg-blue-500/40 left-1.5' : 'bg-orange-500/40 left-1/2 ml-1.5'}`}
                                                    ></div>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 overflow-y-auto custom-scrollbar flex-1 pb-4 pr-2">
                                                {(exampleCategory === 'story' ? STORY_EXAMPLES : CUSTOM_EXAMPLES).map((img, idx) => (
                                                    <div key={idx} className="aspect-square rounded-xl overflow-hidden bg-black/50 border border-white/5 group relative shadow-md">
                                                        <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none mix-blend-overlay ${exampleCategory === 'story' ? 'bg-blue-500/30' : 'bg-orange-500/30'}`}></div>
                                                        <img
                                                            src={`/${exampleCategory === 'story' ? 'remix_images' : 'slider_images'}/${img}`}
                                                            alt={`Example ${idx}`}
                                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                                                            loading="lazy"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* STAGE 3: CONFIGURE (STORY) */}
                    {wizardStep === 'configure' && selectedLiteMode === 'story' && (
                        <div className="step-animate flex flex-col text-left h-full flex-1 relative">
                            {uploadedImage && (
                                <div className="absolute top-0 right-0 z-30 hidden sm:block">
                                    <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl overflow-hidden border-2 border-blue-500/40 shadow-[0_0_15px_rgba(59,130,246,0.2)] ml-auto">
                                        <img src={uploadedImage} alt="Your mascot" className="w-full h-full object-cover" />
                                    </div>
                                    <div className="text-[9px] font-bold text-blue-400 uppercase tracking-widest mt-2 text-center shadow-black drop-shadow-sm">Your Mascot</div>
                                </div>
                            )}
                            <div className="mb-4 md:pr-24">
                                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-300 text-[10px] font-bold uppercase tracking-widest mb-4">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                    Story Mode Configuration
                                </div>
                                <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight uppercase mb-2">Select Art <span className="text-blue-500">Styles</span></h2>
                                <p className="text-slate-400 text-sm max-w-2xl">At least one style is required. Each style will generate a set of unique scenes for your mascot. Select multiple for more variety.</p>
                            </div>

                            {/* Art Styles Selection */}
                            <div className="bg-black/30 border border-white/5 rounded-2xl p-4 md:p-6 mb-4">
                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-3">
                                    <div className="flex flex-wrap items-center gap-3">
                                        <h3 className="text-lg font-black text-white tracking-tighter uppercase">Available Styles</h3>
                                        {selectedStyles.length > 0 ? (
                                            <span className="bg-blue-500/20 border border-blue-500/30 text-blue-400 text-[10px] font-black px-2 py-0.5 rounded-full">
                                                {selectedStyles.length} SELECTED
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 bg-red-500/20 text-red-400 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-widest border border-red-500/30 animate-pulse">
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                                Select at least one style to continue
                                            </span>
                                        )}
                                    </div>
                                    <button onClick={selectAllStyles} className="text-[10px] font-bold text-slate-400 hover:text-white uppercase transition-colors flex items-center gap-1">
                                        {selectedStyles.length === AVAILABLE_ART_STYLES.length ? "Deselect All" : "Select All"}
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                                    {AVAILABLE_ART_STYLES.map((style, idx) => {
                                        const isSelected = selectedStyles.includes(style.id);
                                        return (
                                            <button
                                                key={style.id}
                                                onClick={() => toggleStyle(style.id)}
                                                className={`
                                                  group relative h-20 p-3 rounded-xl border transition-all duration-300 text-left overflow-hidden flex flex-col justify-between
                                                  ${isSelected
                                                        ? 'bg-blue-600 border-blue-400 shadow-[0_0_20px_rgba(37,99,235,0.3)] scale-[1.02] z-10'
                                                        : 'bg-black/50 border-white/10 text-slate-500 hover:border-blue-500/50 hover:bg-black'
                                                    }
                                              `}
                                            >
                                                <div className="flex justify-between items-start z-10 w-full mb-1">
                                                    <span className={`text-[9px] font-mono leading-none ${isSelected ? 'text-white/70' : 'text-slate-600'}`}>0{idx + 1}</span>
                                                    <div className="flex items-center gap-1.5">
                                                        {style.id === 'original' && (
                                                            <div className="w-4 h-4 rounded-full bg-[#DEFD41] flex items-center justify-center shadow-[0_0_10px_rgba(222,253,65,0.4)]" title="Highly Recommended">
                                                                <svg className="w-2.5 h-2.5 text-black" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l2.4 7.2h7.6l-6 4.8 2.4 7.2-6-4.8-6 4.8 2.4-7.2-6-4.8h7.6z" /></svg>
                                                            </div>
                                                        )}
                                                        {isSelected && (
                                                            <div className="w-4 h-4 rounded-full bg-black/30 flex items-center justify-center animate-in zoom-in duration-200">
                                                                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="z-10">
                                                    <span className={`text-[11px] font-black uppercase tracking-tight leading-none block ${isSelected ? 'text-white drop-shadow-md' : 'text-slate-300'}`}>
                                                        {style.name}
                                                    </span>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Add Lore Section */}
                            <div className="mb-4">
                                <div
                                    onClick={() => setShowLore(!showLore)}
                                    className="cursor-pointer bg-black/30 border border-white/5 rounded-xl p-4 hover:border-blue-500/30 transition-all group"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-white tracking-widest uppercase">Add Lore</div>
                                                <div className="text-xs text-slate-500 font-medium">
                                                    Provide context or details about the character for significantly better results
                                                </div>
                                            </div>
                                        </div>
                                        <svg className={`w-5 h-5 transition-transform ${showLore ? 'rotate-180 text-blue-400' : 'text-slate-600 group-hover:text-blue-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                    </div>
                                </div>

                                {showLore && (
                                    <div className="mt-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                        <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3 mb-3 flex items-start gap-2">
                                            <svg className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            <p className="text-xs text-blue-200/80 leading-relaxed font-medium">
                                                Adding precise details like character name, personality traits, or specific types of scenes
                                                you'd like to see dramatically improves the AI's understanding and final output quality.
                                            </p>
                                        </div>
                                        <textarea
                                            placeholder="Describe the character, their backstory, narrative or how you want them portrayed..."
                                            value={customRemixNarrative}
                                            onChange={e => setCustomRemixNarrative(e.target.value)}
                                            className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-sm text-slate-200 placeholder:text-slate-600 focus:border-blue-500 outline-none resize-none leading-relaxed transition-colors shadow-inner font-mono h-24"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Action Row */}
                            <div className="mt-auto pt-4 flex flex-col relative w-full">
                                <Button
                                    onClick={handleGenerateFromUpload}
                                    disabled={selectedStyles.length === 0 || isGenerating || (!currentUser?.can_use_art && !currentUser?.is_admin)}
                                    className={`w-full py-4 text-base md:text-lg font-black tracking-widest shadow-2xl transition-all duration-300 ${selectedStyles.length > 0 && !isGenerating ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_30px_rgba(37,99,235,0.3)] hover:-translate-y-1' : 'bg-white/5 text-slate-600'}`}
                                    icon={isGenerating ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : undefined}
                                >
                                    {isGenerating ? 'GENERATING ARTS...' : 'GENERATE ARTS'}
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* STAGE 3: CONFIGURE (CUSTOM) */}
                    {wizardStep === 'configure' && selectedLiteMode === 'custom' && (
                        <div className="step-animate flex flex-col text-left h-full flex-1 relative">
                            {uploadedImage && (
                                <div className="absolute top-0 right-0 z-30 hidden sm:block">
                                    <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl overflow-hidden border-2 border-orange-500/40 shadow-[0_0_15px_rgba(249,115,22,0.2)] ml-auto">
                                        <img src={uploadedImage} alt="Your mascot" className="w-full h-full object-cover" />
                                    </div>
                                    <div className="text-[9px] font-bold text-orange-400 uppercase tracking-widest mt-2 text-center shadow-black drop-shadow-sm">Your Mascot</div>
                                </div>
                            )}
                            <div className="mb-6 md:pr-24">
                                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 text-[10px] font-bold uppercase tracking-widest mb-4">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                                    Custom Configuration
                                </div>
                                <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight uppercase mb-4">Custom <span className="text-orange-500">Mode</span></h2>
                                <p className="text-slate-400 text-sm md:text-base max-w-2xl">Use text commands to modify the character. Choose 'Mix Mode' for creating trait combinations, or 'Scenes Mode' to define explicit scenes line by line.</p>
                            </div>

                            {/* Mode Toggle */}
                            <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/5 mb-6 max-w-sm">
                                <button onClick={() => setTraitMode('mix')} className={`flex-1 py-3 text-[11px] font-black rounded-xl transition-all uppercase tracking-widest ${traitMode === 'mix' ? 'bg-orange-500 text-black shadow-lg shadow-orange-900/30' : 'text-slate-500 hover:text-white'}`}>Mix Mode</button>
                                <button onClick={() => setTraitMode('scenes')} className={`flex-1 py-3 text-[11px] font-black rounded-xl transition-all uppercase tracking-widest ${traitMode === 'scenes' ? 'bg-orange-500 text-black shadow-lg shadow-orange-900/30' : 'text-slate-500 hover:text-white'}`}>Scenes Mode</button>
                            </div>

                            {/* Input Area */}
                            <div className="flex flex-col group/terminal bg-[#070A10] border-2 border-white/10 focus-within:border-orange-500/50 rounded-2xl overflow-hidden mb-8 transition-colors shadow-inner flex-1">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-3 bg-white/5 border-b border-white/10 gap-2">
                                    <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest flex items-center gap-2">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                        {traitMode === 'mix' ? 'Combinator Input' : 'Sequencer Input'}
                                    </span>
                                    <div className="flex gap-1.5 items-center">
                                        {!traitsInput.trim() ? (
                                            <span className="inline-flex items-center gap-1.5 bg-red-500/20 text-red-400 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-widest border border-red-500/30 animate-pulse">
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                                Input required to continue
                                            </span>
                                        ) : (
                                            <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></div>
                                        )}
                                    </div>
                                </div>
                                <textarea
                                    value={traitsInput}
                                    onChange={(e) => setTraitsInput(e.target.value)}
                                    placeholder={traitMode === 'mix'
                                        ? "Example:\nhat: blue hat, solana hat\nskin: red, green\neyes: laser eyes, tired eyes\n\n(AI will mix these automatically)"
                                        : "Example:\nScene 1: wearing a black suit and sunglasses, rainy day\nScene 2: driving a red sports car, neon city\n\n(Each line generates a distinct image)"}
                                    className="w-full bg-transparent p-5 text-sm md:text-base text-orange-50 placeholder:text-slate-700 outline-none resize-none h-full min-h-[12rem] font-mono leading-relaxed"
                                />
                            </div>

                            {/* Add Lore Section to Custom Mode */}
                            <div className="mb-6">
                                <div
                                    onClick={() => setShowLore(!showLore)}
                                    className="cursor-pointer bg-black/30 border border-white/5 rounded-xl p-4 hover:border-orange-500/30 transition-all group"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-white tracking-widest uppercase">Add Lore</div>
                                                <div className="text-xs text-slate-500 font-medium">
                                                    Provide context or details about the character for significantly better results
                                                </div>
                                            </div>
                                        </div>
                                        <svg className={`w-5 h-5 transition-transform ${showLore ? 'rotate-180 text-orange-400' : 'text-slate-600 group-hover:text-orange-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                    </div>
                                </div>

                                {showLore && (
                                    <div className="mt-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                        <div className="bg-orange-500/5 border border-orange-500/20 rounded-lg p-3 mb-3 flex items-start gap-2">
                                            <svg className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            <p className="text-xs text-orange-200/80 leading-relaxed font-medium">
                                                Adding precise details like character name, personality traits, or specific types of scenes
                                                you'd like to see dramatically improves the AI's understanding and final output quality.
                                            </p>
                                        </div>
                                        <textarea
                                            placeholder="Describe the character, their backstory, narrative or how you want them portrayed..."
                                            value={customRemixNarrative}
                                            onChange={e => setCustomRemixNarrative(e.target.value)}
                                            className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-sm text-slate-200 placeholder:text-slate-600 focus:border-orange-500 outline-none resize-none leading-relaxed transition-colors shadow-inner font-mono h-24"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Action Row */}
                            <div className="mt-auto pt-4 flex flex-col relative w-full">
                                <Button
                                    onClick={handleGenerateTraits}
                                    disabled={!traitsInput.trim() || isGenerating || (!currentUser?.can_use_art && !currentUser?.is_admin)}
                                    className={`w-full py-4 text-base md:text-lg font-black tracking-widest shadow-xl transition-all duration-300 ${traitsInput.trim() && !isGenerating ? 'bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-black shadow-[0_0_30px_rgba(249,115,22,0.3)] hover:-translate-y-1' : 'bg-white/5 text-slate-600'}`}
                                    icon={isGenerating ? <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : undefined}
                                >
                                    {isGenerating ? 'GENERATING MODIFICATIONS...' : 'LAUNCH CUSTOM GENERATION'}
                                </Button>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div >
    );
};
