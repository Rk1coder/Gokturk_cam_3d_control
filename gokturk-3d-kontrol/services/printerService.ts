import { PrinterState, PrinterStatus, GCodeFile, PrinterConfig, PrinterInstance, GlobalState } from '../types';

export const MOCK_FILES: GCodeFile[] = [
  { name: 'GOKTURK_logo_v2.gcode', size: '12.4 MB', uploadDate: '2023-10-27', estimatedTime: '4h 12m' },
];

const INITIAL_PRINTER_STATE: PrinterState = {
    status: PrinterStatus.OFFLINE,
    wsConnected: false,
    temperatures: {
      tool0: { actual: 0, target: 0 },
      bed: { actual: 0, target: 0 },
    },
    position: { x: 0, y: 0, z: 0, e: 0 },
    job: {
      file: null,
      progress: 0,
      timeLeft: 0,
      printTime: 0,
    },
    logs: [],
};

// Helper class to manage a single printer connection
class PrinterConnection {
    public state: PrinterState;
    public config: PrinterConfig;
    private ws: WebSocket | null = null;
    private onUpdate: () => void;

    constructor(config: PrinterConfig, onUpdate: () => void) {
        this.config = config;
        this.state = JSON.parse(JSON.stringify(INITIAL_PRINTER_STATE)); // Deep copy
        this.state.logs.push(`Sistem hazır: ${config.name}`);
        this.onUpdate = onUpdate;
    }

    public connect() {
        if (this.ws) this.ws.close();

        const url = `ws://${this.config.ip}:${this.config.port}`;
        this.addLog(`Bağlanılıyor: ${url}...`);
        this.state.status = PrinterStatus.CONNECTING;
        this.onUpdate();

        try {
            this.ws = new WebSocket(url);

            this.ws.onopen = () => {
                this.addLog("Bağlantı Başarılı!");
                this.state.wsConnected = true;
                this.state.status = PrinterStatus.OPERATIONAL;
                this.sendJSON({ command: "GET_STATUS" });
                this.onUpdate();
            };

            this.ws.onclose = () => {
                this.addLog("Bağlantı kesildi.");
                this.state.wsConnected = false;
                this.state.status = PrinterStatus.OFFLINE;
                this.onUpdate();
            };

            this.ws.onerror = () => {
                this.addLog("Bağlantı Hatası!");
                this.state.status = PrinterStatus.ERROR;
                this.onUpdate();
            };

            this.ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    this.handleMessage(message);
                } catch (e) {
                    console.error("Parse error", e);
                }
            };
        } catch (e) {
            this.addLog("Bağlantı oluşturulamadı.");
            this.state.status = PrinterStatus.ERROR;
            this.onUpdate();
        }
    }

    public disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.state.wsConnected = false;
        this.state.status = PrinterStatus.OFFLINE;
        this.onUpdate();
    }

    private handleMessage(message: any) {
        if (message.type === 'TEMPERATURE') {
            if (message.data.tool0) this.state.temperatures.tool0 = message.data.tool0;
            if (message.data.bed) this.state.temperatures.bed = message.data.bed;
        } 
        else if (message.type === 'STATUS') {
            if(message.data === 'Printing') this.state.status = PrinterStatus.PRINTING;
            else if (message.data === 'Paused') this.state.status = PrinterStatus.PAUSED;
            else this.state.status = PrinterStatus.OPERATIONAL;
        }
        else if (message.type === 'LOG') {
            this.addLog(message.data);
        }
        else if (message.type === 'JOB_STATUS') {
            this.state.job.progress = message.data.progress;
            this.state.job.printTime = message.data.printTime;
            this.state.job.timeLeft = message.data.timeLeft;
        }
        this.onUpdate();
    }

    private addLog(message: string) {
        this.state.logs = [`[${new Date().toLocaleTimeString()}] ${message}`, ...this.state.logs].slice(0, 100);
        this.onUpdate();
    }

    public sendJSON(data: any) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        } else {
            this.addLog("HATA: Bağlantı yok.");
        }
    }
}

class PrinterManager {
  private printers: Map<string, PrinterConnection> = new Map();
  private activePrinterId: string | null = null;
  private listeners: ((state: GlobalState) => void)[] = [];

  constructor() {
    this.loadFromStorage();
  }

