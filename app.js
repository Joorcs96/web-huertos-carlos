// ============================================================================
// APLICACIÓN WEB - CONTROL Y TELEMETRÍA HUERTO INTELIGENTE DE CARLOS
// ============================================================================

const STORAGE_KEY = 'huerto_carlos_estado_v1';

// Estado por defecto
const ESTADO_INICIAL = {
  modoHardware: 'demo', // 'demo' o 'esp32'
  esp32Url: 'http://192.168.1.150',
  esp32ApiKey: '',
  ultimoSync: new Date().toISOString(),
  deposito: {
    capacidadTotal: 1000, // Litros
    litrosActuales: 835,
    porcentaje: 84
  },
  ambiente: {
    temperatura: 23.4,
    humedadAire: 54,
    radiacionSolar: 'Óptima (6.1 UV)',
    previsionLluvia: '15% (Despejado)'
  },
  consumoHoyLitros: 42,
  zonas: [
    {
      id: 1,
      nombre: 'Bancal A: Tomates y Pimientos',
      plantas: 'Tomate pera, pimiento de padrón y cherry',
      humedadSuelo: 68,
      tempSuelo: 21.4,
      valvulaAbierta: false,
      tiempoRestanteSegundos: 0,
      caudalLitrosMinuto: 3.5,
      umbralMinimo: 50,
      riegoAuto: true
    },
    {
      id: 2,
      nombre: 'Bancal B: Hojas Verdes',
      plantas: 'Lechuga maravilla, espinaca y rúcula',
      humedadSuelo: 75,
      tempSuelo: 20.1,
      valvulaAbierta: false,
      tiempoRestanteSegundos: 0,
      caudalLitrosMinuto: 2.8,
      umbralMinimo: 60,
      riegoAuto: true
    },
    {
      id: 3,
      nombre: 'Sector C: Frutales y Cítricos',
      plantas: 'Limonero, naranjo dulce y olivo',
      humedadSuelo: 52,
      tempSuelo: 22.8,
      valvulaAbierta: false,
      tiempoRestanteSegundos: 0,
      caudalLitrosMinuto: 5.0,
      umbralMinimo: 40,
      riegoAuto: false
    },
    {
      id: 4,
      nombre: 'Sector D: Aromáticas',
      plantas: 'Romero, lavanda, albahaca y tomillo',
      humedadSuelo: 44,
      tempSuelo: 23.5,
      valvulaAbierta: false,
      tiempoRestanteSegundos: 0,
      caudalLitrosMinuto: 2.0,
      umbralMinimo: 30,
      riegoAuto: true
    }
  ],
  programas: [
    {
      id: 'p1',
      nombre: 'Riego Matinal Fresco',
      zonaId: 1,
      hora: '07:30',
      duracionMin: 10,
      dias: ['L', 'X', 'V', 'D'],
      activo: true
    },
    {
      id: 'p2',
      nombre: 'Hojas Verdes diario',
      zonaId: 2,
      hora: '08:00',
      duracionMin: 5,
      dias: ['L', 'M', 'X', 'J', 'V', 'S', 'D'],
      activo: true
    },
    {
      id: 'p3',
      nombre: 'Riego Vespertino Profundo Frutales',
      zonaId: 3,
      hora: '21:00',
      duracionMin: 20,
      dias: ['M', 'S'],
      activo: true
    }
  ],
  historicoRiegos: [
    { fecha: 'Hoy 08:00', zona: 'Bancal B: Hojas Verdes', duracion: '5 min', litros: 14, tipo: 'Automático' },
    { fecha: 'Ayer 21:00', zona: 'Sector C: Frutales', duracion: '20 min', litros: 100, tipo: 'Programado' },
    { fecha: 'Ayer 07:30', zona: 'Bancal A: Tomates', duracion: '10 min', litros: 35, tipo: 'Automático' }
  ]
};

// Cargar o inicializar estado
let estado = cargarEstado();

function cargarEstado() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Error al cargar estado de localStorage:', e);
  }
  return JSON.parse(JSON.stringify(ESTADO_INICIAL));
}

function guardarEstado() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(estado));
  } catch (e) {
    console.error('Error al guardar estado en localStorage:', e);
  }
}

