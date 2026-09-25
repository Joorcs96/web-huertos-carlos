# 05. Inventario de Fuentes, Enlaces y Activos

Este documento recoge el inventario exhaustivo de todos los archivos, scripts, fuentes de datos, enlaces externos y registros del sistema vinculados al proyecto **El huerto de Carlos**.

---

## 🗂️ Inventario de Archivos del Repositorio

| Archivo / Carpeta | Tamaño | Descripción y Propósito |
|---|---|---|
| `index.html` | ~14.8 KB | Interfaz de usuario PWA con las vistas de Muro, Huertos, Registro y Resumen |
| `styles.css` | ~16.2 KB | Estilos visuales móviles, componentes de tarjetas, tickmarks y botones |
| `app.js` | ~24.7 KB | Controlador de la aplicación, gestión de usuarios, filtros y persistencia |
| `datos_huertos.js` | ~646.2 KB | Base de datos compilada en JS con las 30 fincas y 1.175 partes históricos |
| `manifest.json` | 622 B | Manifiesto PWA para instalación en Android / iOS como app nativa |
| `sw.js` | ~1.45 KB | Service Worker para almacenamiento en caché y navegación sin cobertura |
| `icon-192.png` | 595 B | Icono de la aplicación para pantalla de inicio (192x192 px) |
| `icon-512.png` | ~2.2 KB | Icono de alta resolución para la pantalla de inicio (512x512 px) |
| `README.md` | ~4.3 KB | Documentación inicial del repositorio en la raíz |
| `.gitignore` | 139 B | Reglas de exclusión de Git |
| `.github/workflows/pages.yml` | ~1.2 KB | Pipeline de GitHub Actions para despliegue automático en GitHub Pages |
| `tools/huertos_carlos.xlsx` | 199.7 KB | Archivo Excel original descargado de Google Drive con las 30 hojas de Carlos |
| `tools/procesar_excel_completo.py` | ~8.7 KB | Script en Python (`openpyxl`) para convertir `huertos_carlos.xlsx` a `datos_huertos.js` |
| `hardware/esp32_huerto_carlos.ino` | ~7.8 KB | Código firmware C++ para microcontrolador ESP32 (servidor REST y sensores) |
| `docs/traspaso-orca/` | - | Carpeta con la documentación consolidada del proyecto |

---

## 🌐 Enlaces Externos y Recursos Cloud

| Recurso | Tipo | URL |
|---|---|---|
| **Hoja de Cálculo de Carlos** | Google Sheets / Excel | [Google Sheets de Carlos](https://docs.google.com/spreadsheets/d/1VdwySr7lgyl_1V3BaGewtA8xG7r6TGHT/edit?usp=sharing&ouid=113320678983791802319&rtpof=true&sd=true) |
| **Aplicación en Producción** | GitHub Pages | [https://joorcs96.github.io/web-huertos-carlos/](https://joorcs96.github.io/web-huertos-carlos/) |
| **Repositorio de Código** | GitHub | [https://github.com/Joorcs96/web-huertos-carlos](https://github.com/Joorcs96/web-huertos-carlos) |

---

## 💾 Registro de Sesiones y Logs de Orca en el Host

Las transcripciones íntegras de las sesiones se encuentran conservadas en las siguientes rutas locales:

1. **Sesión Principal de Definición y Datos (`1207025e`):**  
   `C:\Users\Jordi\.gemini\antigravity-cli\brain\1207025e-2e5d-43bb-81e0-9851032a87ec\.system_generated\logs\transcript.jsonl`
2. **Sesión de Inicialización y Repositorio (`fb4ee9c8`):**  
   `C:\Users\Jordi\.gemini\antigravity-cli\brain\fb4ee9c8-ac17-438c-8aaf-64cca6841d26\.system_generated\logs\transcript.jsonl`
3. **Sesión de Requerimiento DevOps (`376c34f0`):**  
   `C:\Users\Jordi\.gemini\antigravity-cli\brain\376c34f0-edac-4c85-96a5-e6ab9d0b0df6\.system_generated\logs\transcript.jsonl`
4. **Sesión Coordinadora Codex (`01a0d835`):**  
   `C:\Users\Jordi\.codex\sessions\2026\09\25\rollout-2026-09-25T12-56-39-01a0d835-cca4-7503-8acf-3b17b0f5451b.jsonl`
5. **Sesión del Worker de Traspaso (`fc45a96f`):**  
   `C:\Users\Jordi\.gemini\antigravity-cli\brain\fc45a96f-e4a1-4f51-b45e-a29219e3b8f5\.system_generated\logs\transcript.jsonl`

---

## 🔒 Preservación de Seguridad y Privacidad

- **Ausencia de secretos:** No se han almacenado claves de API, tokens de GitHub ni credenciales privadas en el repositorio.
- **Conservación de fuentes:** Se conserva íntegro el archivo original `tools/huertos_carlos.xlsx` sin alteración alguna de sus datos originales.
- **Ruta de acceso en Orca:**
  - Repositorio Orca ID: `7803bfd8-3230-4d7d-92e9-f27717a447a1`
  - Junction: `C:\Users\Jordi\Documents\Orca\web-huertos-carlos`
