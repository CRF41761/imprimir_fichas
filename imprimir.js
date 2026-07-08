// ✅ URL de tu Google Sheets (Web App de Apps Script)
const SPREADSHEET_URL = "https://script.google.com/macros/s/AKfycbwcxjqSPkimHBsS9WY6Deq-7Y-vF9vPD2INgjMA2zhdB670_2SRnih-WqgtYAq4gMZv1A/exec";

/* -------------------------
   Helper para normalizar texto (quitar acentos)
   ------------------------- */
function normalizarTexto(texto) {
    if (!texto) return '';
    return texto.toString()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}

/* -------------------------
   Helper JSONP (evita CORS)
   ------------------------- */
function loadJSONP(url) {
    return new Promise((resolve, reject) => {
        const callbackName = 'cb_' + Date.now() + '_' + Math.floor(Math.random() * 100000);
        window[callbackName] = function(data) {
            resolve(data);
            try { delete window[callbackName]; } catch (e) { window[callbackName] = undefined; }
            if (script && script.parentNode) script.parentNode.removeChild(script);
        };
        const script = document.createElement('script');
        script.src = url + (url.indexOf('?') === -1 ? '?' : '&') + 'callback=' + callbackName;
        script.async = true;
        script.onerror = function(err) {
            try { delete window[callbackName]; } catch (e) { window[callbackName] = undefined; }
            if (script && script.parentNode) script.parentNode.removeChild(script);
            reject(new Error('JSONP load error'));
        };
        document.body.appendChild(script);
    });
}

/* -------------------------
   Función principal: cargar últimas 50 entradas
   ------------------------- */
async function cargarUltimas() {
    const resultadosDiv = document.getElementById('resultados');
    resultadosDiv.innerHTML = '<p style="text-align:center;">⏳ Cargando últimas 50 fichas...</p>';
    
    try {
        const data = await loadJSONP(`${SPREADSHEET_URL}?getAllData=true&limit=50`);
        if (!Array.isArray(data)) {
            throw new Error('Respuesta inesperada del servidor');
        }
        
        // ✅ Ordenar siempre por número de entrada descendente (más reciente primero)
        const datosOrdenados = [...data].sort((a, b) => {
            const numA = parseInt(a.numero_entrada) || 0;
            const numB = parseInt(b.numero_entrada) || 0;
            return numB - numA; // descendente
        });
        
        mostrarResultados(datosOrdenados);
    } catch (error) {
        console.error('Error:', error);
        resultadosDiv.innerHTML = `
            <div class="error-box">
                <p>❌ Error al cargar los datos</p>
                <p style="font-size:0.9em; color:#999;">Asegúrate de que el Web App de Google Apps Script esté desplegado y accesible</p>
            </div>
        `;
    }
}

/* -------------------------
   Función de búsqueda con filtros específicos
   ------------------------- */
async function buscarFichas() {
    const resultadosDiv = document.getElementById('resultados');
    resultadosDiv.innerHTML = '<p style="text-align:center;">⏳ Buscando fichas...</p>';
    
    try {
        const params = new URLSearchParams();
        params.append('getAllData', 'true');
        
        // Obtener valores de los filtros
        const numero = document.getElementById('filtroNumero').value;
        const especie = document.getElementById('filtroEspecie').value;
        const municipio = document.getElementById('filtroMunicipio').value;
        const fecha = document.getElementById('filtroFecha').value;
        const cumplimentado = document.getElementById('filtroCumplimentado').value;
        
        // Añadir parámetros solo si tienen valor
        if (numero) params.append('numero', numero);
        if (especie) params.append('especie', especie);
        if (municipio) params.append('municipio', municipio);
        if (fecha) params.append('fecha', fecha);
        if (cumplimentado) params.append('cumplimentado', cumplimentado);
        
        // Si no hay filtros, cargar últimas 50
if (!numero && !especie && !municipio && !fecha && !cumplimentado) {
    params.append('limit', '50');
}
        
        const data = await loadJSONP(`${SPREADSHEET_URL}?${params.toString()}`);
        if (!Array.isArray(data)) {
            throw new Error('Respuesta inesperada del servidor');
        }
        
        // ✅ Ordenar siempre por número de entrada descendente (más reciente primero)
        const datosOrdenados = [...data].sort((a, b) => {
            const numA = parseInt(a.numero_entrada) || 0;
            const numB = parseInt(b.numero_entrada) || 0;
            return numB - numA; // descendente = más reciente primero
        });
        mostrarResultados(datosOrdenados);
        
    } catch (error) {
        console.error('Error:', error);
        resultadosDiv.innerHTML = `
            <div class="error-box">
                <p>❌ Error al buscar fichas</p>
                <p style="font-size:0.9em; color:#999;">Verifica los parámetros e inténtalo de nuevo</p>
            </div>
        `;
    }
}

