import { GlobalState, PrinterConfig, PrinterState, PrinterStatus, GCodeFile } from '../types';

const INITIAL_PRINTER_STATE: PrinterState = {
  status: PrinterStatus.OFFLINE,
  temperatures: {
    tool0: { actual: 0, target: 0 },
    bed: { actual: 0, target: 0 }
  },
  job: {
    file: null,
    progress: 0,
    printTime: 0,
    timeLeft: 0
  },
  wsConnected: false,
  logs: [],
  lastFrame: null 
};

class PrinterService {
  private state: GlobalState = {
    activePrinterId: null,
    printers: {}
  };
  
  private listeners: ((state: GlobalState) => void)[] = [];
  private sockets: Record<string, WebSocket> = {};

  constructor() {
    this.loadFromStorage();
  }

  subscribe(listener: (state: GlobalState) => void) {
    this.listeners.push(listener);
    listener(this.state);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(l => l(this.state));
    this.saveToStorage();
  }

  private saveToStorage() {
    const configs = Object.values(this.state.printers).map(p => p.config);
    localStorage.setItem('gokturk_printers', JSON.stringify(configs));
  }

  private loadFromStorage() {
    const stored = localStorage.getItem('gokturk_printers');
    if (stored) {
      const configs: PrinterConfig[] = JSON.parse(stored);
      configs.forEach(config => {
        this.state.printers[config.id] = {
          config,
          state: { ...INITIAL_PRINTER_STATE }
        };
      });
      if (configs.length > 0) {
        this.state.activePrinterId = configs[0].id;
      }
      this.notify();
      configs.forEach(c => this.connect(c.id));
    }
  }

  // --- ACTIONS ---

  addPrinter(config: Omit<PrinterConfig, 'id'>) {
    const id = Date.now().toString();
    const newConfig = { ...config, id };
    this.state.printers[id] = { config: newConfig, state: { ...INITIAL_PRINTER_STATE } };
    if (!this.state.activePrinterId) this.state.activePrinterId = id;
    this.connect(id);
    this.notify();
  }

  removePrinter(id: string) {
    this.disconnect(id);
    const { [id]: removed, ...others } = this.state.printers;
    this.state.printers = others;
    if (this.state.activePrinterId === id) this.state.activePrinterId = Object.keys(others)[0] || null;
    this.notify();
  }

  setActivePrinter(id: string) {
    if (this.state.printers[id]) {
      this.state.activePrinterId = id;
      this.notify();
    }
  }

  // --- WEBSOCKET BAĞLANTISI ---

  connect(printerId: string) {
    const printer = this.state.printers[printerId];
    if (!printer || this.sockets[printerId]) return;

    try {
      // Eğer ngrok adresi girildiyse wss:// yap, değilse ws://
      let protocol = 'ws://';
      let host = `${printer.config.ip}:${printer.config.port}`;
      
      if (printer.config.ip.includes('ngrok')) {
        protocol = 'wss://';
        host = printer.config.ip.replace('http://', '').replace('https://', '');
      }

      const wsUrl = `${protocol}${host}`;
      console.log(`Bağlanılıyor: ${wsUrl}`);

      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log("WebSocket Bağlandı");
        this.updatePrinterState(printerId, { 
          wsConnected: true, 
          status: PrinterStatus.IDLE,
          logs: [...printer.state.logs, 'Sistem Bağlandı.']
        });
        ws.send(JSON.stringify({ command: 'CAMERA_ON' }));
        // Sıcaklıkları sormaya başla (M105 komutu) - Her 3 saniyede bir
        this.startPollingTemp(printerId);
      };

      ws.onclose = () => {
        console.log("WebSocket Kapandı");
        this.updatePrinterState(printerId, { 
          wsConnected: false, 
          status: PrinterStatus.OFFLINE,
          lastFrame: null // Görüntüyü sıfırla
        });
        delete this.sockets[printerId];
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          if (message.type === 'LOG') {
            // Gelen log satırını analiz et (Sıcaklık verisi var mı?)
            this.parseLogForTemp(printerId, message.data);

            const currentLogs = this.state.printers[printerId].state.logs;
            const newLogs = [...currentLogs, message.data].slice(-50); 
            this.updatePrinterState(printerId, { logs: newLogs });
          } 
          else if (message.type === 'STATUS') {
             const statusStr = message.data === 'Printing' ? PrinterStatus.PRINTING : PrinterStatus.IDLE;
             this.updatePrinterState(printerId, { status: statusStr });
          }
          else if (message.type === 'VIDEO') {
             // SADECE KAMERADAN GELEN VERİ
             this.updatePrinterState(printerId, { lastFrame: message.data });
          }

        } catch (e) {
          console.error("Mesaj hatası:", e);
        }
      };

