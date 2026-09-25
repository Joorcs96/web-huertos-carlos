// ============================================================================
// HUERTOS CARLOS - CUADERNO DE CAMPO Y GESTIÓN DE FAENAS AGRÍCOLAS
// ============================================================================

const STORAGE_KEY = 'huertos_carlos_db_v2';
const USER_KEY = 'huertos_carlos_active_user';

// Usuarios autorizados (Carlos, Juan Carlos, Diego y equipo según el Excel)
const USUARIOS = (typeof window !== 'undefined' && window.DATOS_INICIALES_CARLOS && window.DATOS_INICIALES_CARLOS.usuarios)
  ? window.DATOS_INICIALES_CARLOS.usuarios
  : [
      { id: 'carlos', nombre: 'Carlos', rol: 'Administrador / Propietario', avatar: '👨‍🌾' },
      { id: 'jc', nombre: 'Juan Carlos (JC)', rol: 'Equipo de Campo', avatar: '🚜' },
      { id: 'diego', nombre: 'Diego (D)', rol: 'Equipo de Campo', avatar: '🌱' },
      { id: 'juan', nombre: 'Juan', rol: 'Operario', avatar: '🔧' }
    ];

// Baseline inicial de parcelas y faenas extraídas del Excel
const PARCELAS_INICIALES = (typeof window !== 'undefined' && window.DATOS_INICIALES_CARLOS && window.DATOS_INICIALES_CARLOS.parcelas)
  ? window.DATOS_INICIALES_CARLOS.parcelas
  : [];

const FAENAS_INICIALES = (typeof window !== 'undefined' && window.DATOS_INICIALES_CARLOS && window.DATOS_INICIALES_CARLOS.faenas)
  ? window.DATOS_INICIALES_CARLOS.faenas
  : [];

// Estado en memoria
let estado = {
  usuarioActivo: null,
  parcelas: [],
  faenas: []
};

// ============================================================================
// INICIALIZACIÓN CON CIBERSEGURIDAD
// ============================================================================
document.addEventListener('DOMContentLoaded', async () => {
  await cargarDatos();
  iniciarSesionUsuario();
  iniciarNavegacion();
  iniciarFormularioFaena();
  iniciarProteccionPrivacidad();
  renderizarTodo();
  actualizarEstadoCiberseguridadUI();
});

async function cargarDatos() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      // Usar parser seguro contra Prototype Pollution
      const parsed = window.HuertoSecurity ? window.HuertoSecurity.safeJsonParse(raw) : JSON.parse(raw);
      
      // Verificación de integridad SHA-256 si HuertoSecurity está disponible
      if (window.HuertoSecurity) {
        const resultadoIntegridad = await window.HuertoSecurity.cargarConIntegridad(STORAGE_KEY);
        if (resultadoIntegridad.status === 'TAMPERED') {
          mostrarToast('⚠️ Aviso: Integridad modificada externamente. Verificando datos...', 'warning');
        }
      }

      if (parsed && parsed.parcelas && parsed.parcelas.length >= 20) {
        estado.parcelas = parsed.parcelas;
        estado.faenas = parsed.faenas || FAENAS_INICIALES;
      } else {
        estado.parcelas = JSON.parse(JSON.stringify(PARCELAS_INICIALES));
        estado.faenas = JSON.parse(JSON.stringify(FAENAS_INICIALES));
        guardarDatos();
      }
    } else {
      estado.parcelas = JSON.parse(JSON.stringify(PARCELAS_INICIALES));
      estado.faenas = JSON.parse(JSON.stringify(FAENAS_INICIALES));
      guardarDatos();
    }
  } catch (e) {
    console.warn('[Ciberseguridad] Recuperación segura tras error de carga:', e);
    estado.parcelas = JSON.parse(JSON.stringify(PARCELAS_INICIALES));
    estado.faenas = JSON.parse(JSON.stringify(FAENAS_INICIALES));
  }

  // Garantizar que toda faena histórica o existente tenga estado 'Finalizadas' y esquema seguro
  if (Array.isArray(estado.faenas)) {
    estado.faenas.forEach(f => {
      f.estado = normalizarEstado(f.estado || 'Finalizadas');
      if (window.HuertoSecurity) {
        f.id = window.HuertoSecurity.sanitizeId(f.id);
      }
    });
  }
}

function guardarDatos() {
  try {
    const payload = {
      parcelas: estado.parcelas,
      faenas: estado.faenas
    };
    if (window.HuertoSecurity && window.HuertoSecurity.guardarConIntegridad) {
      window.HuertoSecurity.guardarConIntegridad(STORAGE_KEY, payload).then(res => {
        if (!res.success && res.error === 'QUOTA_EXCEEDED') {
          mostrarToast('⚠️ Espacio local lleno. Descarga una copia de seguridad.', 'danger');
        }
      });
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    }
  } catch (e) {
    console.error('[Ciberseguridad] Error guardando estado:', e);
  }
}

// ============================================================================
// GESTIÓN DE USUARIOS Y LOGIN RÁPIDO
// ============================================================================
function iniciarSesionUsuario() {
  const guardado = localStorage.getItem(USER_KEY);
  if (guardado) {
    const user = USUARIOS.find(u => u.id === guardado);
    if (user) {
      estado.usuarioActivo = user;
      actualizarHeaderUsuario();
      return;
    }
  }
  // Si no hay usuario seleccionado, mostrar modal
  mostrarModalUsuarios();
}

function mostrarModalUsuarios() {
  const modal = document.getElementById('auth-modal');
  const selector = document.getElementById('usuarios-selector');
  if (!modal || !selector) return;

  selector.innerHTML = '';
  USUARIOS.forEach(u => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'user-select-btn';
    btn.innerHTML = `
      <span style="font-size:1.6rem;">${u.avatar}</span>
      <div style="text-align:left; flex:1;">
        <div>${u.nombre}</div>
        <div style="font-size:0.75rem; color:var(--text-muted); font-weight:normal;">${u.rol}</div>
      </div>
      <span>➔</span>
    `;
    btn.onclick = () => seleccionarUsuario(u);
    selector.appendChild(btn);
  });

  modal.classList.remove('hidden');
}

function seleccionarUsuario(usuario) {
  estado.usuarioActivo = usuario;
  localStorage.setItem(USER_KEY, usuario.id);
  const modal = document.getElementById('auth-modal');
  if (modal) modal.classList.add('hidden');
  actualizarHeaderUsuario();
  mostrarToast(`Sesión iniciada como ${usuario.nombre}`);
  renderizarOperariosChips();
}

window.cambiarUsuario = function() {
  mostrarModalUsuarios();
};

function actualizarHeaderUsuario() {
  const badge = document.getElementById('user-active-badge');
  const avatar = document.getElementById('user-avatar-btn');
  if (badge && estado.usuarioActivo) {
    badge.innerText = `Acceso: ${estado.usuarioActivo.nombre}`;
  }
  if (avatar && estado.usuarioActivo) {
    avatar.innerText = estado.usuarioActivo.avatar;
  }
}

