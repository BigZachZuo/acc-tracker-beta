import React, { useState, useRef } from 'react';
import { Track, User, LapTime, InputDevice } from '../types';
import { CARS, TRACKS } from '../constants';
import { submitLapTime, updateLapTime } from '../services/storageService';
import Button from './Button';
import Input from './Input';
import InputDeviceIcon from './InputDeviceIcon';
import { GoogleGenAI, Type } from "@google/genai";

interface SubmitLapFormProps {
  track: Track;
  user: User;
  onSuccess: () => void;
  onCancel: () => void;
  initialData?: LapTime | null;
}

const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        // Resize to max 1920x1920 - better for OCR while keeping payload reasonable
        const MAX_SIZE = 1920;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            // Compress to JPEG 80% quality
            resolve(canvas.toDataURL('image/jpeg', 0.8));
        } else {
            reject(new Error("Canvas context failed"));
        }
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

const SubmitLapForm: React.FC<SubmitLapFormProps> = ({ track: initialTrack, user, onSuccess, onCancel, initialData }) => {
  // State initialization
  const [targetTrackId, setTargetTrackId] = useState(initialData?.trackId || initialTrack.id);
  const [carId, setCarId] = useState(initialData?.carId || CARS[0].id);
  const [minutes, setMinutes] = useState(initialData?.minutes.toString() || '');
  const [seconds, setSeconds] = useState(initialData?.seconds.toString() || '');
  const [millis, setMillis] = useState(initialData?.milliseconds.toString() || '');
  const [conditions, setConditions] = useState<'Dry' | 'Wet'>(initialData?.conditions || 'Dry');
  const [trackTemp, setTrackTemp] = useState(initialData?.trackTemp?.toString() || '');
  const [inputDevice, setInputDevice] = useState<InputDevice>(initialData?.inputDevice || 'Wheel');
  const [isVerified, setIsVerified] = useState<boolean>(initialData?.isVerified || false);
  
  const [error, setError] = useState('');
  const [rawError, setRawError] = useState(''); // To show the exact error message
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // AI Analysis State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEditing = !!initialData;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
        // Compress image before setting preview to save memory and later bandwidth
        const compressedBase64 = await compressImage(file);
        setPreviewImage(compressedBase64);
        setIsVerified(false);
        setError('');
        setRawError('');
    } catch (err) {
        console.error("Image processing error:", err);
        setError("图片处理失败，请重试");
    }
  };

  const analyzeScreenshot = async (base64Full: string) => {
    setIsAnalyzing(true);
    setError('');
    setRawError('');

    try {
      const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
      if (!apiKey) {
        console.error("API Key is missing in environment variables");
        throw new Error("Missing API Key. Please check environment variables (VITE_API_KEY, API_KEY, or GEMINI_API_KEY).");
      }

      // Clean base64 string (remove data:image/jpeg;base64, prefix)
      const base64Data = base64Full.split(',')[1];
      // Extract mime type dynamically, though we compressed to jpeg
      const mimeType = base64Full.split(';')[0].split(':')[1];

      const ai = new GoogleGenAI({ apiKey });
      
      // Prepare Contexts
      const carIds = CARS.map(c => c.id);
      const trackIds = TRACKS.map(t => t.id);
      
      const carListContext = CARS.map(c => `ID: "${c.id}", Name: "${c.brand} ${c.name}"`).join('\n');
      const trackListContext = TRACKS.map(t => `ID: "${t.id}", Name: "${t.name}"`).join('\n');

      const prompt = `
        Analyze this Assetto Corsa Competizione screenshot.
        
        Tasks:
        1. **Fastest Lap**: Identify the FASTEST (lowest) valid lap time.
           - CRITICAL: Do NOT just pick the first time you see. You MUST scan the entire list.
           - Look for columns labeled "Best", "Fastest", or "Lap".
           - List ALL valid times found in the \`allLapTimesFound\` field.
           - Compare ALL valid times found in the image.
           - Select the SMALLEST numerical value (e.g. 2:14.000 is faster than 2:15.000).
           - Ignore invalid laps (red text, or marked with 'Invalid', 'C', '*').
           - STRICT FORMAT: "Minutes:Seconds.Milliseconds" (e.g., 2:24.123).
           - The number BEFORE the colon (:) is MINUTES.
           - The number AFTER the colon (:) is SECONDS.
           - The number AFTER the dot (.) is MILLISECONDS (must be 3 digits).
           - WARNING: Do NOT swap Minutes and Seconds. 
             - Correct: "2:27.495" -> Minutes=2, Seconds=27, Milliseconds=495.
           - Pay close attention to the milliseconds part (the 3 digits after the dot).
        2. **Car**: Identify the Car Model specifically used for that fastest lap. Match it to the provided Car List.
           - Ensure the car matches the row where the fastest lap was found.
        3. **Track**: Identify the Track Name from the UI/Environment and match to the provided Track List.
        4. **Conditions**: Identify Track Temperature (e.g., "Track: 24°C").

        Lists:
        [CARS]
        ${carListContext}

        [TRACKS]
        ${trackListContext}
      `;

      let response;
      let attempt = 0;
      const maxAttempts = 3;

      while (attempt < maxAttempts) {
        try {
          // Use 'gemini-2.0-flash' as it is stable and reliable for multimodal tasks
          response = await ai.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: {
              parts: [
                { inlineData: { mimeType: mimeType, data: base64Data } },
                { text: prompt }
              ]
            },
            config: {
              maxOutputTokens: 1024,
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  isValid: { type: Type.BOOLEAN, description: "True if image contains valid ACC lap time data" },
                  allLapTimesFound: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of all valid lap times found in the image (e.g. ['2:15.123', '2:14.567'])" },
                  rawLapTime: { type: Type.STRING, description: "The exact string of the fastest lap time found (e.g. '2:14.567')" },
                  minutes: { type: Type.INTEGER },
                  seconds: { type: Type.INTEGER },
                  milliseconds: { type: Type.INTEGER, description: "The milliseconds part (0-999). E.g. 567 for .567s" },
                  carId: { type: Type.STRING, enum: carIds, description: "ID from Car List" },
                  trackId: { type: Type.STRING, enum: trackIds, description: "ID from Track List" },
                  trackTemp: { type: Type.INTEGER },
                },
                required: ["isValid"]
              }
            }
          });
          break; // Success, exit loop
        } catch (err: any) {
          const isOverloaded = err.message?.includes('503') || err.message?.includes('overloaded') || err.status === 503 || err.message?.includes('429');
          
          if (isOverloaded && attempt < maxAttempts - 1) {
            attempt++;
            console.warn(`Gemini API Error. Retrying (Attempt ${attempt}/${maxAttempts})...`);
            // Exponential backoff: 1s, 2s, 4s...
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
            continue;
          }
          
          throw err; // Rethrow if not retryable or max attempts reached
        }
      }

      const resultText = response?.text;
      if (resultText) {
        let cleanText = resultText.trim();
        if (cleanText.startsWith('```')) {
            cleanText = cleanText.replace(/^```json\s?/, '').replace(/^```\s?/, '').replace(/```$/, '');
        }

        let data;
        try {
            data = JSON.parse(cleanText);
        } catch (parseErr) {
            console.error("JSON Parse Error:", parseErr);
            console.error("Raw Text:", cleanText.slice(0, 500));
            throw new Error("AI returned invalid JSON. Please try again.");
        }
        
        // CHECK VALIDITY
        if (!data.isValid) {
            setError("识别失败：请上传包含 赛道、车辆 和 圈速数据 的 ACC 游戏截图 (如统计数据页、结算页或排行榜)。");
            setIsVerified(false);
            return;
        }

        if (data.minutes !== undefined) setMinutes(data.minutes.toString());
        if (data.seconds !== undefined) setSeconds(data.seconds.toString());
        if (data.milliseconds !== undefined) setMillis(data.milliseconds.toString());
        
        // Track temp is manual now, do not set from AI
        
        if (data.carId && CARS.some(c => c.id === data.carId)) {
          setCarId(data.carId);
        }

        if (data.trackId && TRACKS.some(t => t.id === data.trackId)) {
          setTargetTrackId(data.trackId);
        }

        // Successfully analyzed via AI -> Set as Verified
        setIsVerified(true);
      }

    } catch (err: any) {
      console.error("AI Analysis Failed:", err);
      
      const errorStr = err.message || JSON.stringify(err);
      setRawError(errorStr); // Save raw error for display

      let friendlyError = "AI 识别失败";

      // Debug helper: Show last 4 chars of key to verify update
      const keySuffix = process.env.API_KEY && process.env.API_KEY.length > 4 
        ? process.env.API_KEY.slice(-4) 
        : "****";

      if (errorStr.includes("Project quota tier unavailable")) {
        friendlyError = `项目配额受限 (Key尾号: ${keySuffix})。该 Key 关联的 Google Cloud 项目未绑定结算账户。如果您刚刚绑定了信用卡，可能需要等待几分钟生效。`;
      } else if (errorStr.includes("403")) {
        friendlyError = `API 权限不足 (Key尾号: ${keySuffix})。请检查 Key 是否有效，或尝试重新创建。`;
      } else if (errorStr.includes("429") || errorStr.includes("RESOURCE_EXHAUSTED") || errorStr.includes("quota")) {
        friendlyError = "配额耗尽 (429)。请稍后再试。";
      } else if (errorStr.includes("503") || errorStr.includes("overloaded")) {
        friendlyError = "AI 服务繁忙 (503)，正在重试但仍未恢复，请稍后再试。";
      } else if (errorStr.includes("API Key") || errorStr.includes("400") || errorStr.includes("must be set") || errorStr.includes("Missing API Key")) {
         friendlyError = "API Key 配置错误。请检查环境变量配置 (VITE_API_KEY 或 API_KEY)。";
      } else if (errorStr.includes("404")) {
         friendlyError = "模型不可用 (404)。请检查代码中使用的 Gemini 模型版本。";
      }

      setError(friendlyError);
      setIsVerified(false); 
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setRawError('');
    setSuccessMessage('');
    setIsSubmitting(true);

    if (!isVerified) {
        setError('必须通过上传游戏截图并成功识别后才能提交。');
        setIsSubmitting(false);
        return;
    }

    const m = parseInt(minutes);
    const s = parseInt(seconds);
    const ms = parseInt(millis);
    const tTemp = trackTemp ? parseInt(trackTemp) : undefined;

    if (isNaN(m) || isNaN(s) || isNaN(ms)) {
      setError('数据无效，请重新识别。');
      setIsSubmitting(false);
      return;
    }
    
    // Strict Verification check
    if (s >= 60 || ms >= 1000) {
       setError('时间格式无效，请检查识别结果。');
       setIsSubmitting(false);
       return;
    }

    const totalMilliseconds = (m * 60 * 1000) + (s * 1000) + ms;

    const generateId = () => {
      if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
      }
      return Date.now().toString(36) + Math.random().toString(36).substr(2);
    };

    const lapData: LapTime = {
      id: initialData?.id || generateId(), // Preserve ID if editing
      username: user.username,
      userEmail: user.email, 
      trackId: targetTrackId, 
      carId,
      minutes: m,
      seconds: s,
      milliseconds: ms,
      totalMilliseconds,
      timestamp: initialData?.timestamp || new Date().toISOString(), // Preserve timestamp if editing, or use current
      conditions,
      trackTemp: tTemp,
      inputDevice,
      isVerified: true // Must be true to reach here
    };

    let result;
    if (isEditing) {
       result = await updateLapTime(lapData);
    } else {
       result = await submitLapTime(lapData);
    }
    
    if (result.success) {
      setSuccessMessage(result.message);
      setTimeout(() => {
        onSuccess();
      }, 1500);
    } else {
      setError(result.message);
    }
    setIsSubmitting(false);
  };

  const currentTrack = TRACKS.find(t => t.id === targetTrackId) || initialTrack;

  const BillingLink = () => (
    <a 
      href="https://console.cloud.google.com/billing" 
      target="_blank" 
      rel="noopener noreferrer"
      className="block w-full bg-yellow-700 hover:bg-yellow-600 text-white text-center text-xs py-2 rounded transition-colors mt-2"
    >
      👉 点击此处前往 Google Cloud Console 绑定结算账户
    </a>
  );

  return (
    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-2xl max-w-lg mx-auto w-full animate-fade-in-up">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <span className="text-red-500">{isEditing ? '编辑圈速' : '录入圈速'}</span>
        </h2>
        <div className="flex items-center gap-2">
          {isVerified && (
             <div className="flex items-center gap-1 text-xs bg-green-900/40 text-green-400 px-2 py-1 rounded border border-green-800">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
               </svg>
               已验证
             </div>
          )}
          <div className="text-xs bg-slate-900 px-3 py-1 rounded-full border border-slate-700 text-slate-400">
             严格模式
          </div>
        </div>
      </div>

      {/* AI Upload Section */}
      <div className="mb-6 p-4 bg-slate-900/50 rounded-lg border border-slate-700 border-dashed hover:border-red-500/50 transition-colors">
        <input 
          type="file" 
          accept="image/*" 
          className="hidden" 
          ref={fileInputRef}
          onChange={handleImageUpload}
        />
        
        {!previewImage ? (
          <button 
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex flex-col items-center justify-center gap-2 py-4 text-slate-400 hover:text-white transition-colors"
          >
            <div className="bg-slate-800 p-3 rounded-full animate-bounce">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <span className="text-sm font-bold">
              {isEditing ? '上传新截图以更新数据' : '点击上传游戏截图'}
            </span>
            <span className="text-xs text-slate-500">
               请上传"车手资料 / 统计数据"页面的完整截图
            </span>
          </button>
        ) : (
          <div className="relative">
            <img 
              src={previewImage} 
              alt="Preview" 
              className="w-full h-32 object-cover rounded-lg opacity-80" 
            />

            {/* Loading State */}
            {isAnalyzing && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-sm rounded-lg z-10">
                 <span className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin mb-2"></span>
                 <span className="text-white font-bold text-sm shadow-black drop-shadow-md">正在识别赛道与圈速...</span>
                 <span className="text-xs text-slate-300 mt-1">如遇到繁忙，系统将自动重试</span>
              </div>
            )}
            
            {/* Manual Trigger Button */}
            {!isAnalyzing && !isVerified && !error && (
               <div className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/50 transition-colors rounded-lg z-10">
                   <Button 
                      onClick={() => analyzeScreenshot(previewImage)}
                      variant="primary"
                      className="shadow-xl scale-110 !px-6 !py-2"
                   >
                      🤖 开始 AI 识别
                   </Button>
               </div>
            )}

            {/* Error State with Retry */}
            {!isAnalyzing && error && (
               <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 backdrop-blur-sm rounded-lg z-10 p-4 text-center">
                  <div className="text-red-400 text-sm font-bold mb-1">{error}</div>
                  {(error.includes("项目配额") || error.includes("Project quota")) && <BillingLink />}
                  
                  {/* Detailed Error for Debugging */}
                  {rawError && (
                     <div className="text-[10px] text-slate-400 mb-3 mt-2 max-w-xs break-all bg-black/30 p-1 rounded font-mono">
                        {rawError.slice(0, 150)}{rawError.length > 150 ? '...' : ''}
                     </div>
                  )}

                  <div className="flex gap-2 mt-2">
                    <Button 
                      type="button" 
                      variant="primary" 
                      className="!py-1 !px-3 !text-xs"
                      onClick={(e) => {
                         e.stopPropagation();
                         analyzeScreenshot(previewImage);
                      }}
                    >
                      重试
                    </Button>
                    <Button 
                      type="button" 
                      variant="secondary" 
                      className="!py-1 !px-3 !text-xs"
                      onClick={() => {
                        setPreviewImage(null);
                        setError('');
                        setRawError('');
                      }}
                    >
                      重新上传
                    </Button>
                  </div>
               </div>
            )}

            {/* Delete/Clear Button */}
            {!isAnalyzing && (
              <button 
                type="button"
                onClick={() => {
                  setPreviewImage(null);
                  setError('');
                  setRawError('');
                  if (!isEditing) {
                      setMinutes('');
                      setSeconds('');
                      setMillis('');
                      setTrackTemp('');
                      // Don't reset targetTrackId completely, let it stay visual
                  }
                  setIsVerified(false);
                }}
                className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 hover:bg-red-600 transition-colors z-20"
                title="清除图片"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Track Display - Read Only */}
        <div>
           <div className="flex items-center gap-2 mb-2">
             <label className="block text-slate-400 text-sm font-bold">赛道 (AI 自动识别)</label>
             <span className="text-xs text-slate-500">🔒</span>
           </div>
           <div className={`flex items-center gap-3 p-3 bg-slate-950 border border-slate-800 rounded-lg ${isAnalyzing ? 'opacity-50' : ''}`}>
              {currentTrack.imageUrl && (
                 <img src={currentTrack.imageUrl} className="h-8 w-8 object-contain brightness-0 invert opacity-50" alt="Track Icon"/>
              )}
              <div className="flex-1">
                 <div className="text-white font-bold">{currentTrack.name}</div>
                 <div className="text-xs text-slate-500">{currentTrack.country} • {currentTrack.length}</div>
              </div>
           </div>
        </div>

        {/* Car Selection - Read Only/Disabled */}
        <div>
          <div className="flex items-center gap-2 mb-2">
             <label className="block text-slate-400 text-sm font-bold">车辆 (AI 自动识别)</label>
             <span className="text-xs text-slate-500">🔒</span>
          </div>
          <select 
            value={carId} 
            disabled={true}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white opacity-70 cursor-not-allowed appearance-none"
          >
            {CARS.map(car => (
              <option key={car.id} value={car.id}>
                [{car.class}] {car.brand} {car.name}
              </option>
            ))}
          </select>
        </div>

        {/* Lap Time Inputs - Read Only */}
        <div>
          <div className="flex items-center gap-2 mb-2">
             <label className="block text-slate-400 text-sm font-bold">圈速成绩 (AI 自动识别)</label>
             <span className="text-xs text-slate-500">🔒</span>
             {isVerified && (
               <span className="text-[10px] text-green-500 bg-green-900/20 px-1.5 rounded border border-green-800/50">已锁定</span>
             )}
          </div>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Input 
                placeholder="--" 
                value={minutes}
                readOnly
                className={`text-center font-mono cursor-not-allowed bg-slate-950 text-slate-300 border-slate-800 focus:border-slate-800 focus:ring-0 ${isAnalyzing ? 'opacity-50' : ''}`}
                type="number"
              />
              <span className="text-xs text-slate-500 text-center block mt-1">分</span>
            </div>
            <span className="text-2xl text-slate-500 pb-8">:</span>
            <div className="flex-1">
              <Input 
                placeholder="--" 
                value={seconds}
                readOnly
                className={`text-center font-mono cursor-not-allowed bg-slate-950 text-slate-300 border-slate-800 focus:border-slate-800 focus:ring-0 ${isAnalyzing ? 'opacity-50' : ''}`}
                type="number"
              />
              <span className="text-xs text-slate-500 text-center block mt-1">秒</span>
            </div>
            <span className="text-2xl text-slate-500 pb-8">.</span>
            <div className="flex-1">
              <Input 
                placeholder="---" 
                value={millis}
                readOnly
                className={`text-center font-mono cursor-not-allowed bg-slate-950 text-slate-300 border-slate-800 focus:border-slate-800 focus:ring-0 ${isAnalyzing ? 'opacity-50' : ''}`}
                type="number"
              />
              <span className="text-xs text-slate-500 text-center block mt-1">毫秒</span>
            </div>
          </div>
        </div>

        {/* Manual Inputs Section */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-800">
           <div>
              <label className="block text-slate-400 text-sm font-bold mb-2">赛道温度 (°C)</label>
              <div className="relative">
                <Input
                  type="number"
                  placeholder="24"
                  value={trackTemp}
                  onChange={(e) => setTrackTemp(e.target.value)}
                  className={isAnalyzing ? 'opacity-50' : ''}
                />
                <span className="absolute right-4 top-3.5 text-slate-500">°C</span>
              </div>
           </div>
           
           <div>
              <label className="block text-slate-400 text-sm font-bold mb-2">输入设备</label>
              <div className="flex flex-col gap-2">
                 <div className="grid grid-cols-3 gap-2">
                    {(['Wheel', 'Gamepad', 'Keyboard'] as InputDevice[]).map((dev) => (
                      <button
                        key={dev}
                        type="button"
                        onClick={() => setInputDevice(dev)}
                        className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all ${
                          inputDevice === dev
                            ? 'bg-red-600 border-red-500 text-white shadow-lg shadow-red-900/20'
                            : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                        }`}
                        title={dev === 'Wheel' ? '方向盘' : dev === 'Gamepad' ? '手柄' : '键盘'}
                      >
                        <InputDeviceIcon device={dev} className="h-8 w-8" />
                      </button>
                    ))}
                 </div>
              </div>
           </div>
        </div>

        <div>
          <label className="block text-slate-400 text-sm font-bold mb-2">赛道状况</label>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setConditions('Dry')}
              className={`flex-1 py-3 rounded-lg font-bold border ${
                conditions === 'Dry' 
                  ? 'bg-orange-500/20 border-orange-500 text-orange-500' 
                  : 'bg-slate-900 border-slate-700 text-slate-500 hover:bg-slate-800'
              }`}
            >
              ☀️ 干地
            </button>
            <button
              type="button"
              onClick={() => setConditions('Wet')}
              className={`flex-1 py-3 rounded-lg font-bold border ${
                conditions === 'Wet' 
                  ? 'bg-blue-500/20 border-blue-500 text-blue-500' 
                  : 'bg-slate-900 border-slate-700 text-slate-500 hover:bg-slate-800'
              }`}
            >
              🌧️ 湿地
            </button>
          </div>
        </div>

        {error && !previewImage && (
          <div className="bg-yellow-900/50 border border-yellow-500/50 text-yellow-200 px-4 py-3 rounded text-sm font-semibold break-words">
            <div>⚠️ {error}</div>
            {(error.includes("项目配额") || error.includes("Project quota")) && <BillingLink />}
          </div>
        )}

        {successMessage && (
           <div className="bg-green-900/50 border border-green-500/50 text-green-200 px-4 py-3 rounded text-sm font-semibold flex items-center gap-2">
             ✅ {successMessage}
           </div>
        )}

        <div className="flex gap-3 pt-4">
          <Button type="button" variant="ghost" onClick={onCancel} className="flex-1" disabled={isSubmitting || isAnalyzing}>
            {isEditing ? '取消编辑' : '返回'}
          </Button>
          <Button 
            type="submit" 
            className="flex-1 disabled:opacity-50 disabled:cursor-not-allowed" 
            disabled={!isVerified || !!successMessage || isSubmitting || isAnalyzing} 
            isLoading={isSubmitting}
          >
            {isEditing ? '更新成绩' : '提交成绩'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default SubmitLapForm;