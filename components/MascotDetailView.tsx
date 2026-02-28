import React, { useState, useEffect } from 'react';
import JSZip from 'jszip';
import saveAs from 'file-saver';
import { Mascot, Scene, DatabaseUser } from '../types';
import { Button } from './Button';
import { generateScenarioPrompts, generateSceneImage, generateDexBannerImage, generateXCommBannerImage, getAvailableKeyCount, modifyMascotImage } from '../services/geminiService';
import { deductCredits } from '../supabase';

interface MascotDetailViewProps {
    mascot: Mascot;
    onUpdateMascot: (mascot: Mascot) => void;
    onBack: () => void;
    initialEditMode?: boolean; // NEW PROP
    currentUser?: DatabaseUser | null; // NEW PROP
}

const ASPECT_RATIOS = ["1:1", "3:4", "4:3", "9:16", "16:9"];
const COUNTS = [0, 2, 4];

// Helper to convert Base64 PNG/WebP to JPEG
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

// Helper to sanitize filename to snake_case
const sanitizeFilename = (name: string) => {
    return name.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') || "mascot_assets";
};

export const MascotDetailView: React.FC<MascotDetailViewProps> = ({ mascot, onUpdateMascot, onBack, initialEditMode = false, currentUser }) => {
    const [aspectRatio, setAspectRatio] = useState("1:1");
    const [count, setCount] = useState(2);
    const [manualCount, setManualCount] = useState<string>("");
    const [includeDex, setIncludeDex] = useState(false);
    const [includeXComm, setIncludeXComm] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [progress, setProgress] = useState("");
    const [isZipping, setIsZipping] = useState(false);
    const [selectedScene, setSelectedScene] = useState<Scene | null>(null);

    const [selectedModels, setSelectedModels] = useState<string[]>(['pro']);

    // EDIT MODE STATE
    const [isEditingMascot, setIsEditingMascot] = useState(initialEditMode);
    const [editPrompt, setEditPrompt] = useState("");
    const [isSavingEdit, setIsSavingEdit] = useState(false);
    const [showCreditError, setShowCreditError] = useState<{ show: boolean, required: number }>({ show: false, required: 0 });

    // EDIT TEXT STATE
    const [isEditingText, setIsEditingText] = useState(false);
    const [editName, setEditName] = useState(mascot.name);
    const [editTicker, setEditTicker] = useState(mascot.ticker || "");
    const [editNarrative, setEditNarrative] = useState(mascot.narrative);

    const scenes = mascot.scenes || [];

    const calculatedCredits = React.useMemo(() => {
        let req = 0;
        for (const model of selectedModels) {
            req += count * (model === 'pro' ? 1 : 1);
        }
        if (includeDex) req += 2;
        if (includeXComm) req += 2;
        return req;
    }, [count, selectedModels, includeDex, includeXComm]);

    useEffect(() => {
        setEditName(mascot.name);
        setEditTicker(mascot.ticker || "");
        setEditNarrative(mascot.narrative);
    }, [mascot]);

    const toggleModel = (model: string) => {
        setSelectedModels(prev =>
            prev.includes(model)
                ? prev.filter(m => m !== model)
                : [...prev, model]
        );
    };

    const handleManualCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setManualCount(val);
        const parsed = parseInt(val);
        if (!isNaN(parsed) && parsed >= 0 && parsed <= 50) {
            setCount(parsed);
        }
    };

    const handleTextSave = () => {
        onUpdateMascot({
            ...mascot,
            name: editName,
            ticker: editTicker,
            narrative: editNarrative
        });
        setIsEditingText(false);
    };

    const handleMascotModification = async () => {
        if (!editPrompt.trim()) return;
        setIsSavingEdit(true);
        try {
            const newImageUrl = await modifyMascotImage(mascot.imageUrl, editPrompt);
            onUpdateMascot({ ...mascot, imageUrl: newImageUrl });
            setIsEditingMascot(false);
            setEditPrompt("");
        } catch (error) {
            console.error("Edit failed", error);
            alert("Failed to modify image.");
        } finally {
            setIsSavingEdit(false);
        }
    };

    const handleGenerateScenarios = async () => {
        if (!currentUser) return;
        if (count === 0 && !includeDex && !includeXComm) return;
        if (selectedModels.length === 0) {
            alert("Select at least one Model Quality.");
            return;
        }

        const requiredCredits = calculatedCredits;

        if (requiredCredits > 0) {
            const deductionSuccess = await deductCredits(currentUser.access_code, 'art', requiredCredits);
            if (!deductionSuccess) {
                setShowCreditError({ show: true, required: requiredCredits });
                return;
            }
        }

        setIsGenerating(true);
        setProgress("Initializing tasks...");

        try {
            let totalPromptsCount = count * selectedModels.length;
            let prompts: string[] = [];
            if (totalPromptsCount > 0) {
                const existingPrompts = (mascot.scenes || []).map(s => s.description);
                prompts = await generateScenarioPrompts(mascot, totalPromptsCount, existingPrompts);
            }

            const tasks: (() => Promise<Scene>)[] = [];

            if (includeDex) {
                tasks.push(() => generateDexBannerImage(mascot));
            }

            if (includeXComm) {
                tasks.push(() => generateXCommBannerImage(mascot));
            }

            // Distribute prompts across models: Each model gets its own UNIQUE set of prompts
            let pIndex = 0;
            selectedModels.forEach(model => {
                for (let i = 0; i < count; i++) {
                    const currentPrompt = prompts[pIndex++];
                    if (currentPrompt) {
                        tasks.push(() => generateSceneImage(
                            currentPrompt,
                            aspectRatio,
                            mascot.imageUrl,
                            "1K",
                            model as 'pro' | 'basic',
                            mascot.preserveOriginal,
                            mascot.styleId
                        ));
                    }
                }
            });

            const totalTasks = tasks.length;
            let completedCount = 0;
            const keys = getAvailableKeyCount();
            const CONCURRENCY_LIMIT = Math.max(2, keys);

            const results: Scene[] = [];
            let index = 0;

            const worker = async () => {
                while (index < tasks.length) {
                    const task = tasks[index++];
                    if (!task) break;
                    try {
                        const scene = await task();
                        results.push(scene);
                        onUpdateMascot({ ...mascot, scenes: [...scenes, ...results] });
                        completedCount++;
                        setProgress(`Rendering: ${completedCount}/${totalTasks}...`);
                    } catch (e) { console.error(e); }
                }
            };

            const workers = Array(Math.min(tasks.length, CONCURRENCY_LIMIT)).fill(null).map(() => worker());
            await Promise.all(workers);

        } catch (error) {
            console.error(error);
            alert("Failed to generate scenes.");
        } finally {
            setIsGenerating(false);
            setProgress("");
        }
    };

    const handleDownloadSingle = async (scene: Scene, index: number, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            let imageUrl = scene.imageUrl;
            if (imageUrl.startsWith('data:')) imageUrl = await base64ToJpg(imageUrl);
            const safeName = mascot.name.replace(/[^a-zA-Z0-9]/g, '_');
            // Simple filename for single download as well
            const filename = `${safeName}_${index}.jpg`;
            saveAs(imageUrl, filename);
        } catch (err) { alert("Download failed."); }
    };

    /**
     * UPDATED DOWNLOAD ZIP
     * Uses snake_case folder name inside zip, and snake_case zip filename.
     */
    const handleDownloadZip = async () => {
        if (scenes.length === 0) return;
        setIsZipping(true);
        try {
            const zip = new JSZip();
            let fileCounter = 1;

            const safeFolderName = sanitizeFilename(mascot.name);

            // Create folder inside zip
            const folder = zip.folder(safeFolderName);
            if (!folder) throw new Error("Folder creation failed");

            // Add Info File
            const infoContent = `NAME: ${mascot.name}\nTICKER: ${mascot.ticker}\nNARRATIVE: ${mascot.narrative}\nSTYLE: ${mascot.artStyle}`;
            folder.file("info.txt", infoContent);

            // Add Original/Main Image
            if (mascot.imageUrl.startsWith('data:')) {
                const jpgDataUrl = await base64ToJpg(mascot.imageUrl);
                folder.file(`${fileCounter}.jpg`, jpgDataUrl.split(',')[1], { base64: true });
                fileCounter++;
            }

            // Add Scenes (Flattened)
            for (const scene of scenes) {
                if (scene.imageUrl.startsWith('data:')) {
                    const jpgDataUrl = await base64ToJpg(scene.imageUrl);
                    folder.file(`${fileCounter}.jpg`, jpgDataUrl.split(',')[1], { base64: true });
                    fileCounter++;
                }
            }

            const content = await zip.generateAsync({ type: "blob" });
            saveAs(content, `${safeFolderName}.zip`);
        } catch (error) { console.error(error); alert("Zip creation failed."); } finally { setIsZipping(false); }
    };

    const cleanDescription = (text: string) => {
        return text.replace(/Use the attached image as a STRICT CHARACTER REFERENCE.*?Redraw this character:/g, "")
            .replace(/CRITICAL:.*?$/gi, "")
            .replace(/THEME:.*?\n/gi, "").trim();
    };

    const nothingSelected = count === 0 && !includeDex && !includeXComm;

    return (
        <div className="fixed inset-0 bg-navy-950 text-slate-200 flex flex-col z-50 overflow-hidden font-sans">

            {/* Top Studio Bar */}
            <header className="h-auto min-h-[4rem] py-4 md:py-0 border-b border-white/10 bg-navy-900/80 backdrop-blur-md flex flex-col md:flex-row items-start md:items-center justify-between px-4 md:px-6 gap-4 md:gap-0 shrink-0 z-20">
                <div className="flex items-center gap-6">
                    <Button onClick={onBack} variant="ghost" size="sm" className="gap-2 text-slate-400 hover:text-white">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        Exit Studio
                    </Button>
                    <div className="h-6 w-px bg-white/10"></div>
                    <div>
                        <h1 className="text-sm font-bold text-white uppercase tracking-wider">
                            Workstation <span className="text-accent mx-2">//</span> {mascot.name}
                        </h1>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {(scenes.length > 0 || mascot.imageUrl.startsWith('data:')) && (
                        <Button onClick={handleDownloadZip} disabled={isZipping} variant="outline" size="sm" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>}>
                            {isZipping ? 'Archiving...' : 'Export All Assets'}
                        </Button>
                    )}
                </div>
            </header>

            {/* Main Studio Layout */}
            <div className="flex flex-col md:flex-row flex-1 overflow-y-auto md:overflow-hidden">

                {/* Left Sidebar (Configuration) */}
                <aside className="w-full md:w-96 border-b md:border-b-0 md:border-r border-white/10 bg-navy-900 flex flex-col shrink-0 md:overflow-hidden h-auto md:h-full">
                    <div className="flex-1 md:overflow-y-auto p-4 md:p-6 custom-scrollbar space-y-8">

                        {/* Identity Module */}
                        <div className="bg-navy-950/50 border border-white/5 rounded-lg p-4">
                            <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-2">
                                <span className="text-[10px] font-bold uppercase text-accent tracking-widest">Subject Data</span>
                                <button onClick={() => setIsEditingText(!isEditingText)} className="text-[10px] text-slate-400 hover:text-white uppercase font-bold">
                                    {isEditingText ? 'Cancel' : 'Edit Info'}
                                </button>
                            </div>

                            {!isEditingText ? (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-lg font-bold text-white">{mascot.name}</h2>
                                        <span className="text-xs font-mono text-accent bg-accent/10 px-2 py-0.5 rounded border border-accent/20">{mascot.ticker || 'N/A'}</span>
                                    </div>
                                    <p className="text-xs text-slate-400 leading-relaxed font-light">{mascot.narrative}</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Name</label>
                                        <input value={editName} onChange={e => setEditName(e.target.value)} className="w-full bg-navy-950 border border-white/10 rounded px-2 py-1.5 text-sm text-white focus:border-accent outline-none" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Ticker</label>
                                        <input value={editTicker} onChange={e => setEditTicker(e.target.value)} className="w-full bg-navy-950 border border-white/10 rounded px-2 py-1.5 text-sm text-white font-mono focus:border-accent outline-none" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Narrative</label>
                                        <textarea value={editNarrative} onChange={e => setEditNarrative(e.target.value)} className="w-full bg-navy-950 border border-white/10 rounded px-2 py-1.5 text-xs text-slate-300 focus:border-accent outline-none" rows={3} />
                                    </div>
                                    <Button onClick={handleTextSave} size="sm" variant="secondary" className="w-full">Save Changes</Button>
                                </div>
                            )}
                        </div>

                        {/* Character Source */}
                        <div>
                            <span className="text-[10px] font-bold uppercase text-slate-500 tracking-widest mb-3 block">Reference Model</span>
                            <div className="relative group rounded-lg overflow-hidden border border-white/10 bg-navy-950 aspect-square">
                                <img src={mascot.imageUrl} alt="Base" className="w-full h-full object-contain p-2" />

                                {/* Edit Overlay */}
                                <div className={`absolute inset-0 bg-navy-900/95 p-4 flex flex-col justify-center transition-opacity duration-200 ${isEditingMascot ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto'}`}>
                                    {!isEditingMascot ? (
                                        <div className="text-center space-y-2">
                                            <p className="text-xs text-slate-300">Modify this base image?</p>
                                            <Button onClick={() => setIsEditingMascot(true)} variant="outline" size="sm" className="w-full">Open Editor</Button>
                                        </div>
                                    ) : (
                                        <>
                                            <label className="text-[10px] text-accent uppercase font-bold mb-1 block">In-painting Prompt</label>
                                            <textarea
                                                value={editPrompt}
                                                onChange={e => setEditPrompt(e.target.value)}
                                                placeholder="e.g. Add sunglasses..."
                                                className="w-full h-20 bg-black border border-white/20 text-xs p-2 mb-2 rounded resize-none focus:border-accent outline-none"
                                            />
                                            <div className="flex gap-2">
                                                <button onClick={() => setIsEditingMascot(false)} className="flex-1 bg-navy-800 text-xs py-2 rounded hover:bg-navy-700">Cancel</button>
                                                <button onClick={handleMascotModification} disabled={isSavingEdit} className="flex-1 bg-accent text-black text-xs py-2 rounded font-bold hover:bg-white">{isSavingEdit ? '...' : 'Apply'}</button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Generator Controls */}
                        <div className="space-y-6 pt-6 border-t border-white/5">
                            <div>
                                <label className="text-[10px] font-bold uppercase text-slate-500 tracking-widest mb-2 block">Aspect Ratio</label>
                                <div className="grid grid-cols-5 gap-1">
                                    {ASPECT_RATIOS.map(r => (
                                        <button
                                            key={r}
                                            onClick={() => setAspectRatio(r)}
                                            disabled={isGenerating}
                                            className={`text-[10px] py-1.5 rounded-sm border transition-all ${aspectRatio === r ? 'bg-accent text-black border-accent font-bold' : 'bg-navy-800 border-navy-700 text-slate-400 hover:bg-navy-700'}`}
                                        >
                                            {r}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-bold uppercase text-slate-500 tracking-widest mb-2 block">Render Engine</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button onClick={() => toggleModel('pro')} disabled={isGenerating} className={`text-xs py-2 px-3 rounded border flex items-center justify-between group ${selectedModels.includes('pro') ? 'bg-navy-800 border-accent text-white' : 'bg-navy-950 border-white/5 text-slate-500'}`}>
                                        <span className="font-bold">PRO</span>
                                        <div className={`w-2 h-2 rounded-full ${selectedModels.includes('pro') ? 'bg-accent' : 'bg-slate-700'}`}></div>
                                    </button>
                                    <button disabled={true} className={`relative text-xs py-2 px-3 rounded border flex items-center justify-between group bg-navy-950 border-white/5 text-slate-500 opacity-50 cursor-not-allowed`} title="Temporarily disabled">
                                        <div className="flex items-center gap-1.5">
                                            <span className="font-bold">BASIC</span>
                                            <svg className="w-3 h-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                        </div>
                                        <div className={`w-2 h-2 rounded-full bg-slate-700`}></div>
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-bold uppercase text-slate-500 tracking-widest mb-2 block">Batch Size</label>
                                <div className="flex bg-navy-950 rounded p-1 border border-white/5 gap-1">
                                    {COUNTS.map(c => (
                                        <button
                                            key={c}
                                            onClick={() => { setCount(c); setManualCount(""); }}
                                            disabled={isGenerating}
                                            className={`flex-1 text-[10px] py-1.5 rounded-sm transition-all ${count === c && manualCount === "" ? 'bg-navy-700 text-white font-bold shadow' : 'text-slate-500 hover:text-slate-300'}`}
                                        >
                                            {c}
                                        </button>
                                    ))}
                                    <input
                                        type="text"
                                        placeholder="+"
                                        value={manualCount}
                                        onChange={handleManualCountChange}
                                        disabled={isGenerating}
                                        className={`w-12 text-[10px] text-center bg-navy-800 border rounded-sm outline-none focus:border-accent font-bold transition-all ${manualCount !== "" ? 'border-accent text-accent' : 'border-white/5 text-slate-500'}`}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-2">
                                <div
                                    onClick={() => !isGenerating && setIncludeDex(!includeDex)}
                                    className={`flex items-center gap-3 p-3 rounded border cursor-pointer transition-colors ${includeDex ? 'bg-purple-900/20 border-purple-500/50' : 'bg-navy-950 border-white/5 hover:border-white/20'}`}
                                >
                                    <div className={`w-4 h-4 rounded-sm border flex items-center justify-center ${includeDex ? 'bg-purple-600 border-purple-600' : 'border-slate-600 bg-navy-900'}`}>
                                        {includeDex && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                    </div>
                                    <div>
                                        <p className="text-xs text-white font-bold">DexScreener Banner</p>
                                        <p className="text-[9px] text-slate-500">1500x500 Composite</p>
                                    </div>
                                </div>

                                <div
                                    onClick={() => !isGenerating && setIncludeXComm(!includeXComm)}
                                    className={`flex items-center gap-3 p-3 rounded border cursor-pointer transition-colors ${includeXComm ? 'bg-blue-900/20 border-blue-500/50' : 'bg-navy-950 border-white/5 hover:border-white/20'}`}
                                >
                                    <div className={`w-4 h-4 rounded-sm border flex items-center justify-center ${includeXComm ? 'bg-blue-600 border-blue-600' : 'border-slate-600 bg-navy-900'}`}>
                                        {includeXComm && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                    </div>
                                    <div>
                                        <p className="text-xs text-white font-bold">X Comm Header</p>
                                        <p className="text-[9px] text-slate-500">1065x426 Composite</p>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 relative">
                                {/* Cost Calculation Display */}
                                {calculatedCredits > 0 && (
                                    <div className="flex justify-between items-center text-xs font-bold mb-3 px-3 py-2 border border-white/5 bg-navy-950 rounded-lg">
                                        <span className="text-slate-400 uppercase tracking-widest text-[9px]">Total Cost</span>
                                        <span className="text-accent bg-accent/10 px-2 py-0.5 rounded border border-accent/20">
                                            {calculatedCredits} Credits
                                        </span>
                                    </div>
                                )}
                                {!currentUser?.can_use_art && !currentUser?.is_admin && (
                                    <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] z-20 flex items-center justify-center rounded-lg border border-red-500/50 -m-1">
                                        <div className="flex items-center gap-2 text-red-500">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                            <span className="text-[10px] font-black tracking-widest uppercase">Locked</span>
                                        </div>
                                    </div>
                                )}
                                {currentUser?.can_use_art && !currentUser?.is_admin && (currentUser?.art_credits || 0) <= 0 && (
                                    <div className="absolute inset-0 bg-black/80 backdrop-blur-[2px] z-20 flex items-center justify-center rounded-lg border border-orange-500/50 -m-1 opacity-0 hover:opacity-100 transition-opacity">
                                        <div className="flex items-center gap-2 text-orange-500">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            <span className="text-[10px] font-black tracking-widest uppercase text-center leading-none">Out of Art Credits</span>
                                        </div>
                                    </div>
                                )}
                                <Button
                                    onClick={handleGenerateScenarios}
                                    disabled={isGenerating || (nothingSelected) || selectedModels.length === 0 || (!currentUser?.can_use_art && !currentUser?.is_admin)}
                                    className="w-full"
                                    size="lg"
                                >
                                    {isGenerating ? 'Rendering Assets...' : 'Generate Batch'}
                                </Button>
                                {isGenerating && (
                                    <div className="mt-3 bg-navy-950 rounded-full h-1.5 overflow-hidden">
                                        <div className="h-full bg-accent animate-loading-bar w-1/3"></div>
                                    </div>
                                )}
                                {isGenerating && <p className="text-[10px] text-center text-accent font-mono mt-2">{progress}</p>}
                            </div>
                        </div>
                    </div>
                </aside>

                {/* Right Area (Gallery) */}
                <main className="flex-1 bg-navy-950 p-4 md:p-6 md:overflow-y-auto custom-scrollbar relative min-h-[50vh] md:min-h-0">

                    {/* Background Grid */}
                    <div className="absolute inset-0 pointer-events-none opacity-20"
                        style={{ backgroundImage: 'radial-gradient(#334155 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
                    </div>

                    {scenes.length === 0 && !isGenerating ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-600 relative z-10 py-12 md:py-0">
                            <div className="w-24 h-24 border border-white/5 bg-navy-900 rounded-2xl flex items-center justify-center mb-6 shadow-2xl">
                                <svg className="w-10 h-10 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-2">Asset Library Empty</h3>
                            <p className="text-sm text-slate-500 max-w-xs text-center">Configure the generation parameters on the sidebar to start populating this workspace.</p>
                        </div>
                    ) : (
                        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 pb-20">
                            {scenes.map((scene, idx) => {
                                const isDex = scene.description.includes('PANORAMIC') || scene.description.includes('PADDED');
                                const isXComm = scene.description.includes('X COMM');

                                let gridClass = 'aspect-square';
                                if (isDex) {
                                    gridClass = 'col-span-1 sm:col-span-2 aspect-[3/1]';
                                } else if (isXComm) {
                                    gridClass = 'col-span-1 sm:col-span-2 aspect-[2.5/1]';
                                }

                                return (
                                    <div
                                        key={scene.id}
                                        onClick={() => setSelectedScene(scene)}
                                        className={`group relative rounded-lg overflow-hidden bg-navy-900 border border-white/5 hover:border-accent transition-all cursor-pointer shadow-lg hover:shadow-accent/10 ${gridClass}`}
                                    >
                                        <img src={scene.imageUrl} className="w-full h-full object-cover" loading="lazy" />

                                        {/* Badges */}
                                        <div className="absolute top-2 left-2 flex gap-1">
                                            {isDex && (
                                                <span className="bg-purple-600/90 text-white text-[8px] font-bold px-1.5 py-0.5 rounded shadow">BANNER</span>
                                            )}
                                            {isXComm && (
                                                <span className="bg-blue-600/90 text-white text-[8px] font-bold px-1.5 py-0.5 rounded shadow">X COMM</span>
                                            )}
                                            {scene.modelUsed?.includes('flash') && (
                                                <span className="bg-yellow-500 text-black text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider shadow-lg">⚡</span>
                                            )}
                                        </div>

                                        {/* Hover Actions */}
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-[2px]">
                                            <button
                                                onClick={(e) => handleDownloadSingle(scene, idx + 2, e)}
                                                className="bg-white text-black p-2 rounded-full hover:bg-accent hover:scale-110 transition-all" title="Download"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                            {isGenerating && Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="aspect-square bg-navy-900 rounded-lg border border-white/5 flex items-center justify-center relative overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer"></div>
                                    <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin"></div>
                                </div>
                            ))}
                        </div>
                    )}
                </main>
            </div>

            {/* Lightbox */}
            {selectedScene && (
                <div
                    className="fixed inset-0 z-[60] bg-black/95 flex flex-col items-center justify-center p-4 md:p-8 animate-in fade-in duration-200"
                    onClick={() => setSelectedScene(null)}
                >
                    <div className="relative max-w-7xl max-h-[90vh]">
                        <img
                            src={selectedScene.imageUrl}
                            className="max-h-[85vh] w-auto rounded border border-white/10 shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                    <div className="mt-4 max-w-2xl text-center">
                        <p className="text-slate-400 text-xs font-mono bg-navy-900 border border-white/10 p-3 rounded inline-block">
                            {cleanDescription(selectedScene.description)}
                        </p>
                    </div>
                    <Button onClick={() => setSelectedScene(null)} variant="ghost" className="absolute top-4 right-4 md:top-6 md:right-6 text-white hover:text-red-400">
                        Close
                    </Button>
                </div>
            )}

            {/* Credit Error Popup */}
            {showCreditError.show && (
                <div
                    className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
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
                            <p className="text-slate-400 text-xs mb-4">
                                You need <span className="text-red-400 font-bold">{showCreditError.required} Art Credits</span> to process this batch.
                                <br />Current balance: <span className="text-white font-bold">{currentUser?.art_credits || 0}</span>
                            </p>
                            <Button
                                onClick={() => setShowCreditError({ show: false, required: 0 })}
                                className="w-full bg-slate-800 hover:bg-slate-700 text-white border-transparent"
                            >
                                Close
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};