  // --- Storage ---
  private loadFromStorage() {
    try {
        const stored = localStorage.getItem('gokturk_printers');
        if (stored) {
            const configs: PrinterConfig[] = JSON.parse(stored);
            configs.forEach(config => {
                this.printers.set(config.id, new PrinterConnection(config, () => this.notifyListeners()));
            });
            if (configs.length > 0) {
                this.activePrinterId = configs[0].id;
            }
        }
    } catch (e) {
        console.error("Failed to load printers", e);
    }
  }

  private saveToStorage() {
      const configs = Array.from(this.printers.values()).map(p => p.config);
      localStorage.setItem('gokturk_printers', JSON.stringify(configs));
  }

  // --- Management ---

  public addPrinter(config: Omit<PrinterConfig, 'id'>) {
      const id = Date.now().toString();
      const newConfig = { ...config, id };
      const connection = new PrinterConnection(newConfig, () => this.notifyListeners());
      this.printers.set(id, connection);
      this.activePrinterId = id; // Auto switch to new printer
      this.saveToStorage();
      this.notifyListeners();
  }

  public removePrinter(id: string) {
      const printer = this.printers.get(id);
      if (printer) {
          printer.disconnect();
          this.printers.delete(id);
          if (this.activePrinterId === id) {
              const ids = Array.from(this.printers.keys());
              this.activePrinterId = ids.length > 0 ? ids[0] : null;
          }
          this.saveToStorage();
          this.notifyListeners();
      }
  }

  public setActivePrinter(id: string) {
      if (this.printers.has(id)) {
          this.activePrinterId = id;
          this.notifyListeners();
      }
  }

  public getActivePrinter(): PrinterConnection | null {
      if (!this.activePrinterId) return null;
      return this.printers.get(this.activePrinterId) || null;
  }

  // --- Controls Delegate (All actions go to Active Printer) ---

  public connect(id: string) {
      this.printers.get(id)?.connect();
  }

  public disconnect(id: string) {
      this.printers.get(id)?.disconnect();
  }

  public setTemperature(type: 'tool0' | 'bed', temp: number) {
      const p = this.getActivePrinter();
      if (!p) return;
      const gcode = type === 'tool0' ? `M104 S${temp}` : `M140 S${temp}`;
      p.sendJSON({ command: "GCODE", code: gcode });
      p.state.temperatures[type].target = temp;
      this.notifyListeners();
  }

  public moveAxis(axis: 'x' | 'y' | 'z', amount: number) {
      const p = this.getActivePrinter();
      if (!p) return;
      p.sendJSON({ command: "GCODE", code: "G91" });
      p.sendJSON({ command: "GCODE", code: `G1 ${axis.toUpperCase()}${amount} F3000` });
      p.sendJSON({ command: "GCODE", code: "G90" });
  }

  public homeAxis(axes: string[]) {
      const p = this.getActivePrinter();
      if (!p) return;
      p.sendJSON({ command: "GCODE", code: `G28 ${axes.join(' ').toUpperCase()}` });
  }

  public startPrint(file: GCodeFile) {
      const p = this.getActivePrinter();
      if (!p) return;
      p.sendJSON({ command: "START_PRINT", filename: file.name });
  }

  public stopPrint() {
      const p = this.getActivePrinter();
      if (!p) return;
      p.sendJSON({ command: "STOP_PRINT" });
      p.sendJSON({ command: "GCODE", code: "M112" });
  }
  
  public sendGCode(code: string) {
      const p = this.getActivePrinter();
      if (!p) return;
      // Manually add log for optimistic UI
      p.state.logs = [`[${new Date().toLocaleTimeString()}] GÖNDERİLDİ: ${code}`, ...p.state.logs].slice(0, 100);
      p.sendJSON({ command: "GCODE", code: code });
      this.notifyListeners();
  }

  // --- Subscriptions ---

  public subscribe(listener: (state: GlobalState) => void) {
    this.listeners.push(listener);
    this.notifyListeners(); // Immediate update
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    const state: GlobalState = {
        activePrinterId: this.activePrinterId,
        printers: {}
    };
    
    this.printers.forEach((connection, id) => {
        state.printers[id] = {
            config: connection.config,
            state: { ...connection.state } // Shallow copy to trigger React updates
        };
    });

    this.listeners.forEach(l => l(state));
  }
}

export const printerService = new PrinterManager();