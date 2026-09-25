# 🌿 Huerto de Carlos (Web Huertos Carlos)

Aplicación web moderna, ligera y responsive (PWA) diseñada para que Carlos pueda monitorizar y controlar el riego de su huerto de forma remota desde el móvil o el ordenador.

---

## 🚀 Características Principales

- **📱 Experiencia Mobile-First (PWA):**
  - Diseñada especialmente para ser utilizada cómodamente desde el teléfono móvil con una sola mano.
  - Compatible con "Añadir a pantalla de inicio" (PWA con Service Worker y `manifest.json`) para abrirse a pantalla completa como una app nativa sin barra del navegador.
  - Funcionamiento offline y carga ultra-rápida.

- **💧 Monitorización y Control por Bancales / Sectores:**
  - **Bancal A:** Tomates y Pimientos (medición de humedad de suelo, temperatura de raíz y control de electroválvula).
  - **Bancal B:** Hojas Verdes (Lechugas, Acelgas, Espinacas).
  - **Sector C:** Frutales y Cítricos (Limonero, Naranjo, Olivo).
  - **Sector D:** Plantas Aromáticas (Romero, Lavanda, Tomillo, Albahaca).
  - Riego manual instantáneo con temporizadores rápidos: **2 min**, **5 min**, **10 min**.
  - Botón de **Parada de Emergencia** que cierra de inmediato todas las válvulas en un solo toque.

- **🚰 Nivel de Depósito y Consumo:**
  - Indicador visual en tiempo real de litros disponibles en el depósito de agua y porcentaje restante.
  - Cálculo de consumo acumulado en litros durante el día.

- **⏰ Programador Inteligente:**
  - Horarios de riego automáticos configurables por días de la semana y duración.
  - Lógica de protección: corte por depósito bajo (<15%) y prevención de sobre-riego.

- **📊 Telemetría y Gráficas:**
  - Gráficas interactivas con la curva de absorción hídrica de cada bancal en las últimas 24 horas.
  - Histórico de riegos ejecutados (hora, duración, litros y tipo).

- **🛡️ Ciberseguridad Integral & Cero Fugas de Datos:**
  - **Aislamiento Local (Zero Data Leak):** Los datos agrícolas de Carlos permanecen 100% en el dispositivo; sin rastreadores, sin cookies de terceros ni telemetría externa.
  - **Directivas CSP Estrictas:** Cabeceras y metaetiquetas `Content-Security-Policy`, anti-clickjacking (`X-Frame-Options: DENY`) y `X-Content-Type-Options: nosniff`.
  - **Integridad Criptográfica SHA-256:** Verificación de integridad de la base de datos local en `localStorage` con detección automática de manipulaciones externas o corrupción.
  - **Sanitización Anti-XSS:** Todas las variables dinámicas se codifican e higienizan antes de insertarse en el DOM.
  - **Defensa contra Prototype Pollution:** Parser JSON seguro que neutraliza inyecciones en `__proto__`, `constructor` o `prototype`.
  - **Prevención de Inyección CSV:** Exportaciones CSV protegidas contra ejecución de fórmulas maliciosas en Microsoft Excel o LibreOffice.
  - **Modo Privacidad en Campo (PIN):** Bloqueo opcional de la sesión mediante PIN de 4 dígitos para proteger el teléfono en el huerto.

- **🔌 Conectividad IoT y Hardware Seguro:**
  - **Modo ESP32 / IoT Protegido:** Conexión mediante API REST con autenticación por clave de seguridad (`X-Huerto-Key`), restricción de orígenes CORS, limitador de tasa (Rate Limiting) y Watchdog de seguridad (corte automático a los 15 min para evitar sobre-riego o inundaciones).
  - Firmware disponible en `hardware/esp32_huerto_carlos.ino`.

---

## 📁 Estructura del Repositorio

```text
web-huertos-carlos/
├── index.html                  # Interfaz principal PWA y panel de ciberseguridad
├── styles.css                  # Estilos responsivos, Kanban y componentes de seguridad
├── security.js                 # Motor de ciberseguridad (Anti-XSS, SHA-256, Anti-CSV injection)
├── app.js                      # Lógica de la app, persistencia con integridad y renderizado
├── datos_huertos.js            # Base de datos inicial (30 parcelas y 1.175 faenas del Excel)
├── manifest.json               # Configuración PWA para instalación móvil
├── sw.js                       # Service Worker con caché aislada y modo offline seguro
├── hardware/
│   └── esp32_huerto_carlos.ino # Firmware seguro para ESP32 con autenticación y watchdog
├── tools/
│   ├── test_security.js        # Suite de pruebas automatizadas de ciberseguridad
│   ├── huertos_carlos.xlsx     # Hoja de cálculo original de campo
│   └── procesar_excel_completo.py # Script de extracción de datos
├── .github/
│   └── workflows/
│       └── pages.yml           # Despliegue automático a GitHub Pages
├── .gitignore                  # Exclusiones de control de versiones
└── README.md                   # Documentación técnica del proyecto
```

---

## 🛠️ Conexión con Hardware (ESP32)

En la carpeta `hardware/esp32_huerto_carlos.ino` se proporciona el código C++ para el microcontrolador ESP32.

### Componentes necesarios:
1. Placa ESP32 (NodeMCU, WROOM o similar).
2. Módulo de 4 relés de 5V (conectados a electroválvulas de 12V/24V).
3. 4 sensores capacitivos de humedad de suelo v1.2 (resistentes a la corrosión).
4. Sensor ambiental DHT22 o BME280 (temperatura y humedad exterior).
5. Sensor de ultrasonidos HC-SR04 o sensor de presión diferencial para medir el nivel del depósito.

### Endpoints REST del ESP32:
- `GET /api/estado`: Devuelve un JSON con el estado de los sensores y electroválvulas.
- `POST /api/riego`: Recibe un JSON `{"zona": 1, "activar": true, "minutos": 5}` para controlar el riego.

---

## 🌐 Despliegue en GitHub Pages

El proyecto está listo para ejecutarse directamente en **GitHub Pages**:
1. En GitHub, entra en `Settings` > `Pages`.
2. En `Source`, selecciona `Deploy from a branch` y elige la rama `main` (carpeta `/root`).
3. La aplicación estará accesible en: `https://joorcs96.github.io/web-huertos-carlos/`

---

Desarrollado para Carlos con tecnología web moderna y de código abierto.
