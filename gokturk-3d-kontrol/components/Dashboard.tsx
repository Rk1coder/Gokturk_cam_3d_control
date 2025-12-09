import React from 'react';
import { PrinterState, PrinterStatus } from '../types';
import TemperatureChart from './TemperatureChart';
import { Activity, Clock, FileCode, CheckCircle2, AlertCircle, VideoOff } from 'lucide-react';

interface Props {
  printerState: PrinterState;
}

const Dashboard: React.FC<Props> = ({ printerState }) => {
  const isPrinting = printerState.status === PrinterStatus.PRINTING;
  
  // Format seconds to MM:SS
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${mins}d ${s}s`;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Status Card */}
      <div className="col-span-1 lg:col-span-3 bg-gradient-to-r from-gokturk-panel to-slate-900 p-6 rounded-lg border border-slate-700 shadow-lg flex flex-col md:flex-row items-center justify-between">
         <div className="flex items-center space-x-4 mb-4 md:mb-0">
             <div className={`p-4 rounded-full ${isPrinting ? 'bg-green-500/20 text-green-400 animate-pulse' : 'bg-slate-700 text-slate-400'}`}>
                 {isPrinting ? <Activity size={32} /> : <CheckCircle2 size={32} />}
             </div>
             <div>
                 <h2 className="text-sm text-slate-400 uppercase tracking-wider">Durum</h2>
                 <p className="text-3xl font-bold text-white">{printerState.status}</p>
             </div>
         </div>

         {isPrinting && (
             <div className="flex-1 px-8 w-full">
                 <div className="flex justify-between text-sm mb-1">
                     <span className="text-white font-semibold">{printerState.job.file?.name}</span>
                     <span className="text-gokturk-accent">%{printerState.job.progress.toFixed(1)}</span>
                 </div>
                 <div className="w-full bg-slate-700 rounded-full h-3">
                     <div 
                        className="bg-gradient-to-r from-blue-500 to-gokturk-accent h-3 rounded-full transition-all duration-1000" 
                        style={{ width: `${printerState.job.progress}%` }}
                     ></div>
                 </div>
                 <div className="flex justify-between text-xs text-slate-500 mt-1">
                     <span>Geçen: {formatTime(printerState.job.printTime)}</span>
                     <span>Kalan: {formatTime(printerState.job.timeLeft)}</span>
                 </div>
             </div>
         )}
      </div>

      {/* Camera Feed - LIVE UPDATE */}
      <div className="col-span-1 lg:col-span-2 bg-black rounded-lg border border-slate-700 shadow-lg relative aspect-video overflow-hidden group flex items-center justify-center">
          {printerState.lastFrame ? (
              <img 
                src={`data:image/jpeg;base64,${printerState.lastFrame}`} 
                alt="Printer Live Cam" 
                className="w-full h-full object-contain"
              />
          ) : (
              <div className="flex flex-col items-center text-slate-500">
                  <VideoOff size={48} className="mb-2 opacity-50" />
                  <span>Kamera Sinyali Yok</span>
              </div>
          )}
          
          {printerState.lastFrame && (
            <div className="absolute top-2 left-2 bg-red-600 px-2 py-0.5 rounded text-xs font-bold text-white animate-pulse shadow-md">
                CANLI
            </div>
          )}
          
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 pointer-events-none">
              <p className="text-white font-mono text-xs opacity-70">GÖKTÜRK CAM SYSTEM</p>
          </div>
      </div>

      {/* Quick Stats */}
      <div className="col-span-1 space-y-6">
           <div className="bg-gokturk-panel p-4 rounded-lg border border-slate-700">
               <h3 className="text-slate-400 text-sm mb-3 flex items-center"><FileCode className="w-4 h-4 mr-2"/> Son Dosya</h3>
               <p className="text-lg text-white truncate">{printerState.job.file?.name || "Dosya Yok"}</p>
               <div className="mt-2 text-xs text-slate-500">
                   Yüklenme: {printerState.job.file?.uploadDate || "-"}
               </div>
           </div>

           <div className="bg-gokturk-panel p-4 rounded-lg border border-slate-700">
               <h3 className="text-slate-400 text-sm mb-3 flex items-center"><Clock className="w-4 h-4 mr-2"/> Toplam Baskı Süresi</h3>
               <p className="text-lg text-white">124s 15d 32s</p>
               <div className="mt-2 text-xs text-green-400 flex items-center">
                   <CheckCircle2 className="w-3 h-3 mr-1"/> Sistem stabil
               </div>
           </div>
           
           <div className="bg-red-900/20 p-4 rounded-lg border border-red-900/50">
               <h3 className="text-red-400 text-sm mb-2 flex items-center"><AlertCircle className="w-4 h-4 mr-2"/> Filament Sensörü</h3>
               <p className="text-white text-sm">Filament Algılandı (OK)</p>
           </div>
      </div>

      {/* Temp Chart */}
      <div className="col-span-1 lg:col-span-3">
          <TemperatureChart printerState={printerState} />
      </div>

    </div>
  );
};

export default Dashboard;