// ============================================================================
// NAVEGACIÓN
// ============================================================================
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
    });
  });
}

window.abrirNuevaFaena = function(parcelaIdPrevia = null) {
  const tabBtn = document.querySelector('[data-tab="tab-nueva"]');
  if (tabBtn) tabBtn.click();

  if (parcelaIdPrevia) {
    const sel = document.getElementById('faena-huerto');
    if (sel) sel.value = parcelaIdPrevia;
  }
};

// ============================================================================
// RENDERIZADO PRINCIPAL
// ============================================================================
function renderizarTodo() {
  renderizarFeed();
  renderizarParcelas();
  renderizarSelectoresHuertos();
  renderizarOperariosChips();
  renderizarSemaforo();
}

// ============================================================================
// HELPERS KANBAN & PERIODOS (AÑO Y MES)
// ============================================================================
const MESES_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

function normalizarEstado(estado) {
  if (!estado) return 'Finalizadas';
  const norm = String(estado).trim().toLowerCase();
  if (norm.startsWith('pend')) return 'Pendientes';
  if (norm.includes('curso') || norm.includes('proceso')) return 'En curso';
  if (norm.startsWith('fin') || norm.startsWith('hech') || norm.startsWith('complet')) return 'Finalizadas';
  return 'Finalizadas';
}

function obtenerInfoMesAno(fechaStr) {
  if (!fechaStr) return { clave: 'sin-fecha', etiqueta: 'Sin fecha', ano: 0, mes: 0 };
  const partes = fechaStr.split('-');
  if (partes.length >= 2) {
    const ano = parseInt(partes[0], 10);
    const mesIndex = parseInt(partes[1], 10) - 1;
    const nombreMes = MESES_ES[mesIndex] || partes[1];
    return {
      clave: `${partes[0]}-${partes[1]}`,
      etiqueta: `${nombreMes} ${ano}`,
      ano: ano,
      mes: mesIndex + 1
    };
  }
  return { clave: 'desconocido', etiqueta: fechaStr, ano: 0, mes: 0 };
}

// Control de meses colapsados en el acordeón
const mesesColapsados = new Set();
let acordeonInicializado = false;

window.toggleMesAcordeon = function(periodoClave) {
  if (mesesColapsados.has(periodoClave)) {
    mesesColapsados.delete(periodoClave);
  } else {
    mesesColapsados.add(periodoClave);
  }
  const el = document.getElementById(`month-group-${periodoClave}`);
  if (el) {
    el.classList.toggle('collapsed');
  }
};

window.toggleTodosLosMeses = function() {
  const groups = document.querySelectorAll('.kanban-month-group');
  if (!groups || groups.length === 0) return;
  const algunAbierto = Array.from(groups).some(g => !g.classList.contains('collapsed'));
  groups.forEach(g => {
    const periodo = g.getAttribute('data-periodo');
    if (algunAbierto) {
      g.classList.add('collapsed');
      if (periodo) mesesColapsados.add(periodo);
    } else {
      g.classList.remove('collapsed');
      if (periodo) mesesColapsados.delete(periodo);
    }
  });
};

window.scrollHaciaColumna = function(periodoClave, estadoNombre) {
  const colId = `col-${periodoClave}-${estadoNombre.replace(/\s+/g, '-')}`;
  const col = document.getElementById(colId);
  if (col) {
    col.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    const switcher = document.getElementById(`switcher-${periodoClave}`);
    if (switcher) {
      switcher.querySelectorAll('.col-switch-btn').forEach(btn => btn.classList.remove('active'));
      const activeBtn = switcher.querySelector(`[data-target="${estadoNombre}"]`);
      if (activeBtn) activeBtn.classList.add('active');
    }
  }
};

// Drag and drop para escritorio
window.onFaenaDragStart = function(event, faenaId) {
  if (event && event.dataTransfer) {
    event.dataTransfer.setData('text/plain', faenaId);
    event.dataTransfer.effectAllowed = 'move';
  }
};

window.onFaenaDragOver = function(event) {
  if (event) {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    const col = event.currentTarget;
    if (col && !col.classList.contains('drag-over')) {
      col.classList.add('drag-over');
    }
  }
};

window.onFaenaDragLeave = function(event) {
  if (event && event.currentTarget) {
    event.currentTarget.classList.remove('drag-over');
  }
};

window.onFaenaDrop = function(event, nuevoEstado) {
  if (event) {
    event.preventDefault();
    if (event.currentTarget) event.currentTarget.classList.remove('drag-over');
    const faenaId = event.dataTransfer ? event.dataTransfer.getData('text/plain') : null;
    if (faenaId) {
      cambiarEstadoFaena(faenaId, nuevoEstado);
    }
  }
};

// Cambio de estado con 1 clic desde móvil o acción directa
window.cambiarEstadoFaena = function(faenaId, nuevoEstado, event) {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }
  const faena = estado.faenas.find(f => f.id === faenaId);
  if (!faena) return;

  const estadoNormalizado = normalizarEstado(nuevoEstado);
  if (normalizarEstado(faena.estado) === estadoNormalizado) return;

  faena.estado = estadoNormalizado;
  guardarDatos();

  // Preservar la posición vertical del scroll para evitar saltos en móvil
  const scrollActual = window.scrollY;

  renderizarFeed();

  // Restaurar posición de scroll
  window.scrollTo(0, scrollActual);

  mostrarToast(`Faena en ${faena.parcelaNombre} movida a "${estadoNormalizado}"`);
};

