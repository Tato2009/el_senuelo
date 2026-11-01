/* El Señuelo · Casa de Pesca — catálogo
 *
 * Lee data/productos.json y data/sitio.json y arma la página.
 * Todo lo que viene de los archivos se escribe con textContent (nunca como HTML)
 * y las imágenes solo se aceptan si están dentro de img/productos/.
 */
(() => {
  'use strict';

  const RUTA_FOTO_SIN_IMAGEN = 'img/sin-foto.jpg';
  const FOTO_VALIDA = /^img\/productos\/[A-Za-z0-9 _().,\-\/áéíóúüñÁÉÍÓÚÜÑ]+\.(?:jpe?g|png|webp|gif|avif)$/i;
  const POCAS_UNIDADES = 5;
  const ORDEN_CATEGORIAS = ['Combos', 'Cañas', 'Reels', 'Señuelos', 'Anzuelos', 'Líneas y accesorios', 'Indumentaria', 'Otros'];
  const URL_MAPA = 'https://www.google.com/maps?output=embed&q=';

  const $ = (id) => document.getElementById(id);

  const estado = {
    productos: [],
    sitio: { nombre: 'El Señuelo', subtitulo: 'Casa de Pesca', whatsapp: '', telefono: '', direccion: '' },
    categoria: 'Todas',
  };

  const formatoNumero = new Intl.NumberFormat('es-UY', { maximumFractionDigits: 2 });

  /* ---------- Datos ---------- */

  function texto(valor, max) {
    return typeof valor === 'string' ? valor.trim().slice(0, max) : '';
  }

  function digitos(valor) {
    return String(valor || '').replace(/\D/g, '');
  }

  function numero(valor) {
    if (valor === null || valor === '' || typeof valor === 'boolean') return null;
    const n = Number(valor);
    return Number.isFinite(n) && n >= 0 ? n : null;
  }

  function rutaImagen(valor) {
    const ruta = texto(valor, 200).replace(/^\/+/, '');
    if (!ruta || ruta.includes('..') || !FOTO_VALIDA.test(ruta)) return '';
    return encodeURI(ruta);
  }

  function limpiarProducto(p) {
    if (!p || typeof p !== 'object' || p.visible === false) return null;
    const nombre = texto(p.nombre, 120);
    if (!nombre) return null;
    const stock = numero(p.stock);
    return {
      nombre,
      categoria: texto(p.categoria, 40) || 'Otros',
      precio: numero(p.precio),
      moneda: p.moneda === 'US$' ? 'US$' : '$U',
      stock: stock === null ? null : Math.floor(stock),
      descripcion: texto(p.descripcion, 1000),
      imagen: rutaImagen(p.imagen),
    };
  }

  function limpiarSitio(datos) {
    const d = datos && typeof datos === 'object' ? datos : {};
    return {
      nombre: texto(d.nombre, 60) || estado.sitio.nombre,
      subtitulo: texto(d.subtitulo, 60) || estado.sitio.subtitulo,
      whatsapp: texto(String(d.whatsapp || ''), 20),
      telefono: texto(String(d.telefono || ''), 30),
      direccion: texto(d.direccion, 160),
    };
  }

  async function cargarJson(ruta) {
    const r = await fetch(ruta, { cache: 'no-cache', credentials: 'omit' });
    if (!r.ok) throw new Error(ruta + ' ' + r.status);
    return r.json();
  }

  /* ---------- WhatsApp ---------- */

  function enlaceWhatsapp(mensaje) {
    const numeroWsp = digitos(estado.sitio.whatsapp);
    const base = numeroWsp.length >= 8 && numeroWsp.length <= 15
      ? 'https://wa.me/' + numeroWsp
      : 'https://wa.me/'; // sin número cargado: WhatsApp deja elegir el contacto
    return base + '?text=' + encodeURIComponent(mensaje);
  }

  function mensajeConsulta(p) {
    if (p.stock === 0) {
      return 'Hola! Quería consultar cuándo vuelve a haber stock de: ' + p.nombre;
    }
    return 'Hola! Quería consultar la disponibilidad de: ' + p.nombre;
  }

  /* ---------- Piezas de la interfaz ---------- */

  function el(tag, clase, contenido) {
    const nodo = document.createElement(tag);
    if (clase) nodo.className = clase;
    if (contenido !== undefined) nodo.textContent = contenido;
    return nodo;
  }

  function estadoStock(stock) {
    if (stock === null) return { clase: 'stock--duda', texto: 'Consultar stock' };
    if (stock === 0) return { clase: 'stock--no', texto: 'Sin stock' };
    if (stock <= POCAS_UNIDADES) {
      return { clase: 'stock--poco', texto: stock === 1 ? 'Última unidad' : 'Quedan ' + stock };
    }
    return { clase: 'stock--ok', texto: 'En stock · ' + stock };
  }

  function nodoStock(p) {
    const e = estadoStock(p.stock);
    return el('span', 'stock ' + e.clase, e.texto);
  }

  function nodoPrecio(p, clase) {
    if (p.precio === null) return el('span', 'precio precio--consultar ' + (clase || ''), 'Consultar precio');
    const nodo = el('span', 'precio ' + (clase || ''));
    nodo.append(el('small', '', p.moneda), ' ', formatoNumero.format(p.precio));
    return nodo;
  }

  function ponerImagen(img, p) {
    const usarPorDefecto = () => {
      img.classList.add('sin-foto');
      img.src = RUTA_FOTO_SIN_IMAGEN;
    };
    if (!p.imagen) {
      usarPorDefecto();
      return;
    }
    img.addEventListener('error', usarPorDefecto, { once: true });
    img.src = p.imagen;
  }

  function crearTarjeta(p) {
    const esCombo = p.categoria === 'Combos';
    const li = el('li', 'card' + (esCombo ? ' card--combo' : '') + (p.stock === 0 ? ' card--agotado' : ''));

    const ver = el('button', 'card__ver');
    ver.type = 'button';
    ver.setAttribute('aria-label', 'Ver detalle de ' + p.nombre);

    const marco = el('span', 'card__img');
    const img = document.createElement('img');
    img.alt = '';
    img.width = 320;
    img.height = 320;
    img.loading = 'lazy';
    img.decoding = 'async';
    ponerImagen(img, p);
    marco.append(img, nodoStock(p));
    if (esCombo) marco.append(el('span', 'etiqueta-combo', 'Combo'));

    const cuerpo = el('span', 'card__cuerpo');
    cuerpo.append(el('span', 'cat', p.categoria), el('span', 'card__nombre', p.nombre));
    if (p.descripcion) cuerpo.append(el('span', 'card__desc', p.descripcion));

    ver.append(marco, cuerpo);
    ver.addEventListener('click', () => abrirDetalle(p));

    const pie = el('div', 'card__pie');
    const boton = el('a', 'btn btn--chico ' + (p.stock === 0 ? 'btn--borde' : 'btn--wsp'),
      p.stock === 0 ? 'Consultar reposición' : 'Consultar');
    boton.href = enlaceWhatsapp(mensajeConsulta(p));
    boton.target = '_blank';
    boton.rel = 'noopener noreferrer';
    boton.setAttribute('aria-label', boton.textContent + ': ' + p.nombre + ' (WhatsApp)');
    pie.append(nodoPrecio(p), boton);

    li.append(ver, pie);
    return li;
  }

  /* ---------- Listado ---------- */

  function productosFiltrados() {
    return estado.productos.filter((p) => estado.categoria === 'Todas' || p.categoria === estado.categoria);
  }

  function mostrarEstado(mensaje, textoBoton, accion) {
    $('estado-texto').textContent = mensaje;
    const boton = $('estado-boton');
    boton.textContent = textoBoton;
    boton.onclick = accion;
    $('estado').hidden = false;
  }

  function dibujarListado() {
    const grilla = $('grilla');
    const lista = productosFiltrados();
    // con stock primero, agotados al final (el orden del archivo se mantiene)
    const ordenada = [...lista.filter((p) => p.stock !== 0), ...lista.filter((p) => p.stock === 0)];

    grilla.replaceChildren(...ordenada.map(crearTarjeta));
    $('estado').hidden = true;

    const total = estado.productos.length;
    const cantidad = lista.length === total
      ? total + (total === 1 ? ' artículo' : ' artículos')
      : lista.length + ' de ' + total + ' artículos';
    $('conteo').textContent = estado.categoria === 'Todas' ? cantidad : estado.categoria + ' · ' + cantidad;

    if (total === 0) {
      $('conteo').textContent = '';
      mostrarEstado('Todavía no hay artículos cargados.', 'Actualizar', () => location.reload());
    }
  }

  /* ---------- Menú de categorías ---------- */

  function listaCategorias() {
    const orden = (c) => {
      const i = ORDEN_CATEGORIAS.indexOf(c);
      return i === -1 ? ORDEN_CATEGORIAS.length : i;
    };
    const presentes = [...new Set(estado.productos.map((p) => p.categoria))]
      .sort((a, b) => orden(a) - orden(b) || a.localeCompare(b, 'es'));
    return ['Todas', ...presentes];
  }

  function abrirMenu(abrir) {
    $('menu').classList.toggle('menu--abierto', abrir);
    $('menu-boton').setAttribute('aria-expanded', String(abrir));
    $('menu-lista').hidden = !abrir;
  }

  function dibujarCategorias() {
    $('menu-boton').setAttribute('aria-label', 'Categoría: ' + estado.categoria + '. Tocá para elegir otra');
    const opciones = listaCategorias().map((nombre) => {
      const op = el('button', 'menu__op', nombre);
      op.type = 'button';
      if (nombre === estado.categoria) op.setAttribute('aria-current', 'true');
      op.addEventListener('click', () => {
        estado.categoria = nombre;
        abrirMenu(false);
        dibujarCategorias();
        dibujarListado();
        $('menu-boton').focus();
      });
      return op;
    });
    $('menu-lista').replaceChildren(el('p', 'menu__titulo', 'Categorías'), ...opciones);
  }

  function iniciarMenu() {
    const menu = $('menu');
    const boton = $('menu-boton');
    boton.addEventListener('click', () => abrirMenu($('menu-lista').hidden));
    document.addEventListener('click', (e) => {
      if (!menu.contains(e.target)) abrirMenu(false);
    });
    menu.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !$('menu-lista').hidden) {
        abrirMenu(false);
        boton.focus();
      }
    });
  }

  /* ---------- Detalle ---------- */

  function abrirDetalle(p) {
    const dialogo = $('detalle');
    const img = $('det-img');
    img.classList.remove('sin-foto');
    ponerImagen(img, p);
    img.alt = p.imagen ? p.nombre : '';

    $('det-cat').textContent = p.categoria;
    $('det-nombre').textContent = p.nombre;
    $('det-precio').replaceChildren(nodoPrecio(p));
    $('det-stock').replaceChildren(nodoStock(p));
    $('det-desc').textContent = p.descripcion;
    $('det-desc').hidden = !p.descripcion;

    const boton = $('det-wsp');
    boton.href = enlaceWhatsapp(mensajeConsulta(p));
    boton.textContent = p.stock === 0 ? 'Consultar reposición por WhatsApp' : 'Consultar por WhatsApp';
    boton.classList.toggle('btn--wsp', p.stock !== 0);
    boton.classList.toggle('btn--borde', p.stock === 0);

    if (typeof dialogo.showModal === 'function') dialogo.showModal();
  }

  function iniciarDetalle() {
    const dialogo = $('detalle');
    $('det-cerrar').addEventListener('click', () => dialogo.close());
    dialogo.addEventListener('click', (e) => {
      if (e.target === dialogo) dialogo.close(); // clic en el fondo oscuro
    });
  }

  /* ---------- Datos del negocio ---------- */

  function aplicarSitio() {
    const s = estado.sitio;
    $('marca-nombre').textContent = s.nombre;
    $('marca-sub').textContent = s.subtitulo;
    $('pie-nombre').textContent = s.nombre;
    $('pie-sub').textContent = s.subtitulo;

    const direccion = $('pie-direccion');
    direccion.textContent = s.direccion ? 'Dirección: ' + s.direccion : '';
    direccion.hidden = !s.direccion;

    const contacto = $('pie-contacto');
    contacto.replaceChildren();
    if (s.telefono) {
      const enlace = el('a', '', s.telefono);
      enlace.href = enlaceWhatsapp('Hola! Quería hacer una consulta.');
      enlace.target = '_blank';
      enlace.rel = 'noopener noreferrer';
      enlace.setAttribute('aria-label', 'Escribir por WhatsApp al ' + s.telefono);
      contacto.append('Contacto: ', enlace, ' (WhatsApp)');
    }
    contacto.hidden = !s.telefono;

    const mapa = $('pie-mapa');
    mapa.hidden = !s.direccion;
    if (s.direccion) {
      const consulta = encodeURIComponent(s.direccion + ', Uruguay');
      const marco = $('mapa');
      if (marco.getAttribute('src') !== URL_MAPA + consulta) marco.src = URL_MAPA + consulta;
    }

    $('wsp-cabecera').href = enlaceWhatsapp('Hola! Quería hacer una consulta.');
  }

  /* ---------- Inicio ---------- */

  async function iniciar() {
    iniciarMenu();
    iniciarDetalle();

    aplicarSitio();
    $('conteo').textContent = 'Cargando artículos…';

    const [sitio, catalogo] = await Promise.allSettled([
      cargarJson('data/sitio.json'),
      cargarJson('data/productos.json'),
    ]);

    if (sitio.status === 'fulfilled') {
      estado.sitio = limpiarSitio(sitio.value);
      aplicarSitio();
    }

    if (catalogo.status !== 'fulfilled') {
      $('conteo').textContent = '';
      mostrarEstado('No pudimos cargar el catálogo. Probá de nuevo en un rato.', 'Reintentar', () => location.reload());
      return;
    }

    const lista = Array.isArray(catalogo.value && catalogo.value.productos) ? catalogo.value.productos : [];
    estado.productos = lista.map(limpiarProducto).filter(Boolean);
    dibujarCategorias();
    dibujarListado();
  }

  iniciar();
})();
