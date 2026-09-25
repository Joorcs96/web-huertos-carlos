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
// INICIALIZACIÓN
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
  cargarDatos();
  iniciarSesionUsuario();
  iniciarNavegacion();
  iniciarFormularioFaena();
  renderizarTodo();
});

function cargarDatos() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Si la versión guardada en localStorage tiene menos de 10 parcelas (datos de prueba antiguos),
      // recargar con los 30 huertos reales y 1175 faenas del Excel
      if (parsed.parcelas && parsed.parcelas.length >= 20) {
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
    console.error('Error cargando estado:', e);
    estado.parcelas = JSON.parse(JSON.stringify(PARCELAS_INICIALES));
    estado.faenas = JSON.parse(JSON.stringify(FAENAS_INICIALES));
  }

  // Garantizar que toda faena histórica o existente tenga estado 'Finalizadas' por defecto
  if (Array.isArray(estado.faenas)) {
    estado.faenas.forEach(f => {
      f.estado = normalizarEstado(f.estado || 'Finalizadas');
    });
  }
}

function guardarDatos() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      parcelas: estado.parcelas,
      faenas: estado.faenas
    }));
  } catch (e) {
    console.error('Error guardando datos:', e);
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

// Generador de Tarjeta de Faena con Botones de 1 Clic
function generarTarjetaFaenaHtml(f) {
  // Tags de plagas detectadas
  let tagsPlagasHtml = '';
  if (f.plagas && f.plagas.length > 0) {
    f.plagas.forEach(p => {
      tagsPlagasHtml += `<span class="tag-plaga">⚠️ ${p}</span>`;
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
        <strong>${f.quimicoProducto}</strong>
        ${f.quimicoDosis ? `(${f.quimicoDosis})` : ''}
      </div>
    `;
  }

  const estadoActual = normalizarEstado(f.estado);

  return `
    <div class="feed-card" draggable="true" ondragstart="onFaenaDragStart(event, '${f.id}')" id="card-${f.id}">
      <div class="feed-header">
        <div class="feed-title-wrap">
          <strong>${f.parcelaNombre}</strong>
          <div class="feed-meta">
            <span>👤 ${f.usuario}</span>
            <span>·</span>
            <span>📅 ${formatFecha(f.fecha)} ${f.hora ? `a las ${f.hora}` : ''}</span>
          </div>
        </div>
        <span class="feed-task-badge">${f.tipoFaena}</span>
      </div>

      ${quimicoHtml}

      <div class="feed-tags-row">
        ${tagHierbaHtml}
        ${tagsPlagasHtml}
      </div>

      ${f.notas ? `<div class="feed-notas">"${f.notas}"</div>` : ''}

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
                  onclick="cambiarEstadoFaena('${f.id}', 'Pendientes', event)" 
                  title="Marcar como Pendiente">
            🟡 Pendiente
          </button>
          <button type="button" 
                  class="btn-status ${estadoActual === 'En curso' ? 'active en-curso' : ''}" 
                  onclick="cambiarEstadoFaena('${f.id}', 'En curso', event)" 
                  title="Marcar como En curso">
            🔵 En curso
          </button>
          <button type="button" 
                  class="btn-status ${estadoActual === 'Finalizadas' ? 'active finalizadas' : ''}" 
                  onclick="cambiarEstadoFaena('${f.id}', 'Finalizadas', event)" 
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

// 2. Renderizar Catálogo de Parcelas (Baseline)
function renderizarParcelas() {
  const grid = document.getElementById('parcelas-grid');
  if (!grid) return;

  grid.innerHTML = '';
  estado.parcelas.forEach(p => {
    // Buscar última faena realizada en esta parcela
    const faenasDeEsta = estado.faenas
      .filter(f => f.parcelaId === p.id)
      .sort((a, b) => new Date(`${b.fecha} ${b.hora || '12:00'}`) - new Date(`${a.fecha} ${a.hora || '12:00'}`));
    
    const ultima = faenasDeEsta[0];

    const card = document.createElement('div');
    card.className = 'parcela-card';
    card.onclick = () => verDetalleParcela(p.id);

    card.innerHTML = `
      <div class="parcela-head">
        <div class="parcela-title">
          <h3>${p.nombre}</h3>
          <span style="font-size:0.75rem; color:var(--primary-light); font-weight:600;">${p.superficie}</span>
        </div>
        <span style="font-size:1.4rem;">🍊</span>
      </div>

      <div class="parcela-specs-grid">
        <div class="spec-item">
          <span>Variedad</span>
          <strong>${p.variedad || 'Sin especificar'}</strong>
        </div>
        <div class="spec-item">
          <span>Patrón</span>
          <strong>${p.patron || 'Sin patrón'}</strong>
        </div>
        <div class="spec-item">
          <span>Marco</span>
          <strong>${p.marco || '-'}</strong>
        </div>
        <div class="spec-item">
          <span>Árboles</span>
          <strong>${p.arboles ? `${p.arboles} pies` : '-'}</strong>
        </div>
      </div>

      <div class="parcela-footer">
        <span>${ultima ? `Última: ${ultima.tipoFaena} (${formatFecha(ultima.fecha)})` : 'Sin partes registrados'}</span>
        <strong style="color:var(--primary-light);">Ver Ficha ➔</strong>
      </div>
    `;
    grid.appendChild(card);
  });
}

// 3. Renderizar Selectores en Formulario y Filtros
function renderizarSelectoresHuertos() {
  const selForm = document.getElementById('faena-huerto');
  const selFeed = document.getElementById('filtro-huerto-feed');
  const selFeedUser = document.getElementById('filtro-usuario-feed');

  if (selForm) {
    selForm.innerHTML = estado.parcelas.map(p => `
      <option value="${p.id}">${p.nombre} (${p.variedad})</option>
    `).join('');
  }

  if (selFeed) {
    selFeed.innerHTML = `
      <option value="todos">Todos los huertos (${estado.parcelas.length})</option>
      ${estado.parcelas.map(p => `<option value="${p.id}">${p.nombre}</option>`).join('')}
    `;
  }

  if (selFeedUser) {
    selFeedUser.innerHTML = `
      <option value="todos">Todos los operarios</option>
      ${USUARIOS.map(u => `<option value="${u.nombre}">${u.nombre}</option>`).join('')}
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
        return `<option value="${p}">${info.etiqueta} (${total})</option>`;
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

  const currentUserId = estado.usuarioActivo ? estado.usuarioActivo.id : 'carlos';
  chipsWrap.innerHTML = USUARIOS.map(u => `
    <button type="button" class="user-chip-btn ${u.id === currentUserId ? 'active' : ''}" 
            onclick="seleccionarChipOperario('${u.id}', '${u.nombre}')" id="chip-user-${u.id}">
      ${u.avatar} ${u.nombre}
    </button>
  `).join('');
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

// 4. Renderizar Semáforo de Huertos (Resumen)
function renderizarSemaforo() {
  const container = document.getElementById('resumen-semaforo');
  if (!container) return;

  container.innerHTML = '';
  estado.parcelas.forEach(p => {
    const faenas = estado.faenas.filter(f => f.parcelaId === p.id);
    const ultima = faenas[0];

    let estadoPlaga = 'Sin plagas';
    let clasePlaga = 'var(--primary-light)';
    let estadoHierba = 'Limpio';

    if (ultima) {
      if (ultima.plagas && ultima.plagas.length > 0) {
        estadoPlaga = `Alerta: ${ultima.plagas.join(', ')}`;
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
        <span>${p.nombre}</span>
        <span style="font-size:0.75rem; color:var(--text-muted);">${p.variedad}</span>
      </div>
      <div style="font-size:0.8rem; margin-top:0.4rem; display:flex; flex-direction:column; gap:0.25rem;">
        <div>Plagas: <strong style="color:${clasePlaga};">${estadoPlaga}</strong></div>
        <div>Hierba: <strong>${estadoHierba}</strong></div>
        <div style="font-size:0.75rem; color:var(--text-subtle);">Última visita: ${ultima ? formatFecha(ultima.fecha) : 'Nunca'}</div>
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

  const nuevaFaena = {
    id: 'f-' + Date.now(),
    fecha: fecha,
    hora: hora,
    usuario: operarioSeleccionadoNombre || (estado.usuarioActivo ? estado.usuarioActivo.nombre : 'Carlos'),
    usuarioId: operarioSeleccionadoId || (estado.usuarioActivo ? estado.usuarioActivo.id : 'carlos'),
    parcelaId: huertoId,
    parcelaNombre: huerto ? huerto.nombre : 'Huerto',
    tipoFaena: tipoFaenaSeleccionada,
    estado: normalizarEstado(estadoSeleccionado),
    quimicoProducto: producto,
    quimicoDosis: dosis,
    plagas: plagas,
    hierba: hierba,
    notas: notas
  };

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
};

// ============================================================================
// MODAL DETALLE DE PARCELA (HISTÓRICO COMPLETO)
// ============================================================================
window.verDetalleParcela = function(parcelaId) {
  const p = estado.parcelas.find(item => item.id === parcelaId);
  if (!p) return;

  const modal = document.getElementById('modal-detalle-parcela');
  document.getElementById('modal-parcela-nombre').innerText = p.nombre;
  document.getElementById('modal-parcela-baseline').innerText = `${p.superficie} · ${p.ubicacion || ''}`;

  const specsGrid = document.getElementById('modal-parcela-specs');
  specsGrid.innerHTML = `
    <div class="spec-item"><span>Variedad:</span> <strong>${p.variedad}</strong></div>
    <div class="spec-item"><span>Patrón:</span> <strong>${p.patron}</strong></div>
    <div class="spec-item"><span>Marco:</span> <strong>${p.marco}</strong></div>
    <div class="spec-item"><span>Pies estimados:</span> <strong>${p.arboles || '-'}</strong></div>
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
          <span>${f.tipoFaena}</span>
          <span style="color:var(--text-muted); font-size:0.75rem;">${formatFecha(f.fecha)} · ${f.usuario}</span>
        </div>
        ${f.quimicoProducto ? `<div style="font-size:0.8rem; color:var(--citrus-light); margin-top:2px;">🧪 ${f.quimicoProducto} (${f.quimicoDosis})</div>` : ''}
        ${f.plagas && f.plagas.length ? `<div style="font-size:0.75rem; color:#fca5a5; margin-top:2px;">🐛 Plagas: ${f.plagas.join(', ')}</div>` : ''}
        ${f.notas ? `<div style="font-size:0.8rem; color:var(--text-muted); margin-top:4px;">"${f.notas}"</div>` : ''}
      </div>
    `).join('');
  }

  modal.classList.remove('hidden');
};

window.cerrarModalParcela = function() {
  document.getElementById('modal-detalle-parcela').classList.add('hidden');
};

// ============================================================================
// MODAL CREAR NUEVO HUERTO
// ============================================================================
window.abrirModalNuevaParcela = function() {
  document.getElementById('modal-crear-huerto').classList.remove('hidden');
};

window.cerrarModalCrearHuerto = function() {
  document.getElementById('modal-crear-huerto').classList.add('hidden');
};

window.guardarNuevoHuerto = function(e) {
  e.preventDefault();
  const nombre = document.getElementById('nuevo-huerto-nombre').value.trim();
  const superficie = document.getElementById('nuevo-huerto-superficie').value.trim();
  const variedad = document.getElementById('nuevo-huerto-variedad').value.trim();
  const patron = document.getElementById('nuevo-huerto-patron').value.trim();
  const marco = document.getElementById('nuevo-huerto-marco').value.trim();
  const ubicacion = document.getElementById('nuevo-huerto-ubicacion').value.trim();

  const nuevo = {
    id: 'p-' + Date.now(),
    nombre: nombre,
    superficie: superficie || 'No especificada',
    variedad: variedad || 'Variedad estándar',
    patron: patron || 'Sin especificar',
    marco: marco || 'Marco estándar',
    ubicacion: ubicacion,
    arboles: null
  };

  estado.parcelas.push(nuevo);
  guardarDatos();
  renderizarTodo();
  cerrarModalCrearHuerto();
  mostrarToast(`Huerto "${nombre}" guardado en el cuaderno de campo`);
};

// ============================================================================
// EXPORTACIÓN / IMPORTACIÓN DE COPIAS
// ============================================================================
window.exportarDatos = function() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(estado, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `huertos_carlos_respaldo_${new Date().toISOString().split('T')[0]}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  mostrarToast('Copia de seguridad descargada');
};

window.importarDatos = function(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);
      if (data.parcelas && Array.isArray(data.parcelas)) {
        estado.parcelas = data.parcelas;
      }
      if (data.faenas && Array.isArray(data.faenas)) {
        data.faenas.forEach(f => {
          f.estado = normalizarEstado(f.estado || 'Finalizadas');
        });
        estado.faenas = data.faenas;
      }
      guardarDatos();
      renderizarTodo();
      mostrarToast('¡Datos importados y actualizados con éxito!');
    } catch (err) {
      alert('Error: el archivo no tiene un formato JSON válido.');
    }
  };
  reader.readAsText(file);
};

window.restablecerDatosExcel = function() {
  if (confirm('¿Restablecer el cuaderno de campo con las 30 parcelas y faenas originales del Excel de Carlos?')) {
    localStorage.removeItem(STORAGE_KEY);
    cargarDatos();
    renderizarTodo();
    mostrarToast('¡Cuaderno de campo restaurado con el Excel de Carlos (30 huertos)!');
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

function mostrarToast(mensaje) {
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
