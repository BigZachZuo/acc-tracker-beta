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

const SubmitLapForm: React.FC<SubmitLapFormProps> = ({ track: initialTrack, user, onSuccess, onCancel, initialData }) => {
  // --- Form State ---
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
  const [successMessage, setSuccessMessage] = useState(''); // Only for form submission success
  const [aiFeedback, setAiFeedback] = useState(''); // For AI Analysis feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // --- AI Analysis State ---
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEditing = !!initialData;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setPreviewImage(base64String);
      analyzeScreenshot(base64String); // Auto-start analysis
    };
    reader.readAsDataURL(file);
  };

  const analyzeScreenshot = async (base64Data: string) => {
    setIsAnalyzing(true);
    setError('');
    setSuccessMessage('');
    setAiFeedback('');

    try {
      // 1. Prepare Base64 Data (Strip prefix)
      const match = base64Data.match(/^data:(.+);base64,(.+)$/);
      if (!match) throw new Error("Invalid image data");
      const mimeType = match[1];
      const rawBase64 = match[2];

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

      // 2. Prepare Context Lists for the AI to match against
      const trackList = TRACKS.map(t => `ID: "${t.id}", Name: "${t.name}"`).join('\n');
      const carList = CARS.map(c => `ID: "${c.id}", Car: "${c.brand} ${c.name}"`).join('\n');

      const prompt = `
        Analyze this screenshot from the racing simulator Assetto Corsa Competizione (ACC).
        
        Task 1: Identify the FASTEST VALID Lap Time.
        - Look at the columns usually labeled "Lap", "Time", "Last Lap", or "Best Lap".
        - If the image contains a list of laps, you MUST compare them and select the one with the lowest numerical value (fastest time).
        - Ignore laps marked as "Invalid" (often red or crossed out) if possible.
        - Format: Minutes:Seconds.Milliseconds.
        
        Task 2: Identify the Car Model.
        - Look for car names in the UI header or list rows.
        - Match strictly to one of the IDs in the provided list.
        
        Task 3: Identify the Track.
        - Look for track names or layout maps.
        - Match strictly to one of the IDs in the provided list.

        Constraints:
        - DO NOT extract Track Temperature.
        - If you cannot find a specific value, leave it null.
        - Do not hallucinate.

        Data Lists for matching:
        --- TRACKS ---
        ${trackList}
        
        --- CARS ---
        ${carList}
      `;

      // 3. Call Gemini API with JSON Schema
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            { inlineData: { mimeType, data: rawBase64 } },
            { text: prompt }
          ]
        },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              minutes: { type: Type.INTEGER },
              seconds: { type: Type.INTEGER },
              milliseconds: { type: Type.INTEGER },
              trackId: { type: Type.STRING },
              carId: { type: Type.STRING },
              // Removed trackTemp from schema
            },
            required: ["minutes", "seconds", "milliseconds"],
          }
        }
      });

      // 4. Handle Response
      const text = response.text;
      if (!text) throw new Error("AI returned empty response");
      
      const data = JSON.parse(text);
      console.log("AI Analysis Result:", data);

      let identifiedInfo = [];

      // Update Form State
      if (data.minutes !== undefined && data.minutes !== null) setMinutes(data.minutes.toString());
      if (data.seconds !== undefined && data.seconds !== null) setSeconds(data.seconds.toString());
      if (data.milliseconds !== undefined && data.milliseconds !== null) setMillis(data.milliseconds.toString());
      
      if (data.trackId && TRACKS.find(t => t.id === data.trackId)) {
        setTargetTrackId(data.trackId);
        identifiedInfo.push("赛道");
      }
      
      if (data.carId && CARS.find(c => c.id === data.carId)) {
        setCarId(data.carId);
        identifiedInfo.push("车型");
      }

      // Track Temp is now manual only, so we don't set it here.

      setIsVerified(true);
      setAiFeedback(`智能识别完成! (${identifiedInfo.join(', ')})`);

    } catch (err: any) {
      console.error("AI Error:", err);
      setError("识别失败: " + (err.message || "无法分析图片，请手动输入。"));
      setIsVerified(false);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleManualTimeChange = (setter: React.Dispatch<React.SetStateAction<string>>, value: string) => {
    setter(value);
    setIsVerified(false); // Manually editing invalidates the AI verification
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setIsSubmitting(true);

    const m = parseInt(minutes);
    const s = parseInt(seconds);
    const ms = parseInt(millis);
    const tTemp = trackTemp ? parseInt(trackTemp) : undefined;

    if (isNaN(m) || isNaN(s) || isNaN(ms)) {
      setError('请输入有效的圈速。');
      setIsSubmitting(false);
      return;
    }
    if (s >= 60) {
      setError('秒数必须小于60。');
      setIsSubmitting(false);
      return;
    }
    if (ms >= 1000) {
      setError('毫秒数必须小于1000。');
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
      id: initialData?.id || generateId(),
      username: user.username,
      userEmail: user.email, 
      trackId: targetTrackId, 
      carId,
      minutes: m,
      seconds: s,
      milliseconds: ms,
      totalMilliseconds,
      timestamp: initialData?.timestamp || new Date().toISOString(),
      conditions,
      trackTemp: tTemp,
      inputDevice,
      isVerified: isVerified
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
               AI 已验证
             </div>
          )}
          <div className="text-xs bg-slate-900 px-3 py-1 rounded-full border border-slate-700 text-slate-400">
             Gemini Vision AI
          </div>
        </div>
      </div>

      {/* Image Upload Trigger */}
      <div className="mb-6">
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
            className="w-full flex flex-col items-center justify-center gap-2 py-8 bg-slate-900/50 rounded-lg border border-slate-700 border-dashed hover:border-red-500/50 transition-colors group relative overflow-hidden"
          >
              <div className="bg-slate-800 p-3 rounded-full group-hover:scale-110 transition-transform">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <span className="text-sm font-bold text-slate-300">
                上传游戏截图
              </span>
              <span className="text-xs text-slate-500 text-center max-w-xs px-4">
                 AI 自动识别车型、赛道和最快圈速
              </span>
          </button>
        ) : (
          <div className="relative rounded-lg overflow-hidden border border-slate-600 bg-slate-950">
             <img src={previewImage} alt="Preview" className="w-full max-h-64 object-contain opacity-80" />
             
             {isAnalyzing && (
               <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-sm">
                  <span className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin mb-3"></span>
                  <span className="text-white font-bold text-sm shadow-black drop-shadow-md animate-pulse">正在分析图片...</span>
               </div>
             )}

             {!isAnalyzing && (
               <button 
                type="button"
                onClick={() => {
                  setPreviewImage(null);
                  setIsVerified(false);
                  setAiFeedback('');
                  if (!isEditing) {
                     setMinutes(''); setSeconds(''); setMillis('');
                  }
                }}
                className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1.5 hover:bg-red-600 transition-colors"
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
        {/* Track Selection */}
        <div>
           <div className="flex items-center gap-2 mb-2">
             <label className="block text-slate-400 text-sm font-bold">赛道</label>
           </div>
           <select 
             value={targetTrackId} 
             onChange={(e) => setTargetTrackId(e.target.value)}
             className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
           >
             {TRACKS.map(t => (
               <option key={t.id} value={t.id}>{t.name}</option>
             ))}
           </select>
        </div>

        {/* Car Selection */}
        <div>
          <label className="block text-slate-400 text-sm font-bold mb-2">车辆</label>
          <select 
            value={carId} 
            onChange={(e) => setCarId(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
          >
            {CARS.map(car => (
              <option key={car.id} value={car.id}>
                [{car.class}] {car.brand} {car.name}
              </option>
            ))}
          </select>
        </div>

        {/* Lap Time Inputs */}
        <div>
          <label className="block text-slate-400 text-sm font-bold mb-2">圈速成绩</label>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Input 
                placeholder="00" 
                value={minutes}
                onChange={(e) => handleManualTimeChange(setMinutes, e.target.value)}
                className={`text-center font-mono ${isAnalyzing ? 'opacity-50' : ''}`}
                type="number"
                min="0"
                max="59"
              />
              <span className="text-xs text-slate-500 text-center block mt-1">分</span>
            </div>
            <span className="text-2xl text-slate-500 pb-8">:</span>
            <div className="flex-1">
              <Input 
                placeholder="00" 
                value={seconds}
                onChange={(e) => handleManualTimeChange(setSeconds, e.target.value)}
                className={`text-center font-mono ${isAnalyzing ? 'opacity-50' : ''}`}
                type="number"
                min="0"
                max="59"
              />
              <span className="text-xs text-slate-500 text-center block mt-1">秒</span>
            </div>
            <span className="text-2xl text-slate-500 pb-8">.</span>
            <div className="flex-1">
              <Input 
                placeholder="000" 
                value={millis}
                onChange={(e) => handleManualTimeChange(setMillis, e.target.value)}
                className={`text-center font-mono ${isAnalyzing ? 'opacity-50' : ''}`}
                type="number"
                min="0"
                max="999"
              />
              <span className="text-xs text-slate-500 text-center block mt-1">毫秒</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
           <div>
              <label className="block text-slate-400 text-sm font-bold mb-2">赛道温度 (°C) <span className="text-xs font-normal text-slate-500">(可选)</span></label>
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

        {error && (
          <div className="bg-yellow-900/50 border border-yellow-500/50 text-yellow-200 px-4 py-3 rounded text-sm font-semibold break-words">
            ⚠️ {error}
          </div>
        )}

        {aiFeedback && !successMessage && (
           <div className="bg-blue-900/30 border border-blue-500/50 text-blue-200 px-4 py-3 rounded text-sm font-semibold flex items-center gap-2">
             ✨ {aiFeedback}
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
          <Button type="submit" className="flex-1" disabled={!!successMessage || isSubmitting || isAnalyzing} isLoading={isSubmitting}>
            {isEditing ? '更新成绩' : '提交成绩'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default SubmitLapForm;