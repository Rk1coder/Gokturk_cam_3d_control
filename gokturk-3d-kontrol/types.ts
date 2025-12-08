export enum PrinterStatus {
  OFFLINE = "Çevrimdışı",
  CONNECTING = "Bağlanıyor...",
  OPERATIONAL = "Hazır",
  PRINTING = "Yazdırılıyor",
  PAUSED = "Duraklatıldı",
  ERROR = "Hata"
}

export interface TemperaturePoint {
  time: string;
  tool0: number;
  tool0Target: number;
  bed: number;
  bedTarget: number;
}

export interface AxisPosition {
  x: number;
  y: number;
  z: number;
  e: number;
}

export interface GCodeFile {
  name: string;
  size: string;
  uploadDate: string;
  estimatedTime: string;
}

export interface PrinterState {
  status: PrinterStatus;
  wsConnected: boolean;
  temperatures: {
    tool0: { actual: number; target: number };
    bed: { actual: number; target: number };
  };
  position: AxisPosition;
  job: {
    file: GCodeFile | null;
    progress: number; // 0-100
    timeLeft: number; // seconds
    printTime: number; // seconds
  };
  logs: string[];
}

export interface PrinterConfig {
  id: string;
  name: string;
  ip: string;
  port: string;
}

export interface PrinterInstance {
    config: PrinterConfig;
    state: PrinterState;
}

export interface GlobalState {
    activePrinterId: string | null;
    printers: { [id: string]: PrinterInstance };
}

export enum UserRole {
  ADMIN = 'ADMIN',
  VIEWER = 'VIEWER'
}

export interface User {
  username: string;
  role: UserRole;
}