// Inicialización de la aplicación
document.addEventListener('DOMContentLoaded', () => {
  registrarServiceWorker();
  iniciarNavegacion();
  renderizarTodo();
  iniciarTemporizadorSegundo();
  iniciarSimuladorSensor();
  inicializarGrafico();
  vincularEventosFormulario();
});

// Registrar Service Worker para PWA
function registrarServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch((err) => {
      console.log('SW registro opcional:', err);
    });
  }
}

// Navegación por pestañas
function iniciarNavegacion() {
  const tabs = document.querySelectorAll('.nav-btn');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      
      tab.classList.add('active');
      const targetId = tab.getAttribute('data-tab');
      const panel = document.getElementById(targetId);
      if (panel) panel.classList.add('active');

      if (targetId === 'tab-graficas' && window.chartHumedad) {
        setTimeout(() => window.chartHumedad.update(), 100);
      }
    });
  });
}

// Renderizado principal
function renderizarTodo() {
  renderizarHeader();
  renderizarMetricas();
  renderizarZonas();
  renderizarProgramas();
  renderizarHistorico();
  renderizarConfiguracion();
}

function renderizarHeader() {
  const modoBadge = document.getElementById('estado-modo');
  const dot = document.getElementById('estado-dot');
  if (modoBadge) {
    if (estado.modoHardware === 'demo') {
      modoBadge.innerText = 'Modo Demo (Simulación Activa)';
      if (dot) dot.className = 'pulse-dot';
    } else {
      modoBadge.innerText = 'ESP32 Hardware Enlazado';
      if (dot) dot.className = 'pulse-dot';
    }
  }
}

function renderizarMetricas() {
  const valDeposito = document.getElementById('val-deposito');
  const fillDeposito = document.getElementById('fill-deposito');
  const valTemp = document.getElementById('val-temp');
  const valHumedad = document.getElementById('val-humedad');
  const valConsumo = document.getElementById('val-consumo');

  if (valDeposito) {
    valDeposito.innerText = `${estado.deposito.litrosActuales} L (${estado.deposito.porcentaje}%)`;
  }
  if (fillDeposito) {
    fillDeposito.style.width = `${estado.deposito.porcentaje}%`;
  }
  if (valTemp) {
    valTemp.innerText = `${estado.ambiente.temperatura.toFixed(1)}°C`;
  }
  if (valHumedad) {
    valHumedad.innerText = `${estado.ambiente.humedadAire.toFixed(0)}%`;
  }
  if (valConsumo) {
    valConsumo.innerText = `${estado.consumoHoyLitros} L`;
  }
}

