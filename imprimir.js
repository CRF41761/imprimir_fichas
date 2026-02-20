// ✅ URL de tu Google Sheets (Web App de Apps Script)
const SPREADSHEET_URL = "https://script.google.com/macros/s/AKfycbwQlefSwjHouN-y1f0WJOKkscun2UEftQW7OWyza7ww7JHNpJFe5_LwlT-AKpJWXZs4NQ/exec";
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

        let registrosFiltrados = data;
        if (termino.trim() !== '') {
    const terminoNormalizado = normalizarTexto(termino);
    registrosFiltrados = data.filter(reg => {
        const numStr = reg.numero_entrada ? reg.numero_entrada.toString() : '';
        
        const coincideNumeroExacto = /^\d+$/.test(termino.trim()) && numStr === termino.trim();
        
        const coincideOtrosCampos = 
            (reg.especie_comun && normalizarTexto(reg.especie_comun).includes(terminoNormalizado)) ||
            (reg.especie_cientifico && normalizarTexto(reg.especie_cientifico).includes(terminoNormalizado)) ||
            (reg.fecha && normalizarTexto(reg.fecha).includes(terminoNormalizado)) ||
            (reg.municipio && normalizarTexto(reg.municipio).includes(terminoNormalizado)) ||
            (reg.estado_animal && normalizarTexto(reg.estado_animal).includes(terminoNormalizado)) ||
            (reg.cumplimentado && normalizarTexto(reg.cumplimentado).includes(terminoNormalizado));

        return coincideNumeroExacto || coincideOtrosCampos;
    });
}
       
        // ✅ Aplicar orden según selección
        const ordenSelect = document.getElementById('ordenSelector');
       const orden = ordenSelect ? ordenSelect.value : 'entrada-desc';

if (orden === 'entrada-desc') {
    // Más reciente primero (descendente)
    registrosFiltrados.sort((a, b) => {
        const numA = parseInt(a.numero_entrada) || 0;
        const numB = parseInt(b.numero_entrada) || 0;
        return numB - numA;
    });
} else if (orden === 'entrada-asc') {
    // Más antiguo primero (ascendente)
    registrosFiltrados.sort((a, b) => {
        const numA = parseInt(a.numero_entrada) || 0;
        const numB = parseInt(b.numero_entrada) || 0;
        return numA - numB;
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
   Mostrar resultados en tabla con DOS botones de impresión
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
                    <th>Cumplimentado</th>
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
                        <!-- ✅ Cumplimentado por (Columna O) -->
<td>${reg.cumplimentado || '-'}</td>
                        <td>
    <div class="botones-impresion">
        ${reg.posible_causa && reg.posible_causa.toString().toLowerCase().includes('nacido en el centro') ? `
            <!-- ✅ SOLO BOTÓN CRÍA EN CAUTIVIDAD -->
            <button 
                onclick="imprimirFichaEspecifica('${reg.numero_entrada}', 'cria_cautividad')" 
                class="btn-print btn-destacado"
                style="background-color: #4CAF50; color: white; border: 2px solid #333; font-weight: bold;"
                title="Imprimir ficha Cría en Cautividad">
                🐣 Imprimir ficha Cría
            </button>
        ` : `
            <!-- ✅ BOTONES NORMALES: Clínica / Post Mortem -->
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
}
/* -------------------------
   Imprimir ficha específica (clínica o post mortem)
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

/* -------------------------
   Imprimir lote de fichas
   - Abre la URL getFichaBatch que devuelve HTML con varias fichas
   ------------------------- */
function imprimirLote(numeros) {
    if (!Array.isArray(numeros) || numeros.length === 0) return;
    if (!confirm(`¿Imprimir ${numeros.length} fichas seleccionadas? Se abrirán ${Math.ceil(numeros.length / 10)} ventanas.`)) return;
    
    for (let i = 0; i < numeros.length; i += 10) {
        setTimeout(() => {
            const lote = numeros.slice(i, i + 10);
            const numerosStr = lote.map(n => encodeURIComponent(n)).join(',');
            const ventana = window.open(`${SPREADSHEET_URL}?getFichaBatch=${numerosStr}`, '_blank');
            if (!ventana) {
                alert('El navegador bloqueó la apertura de ventanas emergentes. Permite popups y vuelve a intentarlo.');
                return;
            }
            vista.onload = () => setTimeout(() => ventana.print(), 1000);
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

// ========== NAVEGACIÓN RÁPIDA: Ir arriba / Ir abajo ==========
document.getElementById('btnIrArriba')?.addEventListener('click', () => {
    // Ir a la primera fila de resultados (después del header)
    const primeraFila = document.querySelector('.tabla-fichas tbody tr');
    if (primeraFila) {
        primeraFila.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
});

document.getElementById('btnIrAbajo')?.addEventListener('click', () => {
    // Ir a la última fila de resultados
    const ultimaFila = document.querySelector('.tabla-fichas tbody tr:last-child');
    if (ultimaFila) {
        ultimaFila.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
});

// ========== INICIALIZACIÓN AL CARGAR LA PÁGINA ==========
document.addEventListener('DOMContentLoaded', () => {
    const ordenSelector = document.getElementById('ordenSelector');
    const buscador = document.getElementById('buscador');

    if (ordenSelector) {
        ordenSelector.addEventListener('change', () => {
            const termino = buscador ? buscador.value : '';
            buscarFichas(termino);
        });
    }

    // Cargar todos los registros al iniciar la página
    buscarFichas();
});



































