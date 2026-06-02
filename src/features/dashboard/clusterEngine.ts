/**
 * Motor de simulación de infraestructura de Synapse - v2.0 (Especificación Enterprise)
 * Calcula estrictamente cuellos de botella de energía, cargas térmicas y cumplimiento de hardware.
 */

export interface ClusterInput {
  gpuCount: number;
  systemRamGb: number;
  powerCableTier: number;    // 1 = Cobre estándar, 2 = Calibre de alta resistencia, 3 = Subestación dedicada
  fanTier: number;           // 0 = Ninguno/Pasivo, 1 = Ventilador de inyección Nivel 1, 2 = Turbina de inyección Nivel 2
  exhaustTier: number;       // 0 = Ninguno/Pasivo, 1 = Extractor de aire Nivel 1, 2 = Extractor de alta presión Nivel 2
  baseGpuPowerTflops: number; // Ej. 0.04 TFLOPS por unidad GPU estándar
}

export interface SystemAlert {
  type: 'OK' | 'WARN' | 'CRIT';
  code: string;
  message: string;
}

export interface ClusterTelemetry {
  effectiveTflops: number;
  efficiencyPercentage: number;
  totalPowerDrawWatts: number;
  systemTemperatureCelsius: number;
  alerts: SystemAlert[];
  statusStructure: {
    powerStatus: 'NOMINAL' | 'OVERLOAD_RISK' | 'SHUTDOWN_CRITICAL';
    thermalStatus: 'COOL' | 'THERMAL_THROTTLING' | 'CRITICAL_MELTDOWN';
    dataStatus: 'OPTIMAL' | 'BUS_BOTTLENECK';
  };
}

