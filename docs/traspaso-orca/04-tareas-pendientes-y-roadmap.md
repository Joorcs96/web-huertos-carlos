# 04. Tareas Pendientes y Roadmap de Desarrollo

Este documento detalla todas las peticiones funcionales y mejoras solicitadas formalmente por **Jordi** y **Carlos** en las sesiones de Orca que están pendientes de implementación técnica en la aplicación.

---

## 📌 Lista Priorizada de Tareas Pendientes

### 1. Reorganización del Muro de Faenas estilo DevOps / Kanban
- **Origen de la petición:**
  - Sesión `1207025e` (10:44 UTC): *"la pagina de carlos el muro de faenas e sun ocoo caotico yo lo ordnearia por meses y años y haria algo medologia estilo dev oos que hayan varias columnas de pendiente, tareas en curso y finalizadas"*
  - Sesión `376c34f0` (10:54 UTC): *"no veo que haya hecho lo que he dicho de muro de faenas que se agrupe meses y años y tareas como devops una de pendiente otra tareas en curso y otras finalizadas"*
- **Estado actual:** El muro de faenas muestra una lista vertical cronológica inversa con filtro por huerto y operario, pero no agrupa por año/mes ni cuenta con estados tipo tablero DevOps.
- **Acción requerida:**
  1. Añadir selector o acordeón por **Año** (2026, 2025, 2024...) y **Mes** (Enero, Febrero...).
  2. Implementar vista en 3 columnas o estados:
     - 🟡 **Pendientes** (tareas programadas o tratamientos prescritos pendientes de aplicar).
     - 🔵 **En curso** (labores iniciadas o en proceso esa semana).
     - 🟢 **Finalizadas** (faenas ejecutadas e históricas con fecha de realización).
  3. Permitir arrastrar o cambiar de estado con un clic desde el móvil.

---

### 2. Generador y Descarga de Informes en PDF (`Mis Informes`)
- **Origen de la petición:**
  - Sesión `1207025e` (10:29 UTC): *"acuerdate de hacer la funcion de mis informes y todo lo que me ha dicho carlos que quiere que pueda generar un pdf y lo descargas de la web que hemos creado, que haya una pestaña y que rellene con los datos, comprueba que funciona todo y desde el movil funcione todo bien"*
- **Estado actual:** No existe aún una pestaña de informes ni motor de exportación a PDF en la web.
- **Acción requerida:**
  1. Crear una nueva pestaña en el menú inferior: `📄 Informes PDF`.
  2. Plantilla oficial de "Informe de Explotación / Cuaderno de Campo" que permita seleccionar:
     - Finca / Parcela concreta o informe global.
     - Rango de fechas (último mes, trimestre, campaña anual).
     - Secciones a incluir: datos baseline de la parcela, histórico de tratamientos fitosanitarios aplicados, control de plagas y estado de la plantación.
  3. Botón de descarga directa en PDF (`jsPDF` o generador vía CSS de impresión `window.print()` optimizado para móvil) con maquetación limpia y cabecera profesional.

---

### 3. Sincronización Bidireccional entre la Web y el Excel
- **Origen de la petición:**
  - Sesión `fb4ee9c8` (10:19 UTC): *"es importante que el excel y la web esten sincronizados y que se actualice el excel con los datos introducidos en la web..."*
- **Estado actual:** La web lee una instantánea estática del Excel volcada en `datos_huertos.js`. Los nuevos datos registrados en el móvil se guardan en el `localStorage` local del dispositivo y no se reflejan automáticamente en el archivo `.xlsx` de Google Drive.
- **Acción requerida (Opciones técnicas evaluadas):**
  - **Opción A (Inmediata y offline):** Botón "Exportar nuevas faenas a Excel / CSV" para descargar un archivo con los partes registrados desde el móvil.
  - **Opción B (Integración en la nube):** Conectar la PWA con un Google Apps Script vinculado a la hoja de cálculo de Google Drive (`1VdwySr7lgyl_1V3BaGewtA8xG7r6TGHT`) para enviar un `POST` JSON cada vez que un operario guarde una faena, añadiendo la fila automáticamente a la pestaña correspondiente.

---

### 4. Módulo de Tratamientos Químicos y Mezclas Fitosanitarias
- **Origen de la petición:**
  - WhatsApp de Carlos (Sesión `1207025e` 09:31 UTC): *"Los quimicos los pongo en T22 por ejemplo porque eso ya lo tengo en otro archivo... El tema quimico es mas complicado porque el objetivo puede ser el mismo pero la mezcla quimica cambia"*
- **Estado actual:** El formulario de faena cuenta con un campo de texto libre para químicos.
- **Acción requerida:**
  1. Incorporar selector de códigos estándar de tratamiento (T1, T2, T22, etc.).
  2. Solicitar o recuperar la tabla auxiliar de recetas/mezclas químicas de Carlos para permitir selección de productos comerciales, materias activas, dosis por 1.000 L de cuba y plazos de seguridad.

---

### 5. Feed de Notificaciones Colaborativas
- **Origen de la petición:**
  - Audio de Carlos (Sesión `1207025e` 09:19 UTC): *"que haya como una interfaz que, conforme se va añadiendo, aparece como una notificación, como tal persona ha subido tal informe... ver cuáles son los últimos huertos que se ha ido"*
- **Acción requerida:**
  - Banner o lista destacada de "Últimas visitas en las últimas 48h" en la pantalla de inicio para saber de inmediato qué compañero estuvo recientemente en qué huerto.

---

### 6. Autenticación y Cuentas de Usuario Formales
- **Origen de la petición:**
  - Jordi (10:19 UTC): *"de momento no pongas usuario para iniciar sesion eso lo haremos cuando ya este todo montado primero quiero hacer pruebas"*
- **Acción requerida:**
  - En la fase actual se mantiene la selección directa de perfil (Carlos, Juan Carlos, Diego). Una vez validadas las funciones de campo, se puede incorporar un PIN numérico de 4 dígitos o autenticación simple para evitar ediciones accidentales entre operarios.

---

### 7. Configuración de Cuenta de Correo Gmail del Proyecto
- **Origen de la petición:**
  - Carlos por WhatsApp (09:31 UTC): *"Si puedes crea un correo de Gmail"*
- **Acción requerida:**
  - Crear o asociar una cuenta de Google (ej. `huertocarloscampo@gmail.com` o similar) para centralizar la propiedad del Google Sheet, scripts de sincronización y almacenamiento de copias de seguridad.
## Actualización del 25/09/2026

La reorganización del Muro de Faenas ya está implementada en `index.html`, `app.js` y `styles.css`: agrupa por año y mes, muestra las columnas Pendientes, En curso y Finalizadas, y persiste los cambios de estado en `localStorage`. Las faenas históricas se consideran Finalizadas por defecto.
