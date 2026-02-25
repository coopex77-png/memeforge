
import { GoogleGenAI, Type, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { Mascot, MascotIdea, Scene, XTrend } from "../types";

// --- MULTI-KEY CLIENT POOL SETUP ---

/**
 * ⚠️ MANUAL API KEY CONFIGURATION ⚠️
 * Use this array only if you need to paste multiple external keys.
 * By default, we leave this empty to prioritize the system's process.env.API_KEY.
 */
const MANUAL_API_KEYS: string[] = [
    // Paste extra keys here if needed, e.g.: "AIzaSy..."
];

// Filter valid manual keys
const validManualKeys = MANUAL_API_KEYS.filter(key => 
    key.length > 10 && !key.includes("PASTE_YOUR")
);

const activeKeys = [...validManualKeys];

// ALWAYS add the environment key if it exists
if (process.env.API_KEY) {
    // Avoid duplicates if user accidentally pasted the env key in manual list
    if (!activeKeys.includes(process.env.API_KEY)) {
        activeKeys.push(process.env.API_KEY);
        console.log("Using system API_KEY from environment.");
    }
}

if (activeKeys.length === 0) {
    console.error("No API Keys found! System may fail.");
} else {
    console.log(`🚀 System initialized with ${activeKeys.length} active API Worker(s).`);
}

/**
 * Helper to get a random client for Load Balancing with ROTATION.
 */
const getRandomClient = () => {
    if (activeKeys.length === 0) {
        throw new Error("No Gemini API keys available.");
    }
    const randomIndex = Math.floor(Math.random() * activeKeys.length);
    const key = activeKeys[randomIndex];
    // console.log(`[Load Balancer] Routing request to API Key #${randomIndex + 1}`);
    return new GoogleGenAI({ apiKey: key });
};

/**
 * Returns the number of available keys to determine batch sizes dynamically.
 */
export const getAvailableKeyCount = () => {
    return Math.max(1, activeKeys.length);
};

// --- END POOL SETUP ---

// Helper to generate IDs
export const generateId = () => Math.random().toString(36).substr(2, 9);

// SAFETY SETTINGS: Allow creative freedom for memes (BLOCK_NONE)
const IMAGE_SAFETY_SETTINGS = [
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

/**
 * DEFINED ART STYLES
 */
export interface ArtStyleDef {
    id: string;
    name: string;
    prompt: string;
}

export const AVAILABLE_ART_STYLES: ArtStyleDef[] = [
    // Digital Low-Fi
    { id: "ms_paint", name: "MS Paint", prompt: "Amateur digital drawing created in Windows 95 MS Paint, drawn with a computer mouse, shaky non-antialiased lines, bucket tool flat filling, bright default primary colors, crude anatomy, scribbles, white background, internet meme aesthetic, NOT pixel art, NOT 8-bit" },
    
    // 3D / Render
    { id: "bad_3d", name: "Retro Gamer", prompt: "PlayStation 2 era video game graphics, GTA San Andreas style 3D render, low poly but clean, blocky character model, early 2000s open world game aesthetic, sharp textures, nostalgic gaming vibe, NOT glitchy, NOT distorted" },
    
    // Photo / Realism
    { id: "viral_mugshot", name: "Mugshot", prompt: "Police booking photo, harsh direct flash, height chart in background, character wearing a bright orange american prison jumpsuit, holding a booking placard with random numbers only, realistic but gritty, grainy cctv quality, disheveled appearance, 'Florida Man' news aesthetic" },
    { id: "cryptid_cctv", name: "CCTV", prompt: "Grainy security camera footage, low resolution, night vision green tint, motion blur, cryptid sighting aesthetic, caught on camera, unsettling and mysterious, 'Backrooms' vibe" },
    
    // Internet Culture
    { id: "deep_fried", name: "Deep Fried", prompt: "extreme saturation, red tint, lens flare, noise, jpeg artifacts, laser eyes, meme filter, heavily compressed, NO TEXT, NO WORDS, NO TYPOGRAPHY, visual chaos only" },
    { id: "dank_shitpost", name: "Internet Junk", prompt: "Low resolution shitpost aesthetic, deep fried meme, jpeg artifacts, chaotic energy, cursed image, internet brainrot, surreal and nonsensical, NO TEXT, NO WORDS, NO TYPOGRAPHY, visual meme aesthetic only" },
    
    // Sketch / Abstract
    { id: "ugly_cute", name: "Wojak Style", prompt: "Wojak meme art style, digital MS Paint drawing, simple black outlines, flat colors, no shading, white background, crude but expressive, internet culture aesthetic, NOT pencil, NOT paper texture" },
    { id: "weirdcore", name: "Dreamcore", prompt: "Weirdcore aesthetic, low quality amateur photography, liminal space background, unsettling nostalgia, dreamcore, glitchy text, early 2000s internet vibe, surreal" }
];

/**
 * Helper: Resize/Pad image to 1500x500 (DexScreener)
 */
const createPaddedBanner = (base64Image: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = 1500;
            canvas.height = 500;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                resolve(base64Image); // Fallback
                return;
            }
            ctx.fillStyle = "#FFFFFF";
            ctx.fillRect(0, 0, 1500, 500);
            const scaleW = 1500 / img.width;
            const scaleH = 500 / img.height;
            const scale = Math.max(scaleW, scaleH);
            const drawWidth = img.width * scale;
            const drawHeight = img.height * scale;
            const x = (1500 - drawWidth) / 2;
            const y = (500 - drawHeight) / 2;
            ctx.drawImage(img, x, y, drawWidth, drawHeight);
            resolve(canvas.toDataURL("image/jpeg", 0.9));
        };
        img.onerror = (e) => reject(e);
        img.src = base64Image;
    });
};

/**
 * Helper: Resize/Pad image to 1065x426 (X Community)
 */
const createPaddedXBanner = (base64Image: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = 1065;
            canvas.height = 426;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                resolve(base64Image); // Fallback
                return;
            }
            ctx.fillStyle = "#FFFFFF";
            ctx.fillRect(0, 0, 1065, 426);
            const scaleW = 1065 / img.width;
            const scaleH = 426 / img.height;
            const scale = Math.max(scaleW, scaleH);
            const drawWidth = img.width * scale;
            const drawHeight = img.height * scale;
            const x = (1065 - drawWidth) / 2;
            const y = (426 - drawHeight) / 2;
            ctx.drawImage(img, x, y, drawWidth, drawHeight);
            resolve(canvas.toDataURL("image/jpeg", 0.9));
        };
        img.onerror = (e) => reject(e);
        img.src = base64Image;
    });
};

/**
 * Helper to retry async operations with exponential backoff and KEY ROTATION.
 */
async function withRetry<T>(fn: (ai: GoogleGenAI) => Promise<T>, retries = 3): Promise<T> {
  let lastError;
  for (let i = 0; i < retries; i++) {
    try {
      const ai = getRandomClient();
      return await fn(ai);
    } catch (e) {
      // console.warn(`Attempt ${i + 1}/${retries} failed. Retrying...`, e);
      lastError = e;
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }
  }
  throw lastError;
}