function renderizarZonas() {
  const container = document.getElementById('zonas-container');
  if (!container) return;

  container.innerHTML = '';
  estado.zonas.forEach(zona => {
    const card = document.createElement('div');
    card.className = `zone-card ${zona.valvulaAbierta ? 'watering' : ''}`;
    card.id = `zona-card-${zona.id}`;

    // Color según humedad
    let colorClase = '';
    if (zona.humedadSuelo < 35) colorClase = 'dry';
    else if (zona.humedadSuelo < 55) colorClase = 'warning';

    const tiempoRestanteStr = zona.valvulaAbierta 
      ? formatMinutosSegundos(zona.tiempoRestanteSegundos) 
      : 'Cerrada';

    card.innerHTML = `
      <div class="zone-card-header">
        <div class="zone-title">
          <h3>${zona.nombre}</h3>
          <p class="zone-plants">${zona.plantas}</p>
        </div>
        <div class="valve-badge ${zona.valvulaAbierta ? 'active' : ''}">
          <span class="valve-indicator">💧</span>
          <span>${zona.valvulaAbierta ? `Regando (${tiempoRestanteStr})` : 'Cerrada'}</span>
        </div>
      </div>
      <div class="zone-card-body">
        <div class="moisture-block">
          <div class="moisture-header">
            <span class="quick-water-label">Humedad del suelo</span>
            <span class="moisture-val">${zona.humedadSuelo}%</span>
          </div>
          <div class="moisture-bar-wrap">
            <div class="moisture-bar-fill ${colorClase}" style="width: ${zona.humedadSuelo}%"></div>
          </div>
        </div>

        <div class="zone-stats">
          <div class="zone-stat-item">
            <span>Temp. Tierra</span>
            <strong>${zona.tempSuelo.toFixed(1)}°C</strong>
          </div>
          <div class="zone-stat-item">
            <span>Caudal Goteo</span>
            <strong>${zona.caudalLitrosMinuto} L/min</strong>
          </div>
        </div>

        <div class="irrigation-actions">
          <span class="quick-water-label">Riego manual inmediato:</span>
          <div class="quick-buttons">
            <button class="btn-water" onclick="activarRiegoZona(${zona.id}, 2)">2 min</button>
            <button class="btn-water" onclick="activarRiegoZona(${zona.id}, 5)">5 min</button>
            <button class="btn-water" onclick="activarRiegoZona(${zona.id}, 10)">10 min</button>
            <button class="btn-stop" onclick="detenerRiegoZona(${zona.id})" ${!zona.valvulaAbierta ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : ''}>Detener</button>
          </div>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

function renderizarProgramas() {
  const container = document.getElementById('programas-container');
  if (!container) return;

  container.innerHTML = '';
  estado.programas.forEach(p => {
    const zona = estado.zonas.find(z => z.id === p.zonaId);
    const item = document.createElement('div');
    item.className = 'schedule-item';
    item.innerHTML = `
      <div class="schedule-info">
        <strong>${p.nombre}</strong>
        <span>Zona: ${zona ? zona.nombre : 'General'} | Hora: ${p.hora} (${p.duracionMin} min)</span>
        <div style="margin-top:4px; font-size:0.75rem; color:var(--primary-light);">Días: ${p.dias.join(', ')}</div>
      </div>
      <div>
        <label class="switch">
          <input type="checkbox" ${p.activo ? 'checked' : ''} onchange="togglePrograma('${p.id}', this.checked)">
          <span class="slider"></span>
        </label>
      </div>
    `;
    container.appendChild(item);
  });
}

function renderizarHistorico() {
  const tbody = document.getElementById('historico-tbody');
  if (!tbody) return;

  tbody.innerHTML = '';
  estado.historicoRiegos.forEach(h => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${h.fecha}</td>
      <td>${h.zona}</td>
      <td>${h.duracion}</td>
      <td><strong>${h.litros} L</strong></td>
      <td><span style="color:var(--primary-light);">${h.tipo}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

function renderizarConfiguracion() {
  const selModo = document.getElementById('cfg-modo');
  const inputUrl = document.getElementById('cfg-url');
  const inputKey = document.getElementById('cfg-key');

  if (selModo) selModo.value = estado.modoHardware;
  if (inputUrl) inputUrl.value = estado.esp32Url;
  if (inputKey) inputKey.value = estado.esp32ApiKey || '';
}

// Acciones de Riego
window.activarRiegoZona = function(zonaId, minutos) {
  const zona = estado.zonas.find(z => z.id === zonaId);
  if (!zona) return;

  zona.valvulaAbierta = true;
  zona.tiempoRestanteSegundos = minutos * 60;
  
  mostrarNotificacion(`Riego iniciado en ${zona.nombre} (${minutos} min)`);
  guardarEstado();
  renderizarZonas();

  if (estado.modoHardware === 'esp32') {
    enviarComandoESP32(zonaId, true, minutos);
  }
};

window.detenerRiegoZona = function(zonaId) {
  const zona = estado.zonas.find(z => z.id === zonaId);
  if (!zona) return;

  zona.valvulaAbierta = false;
  zona.tiempoRestanteSegundos = 0;
  
  mostrarNotificacion(`Riego detenido en ${zona.nombre}`);
  guardarEstado();
  renderizarZonas();

  if (estado.modoHardware === 'esp32') {
    enviarComandoESP32(zonaId, false, 0);
  }
};

window.paradaEmergencia = function() {
  let contador = 0;
  estado.zonas.forEach(z => {
    if (z.valvulaAbierta) {
      z.valvulaAbierta = false;
      z.tiempoRestanteSegundos = 0;
      contador++;
      if (estado.modoHardware === 'esp32') {
        enviarComandoESP32(z.id, false, 0);
      }
    }
  });

  guardarEstado();
  renderizarZonas();
  mostrarNotificacion(`PARADA DE EMERGENCIA: Se han cerrado todas las electroválvulas`);
};

window.togglePrograma = function(programaId, activo) {
  const prog = estado.programas.find(p => p.id === programaId);
  if (prog) {
    prog.activo = activo;
    guardarEstado();
    mostrarNotificacion(`Programa "${prog.nombre}" ${activo ? 'activado' : 'desactivado'}`);
  }
};

// Temporizador de un segundo para cuenta atrás de riego y consumo de agua
function iniciarTemporizadorSegundo() {
  setInterval(() => {
    let cambio = false;

    estado.zonas.forEach(zona => {
      if (zona.valvulaAbierta) {
        if (zona.tiempoRestanteSegundos > 0) {
          zona.tiempoRestanteSegundos--;
          cambio = true;

          // Consumo de agua progresivo y aumento de humedad
          const litrosPorSegundo = zona.caudalLitrosMinuto / 60;
          if (estado.deposito.litrosActuales > litrosPorSegundo) {
            estado.deposito.litrosActuales -= litrosPorSegundo;
            estado.deposito.porcentaje = Math.round((estado.deposito.litrosActuales / estado.deposito.capacidadTotal) * 100);
            estado.consumoHoyLitros += +(litrosPorSegundo.toFixed(2));
          }

          // Aumentar ligeramente humedad de suelo
          if (zona.humedadSuelo < 95 && Math.random() < 0.2) {
            zona.humedadSuelo = Math.min(100, zona.humedadSuelo + 1);
          }

          if (zona.tiempoRestanteSegundos === 0) {
            zona.valvulaAbierta = false;
            // Registrar en histórico
            const duracionMin = Math.round((zona.caudalLitrosMinuto * 2) > 0 ? 5 : 2); // Aprox
            estado.historicoRiegos.unshift({
              fecha: 'Ahora mismo',
              zona: zona.nombre,
              duracion: 'Completado',
              litros: Math.round(zona.caudalLitrosMinuto * 5),
              tipo: 'Manual'
            });
            if (estado.historicoRiegos.length > 20) estado.historicoRiegos.pop();
            mostrarNotificacion(`Riego finalizado con éxito en ${zona.nombre}`);
          }
        }
      }
    });

    if (cambio) {
      renderizarHeader();
      renderizarMetricas();
      renderizarZonas();
      guardarEstado();
    }
  }, 1000);
}

// Simulador en segundo plano para variaciones naturales de sensores
function iniciarSimuladorSensor() {
  setInterval(() => {
    if (estado.modoHardware === 'demo') {
      // Fluctuaciones suaves de temperatura y humedad ambiental
      const deltaTemp = (Math.random() - 0.5) * 0.2;
      estado.ambiente.temperatura = +(Math.max(15, Math.min(38, estado.ambiente.temperatura + deltaTemp)).toFixed(1));

      const deltaHum = (Math.random() - 0.5) * 0.5;
      estado.ambiente.humedadAire = +(Math.max(30, Math.min(95, estado.ambiente.humedadAire + deltaHum)).toFixed(0));

      // Las zonas sin riego se van secando muy lentamente
      estado.zonas.forEach(z => {
        if (!z.valvulaAbierta && Math.random() < 0.1 && z.humedadSuelo > 20) {
          z.humedadSuelo -= 1;
        }
      });

      renderizarMetricas();
      renderizarZonas();
      guardarEstado();
    } else {
      // Si estamos en modo hardware real, consultar telemetría del ESP32
      sincronizarConESP32();
    }
  }, 10000);
}

// Comunicación HTTP REST con el hardware ESP32
async function enviarComandoESP32(zonaId, activar, minutos) {
  if (!estado.esp32Url) return;
  try {
    const res = await fetch(`${estado.esp32Url}/api/riego`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': estado.esp32ApiKey || ''
      },
      body: JSON.stringify({ zona: zonaId, activar: activar, minutos: minutos })
    });
    if (res.ok) {
      console.log(`Comando enviado a ESP32 zona ${zonaId}`);
    }
  } catch (err) {
    console.warn('ESP32 offline o inalcanzable:', err);
    mostrarNotificacion(`Aviso: No se pudo contactar con ESP32 (${estado.esp32Url})`);
  }
}

async function sincronizarConESP32() {
  if (!estado.esp32Url) return;
  try {
    const res = await fetch(`${estado.esp32Url}/api/estado`, {
      headers: { 'X-API-Key': estado.esp32ApiKey || '' }
    });
    if (res.ok) {
      const data = await res.json();
      if (data.depositoPorcentaje !== undefined) {
        estado.deposito.porcentaje = data.depositoPorcentaje;
        estado.deposito.litrosActuales = data.depositoLitros || Math.round(data.depositoPorcentaje * 10);
      }
      if (data.temperaturaAmbiente !== undefined) {
        estado.ambiente.temperatura = data.temperaturaAmbiente;
      }
      if (data.humedadAmbiente !== undefined) {
        estado.ambiente.humedadAire = data.humedadAmbiente;
      }
      if (data.zonas && Array.isArray(data.zonas)) {
        data.zonas.forEach(z => {
          const zonaLocal = estado.zonas.find(zl => zl.id === z.id);
          if (zonaLocal) {
            zonaLocal.humedadSuelo = z.humedad;
            zonaLocal.valvulaAbierta = z.valvulaAbierta;
          }
        });
      }
      renderizarTodo();
    }
  } catch (e) {
    // Silencioso en fondo
  }
}

// Formulario de configuración
function vincularEventosFormulario() {
  const form = document.getElementById('form-config-hardware');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      estado.modoHardware = document.getElementById('cfg-modo').value;
      estado.esp32Url = document.getElementById('cfg-url').value.trim();
      estado.esp32ApiKey = document.getElementById('cfg-key').value.trim();
      guardarEstado();
      renderizarHeader();
      mostrarNotificacion('Configuración de hardware guardada correctamente');
    });
  }

  const btnTest = document.getElementById('btn-test-esp32');
  if (btnTest) {
    btnTest.addEventListener('click', async () => {
      const url = document.getElementById('cfg-url').value.trim();
      mostrarNotificacion(`Probando conexión con ${url}...`);
      try {
        const res = await fetch(`${url}/api/estado`, { signal: AbortSignal.timeout(3000) });
        if (res.ok) {
          mostrarNotificacion('¡Conexión exitosa con el ESP32!');
        } else {
          mostrarNotificacion(`El ESP32 respondió con código HTTP ${res.status}`);
        }
      } catch (err) {
        mostrarNotificacion('No se pudo conectar con el ESP32 (verificar IP y WiFi)');
      }
    });
  }
}

// Gráfico de humedad con Chart.js
function inicializarGrafico() {
  const ctx = document.getElementById('chartHumedadCanvas');
  if (!ctx || typeof Chart === 'undefined') return;

  const horas = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', 'Ahora'];
  
  window.chartHumedad = new Chart(ctx, {
    type: 'line',
    data: {
      labels: horas,
      datasets: [
        {
          label: 'Tomates y Pimientos',
          data: [62, 59, 78, 72, 69, 66, estado.zonas[0].humedadSuelo],
          borderColor: '#22c55e',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          tension: 0.3,
          fill: true
        },
        {
          label: 'Hojas Verdes',
          data: [70, 68, 85, 80, 76, 73, estado.zonas[1].humedadSuelo],
          borderColor: '#38bdf8',
          backgroundColor: 'rgba(56, 189, 248, 0.05)',
          tension: 0.3
        },
        {
          label: 'Frutales',
          data: [55, 54, 52, 50, 48, 46, estado.zonas[2].humedadSuelo],
          borderColor: '#f59e0b',
          tension: 0.3
        },
        {
          label: 'Aromáticas',
          data: [45, 44, 43, 42, 41, 40, estado.zonas[3].humedadSuelo],
          borderColor: '#a855f7',
          tension: 0.3
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          min: 0,
          max: 100,
          ticks: { color: '#94a3b8', callback: (val) => `${val}%` },
          grid: { color: '#1c3527' }
        },
        x: {
          ticks: { color: '#94a3b8' },
          grid: { color: '#1c3527' }
        }
      },
      plugins: {
        legend: {
          labels: { color: '#f8fafc', font: { size: 12 } }
        }
      }
    }
  });
}

// Utilidades
function formatMinutosSegundos(totalSegundos) {
  const m = Math.floor(totalSegundos / 60);
  const s = totalSegundos % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

function mostrarNotificacion(mensaje) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<span>🌱</span> <span>${mensaje}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.4s ease';
    setTimeout(() => toast.remove(), 400);
  }, 3500);
}
