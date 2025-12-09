import { GlobalState, PrinterConfig, PrinterState, PrinterStatus, GCodeFile } from '../types';

// Mock Data for Files
export const MOCK_FILES: GCodeFile[] = [
  { name: 'iron_man_mask.gcode', size: '14.2 MB', uploadDate: '2023-10-24', estimatedTime: '4h 12m' },
  { name: 'benchy_boat.gcode', size: '3.1 MB', uploadDate: '2023-10-25', estimatedTime: '1h 05m' },
  { name: 'phone_stand_v2.gcode', size: '5.8 MB', uploadDate: '2023-10-26', estimatedTime: '2h 30m' },
];

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
  lastFrame: null // Başlangıçta görüntü yok
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

  // --- STATE MANAGEMENT ---
  
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
      
      // Auto connect logic could go here
      configs.forEach(c => this.connect(c.id));
    }
  }

  // --- PRINTER ACTIONS ---

  addPrinter(config: Omit<PrinterConfig, 'id'>) {
    const id = Date.now().toString();
    const newConfig = { ...config, id };
    
    this.state.printers[id] = {
      config: newConfig,
      state: { ...INITIAL_PRINTER_STATE }
    };
    
    if (!this.state.activePrinterId) {
      this.state.activePrinterId = id;
    }
    
    this.connect(id);
    this.notify();
  }

  removePrinter(id: string) {
    this.disconnect(id);
    const { [id]: removed, ...others } = this.state.printers;
    this.state.printers = others;
    
    if (this.state.activePrinterId === id) {
      this.state.activePrinterId = Object.keys(others)[0] || null;
    }
    
    this.notify();
  }

  setActivePrinter(id: string) {
    if (this.state.printers[id]) {
      this.state.activePrinterId = id;
      this.notify();
    }
  }

  // --- WEBSOCKET CONNECTION ---

  connect(printerId: string) {
    const printer = this.state.printers[printerId];
    if (!printer || this.sockets[printerId]) return;

    try {
      // Handle "ngrok" or local IP formatting if needed
      let wsUrl = `ws://${printer.config.ip}:${printer.config.port}`;
      if (printer.config.ip.includes('ngrok')) {
        wsUrl = `wss://${printer.config.ip.replace('https://', '').replace('http://', '')}`;
      }

      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        this.updatePrinterState(printerId, { 
          wsConnected: true, 
          status: PrinterStatus.IDLE,
          logs: [...printer.state.logs, 'Sisteme Bağlanıldı.']
        });
        // Bağlandığında kamerayı aç komutu gönder
        ws.send(JSON.stringify({ command: 'CAMERA_ON' }));
      };

      ws.onclose = () => {
        this.updatePrinterState(printerId, { 
          wsConnected: false, 
          status: PrinterStatus.OFFLINE,
          logs: [...this.state.printers[printerId].state.logs, 'Bağlantı Kesildi.']
        });
        delete this.sockets[printerId];
      };

      ws.onerror = (err) => {
        console.error("WS Error", err);
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          if (message.type === 'LOG') {
            const currentLogs = this.state.printers[printerId].state.logs;
            const newLogs = [...currentLogs, message.data].slice(-100); // Keep last 100 logs
            this.updatePrinterState(printerId, { logs: newLogs });
          } 
          else if (message.type === 'STATUS') {
             const statusStr = message.data === 'Printing' ? PrinterStatus.PRINTING : PrinterStatus.IDLE;
             this.updatePrinterState(printerId, { status: statusStr });
          }
          // --- VİDEO İŞLEME EKLENDİ ---
          else if (message.type === 'VIDEO') {
             // Gelen base64 verisini state'e yaz
             this.updatePrinterState(printerId, { lastFrame: message.data });
          }
          // ----------------------------

        } catch (e) {
          console.error("Message parse error", e);
        }
      };

      this.sockets[printerId] = ws;
    } catch (e) {
      console.error("Connection failed", e);
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

  private updatePrinterState(id: string, updates: Partial<PrinterState>) {
    if (this.state.printers[id]) {
      this.state.printers[id].state = {
        ...this.state.printers[id].state,
        ...updates
      };
      this.notify();
    }
  }

  // --- COMMANDS ---

  sendGCode(code: string) {
    const id = this.state.activePrinterId;
    if (id && this.sockets[id]) {
      this.sockets[id].send(JSON.stringify({ command: 'GCODE', code }));
      const currentLogs = this.state.printers[id].state.logs;
      this.updatePrinterState(id, { logs: [...currentLogs, `GÖNDERİLDİ: ${code}`].slice(-100) });
    }
  }

  moveAxis(axis: 'x'|'y'|'z', distance: number) {
    this.sendGCode(`G91`); // Relative positioning
    this.sendGCode(`G1 ${axis.toUpperCase()}${distance} F3000`);
    this.sendGCode(`G90`); // Back to absolute
  }

  homeAxis(axes: string[]) {
    this.sendGCode(`G28 ${axes.join(' ')}`);
  }

  setTemperature(type: 'tool0' | 'bed', temp: number) {
     const code = type === 'tool0' ? `M104 S${temp}` : `M140 S${temp}`;
     this.sendGCode(code);
     const id = this.state.activePrinterId;
     if (id) {
       const key = type;
       this.state.printers[id].state.temperatures[key].target = temp;
       this.notify();
     }
  }

  startPrint(file: GCodeFile) {
     const id = this.state.activePrinterId;
     if(id && this.sockets[id]) {
         this.sockets[id].send(JSON.stringify({ command: 'START_PRINT', file: file.name }));
         this.updatePrinterState(id, { 
             status: PrinterStatus.PRINTING,
             job: {
                 file,
                 progress: 0,
                 printTime: 0,
                 timeLeft: 3600 // mock
             }
         });
         this.simulatePrintLoop(id);
     }
  }

  stopPrint() {
      const id = this.state.activePrinterId;
      if(id && this.sockets[id]) {
          this.sockets[id].send(JSON.stringify({ command: 'STOP_PRINT' }));
          this.updatePrinterState(id, { status: PrinterStatus.IDLE });
      }
  }

  // --- SIMULATION HELPER ---
  private simulatePrintLoop(printerId: string) {
      const interval = setInterval(() => {
          const p = this.state.printers[printerId];
          if(!p || p.state.status !== PrinterStatus.PRINTING) {
              clearInterval(interval);
              return;
          }

          const newProgress = Math.min(p.state.job.progress + 0.5, 100);
          this.updatePrinterState(printerId, {
              job: {
                  ...p.state.job,
                  progress: newProgress,
                  printTime: p.state.job.printTime + 1
              },
              temperatures: {
                  tool0: { ...p.state.temperatures.tool0, actual: p.state.temperatures.tool0.target + (Math.random() - 0.5) * 2 },
                  bed: { ...p.state.temperatures.bed, actual: p.state.temperatures.bed.target + (Math.random() - 0.5) }
              }
          });

          if (newProgress >= 100) {
              this.updatePrinterState(printerId, { status: PrinterStatus.IDLE });
              clearInterval(interval);
          }
      }, 1000);
  }

  getCurrentUser() {
      return JSON.parse(localStorage.getItem('gokturk_user') || 'null');
  }
}

export const printerService = new PrinterService();