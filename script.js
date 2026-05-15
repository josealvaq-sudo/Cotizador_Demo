// Configuración de SheetMonkey
const SHEETMONKEY_URL = 'https://api.sheetmonkey.io/form/hgAkCjzRVDJNCWTM8BTV1F';

// URL web directa para el Logotipo corporativo
const LOGO_URL_WEB = 'https://th.bing.com/th/id/OIP.zey2wly7KlGAnH1wnn7_-wHaHa?w=220&h=220&c=7&r=0&o=7&pid=1.7&rm=3';

// Variables globales optimizadas
let productos = [];
let cotizacionActual = {
    materiales: [],
    manoObra: {
        tipoTransporte: 'calculado', // 'calculado' o 'fijo'
        kilometros: 0,
        costoPorKm: 0,
        costoTransporteFijo: 0,
        peajes: 0,
        costoTransporte: 0,
        horasTrabajo: 0,
        precioHora: 0,
        costoTrabajo: 0,
        total: 0
    },
    impuestos: {
        ivaHabilitado: false,
        porcentajeDescuento: 0,
        montoDescuento: 0,
        montoIVA: 0,
        subtotalMateriales: 0,
        subtotalManoObra: 0,
        subtotalGeneral: 0,
        totalFinal: 0
    }
};

let usuarioActual = '';
let conexionActiva = false;
let modalNuevoProductoInstance = null;

// Función para obtener fecha/hora de Costa Rica
function obtenerFechaCostaRica() {
    const ahora = new Date();
    const costaRica = new Date(ahora.toLocaleString("en-US", {timeZone: "America/Costa_Rica"}));
    return {
        fecha: costaRica.toISOString().split('T')[0],
        hora: costaRica.toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit', hour12: false }),
        fechaCompleta: costaRica.toISOString(),
        timestamp: costaRica.getTime()
    };
}

// Función para formatear moneda (reemplazando el símbolo de colón por "C. ")
function formatearColones(cantidad) {
    if (isNaN(cantidad) || cantidad === null || cantidad === undefined) {
        return '0';
    }
    return new Intl.NumberFormat('es-CR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(Math.round(cantidad));
}

// Alternar dinámicamente visibilidad y reglas de cálculo del Transporte
function alternarCamposTransporte() {
    const tipo = document.getElementById('tipoTransporte').value;
    const camposCalculados = document.querySelectorAll('.campo-transporte-calculado');
    const camposFijos = document.querySelectorAll('.campo-transporte-fijo');

    cotizacionActual.manoObra.tipoTransporte = tipo;

    if (tipo === 'fijo') {
        camposCalculados.forEach(el => el.style.display = 'none');
        camposFijos.forEach(el => el.style.display = 'block');
    } else {
        camposCalculados.forEach(el => el.style.display = 'block');
        camposFijos.forEach(el => el.style.display = 'none');
    }
    calcularTotales();
}

// Mostrar estado de conexión con desvanecimiento automático
function mostrarEstadoConexion(conectado) {
    const statusElement = document.getElementById('connectionStatus');
    const textElement = document.getElementById('connectionText');
    if (!statusElement || !textElement) return;
    
    if (conectado) {
        statusElement.className = 'connection-status connection-online';
        textElement.textContent = 'Conectado';
        statusElement.innerHTML = '<i class="fas fa-wifi me-1"></i>' + textElement.outerHTML;
    } else {
        statusElement.className = 'connection-status connection-offline';
        textElement.textContent = 'Sin conexión';
        statusElement.innerHTML = '<i class="fas fa-wifi-slash me-1"></i>' + textElement.outerHTML;
    }
    
    statusElement.style.display = 'block';
    setTimeout(() => {
        statusElement.style.display = 'none';
    }, 3000);
}

// Inicialización de la Aplicación en el DOM
document.addEventListener('DOMContentLoaded', function() {
    try {
        const fechaCR = obtenerFechaCostaRica();
        document.getElementById('fechaCreacion').value = fechaCR.fecha;
        document.getElementById('fechaActual').textContent = fechaCR.fecha;
        
        // Cargar credenciales del usuario actual
        verificarUsuario();
        
        // Cargar catálogo precargado local
        cargarProductos();
        
        // Enlazar escuchadores analógicos de cálculo dinámico con debounce
        const elementosAEscuchar = [
            'kilometros', 'costoPorKm', 'costoTransporteFijo', 'costoPeajes', 
            'horasTrabajo', 'precioHora', 'porcentajeDescuento'
        ];
        
        elementosAEscuchar.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('input', debounce(calcularTotales, 250));
            }
        });
        
        const ivaCheckbox = document.getElementById('habilitarIVA');
        if (ivaCheckbox) {
            ivaCheckbox.addEventListener('change', calcularTotales);
        }
        
        // Permitir ejecución de búsqueda al presionar la tecla Enter
        const buscarInput = document.getElementById('buscarProducto');
        if (buscarInput) {
            buscarInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    buscarProducto();
                }
            });
        }
        
        // Monitorear cambios manuales de usuario autorizador
        const usuarioInput = document.getElementById('usuarioCreador');
        if (usuarioInput) {
            usuarioInput.addEventListener('change', function() {
                usuarioActual = this.value.trim();
                if (usuarioActual) {
                    localStorage.setItem('usuarioSistema', usuarioActual);
                }
            });
        }
        
        // Ejecutar primer cálculo para asentar estados en 0
        calcularTotales();
        console.log('✅ Sistema de Cotizaciones iniciado por completo.');
        
    } catch (error) {
        console.error('❌ Error fatal al inicializar la estructura:', error);
        mostrarAlerta('❌ Error al inicializar el sistema', 'danger');
    }
});

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function verificarUsuario() {
    try {
        const usuarioGuardado = localStorage.getItem('usuarioSistema');
        if (usuarioGuardado) {
            document.getElementById('usuarioCreador').value = usuarioGuardado;
            usuarioActual = usuarioGuardado;
            return;
        }
        
        setTimeout(() => {
            const usuario = prompt('Escriba su Nombre de Usuario para firmar las cotizaciones en base de datos:');
            if (usuario && usuario.trim()) {
                usuarioActual = usuario.trim();
                document.getElementById('usuarioCreador').value = usuarioActual;
                localStorage.setItem('usuarioSistema', usuarioActual);
                mostrarAlerta(`👤 Sesión iniciada: ${usuarioActual}`, 'success');
            } else {
                mostrarAlerta('⚠️ Se requiere un nombre de usuario para asentar registros.', 'warning');
                verificarUsuario();
            }
        }, 800);
    } catch (error) {
        console.error('❌ Error en control de usuario:', error);
    }
}

