import React, { useState } from 'react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Home, Thermometer, Fan, Upload, Lock } from 'lucide-react';
import { printerService } from '../services/printerService';
import { PrinterState, PrinterStatus } from '../types';

interface Props {
  printerState: PrinterState;
  readOnly?: boolean;
}

const ControlPanel: React.FC<Props> = ({ printerState, readOnly = false }) => {
  const [moveAmount, setMoveAmount] = useState(10);
  const [tempInputTool, setTempInputTool] = useState(210);
  const [tempInputBed, setTempInputBed] = useState(60);

  const isPrinting = printerState.status === PrinterStatus.PRINTING;
  const disabled = isPrinting || readOnly;

  const handleMove = (axis: 'x' | 'y' | 'z', amount: number) => {
    if (!disabled) printerService.moveAxis(axis, amount);
  };

  const handleHome = (axes: string[]) => {
    if (!disabled) printerService.homeAxis(axes);
  };

  const handleTempSet = (type: 'tool0' | 'bed', val: number) => {
    if (!readOnly) printerService.setTemperature(type, val);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative">
      {readOnly && (
          <div className="absolute top-2 right-2 z-10 bg-red-900/80 text-white text-xs px-2 py-1 rounded flex items-center">
              <Lock size={12} className="mr-1"/> İzleyici Modu
          </div>
      )}

      {/* Movement Controls */}
      <div className={`bg-gokturk-panel p-6 rounded-lg border border-slate-700 shadow-lg ${readOnly ? 'opacity-60 grayscale-[0.5]' : ''}`}>
        <h3 className="text-lg font-bold text-gokturk-accent mb-4 flex items-center">
          <Upload className="w-5 h-5 mr-2" /> Hareket Kontrolü
        </h3>
        
        <div className="flex flex-col items-center space-y-4">
            {/* XY Control */}
            <div className="relative w-48 h-48 bg-slate-800 rounded-full border-2 border-slate-600 flex items-center justify-center shadow-inner">
                <button 
                  onClick={() => handleMove('y', moveAmount)}
                  disabled={disabled}
                  className="absolute top-2 left-1/2 -translate-x-1/2 p-3 bg-slate-700 hover:bg-gokturk-accent rounded-full transition disabled:opacity-50 disabled:cursor-not-allowed text-white"
                >
                    <ArrowUp size={24} />
                </button>
                <button 
                  onClick={() => handleMove('y', -moveAmount)}
                  disabled={disabled}
                  className="absolute bottom-2 left-1/2 -translate-x-1/2 p-3 bg-slate-700 hover:bg-gokturk-accent rounded-full transition disabled:opacity-50 disabled:cursor-not-allowed text-white"
                >
                    <ArrowDown size={24} />
                </button>
                <button 
                  onClick={() => handleMove('x', -moveAmount)}
                  disabled={disabled}
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-3 bg-slate-700 hover:bg-gokturk-accent rounded-full transition disabled:opacity-50 disabled:cursor-not-allowed text-white"
                >
                    <ArrowLeft size={24} />
                </button>
                <button 
                  onClick={() => handleMove('x', moveAmount)}
                  disabled={disabled}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-3 bg-slate-700 hover:bg-gokturk-accent rounded-full transition disabled:opacity-50 disabled:cursor-not-allowed text-white"
                >
                    <ArrowRight size={24} />
                </button>
                
                <button 
                  onClick={() => handleHome(['x', 'y'])}
                  disabled={disabled}
                  className="p-4 bg-red-600 hover:bg-red-500 rounded-full shadow-lg transition disabled:opacity-50"
                  title="Home XY"
                >
                    <Home size={20} />
                </button>
            </div>

            {/* Z Axis & Steps */}
            <div className="flex items-center space-x-6 w-full justify-center">
                <div className="flex flex-col space-y-2">
                    <button onClick={() => handleMove('z', moveAmount)} disabled={disabled} className="p-2 bg-slate-700 rounded hover:bg-slate-600 disabled:opacity-50"><ArrowUp size={20}/></button>
                    <span className="text-center font-mono font-bold text-gokturk-accent">Z</span>
                    <button onClick={() => handleMove('z', -moveAmount)} disabled={disabled} className="p-2 bg-slate-700 rounded hover:bg-slate-600 disabled:opacity-50"><ArrowDown size={20}/></button>
                </div>
                
                <div className="flex space-x-2 bg-slate-800 p-1 rounded-lg">
                    {[1, 10, 50, 100].map((step) => (
                        <button
                            key={step}
                            onClick={() => setMoveAmount(step)}
                            disabled={readOnly}
                            className={`px-3 py-1 rounded text-sm font-medium transition ${
                                moveAmount === step ? 'bg-gokturk-accent text-slate-900' : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            {step}
                        </button>
                    ))}
                    <span className="text-slate-500 text-sm flex items-center px-2">mm</span>
                </div>
                
                <button 
                    onClick={() => handleHome(['z'])}
                    disabled={disabled}
                    className="p-3 bg-slate-700 hover:bg-red-500 rounded-lg disabled:opacity-50 transition"
                    title="Home Z"
                >
                    <Home size={20} /> <span className="text-xs font-bold">Z</span>
                </button>
            </div>
        </div>
      </div>

      {/* Temperature Controls */}
      <div className={`bg-gokturk-panel p-6 rounded-lg border border-slate-700 shadow-lg ${readOnly ? 'opacity-60 grayscale-[0.5]' : ''}`}>
        <h3 className="text-lg font-bold text-gokturk-red mb-4 flex items-center">
          <Thermometer className="w-5 h-5 mr-2" /> Sıcaklık Kontrolü
        </h3>

        <div className="space-y-6">
            {/* Tool 0 */}
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-red-400">Hotend (Nozzle)</span>
                    <span className="text-2xl font-mono">{printerState.temperatures.tool0.actual.toFixed(1)}°C</span>
                </div>
                <div className="flex space-x-2">
                   <input 
                      type="number" 
                      value={tempInputTool}
                      disabled={readOnly}
                      onChange={(e) => setTempInputTool(Number(e.target.value))}
                      className="w-20 bg-slate-900 border border-slate-600 rounded px-2 text-white disabled:opacity-50"
                   />
                   <button onClick={() => handleTempSet('tool0', tempInputTool)} disabled={readOnly} className="bg-red-600 hover:bg-red-500 text-white px-3 py-1 rounded text-sm transition disabled:opacity-50">Ayarla</button>
                   <button onClick={() => handleTempSet('tool0', 0)} disabled={readOnly} className="bg-slate-600 hover:bg-slate-500 text-white px-3 py-1 rounded text-sm transition disabled:opacity-50">Kapat</button>
                </div>
                <div className="mt-2 flex space-x-2 text-xs">
                    <button onClick={() => handleTempSet('tool0', 200)} disabled={readOnly} className="text-slate-400 hover:text-red-400 underline disabled:no-underline disabled:text-slate-600">PLA (200)</button>
                    <button onClick={() => handleTempSet('tool0', 240)} disabled={readOnly} className="text-slate-400 hover:text-red-400 underline disabled:no-underline disabled:text-slate-600">ABS (240)</button>
                    <button onClick={() => handleTempSet('tool0', 250)} disabled={readOnly} className="text-slate-400 hover:text-red-400 underline disabled:no-underline disabled:text-slate-600">PETG (250)</button>
                </div>
            </div>

            {/* Bed */}
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-blue-400">Isıtıcı Tabla</span>
                    <span className="text-2xl font-mono">{printerState.temperatures.bed.actual.toFixed(1)}°C</span>
                </div>
                <div className="flex space-x-2">
                   <input 
                      type="number" 
                      value={tempInputBed}
                      disabled={readOnly}
                      onChange={(e) => setTempInputBed(Number(e.target.value))}
                      className="w-20 bg-slate-900 border border-slate-600 rounded px-2 text-white disabled:opacity-50"
                   />
                   <button onClick={() => handleTempSet('bed', tempInputBed)} disabled={readOnly} className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded text-sm transition disabled:opacity-50">Ayarla</button>
                   <button onClick={() => handleTempSet('bed', 0)} disabled={readOnly} className="bg-slate-600 hover:bg-slate-500 text-white px-3 py-1 rounded text-sm transition disabled:opacity-50">Kapat</button>
                </div>
                <div className="mt-2 flex space-x-2 text-xs">
                    <button onClick={() => handleTempSet('bed', 60)} disabled={readOnly} className="text-slate-400 hover:text-blue-400 underline disabled:no-underline disabled:text-slate-600">PLA (60)</button>
                    <button onClick={() => handleTempSet('bed', 100)} disabled={readOnly} className="text-slate-400 hover:text-blue-400 underline disabled:no-underline disabled:text-slate-600">ABS (100)</button>
                </div>
            </div>
            
            {/* Fan Override */}
            <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                 <div className="flex items-center text-slate-300">
                     <Fan className="mr-2 w-5 h-5"/> Fan Hızı
                 </div>
                 <input type="range" min="0" max="100" defaultValue="100" disabled={readOnly} className="w-32 accent-gokturk-accent disabled:grayscale" />
            </div>
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;