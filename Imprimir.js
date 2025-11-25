// ✅ URL de tu Google Sheets (actualizada con CORS)
const SPREADSHEET_URL = "https://script.google.com/macros/s/AKfycbzj_xLahSq8ui0iBp2pjxFjeZuurT82xKgNy_51yklPdGybtZZKbgA-5cntdNvF2an6/exec";

// Función principal de búsqueda
async function buscarFichas(termino = '') {
    const resultadosDiv = document.getElementById('resultados');
    resultadosDiv.innerHTML = '<p style="text-align:center;">⏳ Cargando todas las fichas...</p>';
    
    try {
        const response = await fetch(`${SPREADSHEET_URL}?getAllData=true`);
        const data = await response.json();
        
        // Filtrar por término de búsqueda (si hay algo escrito)
        let registrosFiltrados = data;
        if (termino.trim() !== '') {
            const terminoLower = termino.toLowerCase();
            registrosFiltrados = data.filter(reg => 
                (reg.numero_entrada && reg.numero_entrada.toString().includes(termino)) ||
                (reg.especie_comun && reg.especie_comun.toLowerCase().includes(terminoLower)) ||
                (reg.especie_cientifico && reg.especie_cientifico.toLowerCase().includes(terminoLower)) ||
                (reg.fecha && reg.fecha.includes(termino)) ||
                (reg.municipio && reg.municipio.toLowerCase().includes(terminoLower)) ||
                (reg.estado_animal && reg.estado_animal.toString().toLowerCase().includes(terminoLower))
            );
        }
        
        mostrarResultados(registrosFiltrados);
        
    } catch (error) {
        console.error('Error:', error);
        resultadosDiv.innerHTML = `
            <div class="error-box">
                <p>❌ Error al cargar los datos</p>
                <p style="font-size:0.9em; color:#999;">Asegúrate de que el Google Sheets esté compartido</p>
            </div>
        `;
    }
}

// Mostrar resultados en tabla con colores
function mostrarResultados(registros) {
    const resultadosDiv = document.getElementById('resultados');
    
    if (registros.length === 0) {
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
                    const esVivo = (reg.estado_animal || '').includes('Animal Vivo');
                    const tipoClase = esVivo ? 'fila-vivo' : 'fila-cadaver';
                    const tipoTexto = esVivo ? '🐦 VIVO' : '💀 CADÁVER';
                    
                    return `
                    <tr class="${tipoClase}">
                        <td><input type="checkbox" class="selFicha" value="${reg.numero_entrada}"></td>
                        <td><strong>${reg.numero_entrada || 'N/A'}</strong></td>
                        <td>${reg.fecha || '-'}</td>
                        <td>${reg.especie_comun || '-'}</td>
                        <td>${reg.municipio || '-'}</td>
                        <td><span class="tag-${esVivo ? 'vivo' : 'cadaver'}">${tipoTexto}</span></td>
                        <td>
                            <button onclick="imprimirFicha('${reg.numero_entrada}')" class="btn-print">
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
    document.getElementById('selTodos')?.addEventListener('change', function() {
        const checkboxes = document.querySelectorAll('.selFicha');
        checkboxes.forEach(cb => cb.checked = this.checked);
    });
    
    // Evento para imprimir seleccionados
    document.getElementById('btnImprimirTodo')?.addEventListener('click', () => {
        const seleccionados = Array.from(document.querySelectorAll('.selFicha:checked')).map(cb => cb.value);
        if (seleccionados.length === 0) {
            alert('Selecciona al menos una ficha');
            return;
        }
        imprimirLote(seleccionados);
    });
}

// Imprimir ficha individual (detecta automáticamente el tipo)
function imprimirFicha(numeroEntrada) {
    const urlFicha = `${SPREADSHEET_URL}?getFicha=${numeroEntrada}`;
    const ventana = window.open(urlFicha, '_blank', 'width=800,height=600');
    
    ventana.onload = () => {
        setTimeout(() => ventana.print(), 500);
    };
}

// Imprimir lote de fichas seleccionadas
function imprimirLote(numeros) {
    if (!confirm(`¿Imprimir ${numeros.length} fichas seleccionadas? Se abrirán ${Math.ceil(numeros.length / 10)} ventanas.`)) return;
    
    // Imprimir en lotes de 10
    for (let i = 0; i < numeros.length; i += 10) {
        setTimeout(() => {
            const lote = numeros.slice(i, i + 10);
            const numerosStr = lote.join(',');
            const ventana = window.open(`${SPREADSHEET_URL}?getFichaBatch=${numerosStr}`, '_blank');
            ventana.onload = () => setTimeout(() => ventana.print(), 1000);
        }, i * 2000);
    }
}

// Event listeners
document.getElementById('btnBuscar').addEventListener('click', () => {
    buscarFichas(document.getElementById('buscador').value);
});

document.getElementById('buscador').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') buscarFichas(e.target.value);
});