export function calculateClusterTelemetry(input: ClusterInput): ClusterTelemetry {
  const { gpuCount, systemRamGb, powerCableTier, fanTier, exhaustTier, baseGpuPowerTflops } = input;
  
  // 1. Constantes iniciales de infraestructura
  const ambientTemp = 25; // Temperatura ambiente base de la sala en Celsius
  const wattsPerGpu = 250;
  const theoreticalMaxTflops = gpuCount * baseGpuPowerTflops;
  
  const totalPowerDrawWatts = gpuCount * wattsPerGpu;
  let efficiencyModifier = 1.0;
  const alerts: SystemAlert[] = [];
  
  // Seguimiento del estado inicializado en perfectas condiciones operacionales (Tipado explícito para evitar as const)
  const status: {
    powerStatus: 'NOMINAL' | 'OVERLOAD_RISK' | 'SHUTDOWN_CRITICAL';
    thermalStatus: 'COOL' | 'THERMAL_THROTTLING' | 'CRITICAL_MELTDOWN';
    dataStatus: 'OPTIMAL' | 'BUS_BOTTLENECK';
  } = {
    powerStatus: 'NOMINAL',
    thermalStatus: 'COOL',
    dataStatus: 'OPTIMAL'
  };

  if (gpuCount === 0) {
    return {
      effectiveTflops: 0,
      efficiencyPercentage: 100,
      totalPowerDrawWatts: 0,
      systemTemperatureCelsius: ambientTemp,
      alerts: [{ type: 'OK', code: 'SYS_IDLE', message: 'Mainframe offline. Awaiting GPU deployment sequence.' }],
      statusStructure: { powerStatus: 'NOMINAL', thermalStatus: 'COOL', dataStatus: 'OPTIMAL' }
    };
  }

  // ==========================================
  // 2. VALIDACIÓN DE LA RED ELÉCTRICA (Fusibles y Cableado)
  // ==========================================
  if (gpuCount >= 25 && gpuCount <= 69) {
    if (powerCableTier < 2) {
      status.powerStatus = 'SHUTDOWN_CRITICAL';
      alerts.push({
        type: 'CRIT',
        code: 'POWER_OVERLOAD',
        message: 'CRITICAL OVERCURRENT: Wiring infrastructure inadequate for 25+ GPUs. Upgrade to Heavy-Duty Gauges immediately.'
      });
    } else if (powerCableTier === 2) {
      status.powerStatus = 'NOMINAL';
    }
  } else if (gpuCount >= 70) {
    if (powerCableTier < 3) {
      status.powerStatus = 'SHUTDOWN_CRITICAL';
      alerts.push({
        type: 'CRIT',
        code: 'GRID_COLLAPSE',
        message: 'POWER GRID COLLAPSE: Sub-station failure. 70+ GPUs requires a Dedicated Substation Link.'
      });
    }
  }

  // ==========================================
  // 3. BUS DE DATOS Y ASIGNACIÓN DE RAM (Cuellos de Botella)
  // ==========================================
  // Regla: Cada grupo de 8 GPUs requiere 16 GB de RAM del sistema para alimentar el flujo PCIe
  const requiredRam = Math.ceil(gpuCount / 8) * 16;
  if (systemRamGb < requiredRam) {
    status.dataStatus = 'BUS_BOTTLENECK';
    // La eficiencia disminuye linealmente según la falta de memoria del sistema para las GPUs
    const ramDeficitRatio = systemRamGb / requiredRam;
    efficiencyModifier *= Math.max(0.3, ramDeficitRatio); 
    alerts.push({
      type: 'WARN',
      code: 'MEM_BOTTLENECK',
      message: `PCIE BUS STARVATION: System RAM (${systemRamGb}GB) is insufficient for current thread count. Required: ${requiredRam}GB. Performance throttled.`
    });
  }

  // ==========================================
  // 4. DINÁMICA TÉRMICA (Enfriamiento vs Disipación de Calor)
  // ==========================================
  // La carga térmica aumenta exponencialmente con la densidad si no se cumplen los parámetros de refrigeración
  let heatDissipationFactor = 1.0;
  
  if (fanTier === 1) heatDissipationFactor += 0.4;
  if (fanTier === 2) heatDissipationFactor += 1.0;
  if (exhaustTier === 1) heatDissipationFactor += 0.5;
  if (exhaustTier === 2) heatDissipationFactor += 1.2;

  // Lógica de cálculo de temperatura del mundo real
  const thermalLoadConstant = 0.8;
  let calculatedTemp = ambientTemp + (gpuCount * thermalLoadConstant) / heatDissipationFactor;

  // Comprobación de límites según tus especificaciones exactas
  if (gpuCount >= 25 && gpuCount <= 69) {
    if (fanTier < 1 || exhaustTier < 1) {
      status.thermalStatus = 'THERMAL_THROTTLING';
      efficiencyModifier *= 0.60; // Pierde el 40% del rendimiento debido al estrangulamiento térmico por calor
      calculatedTemp += 15;      // Pico de acumulación térmica
      alerts.push({
        type: 'WARN',
        code: 'THERMAL_THROTTLING',
        message: 'THERMAL THROTTLING ACTIVE: Intake Fan Tier 1 and Exhaust Tier 1 required to vent current dissipation profile.'
      });
    }
  } else if (gpuCount >= 70) {
    if (fanTier < 2 || exhaustTier < 2) {
      status.thermalStatus = 'CRITICAL_MELTDOWN';
      efficiencyModifier = 0.05; // Reduce el hashing al modo de supervivencia básico (5%) para evitar daños físicos
      calculatedTemp += 35;
      alerts.push({
        type: 'CRIT',
        code: 'THERMAL_MELTDOWN',
        message: 'CRITICAL THERMAL BREAKDOWN: High heat density core detected. Upgrade to Turbo Invector Tier 2 and High-Pressure Exhaust Tier 2.'
      });
    }
  }

  // Limita el cálculo de la temperatura interna de forma segura para las métricas del sistema
  const systemTemperatureCelsius = Math.min(105, calculatedTemp);

  // ==========================================
  // 5. CÁLCULO FINAL DEL CUMPLIMIENTO DE EFICIENCIA
  // ==========================================
  // Si ocurre una falla eléctrica crítica o un colapso térmico, el rendimiento se fuerza a cero
  if (status.powerStatus === 'SHUTDOWN_CRITICAL') {
    efficiencyModifier = 0.0;
  }

  const effectiveTflops = theoreticalMaxTflops * efficiencyModifier;
  const efficiencyPercentage = Math.round(efficiencyModifier * 100);

  if (alerts.length === 0) {
    alerts.push({
      type: 'OK',
      code: 'SYS_NOMINAL',
      message: 'All systems operational. Hashing array perfectly balanced.'
    });
  }

  return {
    effectiveTflops,
    efficiencyPercentage,
    totalPowerDrawWatts: status.powerStatus === 'SHUTDOWN_CRITICAL' ? 0 : totalPowerDrawWatts,
    systemTemperatureCelsius: Math.round(systemTemperatureCelsius),
    alerts,
    statusStructure: status
  };
}