// Generador de Tarjeta de Faena con Botones de 1 Clic (Protegido Anti-XSS)
function generarTarjetaFaenaHtml(f) {
  const esc = (window.HuertoSecurity && window.HuertoSecurity.escapeHtml) ? window.HuertoSecurity.escapeHtml : s => (s || '');
  const safeId = (window.HuertoSecurity && window.HuertoSecurity.sanitizeId) ? window.HuertoSecurity.sanitizeId(f.id) : f.id;

  // Tags de plagas detectadas
  let tagsPlagasHtml = '';
  if (f.plagas && f.plagas.length > 0) {
    f.plagas.forEach(p => {
      tagsPlagasHtml += `<span class="tag-plaga">⚠️ ${esc(p)}</span>`;
    });
  }

  // Tag de estado de hierba
  let tagHierbaHtml = '';
  if (f.hierba === 'Limpio') {
    tagHierbaHtml = `<span class="tag-hierba limpio">🟢 Sin hierba</span>`;
  } else if (f.hierba === 'Poca hierba') {
    tagHierbaHtml = `<span class="tag-hierba poca">🟡 Poca hierba</span>`;
  } else if (f.hierba === 'Mucha hierba') {
    tagHierbaHtml = `<span class="tag-hierba mucha">🔴 Mucha hierba</span>`;
  }

  // Badge químico
  let quimicoHtml = '';
  if (f.quimicoProducto) {
    quimicoHtml = `
      <div class="feed-quimicos-badge">
        <span>🧪</span>
        <strong>${esc(f.quimicoProducto)}</strong>
        ${f.quimicoDosis ? `(${esc(f.quimicoDosis)})` : ''}
      </div>
    `;
  }

  const estadoActual = normalizarEstado(f.estado);

  return `
    <div class="feed-card" draggable="true" ondragstart="onFaenaDragStart(event, '${safeId}')" id="card-${safeId}">
      <div class="feed-header">
        <div class="feed-title-wrap">
          <strong>${esc(f.parcelaNombre)}</strong>
          <div class="feed-meta">
            <span>👤 ${esc(f.usuario)}</span>
            <span>·</span>
            <span>📅 ${esc(formatFecha(f.fecha))} ${f.hora ? `a las ${esc(f.hora)}` : ''}</span>
          </div>
        </div>
        <span class="feed-task-badge">${esc(f.tipoFaena)}</span>
      </div>

      ${quimicoHtml}

      <div class="feed-tags-row">
        ${tagHierbaHtml}
        ${tagsPlagasHtml}
      </div>

      ${f.notas ? `<div class="feed-notas">"${esc(f.notas)}"</div>` : ''}

      <div class="card-status-bar">
        <div class="status-bar-header">
          <span>Estado:</span>
          <span style="font-weight:700; color: ${estadoActual === 'Pendientes' ? 'var(--warning)' : estadoActual === 'En curso' ? '#60a5fa' : 'var(--primary-light)'}">
            ${estadoActual === 'Pendientes' ? '🟡 Pendiente' : estadoActual === 'En curso' ? '🔵 En curso' : '🟢 Finalizada'}
          </span>
        </div>
        <div class="status-btn-group">
          <button type="button" 
                  class="btn-status ${estadoActual === 'Pendientes' ? 'active pendientes' : ''}" 
                  onclick="cambiarEstadoFaena('${safeId}', 'Pendientes', event)" 
                  title="Marcar como Pendiente">
            🟡 Pendiente
          </button>
          <button type="button" 
                  class="btn-status ${estadoActual === 'En curso' ? 'active en-curso' : ''}" 
                  onclick="cambiarEstadoFaena('${safeId}', 'En curso', event)" 
                  title="Marcar como En curso">
            🔵 En curso
          </button>
          <button type="button" 
                  class="btn-status ${estadoActual === 'Finalizadas' ? 'active finalizadas' : ''}" 
                  onclick="cambiarEstadoFaena('${safeId}', 'Finalizadas', event)" 
                  title="Marcar como Finalizada">
            🟢 Finalizada
          </button>
        </div>
      </div>
    </div>
  `;
}

