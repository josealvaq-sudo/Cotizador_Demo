// Configuración de SheetMonkey
const SHEETMONKEY_URL = 'https://api.sheetmonkey.io/form/hgAkCjzRVDJNCWTM8BTV1F';

// Variables globales optimizadas
let productos = [];
let cotizacionActual = {
    materiales: [],
    manoObra: {
        kilometros: 0,
        costoPorKm: 0,
        peajes: 0,
        horasTrabajo: 0,
        precioHora: 0
    },
    impuestos: {
        ivaHabilitado: false,
        porcentajeDescuento: 0
    }
};

let usuarioActual = '';
let conexionActiva = false;

// Función para obtener fecha/hora de Costa Rica
function obtenerFechaCostaRica() {
    const ahora = new Date();
    const costaRica = new Date(ahora.toLocaleString("en-US", {timeZone: "America/Costa_Rica"}));
    return {
        fecha: costaRica.toISOString().split('T')[0],
        hora: costaRica.toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' }),
        fechaCompleta: costaRica.toISOString(),
        timestamp: costaRica.getTime()
    };
}

// Función para formatear moneda en colones (optimizada)
function formatearColones(cantidad) {
    if (isNaN(cantidad) || cantidad === null || cantidad === undefined) {
        return '0';
    }
    return new Intl.NumberFormat('es-CR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(Math.round(cantidad));
}

// Función para mostrar estado de conexión
function mostrarEstadoConexion(conectado) {
    const statusElement = document.getElementById('connectionStatus');
    const textElement = document.getElementById('connectionText');
    
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

// Inicializar la aplicación
document.addEventListener('DOMContentLoaded', function() {
    try {
        const fechaCR = obtenerFechaCostaRica();
        document.getElementById('fechaCreacion').value = fechaCR.fecha;
        
        // Verificar usuario al inicio
        verificarUsuario();
        
        // Cargar productos
        cargarProductos();
        
        // Event listeners optimizados
        const elementos = [
            'kilometros', 'costoPorKm', 'costoPeajes', 
            'horasTrabajo', 'precioHora', 'porcentajeDescuento'
        ];
        
        elementos.forEach(id => {
            const elemento = document.getElementById(id);
            if (elemento) {
                elemento.addEventListener('input', debounce(calcularTotales, 300));
            }
        });
        
        const ivaCheckbox = document.getElementById('habilitarIVA');
        if (ivaCheckbox) {
            ivaCheckbox.addEventListener('change', calcularTotales);
        }
        
        // Event listener para búsqueda con Enter
        const buscarInput = document.getElementById('buscarProducto');
        if (buscarInput) {
            buscarInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    buscarProducto();
                }
            });
        }
        
        // Event listener para cambio de usuario
        const usuarioInput = document.getElementById('usuarioCreador');
        if (usuarioInput) {
            usuarioInput.addEventListener('change', function() {
                usuarioActual = this.value.trim();
                if (usuarioActual) {
                    localStorage.setItem('usuarioSistema', usuarioActual);
                }
            });
        }
        
        console.log('✅ Sistema inicializado correctamente');
        mostrarAlerta('✅ Sistema cargado correctamente', 'success');
        
    } catch (error) {
        console.error('❌ Error inicializando sistema:', error);
        mostrarAlerta('❌ Error al inicializar el sistema', 'danger');
    }
});

// Función debounce para optimizar cálculos
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

// Verificar que el usuario esté definido
function verificarUsuario() {
    try {
        // Recuperar usuario guardado
        const usuarioGuardado = localStorage.getItem('usuarioSistema');
        if (usuarioGuardado) {
            document.getElementById('usuarioCreador').value = usuarioGuardado;
            usuarioActual = usuarioGuardado;
            return;
        }
        
        // Si no hay usuario, pedirlo
        setTimeout(() => {
            const usuario = prompt('Por favor ingresa tu nombre de usuario:');
            if (usuario && usuario.trim()) {
                usuarioActual = usuario.trim();
                document.getElementById('usuarioCreador').value = usuarioActual;
                localStorage.setItem('usuarioSistema', usuarioActual);
                mostrarAlerta(`👤 Bienvenido ${usuarioActual}`, 'success');
            } else {
                mostrarAlerta('⚠️ El usuario es obligatorio para usar el sistema', 'warning');
                verificarUsuario(); // Volver a pedir
            }
        }, 1000);
    } catch (error) {
        console.error('❌ Error verificando usuario:', error);
    }
}

// Validar usuario antes de cualquier acción
function validarUsuario() {
    usuarioActual = document.getElementById('usuarioCreador').value.trim();
    if (!usuarioActual) {
        mostrarAlerta('⚠️ Debes ingresar tu nombre de usuario', 'warning');
        document.getElementById('usuarioCreador').focus();
        return false;
    }
    return true;
}

// Cargar productos (datos de ejemplo)
async function cargarProductos() {
    try {
        productos = [
            {ID_Producto: 1, Nombre: "Madera MDF 18mm", Descripción: "Plancha MDF 18mm 2.44x1.22m", Precio_Unitario: 22750, Categoria: "Madera", Estado: "Activo"},
            {ID_Producto: 2, Nombre: "Tornillos 3x25", Descripción: "Tornillos para madera 3x25mm (caja 100 unidades)", Precio_Unitario: 6375, Categoria: "Ferretería", Estado: "Activo"},
            {ID_Producto: 3, Nombre: "Bisagra Piano 30cm", Descripción: "Bisagra piano de 30cm cromada", Precio_Unitario: 4375, Categoria: "Ferretería", Estado: "Activo"},
            {ID_Producto: 4, Nombre: "Barniz Poliuretano", Descripción: "Barniz poliuretano brillante 1L", Precio_Unitario: 14450, Categoria: "Acabados", Estado: "Activo"},
            {ID_Producto: 5, Nombre: "Lija 120", Descripción: "Lija de agua grano 120 (pliego)", Precio_Unitario: 1250, Categoria: "Herramientas", Estado: "Activo"},
            {ID_Producto: 6, Nombre: "Cola Blanca", Descripción: "Adhesivo PVA 250ml", Precio_Unitario: 4450, Categoria: "Adhesivos", Estado: "Activo"},
            {ID_Producto: 7, Nombre: "Chapa de Roble", Descripción: "Chapa natural de roble 0.6mm", Precio_Unitario: 17500, Categoria: "Madera", Estado: "Activo"},
            {ID_Producto: 8, Nombre: "Tirador Moderno", Descripción: "Tirador acero inoxidable 128mm", Precio_Unitario: 7750, Categoria: "Ferretería", Estado: "Activo"}
        ];
        console.log('✅ Productos cargados:', productos.length);
        validarProductos(); // Validar después de cargar
    } catch (error) {
        console.error('❌ Error cargando productos:', error);
        mostrarAlerta('❌ Error al cargar productos', 'danger');
    }
}

// Función para validar y limpiar productos
function validarProductos() {
    try {
        if (!Array.isArray(productos)) {
            console.warn('⚠️ productos no es un array, reinicializando...');
            productos = [];
            return;
        }
        
        // Filtrar productos válidos
        const productosValidos = productos.filter(producto => {
            return producto && 
                   typeof producto === 'object' && 
                   (producto.ID_Producto || producto.id) && 
                   producto.Nombre;
        });
        
        if (productosValidos.length !== productos.length) {
            console.warn(`⚠️ Se encontraron ${productos.length - productosValidos.length} productos inválidos, limpiando...`);
            productos = productosValidos;
        }
        
        console.log(`✅ Productos validados: ${productos.length} productos válidos`);
        
    } catch (error) {
        console.error('❌ Error validando productos:', error);
        productos = []; // Reinicializar en caso de error grave
    }
}