function validarUsuario() {
    usuarioActual = document.getElementById('usuarioCreador').value.trim();
    if (!usuarioActual) {
        mostrarAlerta('⚠️ Debe rellenar el campo de Usuario del Sistema en la parte superior.', 'warning');
        document.getElementById('usuarioCreador').focus();
        return false;
    }
    return true;
}

async function cargarProductos() {
    try {
        productos = [
            {ID_Producto: 1, Nombre: "Madera MDF 18mm", Descripción: "Plancha MDF 18mm 2.44x1.22m", Precio_Unitario: 22750, Categoria: "Madera", Estado: "Activo"},
            {ID_Producto: 2, Nombre: "Tornillos 3x25", Descripción: "Tornillos para madera 3x25mm (caja 100 unidades)", Precio_Unitario: 6375, Categoria: "Ferretería", Estado: "Activo"},
            {ID_Producto: 3, Nombre: "Bisagra Piano 30cm", Descripción: "Bisagra piano de 30cm cromada", Precio_Unitario: 4375, Categoria: "Ferretería", Estado: "Activo"},
            {ID_Producto: 4, Nombre: "Barniz Poliuretano", Descripción: "Barniz poliuretano brillante 1L", Precio_Unitario: 14450, Categoria: "Acabados", Estado: "Activo"},
            {ID_Producto: 5, Nombre: "Lija 120", Descripción: "Lija de agua grano 120 (pliego)", Precio_Unitario: 1250, Categoria: "Herramientas", Estado: "Activo"},
            {ID_Producto: 6, Nombre: "Cola Blanca", Descripción: "Adhesivo PVA 250ml", Precio_Unitario: 4450, Categoria: "Adhesivos", Estado: "Activo"}
        ];
        validarProductos();
    } catch (error) {
        console.error('❌ Error al estructurar catálogo base:', error);
    }
}

function validarProductos() {
    if (!Array.isArray(productos)) {
        productos = [];
        return;
    }
    productos = productos.filter(p => p && typeof p === 'object' && (p.ID_Producto || p.id) && p.Nombre);
}

// ============================================================================
// TRANSMISOR UNIFICADO SHEETMONKEY: PAYLOAD PLANO DE 12 COLUMNAS INALTERABLES
// ============================================================================
async function enviarFilaEstandar(tipoRegistro, concepto, categoria, cantidad, precioUnitario, subtotal, detallesExtra = '') {
    try {
        const fechaCR = obtenerFechaCostaRica();
        const nombreProyecto = document.getElementById('nombreProyecto').value.trim() || 'Sin Nombre';
        const cliente = document.getElementById('cliente').value.trim() || 'Sin Cliente';
        const cedula = document.getElementById('cedulaJuridica').value.trim() || 'N/A';
        
        const payload = {
            FECHA: fechaCR.fecha,
            HORA: fechaCR.hora,
            USUARIO: usuarioActual || 'Sistema',
            PROYECTO: nombreProyecto,
            CLIENTE: `${cliente} (${cedula})`,
            TIPO_REGISTRO: tipoRegistro, 
            CONCEPTO: concepto,
            CATEGORIA: categoria,
            CANTIDAD: Number(cantidad) || 0,
            PRECIO_UNITARIO: Number(precioUnitario) || 0,
            SUBTOTAL: Number(subtotal) || 0,
            DETALLES_EXTRA: detallesExtra
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000);

        const response = await fetch(SHEETMONKEY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: controller.signal
        });

        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`Error en servidor HTTP de SheetMonkey: ${response.status}`);
        }

        conexionActiva = true;
        mostrarEstadoConexion(true);
        return { success: true };

    } catch (error) {
        console.error('❌ Error al propagar fila hacia la base de datos externa:', error);
        conexionActiva = false;
        mostrarEstadoConexion(false);
        return { success: false, error: error.message };
    }
}

