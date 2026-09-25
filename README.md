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

- **🔌 Conectividad IoT y Hardware Real:**
  - **Modo Simulación / Demo:** Permite probar todas las funcionalidades interactivamente sin hardware conectado.
  - **Modo ESP32 / IoT:** Conexión directa mediante API REST con un microcontrolador ESP32 conectado al WiFi del huerto.
  - Se incluye firmware completo y probado en `hardware/esp32_huerto_carlos.ino`.

---

## 📁 Estructura del Repositorio

```text
web-huertos-carlos/
├── index.html                  # Interfaz principal (Dashboard, Programador, Gráficas, IoT)
├── styles.css                  # Estilos responsivos modernos y diseño adaptado a móviles
├── app.js                      # Lógica de la app, simulación, temporizadores y cliente REST
├── manifest.json               # Configuración PWA para instalación móvil
├── sw.js                       # Service Worker para caché y modo offline
├── hardware/
│   └── esp32_huerto_carlos.ino # Firmware de ejemplo para ESP32 con servidor REST
├── .github/
│   └── workflows/
│       └── pages.yml           # Despliegue automático a GitHub Pages
├── .gitignore                  # Exclusiones de control de versiones
└── README.md                   # Documentación del proyecto
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
