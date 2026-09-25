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

// 1. Renderizar Feed de Faenas
function renderizarFeed(filtroHuerto = 'todos', filtroUsuario = 'todos') {
  const container = document.getElementById('feed-container');
  const countBadge = document.getElementById('count-faenas');
  if (!container) return;

  let faenasFiltradas = [...estado.faenas].sort((a, b) => {
    return new Date(`${b.fecha} ${b.hora || '12:00'}`) - new Date(`${a.fecha} ${a.hora || '12:00'}`);
  });

  if (filtroHuerto !== 'todos') {
    faenasFiltradas = faenasFiltradas.filter(f => f.parcelaId === filtroHuerto);
  }
  if (filtroUsuario !== 'todos') {
    faenasFiltradas = faenasFiltradas.filter(f => f.usuarioId === filtroUsuario || f.usuario === filtroUsuario);
  }

  if (countBadge) {
    countBadge.innerText = `${faenasFiltradas.length} parte(s)`;
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

  container.innerHTML = '';
  faenasFiltradas.forEach(f => {
    const card = document.createElement('div');
    card.className = 'feed-card';

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

    card.innerHTML = `
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
    `;
    container.appendChild(card);
  });
}

window.filtrarFeedPorHuerto = function(huertoId) {
  const usuario = document.getElementById('filtro-usuario-feed')?.value || 'todos';
  renderizarFeed(huertoId, usuario);
};

window.filtrarFeedPorUsuario = function(usuarioId) {
  const huerto = document.getElementById('filtro-huerto-feed')?.value || 'todos';
  renderizarFeed(huerto, usuarioId);
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

  mostrarToast(`¡Faena registrada con éxito en ${nuevaFaena.parcelaNombre}!`);

  // Limpiar formulario y volver al feed
  document.getElementById('form-faena').reset();
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
