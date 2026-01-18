import React, { useState, useEffect, useRef } from 'react';
import { Camera, Printer, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Layout, ArrowRightLeft, ArrowUpDown, Wand2, Loader2, Eraser, PenTool, Move, ZoomIn, Image as ImageIcon, RotateCcw, Maximize2, Minimize2, Key, X, Info, Type, Palette, AlignLeft } from 'lucide-react';

/**
 * 香港農曆月曆製作器 (HK Lunar Calendar Portal) v7.2 (Scroll Zoom)
 * Fixes:
 * 1. Added "Scroll to Zoom" functionality using mouse wheel on the image container.
 * 2. Implemented non-passive event listener to prevent page scrolling while zooming image.
 */

// --- 1. Constants & Data ---

const WEEKDAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAYS_ZH = ['日', '一', '二', '三', '四', '五', '六'];

const HK_HOLIDAYS = {
  // 2024
  '2024-01-01': '元旦', '2024-02-10': '農曆年初一', '2024-02-12': '農曆年初三', '2024-02-13': '農曆年初四',
  '2024-03-29': '耶穌受難節', '2024-03-30': '耶穌受難節翌日', '2024-04-01': '復活節星期一', '2024-04-04': '清明節',
  '2024-05-01': '勞動節', '2024-05-15': '佛誕', '2024-06-10': '端午節', '2024-07-01': '特區成立紀念日',
  '2024-09-18': '中秋節翌日', '2024-10-01': '國慶日', '2024-10-11': '重陽節', '2024-12-25': '聖誕節', '2024-12-26': '聖誕節後第一個周日',
  // 2025
  '2025-01-01': '元旦', '2025-01-29': '農曆年初一', '2025-01-30': '農曆年初二', '2025-01-31': '農曆年初三',
  '2025-04-04': '清明節', '2025-04-18': '耶穌受難節', '2025-04-19': '耶穌受難節翌日', '2025-04-21': '復活節星期一',
  '2025-05-01': '勞動節', '2025-05-05': '佛誕', '2025-05-31': '端午節', '2025-07-01': '特區成立紀念日',
  '2025-10-01': '國慶日', '2025-10-07': '中秋節翌日', '2025-10-29': '重陽節', '2025-12-25': '聖誕節', '2025-12-26': '聖誕節後第一個周日',
  // 2026
  '2026-01-01': '元旦', '2026-02-17': '農曆年初一', '2026-02-18': '農曆年初二', '2026-02-19': '農曆年初三',
  '2026-04-03': '耶穌受難節', '2026-04-04': '清明節', '2026-04-06': '復活節星期一', '2026-05-01': '勞動節',
  '2026-05-24': '佛誕', '2026-06-19': '端午節', '2026-07-01': '特區成立紀念日', '2026-09-26': '中秋節翌日',
  '2026-10-01': '國慶日', '2026-10-19': '重陽節', '2026-12-25': '聖誕節', '2026-12-26': '聖誕節後第一個周日',
};

const DEFAULT_THEMES = [
  "https://placehold.co/800x600/f3f4f6/94a3b8?text=JAN&font=roboto",
  "https://placehold.co/800x600/f3f4f6/94a3b8?text=FEB&font=roboto",
  "https://placehold.co/800x600/f3f4f6/94a3b8?text=MAR&font=roboto",
  "https://placehold.co/800x600/f3f4f6/94a3b8?text=APR&font=roboto",
  "https://placehold.co/800x600/f3f4f6/94a3b8?text=MAY&font=roboto",
  "https://placehold.co/800x600/f3f4f6/94a3b8?text=JUN&font=roboto",
  "https://placehold.co/800x600/f3f4f6/94a3b8?text=JUL&font=roboto",
  "https://placehold.co/800x600/f3f4f6/94a3b8?text=AUG&font=roboto",
  "https://placehold.co/800x600/f3f4f6/94a3b8?text=SEP&font=roboto",
  "https://placehold.co/800x600/f3f4f6/94a3b8?text=OCT&font=roboto",
  "https://placehold.co/800x600/f3f4f6/94a3b8?text=NOV&font=roboto",
  "https://placehold.co/800x600/f3f4f6/94a3b8?text=DEC&font=roboto",
];

const FONT_OPTIONS = {
  sans: { name: '黑體 (Modern)', value: "'Noto Sans TC', sans-serif" },
  serif: { name: '明體 (Classic)', value: "'Noto Serif TC', serif" },
  kai: { name: '楷體 (Calligraphy)', value: "'Kaiti', 'STKaiti', 'BiauKai', serif" },
  hand: { name: '手寫 (Handwritten)', value: "'Ma Shan Zheng', cursive" },
};

// --- 2. Helper Components & Utilities ---