// Función mejorada para enviar a SheetMonkey
async function enviarASheetMonkey(datos, tipo) {
    try {
        const fechaCR = obtenerFechaCostaRica();
        const nombreProyecto = document.getElementById('nombreProyecto').value.trim();
        const cliente = document.getElementById('cliente').value.trim();
        
        const payload = {
            TIPO: tipo,
            FECHA_ENVIO: fechaCR.fechaCompleta,
            HORA_ENVIO: fechaCR.hora,
            USUARIO_ACCION: usuarioActual,
            USUARIO_CREACION: usuarioActual,
            USUARIO_CREADOR: usuarioActual,
            PROYECTO: nombreProyecto,
            CLIENTE: cliente,
            TIMESTAMP: fechaCR.timestamp,
            ...datos
        };
        
        console.log(`📤 Enviando ${tipo}:`, payload);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 segundos timeout
        
        const response = await fetch(SHEETMONKEY_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        console.log('📊 Status de respuesta:', response.status);
        
        const responseText = await response.text();
        console.log('📄 Respuesta completa:', responseText);
        
        if (!response.ok) {
            throw new Error(`Error HTTP ${response.status}: ${responseText}`);
        }
        
        // Intentar parsear como JSON
        let result;
        try {
            result = JSON.parse(responseText);
        } catch (parseError) {
            console.log('ℹ️ No es JSON válido, pero la respuesta fue exitosa');
            result = { message: 'Guardado exitosamente', raw: responseText };
        }
        
        console.log('✅ Resultado parseado:', result);
        conexionActiva = true;
        mostrarEstadoConexion(true);
        return { success: true, data: result };
        
    } catch (error) {
        console.error('❌ Error completo en SheetMonkey:', error);
        conexionActiva = false;
        mostrarEstadoConexion(false);
        
        if (error.name === 'AbortError') {
            return { success: false, error: 'Timeout de conexión' };
        }
        
        return { success: false, error: error.message };
    }
}

// Función para probar conexión
async function probarConexion() {
    if (!validarUsuario()) return;
    
    const datosPrueba = {
        TIPO: 'PRUEBA',
        Mensaje: 'Test de conexion',
        Fecha: obtenerFechaCostaRica().fechaCompleta,
        Numero: Math.random(),
        Usuario: usuarioActual
    };
    
    console.log('🧪 Probando conexión con SheetMonkey...');
    mostrarAlerta('🧪 Probando conexión...', 'info');
    
    const resultado = await enviarASheetMonkey(datosPrueba, 'TEST');
    
    if (resultado.success) {
        console.log('✅ Conexión exitosa');
        mostrarAlerta('✅ Conexión con SheetMonkey funcionando correctamente', 'success');
    } else {
        console.log('❌ Error en conexión:', resultado.error);
        mostrarAlerta(`❌ Error de conexión: ${resultado.error}`, 'danger');
    }
    
    return resultado;
}

// Buscar producto (corregido)
function buscarProducto() {
    if (!validarUsuario()) return;
    
    try {
        const termino = document.getElementById('buscarProducto').value;
        
        if (!termino || termino.trim() === '') {
            mostrarAlerta('⚠️ Ingresa un término de búsqueda', 'warning');
            return;
        }
        
        const terminoBusqueda = termino.toLowerCase().trim();
        
        // Validar que productos existe y es un array
        if (!Array.isArray(productos) || productos.length === 0) {
            mostrarAlerta('⚠️ No hay productos disponibles para buscar', 'warning');
            return;
        }
        
        const resultados = productos.filter(producto => {
            try {
                // Validar que el producto existe y tiene las propiedades necesarias
                if (!producto || typeof producto !== 'object') {
                    return false;
                }
                
                // Verificar estado (por defecto Activo si no está definido)
                const estado = producto.Estado || 'Activo';
                if (estado !== 'Activo') {
                    return false;
                }
                
                // Buscar en nombre (obligatorio)
                const nombre = (producto.Nombre || '').toString().toLowerCase();
                if (nombre.includes(terminoBusqueda)) {
                    return true;
                }
                
                // Buscar en descripción (opcional)
                const descripcion = (producto.Descripción || producto.Descripcion || '').toString().toLowerCase();
                if (descripcion.includes(terminoBusqueda)) {
                    return true;
                }
                
                // Buscar en categoría (opcional)
                const categoria = (producto.Categoria || '').toString().toLowerCase();
                if (categoria.includes(terminoBusqueda)) {
                    return true;
                }
                
                return false;
            } catch (errorProducto) {
                console.warn('⚠️ Error procesando producto:', producto, errorProducto);
                return false;
            }
        });
        
        console.log(`🔍 Búsqueda: "${terminoBusqueda}" - Encontrados: ${resultados.length} productos`);
        mostrarResultadosBusqueda(resultados, terminoBusqueda);
        
    } catch (error) {
        console.error('❌ Error completo en búsqueda:', error);
        console.error('❌ Stack trace:', error.stack);
        console.error('❌ Productos actuales:', productos);
        mostrarAlerta('❌ Error al buscar productos. Revisa la consola para más detalles.', 'danger');
    }
}

// Mostrar resultados de búsqueda (corregido)
function mostrarResultadosBusqueda(resultados, termino) {
    try {
        const contenedorResultados = document.getElementById('resultadosBusqueda');
        const listaResultados = document.getElementById('listaResultados');
        
        if (!contenedorResultados || !listaResultados) {
            throw new Error('Elementos de resultados no encontrados en el DOM');
        }
        
        if (!Array.isArray(resultados)) {
            throw new Error('Los resultados no son un array válido');
        }
        
        if (resultados.length === 0) {
            listaResultados.innerHTML = `
                <div class="alert alert-info">
                    <i class="fas fa-search me-2"></i>
                    No se encontraron productos para "<strong>${termino}</strong>". 
                    <button class="btn btn-sm btn-success ms-2" onclick="agregarProductoNuevo()">
                        <i class="fas fa-plus me-1"></i>Crear nuevo producto
                    </button>
                </div>
            `;
        } else {
            const htmlResultados = resultados.map(producto => {
                try {
                    // Validar datos del producto
                    const id = producto.ID_Producto || producto.id || 0;
                    const nombre = producto.Nombre || 'Sin nombre';
                    const descripcion = producto.Descripción || producto.Descripcion || 'Sin descripción';
                    const precio = producto.Precio_Unitario || 0;
                    const categoria = producto.Categoria || 'Sin categoría';
                    
                    return `
                        <div class="resultado-busqueda">
                            <div class="row align-items-center">
                                <div class="col-md-6">
                                    <h6 class="mb-1">
                                        <i class="fas fa-box me-2 text-primary"></i>
                                        ${nombre}
                                    </h6>
                                    <p class="mb-1 text-muted small">${descripcion}</p>
                                    <span class="badge bg-secondary">${categoria}</span>
                                </div>
                                <div class="col-md-3 text-center">
                                    <h5 class="mb-0 text-success">₡${formatearColones(precio)}</h5>
                                    <small class="text-muted">Precio unitario</small>
                                </div>
                                <div class="col-md-3 text-end">
                                    <button class="btn btn-primary btn-sm" onclick="agregarProductoACotizacion(${id})">
                                        <i class="fas fa-plus me-1"></i>Agregar
                                    </button>
                                </div>
                            </div>
                        </div>
                    `;
                } catch (errorProducto) {
                    console.warn('⚠️ Error renderizando producto:', producto, errorProducto);
                    return ''; // Omitir productos con errores
                }
            }).filter(html => html !== '').join('');
            
            listaResultados.innerHTML = htmlResultados;
        }
        
        contenedorResultados.style.display = 'block';
        contenedorResultados.scrollIntoView({ behavior: 'smooth' });
        
    } catch (error) {
        console.error('❌ Error mostrando resultados:', error);
        console.error('❌ Resultados recibidos:', resultados);
        mostrarAlerta('❌ Error al mostrar resultados de búsqueda', 'danger');
    }
}

// Agregar producto a cotización (mejorado)
function agregarProductoACotizacion(productoId) {
    if (!validarUsuario()) return;
    
    try {
        // Validar productos antes de buscar
        validarProductos();
        
        const producto = productos.find(p => {
            const id = p.ID_Producto || p.id;
            return id == productoId; // Usar == para comparar números y strings
        });
        
        if (!producto) {
            console.error('❌ Producto no encontrado con ID:', productoId);
            console.log('📋 Productos disponibles:', productos.map(p => ({id: p.ID_Producto || p.id, nombre: p.Nombre})));
            mostrarAlerta('❌ Producto no encontrado', 'danger');
            return;
        }
        
        const yaAgregado = cotizacionActual.materiales.find(m => {
            const idMaterial = m.id || m.ID_Producto;
            const idProducto = producto.ID_Producto || producto.id;
            return idMaterial == idProducto;
        });
        
        if (yaAgregado) {
            mostrarAlerta('⚠️ Este producto ya está agregado. Puedes modificar la cantidad en la lista.', 'warning');
            return;
        }
        
        const cantidad = prompt('Ingrese la cantidad:', '1');
        if (!cantidad || parseFloat(cantidad) <= 0) {
            return;
        }
        
        const cantidadNum = parseFloat(cantidad);
        const fechaCR = obtenerFechaCostaRica();
        
        // Usar valores seguros
        const precio = producto.Precio_Unitario || 0;
        const nombre = producto.Nombre || 'Sin nombre';
        const descripcion = producto.Descripción || producto.Descripcion || 'Sin descripción';
        const categoria = producto.Categoria || 'Sin categoría';
        const id = producto.ID_Producto || producto.id || Date.now();
        
        const item = {
            id: id,
            nombre: nombre,
            descripcion: descripcion,
            precio: precio,
            cantidad: cantidadNum,
            subtotal: precio * cantidadNum,
            categoria: categoria,
            usuarioAgrego: usuarioActual,
            fechaAgrego: fechaCR.fechaCompleta,
            proyecto: document.getElementById('nombreProyecto').value.trim(),
            cliente: document.getElementById('cliente').value.trim()
        };
        
        cotizacionActual.materiales.push(item);
        actualizarListaMateriales();
        calcularTotales();
        actualizarEstadisticas();
        
        mostrarAlerta(`✅ ${nombre} agregado por ${usuarioActual}`, 'success');
        
        // Limpiar búsqueda
        document.getElementById('buscarProducto').value = '';
        document.getElementById('resultadosBusqueda').style.display = 'none';
        
    } catch (error) {
        console.error('❌ Error agregando producto:', error);
        console.error('❌ ID del producto:', productoId);
        console.error('❌ Productos disponibles:', productos);
        mostrarAlerta('❌ Error al agregar producto', 'danger');
    }
}

// Actualizar lista de materiales en la interfaz
function actualizarListaMateriales() {
    try {
        const container = document.getElementById('listaMateriales');
        
        if (!container) {
            throw new Error('Contenedor de materiales no encontrado');
        }
        
        if (cotizacionActual.materiales.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-box-open"></i>
                    <h5>No hay materiales agregados</h5>
                    <p>Busca y agrega productos para comenzar tu cotización</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = cotizacionActual.materiales.map((item, index) => `
            <div class="producto-item">
                <div class="row align-items-center">
                    <div class="col-md-4">
                        <h6 class="mb-1">
                            <i class="fas fa-box me-2 text-primary"></i>
                            ${item.nombre}
                        </h6>
                        <p class="mb-1 text-muted small">${item.descripcion}</p>
                        <div>
                            <span class="badge bg-info">${item.categoria}</span>
                            <span class="badge bg-secondary ms-1">Por: ${item.usuarioAgrego || usuarioActual}</span>
                        </div>
                    </div>
                    <div class="col-md-2">
                        <label class="form-label small">Cantidad:</label>
                        <input type="number" class="form-control form-control-sm" 
                               value="${item.cantidad}" min="0.1" step="0.1"
                               onchange="actualizarCantidad(${index}, this.value)">
                    </div>
                    <div class="col-md-2 text-center">
                        <label class="form-label small">Precio Unit.:</label>
                        <div class="fw-bold text-success">₡${formatearColones(item.precio)}</div>
                    </div>
                    <div class="col-md-2 text-center">
                        <label class="form-label small">Subtotal:</label>
                        <div class="fw-bold text-primary">₡${formatearColones(item.subtotal)}</div>
                    </div>
                    <div class="col-md-2 text-end">
                        <button class="btn btn-outline-primary btn-sm me-1" onclick="editarItem(${index})" title="Editar precio">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-outline-danger btn-sm" onclick="eliminarItem(${index})" title="Eliminar">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('❌ Error actualizando lista de materiales:', error);
        mostrarAlerta('❌ Error al actualizar lista de materiales', 'danger');
    }
}

// Actualizar cantidad de un item
function actualizarCantidad(index, nuevaCantidad) {
    if (!validarUsuario()) return;
    
    try {
        const cantidad = parseFloat(nuevaCantidad);
        
        if (isNaN(cantidad) || cantidad <= 0) {
            mostrarAlerta('⚠️ La cantidad debe ser mayor a 0', 'warning');
            actualizarListaMateriales();
            return;
        }
        
        const valorAnterior = cotizacionActual.materiales[index].cantidad;
        cotizacionActual.materiales[index].cantidad = cantidad;
        cotizacionActual.materiales[index].subtotal = 
            cotizacionActual.materiales[index].precio * cantidad;
        
        // Registrar cambio
        registrarCambio('Materiales', cotizacionActual.materiales[index].id, 'UPDATE', 
            `Cantidad cambiada de ${valorAnterior} a ${cantidad}`, usuarioActual);
        
        actualizarListaMateriales();
        calcularTotales();
        actualizarEstadisticas();
    } catch (error) {
        console.error('❌ Error actualizando cantidad:', error);
        mostrarAlerta('❌ Error al actualizar cantidad', 'danger');
    }
}

// Editar item (cambiar precio)
function editarItem(index) {
    if (!validarUsuario()) return;
    
    try {
        const item = cotizacionActual.materiales[index];
        const nuevoPrecio = prompt(`Editar precio de ${item.nombre}:`, item.precio);
        
        if (nuevoPrecio && parseFloat(nuevoPrecio) > 0) {
            const precioAnterior = item.precio;
            item.precio = parseFloat(nuevoPrecio);
            item.subtotal = item.precio * item.cantidad;
            
            // Registrar cambio
            registrarCambio('Materiales', item.id, 'UPDATE', 
                `Precio cambiado de ₡${formatearColones(precioAnterior)} a ₡${formatearColones(item.precio)}`, usuarioActual);
            
            actualizarListaMateriales();
            calcularTotales();
            actualizarEstadisticas();
            mostrarAlerta(`✅ Precio actualizado por ${usuarioActual}`, 'success');
        }
    } catch (error) {
        console.error('❌ Error editando item:', error);
        mostrarAlerta('❌ Error al editar item', 'danger');
    }
}

// Eliminar item
function eliminarItem(index) {
    if (!validarUsuario()) return;
    
    try {
        const item = cotizacionActual.materiales[index];
        
        if (confirm(`¿Estás seguro de eliminar "${item.nombre}"?`)) {
            // Registrar cambio antes de eliminar
            registrarCambio('Materiales', item.id, 'DELETE', 
                `Producto eliminado: ${item.nombre}`, usuarioActual);
            
            cotizacionActual.materiales.splice(index, 1);
            actualizarListaMateriales();
            calcularTotales();
            actualizarEstadisticas();
            mostrarAlerta(`🗑️ Producto eliminado por ${usuarioActual}`, 'info');
        }
    } catch (error) {
        console.error('❌ Error eliminando item:', error);
        mostrarAlerta('❌ Error al eliminar item', 'danger');
    }
}

// Calcular totales (optimizado)
function calcularTotales() {
    try {
        // Total materiales
        const subtotalMateriales = cotizacionActual.materiales.reduce((sum, item) => sum + (item.subtotal || 0), 0);
        
        // Obtener valores de transporte
        const kilometros = parseFloat(document.getElementById('kilometros').value) || 0;
        const costoPorKm = parseFloat(document.getElementById('costoPorKm').value) || 0;
        const peajes = parseFloat(document.getElementById('costoPeajes').value) || 0;
        const costoTransporte = (kilometros * costoPorKm) + peajes;
        
        // Obtener valores de mano de obra
        const horasTrabajo = parseFloat(document.getElementById('horasTrabajo').value) || 0;
        const precioHora = parseFloat(document.getElementById('precioHora').value) || 0;
        const costoTrabajo = horasTrabajo * precioHora;
        
        // Total mano de obra
        const subtotalManoObra = costoTransporte + costoTrabajo;
        
        // Subtotal antes de impuestos y descuentos
        const subtotalGeneral = subtotalMateriales + subtotalManoObra;
        
        // Calcular descuento
        const porcentajeDescuento = parseFloat(document.getElementById('porcentajeDescuento').value) || 0;
        const montoDescuento = (subtotalGeneral * porcentajeDescuento) / 100;
        
        // Subtotal después del descuento
        const subtotalConDescuento = subtotalGeneral - montoDescuento;
        
        // Calcular IVA
        const ivaHabilitado = document.getElementById('habilitarIVA').checked;
        const montoIVA = ivaHabilitado ? (subtotalConDescuento * 0.13) : 0;
        
        // Total final
        const totalFinal = subtotalConDescuento + montoIVA;
        
        // Actualizar interfaz de forma segura
        const elementos = {
            'subtotalMateriales': subtotalMateriales,
            'subtotalManoObra': subtotalManoObra,
            'totalDescuento': montoDescuento,
            'totalIVA': montoIVA,
            'totalGeneral': totalFinal,
            'montoDescuento': Math.round(montoDescuento),
            'resumenKm': kilometros.toFixed(1),
            'resumenCostoPorKm': formatearColones(costoPorKm),
            'resumenPeajes': formatearColones(peajes),
            'resumenTransporte': formatearColones(costoTransporte),
            'resumenHoras': horasTrabajo.toFixed(1),
            'resumenPrecioHora': formatearColones(precioHora),
            'resumenTotalManoObra': formatearColones(costoTrabajo)
        };
        
        Object.entries(elementos).forEach(([id, valor]) => {
            const elemento = document.getElementById(id);
            if (elemento) {
                if (id === 'montoDescuento') {
                    elemento.value = valor;
                } else if (['resumenKm', 'resumenHoras'].includes(id)) {
                    elemento.textContent = valor;
                } else if (id.startsWith('resumen')) {
                    elemento.textContent = valor;
                } else {
                    elemento.textContent = formatearColones(valor);
                }
            }
        });
        
        // Actualizar objeto cotización
        cotizacionActual.manoObra = {
            kilometros: kilometros,
            costoPorKm: costoPorKm,
            peajes: peajes,
            costoTransporte: costoTransporte,
            horasTrabajo: horasTrabajo,
            precioHora: precioHora,
            costoTrabajo: costoTrabajo,
            total: subtotalManoObra
        };
        
        cotizacionActual.impuestos = {
            ivaHabilitado: ivaHabilitado,
            porcentajeDescuento: porcentajeDescuento,
            montoDescuento: montoDescuento,
            montoIVA: montoIVA,
            subtotalMateriales: subtotalMateriales,
            subtotalManoObra: subtotalManoObra,
            subtotalGeneral: subtotalGeneral,
            totalFinal: totalFinal
        };
        
        // Actualizar estadísticas si están visibles
        actualizarEstadisticas();
        
    } catch (error) {
        console.error('❌ Error calculando totales:', error);
        mostrarAlerta('❌ Error al calcular totales', 'danger');
    }
}

// Actualizar estadísticas
function actualizarEstadisticas() {
    try {
        const totalItems = cotizacionActual.materiales.length;
        const subtotalMateriales = cotizacionActual.impuestos.subtotalMateriales || 0;
        const subtotalManoObra = cotizacionActual.manoObra.total || 0;
        const totalFinal = cotizacionActual.impuestos.totalFinal || 0;
        
        const elementos = {
            'totalItems': totalItems,
            'totalMaterialesStats': '₡' + formatearColones(subtotalMateriales),
            'totalManoObraStats': '₡' + formatearColones(subtotalManoObra),
            'totalGeneralStats': '₡' + formatearColones(totalFinal)
        };
        
        Object.entries(elementos).forEach(([id, valor]) => {
            const elemento = document.getElementById(id);
            if (elemento) {
                elemento.textContent = valor;
            }
        });
    } catch (error) {
        console.error('❌ Error actualizando estadísticas:', error);
    }
}

// Agregar nuevo producto
function agregarProductoNuevo() {
    if (!validarUsuario()) return;
    
    try {
        // Limpiar el formulario
        document.getElementById('formNuevoProducto').reset();
        document.getElementById('nuevoProductoEstado').value = 'Activo';
        
        // Mostrar modal
        const modal = new bootstrap.Modal(document.getElementById('modalNuevoProducto'));
        modal.show();
    } catch (error) {
        console.error('❌ Error abriendo modal de producto:', error);
        mostrarAlerta('❌ Error al abrir formulario de producto', 'danger');
    }
}

// Guardar nuevo producto (con validación mejorada)
async function guardarNuevoProducto() {
    if (!validarUsuario()) return;
    
    try {
        const nombre = document.getElementById('nuevoProductoNombre').value.trim();
        const descripcion = document.getElementById('nuevoProductoDescripcion').value.trim();
        const precio = parseFloat(document.getElementById('nuevoProductoPrecio').value);
        const categoria = document.getElementById('nuevoProductoCategoria').value;
        const estado = document.getElementById('nuevoProductoEstado').value;
        
        // Validaciones
        if (!nombre) {
            mostrarAlerta('⚠️ El nombre del producto es obligatorio', 'warning');
            return;
        }
        
        if (!precio || precio <= 0) {
            mostrarAlerta('⚠️ El precio debe ser mayor a 0', 'warning');
            return;
        }
        
        // Mostrar loading
        const btnGuardar = document.querySelector('#modalNuevoProducto .btn-success');
        const textoOriginal = btnGuardar.innerHTML;
        btnGuardar.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Guardando...';
        btnGuardar.disabled = true;
        
        const fechaCR = obtenerFechaCostaRica();
        
        const nuevoProducto = {
            ID_Producto: Date.now(),
            Nombre: nombre,
            Descripcion: descripcion || 'Sin descripcion',
            Descripción: descripcion || 'Sin descripcion', // Ambas versiones por compatibilidad
            Precio_Unitario: precio,
            Categoria: categoria || 'Otros',
            Estado: estado,
            Usuario_Creacion: usuarioActual,
            Usuario_Creador: usuarioActual,
            Fecha_Creacion: fechaCR.fecha,
            Hora_Creacion: fechaCR.hora,
            Proyecto: document.getElementById('nombreProyecto').value.trim(),
            Cliente: document.getElementById('cliente').value.trim()
        };
        
        console.log('🔄 Intentando guardar producto:', nuevoProducto);
        const resultado = await enviarASheetMonkey(nuevoProducto, 'PRODUCTO');
        
        // Restaurar botón
        btnGuardar.innerHTML = textoOriginal;
        btnGuardar.disabled = false;
        
        if (resultado.success) {
            // Agregar a la lista local
            productos.push(nuevoProducto);
            
            // Validar productos después de agregar
            validarProductos();
            
            // Debug: mostrar productos actuales
            console.log('📋 Productos después de agregar:', productos.map(p => ({
                id: p.ID_Producto || p.id,
                nombre: p.Nombre,
                precio: p.Precio_Unitario
            })));
            
            // Cerrar modal
            bootstrap.Modal.getInstance(document.getElementById('modalNuevoProducto')).hide();
            
            mostrarAlerta(`✅ Producto "${nombre}" creado por ${usuarioActual}`, 'success');
            
            // Registrar en historial
            await registrarCambio('Productos', nuevoProducto.ID_Producto, 'INSERT', `Nuevo producto: ${nombre}`, usuarioActual);
            
        } else {
            mostrarAlerta(`❌ Error al guardar: ${resultado.error}`, 'danger');
        }
    } catch (error) {
        console.error('❌ Error guardando producto:', error);
        mostrarAlerta(`❌ Error inesperado: ${error.message}`, 'danger');
        
        // Restaurar botón en caso de error
        const btnGuardar = document.querySelector('#modalNuevoProducto .btn-success');
        if (btnGuardar) {
            btnGuardar.innerHTML = '<i class="fas fa-save me-1"></i>Guardar Producto';
            btnGuardar.disabled = false;
        }
    }
}

// Guardar cotización completa (optimizado)
async function guardarCotizacion() {
    if (!validarUsuario()) return;
    
    try {
        const nombreProyecto = document.getElementById('nombreProyecto').value.trim();
        const cliente = document.getElementById('cliente').value.trim();
        const fechaCreacion = document.getElementById('fechaCreacion').value;
        
        // Validaciones
        if (!nombreProyecto || !cliente) {
            mostrarAlerta('⚠️ Por favor complete todos los campos obligatorios (Proyecto y Cliente)', 'warning');
            return;
        }
        
        if (cotizacionActual.materiales.length === 0) {
            mostrarAlerta('⚠️ Debe agregar al menos un material a la cotización', 'warning');
            return;
        }
        
        // Mostrar loading
        const btnGuardar = document.querySelector('.total-section .btn-warning');
        const textoOriginal = btnGuardar.innerHTML;
        btnGuardar.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Guardando...';
        btnGuardar.disabled = true;
        
        const cotizacionId = Date.now();
        const fechaCR = obtenerFechaCostaRica();
        
        // Calcular totales finales
        calcularTotales();
        
        // Datos de la cotización
        const cotizacion = {
            ID_Cotizacion: cotizacionId,
            Nombre_Proyecto: nombreProyecto,
            Cliente: cliente,
            Usuario_Creador: usuarioActual,
            Usuario_Creacion: usuarioActual,
            Fecha_Creacion: fechaCreacion,
            Hora_Creacion: fechaCR.hora,
            Subtotal_Materiales: cotizacionActual.impuestos.subtotalMateriales || 0,
            Subtotal_Mano_Obra: cotizacionActual.manoObra.total || 0,
            Porcentaje_Descuento: cotizacionActual.impuestos.porcentajeDescuento || 0,
            Monto_Descuento: cotizacionActual.impuestos.montoDescuento || 0,
            IVA_Habilitado: cotizacionActual.impuestos.ivaHabilitado ? 'Si' : 'No',
            Monto_IVA: cotizacionActual.impuestos.montoIVA || 0,
            Total_Final: cotizacionActual.impuestos.totalFinal || 0,
            Estado: 'Borrador',
            Cantidad_Items: cotizacionActual.materiales.length,
            Kilometros: cotizacionActual.manoObra.kilometros || 0,
            Costo_Por_Km: cotizacionActual.manoObra.costoPorKm || 0,
            Costo_Peajes: cotizacionActual.manoObra.peajes || 0,
            Costo_Transporte: cotizacionActual.manoObra.costoTransporte || 0,
            Horas_Trabajo: cotizacionActual.manoObra.horasTrabajo || 0,
            Precio_Hora: cotizacionActual.manoObra.precioHora || 0,
            Costo_Trabajo: cotizacionActual.manoObra.costoTrabajo || 0,
            Resumen_Materiales: cotizacionActual.materiales.map(m => `${m.nombre} (${m.cantidad})`).join(', ')
        };
        
        console.log('🔄 Intentando guardar cotización:', cotizacion);
        
        // 1. Guardar cotización principal
        const resultadoCotizacion = await enviarASheetMonkey(cotizacion, 'COTIZACION');
        
        if (!resultadoCotizacion.success) {
            throw new Error('Error guardando cotización principal: ' + resultadoCotizacion.error);
        }
        
        // 2. Guardar detalles de materiales
        for (let i = 0; i < cotizacionActual.materiales.length; i++) {
            const material = cotizacionActual.materiales[i];
            const detalle = {
                ID_Detalle: `${cotizacionId}_M${i + 1}`,
                ID_Cotizacion: cotizacionId,
                ID_Producto: material.id,
                Nombre_Producto: material.nombre,
                Descripcion: material.descripcion,
                Cantidad: material.cantidad,
                Precio_Unitario: material.precio,
                Subtotal: material.subtotal,
                Tipo: 'Material',
                Categoria: material.categoria,
                Usuario_Agrego: material.usuarioAgrego || usuarioActual,
                Usuario_Creacion: usuarioActual,
                Usuario_Creador: usuarioActual,
                Fecha_Modificacion: fechaCR.fecha,
                Hora_Modificacion: fechaCR.hora,
                Usuario_Modificacion: usuarioActual,
                Proyecto: nombreProyecto,
                Cliente: cliente
            };
            
            await enviarASheetMonkey(detalle, 'DETALLE');
        }
        
        // 3. Guardar transporte si hay valores
        if (cotizacionActual.manoObra.costoTransporte > 0) {
            const detalleTransporte = {
                ID_Detalle: `${cotizacionId}_TRANSPORTE`,
                ID_Cotizacion: cotizacionId,
                ID_Producto: 'TRANSPORTE',
                Nombre_Producto: 'Transporte',
                Descripcion: `${cotizacionActual.manoObra.kilometros} km + peajes`,
                Cantidad: 1,
                Precio_Unitario: cotizacionActual.manoObra.costoTransporte,
                Subtotal: cotizacionActual.manoObra.costoTransporte,
                Tipo: 'Transporte',
                Categoria: 'Servicios',
                Usuario_Agrego: usuarioActual,
                Usuario_Creacion: usuarioActual,
                Usuario_Creador: usuarioActual,
                Fecha_Modificacion: fechaCR.fecha,
                Hora_Modificacion: fechaCR.hora,
                Usuario_Modificacion: usuarioActual,
                Proyecto: nombreProyecto,
                Cliente: cliente
            };
            
            await enviarASheetMonkey(detalleTransporte, 'DETALLE');
        }
        
        // 4. Guardar mano de obra si hay valores
        if (cotizacionActual.manoObra.costoTrabajo > 0) {
            const detalleTrabajo = {
                ID_Detalle: `${cotizacionId}_TRABAJO`,
                ID_Cotizacion: cotizacionId,
                ID_Producto: 'HORAS_TRABAJO',
                Nombre_Producto: 'Horas de Trabajo',
                Descripcion: `${cotizacionActual.manoObra.horasTrabajo} horas de trabajo`,
                Cantidad: cotizacionActual.manoObra.horasTrabajo,
                Precio_Unitario: cotizacionActual.manoObra.precioHora,
                Subtotal: cotizacionActual.manoObra.costoTrabajo,
                Tipo: 'Mano_Obra',
                Categoria: 'Servicios',
                Usuario_Agrego: usuarioActual,
                Usuario_Creacion: usuarioActual,
                Usuario_Creador: usuarioActual,
                Fecha_Modificacion: fechaCR.fecha,
                Hora_Modificacion: fechaCR.hora,
                Usuario_Modificacion: usuarioActual,
                Proyecto: nombreProyecto,
                Cliente: cliente
            };
            
            await enviarASheetMonkey(detalleTrabajo, 'DETALLE');
        }
        
        // 5. Registrar en historial
        await registrarCambio('Cotizaciones', cotizacionId, 'INSERT', `Nueva cotización: ${nombreProyecto}`, usuarioActual);
        
        // Restaurar botón
        btnGuardar.innerHTML = textoOriginal;
        btnGuardar.disabled = false;
        
        // Mostrar éxito
        mostrarAlerta(`
            ✅ <strong>¡Cotización guardada exitosamente!</strong><br>
            📋 ID: ${cotizacionId}<br>
            👤 Cliente: ${cliente}<br>
            👨‍💼 Creada por: ${usuarioActual}<br>
            📦 Items: ${cotizacionActual.materiales.length}<br>
            💰 Total: ₡${formatearColones(cotizacionActual.impuestos.totalFinal)}
        `, 'success');
        
        // Ofrecer generar PDF
        setTimeout(() => {
            if (confirm('¿Deseas generar el PDF de la cotización?')) {
                generarPDF(cotizacionId, nombreProyecto, cliente, fechaCreacion);
            }
        }, 2000);
        
        // Preguntar si desea crear una nueva cotización
        setTimeout(() => {
            if (confirm('¿Desea crear una nueva cotización?')) {
                nuevaCotizacion();
            }
        }, 4000);
        
    } catch (error) {
        console.error('❌ Error guardando cotización:', error);
        
        // Restaurar botón en caso de error
        const btnGuardar = document.querySelector('.total-section .btn-warning');
        if (btnGuardar) {
            btnGuardar.innerHTML = '<i class="fas fa-save me-1"></i>Guardar Cotización';
            btnGuardar.disabled = false;
        }
        
        mostrarAlerta(`❌ Error al guardar la cotización: ${error.message}`, 'danger');
    }
}

// Función para crear nueva cotización (optimizada)
function nuevaCotizacion() {
    try {
        // Limpiar datos de cotización actual
        cotizacionActual = {
            materiales: [],
            manoObra: {
                kilometros: 0,
                costoPorKm: 0,
                peajes: 0,
                horasTrabajo: 0,
                precioHora: 0
            },
            impuestos: {
                ivaHabilitado: false,
                porcentajeDescuento: 0
            }
        };
        
        // Limpiar formulario
        const campos = [
            'nombreProyecto', 'cliente', 'kilometros', 'costoPorKm', 
            'costoPeajes', 'horasTrabajo', 'precioHora', 'porcentajeDescuento', 'buscarProducto'
        ];
        
        campos.forEach(id => {
            const elemento = document.getElementById(id);
            if (elemento) {
                elemento.value = '';
            }
        });
        
        const fechaCR = obtenerFechaCostaRica();
        document.getElementById('fechaCreacion').value = fechaCR.fecha;
        
        // Resetear checkboxes y selects
        document.getElementById('habilitarIVA').checked = false;
        document.getElementById('incluyePeajes').value = 'no';
        document.getElementById('costoPeajesContainer').style.display = 'none';
        document.getElementById('resultadosBusqueda').style.display = 'none';
        
        // Actualizar interfaz
        actualizarListaMateriales();
        calcularTotales();
        actualizarEstadisticas();
        
        // Ocultar estadísticas si están visibles
        document.getElementById('statsContainer').style.display = 'none';
        
        mostrarAlerta(`🆕 Nueva cotización iniciada por ${usuarioActual}`, 'info');
        
        // Focus en el primer campo
        document.getElementById('nombreProyecto').focus();
    } catch (error) {
        console.error('❌ Error creando nueva cotización:', error);
        mostrarAlerta('❌ Error al crear nueva cotización', 'danger');
    }
}

// Función para generar PDF (corregida para símbolo de colones)
async function generarPDF(cotizacionId, nombreProyecto, cliente, fecha) {
    try {
        // Cargar jsPDF desde CDN si no está disponible
        if (typeof window.jsPDF === 'undefined') {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
            document.head.appendChild(script);
            
            await new Promise((resolve) => {
                script.onload = resolve;
            });
        }
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Configuración
        const pageWidth = doc.internal.pageSize.width;
        const margin = 20;
        let yPosition = 30;
        
        // Título
        doc.setFontSize(20);
        doc.setFont(undefined, 'bold');
        doc.text('COTIZACION', pageWidth / 2, yPosition, { align: 'center' });
        
        yPosition += 20;
        
        // Información del proyecto
        doc.setFontSize(12);
        doc.setFont(undefined, 'normal');
        doc.text(`Proyecto: ${nombreProyecto}`, margin, yPosition);
        yPosition += 8;
        doc.text(`Cliente: ${cliente}`, margin, yPosition);
        yPosition += 8;
        doc.text(`Fecha: ${fecha}`, margin, yPosition);
        yPosition += 8;
        doc.text(`Creado por: ${usuarioActual}`, margin, yPosition);
        yPosition += 8;
        doc.text(`ID Cotizacion: ${cotizacionId}`, margin, yPosition);
        
        yPosition += 20;
        
        // Tabla de materiales
        doc.setFont(undefined, 'bold');
        doc.text('MATERIALES:', margin, yPosition);
        yPosition += 10;
        
        // Headers de tabla
        doc.setFontSize(10);
        const headers = ['Producto', 'Cant.', 'Precio Unit.', 'Subtotal'];
        const colWidths = [80, 25, 35, 35];
        let xPosition = margin;
        
        headers.forEach((header, index) => {
            doc.text(header, xPosition, yPosition);
            xPosition += colWidths[index];
        });
        
        yPosition += 5;
        doc.line(margin, yPosition, pageWidth - margin, yPosition);
        yPosition += 8;
        
        // Datos de materiales
        doc.setFont(undefined, 'normal');
        cotizacionActual.materiales.forEach(item => {
            if (yPosition > 250) { // Nueva página si es necesario
                doc.addPage();
                yPosition = 30;
            }
            
            xPosition = margin;
            doc.text(item.nombre.substring(0, 25), xPosition, yPosition);
            xPosition += colWidths[0];
            doc.text(item.cantidad.toString(), xPosition, yPosition);
            xPosition += colWidths[1];
            // Usar símbolo correcto para colones en PDF
            doc.text(`C${formatearColones(item.precio)}`, xPosition, yPosition);
            xPosition += colWidths[2];
            doc.text(`C${formatearColones(item.subtotal)}`, xPosition, yPosition);
            
            yPosition += 8;
        });
        
        yPosition += 10;
        
        // Transporte y mano de obra
        if (cotizacionActual.manoObra.costoTransporte > 0 || cotizacionActual.manoObra.costoTrabajo > 0) {
            doc.setFont(undefined, 'bold');
            doc.text('TRANSPORTE Y MANO DE OBRA:', margin, yPosition);
            yPosition += 10;
            
            doc.setFont(undefined, 'normal');
            if (cotizacionActual.manoObra.costoTransporte > 0) {
                doc.text(`Transporte (${cotizacionActual.manoObra.kilometros} km + peajes): C${formatearColones(cotizacionActual.manoObra.costoTransporte)}`, margin, yPosition);
                yPosition += 8;
            }
            
            if (cotizacionActual.manoObra.costoTrabajo > 0) {
                doc.text(`Horas de trabajo: ${cotizacionActual.manoObra.horasTrabajo} x C${formatearColones(cotizacionActual.manoObra.precioHora)} = C${formatearColones(cotizacionActual.manoObra.costoTrabajo)}`, margin, yPosition);
                yPosition += 8;
            }
            
            yPosition += 10;
        }
        
        // Totales
        doc.line(margin, yPosition, pageWidth - margin, yPosition);
        yPosition += 10;
        
        const subtotalMateriales = cotizacionActual.impuestos.subtotalMateriales || 0;
        const subtotalManoObra = cotizacionActual.manoObra.total || 0;
        const montoDescuento = cotizacionActual.impuestos.montoDescuento || 0;
        const montoIVA = cotizacionActual.impuestos.montoIVA || 0;
        const totalFinal = cotizacionActual.impuestos.totalFinal || 0;
        
        doc.text(`Subtotal Materiales: C${formatearColones(subtotalMateriales)}`, margin, yPosition);
        yPosition += 8;
        doc.text(`Subtotal Mano de Obra: C${formatearColones(subtotalManoObra)}`, margin, yPosition);
        yPosition += 8;
        
        if (montoDescuento > 0) {
            doc.text(`Descuento (${cotizacionActual.impuestos.porcentajeDescuento}%): -C${formatearColones(montoDescuento)}`, margin, yPosition);
            yPosition += 8;
        }
        
        if (montoIVA > 0) {
            doc.text(`IVA (13%): +C${formatearColones(montoIVA)}`, margin, yPosition);
            yPosition += 8;
        }
        
        doc.setFont(undefined, 'bold');
        doc.setFontSize(14);
        doc.text(`TOTAL FINAL: C${formatearColones(totalFinal)}`, margin, yPosition);
        
        // Pie de página
        yPosition = doc.internal.pageSize.height - 20;
        doc.setFontSize(8);
        doc.setFont(undefined, 'normal');
        const fechaCR = obtenerFechaCostaRica();
        doc.text(`Generado el ${fechaCR.fecha} a las ${fechaCR.hora} por ${usuarioActual}`, pageWidth / 2, yPosition, { align: 'center' });
        
        // Descargar PDF
        const nombreArchivo = `Cotizacion_${nombreProyecto.replace(/[^a-zA-Z0-9]/g, '_')}_${cotizacionId}.pdf`;
        doc.save(nombreArchivo);
        
        mostrarAlerta('📄 PDF generado y descargado exitosamente', 'success');
        
    } catch (error) {
        console.error('Error generando PDF:', error);
        mostrarAlerta('❌ Error al generar PDF: ' + error.message, 'danger');
    }
}

// Función para generar PDF desde el modal
function generarPDFDesdeModal() {
    try {
        const nombreProyecto = document.getElementById('nombreProyecto').value || 'Cotizacion';
        const cliente = document.getElementById('cliente').value || 'Cliente';
        const fecha = document.getElementById('fechaCreacion').value;
        const cotizacionId = Date.now();
        
        generarPDF(cotizacionId, nombreProyecto, cliente, fecha);
    } catch (error) {
        console.error('❌ Error generando PDF desde modal:', error);
        mostrarAlerta('❌ Error al generar PDF', 'danger');
    }
}

// Función para registrar cambios en el historial
async function registrarCambio(tabla, idRegistro, tipoOperacion, observaciones, usuario) {
    try {
        const fechaCR = obtenerFechaCostaRica();
        const nombreProyecto = document.getElementById('nombreProyecto').value.trim();
        const cliente = document.getElementById('cliente').value.trim();
        
        const cambio = {
            ID_Cambio: Date.now() + Math.random(),
            Tabla_Afectada: tabla,
            ID_Registro: idRegistro,
            Campo_Modificado: 'N/A',
            Valor_Anterior: '',
            Valor_Nuevo: '',
            Usuario: usuario,
            Usuario_Creacion: usuario,
            Usuario_Creador: usuario,
            Fecha_Cambio: fechaCR.fecha,
            Hora_Cambio: fechaCR.hora,
            Tipo_Operacion: tipoOperacion,
            Observaciones: observaciones,
            Proyecto: nombreProyecto,
            Cliente: cliente
        };
        
        await enviarASheetMonkey(cambio, 'HISTORIAL');
        console.log('📝 Cambio registrado:', cambio);
    } catch (error) {
        console.error('❌ Error registrando cambio:', error);
    }
}

// Función para vista previa (actualizada)
function previsualizarCotizacion() {
    if (!validarUsuario()) return;
    
    try {
        const nombreProyecto = document.getElementById('nombreProyecto').value || 'Sin nombre';
        const cliente = document.getElementById('cliente').value || 'Sin cliente';
        const fecha = document.getElementById('fechaCreacion').value || new Date().toISOString().split('T')[0];
        
        const subtotalMateriales = cotizacionActual.impuestos.subtotalMateriales || 0;
        const subtotalManoObra = cotizacionActual.manoObra.total || 0;
        const montoDescuento = cotizacionActual.impuestos.montoDescuento || 0;
        const montoIVA = cotizacionActual.impuestos.montoIVA || 0;
        const totalFinal = cotizacionActual.impuestos.totalFinal || 0;
        
        const contenido = `
            <div class="container-fluid">
                <div class="text-center mb-4">
                    <h2>📋 ${nombreProyecto}</h2>
                    <p class="text-muted">
                        <strong>Cliente:</strong> ${cliente} | 
                        <strong>Fecha:</strong> ${fecha} | 
                        <strong>Creado por:</strong> ${usuarioActual}
                    </p>
                </div>
                
                <h4><i class="fas fa-boxes me-2"></i>Materiales:</h4>
                <div class="table-responsive">
                    <table class="table table-striped">
                        <thead class="table-dark">
                            <tr>
                                <th>Producto</th>
                                <th>Descripción</th>
                                <th>Cantidad</th>
                                <th>Precio Unit.</th>
                                <th>Subtotal</th>
                                <th>Agregado por</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${cotizacionActual.materiales.map(item => `
                                <tr>
                                    <td><strong>${item.nombre}</strong></td>
                                    <td>${item.descripcion}</td>
                                    <td>${item.cantidad}</td>
                                    <td>₡${formatearColones(item.precio)}</td>
                                    <td><strong>₡${formatearColones(item.subtotal)}</strong></td>
                                    <td><span class="badge bg-secondary">${item.usuarioAgrego || usuarioActual}</span></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                
                ${(cotizacionActual.manoObra.costoTransporte > 0 || cotizacionActual.manoObra.costoTrabajo > 0) ? `
                    <h4><i class="fas fa-tools me-2"></i>Transporte y Mano de Obra:</h4>
                    <div class="table-responsive">
                        <table class="table table-striped">
                            <thead class="table-warning">
                                <tr>
                                    <th>Concepto</th>
                                    <th>Detalle</th>
                                    <th>Subtotal</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${cotizacionActual.manoObra.costoTransporte > 0 ? `
                                    <tr>
                                        <td><strong>Transporte</strong></td>
                                        <td>${cotizacionActual.manoObra.kilometros} km + peajes</td>
                                        <td><strong>₡${formatearColones(cotizacionActual.manoObra.costoTransporte)}</strong></td>
                                    </tr>
                                ` : ''}
                                ${cotizacionActual.manoObra.costoTrabajo > 0 ? `
                                    <tr>
                                        <td><strong>Horas de Trabajo</strong></td>
                                        <td>${cotizacionActual.manoObra.horasTrabajo} horas × ₡${formatearColones(cotizacionActual.manoObra.precioHora)}</td>
                                        <td><strong>₡${formatearColones(cotizacionActual.manoObra.costoTrabajo)}</strong></td>
                                    </tr>
                                ` : ''}
                            </tbody>
                        </table>
                    </div>
                ` : ''}
                
                <div class="row mt-4">
                    <div class="col-md-6 offset-md-6">
                        <table class="table table-bordered">
                            <tr>
                                <td><strong><i class="fas fa-boxes me-1"></i>Subtotal Materiales:</strong></td>
                                <td class="text-end"><strong>₡${formatearColones(subtotalMateriales)}</strong></td>
                            </tr>
                            <tr>
                                <td><strong><i class="fas fa-tools me-1"></i>Subtotal Mano de Obra:</strong></td>
                                <td class="text-end"><strong>₡${formatearColones(subtotalManoObra)}</strong></td>
                            </tr>
                            ${montoDescuento > 0 ? `
                                <tr class="table-warning">
                                    <td><strong><i class="fas fa-minus me-1"></i>Descuento (${cotizacionActual.impuestos.porcentajeDescuento}%):</strong></td>
                                    <td class="text-end"><strong>-₡${formatearColones(montoDescuento)}</strong></td>
                                </tr>
                            ` : ''}
                            ${montoIVA > 0 ? `
                                <tr class="table-info">
                                    <td><strong><i class="fas fa-plus me-1"></i>IVA (13%):</strong></td>
                                    <td class="text-end"><strong>+₡${formatearColones(montoIVA)}</strong></td>
                                </tr>
                            ` : ''}
                            <tr class="table-success">
                                <td><strong><i class="fas fa-calculator me-1"></i>TOTAL FINAL:</strong></td>
                                <td class="text-end"><h4 class="mb-0">₡${formatearColones(totalFinal)}</h4></td>
                            </tr>
                        </table>
                    </div>
                </div>
                
                <div class="text-center mt-4 text-muted">
                    <small>Cotización generada por ${usuarioActual}</small>
                </div>
            </div>
        `;
        
        document.getElementById('contenidoVistaPrevia').innerHTML = contenido;
        const modal = new bootstrap.Modal(document.getElementById('modalVistaPrevia'));
        modal.show();
    } catch (error) {
        console.error('❌ Error en vista previa:', error);
        mostrarAlerta('❌ Error al generar vista previa', 'danger');
    }
}

// Función para imprimir (actualizada)
function imprimirCotizacion() {
    try {
        const contenido = document.getElementById('contenidoVistaPrevia').innerHTML;
        const nombreProyecto = document.getElementById('nombreProyecto').value || 'Cotizacion';
        
        const ventanaImpresion = window.open('', '_blank');
        ventanaImpresion.document.write(`
            <html>
                <head>
                    <title>Cotización - ${nombreProyecto}</title>
                    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
                    <style>
                        @media print {
                            .no-print { display: none; }
                            body { font-size: 12px; }
                            .table { font-size: 11px; }
                        }
                        body { font-family: Arial, sans-serif; }
                    </style>
                </head>
                <body class="p-4">
                    ${contenido}
                </body>
            </html>
        `);
        ventanaImpresion.document.close();
        ventanaImpresion.print();
    } catch (error) {
        console.error('❌ Error imprimiendo:', error);
        mostrarAlerta('❌ Error al imprimir', 'danger');
    }
}

// Función para mostrar estadísticas
function mostrarEstadisticas() {
    try {
        const statsContainer = document.getElementById('statsContainer');
        if (statsContainer.style.display === 'none' || !statsContainer.style.display) {
            statsContainer.style.display = 'flex';
            actualizarEstadisticas();
            mostrarAlerta('📊 Estadísticas mostradas', 'info');
        } else {
            statsContainer.style.display = 'none';
            mostrarAlerta('📊 Estadísticas ocultas', 'info');
        }
    } catch (error) {
        console.error('❌ Error mostrando estadísticas:', error);
        mostrarAlerta('❌ Error al mostrar estadísticas', 'danger');
    }
}

// Función para exportar datos (actualizada)
function exportarDatos() {
    if (!validarUsuario()) return;
    
    try {
        if (cotizacionActual.materiales.length === 0) {
            mostrarAlerta('⚠️ No hay datos para exportar', 'warning');
            return;
        }
        
        const nombreProyecto = document.getElementById('nombreProyecto').value || 'cotizacion';
        const fechaCR = obtenerFechaCostaRica();
        
        // Crear CSV
        let csv = 'Producto,Descripcion,Cantidad,Precio Unitario (CRC),Subtotal (CRC),Categoria,Agregado por,Proyecto,Cliente\n';
        cotizacionActual.materiales.forEach(item => {
            csv += `"${item.nombre}","${item.descripcion}",${item.cantidad},${item.precio},${item.subtotal},"${item.categoria}","${item.usuarioAgrego || usuarioActual}","${item.proyecto || ''}","${item.cliente || ''}"\n`;
        });
        
        // Agregar totales
        const subtotalMateriales = cotizacionActual.impuestos.subtotalMateriales || 0;
        const subtotalManoObra = cotizacionActual.manoObra.total || 0;
        const montoDescuento = cotizacionActual.impuestos.montoDescuento || 0;
        const montoIVA = cotizacionActual.impuestos.montoIVA || 0;
        const totalFinal = cotizacionActual.impuestos.totalFinal || 0;
        
        csv += '\n';
        csv += `"SUBTOTAL MATERIALES","","","","${subtotalMateriales}","","","",""\n`;
        csv += `"SUBTOTAL MANO DE OBRA","","","","${subtotalManoObra}","","","",""\n`;
        csv += `"DESCUENTO","","","","-${montoDescuento}","","","",""\n`;
        csv += `"IVA (13%)","","","","${montoIVA}","","","",""\n`;
        csv += `"TOTAL FINAL","","","","${totalFinal}","","${usuarioActual}","",""\n`;
        
        // Descargar archivo
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${nombreProyecto}_${fechaCR.fecha}_${usuarioActual}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        
        mostrarAlerta(`📥 Datos exportados por ${usuarioActual}`, 'success');
    } catch (error) {
        console.error('❌ Error exportando datos:', error);
        mostrarAlerta('❌ Error al exportar datos', 'danger');
    }
}

// Función para mostrar alertas (optimizada)
function mostrarAlerta(mensaje, tipo = 'success') {
    try {
        const alertContainer = document.getElementById('alertContainer');
        if (!alertContainer) return;
        
        const alert = document.createElement('div');
        alert.className = `alert alert-${tipo} alert-dismissible fade show`;
        alert.innerHTML = `
            ${mensaje}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        alertContainer.appendChild(alert);
        
        // Auto-remover después de 5 segundos
        setTimeout(() => {
            if (alert.parentNode) {
                alert.remove();
            }
        }, 5000);
    } catch (error) {
        console.error('❌ Error mostrando alerta:', error);
    }
}

// Función de debug (temporal)
function debugProductos() {
    console.log('🔍 DEBUG - Estado actual de productos:');
    console.log('📊 Total productos:', productos.length);
    console.log('📋 Lista de productos:', productos);
    
    productos.forEach((producto, index) => {
        console.log(`📦 Producto ${index}:`, {
            id: producto.ID_Producto || producto.id,
            nombre: producto.Nombre,
            descripcion: producto.Descripción || producto.Descripcion,
            precio: producto.Precio_Unitario,
            categoria: producto.Categoria,
            estado: producto.Estado
        });
    });
    
    return productos;
}

// Llamar debug automáticamente si hay errores
window.debugProductos = debugProductos;

console.log('✅ Script cargado correctamente - Sistema de Cotizaciones v5.1 (Búsqueda Corregida)');