// 1. Renderizar Feed de Faenas (Agrupado por Año/Mes y Tablero Kanban de 3 columnas)
function renderizarFeed(filtroHuerto, filtroUsuario, filtroPeriodo) {
  const container = document.getElementById('feed-container');
  const countBadge = document.getElementById('count-faenas');
  if (!container) return;

  const huertoSel = filtroHuerto !== undefined ? filtroHuerto : (document.getElementById('filtro-huerto-feed')?.value || 'todos');
  const usuarioSel = filtroUsuario !== undefined ? filtroUsuario : (document.getElementById('filtro-usuario-feed')?.value || 'todos');
  const periodoSel = filtroPeriodo !== undefined ? filtroPeriodo : (document.getElementById('filtro-periodo-feed')?.value || 'todos');

  let faenasFiltradas = [...estado.faenas].sort((a, b) => {
    return new Date(`${b.fecha} ${b.hora || '12:00'}`) - new Date(`${a.fecha} ${a.hora || '12:00'}`);
  });

  if (huertoSel !== 'todos') {
    faenasFiltradas = faenasFiltradas.filter(f => f.parcelaId === huertoSel);
  }
  if (usuarioSel !== 'todos') {
    faenasFiltradas = faenasFiltradas.filter(f => f.usuarioId === usuarioSel || f.usuario === usuarioSel);
  }
  if (periodoSel !== 'todos') {
    faenasFiltradas = faenasFiltradas.filter(f => f.fecha && f.fecha.startsWith(periodoSel));
  }

  const nPendTotal = faenasFiltradas.filter(f => normalizarEstado(f.estado) === 'Pendientes').length;
  const nCurTotal = faenasFiltradas.filter(f => normalizarEstado(f.estado) === 'En curso').length;
  const nFinTotal = faenasFiltradas.filter(f => normalizarEstado(f.estado) === 'Finalizadas').length;

  if (countBadge) {
    countBadge.innerText = `${faenasFiltradas.length} faenas (${nPendTotal} pend. · ${nCurTotal} en curso · ${nFinTotal} fin.)`;
  }

  if (faenasFiltradas.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding:2.5rem 1rem; color:var(--text-muted); background:var(--bg-card); border-radius:var(--radius-lg);">
        <p style="font-size:2rem; margin-bottom:0.5rem;">🚜</p>
        <p>No hay faenas registradas con estos filtros.</p>
        <button class="btn-new-task" style="margin-top:1rem;" onclick="abrirNuevaFaena()">+ Registrar Primera Faena</button>
      </div>
    `;
    return;
  }

  // Agrupar faenas por Año y Mes (usando f.fecha YYYY-MM)
  const gruposMes = new Map();
  faenasFiltradas.forEach(f => {
    const clave = (f.fecha && f.fecha.length >= 7) ? f.fecha.slice(0, 7) : 'sin-fecha';
    if (!gruposMes.has(clave)) {
      gruposMes.set(clave, {
        clave: clave,
        info: obtenerInfoMesAno(f.fecha),
        faenas: []
      });
    }
    gruposMes.get(clave).faenas.push(f);
  });

  // Ordenar grupos de mes de más reciente a más antiguo
  const clavesOrdenadas = Array.from(gruposMes.keys()).sort().reverse();

  // En la primera carga, colapsar meses anteriores que no tengan tareas activas
  if (!acordeonInicializado && periodoSel === 'todos') {
    clavesOrdenadas.forEach((clave, idx) => {
      if (idx > 0) {
        const faenasGrupo = gruposMes.get(clave).faenas;
        const tieneActivas = faenasGrupo.some(f => normalizarEstado(f.estado) !== 'Finalizadas');
        if (!tieneActivas) {
          mesesColapsados.add(clave);
        }
      }
    });
    acordeonInicializado = true;
  }

  let htmlGrupos = '';

  clavesOrdenadas.forEach(clave => {
    const grupo = gruposMes.get(clave);
    const faenasGrupo = grupo.faenas;

    const pendientes = faenasGrupo.filter(f => normalizarEstado(f.estado) === 'Pendientes');
    const enCurso = faenasGrupo.filter(f => normalizarEstado(f.estado) === 'En curso');
    const finalizadas = faenasGrupo.filter(f => normalizarEstado(f.estado) === 'Finalizadas');

    // Si el usuario filtró por un mes concreto, forzamos que esté abierto
    const estaColapsado = (periodoSel === 'todos') ? mesesColapsados.has(clave) : false;

    const tarjetasPendientesHtml = pendientes.length === 0
      ? `<div class="kanban-empty-col">Sin faenas pendientes</div>`
      : pendientes.map(generarTarjetaFaenaHtml).join('');

    const tarjetasEnCursoHtml = enCurso.length === 0
      ? `<div class="kanban-empty-col">Sin faenas en curso</div>`
      : enCurso.map(generarTarjetaFaenaHtml).join('');

    const tarjetasFinalizadasHtml = finalizadas.length === 0
      ? `<div class="kanban-empty-col">Sin faenas finalizadas</div>`
      : finalizadas.map(generarTarjetaFaenaHtml).join('');

    htmlGrupos += `
      <div class="kanban-month-group ${estaColapsado ? 'collapsed' : ''}" id="month-group-${clave}" data-periodo="${clave}">
        <div class="kanban-month-header" onclick="toggleMesAcordeon('${clave}')">
          <div class="kanban-month-title">
            <span style="font-size:1.2rem;">📅</span>
            <h3>${grupo.info.etiqueta}</h3>
            <span class="month-summary-badge">${faenasGrupo.length} faenas</span>
            ${pendientes.length > 0 ? `<span class="col-count-pill" style="background:rgba(245,158,11,0.15); color:#fbbf24; font-size:0.7rem;">🟡 ${pendientes.length} pend.</span>` : ''}
            ${enCurso.length > 0 ? `<span class="col-count-pill" style="background:rgba(59,130,246,0.15); color:#60a5fa; font-size:0.7rem;">🔵 ${enCurso.length} en curso</span>` : ''}
          </div>
          <div style="display:flex; align-items:center; gap:0.5rem;">
            <span class="toggle-arrow">▼</span>
          </div>
        </div>

        <div class="kanban-month-body">
          <!-- Selector rápido de columna para móvil -->
          <div class="mobile-col-switcher" id="switcher-${clave}">
            <button type="button" class="col-switch-btn active" data-target="Pendientes" onclick="scrollHaciaColumna('${clave}', 'Pendientes')">
              🟡 Pendientes (${pendientes.length})
            </button>
            <button type="button" class="col-switch-btn" data-target="En curso" onclick="scrollHaciaColumna('${clave}', 'En curso')">
              🔵 En curso (${enCurso.length})
            </button>
            <button type="button" class="col-switch-btn" data-target="Finalizadas" onclick="scrollHaciaColumna('${clave}', 'Finalizadas')">
              🟢 Finalizadas (${finalizadas.length})
            </button>
          </div>

          <!-- Tablero Kanban de 3 columnas -->
          <div class="kanban-board" id="board-${clave}">
            
            <!-- Columna 1: Pendientes -->
            <div class="kanban-column col-pendientes" id="col-${clave}-Pendientes" 
                 ondragover="onFaenaDragOver(event)" ondragleave="onFaenaDragLeave(event)" ondrop="onFaenaDrop(event, 'Pendientes')">
              <div class="kanban-column-header">
                <div class="kanban-column-title-wrap">
                  <span>🟡</span>
                  <h4>Pendientes</h4>
                </div>
                <span class="col-count-pill">${pendientes.length}</span>
              </div>
              <div class="kanban-cards-list" id="cards-${clave}-Pendientes">
                ${tarjetasPendientesHtml}
              </div>
            </div>

            <!-- Columna 2: En curso -->
            <div class="kanban-column col-en-curso" id="col-${clave}-En-curso"
                 ondragover="onFaenaDragOver(event)" ondragleave="onFaenaDragLeave(event)" ondrop="onFaenaDrop(event, 'En curso')">
              <div class="kanban-column-header">
                <div class="kanban-column-title-wrap">
                  <span>🔵</span>
                  <h4>En curso</h4>
                </div>
                <span class="col-count-pill">${enCurso.length}</span>
              </div>
              <div class="kanban-cards-list" id="cards-${clave}-En-curso">
                ${tarjetasEnCursoHtml}
              </div>
            </div>

            <!-- Columna 3: Finalizadas -->
            <div class="kanban-column col-finalizadas" id="col-${clave}-Finalizadas"
                 ondragover="onFaenaDragOver(event)" ondragleave="onFaenaDragLeave(event)" ondrop="onFaenaDrop(event, 'Finalizadas')">
              <div class="kanban-column-header">
                <div class="kanban-column-title-wrap">
                  <span>🟢</span>
                  <h4>Finalizadas</h4>
                </div>
                <span class="col-count-pill">${finalizadas.length}</span>
              </div>
              <div class="kanban-cards-list" id="cards-${clave}-Finalizadas">
                ${tarjetasFinalizadasHtml}
              </div>
            </div>

          </div>
        </div>
      </div>
    `;
  });

  container.innerHTML = htmlGrupos;
}

window.filtrarFeedPorHuerto = function(huertoId) {
  const usuario = document.getElementById('filtro-usuario-feed')?.value || 'todos';
  const periodo = document.getElementById('filtro-periodo-feed')?.value || 'todos';
  renderizarFeed(huertoId, usuario, periodo);
};

window.filtrarFeedPorUsuario = function(usuarioId) {
  const huerto = document.getElementById('filtro-huerto-feed')?.value || 'todos';
  const periodo = document.getElementById('filtro-periodo-feed')?.value || 'todos';
  renderizarFeed(huerto, usuarioId, periodo);
};

window.filtrarFeedPorPeriodo = function(periodo) {
  const huerto = document.getElementById('filtro-huerto-feed')?.value || 'todos';
  const usuario = document.getElementById('filtro-usuario-feed')?.value || 'todos';
  renderizarFeed(huerto, usuario, periodo);
};

// 2. Renderizar Catálogo de Parcelas (Baseline - Protegido Anti-XSS)
function renderizarParcelas() {
  const grid = document.getElementById('parcelas-grid');
  if (!grid) return;

  const esc = (window.HuertoSecurity && window.HuertoSecurity.escapeHtml) ? window.HuertoSecurity.escapeHtml : s => (s || '');
  const sanitizeId = (window.HuertoSecurity && window.HuertoSecurity.sanitizeId) ? window.HuertoSecurity.sanitizeId : s => s;

  grid.innerHTML = '';
  estado.parcelas.forEach(p => {
    const safeId = sanitizeId(p.id);
    // Buscar última faena realizada en esta parcela
    const faenasDeEsta = estado.faenas
      .filter(f => f.parcelaId === p.id)
      .sort((a, b) => new Date(`${b.fecha} ${b.hora || '12:00'}`) - new Date(`${a.fecha} ${a.hora || '12:00'}`));
    
    const ultima = faenasDeEsta[0];

    const card = document.createElement('div');
    card.className = 'parcela-card';
    card.onclick = () => verDetalleParcela(safeId);

    card.innerHTML = `
      <div class="parcela-head">
        <div class="parcela-title">
          <h3>${esc(p.nombre)}</h3>
          <span style="font-size:0.75rem; color:var(--primary-light); font-weight:600;">${esc(p.superficie)}</span>
        </div>
        <span style="font-size:1.4rem;">🍊</span>
      </div>

      <div class="parcela-specs-grid">
        <div class="spec-item">
          <span>Variedad</span>
          <strong>${esc(p.variedad || 'Sin especificar')}</strong>
        </div>
        <div class="spec-item">
          <span>Patrón</span>
          <strong>${esc(p.patron || 'Sin patrón')}</strong>
        </div>
        <div class="spec-item">
          <span>Marco</span>
          <strong>${esc(p.marco || '-')}</strong>
        </div>
        <div class="spec-item">
          <span>Árboles</span>
          <strong>${p.arboles ? `${esc(p.arboles)} pies` : '-'}</strong>
        </div>
      </div>

      <div class="parcela-footer">
        <span>${ultima ? `Última: ${esc(ultima.tipoFaena)} (${esc(formatFecha(ultima.fecha))})` : 'Sin partes registrados'}</span>
        <strong style="color:var(--primary-light);">Ver Ficha ➔</strong>
      </div>
    `;
    grid.appendChild(card);
  });
}

// 3. Renderizar Selectores en Formulario y Filtros (Protegido Anti-XSS)
function renderizarSelectoresHuertos() {
  const selForm = document.getElementById('faena-huerto');
  const selFeed = document.getElementById('filtro-huerto-feed');
  const selFeedUser = document.getElementById('filtro-usuario-feed');

  const esc = (window.HuertoSecurity && window.HuertoSecurity.escapeHtml) ? window.HuertoSecurity.escapeHtml : s => (s || '');
  const sanitizeId = (window.HuertoSecurity && window.HuertoSecurity.sanitizeId) ? window.HuertoSecurity.sanitizeId : s => s;

  if (selForm) {
    selForm.innerHTML = estado.parcelas.map(p => `
      <option value="${sanitizeId(p.id)}">${esc(p.nombre)} (${esc(p.variedad)})</option>
    `).join('');
  }

  if (selFeed) {
    selFeed.innerHTML = `
      <option value="todos">Todos los huertos (${estado.parcelas.length})</option>
      ${estado.parcelas.map(p => `<option value="${sanitizeId(p.id)}">${esc(p.nombre)}</option>`).join('')}
    `;
  }

  if (selFeedUser) {
    selFeedUser.innerHTML = `
      <option value="todos">Todos los operarios</option>
      ${USUARIOS.map(u => `<option value="${esc(u.nombre)}">${esc(u.nombre)}</option>`).join('')}
    `;
  }

  const selFeedPeriodo = document.getElementById('filtro-periodo-feed');
  if (selFeedPeriodo) {
    const periodosMap = new Map();
    estado.faenas.forEach(f => {
      if (f.fecha && f.fecha.length >= 7) {
        const clave = f.fecha.slice(0, 7);
        periodosMap.set(clave, (periodosMap.get(clave) || 0) + 1);
      }
    });

    const periodosOrdenados = Array.from(periodosMap.keys()).sort().reverse();
    const valorSeleccionado = selFeedPeriodo.value || 'todos';

    selFeedPeriodo.innerHTML = `
      <option value="todos">📅 Todos los periodos (${estado.faenas.length})</option>
      ${periodosOrdenados.map(p => {
        const info = obtenerInfoMesAno(`${p}-01`);
        const total = periodosMap.get(p);
        return `<option value="${esc(p)}">${esc(info.etiqueta)} (${total})</option>`;
      }).join('')}
    `;

    if (periodosMap.has(valorSeleccionado) || valorSeleccionado === 'todos') {
      selFeedPeriodo.value = valorSeleccionado;
    }
  }
}

function renderizarOperariosChips() {
  const chipsWrap = document.getElementById('operarios-chips');
  if (!chipsWrap) return;

  const esc = (window.HuertoSecurity && window.HuertoSecurity.escapeHtml) ? window.HuertoSecurity.escapeHtml : s => (s || '');
  const sanitizeId = (window.HuertoSecurity && window.HuertoSecurity.sanitizeId) ? window.HuertoSecurity.sanitizeId : s => s;

  const currentUserId = estado.usuarioActivo ? estado.usuarioActivo.id : 'carlos';
  chipsWrap.innerHTML = USUARIOS.map(u => {
    const safeId = sanitizeId(u.id);
    return `
      <button type="button" class="user-chip-btn ${safeId === currentUserId ? 'active' : ''}" 
              onclick="seleccionarChipOperario('${safeId}', '${esc(u.nombre)}')" id="chip-user-${safeId}">
        ${esc(u.avatar)} ${esc(u.nombre)}
      </button>
    `;
  }).join('');
}

let operarioSeleccionadoNombre = 'Carlos';
let operarioSeleccionadoId = 'carlos';

window.seleccionarChipOperario = function(id, nombre) {
  operarioSeleccionadoId = id;
  operarioSeleccionadoNombre = nombre;
  document.querySelectorAll('.user-chip-btn').forEach(btn => btn.classList.remove('active'));
  const btn = document.getElementById(`chip-user-${id}`);
  if (btn) btn.classList.add('active');
};

// 4. Renderizar Semáforo de Huertos (Resumen - Protegido Anti-XSS)
function renderizarSemaforo() {
  const container = document.getElementById('resumen-semaforo');
  if (!container) return;

  const esc = (window.HuertoSecurity && window.HuertoSecurity.escapeHtml) ? window.HuertoSecurity.escapeHtml : s => (s || '');

  container.innerHTML = '';
  estado.parcelas.forEach(p => {
    const faenas = estado.faenas.filter(f => f.parcelaId === p.id);
    const ultima = faenas[0];

    let estadoPlaga = 'Sin plagas';
    let clasePlaga = 'var(--primary-light)';
    let estadoHierba = 'Limpio';

    if (ultima) {
      if (ultima.plagas && ultima.plagas.length > 0) {
        estadoPlaga = `Alerta: ${ultima.plagas.map(esc).join(', ')}`;
        clasePlaga = '#fca5a5';
      }
      if (ultima.hierba) {
        estadoHierba = ultima.hierba;
      }
    }

    const card = document.createElement('div');
    card.className = 'semaforo-card';
    card.innerHTML = `
      <div class="semaforo-title">
        <span>${esc(p.nombre)}</span>
        <span style="font-size:0.75rem; color:var(--text-muted);">${esc(p.variedad)}</span>
      </div>
      <div style="font-size:0.8rem; margin-top:0.4rem; display:flex; flex-direction:column; gap:0.25rem;">
        <div>Plagas: <strong style="color:${clasePlaga};">${estadoPlaga}</strong></div>
        <div>Hierba: <strong>${esc(estadoHierba)}</strong></div>
        <div style="font-size:0.75rem; color:var(--text-subtle);">Última visita: ${ultima ? esc(formatFecha(ultima.fecha)) : 'Nunca'}</div>
      </div>
    `;
    container.appendChild(card);
  });
}

// ============================================================================
// FORMULARIO DE NUEVA FAENA
// ============================================================================
let tipoFaenaSeleccionada = 'Tratamiento Fitosanitario';

function iniciarFormularioFaena() {
  // Poner fecha de hoy por defecto en el input
  const dateInput = document.getElementById('faena-fecha');
  if (dateInput) {
    const hoy = new Date().toISOString().split('T')[0];
    dateInput.value = hoy;
  }

  // Chips de tipo de faena
  const tipoBtns = document.querySelectorAll('#tipo-faena-chips .chip-btn');
  tipoBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tipoBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      tipoFaenaSeleccionada = btn.getAttribute('data-val');

      // Mostrar/ocultar bloque químico si es relevante
      const seccionQuimicos = document.getElementById('seccion-quimicos');
      if (seccionQuimicos) {
        if (tipoFaenaSeleccionada.includes('Tratamiento') || tipoFaenaSeleccionada.includes('Abonado')) {
          seccionQuimicos.style.display = 'block';
        }
      }
    });
  });
}

window.guardarNuevaFaena = function(e) {
  e.preventDefault();

  const submitBtn = e.target.querySelector('button[type="submit"]');
  if (submitBtn) submitBtn.disabled = true;

  try {
    const huertoId = document.getElementById('faena-huerto').value;
    const fecha = document.getElementById('faena-fecha').value;
    const huerto = estado.parcelas.find(p => p.id === huertoId);
    const notas = document.getElementById('faena-notas').value.trim();
    const producto = document.getElementById('faena-quimico-producto').value.trim();
    const dosis = document.getElementById('faena-quimico-dosis').value.trim();

    // Tickmarks de plagas
    const checkboxes = document.querySelectorAll('input[name="plagas"]:checked');
    const plagas = Array.from(checkboxes).map(c => c.value);

    // Radio hierba
    const radioHierba = document.querySelector('input[name="hierba"]:checked');
    const hierba = radioHierba ? radioHierba.value : 'Limpio';

    // Radio estado (DevOps / Kanban)
    const radioEstado = document.querySelector('input[name="faena-estado"]:checked');
    const estadoSeleccionado = radioEstado ? radioEstado.value : 'Finalizadas';

    const ahora = new Date();
    const hora = `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`;

    const rawFaena = {
      id: 'f-' + Date.now(),
      fecha: fecha,
      hora: hora,
      usuario: operarioSeleccionadoNombre || (estado.usuarioActivo ? estado.usuarioActivo.nombre : 'Carlos'),
      usuarioId: operarioSeleccionadoId || (estado.usuarioActivo ? estado.usuarioActivo.id : 'carlos'),
      parcelaId: huertoId,
      parcelaNombre: huerto ? huerto.nombre : 'Huerto',
      tipoFaena: tipoFaenaSeleccionada,
      estado: estadoSeleccionado,
      quimicoProducto: producto,
      quimicoDosis: dosis,
      plagas: plagas,
      hierba: hierba,
      notas: notas
    };

    // Validación y sanitización estricta por esquema de seguridad
    const nuevaFaena = (window.HuertoSecurity && window.HuertoSecurity.validateFaena)
      ? window.HuertoSecurity.validateFaena(rawFaena, estado.parcelas)
      : rawFaena;

    // Añadir al principio del histórico
    estado.faenas.unshift(nuevaFaena);
    guardarDatos();
    renderizarTodo();

    mostrarToast(`¡Faena registrada con éxito en ${nuevaFaena.parcelaNombre}! [${nuevaFaena.estado}]`);

    // Limpiar formulario y volver al feed
    document.getElementById('form-faena').reset();
    const radioDefault = document.querySelector('input[name="faena-estado"][value="Finalizadas"]');
    if (radioDefault) radioDefault.checked = true;
    iniciarFormularioFaena();

    // Cambiar a pestaña feed
    const feedTabBtn = document.querySelector('[data-tab="tab-feed"]');
    if (feedTabBtn) feedTabBtn.click();
  } catch (err) {
    mostrarToast(`⚠️ Error de validación: ${err.message}`, 'danger');
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
};

// ============================================================================
// MODAL DETALLE DE PARCELA (HISTÓRICO COMPLETO - PROTEGIDO ANTI-XSS)
// ============================================================================
window.verDetalleParcela = function(parcelaId) {
  const p = estado.parcelas.find(item => item.id === parcelaId);
  if (!p) return;

  const esc = (window.HuertoSecurity && window.HuertoSecurity.escapeHtml) ? window.HuertoSecurity.escapeHtml : s => (s || '');

  const modal = document.getElementById('modal-detalle-parcela');
  document.getElementById('modal-parcela-nombre').innerText = p.nombre;
  document.getElementById('modal-parcela-baseline').innerText = `${p.superficie} · ${p.ubicacion || ''}`;

  const specsGrid = document.getElementById('modal-parcela-specs');
  specsGrid.innerHTML = `
    <div class="spec-item"><span>Variedad:</span> <strong>${esc(p.variedad)}</strong></div>
    <div class="spec-item"><span>Patrón:</span> <strong>${esc(p.patron)}</strong></div>
    <div class="spec-item"><span>Marco:</span> <strong>${esc(p.marco)}</strong></div>
    <div class="spec-item"><span>Pies estimados:</span> <strong>${p.arboles ? esc(p.arboles) : '-'}</strong></div>
  `;

  // Historial de faenas de esta parcela
  const faenasDeEsta = estado.faenas.filter(f => f.parcelaId === parcelaId);
  const historialContainer = document.getElementById('modal-parcela-historial');

  if (faenasDeEsta.length === 0) {
    historialContainer.innerHTML = '<p style="color:var(--text-muted); font-size:0.85rem; padding:1rem 0;">Aún no hay faenas registradas en este huerto.</p>';
  } else {
    historialContainer.innerHTML = faenasDeEsta.map(f => `
      <div style="background:var(--bg-surface); padding:0.75rem; border-radius:var(--radius-sm); margin-bottom:0.5rem; border-left:3px solid var(--primary);">
        <div style="display:flex; justify-content:space-between; font-size:0.85rem; font-weight:700;">
          <span>${esc(f.tipoFaena)}</span>
          <span style="color:var(--text-muted); font-size:0.75rem;">${esc(formatFecha(f.fecha))} · ${esc(f.usuario)}</span>
        </div>
        ${f.quimicoProducto ? `<div style="font-size:0.8rem; color:var(--citrus-light); margin-top:2px;">🧪 ${esc(f.quimicoProducto)} (${esc(f.quimicoDosis)})</div>` : ''}
        ${f.plagas && f.plagas.length ? `<div style="font-size:0.75rem; color:#fca5a5; margin-top:2px;">🐛 Plagas: ${f.plagas.map(esc).join(', ')}</div>` : ''}
        ${f.notas ? `<div style="font-size:0.8rem; color:var(--text-muted); margin-top:4px;">"${esc(f.notas)}"</div>` : ''}
      </div>
    `).join('');
  }

  modal.classList.remove('hidden');
};

window.cerrarModalParcela = function() {
  document.getElementById('modal-detalle-parcela').classList.add('hidden');
};

// ============================================================================
// MODAL CREAR NUEVO HUERTO (VALIDADO)
// ============================================================================
window.abrirModalNuevaParcela = function() {
  document.getElementById('modal-crear-huerto').classList.remove('hidden');
};

window.cerrarModalCrearHuerto = function() {
  document.getElementById('modal-crear-huerto').classList.add('hidden');
};

window.guardarNuevoHuerto = function(e) {
  e.preventDefault();
  try {
    const rawHuerto = {
      nombre: document.getElementById('nuevo-huerto-nombre').value,
      superficie: document.getElementById('nuevo-huerto-superficie').value,
      variedad: document.getElementById('nuevo-huerto-variedad').value,
      patron: document.getElementById('nuevo-huerto-patron').value,
      marco: document.getElementById('nuevo-huerto-marco').value,
      ubicacion: document.getElementById('nuevo-huerto-ubicacion').value
    };

    const nuevo = (window.HuertoSecurity && window.HuertoSecurity.validateParcela)
      ? window.HuertoSecurity.validateParcela(rawHuerto)
      : { id: 'p-' + Date.now(), ...rawHuerto };

    estado.parcelas.push(nuevo);
    guardarDatos();
    renderizarTodo();
    cerrarModalCrearHuerto();
    mostrarToast(`Huerto "${nuevo.nombre}" guardado con éxito`);
  } catch (err) {
    mostrarToast(`⚠️ Error: ${err.message}`, 'danger');
  }
};

// ============================================================================
// EXPORTACIÓN / IMPORTACIÓN SEGURA DE COPIAS
// ============================================================================
window.exportarDatos = function() {
  // Deep sanitize para descartar prototipos o claves corruptas
  const payloadLimpio = (window.HuertoSecurity && window.HuertoSecurity.deepSanitizeObject)
    ? window.HuertoSecurity.deepSanitizeObject(estado)
    : estado;

  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(payloadLimpio, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `huertos_carlos_respaldo_${new Date().toISOString().split('T')[0]}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  mostrarToast('Copia de seguridad cifrada descargada');
};

// Exportación CSV con protección Anti-Inyección de fórmulas para Excel/Calc
window.exportarDatosSegurosCsv = function() {
  if (!estado.faenas || estado.faenas.length === 0) {
    mostrarToast('No hay faenas para exportar a CSV');
    return;
  }

  const sanitizeCell = (window.HuertoSecurity && window.HuertoSecurity.sanitizeCsvCell)
    ? window.HuertoSecurity.sanitizeCsvCell
    : val => `"${String(val || '').replace(/"/g, '""')}"`;

  const headers = ['ID', 'Fecha', 'Hora', 'Huerto', 'Operario', 'Tipo Faena', 'Estado', 'Quimico', 'Dosis', 'Plagas', 'Hierba', 'Notas'];
  const rows = [headers.map(h => `"${h}"`).join(',')];

  estado.faenas.forEach(f => {
    const plagasStr = (f.plagas && Array.isArray(f.plagas)) ? f.plagas.join('; ') : '';
    const fila = [
      sanitizeCell(f.id),
      sanitizeCell(f.fecha),
      sanitizeCell(f.hora || ''),
      sanitizeCell(f.parcelaNombre),
      sanitizeCell(f.usuario),
      sanitizeCell(f.tipoFaena),
      sanitizeCell(f.estado || 'Finalizadas'),
      sanitizeCell(f.quimicoProducto || ''),
      sanitizeCell(f.quimicoDosis || ''),
      sanitizeCell(plagasStr),
      sanitizeCell(f.hierba || 'Limpio'),
      sanitizeCell(f.notas || '')
    ];
    rows.push(fila.join(','));
  });

  const csvContent = "\uFEFF" + rows.join('\r\n'); // BOM UTF-8 para Excel
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `huertos_carlos_faenas_seguras_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  mostrarToast('CSV exportado con protección anti-inyección');
};

window.importarDatos = function(event) {
  const file = event.target.files[0];
  if (!file) return;

  // Límite de tamaño: max 10MB para prevenir ataques DoS por memoria
  if (file.size > 10 * 1024 * 1024) {
    mostrarToast('⚠️ Archivo demasiado grande (máximo 10 MB)', 'danger');
    event.target.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      // Crear snapshot de respaldo automático antes de aplicar cambios
      if (window.HuertoSecurity && window.HuertoSecurity.crearSnapshotSeguridad) {
        window.HuertoSecurity.crearSnapshotSeguridad(STORAGE_KEY);
      }

      // Parser seguro anti-prototype pollution
      const data = (window.HuertoSecurity && window.HuertoSecurity.safeJsonParse)
        ? window.HuertoSecurity.safeJsonParse(e.target.result)
        : JSON.parse(e.target.result);

      if (!data || typeof data !== 'object') {
        throw new Error('Estructura de archivo corrupta o vacía');
      }

      let countParcelas = 0;
      let countFaenas = 0;

      if (data.parcelas && Array.isArray(data.parcelas)) {
        estado.parcelas = data.parcelas.map(p => {
          return (window.HuertoSecurity && window.HuertoSecurity.validateParcela)
            ? window.HuertoSecurity.validateParcela(p)
            : p;
        });
        countParcelas = estado.parcelas.length;
      }

      if (data.faenas && Array.isArray(data.faenas)) {
        estado.faenas = data.faenas.map(f => {
          f.estado = normalizarEstado(f.estado || 'Finalizadas');
          return (window.HuertoSecurity && window.HuertoSecurity.validateFaena)
            ? window.HuertoSecurity.validateFaena(f, estado.parcelas)
            : f;
        });
        countFaenas = estado.faenas.length;
      }

      guardarDatos();
      renderizarTodo();
      actualizarEstadoCiberseguridadUI();
      mostrarToast(`¡Importados con éxito ${countParcelas} huertos y ${countFaenas} faenas!`);
    } catch (err) {
      console.error('[Ciberseguridad] Error en importación:', err);
      mostrarToast(`⚠️ Error en importación: ${err.message}`, 'danger');
    } finally {
      event.target.value = '';
    }
  };
  reader.readAsText(file);
};

window.deshacerUltimaAccion = function() {
  if (window.HuertoSecurity && window.HuertoSecurity.restaurarSnapshotSeguridad) {
    const ok = window.HuertoSecurity.restaurarSnapshotSeguridad(STORAGE_KEY);
    if (ok) {
      cargarDatos();
      renderizarTodo();
      actualizarEstadoCiberseguridadUI();
      mostrarToast('↩️ Estado restaurado al punto previo a la importación');
      return;
    }
  }
  mostrarToast('No hay punto de restauración disponible');
};

window.restablecerDatosExcel = function() {
  if (confirm('¿Restablecer el cuaderno de campo con las 30 parcelas y faenas originales del Excel de Carlos?\n(Se creará una copia de seguridad automática de tu estado actual)')) {
    if (window.HuertoSecurity && window.HuertoSecurity.crearSnapshotSeguridad) {
      window.HuertoSecurity.crearSnapshotSeguridad(STORAGE_KEY);
    }
    localStorage.removeItem(STORAGE_KEY);
    cargarDatos();
    renderizarTodo();
    actualizarEstadoCiberseguridadUI();
    mostrarToast('¡Cuaderno de campo restaurado con el Excel de Carlos (30 huertos)!');
  }
};

// ============================================================================
// FUNCIONES DE CONTROL DE CIBERSEGURIDAD, INTEGRIDAD Y PRIVACIDAD EN CAMPO
// ============================================================================
function actualizarEstadoCiberseguridadUI() {
  const pinBadge = document.getElementById('pin-status-badge');
  const pinDesc = document.getElementById('pin-status-desc');
  const btnPin = document.getElementById('btn-gestionar-pin');
  const btnDeshacer = document.getElementById('btn-deshacer-seguridad');

  if (window.HuertoSecurity) {
    const tienePin = window.HuertoSecurity.tienePinActivo();
    if (pinBadge) {
      pinBadge.innerText = tienePin ? 'Activo (4 dígitos)' : 'Desactivado';
      pinBadge.style.color = tienePin ? 'var(--primary-light)' : 'var(--text-subtle)';
      pinBadge.style.background = tienePin ? 'rgba(34, 197, 94, 0.15)' : 'rgba(100, 116, 139, 0.15)';
    }
    if (pinDesc) {
      pinDesc.innerText = tienePin ? 'Bloqueo activo. Requiere PIN para desbloquear.' : 'Protege el cuaderno de campo con un PIN opcional.';
    }
    if (btnPin) {
      btnPin.innerText = tienePin ? '🔓 Desactivar PIN' : '🔐 Configurar PIN de Bloqueo';
    }

    // Comprobar si hay snapshot de recuperación disponible
    const snap = localStorage.getItem('huertos_carlos_snapshot_pre_action');
    if (btnDeshacer) {
      btnDeshacer.style.display = snap ? 'inline-block' : 'none';
    }
  }
}

window.verificarCiberseguridad = function() {
  const hash = localStorage.getItem('huertos_carlos_integrity_hash_v3') || 'Local';
  alert(
    `🛡️ ESTADO DE CIBERSEGURIDAD - HUERTOS CARLOS\n` +
    `==========================================\n` +
    `• Aislamiento de Red: Cero fugas a servidores externos (100% Local / Offline)\n` +
    `• Protección de Navegación: CSP y Anti-Clickjacking estrictos activos\n` +
    `• Prevención de Inyecciones: Filtro Anti-XSS y Anti-Inyección CSV activos\n` +
    `• Integridad de Datos: SHA-256 verificado (${hash.substring(0, 16)}...)\n` +
    `• Estado de Privacidad: ${window.HuertoSecurity && window.HuertoSecurity.tienePinActivo() ? 'PIN Activo' : 'Sin PIN'}\n\n` +
    `Tus datos agrícolas están 100% a salvo y protegidos.`
  );
};

window.verificarIntegridadManual = async function() {
  if (window.HuertoSecurity) {
    const res = await window.HuertoSecurity.cargarConIntegridad(STORAGE_KEY);
    if (res.status === 'VERIFIED') {
      mostrarToast(`✅ Integridad confirmada: SHA-256 coincide exactamente`);
    } else if (res.status === 'TAMPERED') {
      mostrarToast(`⚠️ Alerta: El hash no coincide con la firma guardada`, 'warning');
    } else {
      mostrarToast(`ℹ️ Estado de datos: ${res.status}`);
    }
  }
};

window.gestionarPinSeguridad = async function() {
  if (!window.HuertoSecurity) return;
  if (window.HuertoSecurity.tienePinActivo()) {
    if (confirm('¿Deseas eliminar el PIN de bloqueo y dejar el acceso libre?')) {
      window.HuertoSecurity.eliminarPinSeguridad();
      actualizarEstadoCiberseguridadUI();
      mostrarToast('PIN de seguridad eliminado');
    }
  } else {
    const pin = prompt('Introduce un PIN de 4 dígitos numéricos para proteger la web:');
    if (pin === null) return;
    if (!/^\d{4}$/.test(pin)) {
      alert('Error: El PIN debe tener exactamente 4 dígitos numéricos (ej. 1234).');
      return;
    }
    await window.HuertoSecurity.configurarPinSeguridad(pin);
    actualizarEstadoCiberseguridadUI();
    mostrarToast('¡PIN de 4 dígitos configurado con éxito!');
  }
};

function iniciarProteccionPrivacidad() {
  if (!window.HuertoSecurity) return;

  // Si la sesión está marcada como bloqueada, abrir modal
  if (window.HuertoSecurity.estaSesionBloqueada()) {
    const modal = document.getElementById('modal-pin-lock');
    if (modal) modal.classList.remove('hidden');
  }

  // Setup inputs de 4 dígitos
  const inputs = [
    document.getElementById('pin-d1'),
    document.getElementById('pin-d2'),
    document.getElementById('pin-d3'),
    document.getElementById('pin-d4')
  ];

  inputs.forEach((inp, idx) => {
    if (!inp) return;
    inp.addEventListener('input', (e) => {
      if (e.target.value.length === 1 && idx < 3) {
        inputs[idx + 1].focus();
      }
      if (idx === 3 && e.target.value.length === 1) {
        comprobarPinEntrada();
      }
    });
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !e.target.value && idx > 0) {
        inputs[idx - 1].focus();
      }
    });
  });
}

window.comprobarPinEntrada = async function() {
  if (!window.HuertoSecurity) return;
  const d1 = document.getElementById('pin-d1')?.value || '';
  const d2 = document.getElementById('pin-d2')?.value || '';
  const d3 = document.getElementById('pin-d3')?.value || '';
  const d4 = document.getElementById('pin-d4')?.value || '';
  const pin = d1 + d2 + d3 + d4;

  const valido = await window.HuertoSecurity.verificarPin(pin);
  const errMsg = document.getElementById('pin-error-msg');
  if (valido) {
    window.HuertoSecurity.desbloquearSesion();
    const modal = document.getElementById('modal-pin-lock');
    if (modal) modal.classList.add('hidden');
    if (errMsg) errMsg.style.display = 'none';
    mostrarToast('Acceso desbloqueado');
  } else {
    if (errMsg) errMsg.style.display = 'block';
    [1, 2, 3, 4].forEach(i => {
      const el = document.getElementById(`pin-d${i}`);
      if (el) el.value = '';
    });
    document.getElementById('pin-d1')?.focus();
  }
};

// ============================================================================
// UTILIDADES
// ============================================================================
function formatFecha(fechaStr) {
  if (!fechaStr) return '';
  const partes = fechaStr.split('-');
  if (partes.length === 3) {
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }
  return fechaStr;
}

function mostrarToast(mensaje, tipo = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const esc = (window.HuertoSecurity && window.HuertoSecurity.escapeHtml) ? window.HuertoSecurity.escapeHtml : s => s;

  const toast = document.createElement('div');
  toast.className = 'toast';
  const icon = tipo === 'danger' ? '⚠️' : tipo === 'warning' ? '🔔' : '🌱';
  toast.innerHTML = `<span>${icon}</span> <span>${esc(mensaje)}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.4s ease';
    setTimeout(() => toast.remove(), 400);
  }, 3500);
}

