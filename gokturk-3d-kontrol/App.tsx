import React, { useState, useEffect } from 'react';
import { printerService } from './services/printerService';
import { authService } from './services/authService';
import { PrinterState, PrinterStatus, GlobalState, User, UserRole } from './types';
import Dashboard from './components/Dashboard';
import ControlPanel from './components/ControlPanel';
import Files from './components/Files';
import Terminal from './components/Terminal';
import Settings from './components/Settings';
import GeminiAssistant from './components/GeminiAssistant';
import Login from './components/Login';
// Plane ikonu kaldırıldı, diğer ikonlar tutuldu
import { LayoutDashboard, Move, FileText, Settings as SettingsIcon, Power, WifiOff, Wifi, Plus, LogOut, Shield } from 'lucide-react';

// --- KENDİ LOGO DOSYANIZI İÇE AKTARIN ---
// Bu yolun doğru olduğundan emin olun: ./assets/logo.png
import logo from './assets/logo.png'; 
// ------------------------------------------

// --- BURADAN LOGO VE YAZILARI DEĞİŞTİREBİLİRSİNİZ ---
const APP_TITLE = "GÖKTÜRK"; 
const APP_SUBTITLE = "3D Yazıcı Kontrol";
// -----------------------------------------------------

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'controls' | 'files' | 'settings'>('dashboard');
  const [globalState, setGlobalState] = useState<GlobalState | null>(null);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Check for existing session
    const currentUser = authService.getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
    }

    // Subscribe to the global service state
    const unsubscribe = printerService.subscribe((newState) => {
      setGlobalState(newState);
    });
    return unsubscribe;
  }, []);

  const handleLogout = () => {
    authService.logout();
    setUser(null);
  };

  // If not logged in, show Login Screen
  if (!user) {
    return <Login onLogin={setUser} />;
  }

  // Determine Active Printer
  const activePrinterId = globalState?.activePrinterId;
  const activePrinterInstance = activePrinterId && globalState ? globalState.printers[activePrinterId] : null;
  const printerState = activePrinterInstance ? activePrinterInstance.state : null;
  const isViewer = user.role === UserRole.VIEWER;

  // Render Loading only initially if service hasn't emitted yet
  if (!globalState) return <div className="h-screen flex items-center justify-center bg-slate-900 text-white">Sistem Başlatılıyor...</div>;

  return (
    <div className="flex h-screen bg-gokturk-dark text-slate-200">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col hidden md:flex">
        <div className="p-6 border-b border-slate-800 flex flex-col items-center">
            {/* Logo Alanı (Plane ikonu yerine logo) */}
            <div className="w-12 h-12 bg-gokturk-red rounded-full flex items-center justify-center mb-3 shadow-lg shadow-red-900/50">
               <img src={logo} alt="Logo" className="w-7 h-7" />
            </div>
            {/* Logo Text - Controlled by Constants */}
            <h1 className="text-xl font-bold tracking-widest text-white">{APP_TITLE}</h1>
            <p className="text-xs text-slate-500 uppercase tracking-wide">{APP_SUBTITLE}</p>
        </div>

        {/* Printer Selection List */}
        <div className="px-4 py-4 border-b border-slate-800">
            <h3 className="text-xs text-slate-500 font-bold mb-2 uppercase tracking-wider flex justify-between items-center">
                YAZICILAR
                {!isViewer && <button onClick={() => setActiveTab('settings')} className="text-slate-400 hover:text-white"><Plus size={14}/></button>}
            </h3>
            <div className="space-y-1 max-h-48 overflow-y-auto scrollbar-thin">
                {Object.values(globalState.printers).length === 0 && (
                    <div onClick={() => !isViewer && setActiveTab('settings')} className="text-xs text-slate-600 cursor-pointer hover:text-slate-400 p-2 border border-dashed border-slate-700 rounded text-center">
                        {isViewer ? 'Yazıcı Tanımlanmamış' : '+ Yazıcı Ekle'}
                    </div>
                )}
                {Object.values(globalState.printers).map((p) => (
                    <button 
                        key={p.config.id}
                        onClick={() => printerService.setActivePrinter(p.config.id)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded text-sm transition ${activePrinterId === p.config.id ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-800/50'}`}
                    >
                        <span className="truncate">{p.config.name}</span>
                        <div className={`w-2 h-2 rounded-full ${p.state.wsConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    </button>
                ))}
            </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
            <button 
                onClick={() => setActiveTab('dashboard')}
                disabled={!activePrinterId}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition disabled:opacity-30 disabled:cursor-not-allowed ${activeTab === 'dashboard' ? 'bg-slate-800 text-gokturk-accent border-l-4 border-gokturk-accent' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}
            >
                <LayoutDashboard size={20} />
                <span>Özet Panel</span>
            </button>
            <button 
                onClick={() => setActiveTab('controls')}
                disabled={!activePrinterId}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition disabled:opacity-30 disabled:cursor-not-allowed ${activeTab === 'controls' ? 'bg-slate-800 text-gokturk-accent border-l-4 border-gokturk-accent' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}
            >
                <Move size={20} />
                <span>Kontroller</span>
            </button>
            <button 
                onClick={() => setActiveTab('files')}
                disabled={!activePrinterId}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition disabled:opacity-30 disabled:cursor-not-allowed ${activeTab === 'files' ? 'bg-slate-800 text-gokturk-accent border-l-4 border-gokturk-accent' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}
            >
                <FileText size={20} />
                <span>Dosyalar</span>
            </button>
             <button 
                onClick={() => setActiveTab('settings')}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition ${activeTab === 'settings' ? 'bg-slate-800 text-gokturk-accent border-l-4 border-gokturk-accent' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}
            >
                <SettingsIcon size={20} />
                <span>Ayarlar</span>
            </button>
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-slate-800">
             <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                   <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white">
                      {user.username.charAt(0).toUpperCase()}
                   </div>
                   <div className="flex flex-col">
                      <span className="text-sm text-white font-medium">{user.username}</span>
                      <span className="text-xs text-slate-500 flex items-center">
                         {isViewer ? <span className="text-yellow-500">İzleyici</span> : <><Shield size={10} className="mr-1 text-red-500"/>Admin</>}
                      </span>
                   </div>
                </div>
                <button onClick={handleLogout} className="text-slate-500 hover:text-white transition" title="Çıkış">
                   <LogOut size={16} />
                </button>
             </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between px-6 backdrop-blur-sm z-10">
            {/* Logo Alanı (Mobil Görünüm) */}
            <div className="md:hidden font-bold text-white flex items-center">
                <img src={logo} alt="Logo" className="w-5 h-5 mr-2" /> {APP_TITLE}
            </div>
            
            {activePrinterInstance ? (
                <div className="flex-1 flex justify-between items-center">
                    <div className="hidden md:block">
                        <h2 className="text-white font-bold text-lg">{activePrinterInstance.config.name}</h2>
                        <span className="text-xs text-slate-500">{activePrinterInstance.config.ip}</span>
                    </div>

                    <div className="flex items-center space-x-6">
                        {/* Status Indicators */}
                        <div className="hidden md:flex items-center space-x-6 text-sm">
                            <div className="flex items-center space-x-2">
                                <span className="text-slate-500">NOZZLE</span>
                                <span className={`font-mono font-bold ${printerState!.temperatures.tool0.actual > 50 ? 'text-red-400' : 'text-slate-300'}`}>
                                    {printerState!.temperatures.tool0.actual.toFixed(0)}°C
                                </span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <span className="text-slate-500">BED</span>
                                <span className={`font-mono font-bold ${printerState!.temperatures.bed.actual > 40 ? 'text-blue-400' : 'text-slate-300'}`}>
                                    {printerState!.temperatures.bed.actual.toFixed(0)}°C
                                </span>
                            </div>
                        </div>

                        <div className="h-8 w-px bg-slate-700 hidden md:block"></div>

                        {printerState!.status === PrinterStatus.PRINTING ? (
                            <button 
                                onClick={() => printerService.stopPrint()}
                                disabled={isViewer}
                                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center transition shadow-lg shadow-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Power className="w-4 h-4 mr-2" /> DURDUR
                            </button>
                        ) : (
                            <div className={`px-3 py-1 border rounded text-xs uppercase font-bold tracking-wide ${printerState!.wsConnected ? 'bg-green-900/30 text-green-400 border-green-900' : 'bg-red-900/30 text-red-400 border-red-900'}`}>
                                {printerState!.status}
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                 <div className="flex-1 text-center text-slate-500">Lütfen soldaki menüden bir yazıcı seçin veya yeni ekleyin.</div>
            )}
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-6 scrollbar-thin">
            <div className="max-w-7xl mx-auto space-y-6">
                
                {activeTab === 'settings' && <Settings userRole={user.role} />}
                
                {activePrinterInstance && activeTab === 'dashboard' && <Dashboard printerState={printerState!} />}
                {activePrinterInstance && activeTab === 'controls' && <ControlPanel printerState={printerState!} readOnly={isViewer} />}
                {activePrinterInstance && activeTab === 'files' && <Files printerStatus={printerState!.status} readOnly={isViewer} />}

                {/* Always visible Terminal on large screens if a printer is selected */}
                {activePrinterInstance && (
                    <div className="mt-6">
                        <Terminal logs={printerState!.logs} readOnly={isViewer} />
                    </div>
                )}
            </div>
        </div>
      </main>

      {/* Assistant always active, uses active printer context */}
      {activePrinterInstance && <GeminiAssistant printerState={printerState!} />}
    </div>
  );
};

export default App;