/* -------------------------
   Cargar todas las entradas (con advertencia)
   ------------------------- */
async function cargarTodas() {
    if (!confirm("⚠️ Esto puede tardar 10-20 segundos y consumir mucha memoria. ¿Continuar?")) {
        return;
    }
    
    const resultadosDiv = document.getElementById('resultados');
    resultadosDiv.innerHTML = '<p style="text-align:center;">⏳ Cargando TODAS las fichas... (puede tardar varios segundos)</p>';
    
    try {
        const data = await loadJSONP(`${SPREADSHEET_URL}?getAllData=true&todas=true`);
        if (!Array.isArray(data)) {
            throw new Error('Respuesta inesperada del servidor');
        }
        mostrarResultados(data);
    } catch (error) {
        console.error('Error:', error);
        resultadosDiv.innerHTML = `
            <div class="error-box">
                <p>❌ Error al cargar todas las fichas</p>
                <p style="font-size:0.9em; color:#999;">El proceso puede haber sido interrumpido por el navegador</p>
            </div>
        `;
    }
}

/* -------------------------
   Mostrar resultados en tabla con cabecera clicable
   ------------------------- */
function mostrarResultados(registros) {
    const resultadosDiv = document.getElementById('resultados');
    
    if (!Array.isArray(registros) || registros.length === 0) {
        resultadosDiv.innerHTML = '<p style="text-align:center; color:#666;">No se encontraron registros</p>';
        return;
    }

    // Guardar datos en localStorage para ordenación
    localStorage.setItem('datosFichas', JSON.stringify(registros));
    
    const html = `
        <div class="results-header">
            <h2>📄 Registros encontrados: ${registros.length}</h2>
            <button id="btnImprimirTodo" class="btn-print-all">🖨️ Imprimir Seleccionados</button>
        </div>
        
        <table class="tabla-fichas">
            <thead>
                <tr>
                    <th><input type="checkbox" id="selTodos"></th>
                    <th onclick="toggleSort('numero')" style="cursor:pointer; position:relative;">
    Nº Entrada <span id="iconoNumero" style="font-size:1.2em; margin-left:6px; color:#FFD700; text-shadow: 1px 1px 2px rgba(0,0,0,0.3); transition: transform 0.2s;">▼</span>
</th>
                    <th>Fecha</th>
                    <th>Especie</th>
                    <th>Municipio</th>
                    <th>Cumplimentado</th>
                    <th>Coordenadas</th>
                    <th>Acción</th>
                </tr>
            </thead>
            <tbody>
                ${registros.map(reg => {
                    const estado = reg.estado_animal || 'No especificado';
                    const esVivo = (estado.toString().toLowerCase()).includes('vivo') || estado.includes('animal vivo');

                    return `
                    <tr class="${esVivo ? 'fila-vivo' : 'fila-cadaver'}">
                        <td><input type="checkbox" class="selFicha" value="${reg.numero_entrada || ''}"></td>
                        <td><strong>${reg.numero_entrada || 'N/A'}</strong></td>
                        <td>${reg.fecha || '-'}</td>
                        <td>${reg.especie_comun || '-'}</td>
                        <td>${reg.municipio || '-'}</td>
                        <td>${reg.cumplimentado || '-'}</td>
                        <td>${reg.coordenadas_mapa || '-'}</td>
                        <td>
                            <div class="botones-impresion">
                                ${reg.especie_cientifico && reg.especie_cientifico.toString().toLowerCase().includes('testudo hermanni hermanni') ? `
                                    <button 
                                        onclick="imprimirFichaTestudo('${reg.numero_entrada}')" 
                                        class="btn-print btn-destacado"
                                        style="background-color: #4CAF50; color: white; border: 2px solid #2E7D32; font-weight: bold;"
                                        title="Imprimir ficha Testudo hermanni">
                                        🐢 Imprimir ficha Testudo
                                    </button>
                                ` : reg.posible_causa && reg.posible_causa.toString().toLowerCase().includes('nacido en el centro') ? `
                                    <button 
                                        onclick="imprimirFichaEspecifica('${reg.numero_entrada}', 'cria_cautividad')" 
                                        class="btn-print btn-destacado"
                                        style="background-color: #4CAF50; color: white; border: 2px solid #333; font-weight: bold;"
                                        title="Imprimir ficha Cría en Cautividad">
                                        🐣 Imprimir ficha Cría
                                    </button>
                                ` : `
                                    <button 
                                        onclick="imprimirFichaEspecifica('${reg.numero_entrada}', 'clinica')" 
                                        class="btn-print ${esVivo ? 'btn-destacado' : ''}"
                                        style="border: 2px solid #333;"
                                        title="Imprimir ficha clínica">
                                        Imprimir ficha clínica
                                    </button>
                                    <button 
                                        onclick="imprimirFichaEspecifica('${reg.numero_entrada}', 'postmortem')" 
                                        class="btn-print ${!esVivo ? 'btn-destacado' : ''}"
                                        style="border: 2px solid #333;"
                                        title="Imprimir ficha Post mortem">
                                        Imprimir ficha Post mortem
                                    </button>
                                `}
                            </div>
                        </td>
                    </tr>
                `}).join('')}
            </tbody>
        </table>
    `;
    
    resultadosDiv.innerHTML = html;
    
    // Evento para seleccionar todos
    const selTodos = document.getElementById('selTodos');
    if (selTodos) {
        selTodos.addEventListener('change', function() {
            const checkboxes = document.querySelectorAll('.selFicha');
            checkboxes.forEach(cb => cb.checked = this.checked);
        });
    }
    
    // Evento para imprimir seleccionados
    const btnImprimirTodo = document.getElementById('btnImprimirTodo');
    if (btnImprimirTodo) {
        btnImprimirTodo.addEventListener('click', () => {
            const seleccionados = Array.from(document.querySelectorAll('.selFicha:checked')).map(cb => cb.value);
            if (seleccionados.length === 0) {
                alert('Selecciona al menos una ficha');
                return;
            }
            imprimirLote(seleccionados);
        });
    }
    
    // Sincronizar dropdown de ordenación
    const ordenSelect = document.getElementById('ordenSelector');
    if (ordenSelect) {
        ordenSelect.addEventListener('change', function() {
            aplicarOrdenacion();
        });
    }
}

