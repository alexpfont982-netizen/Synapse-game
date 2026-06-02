// src/features/dashboard/utils/performanceEngine.ts

export interface HardwarePiece {
  id: string;
  type: string;
  name: string;
  slot_id: string | null;
  stats: {
    tflops?: number;
    accuracy?: number;
    heat?: number;
    power?: number;
    capacity?: number; // <-- NUEVO: Agregamos el parámetro de capacidad (GB)
  };
}

export function calculateClusterPerformance(hardwareList: HardwarePiece[]) {
  const installedPieces = hardwareList.filter(item => item.slot_id !== null);

  const gpus = installedPieces.filter(item => item.type === 'GPU');
  const mems = installedPieces.filter(item => item.type === 'MEMORY');

  // --- NUEVA LÓGICA DE MEMORIA POR CAPACIDAD ---
  // Sumamos todos los GB instalados. (Si a una RAM le falta el dato en la BD, asume 32 por defecto)
  const totalRamCapacity = mems.reduce((sum, mem) => sum + (mem.stats?.capacity || 32), 0);
  
  // Cada GPU exige 64GB de RAM para funcionar sin cuello de botella
  const requiredRamCapacity = gpus.length * 64; 

  // Calculamos el coeficiente: Si tienes 32GB pero necesitas 64GB, el coeficiente es 0.5 (50%)
  const memCoefficient = requiredRamCapacity === 0 ? 1 : Math.min(1, totalRamCapacity / requiredRamCapacity);

  // Aplicamos el castigo de memoria a los TFLOPS brutos
  const baseTflops = installedPieces.reduce((sum, item) => sum + (item.stats?.tflops || 0), 0);
  const effectiveTflops = baseTflops * memCoefficient;
  
  const avgAccuracy = gpus.length > 0 
    ? gpus.reduce((sum, item) => sum + (item.stats?.accuracy || 1.0), 0) / gpus.length 
    : 1.0;

  let totalHeat = 20; 
  let totalCooling = 0;
  
  installedPieces.forEach(item => {
    if (item.type === 'GPU') totalHeat += (item.stats?.heat || 0);
    if (item.type === 'FAN') totalCooling += (item.stats?.heat || 0); 
  });

  const netHeat = Math.max(20, totalHeat - totalCooling);
  const heatPenalty = netHeat > 80 ? Math.max(0.1, 1 - ((netHeat - 80) * 0.05)) : 1.0;
  
  // Fórmula final usando los TFLOPS efectivos (ya castigados por la falta de RAM)
  const score = (effectiveTflops * avgAccuracy) * heatPenalty * 100;

  return {
    performanceScore: Math.round(score),
    efficiency: heatPenalty
  };
}