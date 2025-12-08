import React, { useState } from 'react';
import { Wifi, Save, Copy, Terminal, Plus, Trash2, WifiOff, ShieldAlert } from 'lucide-react';
import { printerService } from '../services/printerService';
import { GlobalState, UserRole } from '../types';

interface Props {
    userRole: UserRole;
}

const PYTHON_SERVER_CODE = `import asyncio
import websockets
import serial
import json
import time

# --- AYARLAR ---
SERIAL_PORT = '/dev/ttyUSB0' # Yazıcının bağlı olduğu port
BAUD_RATE = 115200
WS_PORT = 8765

# --- UZAKTAN ERISIM ICIN (Opsiyonel) ---
# Eger ngrok kullaniyorsaniz:
# ngrok http 8765
# Web arayuzune ngrok adresini (wss://...) giriniz.

async def printer_server(websocket):
    print("Client baglandi.")
    try:
        ser = serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=1)
        print(f"Seri port acildi: {SERIAL_PORT}")
    except Exception as e:
        print(f"Seri port hatasi: {e}")
        await websocket.send(json.dumps({"type": "LOG", "data": f"Seri Port Hatasi: {e}"}))
        return

    async def read_serial():
        while True:
            if ser.in_waiting > 0:
                line = ser.readline().decode('utf-8', errors='ignore').strip()
                if line:
                    await websocket.send(json.dumps({"type": "LOG", "data": line}))
            await asyncio.sleep(0.1)

    async def listen_socket():
        async for message in websocket:
            try:
                data = json.loads(message)
                if data.get('command') == 'GCODE':
                    code = data.get('code')
                    print(f"GCode Alindi: {code}")
                    ser.write(f"{code}\\n".encode())
                elif data.get('command') == 'START_PRINT':
                    await websocket.send(json.dumps({"type": "STATUS", "data": "Printing"}))
                elif data.get('command') == 'STOP_PRINT':
                    ser.write(b"M112\\n")
                    await websocket.send(json.dumps({"type": "STATUS", "data": "Operational"}))
                elif data.get('command') == 'GET_STATUS':
                     await websocket.send(json.dumps({"type": "STATUS", "data": "Operational"}))
            except Exception as e:
                print(f"Hata: {e}")

    await asyncio.gather(read_serial(), listen_socket())

async def main():
    async with websockets.serve(printer_server, "0.0.0.0", WS_PORT):
        print(f"Sunucu baslatildi: ws://0.0.0.0:{WS_PORT}")
        await asyncio.Future()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("Kapatiliyor...")
`;

// Helper component to display existing printers
const PrinterList = ({ userRole }: { userRole: UserRole }) => {
    const [state, setState] = useState<GlobalState | null>(null);

    React.useEffect(() => {
        return printerService.subscribe(setState);
    }, []);

    if (!state) return null;

    return (
        <div className="space-y-4">
            <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Kayıtlı Yazıcılar</h4>
            {Object.values(state.printers).length === 0 && (
                <div className="text-slate-500 text-sm italic">Henüz yazıcı eklenmemiş.</div>
            )}
            {Object.values(state.printers).map(p => (
                <div key={p.config.id} className="bg-slate-800 p-4 rounded-lg border border-slate-700 flex items-center justify-between">
                    <div>
                        <div className="font-bold text-white flex items-center">
                            {p.config.name}
                            {p.state.wsConnected ? 
                                <span className="ml-2 w-2 h-2 bg-green-500 rounded-full animate-pulse" title="Bağlı"></span> : 
                                <span className="ml-2 w-2 h-2 bg-red-500 rounded-full" title="Bağlı Değil"></span>
                            }
                        </div>
                        <div className="text-xs text-slate-500 font-mono">{p.config.ip}:{p.config.port}</div>
                    </div>
                    <div className="flex space-x-2">
                        {p.state.wsConnected ? (
                             <button 
                                onClick={() => printerService.disconnect(p.config.id)}
                                className="p-2 bg-red-900/30 text-red-400 hover:bg-red-900/50 rounded transition"
                                title="Bağlantıyı Kes"
                             >
                                <WifiOff size={18} />
                             </button>
                        ) : (
                            <button 
                                onClick={() => printerService.connect(p.config.id)}
                                className="p-2 bg-green-900/30 text-green-400 hover:bg-green-900/50 rounded transition"
                                title="Bağlan"
                            >
                                <Wifi size={18} />
                            </button>
                        )}
                        {userRole === UserRole.ADMIN && (
                            <button 
                                onClick={() => printerService.removePrinter(p.config.id)}
                                className="p-2 bg-slate-700 text-slate-400 hover:text-white rounded transition"
                                title="Sil"
                            >
                                <Trash2 size={18} />
                            </button>
                        )}
                    </div>
                </div>
            ))}
        </div>
    )
}