// ========== ORDENACIÓN POR CABECERA CLICABLE ==========
let estadoOrdenacion = {
    columna: 'numero',
    direccion: 'desc'
};

function toggleSort(columna) {
    if (columna === 'numero') {
        estadoOrdenacion.direccion = 
            estadoOrdenacion.direccion === 'desc' ? 'asc' : 'desc';
        
        // Actualizar icono
        document.getElementById('iconoNumero').textContent = 
            estadoOrdenacion.direccion === 'desc' ? '▼' : '▲';
        
        // Sincronizar con dropdown
        document.getElementById('ordenSelector').value = 
            estadoOrdenacion.direccion === 'desc' ? 'entrada-desc' : 'entrada-asc';
        
        aplicarOrdenacion();
    }
}

function aplicarOrdenacion() {
    const datos = JSON.parse(localStorage.getItem('datosFichas')) || [];
    const orden = document.getElementById('ordenSelector').value;
    
    const datosOrdenados = [...datos].sort((a, b) => {
        if (orden === 'entrada-desc') {
            return b.numero_entrada - a.numero_entrada;
        } else {
            return a.numero_entrada - b.numero_entrada;
        }
    });
    
    mostrarResultados(datosOrdenados);
}

/* -------------------------
   Funciones de impresión (mantenidas igual)
   ------------------------- */
async function imprimirFichaEspecifica(numeroEntrada, tipo) {
    if (!numeroEntrada || !tipo) return alert('Datos inválidos');
    
    try {
        const urlParams = new URLSearchParams({
            getFichaManual: numeroEntrada,
            tipo: tipo
        });
        
        const data = await loadJSONP(`${SPREADSHEET_URL}?${urlParams.toString()}`);
        
        if (!data || !data.url) {
            alert('❌ No se pudo generar la ficha.\nVerifica que el número de entrada exista.');
            return;
        }

        const ventana = window.open(data.url, '_blank');
        if (!ventana) {
            alert('⚠️ El navegador bloqueó la ventana emergente.\nPermite pop-ups e inténtalo de nuevo.');
        }
        
    } catch (error) {
        console.error('Error al imprimir ficha específica:', error);
        alert('⚠️ Error de conexión con el servidor.');
    }
}

