# DESIGN.md : Ritmo · Habit Tracker & Coach Dinámico PWA

## 1. Design Read & Dirección Visual
> Reading this as: Aplicación móvil e instalable (PWA) de seguimiento de hábitos con clicker táctil, cuestionario inicial, tutorial guiado y reportes dinámicos locales para usuarios que buscan una experiencia cálida, simple y personalizable, in a Cozy Pastel Journal (Soft Tactile) style, dial ENERGY 2 / RHYTHM 2 / MOTION 1.

- **Producto:** Tracker diario de hábitos con función clicker/counter táctil (`+1`), mini cuestionario inicial de perfil, recorrido guiado interactivo, recordatorios por notificación, persistencia íntegra en memoria local (`localStorage` + `IndexedDB`) y motor local de informes dinámicos ("Coach de Hábitos").
- **Identidad estética:** *Cozy Pastel Journal*. Superficies de papel crema cálido, tarjetas táctiles en tonos pastel suaves con barra de progreso integrada al pie, logotipo propio con monograma **R** y flecha circular de ritmo, y acentos profundos que garantizan lectura nítida.
- **Three Dials (`antislop` Part 3):** `ENERGY 2 / RHYTHM 2 / MOTION 1`
  - **ENERGY 2 (Cálida y expresiva):** Las tarjetas pastel aportan calidez visual inmediata mientras el lienzo crema descansa la vista en el uso diario.
  - **RHYTHM 2 (Grilla táctil + paneles estructurados):** Alterna el banner de sugerencia dinámica, la grilla de tarjetas 2x2 (o lista 1x1 personalizable) y las vistas de estadísticas y widget móvil.
  - **MOTION 1 (Respuesta táctil funcional):** Micro-interacción física al sumar `+1` en cada tarjeta, foco visual en el tutorial guiado y apertura limpia de modales, respetando `prefers-reduced-motion: reduce`.

## 2. Excepciones Expresas del Propietario (`R-37` Conflict Protocol)
Siguiendo el protocolo `R-37` de `antislop`, se registran las directivas explícitas solicitadas por el propietario para este proyecto:
1. **`R-01` (Uso de paleta pastel):** El propietario solicitó mantener la estética con colores pastel personalizables tanto en las tarjetas de hábitos como en la interfaz general. Se implementa mediante 8 tonos pastel para tarjetas y 5 temas de interfaz (4 claros pastel + 1 modo oscuro pastel *Cozy Night*), todos calibrados con texto de tinta profunda para superar el contraste WCAG AA.
2. **`R-04` (Uso de emojis exclusivamente en las tarjetas):** El propietario indicó mantener los emojis únicamente en el contenido referido a las cards de hábitos y reemplazar por íconos vectoriales SVG limpios todas las demás secciones, ajustes y vistas.

## 3. Decisiones Fundamentales (1-Line Reasons, `R-31`)
- **Logotipo R + Flecha Rítmica (`assets/icon-192.svg` y Canvas PNG para Notificaciones):** Representa la inicial de *Ritmo* abrazada por una flecha cíclica ascendente que simboliza constancia diaria, usándose tanto en cabecera como en el ícono de alertas del sistema.
- **Fuente Unificada en Toda la App (`--font-app`: `Quicksand`, `Fraunces` o `Plus Jakarta Sans`):** Se aplica globalmente a todos los textos, títulos, botones, contadores y formularios para que el cambio de fuente desde Ajustes transforme el 100% de la interfaz.
- **Mini Cuestionario Inicial de Perfil (Nombre, Edad, Sexo y Enfoque):** Permite personalizar desde el primer ingreso el saludo, la concordancia y el enfoque de las sugerencias e informes dinámicos.
- **Tutorial Guiado Interactivo de 5 Pasos (Spotlight):** Destaca visualmente cada elemento clave del tablero en orden para que cualquier persona entienda al instante cómo usar la aplicación.
- **Botón `?` en Esquina Superior de Cada Tarjeta:** Indica de forma intuitiva que al presionarlo se abren las opciones particulares del hábito (estadísticas, corrección `-1`, recordatorios y edición).
- **Ajustes Simplificados y Libres de Jerga Técnica:** Centraliza únicamente el tema visual, la fuente global, la vista de tarjetas (2 columnas vs. lista), las alertas y el interruptor del cartel de Sugerencia IA, eliminando textos repetitivos y el pie de página.
- **Sección Widget Celular "Próximamente...":** Comunica con honestidad (`R-24`, `R-38`) que los widgets nativos fuera de la app están en preparación, ofreciendo mientras tanto el acceso directo PWA.

## 4. Tokens de Color Verificados (`contrast-check.py` WCAG AA)

### Temas de Interfaz
- **Sakura Cream (Predeterminado):** Lienzo `#FAF6F0` | Texto principal `#2A2421` (`14.21:1` PASS) | Texto secundario `#5C524D` (`7.04:1` PASS).
- **Matcha Latte:** Lienzo `#F4F8F4` | Texto principal `#232B25` (`13.56:1` PASS).
- **Lavender Cloud:** Lienzo `#F6F3FA` | Texto principal `#26212C` (`14.31:1` PASS).
- **Peach Milk:** Lienzo `#FDF6F2` | Texto principal `#2B221F` (`14.53:1` PASS).
- **Cozy Night (Modo Oscuro):** Lienzo `#1D1922` | Texto principal `#F5EFF7` (`15.04:1` PASS) | Texto secundario `#C8BED0` (`9.50:1` PASS).

### Tonos Pastel de Tarjetas (sobre texto `#2A2421` y acentos sobre `#FFFFFF`)
- **Cielo Pastel (`#EBF3FA`):** Texto `#2A2421` (`13.65:1` PASS) | Acento contador `#1E4F80` sobre pastilla blanca (`8.45:1` PASS).
- **Menta Suave (`#EAF5EC`):** Texto `#2A2421` (`13.67:1` PASS) | Acento contador `#1D5B3E` sobre pastilla blanca (`8.02:1` PASS).
- **Durazno Arena (`#F7EFE6`):** Texto `#2A2421` (`13.44:1` PASS) | Acento contador `#7A4313` sobre pastilla blanca (`7.96:1` PASS).
- **Lavanda Lila (`#F0EBF8`):** Texto `#2A2421` (`13.07:1` PASS) | Acento contador `#5B388C` sobre pastilla blanca (`8.79:1` PASS).
- **Rosa Sakura (`#FCE8EF`):** Texto `#2A2421` (`13.06:1` PASS) | Acento contador `#8F2D56` sobre pastilla blanca (`7.84:1` PASS).

## 5. Ergonomía Móvil y Accesibilidad (`R-03`, `R-32`, `R-39`)
- **Objetivos táctiles:** Área mínima de `44x44px` en todos los botones, selectores de íconos, selectores de color, pestañas y cierres de modal.
- **Teclado y foco:** Anillo `:focus-visible` de alto contraste (`>= 3:1`), cierre de modales y tutorial con tecla `Escape` y navegación lógica por `Tab`.
- **Tono verbal:** Español rioplatense cálido, claro y directo con voseo (*tocá*, *elegí*, *llevás*, *sumá*), sin guiones largos (`R-02`).