/**
 * Concurrency Limiter / Worker Pool
 */
export const processWithConcurrencyLimit = async <T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  concurrency: number = 5,
  delayBetweenRequests: number = 50 
): Promise<R[]> => {
  const results: R[] = [];
  const executing: Promise<void>[] = [];

  for (const item of items) {
    await new Promise(resolve => setTimeout(resolve, delayBetweenRequests));

    const p = Promise.resolve().then(() => processor(item));
    results.push(p as any);

    const e: Promise<void> = p.then(() => {
        executing.splice(executing.indexOf(e), 1);
    });
    executing.push(e);

    if (executing.length >= concurrency) {
        await Promise.race(executing);
    }
  }
  return Promise.all(results);
};

const CHAOS_ARCHETYPES = [
    "A depressed corporate object that gained sentience",
    "A paranoid conspiracy theorist animal",
    "A glitched video game NPC from the 90s",
    "A failed crypto trader who lost everything",
    "A boomer trying to understand gen-z memes",
    "An inanimate object with a god complex",
    "A mutant food item seeking revenge",
    "A poorly drawn drawing that thinks it is a masterpiece",
    "A time traveler who arrived in the wrong timeline"
];

const CHAOS_OBSESSIONS = [
    "Obsessed with green candles and charts",
    "Terrified of 'The Dev' selling",
    "Addicted to hopium",
    "Speaks only in rug-pull metaphors",
    "Thinks the moon is made of liquidity",
    "Hates paper hands with a burning passion"
];

// --- GENERATION FUNCTIONS ---

export const generateMascotIdeas = async (countPerStyle: number, selectedStyleIds: string[], useLiveTrends: boolean = false): Promise<MascotIdea[]> => {
  const userStyles = AVAILABLE_ART_STYLES.filter(s => selectedStyleIds.includes(s.id));
  if (userStyles.length === 0) throw new Error("No styles selected");

  // Filter out original style for AI generation (not present anymore but kept for safety)
  const aiStyles = userStyles.filter(s => s.id !== 'original');
  if (aiStyles.length === 0 && AVAILABLE_ART_STYLES.length > 0) aiStyles.push(AVAILABLE_ART_STYLES[0]); 

  const results: MascotIdea[] = [];
  const TOTAL_COUNT = countPerStyle * aiStyles.length;

  let prompt = "";
  let config: any = {};

  if (useLiveTrends) {
      prompt = `
        You are a viral trend hunter. 
        PERFORM A GOOGLE SEARCH to find the most viral, unhinged, and funny topics from the LAST 48 HOURS.
        Target sources: Reddit, 4chan, Twitter/X trends, and TikTok viral sounds.
        Look for funny news, AI fails, celebrity public freakouts, new meme formats.
        Based on these REAL SEARCH RESULTS, generate exactly ${TOTAL_COUNT} meme mascot concepts.
        Distribution: ${aiStyles.map(s => `- ${countPerStyle} concepts in style: "${s.name}"`).join("\n")}
        OUTPUT JSON ARRAY ONLY: [ { "name", "ticker", "narrative", "artStyleDescription", "imagePrompt", "styleId", "sourceLink" } ]
      `;
      config = {
        tools: [{ googleSearch: {} }],
        systemInstruction: "You are a crypto-native creative director. Analyze search results and convert them into a JSON array.",
        temperature: 0.9,
      };
  } else {
      const systemInstruction = `
        You are a legendary "Degen" Creative Director for Meme Tokens.
        Your goal is to create VIRAL, UNHINGED, and HILARIOUS mascot concepts.
        GLOBAL RULES:
        1. **NO GENERIC ANIMALS**. Characters must be FLAWED, WEIRD, or BROKEN.
        2. **DEGEN NARRATIVES**: Incorporate crypto trauma, delusions, gambling addiction.
        3. **STRUCTURE**: Generate exactly ${countPerStyle} concepts for EACH style: ${aiStyles.map(s => s.name).join(", ")}.
        Total output must be a JSON array of length ${TOTAL_COUNT}.
      `;
      prompt = `
        Generate ${TOTAL_COUNT} unique, high-conviction meme mascot ideas.
        Specific Requirements:
        ${aiStyles.map(s => `- Generate ${countPerStyle} ideas using art style: "${s.name}" (${s.prompt}). Use styleId: "${s.id}".`).join("\n")}

        Chaos Seed: ${CHAOS_ARCHETYPES[Math.floor(Math.random() * CHAOS_ARCHETYPES.length)]}
        Obsession: ${CHAOS_OBSESSIONS[Math.floor(Math.random() * CHAOS_OBSESSIONS.length)]}

        Do NOT use markdown. Return raw JSON.
      `;
      config = {
        systemInstruction: systemInstruction,
        temperature: 1.3,
        responseMimeType: "application/json",
      };
  }

  try {
    return await withRetry(async (ai) => {
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash", 
          contents: prompt,
          config: config,
        });
        if (response.text) {
          const cleanedText = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
          const firstBracket = cleanedText.indexOf('[');
          const lastBracket = cleanedText.lastIndexOf(']');
          if (firstBracket !== -1 && lastBracket !== -1) {
              const jsonString = cleanedText.substring(firstBracket, lastBracket + 1);
              return JSON.parse(jsonString) as MascotIdea[];
          }
          // Fallback parsing
          return JSON.parse(cleanedText) as MascotIdea[];
        }
        throw new Error("No text returned");
    });
  } catch (error) {
    console.error("Error generating ideas:", error);
    return [];
  }
};

export const generateMascotIdeasFromCustomInput = async (customInput: string, countPerStyle: number, selectedStyleIds: string[]): Promise<MascotIdea[]> => {
  const userStyles = AVAILABLE_ART_STYLES.filter(s => selectedStyleIds.includes(s.id));
  if (userStyles.length === 0) throw new Error("No styles selected");
  const TOTAL_COUNT = countPerStyle * userStyles.length;
  const prompt = `
    You are a Concept Artist. The user has a specific idea: "${customInput}".
    Generate exactly ${TOTAL_COUNT} distinct mascot concepts based on this idea.
    Distribution:
    ${userStyles.map(s => `- ${countPerStyle} concepts in style: "${s.name}" (ID: ${s.id})`).join("\n")}
    Return a JSON array of objects. NO MARKDOWN.
    [ { "name": "Name", "ticker": "$TICKER", "narrative": "Backstory related to input", "artStyleDescription": "Style Name", "imagePrompt": "Visual description including style", "styleId": "The exact ID provided above" } ]
  `;
  try {
      return await withRetry(async (ai) => {
          const response = await ai.models.generateContent({
              model: "gemini-2.5-flash",
              contents: prompt,
              config: { responseMimeType: "application/json", temperature: 1.0 }
          });
          if (response.text) return JSON.parse(response.text) as MascotIdea[];
          throw new Error("No text returned");
      });
  } catch (e) {
      console.error(e);
      return [];
  }
};

