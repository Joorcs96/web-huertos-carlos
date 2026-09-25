# 📋 Traspaso y Organización de Información de Orca: El Huerto de Carlos

Documentación centralizada del proyecto **El huerto de Carlos** (`web-huertos-carlos`), recopilada y organizada a partir de todas las sesiones de trabajo, requerimientos del usuario, audios, chats y decisiones técnicas registrados en Orca y el host remoto.

---

## 🧭 Índice de la Documentación

1. [**01. Historial de Conversaciones y Sesiones**](file:///C:/Users/Jordi/orca/web-huertos-carlos/docs/traspaso-orca/01-historial-y-conversaciones.md)
   - Cronología completa de sesiones de trabajo (`1207025e`, `fb4ee9c8`, `376c34f0`, `01a0d835`).
   - Transcripción y desglose de las notas de voz de Carlos.
   - Transcripción de mensajes de WhatsApp de Carlos.
   - Instrucciones directas de Jordi a los agentes de IA.

2. [**02. Requerimientos Funcionales y Decisiones Técnicas**](file:///C:/Users/Jordi/orca/web-huertos-carlos/docs/traspaso-orca/02-requerimientos-y-decisiones-tecnicas.md)
   - Objetivos operativos del equipo (Carlos, Juan Carlos, Diego).
   - Evolución del sistema: del prototipo inicial de riego IoT (ESP32) al cuaderno de campo agrícola para 30 fincas.
   - Decisiones de arquitectura: Mobile-First PWA, selección rápida de usuario sin login complejo inicial, ingesta estática del Excel.

3. [**03. Estado Actual del Proyecto y Repositorio**](file:///C:/Users/Jordi/orca/web-huertos-carlos/docs/traspaso-orca/03-estado-actual-del-proyecto.md)
   - Componentes construidos y activos en el repositorio.
   - Base de datos actual: 30 fincas reales y 1.175 partes de faena históricos.
   - Historial de commits de Git y despliegue activo en GitHub Pages.
   - Integración local en Orca (repositorio y junction).

4. [**04. Tareas Pendientes y Roadmap de Desarrollo**](file:///C:/Users/Jordi/orca/web-huertos-carlos/docs/traspaso-orca/04-tareas-pendientes-y-roadmap.md)
   - Peticiones expresas de Jordi y Carlos pendientes de implementar:
     - Muro de faenas estilo DevOps / Kanban (agrupado por años/meses; columnas Pendiente, En curso, Finalizada).
     - Exportación y descarga de informes en PDF con plantilla autorrellenable.
     - Sincronización bidireccional entre la Web y el Excel de Google Drive.
     - Sistema avanzado de mezclas químicas y fitosanitarios.
     - Gestión formal de usuarios y seguridad tras la fase de pruebas.
     - Feed de notificaciones en tiempo real.

5. [**05. Inventario de Fuentes, Enlaces y Activos**](file:///C:/Users/Jordi/orca/web-huertos-carlos/docs/traspaso-orca/05-inventario-fuentes-y-activos.md)
   - Inventario detallado de archivos, scripts y hojas de cálculo.
   - URLs externas (Google Sheets, GitHub Pages, repositorio GitHub).
   - Comprobación de integridad de enlaces locales.

6. [**Informe Ejecutivo de Traspaso**](file:///C:/Users/Jordi/orca/web-huertos-carlos/docs/traspaso-orca/informe-traspaso.md)
   - Resumen para el coordinador y Jordi con hallazgos, validaciones y limitaciones identificadas.

---

## ⚖️ Separación de Hechos e Inferencias

Para garantizar rigor técnico y honestidad operativa, se delimita claramente la información recuperada:

### Hechos Probados (Comprobados documentalmente en sesiones y archivos)
- **Existencia del repositorio y código:** El repositorio `web-huertos-carlos` fue creado el 25/09/2026 a las 11:15 (hora local), añadido a Orca y vinculado a `https://github.com/Joorcs96/web-huertos-carlos`.
- **Despliegue operativo:** La aplicación está desplegada en GitHub Pages (`https://joorcs96.github.io/web-huertos-carlos/`).
- **Base de datos extraída:** Se descargó el archivo Excel de Carlos desde Google Drive (`huertos_carlos.xlsx`), procesándose mediante `tools/procesar_excel_completo.py` para generar `datos_huertos.js`, que contiene **30 fincas** y **1.175 registros de faenas**.
- **Equipo operativo:** El equipo de trabajo habitual está formado por Carlos (C), Juan Carlos (JC) y Diego (D).
- **Peticiones registradas:** Existen peticiones textuales explícitas de Jordi solicitando:
  1. PDF descargable de informes.
  2. Muro de faenas estilo DevOps (columnas pendiente / en curso / finalizada y agrupación temporal).
  3. Sincronización del Excel con la web.

### Inferencias (Deducciones lógicas a partir del contexto)
- **Evolución del alcance:** La creación inicial del proyecto con un dashboard IoT de 4 bancales y firmware ESP32 respondió a una orden genérica ("web para controlar el huerto"), mientras que el audio posterior de Carlos clarificó que no se trataba de un riego de jardín, sino de un cuaderno de campo profesional para explotación citrícola y frutal.
- **Petición "deploy en reddit":** Se infiere con certeza un error de autocorrector en el móvil por "deploy en red / web" (la web ya estaba en GitHub Pages).
- **Tratamientos químicos T22:** Carlos mencionó "Los quimicos los pongo en T22 por ejemplo porque eso ya lo tengo en otro archivo". Se infiere que Carlos mantiene una codificación interna o tablas de mezclas fitosanitarias complejas que por ahora no están en el Excel principal y requerirán un módulo auxiliar.

---

## ⚠️ Límites de Cobertura de la Recuperación

- **Archivos de audio crudos:** No se han encontrado archivos `.mp3`, `.wav` o notas de voz en crudo en el sistema de archivos del host. Lo que se ha recuperado es la transcripción íntegra que el usuario transcribió y envió en las sesiones de chat de Orca.
- **Historial de chat móvil fuera de Orca:** Si Carlos y Jordi mantuvieron más audios o textos de WhatsApp que no fueron pegados en Orca por Jordi, no están accesibles en este host. La cobertura abarca el 100% de lo comunicado dentro de Orca y los archivos locales del repositorio.