async function imprimirFichaTestudo(numeroEntrada) {
    if (!numeroEntrada) return alert('Número de entrada inválido');
    
    try {
        const urlParams = new URLSearchParams({
            getFichaTestudo: numeroEntrada
        });
        
        const data = await loadJSONP(`${SPREADSHEET_URL}?${urlParams.toString()}`);
        
        if (!data || !data.url) {
            alert('❌ No se pudo generar la ficha Testudo.\nVerifica que el número de entrada exista.');
            return;
        }

        const ventana = window.open(data.url, '_blank');
        if (!ventana) {
            alert('⚠️ El navegador bloqueó la ventana emergente.\nPermite pop-ups e inténtalo de nuevo.');
        }
        
    } catch (error) {
        console.error('Error al imprimir ficha Testudo:', error);
        alert('⚠️ Error de conexión con el servidor.');
    }
}

async function imprimirLote(numeros) {
    if (!Array.isArray(numeros) || numeros.length === 0) return;
    
    if (!confirm(`¿Imprimir ${numeros.length} fichas seleccionadas?\n\nSe abrirá cada ficha COMPLETA en una pestaña nueva.`)) return;
    
    let ventanasAbiertas = 0;
    
    try {
        const todosLosDatos = await loadJSONP(`${SPREADSHEET_URL}?getAllData=true&todas=true`);
        
        for (let [index, num] of numeros.entries()) {
            setTimeout(async () => {
                const registro = todosLosDatos.find(r => r.numero_entrada == num);
                let url = '';
                
                if (registro) {
                    const especie = (registro.especie_cientifico || '').toString().toLowerCase();
                    const causa = (registro.posible_causa || '').toString().toLowerCase();
                    
                    if (especie.includes('testudo hermanni hermanni')) {
                        url = `${SPREADSHEET_URL}?getFichaTestudo=${num}`;
                    } else if (causa.includes('nacido en el centro') || causa.includes('cría en cautividad')) {
                        url = `${SPREADSHEET_URL}?getFichaManual=${num}&tipo=cria_cautividad`;
                    } else {
                        const estado = (registro.estado_animal || '').toString().toLowerCase();
                        const esVivo = estado.includes('vivo') || estado.includes('animal vivo');
                        const tipo = esVivo ? 'clinica' : 'postmortem';
                        url = `${SPREADSHEET_URL}?getFichaManual=${num}&tipo=${tipo}`;
                    }
                } else {
                    url = `${SPREADSHEET_URL}?getFichaManual=${num}&tipo=clinica`;
                }
                
                const ventana = window.open(url, '_blank');
                if (ventana) {
                    ventanasAbiertas++;
                    ventana.onload = function() {
                        setTimeout(() => {
                            ventana.print();
                        }, 1500);
                    };
                }
            }, index * 1000);
        }
        
        setTimeout(() => {
            if (ventanasAbiertas > 0) {
                alert(`✅ Se abrieron ${ventanasAbiertas} fichas.\n\nCada ficha se imprimirá automáticamente.`);
            } else {
                alert('⚠️ El navegador bloqueó las ventanas emergentes.\n\nPermite pop-ups para este sitio e inténtalo de nuevo.');
            }
        }, 2000);
        
    } catch (error) {
        console.error('Error en imprimirLote:', error);
        alert('⚠️ Error al cargar datos para impresión por lotes.');
    }
}

// ========== NAVEGACIÓN RÁPIDA ==========
document.getElementById('btnIrArriba')?.addEventListener('click', () => {
    const primeraFila = document.querySelector('.tabla-fichas tbody tr');
    if (primeraFila) {
        primeraFila.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
});

document.getElementById('btnIrAbajo')?.addEventListener('click', () => {
    const ultimaFila = document.querySelector('.tabla-fichas tbody tr:last-child');
    if (ultimaFila) {
        ultimaFila.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
});

// ========== INICIALIZACIÓN AL CARGAR LA PÁGINA ==========
document.addEventListener('DOMContentLoaded', () => {
    // Cargar últimas 50 entradas al iniciar
    cargarUltimas();
});
