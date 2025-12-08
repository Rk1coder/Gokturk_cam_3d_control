import React, { useState } from 'react';
import { Bot, Send, Loader2 } from 'lucide-react';
import { geminiService } from '../services/geminiService';
import { PrinterState } from '../types';

interface Props {
  printerState: PrinterState;
}

const GeminiAssistant: React.FC<Props> = ({ printerState }) => {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setResponse(null);
    
    try {
      const result = await geminiService.analyzePrinterState(printerState, query);
      setResponse(result);
    } catch (err) {
      setResponse("Bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`fixed bottom-4 right-4 z-50 transition-all duration-300 ${isOpen ? 'w-80 md:w-96' : 'w-14'}`}>
        {!isOpen && (
            <button 
                onClick={() => setIsOpen(true)}
                className="w-14 h-14 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform"
            >
                <Bot className="text-white w-8 h-8" />
            </button>
        )}

        {isOpen && (
            <div className="bg-slate-800 border border-slate-600 rounded-xl shadow-2xl flex flex-col max-h-[600px] overflow-hidden">
                <div className="p-4 bg-gradient-to-r from-indigo-900 to-slate-900 border-b border-slate-700 flex justify-between items-center">
                    <h3 className="font-bold text-white flex items-center">
                        <Bot className="mr-2 w-5 h-5 text-indigo-400" /> GÖKTÜRK AI
                    </h3>
                    <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white">&times;</button>
                </div>

                <div className="p-4 flex-1 overflow-y-auto bg-slate-900 min-h-[200px] max-h-[400px] text-sm text-slate-300 scrollbar-thin">
                    {!response && !loading && (
                        <p className="text-slate-500 text-center italic mt-10">
                            Yazıcı durumu hakkında soru sorabilir veya G-Code yardımı alabilirsiniz.
                        </p>
                    )}
                    {loading && (
                        <div className="flex justify-center items-center h-full text-indigo-400">
                            <Loader2 className="animate-spin w-8 h-8" />
                        </div>
                    )}
                    {response && (
                        <div className="prose prose-invert prose-sm">
                            <div className="whitespace-pre-wrap">{response}</div>
                        </div>
                    )}
                </div>

                <form onSubmit={handleAsk} className="p-3 bg-slate-800 border-t border-slate-700 flex">
                    <input 
                        type="text" 
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Yazıcı neden ısınmıyor?..."
                        className="flex-1 bg-slate-900 border border-slate-600 rounded-l px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                    />
                    <button 
                        type="submit" 
                        disabled={loading}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 rounded-r flex items-center justify-center disabled:opacity-50"
                    >
                        <Send size={16} />
                    </button>
                </form>
            </div>
        )}
    </div>
  );
};

export default GeminiAssistant;