const Settings: React.FC<Props> = ({ userRole }) => {
  const [name, setName] = useState('');
  const [ip, setIp] = useState('');
  const [port, setPort] = useState('8765');
  const [copied, setCopied] = useState(false);

  const handleAdd = () => {
    if(name && ip && port) {
        printerService.addPrinter({ name, ip, port });
        setName('');
        setIp('');
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(PYTHON_SERVER_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      
      {/* Printer Management */}
      <div className="space-y-6">
          {userRole === UserRole.ADMIN ? (
              <div className="bg-gokturk-panel p-6 rounded-lg border border-slate-700 shadow-lg">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center">
                  <Plus className="w-5 h-5 mr-2 text-gokturk-accent" /> Yeni Yazıcı Ekle
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Yazıcı Adı</label>
                    <input 
                      type="text" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white focus:border-gokturk-accent focus:outline-none"
                      placeholder="örn. GÖKTÜRK-1 (Atölye)"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                      <div className="col-span-2">
                        <label className="block text-sm text-slate-400 mb-1">IP veya Adres</label>
                        <input 
                          type="text" 
                          value={ip}
                          onChange={(e) => setIp(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white focus:border-gokturk-accent focus:outline-none"
                          placeholder="192.168.1.X veya my-printer.ngrok.io"
                        />
                        <p className="text-[10px] text-slate-500 mt-1">Uzak bağlantı için Ngrok URL kullanın.</p>
                      </div>
                      <div>
                        <label className="block text-sm text-slate-400 mb-1">Port</label>
                        <input 
                          type="text" 
                          value={port}
                          onChange={(e) => setPort(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white focus:border-gokturk-accent focus:outline-none"
                          placeholder="8765"
                        />
                      </div>
                  </div>

                  <button 
                    onClick={handleAdd}
                    className="w-full bg-gokturk-accent hover:bg-blue-600 text-slate-900 font-bold py-3 rounded transition flex items-center justify-center"
                  >
                    <Save className="mr-2 w-4 h-4" /> Ekle
                  </button>
                </div>
              </div>
          ) : (
              <div className="bg-slate-800/50 p-6 rounded-lg border border-slate-700 border-l-4 border-l-yellow-500 flex items-start">
                  <ShieldAlert className="text-yellow-500 mr-4 shrink-0" size={24}/>
                  <div>
                      <h3 className="text-white font-bold">Yetki Kısıtlaması</h3>
                      <p className="text-slate-400 text-sm mt-1">İzleyici hesabıyla yeni yazıcı ekleyemez veya silemezsiniz. Lütfen yönetici ile iletişime geçin.</p>
                  </div>
              </div>
          )}
          
          <PrinterList userRole={userRole} />
      </div>

      {/* Python Script Display */}
      <div className="bg-slate-900 p-6 rounded-lg border border-slate-700 shadow-lg flex flex-col h-full max-h-[800px]">
        <div className="flex justify-between items-center mb-4">
           <div>
               <h3 className="text-lg font-bold text-white flex items-center">
                 <Terminal className="w-5 h-5 mr-2 text-green-500" /> Raspberry Pi Server Kodu
               </h3>
               <p className="text-xs text-slate-500 mt-1">Bu kodu her Pi'ye 'server.py' olarak kaydedin.</p>
           </div>
           <button 
             onClick={copyCode}
             className="flex items-center space-x-2 text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1 rounded text-white transition border border-slate-600"
           >
             {copied ? <span className="text-green-400">Kopyalandı!</span> : <><Copy size={14} /> <span>Kopyala</span></>}
           </button>
        </div>
        
        <div className="flex-1 overflow-auto bg-black p-4 rounded border border-slate-800 font-mono text-xs text-green-400 scrollbar-thin">
           <pre>{PYTHON_SERVER_CODE}</pre>
        </div>
      </div>

    </div>
  );
};

export default Settings;