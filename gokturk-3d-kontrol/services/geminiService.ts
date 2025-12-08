import { GoogleGenAI } from "@google/genai";
import { PrinterState } from "../types";

const SYSTEM_INSTRUCTION = `
Sen GÖKTÜRK takımının uzman 3D yazıcı asistanısın. 
Görevin mühendislere 3D baskı sorunları, G-code komutları ve malzeme bilgisi hakkında kısa, net ve teknik cevaplar vermektir.
Türkçe konuş. Yanıtların profesyonel ve havacılık/savunma sanayi ciddiyetine uygun olsun.
`;

export class GeminiService {
  private ai: GoogleGenAI | null = null;
  private model: any = null;

  constructor() {
    const apiKey = process.env.API_KEY;
    if (apiKey) {
      this.ai = new GoogleGenAI({ apiKey });
      this.model = this.ai.models;
    }
  }

  async analyzePrinterState(state: PrinterState, userQuery: string): Promise<string> {
    if (!this.ai) return "API Anahtarı bulunamadı. Lütfen çevre değişkenlerini kontrol edin.";

    const context = `
    Şu anki yazıcı durumu:
    Durum: ${state.status}
    Nozzle Sıcaklığı: ${state.temperatures.tool0.actual.toFixed(1)}°C (Hedef: ${state.temperatures.tool0.target}°C)
    Tabla Sıcaklığı: ${state.temperatures.bed.actual.toFixed(1)}°C (Hedef: ${state.temperatures.bed.target}°C)
    Yazdırılan Dosya: ${state.job.file?.name || 'Yok'}
    İlerleme: %${state.job.progress.toFixed(1)}
    `;

    try {
      const response = await this.model.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Bağlam verisi: ${context}\n\nKullanıcı sorusu: ${userQuery}`,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
        }
      });
      return response.text;
    } catch (error) {
      console.error("Gemini Error:", error);
      return "Üzgünüm, şu anda yanıt veremiyorum. Lütfen bağlantınızı kontrol edin.";
    }
  }
}

export const geminiService = new GeminiService();
