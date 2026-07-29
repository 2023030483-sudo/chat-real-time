# Pendiente para réplica visual exacta

La lógica funcional ya está separada del diseño. Para reproducir las pantallas píxel por píxel se requieren:

- Capturas o exportaciones PNG/PDF de cada pantalla de Figma.
- Estado normal, vacío, error y carga cuando existan.
- Recursos originales: logotipo, iconos personalizados, ilustraciones y tipografías.
- Captura del flujo interactivo de Stitch si contiene animaciones o transiciones especiales.

Con esos archivos se ajustará principalmente `src/index.css` y, cuando sea necesario, la composición JSX de `src/components`.