// Búsqueda Inteligente en Catálogo local
function buscarProducto() {
    if (!validarUsuario()) return;
    
    const termino = document.getElementById('buscarProducto').value;
    if (!termino || termino.trim() === '') {
        mostrarAlerta('⚠️ Escriba un nombre o especificación para ejecutar la búsqueda', 'warning');
        return;
    }
    
    const terminoBusqueda = termino.toLowerCase().trim();
    validarProductos();

    const resultados = productos.filter(producto => {
        if ((producto.Estado || 'Activo') !== 'Activo') return false;
        const nombre = (producto.Nombre || '').toLowerCase();
        const desc = (producto.Descripción || producto.Descripcion || '').toLowerCase();
        const cat = (producto.Categoria || '').toLowerCase();
        return nombre.includes(terminoBusqueda) || desc.includes(terminoBusqueda) || cat.includes(terminoBusqueda);
    });

    mostrarResultadosBusqueda(resultados, terminoBusqueda);
}

function mostrarResultadosBusqueda(resultados, termino) {
    const contenedorResultados = document.getElementById('resultadosBusqueda');
    const listaResultados = document.getElementById('listaResultados');
    
    if (resultados.length === 0) {
        listaResultados.innerHTML = `
            <div class="alert alert-warning mb-0">
                <i class="fas fa-search-minus me-2"></i> No se hallaron artículos que coincidan con la palabra "${termino}".
            </div>
        `;
    } else {
        listaResultados.innerHTML = resultados.map(producto => {
            const id = producto.ID_Producto || producto.id || 0;
            const nombre = producto.Nombre || 'Sin Nombre';
            const desc = producto.Descripción || producto.Descripcion || 'Sin descripción';
            const precio = producto.Precio_Unitario || 0;
            const cat = producto.Categoria || 'Otros';
            
            return `
                <div class="resultado-busqueda border p-3 rounded mb-2 bg-light">
                    <div class="row align-items-center">
                        <div class="col-md-6">
                            <h6 class="mb-1 text-dark fw-bold"><i class="fas fa-box me-2 text-secondary"></i>${nombre}</h6>
                            <p class="mb-1 text-muted small">${desc}</p>
                            <span class="badge bg-secondary">${cat}</span>
                        </div>
                        <div class="col-md-3 text-center">
                            <h5 class="mb-0 text-success fw-bold">C. ${formatearColones(precio)}</h5>
                            <small class="text-muted">Precio Unitario</small>
                        </div>
                        <div class="col-md-3 text-end">
                            <button class="btn btn-primary btn-sm px-3" onclick="agregarProductoACotizacion(${id})">
                                <i class="fas fa-plus me-1"></i>Añadir Línea
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
    contenedorResultados.style.display = 'block';
}

function agregarProductoACotizacion(productoId) {
    if (!validarUsuario()) return;
    
    const producto = productos.find(p => (p.ID_Producto || p.id) == productoId);
    if (!producto) {
        mostrarAlerta('❌ El artículo buscado no se encuentra en la base del maestro.', 'danger');
        return;
    }

    const yaAgregado = cotizacionActual.materiales.find(m => (m.id || m.ID_Producto) == (producto.ID_Producto || producto.id));
    if (yaAgregado) {
        mostrarAlerta('⚠️ Este artículo ya está asignado abajo. Modifique su volumen directamente si lo requiere.', 'warning');
        return;
    }

    const cantidad = prompt(`Defina el volumen o cantidad requerida para [ ${producto.Nombre} ] :`, '1');
    if (!cantidad || isNaN(parseFloat(cantidad)) || parseFloat(cantidad) <= 0) return;

    const cantNum = parseFloat(cantidad);
    const precio = producto.Precio_Unitario || 0;

    cotizacionActual.materiales.push({
        id: producto.ID_Producto || producto.id,
        nombre: producto.Nombre,
        descripcion: producto.Descripción || producto.Descripcion || '',
        precio: precio,
        cantidad: cantNum,
        subtotal: precio * cantNum,
        categoria: producto.Categoria || 'Otros'
    });

    actualizarListaMateriales();
    calcularTotales();
    
    document.getElementById('buscarProducto').value = '';
    document.getElementById('resultadosBusqueda').style.display = 'none';
    mostrarAlerta('🛒 Artículo indexado con éxito a la cotización', 'success');
}

function actualizarListaMateriales() {
    const container = document.getElementById('listaMateriales');
    if (cotizacionActual.materiales.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-box-open"></i>
                <h5>No hay materiales agregados</h5>
                <p>Busca y selecciona productos en el catálogo superior</p>
            </div>
        `;
        return;
    }

    container.innerHTML = cotizacionActual.materiales.map((item, idx) => `
        <div class="producto-item">
            <div class="row align-items-center">
                <div class="col-md-4 mb-2 mb-md-0">
                    <h6 class="mb-1 text-primary fw-bold">${item.nombre}</h6>
                    <p class="mb-1 text-muted small">${item.descripcion}</p>
                    <span class="badge bg-info text-dark font-monospace">${item.categoria}</span>
                </div>
                <div class="col-md-2 col-6">
                    <label class="form-label small fw-bold">Cantidad:</label>
                    <input type="number" class="form-control form-control-sm" value="${item.cantidad}" min="0.1" step="0.1" onchange="actualizarCantidad(${idx}, this.value)">
                </div>
                <div class="col-md-2 col-6 text-center">
                    <label class="form-label small fw-bold">Unitario:</label>
                    <div class="text-success fw-bold">C. ${formatearColones(item.precio)}</div>
                </div>
                <div class="col-md-2 col-6 text-center mt-2 mt-md-0">
                    <label class="form-label small fw-bold">Subtotal:</label>
                    <div class="text-primary fw-bold">C. ${formatearColones(item.subtotal)}</div>
                </div>
                <div class="col-md-2 col-6 text-end mt-2 mt-md-0">
                    <button class="btn btn-outline-secondary btn-sm me-1" onclick="editarPrecioItem(${idx})"><i class="fas fa-pencil-alt"></i></button>
                    <button class="btn btn-outline-danger btn-sm" onclick="eliminarItem(${idx})"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        </div>
    `).join('');
}

function actualizarCantidad(index, nuevaCantidad) {
    const cant = parseFloat(nuevaCantidad);
    if (isNaN(cant) || cant <= 0) {
        mostrarAlerta('⚠️ El volumen debe ser un número entero o decimal mayor a cero.', 'warning');
        actualizarListaMateriales();
        return;
    }
    cotizacionActual.materiales[index].cantidad = cant;
    cotizacionActual.materiales[index].subtotal = cotizacionActual.materiales[index].precio * cant;
    actualizarListaMateriales();
    calcularTotales();
}

function editarPrecioItem(index) {
    const item = cotizacionActual.materiales[index];
    const nuevoPrecio = prompt(`Asignar tarifa / precio preferencial para: ${item.nombre}`, item.precio);
    if (nuevoPrecio && !isNaN(parseFloat(nuevoPrecio)) && parseFloat(nuevoPrecio) >= 0) {
        item.precio = parseFloat(nuevoPrecio);
        item.subtotal = item.precio * item.cantidad;
        actualizarListaMateriales();
        calcularTotales();
    }
}

function eliminarItem(index) {
    cotizacionActual.materiales.splice(index, 1);
    actualizarListaMateriales();
    calcularTotales();
}

// LÓGICA DE COMPUTACIÓN ARITMÉTICA Y AJUSTE DE REGLAS COMERCIALES
function calcularTotales() {
    try {
        const subtotalMateriales = cotizacionActual.materiales.reduce((sum, item) => sum + (item.subtotal || 0), 0);
        
        const tipoTransp = document.getElementById('tipoTransporte').value;
        const peajes = parseFloat(document.getElementById('costoPeajes').value) || 0;
        
        let costoTransporte = 0;
        let textoDesgloseTransp = '';

        if (tipoTransp === 'fijo') {
            const costoFijo = parseFloat(document.getElementById('costoTransporteFijo').value) || 0;
            costoTransporte = costoFijo + peajes;
            textoDesgloseTransp = `• Modalidad: Tarifa Plana Establecida de Flete (C. ${formatearColones(costoFijo)}) + Peajes/Viáticos (C. ${formatearColones(peajes)}).`;
        } else {
            const kms = parseFloat(document.getElementById('kilometros').value) || 0;
            const cxK = parseFloat(document.getElementById('costoPorKm').value) || 0;
            costoTransporte = (kms * cxK) + peajes;
            textoDesgloseTransp = `• Modalidad: Distancia (${kms.toFixed(1)} km) x Tarifa por Km (C. ${formatearColones(cxK)}) + Peajes/Viáticos (C. ${formatearColones(peajes)}).`;
        }

        const horas = parseFloat(document.getElementById('horasTrabajo').value) || 0;
        const precioH = parseFloat(document.getElementById('precioHora').value) || 0;
        const costoTrabajo = horas * precioH;

        const subtotalManoObra = costoTransporte + costoTrabajo;
        const subtotalGeneral = subtotalMateriales + subtotalManoObra;

        const descPct = parseFloat(document.getElementById('porcentajeDescuento').value) || 0;
        const montoDescuento = (subtotalGeneral * descPct) / 100;
        document.getElementById('montoDescuento').value = Math.round(montoDescuento);

        const baseConDescuento = subtotalGeneral - montoDescuento;
        const ivaHabilitado = document.getElementById('habilitarIVA').checked;
        const montoIVA = ivaHabilitado ? (baseConDescuento * 0.13) : 0;
        const totalFinal = baseConDescuento + montoIVA;

        // Renderizado del desglose en los contenedores del DOM (con prefijo C.)
        document.getElementById('subtotalMateriales').textContent = formatearColones(subtotalMateriales);
        document.getElementById('subtotalManoObra').textContent = formatearColones(subtotalManoObra);
        document.getElementById('totalDescuento').textContent = formatearColones(montoDescuento);
        document.getElementById('totalIVA').textContent = formatearColones(montoIVA);
        document.getElementById('totalGeneral').textContent = formatearColones(totalFinal);

        document.getElementById('desgloseTextoTransporte').textContent = textoDesgloseTransp;
        document.getElementById('resumenTransporte').textContent = formatearColones(costoTransporte);
        document.getElementById('resumenHoras').textContent = horas.toFixed(1);
        document.getElementById('resumenPrecioHora').textContent = formatearColones(precioH);
        document.getElementById('resumenTotalManoObra').textContent = formatearColones(costoTrabajo);

        cotizacionActual.manoObra = { 
            tipoTransporte: tipoTransp,
            kilometros: tipoTransp === 'calculado' ? parseFloat(document.getElementById('kilometros').value) || 0 : 0,
            costoPorKm: tipoTransp === 'calculado' ? parseFloat(document.getElementById('costoPorKm').value) || 0 : 0,
            costoTransporteFijo: tipoTransp === 'fijo' ? parseFloat(document.getElementById('costoTransporteFijo').value) || 0 : 0,
            peajes: peajes, 
            costoTransporte: costoTransporte, 
            horasTrabajo: horas, 
            precioHora: precioH, 
            costoTrabajo: costoTrabajo, 
            total: subtotalManoObra 
        };
        
        cotizacionActual.impuestos = { 
            ivaHabilitado: ivaHabilitado, 
            porcentajeDescuento: descPct, 
            montoDescuento: montoDescuento, 
            montoIVA: montoIVA, 
            subtotalMateriales: subtotalMateriales, 
            subtotalManoObra: subtotalManoObra, 
            subtotalGeneral: subtotalGeneral, 
            totalFinal: totalFinal 
        };

        actualizarEstadisticasContadores();
    } catch (e) {
        console.error("Falla de ejecución en rutina matemática:", e);
    }
}

function actualizarEstadisticasContadores() {
    const totalItems = cotizacionActual.materiales.length;
    const matTotal = cotizacionActual.impuestos.subtotalMateriales || 0;
    const obraTotal = cotizacionActual.manoObra.total || 0;
    const finalTotal = cotizacionActual.impuestos.totalFinal || 0;

    const mapeo = {
        'totalItems': totalItems,
        'totalMaterialesStats': 'C. ' + formatearColones(matTotal),
        'totalManoObraStats': 'C. ' + formatearColones(obraTotal),
        'totalGeneralStats': 'C. ' + formatearColones(finalTotal)
    };

    Object.entries(mapeo).forEach(([id, val]) => {
        const elemento = document.getElementById(id);
        if (elemento) elemento.textContent = val;
    });
}

function mostrarEstadisticas() {
    const el = document.getElementById('statsContainer');
    if (el) el.style.display = el.style.display === 'none' ? 'flex' : 'none';
}

function abrirModalProductoNuevo() {
    if (!validarUsuario()) return;
    document.getElementById('formNuevoProducto').reset();
    if (!modalNuevoProductoInstance) {
        modalNuevoProductoInstance = new bootstrap.Modal(document.getElementById('modalNuevoProducto'));
    }
    modalNuevoProductoInstance.show();
}

async function guardarNuevoProducto() {
    if (!validarUsuario()) return;
    
    const nombre = document.getElementById('nuevoProductoNombre').value.trim();
    const descripcion = document.getElementById('nuevoProductoDescripción').value.trim() || 'Sin detalles adicionales';
    const precio = parseFloat(document.getElementById('nuevoProductoPrecio').value);
    const categoria = document.getElementById('nuevoProductoCategoria').value;

    if (!nombre || isNaN(precio) || precio <= 0) {
        mostrarAlerta('⚠️ Complete de forma válida los campos obligatorios del Producto Maestro', 'warning');
        return;
    }

    const btn = document.querySelector('#modalNuevoProducto .btn-success');
    const txtOriginal = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Guardando...';
    btn.disabled = true;

    const resultado = await enviarFilaEstandar(
        'PRODUCTO_MAESTRO',
        nombre,
        categoria,
        1,
        precio,
        precio,
        `Alta de Producto Catálogo: ${descripcion}`
    );

    btn.innerHTML = txtOriginal;
    btn.disabled = false;

    if (resultado.success) {
        productos.push({
            ID_Producto: Date.now(),
            Nombre: nombre,
            Descripción: descripcion,
            Precio_Unitario: precio,
            Categoria: categoria,
            Estado: 'Activo'
        });
        if (modalNuevoProductoInstance) modalNuevoProductoInstance.hide();
        mostrarAlerta('✅ Producto Maestro ingresado con éxito en la base de datos', 'success');
    } else {
        mostrarAlerta('❌ Error crítico de guardado a través de SheetMonkey', 'danger');
    }
}

async function guardarCotizacionCompleta() {
    if (!validarUsuario()) return;
    
    const proj = document.getElementById('nombreProyecto').value.trim();
    const clt = document.getElementById('cliente').value.trim();

    if (!proj || !clt) {
        mostrarAlerta('⚠️ Ingrese obligatoriamente Nombre de Proyecto y Cliente para indexar los registros', 'warning');
        return;
    }
    if (cotizacionActual.materiales.length === 0) {
        mostrarAlerta('⚠️ El carro de cotización se encuentra vacío. Inserte líneas.', 'warning');
        return;
    }

    mostrarAlerta('⏳ Transmitiendo registros encadenados secuencialmente a la base de datos...', 'info');
    let registrosFallidos = 0;

    for (const item of cotizacionActual.materiales) {
        const res = await enviarFilaEstandar(
            'MATERIAL_COTIZADO',
            item.nombre,
            item.categoria,
            item.cantidad,
            item.precio,
            item.subtotal,
            `Línea desglosada: ${item.descripcion}`
        );
        if (!res.success) registrosFallidos++;
    }

    if (cotizacionActual.manoObra.costoTrabajo > 0) {
        const resMO = await enviarFilaEstandar(
            'MANO_OBRA',
            'Servicios Especializados de Ensamble y Labor',
            'Mano de Obra',
            cotizacionActual.manoObra.horasTrabajo,
            cotizacionActual.manoObra.precioHora,
            cotizacionActual.manoObra.costoTrabajo,
            'Cálculo basado en tarifa por Horas Hombre'
        );
        if (!resMO.success) registrosFallidos++;
    }

    if (cotizacionActual.manoObra.costoTransporte > 0) {
        const mTrans = cotizacionActual.manoObra.tipoTransporte === 'fijo' ? 'Tarifa Fija' : `Métrica: ${cotizacionActual.manoObra.kilometros} km`;
        const resTR = await enviarFilaEstandar(
            'TRANSPORTE',
            `Flete de Distribución y Transporte (${mTrans})`,
            'Transporte',
            1,
            cotizacionActual.manoObra.costoTransporte,
            cotizacionActual.manoObra.costoTransporte,
            `Flete acumulado neto incluyendo peajes: C. ${cotizacionActual.manoObra.peajes}`
        );
        if (!resTR.success) registrosFallidos++;
    }

    const impuestos = cotizacionActual.impuestos;
    const detallesMetadatos = `Descuento aplicado: ${impuestos.porcentajeDescuento}% (C. ${impuestos.montoDescuento}) | IVA Asignado: ${impuestos.ivaHabilitado ? '13%' : 'No aplica'}`;
    
    const resFinal = await enviarFilaEstandar(
        'TOTAL_FINAL',
        `Cierre y Consolidación: ${proj}`,
        'Totales',
        1,
        impuestos.totalFinal,
        impuestos.totalFinal,
        detallesMetadatos
    );

    if (resFinal.success && registrosFallidos === 0) {
        mostrarAlerta('✅ ¡Cotización guardada exitosamente en una sola estructura lineal!', 'success');
        cotizacionActual.materiales = [];
        actualizarListaMateriales();
        document.getElementById('formNuevoProducto').reset();
        calcularTotales();
    } else {
        mostrarAlerta('⚠️ Datos almacenados parcialmente en la nube. Verifique registros o historial de red.', 'warning');
    }
}

async function probarConexion() {
    if (!validarUsuario()) return;
    mostrarAlerta('🧪 Validando respuestas del webhook de SheetMonkey...', 'info');
    
    const res = await enviarFilaEstandar(
        'TEST_CONEXION',
        'Ping de Handshake e Integridad de canal',
        'Pruebas',
        1,
        0,
        0,
        `Solicitado de manera manual por operador: ${usuarioActual}`
    );

    if (res.success) {
        mostrarAlerta('✅ Handshake correcto. Comunicación con SheetMonkey activa', 'success');
    } else {
        mostrarAlerta('❌ Sin respuesta del receptor de datos de SheetMonkey', 'danger');
    }
}

function mostrarAlerta(mensaje, tipo) {
    const alertContainer = document.getElementById('alertContainer');
    if (!alertContainer) return;
    
    const alert = document.createElement('div');
    alert.className = `alert alert-${tipo} alert-dismissible fade show shadow-sm`;
    alert.innerHTML = `
        ${mensaje}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    alertContainer.appendChild(alert);
    
    setTimeout(() => {
        if (alert.parentNode) alert.remove();
    }, 5000);
}

// ============================================================================
// GENERADOR DINÁMICO ASÍNCRONO DE REPORTE PDF EMPRESARIAL (URL WEB Y PREFIJO C.)
// ============================================================================
function generarPDFEmpresarial() {
    if (!validarUsuario()) return;

    const btnPdf = document.getElementById('btnGenerarPdf');
    const textoOriginalBtn = btnPdf.innerHTML;
    
    // Cambiar estado visual del botón para indicar procesamiento asíncrono
    btnPdf.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Descargando Logo...';
    btnPdf.disabled = true;

    // 1. Crear la instancia de la imagen en memoria y forzar CORS abierto
    const imgLogoWeb = new Image();
    imgLogoWeb.crossOrigin = "Anonymous";
    imgLogoWeb.src = LOGO_URL_WEB;

    // Manejo de error si la URL falla o no hay internet
    imgLogoWeb.onerror = function() {
        console.warn("⚠️ No se pudo descargar el logotipo web. Generando PDF con diseño de contingencia.");
        ejecutarConstruccionPDF(null);
    };

    // 2. Al completar la descarga síncrona de los píxeles, disparamos el renderizado del PDF
    imgLogoWeb.onload = function() {
        ejecutarConstruccionPDF(imgLogoWeb);
    };

    // Función interna encapsulada para construir el documento una vez resuelto el hilo de la imagen
    function ejecutarConstruccionPDF(imagenLista) {
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF('p', 'pt', 'a4');

            const nombreProyecto = document.getElementById('nombreProyecto').value.trim() || "Sin Nombre Asignado";
            const cliente = document.getElementById('cliente').value.trim() || "Cliente General";
            const cedulaJuridica = document.getElementById('cedulaJuridica').value.trim() || "No Indicada";
            const fechaEmision = document.getElementById('fechaCreacion').value || obtenerFechaCostaRica().fecha;
            const firmaCreador = document.getElementById('usuarioCreador').value.trim() || "Sistema Automático";

            const colorPrimarioRGB = [44, 62, 80];   
            const colorSecundarioRGB = [52, 152, 219]; 
            const colorTextoRGB = [60, 60, 60];

            let ejeVerticalY = 55;

            // --- CABECERA COMERCIAL Y LOGOTIPO ---
            if (imagenLista) {
                // Inyección limpia y directa del recurso web descargado
                doc.addImage(imagenLista, 'PNG', 40, ejeVerticalY, 65, 65);
            } else {
                // Bloque sólido de respaldo por si falla la red
                doc.setFillColor(colorPrimarioRGB[0], colorPrimarioRGB[1], colorPrimarioRGB[2]);
                doc.rect(40, ejeVerticalY, 130, 45, 'F');
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(10);
                doc.setFont("helvetica", "bold");
                doc.text("MUEBLES & DISEÑO", 48, ejeVerticalY + 26);
            }

            // Título Principal del Comprobante (Alineación Derecha)
            doc.setTextColor(colorPrimarioRGB[0], colorPrimarioRGB[1], colorPrimarioRGB[2]);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(20);
            doc.text("COTIZACIÓN FORMAL", 320, ejeVerticalY + 22);
            
            doc.setFont("helvetica", "normal");
            doc.setFontSize(9.5);
            doc.setTextColor(110, 110, 110);
            doc.text(`Fecha de Emisión: ${fechaEmision}`, 320, ejeVerticalY + 38);
            doc.text("Vigencia del Presupuesto: 30 días naturales", 320, ejeVerticalY + 50);
            
            ejeVerticalY += 75;

            // Regla horizontal estilizada divisoria
            doc.setDrawColor(colorSecundarioRGB[0], colorSecundarioRGB[1], colorSecundarioRGB[2]);
            doc.setLineWidth(1.5);
            doc.line(40, ejeVerticalY, 550, ejeVerticalY);
            ejeVerticalY += 25;

            // --- DETALLES DE CUENTAS, CLIENTES Y METADATOS ---
            doc.setFont("helvetica", "bold");
            doc.setFontSize(10.5);
            doc.setTextColor(colorPrimarioRGB[0], colorPrimarioRGB[1], colorPrimarioRGB[2]);
            doc.text("INFORMACIÓN E IDENTIFICACIÓN DEL PROYECTO", 40, ejeVerticalY);
            ejeVerticalY += 12;

            doc.setDrawColor(225, 228, 232);
            doc.setFillColor(251, 252, 254);
            doc.rect(40, ejeVerticalY, 510, 68, 'DF'); 

            doc.setFont("helvetica", "bold");
            doc.setTextColor(70, 70, 70);
            doc.setFontSize(9.5);
            doc.text("Proyecto Referencia:", 55, ejeVerticalY + 20);
            doc.text("Razón Social / Cliente:", 55, ejeVerticalY + 37);
            doc.text("Cédula Jurídica / ID:", 55, ejeVerticalY + 53);

            doc.text("Elaborado Por:", 340, ejeVerticalY + 20);
            doc.text("Divisa de Operación:", 340, ejeVerticalY + 37);

            doc.setFont("helvetica", "normal");
            doc.setTextColor(30, 30, 30);
            doc.text(nombreProyecto, 155, ejeVerticalY + 20);
            doc.text(cliente, 160, ejeVerticalY + 37);
            doc.text(cedulaJuridica, 155, ejeVerticalY + 53);
            doc.text(firmaCreador, 415, ejeVerticalY + 20);
            doc.text("Colón Costarricense (C.)", 435, ejeVerticalY + 37);

            ejeVerticalY += 95;

            // --- TABLA DE MATERIALES Y LÍNEAS DE SUMINISTROS ---
            doc.setFont("helvetica", "bold");
            doc.setFontSize(10.5);
            doc.setTextColor(colorPrimarioRGB[0], colorPrimarioRGB[1], colorPrimarioRGB[2]);
            doc.text("1. COMPONENTES, MATERIALES Y SUMINISTROS DIRECTOS", 40, ejeVerticalY);
            ejeVerticalY += 15;

            // Cabecera de la Tabla
            doc.setFillColor(colorPrimarioRGB[0], colorPrimarioRGB[1], colorPrimarioRGB[2]);
            doc.rect(40, ejeVerticalY, 510, 22, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(9.5);
            doc.text("Descripción Detallada del Suministro", 50, ejeVerticalY + 15);
            doc.text("Cant.", 335, ejeVerticalY + 15);
            doc.text("Precio Unit.", 405, ejeVerticalY + 15);
            doc.text("Subtotal", 495, ejeVerticalY + 15);
            
            ejeVerticalY += 22;

            doc.setFont("helvetica", "normal");
            doc.setTextColor(colorTextoRGB[0], colorTextoRGB[1], colorTextoRGB[2]);

            if (cotizacionActual.materiales.length === 0) {
                doc.setDrawColor(230, 230, 230);
                doc.rect(40, ejeVerticalY, 510, 20, 'D');
                doc.text("Ningún componente o material ha sido añadido a las líneas de costo.", 50, ejeVerticalY + 14);
                ejeVerticalY += 20;
            } else {
                cotizacionActual.materiales.forEach((material, indice) => {
                    if (indice % 2 === 0) {
                        doc.setFillColor(246, 248, 251);
                        doc.rect(40, ejeVerticalY, 510, 20, 'F');
                    }
                    doc.setDrawColor(230, 232, 235);
                    doc.rect(40, ejeVerticalY, 510, 20, 'D');

                    doc.text(material.nombre.substring(0, 42), 50, ejeVerticalY + 14);
                    doc.text(material.cantidad.toString(), 335, ejeVerticalY + 14);
                    doc.text("C. " + formatearColones(material.precio), 405, ejeVerticalY + 14);
                    doc.text("C. " + formatearColones(material.subtotal), 495, ejeVerticalY + 14);
                    ejeVerticalY += 20;
                });
            }
            ejeVerticalY += 25;

            // --- SECCIÓN DE COSTOS LOGÍSTICOS Y OPERACIONALES ---
            doc.setFont("helvetica", "bold");
            doc.setTextColor(colorPrimarioRGB[0], colorPrimarioRGB[1], colorPrimarioRGB[2]);
            doc.text("2. LOGÍSTICA, TRANSPORTE Y MANO DE OBRA OPERATIVA", 40, ejeVerticalY);
            ejeVerticalY += 15;

            doc.setFillColor(249, 250, 251);
            doc.setDrawColor(222, 226, 232);
            doc.rect(40, ejeVerticalY, 510, 42, 'DF');

            doc.setFont("helvetica", "normal");
            doc.setTextColor(60, 60, 60);
            
            const horasEstimadas = cotizacionActual.manoObra.horasTrabajo || 0;
            const tarifaPorHora = cotizacionActual.manoObra.precioHora || 0;
            const costoLaborNeto = horasEstimadas * tarifaPorHora;
            const costoLogisticaFlete = cotizacionActual.manoObra.costoTransporte || 0;

            doc.text(`Mano de Obra Directa (Montaje y Operaciones: ${horasEstimadas} h x C. ${formatearColones(tarifaPorHora)} / hr):`, 55, ejeVerticalY + 16);
            doc.setFont("helvetica", "bold");
            doc.text("C. " + formatearColones(costoLaborNeto), 495, ejeVerticalY + 16);

            doc.setFont("helvetica", "normal");
            const labelFletePdf = cotizacionActual.manoObra.tipoTransporte === 'fijo' ? "Tarifa Plana de Flete" : `Cálculo de Distancia por Km y Viáticos`;
            doc.text(`Logística de Distribución e Instalación (${labelFletePdf}):`, 55, ejeVerticalY + 32);
            doc.setFont("helvetica", "bold");
            doc.text("C. " + formatearColones(costoLogisticaFlete), 495, ejeVerticalY + 32);

            ejeVerticalY += 68;

            // --- MATRIZ DE TOTALIZACIÓN Y CIERRE ---
            const desgloseImpuestos = cotizacionActual.impuestos;
            const ejeHorizontalXCuadro = 330;
            
            doc.setDrawColor(200, 203, 208);
            doc.setFillColor(255, 255, 255);
            doc.rect(ejeHorizontalXCuadro, ejeVerticalY, 220, 96, 'D');

            doc.setFont("helvetica", "normal");
            doc.setTextColor(100, 100, 100);
            doc.text("Subtotal Neto Suministros:", ejeHorizontalXCuadro + 12, ejeVerticalY + 18);
            doc.text("Subtotal Operaciones y Flete:", ejeHorizontalXCuadro + 12, ejeVerticalY + 34);
            doc.text(`Descuento Concedido (${desgloseImpuestos.porcentajeDescuento || 0}%):`, ejeHorizontalXCuadro + 12, ejeVerticalY + 50);
            doc.text("Impuesto Valor Agregado (13% IVA):", ejeHorizontalXCuadro + 12, ejeVerticalY + 66);

            doc.setFont("helvetica", "bold");
            doc.setTextColor(40, 40, 40);
            doc.text("C. " + formatearColones(desgloseImpuestos.subtotalMateriales), 495, ejeVerticalY + 18);
            doc.text("C. " + formatearColones(desgloseImpuestos.subtotalManoObra), 495, ejeVerticalY + 34);
            doc.text("-C. " + formatearColones(desgloseImpuestos.montoDescuento), 495, ejeVerticalY + 50);
            doc.text("C. " + formatearColones(desgloseImpuestos.montoIVA), 495, ejeVerticalY + 66);

            // Caja Resaltada para el Gran Total Final
            doc.setFillColor(colorPrimarioRGB[0], colorPrimarioRGB[1], colorPrimarioRGB[2]);
            doc.rect(ejeHorizontalXCuadro, ejeVerticalY + 74, 220, 22, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(10);
            doc.text("TOTAL PRESUPUESTADO:", ejeHorizontalXCuadro + 12, ejeVerticalY + 88);
            doc.text("C. " + formatearColones(desgloseImpuestos.totalFinal), 495, ejeVerticalY + 88);

            ejeVerticalY += 135;

            // --- NOTAS LEGALES AL PIE ---
            doc.setFont("helvetica", "italic");
            doc.setFontSize(7.5);
            doc.setTextColor(130, 130, 130);
            doc.text("• Este documento constituye un presupuesto descriptivo y estimativo, no actúa como factura legal o título ejecutivo.", 40, ejeVerticalY);
            doc.text("• Los precios de las materias primas se garantizan únicamente por el periodo estipulado de vigencia de la oferta.", 40, ejeVerticalY + 11);
            doc.text("• Todo cambio en las dimensiones o alcances del proyecto alterará las estimaciones de mano de obra y fletes descritas.", 40, ejeVerticalY + 22);

            const formatoNombreArchivo = nombreProyecto.toLowerCase().trim().replace(/[^a-z0-9]/g, "_");
            doc.save(`cotizacion_${formatoNombreArchivo}.pdf`);
            mostrarAlerta("✅ Documento PDF exportado con éxito.", "success");

        } catch (errorPdf) {
            console.error("❌ Error grave en la estructuración interna del archivo PDF:", errorPdf);
            mostrarAlerta("❌ Error al procesar los vectores del PDF.", "danger");
        } finally {
            // Restaurar estado e interfaz del botón gatillo
            btnPdf.innerHTML = textoOriginalBtn;
            btnPdf.disabled = false;
        }
    }
}

function debugProductos() {
    console.log('🔍 DEBUG - Estado actual de productos:', productos);
    return productos;
}
window.debugProductos = debugProductos;