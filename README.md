# Ritmo · Habit Tracker & Coach Diario (PWA)

Aplicación web progresiva (PWA) orientada a dispositivos móviles para el seguimiento diario de hábitos mediante tarjetas táctiles tipo *clicker / counter*, cuestionario inicial de perfil, tutorial guiado interactivo, personalización de estética pastel e interfaz, recordatorios con notificaciones y un motor local de análisis y coaching dinámico.

Diseñada siguiendo las especificaciones documentadas en [`DESIGN.md`](./DESIGN.md), cumpliendo contraste WCAG AA verificado, objetivos táctiles mínimos de `44x44px` y arquitectura 100% offline.

---

## Características Principales

### 1. Mini Cuestionario de Bienvenida y Tutorial Guiado Interactivo
* **Perfil personalizado antes de entrar al tablero:** Al iniciar por primera vez (o tocando el saludo / botón *Editar perfil*), el usuario completa su **nombre**, **edad**, **sexo/género** y **enfoque principal** (*Bienestar y salud*, *Energía y movimiento*, *Calma y descanso* o *Lectura y enfoque*).
* **Recorrido guiado paso a paso (Spotlight):** Un tutorial interactivo de 5 pasos resalta en pantalla cómo sumar `+1`, dónde encontrar las opciones y estadísticas de cada tarjeta (`?`), cómo consultar el Resumen IA, cómo crear nuevos hábitos (`+`) y dónde ajustar la interfaz o instalar la app.

### 2. Clicker Táctil de Hábitos con Botón `?` de Opciones y Estadísticas
* **Suma en un toque (`+1`):** Tocá cualquier tarjeta de la grilla para registrar un avance al instante, acompañado de animación táctil, sonido suave sintetizado y barra de progreso inferior.
* **Botón `?` en cada tarjeta:** Ubicado en la esquina superior derecha de cada card para abrir sus opciones particulares: estadísticas (Hoy, Semana, Mes, Racha), gráfico de los últimos 7 días, botón `-1 Corregir hoy`, configuración de recordatorios y edición o eliminación del hábito.
* **Emojis reservados a las tarjetas:** Los emojis se mantienen exclusivamente como identificadores de las tarjetas de hábitos, utilizando íconos vectoriales SVG limpios en el resto de la interfaz.

### 3. Ajustes Simplificados y Cambio de Fuente en Toda la App
* **5 Temas de color para la interfaz:** *Sakura Cream*, *Matcha Latte*, *Lavender Cloud*, *Peach Milk* y *Cozy Night* (Modo Oscuro).
* **Cambio de fuente global:** Las 3 opciones (*Redondeada*, *Editorial* y *Moderna*) aplican la tipografía a **todos los textos, títulos, números y botones** de la aplicación.
* **Vista de tarjetas:** Selector directo entre **Cuadrícula (2 columnas)** y **Lista (1 columna)**.
* **Control del cartel de Sugerencia IA:** Botón `✕` funcional para ocultar la sugerencia del inicio (con opción rápida de deshacer) y botón directo en Ajustes para mostrarla u ocultarla cuando quieras.

### 4. Nuevo Logotipo `R` + Flecha Rítmica y Notificaciones
* **Identidad visual propia:** Monograma **R** integrado con una flecha circular ascendente que representa el ritmo y la constancia diaria, aplicado en la cabecera, pantallas de bienvenida, manifiesto PWA e ícono renderizado en las notificaciones del sistema.

### 5. Instalación Móvil User-Friendly y Sección Widget "Próximamente..."
* **Guía de instalación sin tecnicismos:** Pasos directos para **iPhone (Safari)** y **Android (Chrome)** junto al botón **Instalar Ritmo ahora**.
* **Pestaña Widget Celular:** Presenta el adelanto **Próximamente...** para los futuros widgets nativos de pantalla de inicio, acompañado de un acceso directo para instalar la PWA.

---

## Estructura del Proyecto

```text
ritmo-tracker/
├── assets/
│   ├── icon-192.svg           # Logotipo R + flecha rítmica 192x192
│   └── icon-512.svg           # Logotipo R + flecha rítmica 512x512
├── css/
│   └── styles.css             # Sistema de diseño, 5 temas, fuentes globales y spotlight del tour
├── js/
│   ├── storage.js             # Persistencia (localStorage + IndexedDB), perfil y estadísticas
│   ├── coach.js               # Generador local de reportes dinámicos adaptados al perfil
│   ├── notifications.js       # Alertas programables, ícono R en Canvas PNG y audio Web Audio
│   └── app.js                 # Controlador de cuestionario, tutorial guiado, tarjetas y PWA
├── index.html                 # Estructura semántica HTML5
├── manifest.webmanifest       # Manifiesto de instalación PWA
├── sw.js                      # Service Worker para soporte offline y notificaciones
├── DESIGN.md                  # Especificación de diseño y tokens verificados bajo antislop
└── README.md                  # Documentación general del proyecto
```

---

## Ejecución Local

1. Abrí una terminal en la carpeta del proyecto:
   ```bash
   cd ritmo-tracker
   ```
2. Iniciá un servidor local:
   ```bash
   python -m http.server 8090
   ```
3. Ingresá en `http://localhost:8090`.

---

## Autor y Desarrollo

Adaptación, arquitectura PWA y sistema de personalización desarrollados por **Leopoldo Doerflinger** (Córdoba, Argentina).
* **GitHub:** [github.com/LeoDoerflinger](https://github.com/LeoDoerflinger)
