# 03. Estado Actual del Proyecto y Repositorio

Este documento describe el estado técnico y operativo exacto del proyecto `web-huertos-carlos` al término de la recopilación en Orca.

---

## 📦 Estructura del Repositorio Local

Ruta base local: `C:\Users\Jordi\orca\web-huertos-carlos`  
Junction en Orca: `C:\Users\Jordi\Documents\Orca\web-huertos-carlos`

```text
web-huertos-carlos/
├── index.html                   # Interfaz de usuario PWA (Muro, Fincas, Partes, Resumen)
├── styles.css                   # Hoja de estilos responsive móvil y componentes
├── app.js                       # Lógica JS: navegación por pestañas, renderizado y persistencia
├── datos_huertos.js             # Base de datos estática: 30 parcelas y 1.175 faenas (646 KB)
├── manifest.json                # Manifiesto PWA para instalación móvil
├── sw.js                        # Service Worker de caché para navegación offline
├── icon-192.png                 # Icono PWA (192x192)
├── icon-512.png                 # Icono PWA (512x512)
├── README.md                    # Descripción general del repositorio
├── .gitignore                   # Exclusiones de Git
├── .github/
│   └── workflows/
│       └── pages.yml            # Pipeline de GitHub Actions para despliegue en Pages
├── hardware/
│   └── esp32_huerto_carlos.ino  # Firmware IoT prototipo Fase 1 (ESP32 C++)
├── tools/
│   ├── huertos_carlos.xlsx      # Hoja de cálculo original descargada de Google Drive (199 KB)
│   └── procesar_excel_completo.py # Script extractor de Excel a datos_huertos.js
└── docs/
    └── traspaso-orca/           # Documentación centralizada del proyecto
```

---

## 🌿 Base de Datos Agrícola Cargada (`datos_huertos.js`)

Se procesaron y estructuraron **30 fincas reales** procedentes de las hojas de cálculo de Carlos:

| Nº | Nombre Finca | Cultivo Principal | Variedad | Patrón | Superficie |
|---|---|---|---|---|---|
| 1 | **Oliveres** | Olivar i Garroferes | - | - | 18.72 Fa (1.55 Ha) |
| 2 | **Armetler** | Armetlers | - | - | 10.90 Fa (0.90 Ha) |
| 3 | **Montanyeta** | Cítrics | Clemenalba | Citrumelo | 0.98 Ha |
| 4 | **Matella** | Cítrics | Clemenules | Carrizo | 3.52 Fa (0.29 Ha) |
| 5 | **Kakis** | Kakis | Rojo Brillante | Lotus | 6.00 Fa (0.50 Ha) |
| 6 | **Alq. Burriana** | Cítrics | Clemenules | Carrizo | 12.30 Fa (1.02 Ha) |
| 7 | **Hípica Balcó** | Cítrics | Clemenrubí | Macrophylla | 5.20 Fa (0.43 Ha) |
| 8 | **Vora riu** | Cítrics | Clemenules | Citrange | 7.80 Fa (0.65 Ha) |
| 9 | **Ort. Burriana** | Cítrics | Navel | Carrizo | 8.50 Fa (0.71 Ha) |
| 10 | **Invernadero** | Semilleros / Plantones | Diversas | - | 1.20 Fa (0.10 Ha) |
| 11 | **Ermita San Antoni** | Cítrics | Clemenules | Carrizo | 14.20 Fa (1.18 Ha) |
| 12 | **New Hall** | Cítrics | Newhall | Carrizo | 9.00 Fa (0.75 Ha) |
| 13 | **Manderí** | Cítrics | Mandarina Oronules | Citrumelo | 4.80 Fa (0.40 Ha) |
| 14 | **Crisu** | Cítrics | Clemenules | Carrizo | 6.30 Fa (0.52 Ha) |
| 15 | **Juncos** | Cítrics | Navelina | Carrizo | 11.00 Fa (0.91 Ha) |
| 16 | **Molineta** | Cítrics | Lane Late | Carrizo | 15.50 Fa (1.29 Ha) |
| 17 | **Bata** | Cítrics | Clemenules | Citrumelo | 8.20 Fa (0.68 Ha) |
| 18 | **Malafa** | Cítrics | Clemenules | Carrizo | 13.00 Fa (1.08 Ha) |
| 19 | **Xabrera** | Cítrics | Clemenules | Carrizo | 10.40 Fa (0.86 Ha) |
| 20 | **Campoi** | Cítrics | Valencia Late | Macrophylla | 7.10 Fa (0.59 Ha) |
| 21 | **Pepa** | Cítrics | Clemenules | Carrizo | 5.60 Fa (0.46 Ha) |
| 22 | **Carbó** | Cítrics | Clemenules | Citrange | 16.80 Fa (1.39 Ha) |
| 23 | **Collantes** | Cítrics | Navel de Foyos | Carrizo | 9.50 Fa (0.79 Ha) |
| 24 | **Palmera** | Cítrics | Clemenules | Carrizo | 6.90 Fa (0.57 Ha) |
| 25 | **Agut** | Cítrics | Clemenules | Carrizo | 8.80 Fa (0.73 Ha) |
| 26 | **Ratlla** | Cítrics | Oronules | Citrumelo | 4.20 Fa (0.35 Ha) |
| 27 | **Vila Roja** | Cítrics | Clemenules | Carrizo | 12.00 Fa (1.00 Ha) |
| 28 | **Fadrell** | Cítrics | Navelina | Carrizo | 7.50 Fa (0.62 Ha) |
| 29 | **21** | Cítrics | Clemenules | Carrizo | 21.00 Fa (1.74 Ha) |
| 30 | **Secà** | Olivar / Garrofer | Varias | Borde | 24.00 Fa (1.99 Ha) |

**Total de partes de faena cargados en el histórico:** **1.175 faenas**  
*(Abarcan tratamientos fitosanitarios, suelta de fauna útil, riegos, desbroces, podas y revisiones de 2024, 2025 y 2026).*

---

## 🪵 Historial de Versiones (Git Log)

El repositorio cuenta con 3 commits fundacionales en la rama `main`:

```text
874586e Cargar 30 huertos reales y 1175 faenas del Excel de Carlos con equipo C, JC, D
1b607b6 Adaptar app al flujo real de Carlos: cuaderno de campo multi-huerto, partes de faenas, tickmarks de plagas y acceso de 3 operarios
543472d Inicializar proyecto web huertos carlos: app PWA de control de huerto, telemetría y firmware IoT
```

- **Estado de Git:** Rama `main` limpia (`working tree clean`), sincronizada con `origin/main`.
- **Despliegue GitHub Pages:** Activo en `https://joorcs96.github.io/web-huertos-carlos/`.

---

## ⚙️ Registro del Entorno y Sistema Host

- **Registro de cambios en el host:** Anotado en `C:\Users\Jordi\Documents\registro-cambios-host.txt` (entradas 28 y correspondiente a este run).
- **Vínculo en Orca:** Registrado como repositorio de tipo `git` bajo el id `7803bfd8-3230-4d7d-92e9-f27717a447a1`.
- **Junction del explorador:** `C:\Users\Jordi\Documents\Orca\web-huertos-carlos` apunta a `C:\Users\Jordi\orca\web-huertos-carlos`.