      this.sockets[printerId] = ws;
    } catch (e) {
      console.error("Bağlantı hatası:", e);
    }
  }

  disconnect(printerId: string) {
    const ws = this.sockets[printerId];
    if (ws) {
      try { ws.send(JSON.stringify({ command: 'CAMERA_OFF' })); } catch(e){}
      ws.close();
      delete this.sockets[printerId];
    }
  }

  // --- SICAKLIK ANALİZİ (PARSING) ---
  private parseLogForTemp(printerId: string, logLine: string) {
    // Marlin formatı: "ok T:200.0 /200.0 B:60.0 /60.0" veya benzeri
    // Regex ile T (Nozzle) ve B (Bed) değerlerini yakala
    const tempRegex = /T:(\d+\.?\d*)\s*\/(\d+\.?\d*)\s*B:(\d+\.?\d*)\s*\/(\d+\.?\d*)/;
    const match = logLine.match(tempRegex);

    if (match) {
        const actualTool = parseFloat(match[1]);
        const targetTool = parseFloat(match[2]);
        const actualBed = parseFloat(match[3]);
        const targetBed = parseFloat(match[4]);

        this.updatePrinterState(printerId, {
            temperatures: {
                tool0: { actual: actualTool, target: targetTool },
                bed: { actual: actualBed, target: targetBed }
            }
        });
    }
  }

  private startPollingTemp(printerId: string) {
      // 3 Saniyede bir sıcaklık sor
      const interval = setInterval(() => {
          if(!this.sockets[printerId] || !this.state.printers[printerId].state.wsConnected) {
              clearInterval(interval);
              return;
          }
          this.sendGCode("M105"); // Sıcaklık Raporu İste
      }, 3000);
  }

  private updatePrinterState(id: string, updates: Partial<PrinterState>) {
    if (this.state.printers[id]) {
      this.state.printers[id].state = {
        ...this.state.printers[id].state,
        ...updates
      };
      this.notify();
    }
  }

  // --- KOMUTLAR (Sadece Gönderir, Fake Güncelleme Yapmaz) ---

  sendGCode(code: string) {
    const id = this.state.activePrinterId;
    if (id && this.sockets[id]) {
      this.sockets[id].send(JSON.stringify({ command: 'GCODE', code }));
    }
  }

  moveAxis(axis: 'x'|'y'|'z', distance: number) {
    this.sendGCode(`G91`); 
    this.sendGCode(`G1 ${axis.toUpperCase()}${distance} F3000`);
    this.sendGCode(`G90`); 
  }

  homeAxis(axes: string[]) {
    this.sendGCode(`G28 ${axes.join(' ')}`);
  }

  setTemperature(type: 'tool0' | 'bed', temp: number) {
     const code = type === 'tool0' ? `M104 S${temp}` : `M140 S${temp}`;
     this.sendGCode(code);
  }

  startPrint(file: GCodeFile) {
     const id = this.state.activePrinterId;
     if(id && this.sockets[id]) {
         this.sockets[id].send(JSON.stringify({ command: 'START_PRINT', file: file.name }));
         // Simülasyon yok, yazıcıdan 'Printing' statusu gelince arayüz değişecek.
     }
  }

  stopPrint() {
      const id = this.state.activePrinterId;
      if(id && this.sockets[id]) {
          this.sockets[id].send(JSON.stringify({ command: 'STOP_PRINT' }));
      }
  }

  getCurrentUser() {
      return JSON.parse(localStorage.getItem('gokturk_user') || 'null');
  }
}

export const printerService = new PrinterService();