export const prepareUploadIdeas = async (base64Image: string, countPerStyle: number, selectedStyleIds: string[], preserveOriginal: boolean, customLore?: {name: string, ticker: string, narrative: string}): Promise<MascotIdea[]> => {
    const userStyles = AVAILABLE_ART_STYLES.filter(s => selectedStyleIds.includes(s.id));
    if (userStyles.length === 0) throw new Error("No styles selected");
    const ideas: MascotIdea[] = [];
    if (customLore) {
        for (const style of userStyles) {
            for (let i = 0; i < countPerStyle; i++) {
                ideas.push({
                    name: customLore.name,
                    ticker: customLore.ticker,
                    narrative: customLore.narrative,
                    artStyleDescription: style.name,
                    imagePrompt: `A variation of the uploaded character in ${style.name} style. ${style.prompt}`,
                    styleId: style.id,
                    referenceImage: base64Image,
                    preserveOriginal: preserveOriginal
                });
            }
        }
        return ideas;
    }
    const prompt = `
        Analyze this image. Create ${countPerStyle * userStyles.length} meme personas based on it.
        Styles to apply: ${userStyles.map(s => s.name).join(', ')}.
        For each, provide a name, ticker, and narrative.
        Return JSON array.
        Structure: { name, ticker, narrative, artStyleDescription, imagePrompt, styleId }
        styleId must be one of: ${userStyles.map(s => s.id).join(', ')}.
    `;
    try {
        return await withRetry(async (ai) => {
             const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: {
                    parts: [
                        { inlineData: { mimeType: "image/jpeg", data: base64Image.split(',')[1] } },
                        { text: prompt }
                    ]
                },
                config: { responseMimeType: "application/json" }
             });
             if (response.text) {
                 const parsed = JSON.parse(response.text) as MascotIdea[];
                 return parsed.map(p => ({ ...p, referenceImage: base64Image, preserveOriginal }));
             }
             return [];
        });
    } catch (e) {
        console.error("Remix analysis failed", e);
        return [];
    }
};

/**
 * GENERATE IMAGE WITH FALLBACK
 * Tries Gemini 3 Pro first, falls back to Gemini 2.5 Flash Image.
 */
export const generateMascotImageOnly = async (idea: MascotIdea): Promise<{ imageUrl: string, model: string }> => {
    const parts: any[] = [];
    
    // FIX: Look up the exact style prompt using styleId
    const styleDef = AVAILABLE_ART_STYLES.find(s => s.id === idea.styleId);
    // Use the rigorous definition if found, otherwise fallback to the idea's description
    const effectiveStylePrompt = styleDef ? styleDef.prompt : idea.artStyleDescription;

    // Strict logic for "Lock Pose" (preserveOriginal)
    if (idea.referenceImage) {
        parts.push({ inlineData: { mimeType: "image/jpeg", data: idea.referenceImage.split(',')[1] } }); 
        
        if (idea.preserveOriginal) {
            // STRICT PRESERVATION: COMPOSITE / NO CHANGE TO CHARACTER
            parts.push({ text: `
                IMAGE EDITING / COMPOSITING MODE.
                The attached image is the "Master Asset".
                
                TASK: Generate an image using the Art Style: "${effectiveStylePrompt}".
                
                CRITICAL RULE: THE MAIN CHARACTER IN THE REFERENCE IMAGE MUST REMAIN UNTOUCHED.
                1. DO NOT redraw, restyle, or alter the character's face, fur, skin, features, or pose.
                2. The character should look exactly like the reference photo/image.
                3. Apply the Art Style rules ("${effectiveStylePrompt}") ONLY to the background, lighting, and atmosphere.
                4. Ideally, it should look like the original character was photoshopped into a new stylistic background.
                5. PRESERVE ALL DETAILS of the subject (eyes, expression, accessories).
            `});
        } else {
            parts.push({ text: `Create a variation of this character. \n\nART STYLE RULES: ${effectiveStylePrompt}. \n\nCharacter Concept: ${idea.imagePrompt}` });
        }
    } else {
        // Main generation: Enforce the style rules
        parts.push({ text: `${idea.imagePrompt}. \n\nVISUAL STYLE RULES: ${effectiveStylePrompt}.` });
    }

    // ATTEMPT 1: Gemini 3 Pro (High Quality)
    try {
        const model = "gemini-3-pro-image-preview"; 
        const response = await withRetry(async (ai) => {
            return await ai.models.generateContent({
                model: model,
                contents: { parts },
                config: { safetySettings: IMAGE_SAFETY_SETTINGS }
            });
        });
        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                return {
                    imageUrl: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`,
                    model: model
                };
            }
        }
        throw new Error("No image data in Pro response");
    } catch (proError) {
        console.warn("Gemini 3 Pro failed, attempting fallback to Flash...", proError);
        
        // ATTEMPT 2: Gemini 2.5 Flash Image (Fallback)
        try {
            const model = "gemini-2.5-flash-image";
            const response = await withRetry(async (ai) => {
                return await ai.models.generateContent({
                    model: model,
                    contents: { parts },
                    config: { safetySettings: IMAGE_SAFETY_SETTINGS }
                });
            });
             for (const part of response.candidates?.[0]?.content?.parts || []) {
                if (part.inlineData) {
                    return {
                        imageUrl: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`,
                        model: model
                    };
                }
            }
            throw new Error("No image data in Flash response");
        } catch (flashError) {
            console.error("All image generation attempts failed.", flashError);
            throw new Error("Image Generation Failed");
        }
    }
};

export const generateScenarioPrompts = async (mascot: Mascot, count: number): Promise<string[]> => {
    const prompt = `
        Generate ${count} funny, viral scenarios for this character: "${mascot.name}" (${mascot.narrative}).
        Art Style: ${mascot.artStyle}.
        Return ONLY a JSON array of strings. 
        Example: ["eating a burger", "driving a lambo", "crying at a computer"]
    `;
    const result = await withRetry(async (ai) => {
         const response = await ai.models.generateContent({
             model: "gemini-2.5-flash",
             contents: prompt,
             config: { responseMimeType: "application/json" }
         });
         return response.text ? JSON.parse(response.text) : [];
    });
    return result as string[];
};

