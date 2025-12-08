import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { PrinterState } from '../types';

interface Props {
  printerState: PrinterState;
}

const TemperatureChart: React.FC<Props> = ({ printerState }) => {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    const now = new Date();
    const timeStr = `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;
    
    const newPoint = {
      time: timeStr,
      tool0: parseFloat(printerState.temperatures.tool0.actual.toFixed(1)),
      tool0Target: printerState.temperatures.tool0.target,
      bed: parseFloat(printerState.temperatures.bed.actual.toFixed(1)),
      bedTarget: printerState.temperatures.bed.target,
    };

    setData(prev => {
      const newData = [...prev, newPoint];
      if (newData.length > 30) newData.shift(); // Keep last 30 points
      return newData;
    });
  }, [printerState.temperatures.tool0.actual, printerState.temperatures.bed.actual]); // Dependency on values changing

  return (
    <div className="h-64 w-full bg-gokturk-panel rounded-lg p-4 border border-slate-700 shadow-lg">
      <h3 className="text-sm font-semibold text-slate-400 mb-2">Sıcaklık Grafiği</h3>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="time" stroke="#64748b" fontSize={10} tick={false} />
          <YAxis stroke="#64748b" fontSize={10} domain={[0, 'auto']} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' }}
            itemStyle={{ fontSize: '12px' }}
          />
          <Line type="monotone" dataKey="tool0" stroke="#ef4444" strokeWidth={2} dot={false} name="Nozzle" />
          <Line type="monotone" dataKey="tool0Target" stroke="#7f1d1d" strokeDasharray="5 5" dot={false} name="Nozzle Hedef" />
          <Line type="monotone" dataKey="bed" stroke="#38bdf8" strokeWidth={2} dot={false} name="Tabla" />
          <Line type="monotone" dataKey="bedTarget" stroke="#075985" strokeDasharray="5 5" dot={false} name="Tabla Hedef" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TemperatureChart;
