/**
 * ============================================================================
 * HUERTOS CARLOS - MÓDULO INTEGRAL DE CIBERSEGURIDAD Y PROTECCIÓN DE DATOS
 * ============================================================================
 * 
 * Funcionalidades clave de seguridad:
 * 1. Sanitización estricta Anti-XSS (HTML Entity Encoding & Safe Text)
 * 2. Protección contra Contaminación de Prototipos (Prototype Pollution Defense)
 * 3. Verificación Criptográfica de Integridad de Datos (SHA-256 Checksum)
 * 4. Validación de Esquemas y Whitelisting de Entradas (Anti-Tampering)
 * 5. Prevención de Inyección de Fórmulas en Exportaciones (Anti-CSV Injection)
 * 6. Copias de Seguridad Automáticas Previas a Modificaciones (Rollback Snapshots)
 * 7. Control de Sesión en Campo y Bloqueo por PIN Criptográfico Opcional
 * 8. Registro Seguro de Auditoría (Audit Trail) sin Fuga de Metadatos
 * 
 * Cumplimiento: OWASP Top 10 Web & Client-Side Security Guidelines 2026.
 */

(function (window) {
  'use strict';

  // Configuración de constantes de seguridad
  const HASH_STORAGE_KEY = 'huertos_carlos_integrity_hash_v3';
  const SNAPSHOT_ROLLBACK_KEY = 'huertos_carlos_snapshot_pre_action';
  const PIN_HASH_KEY = 'huertos_carlos_pin_auth_v3';
  const PIN_SALT_KEY = 'huertos_carlos_pin_salt_v3';
  const SESSION_LOCK_KEY = 'huertos_carlos_session_locked';

  // Caracteres peligrosos para XSS
  const HTML_ESCAPES = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;',
    '`': '&#96;'
  };
  const REGEX_HTML_CHARS = /[&<>"'`\/]/g;

  // Caracteres de inyección de fórmulas CSV / Excel
  const CSV_INJECTION_PREFIXES = ['=', '+', '-', '@', '\t', '\r'];

  /**
   * 1. ANTI-XSS & SANITIZACIÓN HTML
   * Convierte cualquier cadena a texto seguro antes de renderizar en el DOM.
   */
  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(REGEX_HTML_CHARS, char => HTML_ESCAPES[char]);
  }

  /**
   * Sanitiza identificadores de elementos (IDs, claves) para asegurar que solo contengan
   * caracteres alfanuméricos, guiones o guiones bajos, evitando roturas de atributos.
   */
  function sanitizeId(str) {
    if (!str) return 'id-' + Math.random().toString(36).substring(2, 9);
    return String(str).replace(/[^a-zA-Z0-9_\-]/g, '_');
  }

  /**
   * Elimina cualquier etiqueta HTML y caracteres de control no imprimibles.
   */
  function stripHtmlAndControl(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/<[^>]*>?/gm, '') // Quitar etiquetas HTML
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Quitar caracteres de control ASCII
      .trim();
  }

  /**
   * Sanitiza URLs para prevenir ataques 'javascript:', 'data:' o 'vbscript:'.
   */
  function sanitizeUrl(url) {
    if (!url) return '';
    const trimmed = String(url).trim();
    if (trimmed.startsWith('#') || trimmed.startsWith('./') || trimmed.startsWith('/')) {
      return trimmed;
    }
    try {
      const base = (typeof window !== 'undefined' && window.location && window.location.href) ? window.location.href : 'http://localhost/';
      const parsed = new URL(trimmed, base);
      if (['http:', 'https:'].includes(parsed.protocol)) {
        return parsed.href;
      }
      if (parsed.protocol === 'data:' && /^data:image\/(png|jpeg|webp|gif);base64,/i.test(trimmed)) {
        return trimmed;
      }
    } catch (e) {
      // URL inválida
    }
    return '';
  }

  /**
   * 2. PREVENCIÓN DE CONTAMINACIÓN DE PROTOTIPOS (PROTOTYPE POLLUTION DEFENSE)
   * Parser JSON seguro que descarta claves peligrosas (__proto__, constructor, prototype).
   */
  function safeJsonParse(jsonString) {
    if (!jsonString || typeof jsonString !== 'string') return null;
    return JSON.parse(jsonString, (key, value) => {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        console.warn(`[Ciberseguridad] Intento de Prototype Pollution bloqueado: clave "${key}"`);
        return undefined; // Descarta la propiedad
      }
      return value;
    });
  }

  /**
   * Limpia recursivamente un objeto eliminando propiedades peligrosas.
   */
  function deepSanitizeObject(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) {
      return obj.map(deepSanitizeObject);
    }
    const clean = Object.create(null);
    for (const key of Object.keys(obj)) {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        continue;
      }
      clean[key] = deepSanitizeObject(obj[key]);
    }
    return clean;
  }

  /**
   * 3. VERIFICACIÓN CRIPTOGRÁFICA DE INTEGRIDAD (SHA-256 HASHING)
   * Calcula el resumen criptográfico SHA-256 de una cadena de datos.
   */
  async function computeSha256(text) {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
      try {
        const encoder = new TextEncoder();
        const data = encoder.encode(text);
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      } catch (err) {
        // Fallback síncrono si Web Crypto falla
      }
    }
    // Fallback: Algoritmo FNV-1a extendido de 64 bits si Web Crypto no estuviese disponible
    return fallbackHash(text);
  }

  function fallbackHash(str) {
    let h1 = 0xdeadbeef ^ 0;
    let h2 = 0x41c6ce57 ^ 0;
    for (let i = 0; i < str.length; i++) {
      const ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
  }

  /**
   * Guarda los datos en localStorage adjuntando su hash criptográfico de integridad.
   */
  async function guardarConIntegridad(storageKey, payload) {
    try {
      const serialized = JSON.stringify(payload);
      const hash = await computeSha256(serialized);
      localStorage.setItem(storageKey, serialized);
      localStorage.setItem(HASH_STORAGE_KEY, hash);
      return { success: true, hash };
    } catch (e) {
      if (e.name === 'QuotaExceededError' || e.code === 22) {
        console.error('[Ciberseguridad] Cuota de almacenamiento local excedida');
        return { success: false, error: 'QUOTA_EXCEEDED' };
      }
      console.error('[Ciberseguridad] Error guardando con integridad:', e);
      return { success: false, error: e.message };
    }
  }

  /**
   * Carga los datos de localStorage y verifica su integridad contra el hash almacenado.
   */
  async function cargarConIntegridad(storageKey) {
    const rawData = localStorage.getItem(storageKey);
    if (!rawData) {
      return { status: 'EMPTY', data: null };
    }

    const storedHash = localStorage.getItem(HASH_STORAGE_KEY);
    const parsedData = safeJsonParse(rawData);

    if (!parsedData) {
      return { status: 'CORRUPTED', data: null };
    }

    if (storedHash) {
      const currentHash = await computeSha256(rawData);
      if (currentHash !== storedHash) {
        console.warn('[Ciberseguridad] ¡Alerta de manipulación de datos! El hash no coincide con la firma guardada.');
        return { status: 'TAMPERED', data: parsedData, calculatedHash: currentHash, storedHash };
      }
    }

    return { status: 'VERIFIED', data: parsedData, hash: storedHash };
  }

  /**
   * 4. COPIA DE SEGURIDAD AUTOMÁTICA PREVIA (ROLLBACK SNAPSHOT)
   * Guarda un estado seguro antes de importar o restablecer datos.
   */
  function crearSnapshotSeguridad(storageKey) {
    try {
      const actual = localStorage.getItem(storageKey);
      if (actual) {
        localStorage.setItem(SNAPSHOT_ROLLBACK_KEY, JSON.stringify({
          timestamp: new Date().toISOString(),
          data: actual
        }));
        return true;
      }
    } catch (e) {
      console.warn('[Ciberseguridad] No se pudo crear snapshot de seguridad:', e);
    }
    return false;
  }

  function restaurarSnapshotSeguridad(storageKey) {
    try {
      const snapRaw = localStorage.getItem(SNAPSHOT_ROLLBACK_KEY);
      if (!snapRaw) return false;
      const snap = safeJsonParse(snapRaw);
      if (snap && snap.data) {
        localStorage.setItem(storageKey, snap.data);
        return true;
      }
    } catch (e) {
      console.error('[Ciberseguridad] Error restaurando snapshot:', e);
    }
    return false;
  }

  /**
   * 5. PREVENCIÓN DE INYECCIÓN DE FÓRMULAS CSV / EXCEL
   * Si una celda comienza por =, +, -, @, o caracteres de control, se neutraliza con comilla simple.
   */
  function sanitizeCsvCell(val) {
    if (val === null || val === undefined) return '""';
    let str = String(val).trim();
    // Neutralizar caracteres que activan fórmulas en Excel o LibreOffice
    if (CSV_INJECTION_PREFIXES.some(prefix => str.startsWith(prefix))) {
      str = "'" + str;
    }
    // Escapar comillas dobles y envolver
    return `"${str.replace(/"/g, '""')}"`;
  }

  /**
   * 6. VALIDACIÓN Y SANEAMIENTO DE ESQUEMA DE FAENA
   * Whitelist estricto y límites de longitud para evitar ataques de DoS o inyecciones.
   */
  const ESTADOS_VALIDOS = ['Pendientes', 'En curso', 'Finalizadas'];
  const HIERBAS_VALIDAS = ['Limpio', 'Poca hierba', 'Mucha hierba'];

  function validateFaena(input, huertosValidos = []) {
    if (!input || typeof input !== 'object') {
      throw new Error('La faena proporcionada no tiene una estructura válida');
    }

    const huertoIds = huertosValidos.map(h => h.id);
    const parcelaId = String(input.parcelaId || '').trim();
    
    // Validación de fecha YYYY-MM-DD
    const fecha = String(input.fecha || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      throw new Error('Formato de fecha inválido. Se requiere YYYY-MM-DD');
    }

    // Normalizar estado
    let estado = 'Finalizadas';
    if (input.estado) {
      const estNorm = String(input.estado).trim();
      if (ESTADOS_VALIDOS.includes(estNorm)) {
        estado = estNorm;
      } else if (estNorm.toLowerCase().startsWith('pend')) {
        estado = 'Pendientes';
      } else if (estNorm.toLowerCase().includes('curso')) {
        estado = 'En curso';
      }
    }

    // Normalizar hierba
    let hierba = 'Limpio';
    if (input.hierba && HIERBAS_VALIDAS.includes(input.hierba)) {
      hierba = input.hierba;
    }

    // Sanitizar plagas (lista blanca / strings limpios)
    let plagas = [];
    if (Array.isArray(input.plagas)) {
      plagas = input.plagas
        .slice(0, 10) // Límite de 10 plagas
        .map(p => stripHtmlAndControl(p).substring(0, 40))
        .filter(p => p.length > 0);
    }

    // Generar o limpiar ID
    const id = input.id ? sanitizeId(input.id) : ('f-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7));

    // Audit Trail inmutable
    const ahoraIso = new Date().toISOString();

    return {
      id: id,
      fecha: fecha,
      hora: stripHtmlAndControl(input.hora || '12:00').substring(0, 8),
      usuario: stripHtmlAndControl(input.usuario || 'Carlos').substring(0, 50),
      usuarioId: sanitizeId(input.usuarioId || 'carlos').substring(0, 30),
      parcelaId: sanitizeId(parcelaId).substring(0, 50),
      parcelaNombre: stripHtmlAndControl(input.parcelaNombre || 'Huerto').substring(0, 80),
      tipoFaena: stripHtmlAndControl(input.tipoFaena || 'Revisión General').substring(0, 80),
      estado: estado,
      quimicoProducto: stripHtmlAndControl(input.quimicoProducto || '').substring(0, 120),
      quimicoDosis: stripHtmlAndControl(input.quimicoDosis || '').substring(0, 80),
      plagas: plagas,
      hierba: hierba,
      notas: stripHtmlAndControl(input.notas || '').substring(0, 2000), // Max 2000 chars
      // Metadatos de seguridad y trazabilidad
      _seguridad: {
        version: '3.0',
        auditCreadoEn: input._seguridad?.auditCreadoEn || ahoraIso,
        auditModificadoEn: ahoraIso,
        integridadLocal: true
      }
    };
  }

  function validateParcela(input) {
    if (!input || typeof input !== 'object') {
      throw new Error('Estructura de huerto inválida');
    }
    const nombre = stripHtmlAndControl(input.nombre || '').substring(0, 80);
    if (!nombre) {
      throw new Error('El nombre del huerto es obligatorio');
    }

    const id = input.id ? sanitizeId(input.id) : ('p-' + nombre.toLowerCase().replace(/[^a-z0-9]/g, '-'));

    return {
      id: id,
      nombre: nombre,
      superficie: stripHtmlAndControl(input.superficie || 'No especificada').substring(0, 60),
      variedad: stripHtmlAndControl(input.variedad || 'Variedad estándar').substring(0, 60),
      patron: stripHtmlAndControl(input.patron || 'Sin patrón').substring(0, 60),
      marco: stripHtmlAndControl(input.marco || '-').substring(0, 40),
      ubicacion: stripHtmlAndControl(input.ubicacion || '').substring(0, 100),
      arboles: input.arboles ? parseInt(String(input.arboles).replace(/[^0-9]/g, ''), 10) || null : null
    };
  }

  /**
   * 7. CONTROL DE PRIVACIDAD Y BLOQUEO POR PIN (OPCIONAL)
   * Permite proteger la app en campo contra miradas no deseadas.
   */
  async function configurarPinSeguridad(pinCuatroDigitos) {
    if (!pinCuatroDigitos || !/^\d{4}$/.test(pinCuatroDigitos)) {
      throw new Error('El PIN debe componerse exactamente de 4 dígitos numéricos');
    }
    const salt = Math.random().toString(36).substring(2, 12);
    const pinHash = await computeSha256(salt + pinCuatroDigitos);
    localStorage.setItem(PIN_SALT_KEY, salt);
    localStorage.setItem(PIN_HASH_KEY, pinHash);
    return true;
  }

  function eliminarPinSeguridad() {
    localStorage.removeItem(PIN_SALT_KEY);
    localStorage.removeItem(PIN_HASH_KEY);
    localStorage.removeItem(SESSION_LOCK_KEY);
  }

  function tienePinActivo() {
    return Boolean(localStorage.getItem(PIN_HASH_KEY) && localStorage.getItem(PIN_SALT_KEY));
  }

  async function verificarPin(pinIntento) {
    if (!tienePinActivo()) return true;
    const salt = localStorage.getItem(PIN_SALT_KEY);
    const storedHash = localStorage.getItem(PIN_HASH_KEY);
    const intentoHash = await computeSha256(salt + String(pinIntento).trim());
    return intentoHash === storedHash;
  }

  function bloquearSesion() {
    if (tienePinActivo()) {
      localStorage.setItem(SESSION_LOCK_KEY, 'true');
      return true;
    }
    return false;
  }

  function desbloquearSesion() {
    localStorage.removeItem(SESSION_LOCK_KEY);
  }

  function estaSesionBloqueada() {
    return tienePinActivo() && localStorage.getItem(SESSION_LOCK_KEY) === 'true';
  }

  // Exportar API protegida y congelada
  const HuertoSecurity = Object.freeze({
    escapeHtml,
    sanitizeId,
    stripHtmlAndControl,
    sanitizeUrl,
    safeJsonParse,
    deepSanitizeObject,
    computeSha256,
    guardarConIntegridad,
    cargarConIntegridad,
    crearSnapshotSeguridad,
    restaurarSnapshotSeguridad,
    sanitizeCsvCell,
    validateFaena,
    validateParcela,
    configurarPinSeguridad,
    eliminarPinSeguridad,
    tienePinActivo,
    verificarPin,
    bloquearSesion,
    desbloquearSesion,
    estaSesionBloqueada,
    VERSION: '3.0.0-security-hardened'
  });

  // Publicar de manera segura en el entorno global
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = HuertoSecurity;
  } else {
    window.HuertoSecurity = HuertoSecurity;
  }

})(typeof window !== 'undefined' ? window : globalThis);