export const generateSceneImage = async (prompt: string, aspectRatio: string, referenceImageUrl: string, size: string = "1K", modelType: 'basic'|'pro' = 'basic', preserveOriginal: boolean = false, styleId: string = "original"): Promise<Scene> => {
    // If user explicitly asks for Basic, use Flash. If Pro, try Pro with fallback.
    const requestedModel = modelType === 'pro' ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';
    
    const parts: any[] = [];
    if (referenceImageUrl && referenceImageUrl !== "LOADING") {
         const base64 = referenceImageUrl.split(',')[1];
         parts.push({ inlineData: { mimeType: "image/jpeg", data: base64 } });
    }
    const styleDef = AVAILABLE_ART_STYLES.find(s => s.id === styleId);
    const stylePrompt = styleDef ? styleDef.prompt : "";
    
    // TEXT CONSTRAINT LOGIC
    const isMugshot = styleId === 'viral_mugshot';
    const globalNegativePrompt = isMugshot 
        ? "Ensure the booking placard contains random numbers. Do NOT include speech bubbles or dialogue." 
        : "ABSOLUTELY NO TEXT, NO SPEECH BUBBLES, NO DIALOGUE BUBBLES, NO WORDS, NO TYPOGRAPHY. PURE VISUAL SCENE ONLY.";

    let fullPrompt = "";
    
    if (preserveOriginal) {
        // STRICT COMPOSITING PROMPT FOR SCENES
        fullPrompt = `
            SCENE GENERATION - STRICT CHARACTER LOCK.
            
            REFERENCE: Use the attached image as the definitive character asset.
            SCENE GOAL: ${prompt}.
            
            ABSOLUTE PROHIBITIONS:
            1. DO NOT CHANGE THE CHARACTER'S POSE.
            2. DO NOT CHANGE THE CHARACTER'S FACE OR EXPRESSION.
            3. DO NOT APPLY ARTISTIC FILTERS TO THE CHARACTER ITSELF. 
            4. ${isMugshot ? "ALLOW numbers on booking placard." : "DO NOT GENERATE TEXT OR SPEECH BUBBLES."}
            
            INSTRUCTION:
            - Treat the character as a frozen asset.
            - Build the scene: "${prompt}" AROUND the character.
            - The background and environment should follow the style "${stylePrompt}", but the character must remain visually identical to the source image.
            - If the character is a photo of a dog, it must remain a photo of that dog, even if the background is painted.
            - ${globalNegativePrompt}
        `;
    } else {
        fullPrompt = `Character Reference provided. Create a new image of this character: ${prompt}. Style: ${stylePrompt}. \n\nIMPORTANT RULE: ${globalNegativePrompt}`;
    }

    parts.push({ text: fullPrompt });
    
    const config: any = {
        imageConfig: { aspectRatio: aspectRatio },
        safetySettings: IMAGE_SAFETY_SETTINGS
    };
    if (requestedModel === 'gemini-3-pro-image-preview') {
        config.imageConfig.imageSize = size;
    }

    const executeGen = async (model: string) => {
         const response = await withRetry(async (ai) => {
            return await ai.models.generateContent({
                model: model,
                contents: { parts },
                config: model === 'gemini-3-pro-image-preview' ? config : { imageConfig: { aspectRatio: aspectRatio }, safetySettings: IMAGE_SAFETY_SETTINGS }
            });
        });
        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                return {
                    id: generateId(),
                    description: prompt,
                    imageUrl: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`,
                    modelUsed: model
                };
            }
        }
        throw new Error("No image returned");
    };

    try {
        return await executeGen(requestedModel);
    } catch (e) {
        // If we requested Pro and it failed, try Flash
        if (modelType === 'pro') {
            console.warn("Pro scene gen failed, retrying with Basic...", e);
            try {
                return await executeGen('gemini-2.5-flash-image');
            } catch (e2) {
                throw e2;
            }
        }
        throw e;
    }
};

export const generateDexBannerImage = async (mascot: Mascot): Promise<Scene> => {
    const prompt = `Panoramic header banner for crypto token ${mascot.ticker}. The character ${mascot.name} in an epic pose. Background should be simple gradient or pattern. ${mascot.artStyle}`;
    const scene = await generateSceneImage(prompt, "16:9", mascot.imageUrl, "1K", "pro", mascot.preserveOriginal, mascot.styleId);
    const paddedUrl = await createPaddedBanner(scene.imageUrl);
    return { ...scene, imageUrl: paddedUrl, description: "DEXSCREENER PADDED BANNER" };
};

export const generateXCommBannerImage = async (mascot: Mascot): Promise<Scene> => {
     const prompt = `Twitter Community Header for ${mascot.name}. ${mascot.narrative}. ${mascot.artStyle}. Wide shot.`;
     const scene = await generateSceneImage(prompt, "16:9", mascot.imageUrl, "1K", "pro", mascot.preserveOriginal, mascot.styleId);
     const paddedUrl = await createPaddedXBanner(scene.imageUrl);
     return { ...scene, imageUrl: paddedUrl, description: "X COMM PADDED HEADER" };
};

export const modifyMascotImage = async (currentImageUrl: string, editPrompt: string): Promise<string> => {
    const parts = [
        { inlineData: { mimeType: "image/jpeg", data: currentImageUrl.split(',')[1] } },
        { text: `Edit this image: ${editPrompt}. Maintain the exact style and character identity.` }
    ];
    
    // Attempt Pro first for editing
    try {
        const response = await withRetry(async (ai) => {
            return await ai.models.generateContent({
                model: "gemini-3-pro-image-preview",
                contents: { parts },
                config: { safetySettings: IMAGE_SAFETY_SETTINGS }
            });
        });
        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
        }
        throw new Error("No image returned");
    } catch (e) {
        // Attempt Flash if Pro fails (Flash editing capability is limited but better than crash)
        console.warn("Pro edit failed, retrying with Flash...", e);
         const response = await withRetry(async (ai) => {
            return await ai.models.generateContent({
                model: "gemini-2.5-flash-image",
                contents: { parts },
                config: { safetySettings: IMAGE_SAFETY_SETTINGS }
            });
        });
        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
        }
        throw new Error("Modification failed");
    }
};

// ... (existing search functions kept as is) ...
export const performXDeepResearch = async (excludedTopics: string[] = []): Promise<XTrend[]> => {
    const now = new Date();
    const todayStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const isoToday = now.toISOString().split('T')[0];
    const oneDayAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));
    const isoYesterday = oneDayAgo.toISOString().split('T')[0];
    const exclusionList = excludedTopics.length > 0 ? `DO NOT include these topics that were already found: ${JSON.stringify(excludedTopics)}` : "";
    const prompt = `
        CURRENT DATE: ${todayStr} (YYYY-MM-DD: ${isoToday})
        STRICT TIME WINDOW: ${isoYesterday} to ${isoToday} (LAST 24 HOURS ONLY).
        TASK: Retrieve the "OFFICIAL X.COM TRENDING TOPICS LIST" for today.
        CRITICAL INSTRUCTION: The user wants topics that have specific "x.com/i/trending/..." or "x.com/i/events/..." pages.
        You must ONLY return topics that are trending RIGHT NOW or within the last 24 hours.
        Google Search sometimes indexes these slowly.
        AGGRESSIVE SEARCH STRATEGY (MULTI-SOURCE):
        1. SEARCH X DIRECTLY: "site:x.com/i/events" OR "site:x.com/i/trending" (Filter: Past 24h).
        2. SEARCH 3RD PARTY AGGREGATORS: "Trends24 USA", "GetDayTrends world", "Twitter trending topics right now".
        3. GENERAL NEWS: "Viral news today", "What is trending on X today".
        SYNTHESIS LOGIC:
        - If you find a topic on Trends24 (e.g. "SpaceX"), check if there is an X event link.
        - If you cannot find the specific 'x.com/i/events/...' URL via Google, you MUST construct a high-quality "Trending Click" search URL.
        - FORMAT: 'https://x.com/search?q=TOPIC&src=trend_click&vertical=trends' (e.g. q=SpaceX).
        FILTER CRITERIA (MANDATORY):
        - Must be a high-volume topic (e.g. 10K+ posts).
        - REMOVE generic greetings (e.g. "Good Morning", "Happy Friday").
        - REMOVE extremely boring topics (e.g. "Local traffic update").
        ${exclusionList}
        SCORING INSTRUCTION (CRITICAL):
        For each trend, calculate a "memeScore" (1 to 10).
        - Score 1-3: "Trash Tier". Boring corporate news, generic sports scores, politics with no drama, weather updates. The user will AUTO-HIDE these, so mark boring stuff accurately as low score.
        - Score 4-7: "Mid Tier". Notable news, big tech launches, standard celebrity gossip.
        - Score 8-10: "God Tier". Extremely absurd, funny, cult-like potential, potential for rug-pull narratives, "Florida man" energy.
        RETURN exactly 15 trends in this JSON format:
        [ { "topic": "The exact trending term", "category": "Category", "description": "Why is this on the X trending list?", "memeScore": 8, "volume": "Post count", "url": "x.com link", "source": "x" } ]
        Return ONLY raw JSON.
    `;
    try {
        return await withRetry(async (ai) => {
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
                config: {
                    tools: [{ googleSearch: {} }],
                    systemInstruction: "You are a precise Data Analyst AND a Memecoin Expert. You verify trends using search, but you judge them like a 'Degen' trader. You only care about the last 24 hours.",
                    temperature: 0.7 
                }
            });
            if (response.text) {
                 const cleanedText = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
                 const firstBracket = cleanedText.indexOf('[');
                 const lastBracket = cleanedText.lastIndexOf(']');
                 if (firstBracket !== -1 && lastBracket !== -1) {
                      const jsonString = cleanedText.substring(firstBracket, lastBracket + 1);
                      return JSON.parse(jsonString) as XTrend[];
                 }
            }
            throw new Error("Failed to parse X trends");
        });
    } catch (e) {
        console.error("X Research failed", e);
        return [];
    }
};

// ... (other research functions perform4chanResearch, etc. are the same, assumed to be here) ...
// For brevity in the diff, I am including them implicitly as they don't change logic, just key usage.
// Since I am replacing the whole file content block, I need to include them.

export const perform4chanResearch = async (excludedTopics: string[] = [], timeRange: '24h' | '48h' | '1w' | 'all' | string = '24h', targetKeyword?: string): Promise<XTrend[]> => {
    const exclusionList = excludedTopics.length > 0 ? `DO NOT include these topics that were already found: ${JSON.stringify(excludedTopics)}` : "";
    const now = new Date();
    const todayStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    let past = new Date();
    let timeLabel = "Last 24 Hours";
    let isArchiveMode = false;
    let manualYear = "";
    const yearMatch = timeRange.match(/^20\d{2}$/);
    if (yearMatch) {
        manualYear = timeRange;
        timeLabel = `YEAR ${manualYear}`;
        isArchiveMode = true;
    } else if (timeRange === '24h') {
        past.setDate(now.getDate() - 1);
        timeLabel = "Last 24 Hours";
    } else if (timeRange === '48h') {
        past.setDate(now.getDate() - 2);
        timeLabel = "Last 48 Hours";
    } else if (timeRange === '1w') {
        past.setDate(now.getDate() - 7);
        timeLabel = "Last 7 Days";
    } else if (timeRange === 'all') {
        past.setFullYear(2010);
        timeLabel = "ALL TIME (2010-2024)";
        isArchiveMode = true;
    }
    const pastDateStr = manualYear ? `January 1, ${manualYear}` : past.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const endDateStr = manualYear ? `December 31, ${manualYear}` : todayStr;
    const keywordClause = targetKeyword ? ` AND related to "${targetKeyword}"` : "";
    const searchInjection = targetKeyword ? ` ${targetKeyword}` : "";
    let prompt = "";
    if (isArchiveMode) {
        prompt = `
            The user wants to find LEGENDARY, "OG" 4chan threads/stories from **${manualYear || '2010 to TODAY'}**${keywordClause}.
            SEARCH WINDOW: ${pastDateStr} to ${endDateStr}.
            ${exclusionList}
            SEARCH STRATEGY (TARGET ARCHIVES):
            - "site:warosu.org/biz/${searchInjection} ${manualYear || 'legendary'}"
            - "site:archive.4plebs.org/pol/${searchInjection} ${manualYear || 'greentext'}"
            - "site:archived.moe/b/${searchInjection} ${manualYear || 'memes'}"
            - "classic 4chan memes from ${manualYear || 'history'} ${targetKeyword || ''}"
            LOOK FOR (CLASSICS & LORE):
            1. **Legendary Characters/Memes**: specifically involving "${targetKeyword || 'classic memes'}".
            2. **Epic Narratives**: Stories relevant to the keyword from that era.
            3. **Cult Memes**: Origins of memes related to the keyword.
            EXCLUDE: Generic news, Boring technical discussions, Racism.
            RETURN exactly 15 historical trends in this JSON format:
            [ { "topic": "The Headline", "category": "History ${manualYear || 'Lore'}", "description": "Explain the history. Why is this specific character or story legendary?", "memeScore": 10, "volume": "Cult Status", "url": "Link to archive thread if found.", "source": "4chan" } ]
        `;
    } else {
        prompt = `
            The user wants to create a NEW MEMECOIN PROJECT. They need "Alpha" from /biz/${keywordClause}.
            SEARCH WINDOW: ${pastDateStr} to ${endDateStr} (${timeLabel}).
            ${exclusionList}
            SEARCH STRATEGY:
            - "site:4channel.org/biz/${searchInjection} memecoin ideas"
            - "site:warosu.org/biz/${searchInjection} new narrative"
            - "site:archive.4plebs.org/pol/${searchInjection} funny greentext"
            LOOK FOR NARRATIVES & CHARACTERS (NOT NEWS):
            1. **Greentexts**: Funny stories ${targetKeyword ? `about ${targetKeyword}` : ''}.
            2. **Character Variants**: New versions of Pepe/Wojak related to ${targetKeyword || 'current events'}.
            3. **Larps**: Insider claims about ${targetKeyword || 'coins'}.
            STRICT EXCLUSION LIST: NO Bitcoin/ETH price news, NO ETF/SEC news, NO Mainstream news.
            RETURN exactly 15 trends in this JSON format:
            [ { "topic": "The Narrative", "category": "/biz/ Narrative", "description": "Short summary. Why does this meme make a good memecoin mascot?", "memeScore": 10, "volume": "Thread intensity", "url": "Link to 4chan archive or thread.", "source": "4chan" } ]
        `;
    }
    const systemInstruction = isArchiveMode 
        ? `You are an Internet Historian. You find deep lore and classic memes of 4chan history${targetKeyword ? ` regarding ${targetKeyword}` : ''}.`
        : `You are a 4chan Researcher. You find fresh alpha and narratives${targetKeyword ? ` regarding ${targetKeyword}` : ''} from the last ${timeLabel}.`;
    try {
        return await withRetry(async (ai) => {
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
                config: {
                    tools: [{ googleSearch: {} }],
                    systemInstruction: systemInstruction,
                    temperature: 1.0 
                }
            });
            if (response.text) {
                 const cleanedText = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
                 const firstBracket = cleanedText.indexOf('[');
                 const lastBracket = cleanedText.lastIndexOf(']');
                 if (firstBracket !== -1 && lastBracket !== -1) {
                      const jsonString = cleanedText.substring(firstBracket, lastBracket + 1);
                      return JSON.parse(jsonString) as XTrend[];
                 }
            }
            throw new Error("Failed to parse 4chan Data");
        });
    } catch (e) {
        console.error("4chan Research failed", e);
        return [];
    }
};

export const performKymResearch = async (excludedTopics: string[] = [], timeRange: '24h' | '48h' | '1w' | 'all' = '24h', targetKeyword?: string): Promise<XTrend[]> => {
    const exclusionList = excludedTopics.length > 0 ? `DO NOT include these topics that were already found: ${JSON.stringify(excludedTopics)}` : "";
    const now = new Date();
    const todayStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    let past = new Date();
    let timeLabel = "Last 24 Hours";
    let isAllTime = false;
    if (timeRange === '24h') { past.setDate(now.getDate() - 1); timeLabel = "Last 24 Hours"; } 
    else if (timeRange === '48h') { past.setDate(now.getDate() - 2); timeLabel = "Last 48 Hours"; } 
    else if (timeRange === '1w') { past.setDate(now.getDate() - 7); timeLabel = "Last 7 Days"; } 
    else if (timeRange === 'all') { past.setFullYear(2010); timeLabel = "ALL TIME HISTORY"; isAllTime = true; }
    const pastDateStr = past.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const keywordClause = targetKeyword ? ` AND related to "${targetKeyword}"` : "";
    const searchInjection = targetKeyword ? ` ${targetKeyword}` : "";
    const prompt = `
        YOU ARE A MEME HISTORIAN SPECIALIZING IN "KNOW YOUR MEME" DATABASE.
        TASK: Find ${isAllTime ? 'Legendary/Classic' : 'Trending/New'} Meme Entries on KnowYourMeme.com${keywordClause}.
        SEARCH WINDOW: ${pastDateStr} to ${todayStr}.
        ${exclusionList}
        SEARCH STRATEGY:
        1. "site:knowyourmeme.com ${searchInjection} trending"
        2. "site:knowyourmeme.com ${searchInjection} confirmed meme ${isAllTime ? '' : '2024'}"
        3. "site:knowyourmeme.com ${searchInjection} viral sensation"
        4. "site:knowyourmeme.com ${searchInjection} character lore"
        FILTER CRITERIA (MEMECOIN POTENTIAL):
        - Look for memes with distinct **CHARACTERS** or **Mascots**.
        - Look for **LORE**.
        - If "ALL TIME", find cult classics that haven't been overused.
        - If "24H", find the absolute newest "Confirmed" entries.
        RETURN exactly 15 trends in this JSON format:
        [ { "topic": "Name of the Meme / Entry", "category": "KYM Entry", "description": "The Lore: Why is this meme famous?", "memeScore": 9, "volume": "${isAllTime ? 'Legendary Status' : 'Currently Trending'}", "url": "Link to the KnowYourMeme page.", "source": "kym" } ]
    `;
    try {
        return await withRetry(async (ai) => {
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
                config: {
                    tools: [{ googleSearch: {} }],
                    systemInstruction: "You are a Meme Archaeologist. You dig through KnowYourMeme to find the best lore for new tokens.",
                    temperature: 0.9 
                }
            });
            if (response.text) {
                 const cleanedText = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
                 const firstBracket = cleanedText.indexOf('[');
                 const lastBracket = cleanedText.lastIndexOf(']');
                 if (firstBracket !== -1 && lastBracket !== -1) {
                      const jsonString = cleanedText.substring(firstBracket, lastBracket + 1);
                      return JSON.parse(jsonString) as XTrend[];
                 }
            }
            throw new Error("Failed to parse KYM Data");
        });
    } catch (e) {
        console.error("KYM Research failed", e);
        return [];
    }
};

export const performRedditResearch = async (excludedTopics: string[] = [], timeRange: '24h' | '48h' | '1w' | 'all' = '24h', targetKeyword?: string): Promise<XTrend[]> => {
    const exclusionList = excludedTopics.length > 0 ? `DO NOT include these topics that were already found: ${JSON.stringify(excludedTopics)}` : "";
    const now = new Date();
    const todayStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    let past = new Date();
    let timeLabel = "Last 24 Hours";
    let isAllTime = false;
    if (timeRange === '24h') { past.setDate(now.getDate() - 1); timeLabel = "Last 24 Hours"; } 
    else if (timeRange === '48h') { past.setDate(now.getDate() - 2); timeLabel = "Last 48 Hours"; } 
    else if (timeRange === '1w') { past.setDate(now.getDate() - 7); timeLabel = "Last 7 Days"; } 
    else if (timeRange === 'all') { past.setFullYear(2010); timeLabel = "ALL TIME HISTORY"; isAllTime = true; }
    const pastDateStr = past.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const keywordClause = targetKeyword ? ` AND related to "${targetKeyword}"` : "";
    const searchInjection = targetKeyword ? ` ${targetKeyword}` : "";
    const prompt = `
        YOU ARE A REDDIT LOREMASTER.
        TASK: Find "Memeable" Threads, Characters, or Stories on Reddit${keywordClause}.
        SEARCH WINDOW: ${pastDateStr} to ${todayStr}.
        ${exclusionList}
        SEARCH STRATEGY (TARGET SPECIFIC SUBREDDITS):
        - "site:reddit.com/r/memes ${searchInjection} viral"
        - "site:reddit.com/r/Bossfight ${searchInjection} character"
        - "site:reddit.com/r/WallStreetBets ${searchInjection} mascot"
        - "site:reddit.com/r/PublicFreakout ${searchInjection} funny"
        - "site:reddit.com/r/photoshopbattles ${searchInjection} funny"
        - "site:reddit.com/r/creepy ${searchInjection} cryptid"
        FILTER CRITERIA (MEMECOIN POTENTIAL):
        - Look for **Distinct Characters**.
        - Look for **Funny Backstories/Lore**.
        - Look for **Cursed Images** that have a story.
        RETURN exactly 15 trends in this JSON format:
        [ { "topic": "Title of Reddit Post / Character Name", "category": "r/SubredditName", "description": "The Lore: Why is this memeable?", "memeScore": 9, "volume": "${isAllTime ? 'Legendary Post' : 'High Upvotes'}", "url": "Link to the Reddit thread.", "source": "reddit" } ]
    `;
    try {
        return await withRetry(async (ai) => {
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
                config: {
                    tools: [{ googleSearch: {} }],
                    systemInstruction: "You are a Reddit Power User. You find the deep cuts, the viral characters, and the legends of Reddit history.",
                    temperature: 0.95 
                }
            });
            if (response.text) {
                 const cleanedText = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
                 const firstBracket = cleanedText.indexOf('[');
                 const lastBracket = cleanedText.lastIndexOf(']');
                 if (firstBracket !== -1 && lastBracket !== -1) {
                      const jsonString = cleanedText.substring(firstBracket, lastBracket + 1);
                      return JSON.parse(jsonString) as XTrend[];
                 }
            }
            throw new Error("Failed to parse Reddit Data");
        });
    } catch (e) {
        console.error("Reddit Research failed", e);
        return [];
    }
};

export const performMetaResearch = async (metaKeyword: string, excludedTopics: string[] = [], timeRange: '24h' | '48h' | '1w' = '24h'): Promise<XTrend[]> => {
    const exclusionList = excludedTopics.length > 0 ? `DO NOT include these topics that were already found: ${JSON.stringify(excludedTopics)}` : "";
    const now = new Date();
    const todayStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const past = new Date();
    let timeLabel = "Last 24 Hours";
    if (timeRange === '24h') { past.setDate(now.getDate() - 1); timeLabel = "Last 24 Hours"; } 
    else if (timeRange === '48h') { past.setDate(now.getDate() - 2); timeLabel = "Last 48 Hours"; } 
    else if (timeRange === '1w') { past.setDate(now.getDate() - 7); timeLabel = "Last 7 Days"; }
    const pastDateStr = past.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const prompt = `
        YOU ARE AN EXPERT MEMECOIN "META HUNTER".
        User's Target Meta Keyword: "${metaKeyword}"
        CURRENT DATE: ${todayStr}
        TASK: Scour the internet for VIRAL CONTENT related to the keyword "${metaKeyword}".
        CRITICAL TIME CONSTRAINT: 
        - SEARCH WINDOW: ${pastDateStr} to ${todayStr} (${timeLabel}).
        - IGNORE any event older than this window.
        CRITICAL CONTENT: You are looking for specific RECENT events, videos, images, or news stories involving "${metaKeyword}" that could become a Memecoin.
        ${exclusionList}
        SCORING CRITERIA (Meme Score 1-10):
        - Score 1-4: Generic news.
        - Score 5-7: Interesting but maybe not viral.
        - Score 8-10 (DEGEN GOLD): Absurd, funny, specific characters, highly memeable, happened VERY RECENTLY.
        RETURN exactly 15 trends/events in this JSON format:
        [ { "topic": "Specific Event Headline", "category": "Meta: ${metaKeyword}", "description": "Short explanation of the specific event/video/meme.", "memeScore": 9, "volume": "Viral Context", "url": "Link to the specific tweet, video, or news story.", "source": "mixed" } ]
        Return ONLY raw JSON.
    `;
    try {
        return await withRetry(async (ai) => {
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
                config: {
                    tools: [{ googleSearch: {} }],
                    systemInstruction: `You are a Memecoin Hunter. You find specific, funny, viral instances of a Meta. STRICTLY ADHERE TO THE TIME WINDOW: ${timeLabel}.`,
                    temperature: 0.8 
                }
            });
            if (response.text) {
                 const cleanedText = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
                 const firstBracket = cleanedText.indexOf('[');
                 const lastBracket = cleanedText.lastIndexOf(']');
                 if (firstBracket !== -1 && lastBracket !== -1) {
                      const jsonString = cleanedText.substring(firstBracket, lastBracket + 1);
                      return JSON.parse(jsonString) as XTrend[];
                 }
            }
            throw new Error("Failed to parse Meta Search");
        });
    } catch (e) {
        console.error("Meta Research failed", e);
        return [];
    }
};

export const performGlobalNewsResearch = async (excludedTopics: string[] = [], timeRange: '24h' | '48h' | '1w' = '24h', targetKeyword?: string): Promise<XTrend[]> => {
    const exclusionList = excludedTopics.length > 0 ? `DO NOT include these topics that were already found: ${JSON.stringify(excludedTopics)}` : "";
    const now = new Date();
    const todayStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const past = new Date();
    let timeLabel = "Last 24 Hours";
    if (timeRange === '24h') { past.setDate(now.getDate() - 1); timeLabel = "Last 24 Hours"; } 
    else if (timeRange === '48h') { past.setDate(now.getDate() - 2); timeLabel = "Last 48 Hours"; } 
    else if (timeRange === '1w') { past.setDate(now.getDate() - 7); timeLabel = "Last 7 Days"; }
    const pastDateStr = past.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const searchFocus = targetKeyword ? `TASK: Find weird, funny, or viral news stories specifically related to the keyword: "${targetKeyword}".` : `TASK: Find weird, funny, or absurd global news.`;
    const prompt = `
        YOU ARE AN EXPERT MEMECOIN HUNTER (A "WHALE").
        ${searchFocus}
        SEARCH WINDOW: ${pastDateStr} to ${todayStr} (${timeLabel}).
        SEARCH SCOPE:
        - "${targetKeyword || 'Weird news'} today"
        - "${targetKeyword || 'Bizarre crimes'} in ${timeLabel}"
        - "${targetKeyword || 'Viral internet culture news'}"
        - "${targetKeyword || 'Tech fails and glitches'}"
        - "${targetKeyword || 'Funny animal stories'}"
        DO NOT SEARCH FOR: Serious politics, Tragic events, Boring finance.
        ${exclusionList}
        SCORING CRITERIA (Meme Score 1-10):
        - Score 1-3 (IGNORE): Boring news.
        - Score 4-7: Interesting but maybe too normal.
        - Score 8-10 (GOLD): "Florida Man" energy, absurd animals, AI going rogue, bizarre theft, internet mysteries.
        RETURN exactly 15 trends in this JSON format:
        [ { "topic": "Short punchy headline", "category": "World News / Tech / Weird", "description": "Short explanation of why this is funny/mememable.", "memeScore": 9, "volume": "Viral Context", "url": "Link to the news source found via search.", "source": "news" } ]
        Return ONLY raw JSON.
    `;
    try {
        return await withRetry(async (ai) => {
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
                config: {
                    tools: [{ googleSearch: {} }],
                    systemInstruction: `You are a Memecoin Hunter. You ignore boring news. You only care about stories that could be the next $DOGE or $PEPE. Stick to ${timeLabel}.`,
                    temperature: 0.85 
                }
            });
            if (response.text) {
                 const cleanedText = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
                 const firstBracket = cleanedText.indexOf('[');
                 const lastBracket = cleanedText.lastIndexOf(']');
                 if (firstBracket !== -1 && lastBracket !== -1) {
                      const jsonString = cleanedText.substring(firstBracket, lastBracket + 1);
                      return JSON.parse(jsonString) as XTrend[];
                 }
            }
            throw new Error("Failed to parse Global News");
        });
    } catch (e) {
        console.error("Global News Research failed", e);
        return [];
    }
};

export const performTikTokResearch = async (
    excludedTopics: string[] = [], 
    timeRange: '24h' | '48h' | '1w' = '24h'
): Promise<XTrend[]> => {
    const exclusionList = excludedTopics.length > 0 ? `DO NOT include these topics that were already found: ${JSON.stringify(excludedTopics)}` : "";
    const now = new Date();
    const todayStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const past = new Date();
    let timeLabel = "Last 24 Hours";
    if (timeRange === '24h') { past.setDate(now.getDate() - 1); timeLabel = "Last 24 Hours"; } 
    else if (timeRange === '48h') { past.setDate(now.getDate() - 2); timeLabel = "Last 48 Hours"; } 
    else if (timeRange === '1w') { past.setDate(now.getDate() - 7); timeLabel = "Last 7 Days"; }
    const pastDateStr = past.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    const prompt = `
        YOU ARE A TIKTOK TREND ANALYST.
        TASK: Find the absolute hottest, most viral trends on TikTok right now.
        SEARCH WINDOW: ${pastDateStr} to ${todayStr} (${timeLabel}).
        
        SEARCH SCOPE:
        - "site:tiktok.com trending ${timeLabel}"
        - "tiktok creative center top trends ${timeLabel}"
        - "viral tiktok challenges this week"
        - "trending tiktok sounds today"
        - "top 10 viral tiktok videos today"

        LOOK FOR:
        1. **Viral Challenges**: Specific dances or actions everyone is doing.
        2. **Trending Sounds/Audio**: Songs or clips that are blowing up.
        3. **Niche Aesthetics**: New "core" trends (e.g. "Office Siren", "Mob Wife").
        4. **Meme Characters**: People or animals that went viral on TikTok recently.

        ${exclusionList}

        SCORING CRITERIA (Meme Score 1-10):
        - Score 1-4: Generic dances or old trends.
        - Score 5-7: Popular but maybe not "memecoin" material.
        - Score 8-10 (GOLD): Extremely funny, weird, distinctive characters, high viral velocity.

        RETURN exactly 15 trends in this JSON format:
        [ { "topic": "Name of Trend / Challenge / Sound", "category": "TikTok Trend", "description": "Briefly explain the trend. What do people do in the video?", "memeScore": 9, "volume": "Viral Context (e.g. '1M+ uses')", "url": "Link to a relevant TikTok tag or search.", "source": "tiktok" } ]
        
        Return ONLY raw JSON.
    `;

    try {
        return await withRetry(async (ai) => {
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
                config: {
                    tools: [{ googleSearch: {} }],
                    systemInstruction: `You are a Gen-Z Trend Spotter. You identify what is taking over the For You Page (FYP). Strictly ${timeLabel}.`,
                    temperature: 0.95 
                }
            });

            if (response.text) {
                 const cleanedText = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
                 const firstBracket = cleanedText.indexOf('[');
                 const lastBracket = cleanedText.lastIndexOf(']');
                 if (firstBracket !== -1 && lastBracket !== -1) {
                      const jsonString = cleanedText.substring(firstBracket, lastBracket + 1);
                      return JSON.parse(jsonString) as XTrend[];
                 }
            }
            throw new Error("Failed to parse TikTok Trends");
        });
    } catch (e) {
        console.error("TikTok Research failed", e);
        return [];
    }
};

/**
 * GOD MODE: AGGREGATE RESEARCH
 * Scans ALL platforms at once for the absolute hottest topics.
 */
export const performGodModeResearch = async (
    excludedTopics: string[] = [], 
    timeRange: '24h' | '48h' | '1w' = '24h',
    keyword?: string
): Promise<XTrend[]> => {
    const now = new Date();
    const todayStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const past = new Date();
    let timeLabel = "Last 24 Hours";
    if (timeRange === '24h') { past.setDate(now.getDate() - 1); timeLabel = "Last 24 Hours"; } 
    else if (timeRange === '48h') { past.setDate(now.getDate() - 2); timeLabel = "Last 48 Hours"; } 
    else if (timeRange === '1w') { past.setDate(now.getDate() - 7); timeLabel = "Last 7 Days"; }
    const pastDateStr = past.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    const keywordFocus = keyword ? `FOCUS: ONLY find cross-platform trends related to "${keyword}".` : "FOCUS: Find the most viral CROSS-PLATFORM trends.";

    const prompt = `
        YOU ARE THE "INTERNET GOD". YOU SEE EVERYTHING.
        TASK: Perform a simultaneous, deep-scan of X (Twitter), Reddit, 4chan (/biz/ & /pol/), KnowYourMeme, TikTok, and Global Viral News.
        
        SEARCH WINDOW: ${pastDateStr} to ${todayStr} (${timeLabel}).
        ${keywordFocus}

        OBJECTIVE: Identify the "Golden Intersection" of trends.
        - If a topic is on TikTok AND Twitter = HIGH SCORE.
        - If a topic is on 4chan AND Reddit = HIGH LORE POTENTIAL.
        - If a specific news story is generating memes everywhere = GOLD.

        SEARCH STRATEGY (EXECUTE ALL):
        1. "site:x.com trending ${timeLabel} ${keyword || ''}"
        2. "site:reddit.com viral ${timeLabel} ${keyword || ''}"
        3. "site:tiktok.com trending ${timeLabel} ${keyword || ''}"
        4. "site:knowyourmeme.com trending ${timeLabel} ${keyword || ''}"
        5. "site:4channel.org/biz/ ${timeLabel} ${keyword || ''}"
        6. "viral news ${timeLabel} ${keyword || ''}"

        CRITERIA FOR SELECTION:
        1. **Virality**: Must be exploding right now.
        2. **Memecoin Potential**: Must have a character, a catchy name, or an absurd story.
        3. **Lore Depth**: Is there a story behind it?

        SCORING:
        - 10/10: Trending on 3+ platforms OR extremely culturally significant today.
        - 8/10: Trending heavily on 1 platform with bleed-over potential.
        - Filter out generic politics or sports unless strictly meme-related (e.g. a specific funny moment).

        RETURN EXACTLY 30 RESULTS in this JSON format:
        [ 
            { 
                "topic": "Trend Name", 
                "category": "Cross-Platform Narrative", 
                "description": "Why is this the chosen one? Which platforms is it on?", 
                "memeScore": 10, 
                "volume": "Global Viral Status", 
                "url": "Link to the best source.",
                "source": "mixed" 
            } 
        ]
        
        Note on 'source' field: If it's primarily one platform, use 'x', 'reddit', 'tiktok', '4chan', 'kym', 'news'. If it's everywhere, use 'mixed'.
        Return ONLY raw JSON.
    `;

    try {
        return await withRetry(async (ai) => {
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
                config: {
                    tools: [{ googleSearch: {} }],
                    systemInstruction: `You are the Omniscient Trend Watcher. You ignore noise. You find the Signal. You define the Meta.`,
                    temperature: 1.0 
                }
            });

            if (response.text) {
                 const cleanedText = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
                 const firstBracket = cleanedText.indexOf('[');
                 const lastBracket = cleanedText.lastIndexOf(']');
                 if (firstBracket !== -1 && lastBracket !== -1) {
                      const jsonString = cleanedText.substring(firstBracket, lastBracket + 1);
                      return JSON.parse(jsonString) as XTrend[];
                 }
            }
            throw new Error("Failed to parse God Mode Trends");
        });
    } catch (e) {
        console.error("God Mode Research failed", e);
        return [];
    }
};
