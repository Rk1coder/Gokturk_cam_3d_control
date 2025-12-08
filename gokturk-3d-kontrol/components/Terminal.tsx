import React, { useState, useEffect, useRef } from 'react';
import { Send, TerminalSquare, Lock } from 'lucide-react';
import { printerService } from '../services/printerService';

interface Props {
  logs: string[];
  readOnly?: boolean;
}

const Terminal: React.FC<Props> = ({ logs, readOnly = false }) => {
  const [input, setInput] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || readOnly) return;
    printerService.sendGCode(input.toUpperCase());
    setInput('');
  };

  return (
    <div className="bg-gokturk-panel rounded-lg border border-slate-700 shadow-lg flex flex-col h-96 relative">
      {readOnly && (
          <div className="absolute top-12 left-0 w-full h-full bg-slate-900/50 z-10 flex items-center justify-center pointer-events-none">
              <div className="bg-black/80 px-4 py-2 rounded text-slate-400 flex items-center">
                  <Lock size={16} className="mr-2"/> Terminal İzleyici Modunda Kilitli
              </div>
          </div>
      )}

      <div className="p-3 bg-slate-800 rounded-t-lg border-b border-slate-700 flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-300 flex items-center">
            <TerminalSquare className="w-4 h-4 mr-2 text-gokturk-accent"/> Terminal
        </h3>
        <span className="text-xs text-slate-500 font-mono">/dev/ttyUSB0 @ 115200</span>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-1 scrollbar-thin">
        {logs.slice().reverse().map((log, idx) => (
          <div key={idx} className={`${log.startsWith('GÖNDERİLDİ') ? 'text-green-400' : log.includes('HATA') ? 'text-red-500' : 'text-slate-300'}`}>
            {log}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <form onSubmit={handleSend} className="p-3 bg-slate-800 rounded-b-lg border-t border-slate-700 flex">
        <input 
          type="text" 
          value={input}
          disabled={readOnly}
          onChange={(e) => setInput(e.target.value)}
          placeholder={readOnly ? "Yazma izniniz yok" : "G-Code komutu girin (örn. G28, M105)..."}
          className="flex-1 bg-slate-900 border border-slate-600 rounded-l px-3 py-2 text-sm text-white focus:outline-none focus:border-gokturk-accent font-mono uppercase disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed"
        />
        <button type="submit" disabled={readOnly} className="bg-slate-700 hover:bg-gokturk-accent hover:text-black text-white px-4 py-2 rounded-r transition disabled:opacity-50 disabled:cursor-not-allowed">
          <Send size={16} />
        </button>
      </form>
    </div>
  );
};

export default Terminal;