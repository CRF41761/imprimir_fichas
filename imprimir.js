// ✅ URL de tu Google Sheets (Web App de Apps Script)
const SPREADSHEET_URL = "https://script.google.com/macros/s/AKfycbx_bvTlonuLOn8EGrpgijKWWHypBpwE2NzbEZ33cFolGYj_941iJUqsjWqGKExMG800/exec"; // <-- Asegúrate de que esta URL sea la NUEVA que publicaste

/* -------------------------
   Helper JSONP (evita CORS)
   ------------------------- */
function loadJSONP(url) {
    return new Promise((resolve, reject) => {
        const callbackName = 'cb_' + Date.now() + '_' + Math.floor(Math.random() * 100000);
        // Definir la función global que recibirá los datos
        window[callbackName] = function(data) {
            resolve(data);
            // cleanup
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
   Función principal de búsqueda (usa JSONP)
   ------------------------- */
async function buscarFichas(termino = '') {
    const resultadosDiv = document.getElementById('resultados');
    resultadosDiv.innerHTML = '<p style="text-align:center;">⏳ Cargando todas las fichas...</p>';
    
    try {
        const data = await loadJSONP(`${SPREADSHEET_URL}?getAllData=true`);
        if (!Array.isArray(data)) {
            throw new Error('Respuesta inesperada del servidor');
        }

        // Filtrar por término de búsqueda (si hay algo escrito)
        let registrosFiltrados = data;
        if (termino.trim() !== '') {
            const terminoLower = termino.toLowerCase();
            registrosFiltrados = data.filter(reg => {
                const numStr = reg.numero_entrada ? reg.numero_entrada.toString() : '';
                return (
                    (numStr && numStr.includes(termino)) ||
                    (reg.especie_comun && reg.especie_comun.toLowerCase().includes(terminoLower)) ||
                    (reg.especie_cientifico && reg.especie_cientifico.toLowerCase().includes(terminoLower)) ||
                    (reg.fecha && reg.fecha.toString().includes(termino)) ||
                    (reg.municipio && reg.municipio.toLowerCase().includes(terminoLower)) ||
                    (reg.estado_animal && reg.estado_animal.toString().toLowerCase().includes(terminoLower))
                );
            });
        }
        
        mostrarResultados(registrosFiltrados);
        
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
   Mostrar resultados en tabla con colores
   ------------------------- */
function mostrarResultados(registros) {
    const resultadosDiv = document.getElementById('resultados');
    
    if (!Array.isArray(registros) || registros.length === 0) {
        resultadosDiv.innerHTML = '<p style="text-align:center; color:#666;">No se encontraron registros</p>';
        return;
    }

    const html = `
        <div class="results-header">
            <h2>📄 Registros encontrados: ${registros.length}</h2>
            <button id="btnImprimirTodo" class="btn-print-all">🖨️ Imprimir Seleccionados</button>
        </div>
        
        <table class="tabla-fichas">
            <thead>
                <tr>
                    <th><input type="checkbox" id="selTodos"></th>
                    <th>Nº Entrada</th>
                    <th>Fecha</th>
                    <th>Especie</th>
                    <th>Municipio</th>
                    <th>Tipo</th>
                    <th>Acción</th>
                </tr>
            </thead>
            <tbody>
                ${registros.map(reg => {
                    const estado = reg.estado_animal || '';
                    const esVivo = estado.toString().toLowerCase().includes('vivo') || estado.toString().toLowerCase().includes('animal vivo');
                    const tipoClase = esVivo ? 'fila-vivo' : 'fila-cadaver';
                    const tipoTexto = esVivo ? '🐦 VIVO' : '💀 CADÁVER';
                    const num = reg.numero_entrada || '';
                    
                    return `
                    <tr class="${tipoClase}">
                        <td><input type="checkbox" class="selFicha" value="${num}"></td>
                        <td><strong>${num || 'N/A'}</strong></td>
                        <td>${reg.fecha || '-'}</td>
                        <td>${reg.especie_comun || '-'}</td>
                        <td>${reg.municipio || '-'}</td>
                        <td><span class="tag-${esVivo ? 'vivo' : 'cadaver'}">${tipoTexto}</span></td>
                        <td>
                            <button onclick="imprimirFicha('${num}')" class="btn-print">
                                🖨️ Imprimir
                            </button>
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
}

/* -------------------------
   Imprimir ficha individual
   - Obtiene la URL de la ficha imprimible (columna R o S) y la abre directamente
   ------------------------- */
async function imprimirFicha(numeroEntrada) {
    if (!numeroEntrada) return alert('Número de ficha inválido');
    
    try {
        // Pedimos la URL específica de impresión desde el servidor (columnas R/S)
        const data = await loadJSONP(`${SPREADSHEET_URL}?getPrintUrl=${encodeURIComponent(numeroEntrada)}`);
        
        if (!data || !data.url) {
            alert('❌ No se encontró la ficha imprimible para este número de entrada.\nVerifica que las columnas "FICHA IMPRIMIBLE HISTORIA CLINICA" o "POST MORTEM" estén correctamente configuradas en la hoja "Datos".');
            return;
        }

        // Abrimos directamente la ficha en GitHub con los datos pre-cargados
        const ventana = window.open(data.url, '_blank');
        if (!ventana) {
            alert('⚠️ El navegador bloqueó la ventana emergente.\nPor favor, permite pop-ups para este sitio e inténtalo de nuevo.');
        }
        // ✅ NO llamamos a .print(): la ficha ya está lista para imprimir desde GitHub
        
    } catch (error) {
        console.error('Error al obtener URL de impresión:', error);
        alert('⚠️ Error de conexión. ¿Está activa la Web App de Google Apps Script?');
    }
}

/* -------------------------
   Imprimir lote de fichas
   - Abre la URL getFichaBatch que devuelve HTML con varias fichas
   ------------------------- */
function imprimirLote(numeros) {
    if (!Array.isArray(numeros) || numeros.length === 0) return;
    if (!confirm(`¿Imprimir ${numeros.length} fichas seleccionadas? Se abrirán ${Math.ceil(numeros.length / 10)} ventanas.`)) return;
    
    // Imprimir en lotes de 10
    for (let i = 0; i < numeros.length; i += 10) {
        setTimeout(() => {
            const lote = numeros.slice(i, i + 10);
            const numerosStr = lote.map(n => encodeURIComponent(n)).join(',');
            const ventana = window.open(`${SPREADSHEET_URL}?getFichaBatch=${numerosStr}`, '_blank');
            if (!ventana) {
                alert('El navegador bloqueó la apertura de ventanas emergentes. Permite popups y vuelve a intentarlo.');
                return;
            }
            ventana.onload = () => setTimeout(() => ventana.print(), 1000);
        }, i * 2000);
    }
}

/* -------------------------
   Event listeners (UI)
   ------------------------- */
document.getElementById('btnBuscar')?.addEventListener('click', () => {
    buscarFichas(document.getElementById('buscador').value);
});

document.getElementById('buscador')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') buscarFichas(e.target.value);
});






























































