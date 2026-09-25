const assert = require('assert');
const fs = require('fs');
const path = require('path');

// 1. Cargar HuertoSecurity
const HuertoSecurity = require('../security.js');

console.log('=== TEST 1: Sanitización Anti-XSS ===');
{
  const vector1 = '<script>alert("xss")</script>';
  const escaped1 = HuertoSecurity.escapeHtml(vector1);
  assert.strictEqual(escaped1, '&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;');
  assert(!escaped1.includes('<script>'), 'No debe contener tags HTML');

  const vector2 = '"><img src=x onerror=alert(1)>';
  const escaped2 = HuertoSecurity.escapeHtml(vector2);
  assert(!escaped2.includes('<img'), 'No debe contener tags de imagen no cerrados');
  assert(escaped2.includes('&quot;&gt;&lt;img'), 'Debe escapar comillas y corchetes');

  const safeId = HuertoSecurity.sanitizeId('f-1234"><script>');
  assert.strictEqual(safeId, 'f-1234___script_');
  assert(!safeId.includes('<') && !safeId.includes('"'), 'ID no debe contener caracteres no alfanuméricos');

  const badUrl = HuertoSecurity.sanitizeUrl('javascript:alert(document.cookie)');
  assert.strictEqual(badUrl, '', 'URL javascript: debe ser bloqueada y quedar vacía');

  const goodUrl = HuertoSecurity.sanitizeUrl('https://joorcs96.github.io/web-huertos-carlos/');
  assert.strictEqual(goodUrl, 'https://joorcs96.github.io/web-huertos-carlos/');

  console.log('✅ Anti-XSS verificado correctamente.');
}

console.log('\n=== TEST 2: Defensa contra Prototype Pollution ===');
{
  const maliciousJson = '{"__proto__": {"isAdmin": true}, "constructor": {"prototype": {"hacked": true}}, "nombre": "Huerto Seguro"}';
  const parsed = HuertoSecurity.safeJsonParse(maliciousJson);

  assert.strictEqual(({}).isAdmin, undefined, 'Prototype Pollution en __proto__ no debe contaminar Object.prototype');
  assert.strictEqual(({}).hacked, undefined, 'Prototype Pollution en constructor.prototype no debe contaminar Object.prototype');
  assert.strictEqual(parsed.nombre, 'Huerto Seguro', 'Debe conservar datos legítimos');

  console.log('✅ Prototype Pollution bloqueado con éxito.');
}

console.log('\n=== TEST 3: Prevención de Inyección de Fórmulas CSV / Excel ===');
{
  const testCases = [
    { input: '=1+1', expectedStart: "'=" },
    { input: '+cmd|"/c calc"!A1', expectedStart: "'+cmd" },
    { input: '-2+3*cmd', expectedStart: "'-2" },
    { input: '@SUM(1,2)', expectedStart: "'@SUM" },
    { input: '\t=HYPERLINK("http://evil.com")', expectedStart: "'=" },
    { input: 'Normal text', expectedStart: 'Normal' }
  ];

  testCases.forEach(tc => {
    const sanitized = HuertoSecurity.sanitizeCsvCell(tc.input);
    assert(sanitized.startsWith(`"${tc.expectedStart}`) || sanitized.startsWith(`"Normal`), `Fórmula no neutralizada: ${sanitized}`);
  });

  console.log('✅ Inyección de fórmulas CSV neutralizada correctamente.');
}

console.log('\n=== TEST 4: Validación de Esquemas y Whitelisting ===');
{
  // Faena válida
  const faenaValida = {
    fecha: '2026-09-25',
    hora: '10:30',
    usuario: 'Carlos',
    parcelaId: 'p-oliveres',
    parcelaNombre: 'Oliveres',
    tipoFaena: 'Riego y Abonado',
    estado: 'Finalizadas',
    plagas: ['Trip', 'Mosca blanca'],
    hierba: 'Limpio',
    notas: 'Todo en perfecto estado'
  };
  const validada = HuertoSecurity.validateFaena(faenaValida);
  assert.strictEqual(validada.fecha, '2026-09-25');
  assert.strictEqual(validada.estado, 'Finalizadas');
  assert.strictEqual(validada.plagas.length, 2);
  assert(validada._seguridad && validada._seguridad.integridadLocal === true);

  // Fecha inválida
  let falloFecha = false;
  try {
    HuertoSecurity.validateFaena({ fecha: '25/09/2026' });
  } catch (e) {
    falloFecha = true;
  }
  assert(falloFecha, 'Debe rechazar formatos de fecha no conformes con YYYY-MM-DD');

  // Parcela válida
  const parcela = HuertoSecurity.validateParcela({ nombre: 'Parcela Nueva <script>' });
  assert.strictEqual(parcela.nombre, 'Parcela Nueva', 'Debe desinfectar tags del nombre');

  console.log('✅ Validación de esquemas confirmada.');
}

console.log('\n=== TEST 5: Integridad Criptográfica SHA-256 ===');
(async () => {
  const hash1 = await HuertoSecurity.computeSha256('texto-de-prueba');
  const hash2 = await HuertoSecurity.computeSha256('texto-de-prueba');
  const hash3 = await HuertoSecurity.computeSha256('texto-de-prueba-alterado');

  assert.strictEqual(hash1, hash2, 'Mismo contenido debe generar mismo hash');
  assert.notStrictEqual(hash1, hash3, 'Contenido alterado debe generar hash diferente');
  assert(hash1.length >= 16, 'Hash debe ser una cadena hexadecimal');

  console.log('✅ Hashing de integridad SHA-256 verificado.');

  console.log('\n=== TEST 6: Sintaxis de Archivos del Proyecto ===');
  // Verificar sintaxis de app.js y sw.js
  const appJsCode = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  new Function(appJsCode.replace(/^import\s.*/gm, '')); // Check for syntax errors

  const swJsCode = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');
  new Function(swJsCode);

  console.log('✅ Sintaxis de app.js y sw.js validada sin errores.');

  console.log('\n=============================================');
  console.log('🎉 TODOS LOS TESTS DE CIBERSEGURIDAD PASARON.');
  console.log('=============================================');
})();
