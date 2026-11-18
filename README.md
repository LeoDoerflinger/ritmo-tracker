# Ritmo · Habit Tracker & Coach Diario (PWA)

Aplicación web progresiva (PWA) orientada a dispositivos móviles para el seguimiento diario de hábitos mediante tarjetas táctiles tipo *clicker / counter*, personalización integral de estética pastel e interfaz, recordatorios con notificaciones y un motor local de análisis y coaching dinámico con persistencia permanente en memoria.

Diseñada siguiendo las especificaciones documentadas en [`DESIGN.md`](./DESIGN.md), cumpliendo contraste WCAG AA verificado, objetivos táctiles mínimos de `44x44px` y arquitectura 100% offline sin scripts bloqueantes.

---

## Características Principales

### 1. Clicker Táctil de Hábitos con Estética Pastel
* **Suma en un toque (`+1`):** Tocá cualquier tarjeta de la grilla para registrar un avance al instante, acompañado de animación de respuesta física, indicador visual `+1`, sonido suave sintetizado (Web Audio API) y barra de progreso integrada al pie de cada tarjeta.
* **Deshacer rápido (`-1`):** Cada vez que sumás un registro aparece un aviso inferior con el botón **Deshacer**, además de un control `-1 Corregir hoy` dentro del detalle del hábito por si tocaste de más.
* **Personalización por tarjeta:** Al crear o editar un hábito podés elegir entre 8 tonos pastel (*Blanco Nube*, *Menta Pastel*, *Arena Durazno*, *Cielo Pastel*, *Rosa Sakura*, *Lavanda Suave*, *Manteca Limón* y *Coral Peonía*), 12 íconos predefinidos o cualquier emoji personalizado, y un objetivo diario ajustable de `1` a `20` repeticiones.

### 2. Menú de Personalización de Interfaz (Menú Hamburguesa)
* **5 Temas de color para la app:**
  1. **Sakura Cream** (Crema cálido y rosa empolvado, predeterminado)
  2. **Matcha Latte** (Lino verdoso y verde salvia)
  3. **Lavender Cloud** (Bruma lila y ciruela suave)
  4. **Peach Milk** (Durazno cremoso y coral tostado)
  5. **Cozy Night** (Modo oscuro pastel de alto contraste para uso nocturno)
* **3 Estilos tipográficos:** *Redondeada* (`Plus Jakarta Sans`), *Editorial* (`Fraunces` + `Plus Jakarta Sans`) y *Minimal* (`DM Sans`).
* **Configuración de layout y geometría:** Alterná entre vista en **Grilla de 2 columnas** o **Lista de 1 columna**, y bordes **Squircle (`28px`)** o **Clásicos (`16px`)**.

### 3. Motor Local de Informes Dinámicos ("Coach de Hábitos IA")
* **Sin dependencia de servidores ni API keys:** El módulo `CoachEngine` (`js/coach.js`) analiza en tiempo real todos los registros guardados en memoria para redactar reportes dinámicos.
* **Banner de Sugerencia Inteligente en Inicio:** Compara el rendimiento de la semana pasada contra el progreso de hoy, detecta qué hábito está a un solo toque de cumplir su meta y ofrece un botón de acción directa.
* **Modal "Coach de Hábitos IA" (`Resumen IA`):**
  * Permite elegir entre 3 personalidades de informe: **Motivador**, **Directo** y **Calma Zen**.
  * Identifica tu **Hábito Estrella** de los últimos 30 días, el balance semanal y tu **Horario Pico de Energía** (*Mañana*, *Tarde* o *Noche*) según la hora real de cada toque.

### 4. Sistema de Recordatorios y Notificaciones
* **Programación por hábito:** Activá alertas eligiendo horario (`HH:MM`), días específicos de la semana (`L M X J V S D`) y un mensaje motivador personalizado.
* **Notificaciones nativas + Aviso interno:** Integración con la API de Notificaciones Web y Service Worker (`showNotification`), acompañada de un botón **"Probar notificación"** en el menú de ajustes y alertas visuales/sonoras dentro de la aplicación.

### 5. Persistencia Permanente en Memoria y Estadísticas
* **Doble capa de memoria (`localStorage` + `IndexedDB`):** Cada hábito, configuración y registro con fecha y hora exacta se almacena automáticamente en `localStorage` y se respalda en `IndexedDB` (`RitmoTrackerDB`) para que nunca se pierda al cerrar el navegador o reiniciar el teléfono.
* **Respaldo portátil (`.json`):** Opción para exportar todos tus datos en un archivo `.json` y restaurarlos cuando quieras.
* **Estadísticas detalladas por hábito y globales:** Gráficos de barras de los últimos 7 días, rachas de días consecutivos, desglose por franja horaria y ranking mensual.

### 6. Modo PWA Instalable + Tutorial Paso a Paso para Newbies
* **Funcionamiento 100% Offline:** Incluye `manifest.webmanifest` y Service Worker (`sw.js`) que guarda en caché toda la aplicación para usarla sin conexión a internet.
* **Guía interactiva para principiantes:** Modal dedicado (**"Instalá la App en tu Celu 📱"**) con instrucciones ilustradas paso a paso para **iPhone (Safari)**, **Android (Chrome)** y consejos sobre cómo usarla en red local o instalarla en un toque.

---

## Estructura del Proyecto

```text
ritmo-tracker/
├── assets/
│   ├── icon-192.svg           # Ícono PWA pastel 192x192
│   └── icon-512.svg           # Ícono PWA pastel 512x512
├── css/
│   └── styles.css             # Sistema de diseño, 5 temas, grillas responsivas y accesibilidad
├── js/
│   ├── storage.js             # Motor de persistencia (localStorage + IndexedDB) y cálculo estadístico
│   ├── coach.js               # Generador local de reportes dinámicos y sugerencias contextuales
│   ├── notifications.js       # Planificador de recordatorios, Web Notifications API y audio Web Audio
│   └── app.js                 # Controlador de interfaz, eventos, modales, widgets y flujo PWA
├── index.html                 # Estructura semántica HTML5
├── manifest.webmanifest       # Manifiesto de instalación PWA y accesos rápidos
├── sw.js                      # Service Worker para soporte offline y notificaciones
├── DESIGN.md                  # Especificación de diseño y tokens verificados bajo antislop
└── README.md                  # Documentación general del proyecto
```

---

## Ejecución Local (PC y Celular)

1. Abrí una terminal en la carpeta del proyecto:
   ```bash
   cd ritmo-tracker
   ```
2. Iniciá un servidor local (necesario para habilitar el Service Worker de la PWA):
   ```bash
   python -m http.server 8090
   ```
3. Ingresá desde tu navegador en:
   * **En tu computadora:** `http://localhost:8090`
   * **En tu celular (conectado al mismo Wi-Fi):** `http://<TU-IP-LOCAL>:8090`

---

## Autor y Desarrollo

Adaptación, arquitectura PWA y sistema de personalización desarrollados por **Leopoldo Doerflinger** (Córdoba, Argentina).
* **GitHub:** [github.com/LeoDoerflinger](https://github.com/LeoDoerflinger)
