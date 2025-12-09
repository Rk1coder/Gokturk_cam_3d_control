import React from 'react';
import { GCodeFile, PrinterStatus } from '../types';
import { printerService } from '../services/printerService';
import { Play, Trash2, FileBox, Lock } from 'lucide-react';

interface Props {
    printerStatus: PrinterStatus;
    readOnly?: boolean;
}

// Şimdilik boş liste, ileride server'dan çekilebilir
const FILES: GCodeFile[] = [];

const Files: React.FC<Props> = ({ printerStatus, readOnly = false }) => {
  const isPrinting = printerStatus === PrinterStatus.PRINTING || printerStatus === PrinterStatus.PAUSED;
  const disabled = isPrinting || readOnly;

  return (
    <div className="bg-gokturk-panel rounded-lg border border-slate-700 shadow-lg overflow-hidden relative">
        {readOnly && (
          <div className="absolute top-2 right-2 z-10 bg-red-900/80 text-white text-xs px-2 py-1 rounded flex items-center">
              <Lock size={12} className="mr-1"/> İzleyici Modu
          </div>
        )}
        <div className="p-4 border-b border-slate-700 bg-slate-800 flex justify-between items-center">
            <h2 className="text-lg font-bold text-white flex items-center">
                <FileBox className="mr-2 text-gokturk-accent"/> G-Code Dosyaları
            </h2>
            <div className="text-xs text-slate-400">
                SD Kart: -
            </div>
        </div>
        
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-900 text-xs uppercase text-slate-500 font-semibold">
                    <tr>
                        <th className="px-6 py-3">Dosya Adı</th>
                        <th className="px-6 py-3">Tarih</th>
                        <th className="px-6 py-3">Boyut</th>
                        <th className="px-6 py-3">Süre</th>
                        <th className="px-6 py-3 text-right">İşlemler</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                    {FILES.length === 0 ? (
                        <tr>
                            <td colSpan={5} className="p-8 text-center text-slate-500 italic">
                                Dosya listesi boş veya okunamadı.
                            </td>
                        </tr>
                    ) : (
                        FILES.map((file, idx) => (
                        <tr key={idx} className="hover:bg-slate-700/50 transition">
                            <td className="px-6 py-4 font-medium text-white">{file.name}</td>
                            <td className="px-6 py-4">{file.uploadDate}</td>
                            <td className="px-6 py-4 font-mono text-xs">{file.size}</td>
                            <td className="px-6 py-4">{file.estimatedTime}</td>
                            <td className="px-6 py-4 text-right space-x-2">
                                <button 
                                    onClick={() => printerService.startPrint(file)}
                                    disabled={disabled}
                                    className="p-2 bg-green-600/20 text-green-400 hover:bg-green-600 hover:text-white rounded disabled:opacity-30 disabled:cursor-not-allowed transition"
                                >
                                    <Play size={16} />
                                </button>
                                <button 
                                    disabled={disabled}
                                    className="p-2 bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white rounded disabled:opacity-30 disabled:cursor-not-allowed transition"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </td>
                        </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    </div>
  );
};

export default Files;