const resizeImage = (base64Str, maxWidth = 1024) => {
  return new Promise((resolve) => {
    let img = new Image();
    img.src = base64Str;
    img.onload = () => {
      let canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      if (width > maxWidth) {
        height *= maxWidth / width;
        width = maxWidth;
      }
      canvas.width = width;
      canvas.height = height;
      let ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
  });
};

const useLunar = () => {
  const [lunarLoaded, setLunarLoaded] = useState(false);
  useEffect(() => {
    if (window.Solar && window.Lunar) {
      setLunarLoaded(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/lunar-javascript@1.6.12/lunar.min.js';
    script.async = true;
    script.onload = () => setLunarLoaded(true);
    document.body.appendChild(script);
  }, []);
  const getLunarData = (date) => {
    const Solar = window.Solar || (window.Lunar && window.Lunar.Solar);
    if (!lunarLoaded || !Solar) return null;
    try {
      const solar = Solar.fromYmd(date.getFullYear(), date.getMonth() + 1, date.getDate());
      const lunar = solar.getLunar();
      const jieQi = lunar.getJieQi();
      const festivals = lunar.getFestivals();
      let mainText = lunar.getDayInChinese();
      if (mainText === '初一') mainText = lunar.getMonthInChinese() + '月';
      return {
        dayZH: mainText,
        jieQi: jieQi || null,
        festivals: festivals,
        monthZH: lunar.getMonthInChinese(),
        yearZH: lunar.getYearInGanZhi() + '年 (' + lunar.getYearShengXiao() + ')',
      };
    } catch (e) {
      return null;
    }
  };
  return { getLunarData, lunarLoaded };
};

// --- 3. Main Component ---

export default function App() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [userImages, setUserImages] = useState({});
  const [imageTransforms, setImageTransforms] = useState({});
  
  // Text Overlay State
  const [textOverlays, setTextOverlays] = useState({});
  const [activeTab, setActiveTab] = useState('image'); // 'image' or 'text'

  const [layoutMode, setLayoutMode] = useState('side-by-side');
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [customApiKey, setCustomApiKey] = useState("");
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [showPrintHelp, setShowPrintHelp] = useState(false);
  const [showBatchPrintModal, setShowBatchPrintModal] = useState(false);
  const [batchPrintStart, setBatchPrintStart] = useState('2026-01');
  const [batchPrintEnd, setBatchPrintEnd] = useState('2026-12');
  const [isBatchPrinting, setIsBatchPrinting] = useState(false);
  
  const { getLunarData, lunarLoaded } = useLunar();
  const fileInputRef = useRef(null);

  // Dragging Refs
  const isDraggingImageRef = useRef(false);
  const isDraggingTextRef = useRef(false);
  const startPosRef = useRef({ x: 0, y: 0 });
  const imageRef = useRef(null);
  const imageContainerRef = useRef(null); // Ref for wheel event

  // Load Fonts
  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Ma+Shan+Zheng&family=Noto+Serif+TC:wght@400;700&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }, []);

  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const handlePrint = () => setShowPrintHelp(true);
  
  const handleBatchPrint = () => {
    setIsBatchPrinting(true);
    setTimeout(() => {
      window.print();
      setIsBatchPrinting(false);
    }, 100);
  };
  
  const generateBatchCalendars = () => {
    const [startYear, startMonth] = batchPrintStart.split('-').map(Number);
    const [endYear, endMonth] = batchPrintEnd.split('-').map(Number);
    const calendars = [];
    
    for (let y = startYear; y <= endYear; y++) {
      const startM = y === startYear ? startMonth - 1 : 0;
      const endM = y === endYear ? endMonth - 1 : 11;
      for (let m = startM; m <= endM; m++) {
        calendars.push({ year: y, month: m, date: new Date(y, m, 1) });
      }
    }
    return calendars;
  };

  const currentKey = `${currentDate.getFullYear()}-${currentDate.getMonth()}`;
  const currentImage = userImages[currentKey] || DEFAULT_THEMES[currentDate.getMonth()];
  const isUserImage = !!userImages[currentKey];
  
  const transform = imageTransforms[currentKey] || { scale: 1, x: 0, y: 0, fit: 'contain' };
  const textConfig = textOverlays[currentKey] || { text: '', x: 20, y: 20, size: 24, font: 'sans', color: '#ffffff', shadow: true, align: 'center' };

  const updateTransform = (newVals) => {
    setImageTransforms(prev => ({ ...prev, [currentKey]: { ...transform, ...newVals } }));
  };

  const updateTextConfig = (newVals) => {
    setTextOverlays(prev => ({ ...prev, [currentKey]: { ...textConfig, ...newVals } }));
  };

  const resetTransform = () => updateTransform({ scale: 1, x: 0, y: 0, fit: 'contain' });
  const toggleFit = () => updateTransform({ fit: transform.fit === 'contain' ? 'cover' : 'contain', scale: 1, x: 0, y: 0 });

  // Scroll to Zoom Effect
  useEffect(() => {
    const container = imageContainerRef.current;
    if (!container) return;

    const handleWheel = (e) => {
      if (!isUserImage) return;
      // Prevent default page scroll to allow zooming
      e.preventDefault();

      // Adjust sensitivity as needed
      const delta = -e.deltaY * 0.002; 
      
      setImageTransforms(prev => {
        const t = prev[currentKey] || { scale: 1, x: 0, y: 0, fit: 'contain' };
        // Clamp scale between 0.5 and 5
        const newScale = Math.min(Math.max(t.scale + delta, 0.5), 5);
        return {
          ...prev,
          [currentKey]: { ...t, scale: newScale }
        };
      });
    };

    // Use { passive: false } to allow preventDefault
    container.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [isUserImage, currentKey]);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const resized = await resizeImage(event.target.result);
        setUserImages(prev => ({ ...prev, [currentKey]: resized }));
        resetTransform(); 
      };
      reader.readAsDataURL(file);
    }
  };

  // --- Pan/Drag Handlers ---
  const handleMouseDownImage = (e) => {
    if (!isUserImage) return;
    if (isDraggingTextRef.current) return; // Prioritize text dragging
    e.preventDefault();
    isDraggingImageRef.current = true;
    startPosRef.current = { x: e.clientX - transform.x, y: e.clientY - transform.y };
  };

  const handleMouseDownText = (e) => {
    e.stopPropagation(); // Stop image drag
    e.preventDefault();
    isDraggingTextRef.current = true;
    startPosRef.current = { x: e.clientX - textConfig.x, y: e.clientY - textConfig.y };
  };

  const handleMouseMove = (e) => {
    e.preventDefault();
    if (isDraggingTextRef.current) {
        const newX = e.clientX - startPosRef.current.x;
        const newY = e.clientY - startPosRef.current.y;
        updateTextConfig({ x: newX, y: newY });
    } else if (isDraggingImageRef.current) {
        const newX = e.clientX - startPosRef.current.x;
        const newY = e.clientY - startPosRef.current.y;
        updateTransform({ x: newX, y: newY });
    }
  };

  const handleMouseUp = () => {
    isDraggingImageRef.current = false;
    isDraggingTextRef.current = false;
  };

  // --- AI Functions ---
  const runAIModel = async (prompt, loadingText) => {
    if (!isUserImage || isGenerating) return;
    setIsGenerating(true);
    setLoadingMsg(loadingText);
    let apiKey = customApiKey || ""; 
    try {
      const originalImageBase64 = userImages[currentKey];
      if (!originalImageBase64 || !originalImageBase64.includes(',')) throw new Error("圖片數據無效");
      const base64Data = originalImageBase64.split(',')[1];
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType: "image/jpeg", data: base64Data } }] }],
          generationConfig: { responseModalities: ["TEXT", "IMAGE"] }
        })
      });
      if (!response.ok) {
         if ([400, 401, 403].includes(response.status)) {
            setShowKeyModal(true);
            throw new Error(`API 金鑰無效或未設定 (${response.status})。請在彈出視窗輸入您的 Key。`);
         }
         const errorText = await response.text();
         throw new Error(`AI 服務錯誤 (Code: ${response.status}) - ${errorText}`);
      }
      const result = await response.json();
      const imagePart = result.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
      if (imagePart) {
        const newImageBase64 = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
        setUserImages(prev => ({ ...prev, [currentKey]: newImageBase64 }));
      } else {
        alert("AI 未能生成圖片，請稍後再試。");
      }
    } catch (error) {
      console.error(error);
      if (!showKeyModal) alert(`處理失敗: ${error.message}`);
    } finally {
      setIsGenerating(false);
      setLoadingMsg("");
    }
  };

  // --- Calendar Logic ---
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const calendarDays = [];
  for (let i = 0; i < firstDayOfMonth; i++) calendarDays.push({ day: null });
  for (let i = 1; i <= daysInMonth; i++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    const dateObj = new Date(year, month, i);
    const holidayName = HK_HOLIDAYS[dateStr];
    calendarDays.push({ 
        day: i, 
        dateStr, 
        isSunday: dateObj.getDay() === 0, 
        isHoliday: !!holidayName,
        holidayName: holidayName, 
        lunar: getLunarData(dateObj) 
    });
  }
  const lunarYearInfo = getLunarData(new Date(year, month, 15))?.yearZH || '';

  const containerClass = layoutMode === 'side-by-side' ? 'flex-row' : 'flex-col';
  const imageWidthClass = layoutMode === 'side-by-side' ? 'border-r' : 'w-full h-[40%] border-b';
  const calendarWidthClass = layoutMode === 'side-by-side' ? '' : 'w-full h-[60%]';
  const calendarPadding = layoutMode === 'side-by-side' ? 'p-4' : 'p-3';
  const imageStyle = layoutMode === 'side-by-side' ? { flex: '0 0 40%' } : {};
  const calendarStyle = layoutMode === 'side-by-side' ? { flex: '0 0 60%' } : {};

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-800 pb-12">
      {/* Header */}
      <div className="print:hidden bg-white border-b shadow-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 text-white p-2 rounded-lg shadow-sm">
              <CalendarIcon size={20} />
            </div>
            <h1 className="text-lg font-bold text-slate-800 hidden sm:block">
              HK Calendar <span className="text-indigo-600 text-xs font-normal border border-indigo-200 px-1 rounded">創作者版</span>
            </h1>
          </div>
          <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-lg border border-slate-200">
             <button onClick={prevMonth} className="p-2 hover:bg-white rounded-md text-slate-600"><ChevronLeft size={20} /></button>
             <div className="px-2 font-medium min-w-[100px] text-center">{year}年 {month + 1}月</div>
             <button onClick={nextMonth} className="p-2 hover:bg-white rounded-md text-slate-600"><ChevronRight size={20} /></button>
          </div>
          <div className="flex items-center gap-3">
             <div className="flex bg-slate-100 p-1 rounded-lg">
                <button onClick={() => setLayoutMode('side-by-side')} className={`p-1.5 rounded ${layoutMode === 'side-by-side' ? 'bg-white shadow text-indigo-600' : 'text-slate-400'}`}><ArrowRightLeft size={16} /></button>
                <button onClick={() => setLayoutMode('top-bottom')} className={`p-1.5 rounded ${layoutMode === 'top-bottom' ? 'bg-white shadow text-indigo-600' : 'text-slate-400'}`}><ArrowUpDown size={16} /></button>
             </div>
             <button onClick={() => setShowKeyModal(true)} className={`p-2 rounded-md transition-colors ${customApiKey ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400 hover:text-slate-600'}`}><Key size={18} /></button>
             {!isBatchPrinting && <button onClick={() => setShowBatchPrintModal(true)} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium shadow-sm"><Printer size={16} /> 批量列印</button>}
             {isBatchPrinting && <button onClick={() => setIsBatchPrinting(false)} className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium shadow-sm"><X size={16} /> 關閉批量列印</button>}
             <button onClick={handlePrint} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium shadow-sm"><Printer size={16} /> 列印</button>
          </div>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="max-w-full mx-auto p-4 md:p-8 flex flex-col items-center overflow-auto" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
        
        {/* Editor Controls */}
        {isUserImage && (
          <div className="w-full max-w-3xl mb-4 bg-white rounded-xl shadow-sm border border-slate-200 print:hidden animate-in fade-in slide-in-from-top-4 overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-slate-100 bg-slate-50/50">
              <button onClick={() => setActiveTab('image')} className={`flex-1 py-2 text-xs font-medium flex items-center justify-center gap-2 ${activeTab === 'image' ? 'text-indigo-600 bg-white border-t-2 border-indigo-600' : 'text-slate-500 hover:bg-slate-100'}`}>
                <ImageIcon size={14}/> 圖片調整 (AI)
              </button>
              <button onClick={() => setActiveTab('text')} className={`flex-1 py-2 text-xs font-medium flex items-center justify-center gap-2 ${activeTab === 'text' ? 'text-indigo-600 bg-white border-t-2 border-indigo-600' : 'text-slate-500 hover:bg-slate-100'}`}>
                <Type size={14}/> 文字疊加
              </button>
            </div>

            <div className="p-3">
              {activeTab === 'image' ? (
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-slate-600">
                      <ZoomIn size={16} />
                      <input type="range" min="0.5" max="5" step="0.1" value={transform.scale} onChange={(e) => updateTransform({ scale: parseFloat(e.target.value) })} className="w-24 h-2 bg-slate-200 rounded-lg cursor-pointer accent-indigo-600" />
                    </div>
                    <button onClick={toggleFit} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-md text-xs font-medium">
                      {transform.fit === 'contain' ? <Maximize2 size={14}/> : <Minimize2 size={14}/>}
                      {transform.fit === 'contain' ? "全圖" : "填滿"}
                    </button>
                    <button onClick={resetTransform} className="text-xs text-slate-500 hover:text-indigo-600 flex items-center gap-1"><RotateCcw size={12}/> 重置</button>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => runAIModel("Remove the background of this image and replace it with a pure white background. Keep the main subject intact.", "正在移除背景...")} disabled={isGenerating} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-medium disabled:opacity-50">
                      {isGenerating ? <Loader2 className="animate-spin" size={14}/> : <Eraser size={14}/>} 去背
                    </button>
                    <button onClick={() => runAIModel("Convert this image into a simple black and white line art sketch, suitable for a coloring book. Clear lines, white background, no shading, high contrast.", "正在轉換為素描...")} disabled={isGenerating} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-medium disabled:opacity-50">
                      {isGenerating ? <Loader2 className="animate-spin" size={14}/> : <PenTool size={14}/>} 轉線稿
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-start gap-4">
                  <div className="flex-1 min-w-[200px]">
                    <textarea 
                      placeholder="在此輸入要在圖片上顯示的文字..." 
                      value={textConfig.text} 
                      onChange={(e) => updateTextConfig({ text: e.target.value })}
                      className="w-full h-20 p-2 border border-slate-200 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                    />
                  </div>
                  <div className="flex flex-col gap-2 min-w-[180px]">
                    <select 
                      value={textConfig.font} 
                      onChange={(e) => updateTextConfig({ font: e.target.value })}
                      className="w-full p-1.5 border border-slate-200 rounded text-xs bg-white"
                    >
                      {Object.entries(FONT_OPTIONS).map(([key, opt]) => <option key={key} value={key}>{opt.name}</option>)}
                    </select>
                    
                    <div className="flex items-center gap-2">
                      <Type size={14} className="text-slate-400"/>
                      <input type="range" min="12" max="72" value={textConfig.size} onChange={(e) => updateTextConfig({ size: parseInt(e.target.value) })} className="flex-1 h-2 bg-slate-200 rounded-lg accent-indigo-600" />
                      <span className="text-xs w-6 text-right">{textConfig.size}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        {['#ffffff', '#000000', '#dc2626', '#d97706'].map(c => (
                          <button key={c} onClick={() => updateTextConfig({ color: c })} className={`w-5 h-5 rounded-full border border-slate-200 ${textConfig.color === c ? 'ring-2 ring-indigo-300' : ''}`} style={{ backgroundColor: c }} />
                        ))}
                      </div>
                      <label className="flex items-center gap-1 text-xs text-slate-600 ml-auto cursor-pointer select-none">
                        <input type="checkbox" checked={textConfig.shadow} onChange={(e) => updateTextConfig({ shadow: e.target.checked })} className="rounded text-indigo-600 focus:ring-indigo-500"/>
                        陰影
                      </label>
                    </div>
                    
                    <div className="flex items-center gap-1 bg-slate-50 p-1 rounded">
                      <AlignLeft size={12} className="text-slate-400"/>
                      {[{ value: 'left', label: '左' }, { value: 'center', label: '中' }, { value: 'right', label: '右' }].map(opt => (
                        <button key={opt.value} onClick={() => updateTextConfig({ align: opt.value })} className={`flex-1 px-2 py-1 text-xs rounded ${textConfig.align === opt.value ? 'bg-white shadow text-indigo-600 font-medium' : 'text-slate-500'}`}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Global Loading */}
        {isGenerating && (
          <div className="fixed inset-0 bg-black/50 z-[100] flex flex-col items-center justify-center text-white backdrop-blur-sm">
            <Loader2 className="animate-spin mb-4" size={48} />
            <div className="text-lg font-bold">{loadingMsg}</div>
          </div>
        )}

        {/* Canvas */}
        <div className={`bg-white shadow-2xl print:shadow-none relative overflow-hidden flex ${containerClass}`} style={{ width: '210mm', height: '148mm', flexShrink: 0 }}>
          
          {/* Image Area */}
          <div className={`${imageWidthClass} bg-slate-50 relative overflow-hidden group border-slate-100`} style={imageStyle}>
            {/* The Image Itself - Wrapper for ref */}
            <div 
              ref={imageContainerRef}
              className={`w-full h-full relative overflow-hidden ${isUserImage ? 'cursor-move' : ''}`}
              onMouseDown={handleMouseDownImage}
            >
              <img 
                ref={imageRef}
                src={currentImage} 
                alt="Feature" 
                className="origin-center w-full h-full pointer-events-none select-none"
                style={{ 
                  objectFit: isUserImage ? transform.fit : 'cover', 
                  transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
                  transition: (isDraggingImageRef.current || isDraggingTextRef.current) ? 'none' : 'transform 0.1s ease-out'
                }}
              />
            </div>

            {/* Text Overlay */}
            {isUserImage && textConfig.text && (
              <div 
                className="absolute cursor-move select-none whitespace-pre-wrap leading-tight z-20"
                style={{
                  left: textConfig.x,
                  top: textConfig.y,
                  fontSize: `${textConfig.size}px`,
                  fontFamily: FONT_OPTIONS[textConfig.font].value,
                  color: textConfig.color,
                  textShadow: textConfig.shadow ? '2px 2px 4px rgba(0,0,0,0.8)' : 'none',
                  fontWeight: textConfig.font === 'hand' ? 'normal' : 'bold',
                  textAlign: textConfig.align || 'center',
                }}
                onMouseDown={handleMouseDownText}
              >
                {textConfig.text}
              </div>
            )}

            <div className="absolute top-2 right-2 print:hidden z-10">
              <button onClick={() => fileInputRef.current.click()} className="bg-white/80 hover:bg-white text-slate-700 p-2 rounded-full shadow-md backdrop-blur-sm transition-all"><ImageIcon size={20} /></button>
            </div>
            
            {!isUserImage && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none print:hidden">
                <div className="bg-black/20 text-white px-4 py-2 rounded-full text-sm backdrop-blur-md">點擊右上方按鈕上傳照片</div>
              </div>
            )}
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
          </div>

          {/* Calendar Area */}
          <div className={`${calendarWidthClass} ${calendarPadding} flex flex-col justify-between bg-white relative`} style={calendarStyle}>
            <div className="flex justify-between items-end mb-2 border-b-2 border-indigo-500 pb-2">
              <div className="flex items-baseline gap-3">
                <h2 className="text-4xl font-bold text-slate-800 leading-none tracking-tight">{month + 1}<span className="text-lg ml-1 text-slate-500 font-medium">月</span></h2>
                <div className="flex flex-col border-l pl-3 border-slate-300">
                  <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">{new Date(year, month).toLocaleString('en-US', { month: 'long' })}</span>
                  <span className="text-xs text-slate-400 font-light">{year} {lunarYearInfo}</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-7 mb-2">
              {WEEKDAYS_EN.map((d, i) => (
                <div key={d} className={`text-center group`}>
                  <div className={`text-[10px] uppercase font-bold tracking-wider ${i === 0 || i === 6 ? 'text-red-500' : 'text-slate-400'}`}>{d}</div>
                  <div className={`text-[9px] font-normal ${i === 0 || i === 6 ? 'text-red-400' : 'text-slate-300'}`}>{WEEKDAYS_ZH[i]}</div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 flex-grow auto-rows-fr gap-1">
              {calendarDays.map((item, idx) => {
                if (!item.day) return <div key={idx} className="bg-transparent"></div>;
                // Correctly check for holidays
                const isRed = item.isSunday || item.isHoliday;
                const fest = item.lunar?.festivals?.[0];
                const displayLunar = item.lunar?.jieQi || (fest && fest.length <= 4 ? fest : item.lunar?.dayZH);
                const lunarClass = item.lunar?.jieQi ? "text-indigo-600 font-medium" : (fest ? "text-red-600 font-medium" : "text-slate-400");

                return (
                  <div key={idx} className={`relative p-1 border rounded-sm flex flex-col justify-start ${isRed ? 'bg-red-50/30 border-red-50' : 'bg-slate-50/30 border-slate-100'}`}>
                    <span className={`text-lg font-bold leading-none ${isRed ? 'text-red-600' : 'text-slate-700'} font-sans`}>{item.day}</span>
                    <div className="flex flex-col mt-auto">
                        {item.isHoliday && <span className="text-[9px] leading-tight text-red-500 truncate font-medium mb-0.5 block w-full">{item.holidayName}</span>}
                        <span className={`text-[8px] leading-none transform ${lunarClass} truncate block w-full`}>{displayLunar}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Helper Modals */}
      {showKeyModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
                <div className="flex justify-between items-center mb-4"><h3 className="text-lg font-bold flex items-center gap-2"><Key className="text-indigo-600" size={20} /> 設定 API Key</h3><button onClick={() => setShowKeyModal(false)}><X size={20}/></button></div>
                <input type="password" placeholder="Paste API Key here..." value={customApiKey} onChange={(e) => setCustomApiKey(e.target.value)} className="w-full border p-2 mb-4 rounded font-mono text-sm"/>
                <div className="flex justify-end gap-2"><button onClick={() => setCustomApiKey("")} className="px-4 py-2 text-sm text-slate-500">清除</button><button onClick={() => setShowKeyModal(false)} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded">儲存</button></div>
            </div>
        </div>
      )}
      {showPrintHelp && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm">
             <h3 className="text-lg font-bold mb-2">列印操作指引</h3>
             <p className="text-sm text-slate-600 mb-4">請使用鍵盤快捷鍵啟動列印 (Ctrl+P / Cmd+P)。</p>
             <button onClick={() => setShowPrintHelp(false)} className="w-full bg-blue-600 text-white py-2 rounded-lg">我明白了</button>
          </div>
        </div>
      )}
      {showBatchPrintModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
             <div className="flex justify-between items-center mb-4"><h3 className="text-lg font-bold">批量列印日期範圍</h3><button onClick={() => setShowBatchPrintModal(false)}><X size={20}/></button></div>
             <div className="space-y-4">
               <div>
                 <label className="block text-sm font-medium mb-1">開始日期 (YYYY-MM)</label>
                 <input type="month" value={batchPrintStart} onChange={(e) => setBatchPrintStart(e.target.value)} className="w-full border border-slate-200 rounded p-2"/>
               </div>
               <div>
                 <label className="block text-sm font-medium mb-1">結束日期 (YYYY-MM)</label>
                 <input type="month" value={batchPrintEnd} onChange={(e) => setBatchPrintEnd(e.target.value)} className="w-full border border-slate-200 rounded p-2"/>
               </div>
               <p className="text-xs text-slate-500">每頁會列印 2 個月份</p>
             </div>
             <div className="flex justify-end gap-2 mt-6"><button onClick={() => setShowBatchPrintModal(false)} className="px-4 py-2 text-sm text-slate-500">取消</button><button onClick={() => { setShowBatchPrintModal(false); setIsBatchPrinting(true); setTimeout(() => window.print(), 500); }} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded">列印</button></div>
          </div>
        </div>
      )}

      {isBatchPrinting && (
        <>
          <div className="fixed inset-0 z-[80] bg-white overflow-y-auto overflow-x-hidden print:overflow-hidden">
            <div className="w-full min-h-screen print:min-h-0">
              {generateBatchCalendars().map((cal, idx) => {
              const calKey = `${cal.year}-${cal.month}`;
              const calImage = userImages[calKey] || DEFAULT_THEMES[cal.month];
              const isCalUserImage = !!userImages[calKey];
              const calTransform = imageTransforms[calKey] || { scale: 1, x: 0, y: 0, fit: 'contain' };
              const calTextConfig = textOverlays[calKey] || { text: '', x: 20, y: 20, size: 24, font: 'sans', color: '#ffffff', shadow: true, align: 'center' };
              
              const daysInMonth = new Date(cal.year, cal.month + 1, 0).getDate();
              const firstDayOfMonth = new Date(cal.year, cal.month, 1).getDay();
              const calendarDays = [];
              for (let i = 0; i < firstDayOfMonth; i++) calendarDays.push({ day: null });
              for (let i = 1; i <= daysInMonth; i++) {
                const dateStr = `${cal.year}-${String(cal.month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
                const dateObj = new Date(cal.year, cal.month, i);
                const holidayName = HK_HOLIDAYS[dateStr];
                calendarDays.push({ 
                    day: i, 
                    dateStr, 
                    isSunday: dateObj.getDay() === 0, 
                    isHoliday: !!holidayName,
                    holidayName: holidayName, 
                    lunar: getLunarData(dateObj) 
                });
              }
              const lunarYearInfo = getLunarData(new Date(cal.year, cal.month, 15))?.yearZH || '';

              return (
                <div key={idx} className="batch-calendar-page" style={{ pageBreakAfter: idx % 2 === 1 ? 'always' : 'auto', pageBreakInside: 'avoid', marginBottom: idx % 2 === 0 ? '0' : '0', overflow: 'hidden' }}>
                  <div className="bg-white relative overflow-hidden flex flex-row" style={{ width: '210mm', height: '148mm', margin: '0 auto', overflow: 'hidden' }}>
                    {/* Image Area */}
                    <div className="border-r bg-slate-50 relative border-slate-100" style={{ flex: '0 0 40%', overflow: 'hidden', height: '148mm' }}>
                      <div className="w-full h-full relative" style={{ overflow: 'hidden' }}>
                        <img 
                          src={calImage} 
                          alt="Feature" 
                          className="origin-center w-full h-full pointer-events-none select-none"
                          style={{ 
                            objectFit: isCalUserImage ? calTransform.fit : 'cover', 
                            transform: `translate(${calTransform.x}px, ${calTransform.y}px) scale(${calTransform.scale})`
                          }}
                        />
                      </div>
                      
                      {isCalUserImage && calTextConfig.text && (
                        <div 
                          className="absolute select-none whitespace-pre-wrap leading-tight z-20"
                          style={{
                            left: calTextConfig.x,
                            top: calTextConfig.y,
                            fontSize: `${calTextConfig.size}px`,
                            fontFamily: FONT_OPTIONS[calTextConfig.font].value,
                            color: calTextConfig.color,
                            textShadow: calTextConfig.shadow ? '2px 2px 4px rgba(0,0,0,0.8)' : 'none',
                            fontWeight: calTextConfig.font === 'hand' ? 'normal' : 'bold',
                            textAlign: calTextConfig.align || 'center',
                          }}
                        >
                          {calTextConfig.text}
                        </div>
                      )}
                    </div>

                    {/* Calendar Area */}
                    <div className="p-4 flex flex-col justify-between bg-white relative" style={{ flex: '0 0 60%' }}>
                      <div className="flex justify-between items-end mb-2 border-b-2 border-indigo-500 pb-2">
                        <div className="flex items-baseline gap-3">
                          <h2 className="text-4xl font-bold text-slate-800 leading-none tracking-tight">{cal.month + 1}<span className="text-lg ml-1 text-slate-500 font-medium">月</span></h2>
                          <div className="flex flex-col border-l pl-3 border-slate-300">
                            <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">{new Date(cal.year, cal.month).toLocaleString('en-US', { month: 'long' })}</span>
                            <span className="text-xs text-slate-400 font-light">{cal.year} {lunarYearInfo}</span>
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-7 mb-2">
                        {WEEKDAYS_EN.map((d, i) => (
                          <div key={d} className="text-center">
                            <div className={`text-[10px] uppercase font-bold tracking-wider ${i === 0 || i === 6 ? 'text-red-500' : 'text-slate-400'}`}>{d}</div>
                            <div className={`text-[9px] font-normal ${i === 0 || i === 6 ? 'text-red-400' : 'text-slate-300'}`}>{WEEKDAYS_ZH[i]}</div>
                          </div>
                        ))}
                      </div>
                      <div className="grid grid-cols-7 flex-grow auto-rows-fr gap-1">
                        {calendarDays.map((item, itemIdx) => {
                          if (!item.day) return <div key={itemIdx} className="bg-transparent"></div>;
                          const isRed = item.isSunday || item.isHoliday;
                          const fest = item.lunar?.festivals?.[0];
                          const displayLunar = item.lunar?.jieQi || (fest && fest.length <= 4 ? fest : item.lunar?.dayZH);
                          const lunarClass = item.lunar?.jieQi ? "text-indigo-600 font-medium" : (fest ? "text-red-600 font-medium" : "text-slate-400");
                          return (
                            <div key={itemIdx} className={`relative p-1 border rounded-sm flex flex-col justify-start ${isRed ? 'bg-red-50/30 border-red-50' : 'bg-slate-50/30 border-slate-100'}`}>
                              <span className={`text-lg font-bold leading-none ${isRed ? 'text-red-600' : 'text-slate-700'} font-sans`}>{item.day}</span>
                              <div className="flex flex-col mt-auto">
                                {item.isHoliday && <span className="text-[9px] leading-tight text-red-500 truncate font-medium mb-0.5 block w-full">{item.holidayName}</span>}
                                <span className={`text-[8px] leading-none transform ${lunarClass} truncate block w-full`}>{displayLunar}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </>
      )}

      <style>{`
        @media print {
          @page { size: portrait; margin: 0; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0 !important; padding: 0 !important; overflow: hidden !important; width: 210mm !important; }
          html { overflow: hidden !important; margin: 0 !important; padding: 0 !important; }
          * { overflow: visible !important; }
          nav, button, .print\\:hidden { display: none !important; }
          .min-h-screen, .max-w-full { min-height: 0 !important; height: auto !important; width: 100% !important; padding: 0 !important; margin: 0 !important; display: block !important; overflow: visible !important; }
          .bg-white.shadow-2xl { box-shadow: none !important; width: 210mm !important; height: 148mm !important; max-width: none !important; margin: 0 !important; page-break-inside: avoid; border: 1px solid #e2e8f0 !important; border-radius: 0 !important; display: flex !important; overflow: hidden !important; }
          .bg-white.shadow-2xl > div { height: 100% !important; overflow: hidden !important; position: relative !important; }
          .batch-calendar-page { page-break-inside: avoid !important; margin: 0 !important; overflow: hidden !important; }
          .batch-calendar-page > div { overflow: hidden !important; }
          .batch-calendar-page > div > div { overflow: hidden !important; }
          .batch-calendar-page:nth-child(odd) { margin-bottom: 0 !important; }
          .batch-calendar-page:nth-child(even) { page-break-after: always !important; }
          .grid-cols-7 { height: auto !important; flex-grow: 1 !important; display: grid !important; }
          .text-4xl { font-size: 1.8rem !important; } .text-lg { font-size: 1rem !important; } .p-4 { padding: 0.75rem !important; }
          .fixed { position: relative !important; }
          .inset-0 { inset: auto !important; }
        }
      `}</style>
    </div>
  );
}