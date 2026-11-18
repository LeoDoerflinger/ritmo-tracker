# DESIGN.md : Ritmo · Habit Tracker & Coach Dinámico PWA

## 1. Design Read & Dirección Visual
> Reading this as: Aplicación móvil e instalable (PWA) de seguimiento de hábitos con clicker táctil y reportes dinámicos locales para usuarias que buscan una experiencia cálida, motivadora y personalizable, in a Cozy Pastel Journal (Soft Tactile) style, dial ENERGY 2 / RHYTHM 2 / MOTION 1.

- **Producto:** Tracker diario de hábitos con función clicker/counter táctil (`+1`), vista de widget móvil, recordatorios por notificación, persistencia íntegra en memoria local (`localStorage` + `IndexedDB`) y motor local de informes dinámicos ("Coach de Hábitos").
- **Identidad estética:** *Cozy Pastel Journal*. Superficies de papel crema cálido, tarjetas táctiles en tonos pastel suaves con barra de progreso integrada al pie, tipografía redondeada amigable y acentos profundos que garantizan lectura nítida.
- **Three Dials (`antislop` Part 3):** `ENERGY 2 / RHYTHM 2 / MOTION 1`
  - **ENERGY 2 (Cálida y expresiva):** Las tarjetas pastel aportan calidez visual inmediata mientras el lienzo crema descansa la vista en el uso diario.
  - **RHYTHM 2 (Grilla táctil + paneles estructurados):** Alterna el banner de sugerencia dinámica, la grilla de tarjetas 2x2 (o lista 1x1 personalizable) y las vistas de estadísticas y widget móvil.
  - **MOTION 1 (Respuesta táctil funcional):** Micro-interacción física al sumar `+1` en cada tarjeta y apertura limpia de modales, respetando `prefers-reduced-motion: reduce`.

## 2. Excepciones Expresas del Propietario (`R-37` Conflict Protocol)
Siguiendo el protocolo `R-37` de `antislop`, se registran las directivas explícitas solicitadas por el usuario para este proyecto:
1. **`R-01` (Uso de paleta pastel):** El propietario solicitó explícitamente mantener la estética *"girlie"* con colores pastel personalizables tanto en las tarjetas de hábitos como en la interfaz general. Se implementa mediante un sistema de 8 tonos pastel para tarjetas y 5 temas de interfaz (4 claros pastel + 1 modo oscuro pastel *Cozy Night*), todos calibrados con texto de tinta profunda para superar el contraste WCAG AA.
2. **`R-04` (Uso de emojis en tarjetas e íconos de hábitos):** El propietario solicitó explícitamente conservar los emojis como identificadores visuales de cada hábito y en la experiencia de coaching. Se restringen a selectores funcionales de hábitos e indicadores semánticos, manteniendo la interfaz de controles libre de ruido decorativo.

## 3. Decisiones Fundamentales (1-Line Reasons, `R-31`)
- **Display & UI Font (`Plus Jakarta Sans`, alternativa `Fraunces` y `DM Sans`):** Ofrece curvas amigables y legibilidad óptima en pantallas móviles pequeñas, permitiendo además cambiar el estilo tipográfico desde el menú de personalización.
- **Tabular Numbers (`JetBrains Mono` / `tabular-nums`):** Evita saltos horizontales en los contadores diarios (`2 / 6 hoy`), rachas y porcentajes al incrementar cada toque.
- **Grilla de Tarjetas Clicker 2x2 con Barra de Progreso Inferior:** Permite registrar `+1` con el pulgar en cualquier parte de la tarjeta mientras la barra inferior muestra el avance hacia la meta diaria sin saturar la pantalla.
- **Menú de Personalización de Interfaz (Hamburguesa / Albóndiga):** Centraliza los ajustes de tema visual (5 paletas incluyendo modo oscuro), tipografía, disposición de tarjetas (2 columnas vs. 1 columna), radio de bordes y sonido táctil.
- **Motor Local de Coaching Dinámico (`CoachEngine`):** Reemplaza llamadas a una IA externa por un analizador estadístico local que procesa los timestamps reales del usuario para redactar sugerencias e informes personalizados sin requerir conexión ni API keys.
- **Persistencia Dual (`localStorage` + `IndexedDB`) y Respaldo JSON:** Garantiza que cada toque, hábito y ajuste permanezca en memoria del dispositivo de forma permanente, con opción de exportar e importar copias de seguridad.
- **Arquitectura PWA sin Scripts Bloqueantes (`R-40`):** Se reemplaza el script CDN de Tailwind en `<head>` por una hoja de estilos nativa modular (`css/styles.css`) cacheada por `sw.js`, logrando renderizado instantáneo y funcionamiento 100% offline.

## 4. Tokens de Color Verificados (`contrast-check.py` WCAG AA)

### Temas de Interfaz
- **Sakura Cream (Predeterminado):** Lienzo `#FAF6F0` | Texto principal `#2A2421` (`14.21:1` PASS) | Texto secundario `#5C524D` (`7.04:1` PASS).
- **Matcha Latte:** Lienzo `#F4F8F4` | Texto principal `#232B25` (`13.56:1` PASS).
- **Lavender Cloud:** Lienzo `#F6F3FA` | Texto principal `#26212C` (`14.31:1` PASS).
- **Peach Milk:** Lienzo `#FDF6F2` | Texto principal `#2B221F` (`14.53:1` PASS).
- **Cozy Night (Modo Oscuro):** Lienzo `#1E1B22` | Texto principal `#F5EFF7` (`15.04:1` PASS) | Texto secundario `#C8BED0` (`9.50:1` PASS).

### Tonos Pastel de Tarjetas (sobre texto `#2A2421` y acentos sobre `#FFFFFF`)
- **Cielo Pastel (`#EBF3FA`):** Texto `#2A2421` (`13.65:1` PASS) | Acento contador `#1E4F80` sobre pastilla blanca (`8.45:1` PASS).
- **Menta Suave (`#EAF5EC`):** Texto `#2A2421` (`13.67:1` PASS) | Acento contador `#1D5B3E` sobre pastilla blanca (`8.02:1` PASS).
- **Durazno Arena (`#F7EFE6`):** Texto `#2A2421` (`13.44:1` PASS) | Acento contador `#7A4313` sobre pastilla blanca (`7.96:1` PASS).
- **Lavanda Lila (`#F0EBF8`):** Texto `#2A2421` (`13.07:1` PASS) | Acento contador `#5B388C` sobre pastilla blanca (`8.79:1` PASS).
- **Rosa Sakura (`#FCE8EF`):** Texto `#2A2421` (`13.06:1` PASS) | Acento contador `#8F2D56` sobre pastilla blanca (`7.84:1` PASS).

## 5. Ergonomía Móvil y Accesibilidad (`R-03`, `R-32`, `R-39`)
- **Objetivos táctiles:** Área mínima de `44x44px` en todos los botones, selectores de íconos, selectores de color, pestañas y cierres de modal.
- **Teclado y foco:** Anillo `:focus-visible` de alto contraste (`>= 3:1`), cierre de todos los modales con tecla `Escape` y navegación lógica por `Tab`.
- **Tono verbal:** Español rioplatense cálido y natural con voseo (*tocá*, *elegí*, *llevás*, *sumá*), sin guiones largos (`R-02`).
