import React, { useState, useRef, useEffect } from 'react';
import { Button } from './Button';
import { EditorTool } from '../types';
import { ArrowLeft, Eraser, Image as ImageIcon, Wand2, Undo2, RotateCcw, Download, Palette, MousePointer2 } from 'lucide-react';
import { removeBackground, generateAiBackground } from '../services/geminiService';

interface EditorProps {
  onBack: () => void;
}

export const Editor: React.FC<EditorProps> = ({ onBack }) => {
  // --- State ---
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [activeTool, setActiveTool] = useState<EditorTool>(EditorTool.AUTO_REMOVE);
  const [prompt, setPrompt] = useState("");
  const [showExportMenu, setShowExportMenu] = useState(false);
  
  // Canvas Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Manual Eraser State
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(30);
  const lastPos = useRef<{x: number, y: number} | null>(null);
  const [cursorPos, setCursorPos] = useState<{x: number, y: number} | null>(null);

  // Background State
  const [bgColor, setBgColor] = useState<string>('transparent');

  // --- Initialization ---
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result as string;
        setOriginalImage(result);
        loadImageToCanvas(result);
        // Clear history on new file
        setHistory([]); 
      };
      reader.readAsDataURL(file);
    }
  };

  const loadImageToCanvas = (src: string) => {
    const img = new Image();
    img.src = src;
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      // Resize canvas to fit container but keep aspect ratio
      const container = containerRef.current;
      
      let width = img.width;
      let height = img.height;
      
      // Simple aspect ratio scaling - limit max size for performance
      const MAX_DIM = 1200;
      if (width > MAX_DIM || height > MAX_DIM) {
         const ratio = Math.min(MAX_DIM / width, MAX_DIM / height);
         width *= ratio;
         height *= ratio;
      }

      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        saveHistory();
      }
    };
  };

  const saveHistory = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
        setHistory(prev => {
           // Limit history stack size to 10
           const newHist = [...prev, data];
           if (newHist.length > 10) return newHist.slice(newHist.length - 10);
           return newHist;
        });
      }
    }
  };

  const handleUndo = () => {
    if (history.length > 1) {
      const newHistory = [...history];
      newHistory.pop(); // Remove current state
      const previousState = newHistory[newHistory.length - 1];
      setHistory(newHistory);
      
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (canvas && ctx && previousState) {
        if (canvas.width !== previousState.width || canvas.height !== previousState.height) {
            canvas.width = previousState.width;
            canvas.height = previousState.height;
        }
        ctx.putImageData(previousState, 0, 0);
      }
    }
  };

  const handleReset = () => {
    if (originalImage) {
        if (window.confirm("Are you sure you want to revert to the original image? All changes will be lost.")) {
            loadImageToCanvas(originalImage);
            setHistory([]);
            setBgColor('transparent');
        }
    }
  };

  // --- AI Tools ---

  const handleAutoRemove = async () => {
    if (!originalImage) return;
    setIsProcessing(true);
    try {
      const resultUrl = await removeBackground(originalImage);
      loadImageToCanvas(resultUrl);
    } catch (error) {
      alert("Failed to remove background.");
    } finally {
      setIsProcessing(false);
    }
  };

  // --- Manual Erase ---
  const getCanvasCoords = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    let clientX, clientY;
    if ('touches' in e) {
       clientX = e.touches[0].clientX;
       clientY = e.touches[0].clientY;
    } else {
       clientX = (e as React.MouseEvent).clientX;
       clientY = (e as React.MouseEvent).clientY;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (activeTool !== EditorTool.MANUAL_ERASE) return;
    e.preventDefault(); // Prevent scrolling on touch
    
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (canvas) {
        const coords = getCanvasCoords(e, canvas);
        lastPos.current = coords;
        draw(e);
    }
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      lastPos.current = null;
      saveHistory();
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (activeTool !== EditorTool.MANUAL_ERASE) return;
    
    // Update cursor position for visual indicator
    if ('clientX' in e) {
        // Mouse event
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
            setCursorPos({
                x: (e as React.MouseEvent).clientX - rect.left,
                y: (e as React.MouseEvent).clientY - rect.top
            });
        }
    }

    if (!isDrawing) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    
    if (canvas && ctx) {
      const { x, y } = getCanvasCoords(e, canvas);

      // Use save/restore to strictly isolate the erasing operation
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = brushSize;
      ctx.strokeStyle = 'rgba(0,0,0,1)'; // Full opacity for erasing
      
      ctx.beginPath();
      if (lastPos.current) {
        ctx.moveTo(lastPos.current.x, lastPos.current.y);
      } else {
        ctx.moveTo(x, y);
      }
      ctx.lineTo(x, y);
      ctx.stroke();
      
      ctx.restore();
      
      lastPos.current = { x, y };
    }
  };

  // --- Background Gen ---
  const handleAiBackground = async () => {
    if (!prompt.trim()) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsProcessing(true);
    try {
      const currentDataUrl = canvas.toDataURL('image/png');
      const resultUrl = await generateAiBackground(currentDataUrl, prompt);
      loadImageToCanvas(resultUrl);
      setPrompt("");
    } catch (error) {
      alert("Failed to generate scene.");
    } finally {
      setIsProcessing(false);
    }
  };

  const exportImage = (format: 'png' | 'jpeg') => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;
    const ctx = exportCanvas.getContext('2d');
    
    if (ctx) {
      if (format === 'jpeg' && bgColor === 'transparent') {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
      } else if (bgColor !== 'transparent') {
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
      }
      
      ctx.drawImage(canvas, 0, 0);
      
      const link = document.createElement('a');
      link.href = exportCanvas.toDataURL(`image/${format}`, 0.9);
      link.download = `lumina_edit_${Date.now()}.${format}`;
      link.click();
      setShowExportMenu(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 flex flex-col overflow-hidden text-gray-900 dark:text-gray-100 transition-colors duration-300">
      
      {/* Top Bar */}
      <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-gray-200 dark:border-zinc-800 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={onBack} icon={<ArrowLeft size={20} />}>
              Back
            </Button>
          </div>
          
          <div className="font-semibold hidden md:block opacity-80">
            {isProcessing ? 'AI Processing...' : 'Studio Editor'}
          </div>

          <div className="relative">
             <Button variant="primary" disabled={!originalImage} onClick={() => setShowExportMenu(!showExportMenu)} icon={<Download size={18} />}>
               Export
             </Button>
             {showExportMenu && (
                 <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-zinc-800 rounded-xl shadow-xl border border-gray-100 dark:border-zinc-700 overflow-hidden z-[100] animate-in slide-in-from-top-2 fade-in duration-200">
                     <button onClick={() => exportImage('png')} className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-zinc-700 text-sm font-medium">Save as PNG</button>
                     <button onClick={() => exportImage('jpeg')} className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-zinc-700 text-sm font-medium">Save as JPEG</button>
                 </div>
             )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row h-[calc(100vh-64px)] overflow-hidden">
        
        {/* Sidebar Tools */}
        <div className="w-full lg:w-80 bg-white dark:bg-zinc-900 border-r border-gray-200 dark:border-zinc-800 flex flex-col z-40 shadow-xl lg:shadow-none h-[40%] lg:h-auto overflow-y-auto order-2 lg:order-1 no-scrollbar">
           <div className="p-6 pb-24">
             <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-6">Removal Tools</h3>
             
             <div className="space-y-3">
               {/* Auto */}
               <button 
                 onClick={() => { setActiveTool(EditorTool.AUTO_REMOVE); handleAutoRemove(); }}
                 className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${activeTool === EditorTool.AUTO_REMOVE ? 'bg-indigo-50 border-indigo-500 dark:bg-indigo-900/20 dark:border-indigo-500/50' : 'border-gray-200 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-800'}`}
               >
                 <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg text-indigo-600 dark:text-indigo-400"><Eraser size={18}/></div>
                 <div className="text-left">
                   <div className="font-medium text-sm">Auto Remove</div>
                   <div className="text-xs text-gray-500 dark:text-gray-400">Accurate AI Extraction</div>
                 </div>
               </button>

               {/* Manual */}
               <button 
                 onClick={() => setActiveTool(EditorTool.MANUAL_ERASE)}
                 className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${activeTool === EditorTool.MANUAL_ERASE ? 'bg-amber-50 border-amber-500 dark:bg-amber-900/20 dark:border-amber-500/50' : 'border-gray-200 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-800'}`}
               >
                 <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-lg text-amber-600 dark:text-amber-400"><MousePointer2 size={18}/></div>
                 <div className="text-left">
                   <div className="font-medium text-sm">Manual Erase</div>
                   <div className="text-xs text-gray-500 dark:text-gray-400">Brush to erase</div>
                 </div>
               </button>
               
               {activeTool === EditorTool.MANUAL_ERASE && (
                 <div className="pt-2 px-1 animate-in slide-in-from-top-2 fade-in duration-200">
                   <div className="flex justify-between text-xs mb-2"><span>Brush Size</span><span>{brushSize}px</span></div>
                   <input 
                     type="range" min="5" max="100" value={brushSize} 
                     onChange={(e) => setBrushSize(parseInt(e.target.value))}
                     className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-zinc-700" 
                   />
                 </div>
               )}
             </div>

             <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mt-8 mb-6">Backgrounds</h3>
             
             <div className="space-y-4">
                {/* Color Wheel & Presets */}
                <div className="flex flex-wrap gap-2">
                  <div className="relative w-9 h-9 rounded-full overflow-hidden border border-gray-300 dark:border-zinc-600 shadow-sm cursor-pointer hover:scale-110 transition-transform">
                     <input 
                       type="color" 
                       className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] p-0 border-0 cursor-pointer"
                       value={bgColor === 'transparent' ? '#ffffff' : bgColor}
                       onChange={(e) => setBgColor(e.target.value)}
                     />
                     <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                        <Palette size={14} className="text-white drop-shadow-md invert grayscale"/>
                     </div>
                  </div>
                  <button onClick={() => setBgColor('transparent')} className={`w-9 h-9 rounded-full border bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] hover:scale-110 transition-transform ${bgColor === 'transparent' ? 'ring-2 ring-indigo-500' : 'border-gray-200 dark:border-zinc-700'}`} title="Transparent" />
                  <button onClick={() => setBgColor('#ffffff')} className="w-9 h-9 rounded-full border border-gray-200 bg-white hover:scale-110 transition-transform shadow-sm" />
                  <button onClick={() => setBgColor('#000000')} className="w-9 h-9 rounded-full border border-gray-700 bg-black hover:scale-110 transition-transform shadow-sm" />
                  <button onClick={() => setBgColor('#ef4444')} className="w-9 h-9 rounded-full bg-red-500 hover:scale-110 transition-transform shadow-sm" />
                  <button onClick={() => setBgColor('#3b82f6')} className="w-9 h-9 rounded-full bg-blue-500 hover:scale-110 transition-transform shadow-sm" />
                  <button onClick={() => setBgColor('#f59e0b')} className="w-9 h-9 rounded-full bg-amber-500 hover:scale-110 transition-transform shadow-sm" />
                  <button onClick={() => setBgColor('#10b981')} className="w-9 h-9 rounded-full bg-emerald-500 hover:scale-110 transition-transform shadow-sm" />
                </div>

                {/* AI Scene */}
                <div className="bg-gray-50 dark:bg-zinc-800/50 p-4 rounded-xl border border-gray-100 dark:border-zinc-700">
                  <div className="flex items-center gap-2 mb-2 text-sm font-medium">
                    <Wand2 size={14} className="text-purple-500" />
                    <span>AI Scene Generator</span>
                  </div>
                  <textarea 
                    className="w-full bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-600 rounded-lg p-2 text-sm mb-2 focus:ring-2 focus:ring-purple-500 outline-none transition-all" 
                    rows={2} 
                    placeholder="E.g. On a beach at sunset..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                  />
                  <Button 
                    variant="primary" 
                    className="w-full text-sm py-2 !bg-purple-600 hover:!bg-purple-700"
                    disabled={!prompt}
                    onClick={handleAiBackground}
                  >
                    Generate Scene
                  </Button>
                </div>
             </div>
           </div>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 relative bg-gray-100 dark:bg-zinc-950 flex items-center justify-center p-4 lg:p-8 order-1 lg:order-2 overflow-hidden select-none">
          {/* Background Grid */}
          <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] pointer-events-none"></div>

          {/* Floating Bottom Toolbar */}
          {originalImage && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 shadow-2xl rounded-full p-2 z-[60] animate-in slide-in-from-bottom-6 fade-in duration-500">
                 <button 
                    onClick={handleReset}
                    className="p-3 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full text-gray-700 dark:text-gray-300 transition-colors tooltip"
                    title="Reset All"
                 >
                    <RotateCcw size={20} />
                 </button>
                 <div className="w-px h-6 bg-gray-200 dark:bg-zinc-700 mx-1"></div>
                 <button 
                    onClick={handleUndo}
                    disabled={history.length <= 1}
                    className="p-3 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full text-gray-700 dark:text-gray-300 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                    title="Undo"
                 >
                    <Undo2 size={20} />
                 </button>
                 <div className="w-px h-6 bg-gray-200 dark:bg-zinc-700 mx-1"></div>
                 <button 
                   onClick={() => exportImage('png')}
                   className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors"
                 >
                   PNG
                 </button>
                 <button 
                   onClick={() => exportImage('jpeg')}
                   className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black hover:opacity-90 rounded-full text-sm font-medium transition-colors"
                 >
                   JPEG
                 </button>
              </div>
          )}

          {!originalImage ? (
             <div className="text-center relative z-10">
                <label className="cursor-pointer group flex flex-col items-center">
                  <div className="w-24 h-24 bg-white dark:bg-zinc-800 rounded-3xl shadow-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 border border-gray-100 dark:border-zinc-700">
                    <ImageIcon className="w-10 h-10 text-gray-400 group-hover:text-indigo-500 transition-colors" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-700 dark:text-gray-200">Start Editing</h3>
                  <p className="text-gray-500 dark:text-gray-400 mt-2">Upload a photo to begin</p>
                  <input type="file" className="hidden" accept="image/*" onChange={handleFileSelect} />
                </label>
             </div>
          ) : (
            <div 
               ref={containerRef}
               className="relative shadow-2xl rounded-lg overflow-hidden ring-4 ring-white dark:ring-zinc-800 max-w-full max-h-[80vh] transition-all touch-none" 
               style={{ backgroundColor: bgColor }}
               onMouseLeave={() => setCursorPos(null)}
            >
               {/* Drawing Canvas */}
               <canvas 
                 ref={canvasRef}
                 onMouseDown={startDrawing}
                 onMouseMove={draw}
                 onMouseUp={stopDrawing}
                 onMouseLeave={stopDrawing}
                 onTouchStart={startDrawing}
                 onTouchMove={draw}
                 onTouchEnd={stopDrawing}
                 style={{ touchAction: 'none' }}
                 className={`block max-w-full max-h-full ${activeTool === EditorTool.MANUAL_ERASE ? 'cursor-none' : 'cursor-default'}`}
               />
               
               {/* Custom Brush Cursor */}
               {activeTool === EditorTool.MANUAL_ERASE && cursorPos && !isProcessing && (
                  <div 
                    className="pointer-events-none absolute border-2 border-white bg-black/20 rounded-full shadow-sm z-30"
                    style={{
                       width: brushSize * (canvasRef.current ? (containerRef.current?.getBoundingClientRect().width || 1) / canvasRef.current.width : 1),
                       height: brushSize * (canvasRef.current ? (containerRef.current?.getBoundingClientRect().height || 1) / canvasRef.current.height : 1),
                       left: cursorPos.x,
                       top: cursorPos.y,
                       transform: 'translate(-50%, -50%)'
                    }}
                  />
               )}

               {/* Processing Overlay */}
               {isProcessing && (
                  <div className="absolute inset-0 z-20 bg-white/20 dark:bg-black/20 backdrop-blur-md flex items-center justify-center">
                    <div className="flex flex-col items-center animate-pulse">
                       <div className="w-12 h-12 border-4 border-white border-t-indigo-500 rounded-full animate-spin mb-4 shadow-xl"></div>
                       <span className="text-white font-medium bg-black/40 px-5 py-2 rounded-full text-sm backdrop-blur-sm shadow-lg">Processing...</span>
                    </div>
                  </div>
               )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};