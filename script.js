document.addEventListener('DOMContentLoaded', async () => {
    const itemSelect = document.getElementById('item-select');
    const citySelect = document.getElementById('city-select');
    const fetchDataButton = document.getElementById('fetch-data-button');
    const dataContainer = document.getElementById('data-container');

    let allItems = {}; // Para almacenar los items del JSON
    let allLocations = {}; // Para almacenar las ubicaciones del JSON

    const API_BASE_URL = "https://west.albion-online-data.com/api/v2/stats/prices/";

    // --- Función para cargar JSON local ---
    async function loadJson(filename) {
        try {
            const response = await fetch(filename);
            if (!response.ok) {
                throw new Error(`Error al cargar ${filename}: ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`No se pudo cargar el archivo ${filename}:`, error);
            dataContainer.innerHTML = `<p style="color: red;">Error: No se pudo cargar la lista de ${filename.includes('items') ? 'ítems' : 'ciudades'}. Asegúrate de que los archivos estén en la misma carpeta.</p>`;
            return null;
        }
    }

    // --- Función para poblar los selectores ---
    function populateSelect(selectElement, data) {
        selectElement.innerHTML = ''; // Limpiar opciones existentes
        
        // Ordenar los datos alfabéticamente por el texto a mostrar
        const sortedData = Object.entries(data).sort(([, a], [, b]) => a.localeCompare(b));

        for (const [id, name] of sortedData) {
            const option = document.createElement('option');
            option.value = id;
            option.textContent = name;
            selectElement.appendChild(option);
        }
    }

    // --- Cargar y poblar selectores al inicio ---
    async function initializeSelectors() {
        dataContainer.innerHTML = '<p>Cargando listas de ítems y ciudades...</p>';
        
        // Cargar items.json
        const itemData = await loadJson('items.json'); // Changed filename
        // Cargar world.json
        const locationData = await loadJson('world.json'); // Changed filename

        if (itemData) {
            // Asumiendo que items.json es un objeto { "ITEM_ID": "Item Name", ... }
            allItems = itemData;
            populateSelect(itemSelect, allItems);
        } else {
            console.error("No se pudieron cargar los datos de ítems.");
        }

        if (locationData) {
            // Asumiendo que world.json es un array de objetos como:
            // [{ "UniqueName": "ForestCross", "LocalizedName": "Forest Cross" }, ...]
            allLocations = locationData.reduce((acc, loc) => {
                acc[loc.UniqueName] = loc.LocalizedName;
                return acc;
            }, {});
            populateSelect(citySelect, allLocations);
        } else {
            console.error("No se pudieron cargar los datos de ubicaciones.");
        }
        
        dataContainer.innerHTML = '<p>Selecciona tus opciones y haz clic en "Obtener Datos del Mercado".</p>';
    }

    // --- Función para obtener los valores seleccionados de un selector múltiple ---
    function getSelectedOptions(selectElement) {
        return Array.from(selectElement.selectedOptions).map(option => option.value);
    }

    // --- Función para obtener datos del API de Albion Online ---
    async function getAlbionMarketData() {
        const selectedItems = getSelectedOptions(itemSelect);
        const selectedCities = getSelectedOptions(citySelect);
        const qualities = [1, 2, 3, 4, 5]; // Puedes hacer esto seleccionable también si quieres

        if (selectedItems.length === 0 || selectedCities.length === 0) {
            dataContainer.innerHTML = '<p style="color: orange;">Por favor, selecciona al menos un ítem y una ciudad.</p>';
            return;
        }

        dataContainer.innerHTML = '<p>Obteniendo datos... Esto puede tomar un momento.</p>';

        const itemIdsStr = selectedItems.join(',');
        const locationsStr = selectedCities.join(',');
        const qualitiesStr = qualities.join(',');

        const url = `${API_BASE_URL}${itemIdsStr}.json?locations=${locationsStr}&qualities=${qualitiesStr}`;

        console.log(`Haciendo petición a: ${url}`);

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status} - ${response.statusText}`);
            }
            const data = await response.json();

            if (data && data.length > 0) {
                renderTable(data);
            } else {
                dataContainer.innerHTML = '<p>No se encontraron datos para la combinación de ítems/ubicaciones/calidades seleccionada.</p>';
            }
        } catch (error) {
            console.error('Hubo un problema al obtener los datos:', error);
            dataContainer.innerHTML = `<p style="color: red;">Error al cargar los datos: ${error.message}. Por favor, inténtalo de nuevo.</p>`;
        }
    }

    // --- Función para renderizar la tabla de datos ---
    function renderTable(data) {
        let tableHTML = '<table><thead><tr>';

        // Determinar todas las posibles columnas dinámicamente
        const allKeys = new Set();
        data.forEach(item => {
            Object.keys(item).forEach(key => allKeys.add(key));
        });
        // Definir un orden preferido de columnas si existe, de lo contrario, alfabético
        const preferredOrder = ['item_id', 'city', 'quality', 'sell_price_min', 'sell_price_min_date', 'buy_price_max', 'buy_price_max_date', 'sell_price_max', 'buy_price_min', 'timestamp'];
        const columns = preferredOrder.filter(key => allKeys.has(key)).concat(Array.from(allKeys).filter(key => !preferredOrder.includes(key)).sort());


        columns.forEach(key => {
            // Un poco de formato para las cabeceras (opcional)
            let headerText = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()); // Convertir snake_case a Title Case
            if (key === 'item_id') headerText = 'Item';
            if (key === 'sell_price_min') headerText = 'Venta Mín.';
            if (key === 'buy_price_max') headerText = 'Compra Máx.';
            if (key === 'sell_price_min_date') headerText = 'Fecha Venta Mín.';
            if (key === 'buy_price_max_date') headerText = 'Fecha Compra Máx.';
            
            tableHTML += `<th>${headerText}</th>`;
        });
        tableHTML += '</tr></thead><tbody>';

        data.forEach(item => {
            tableHTML += '<tr>';
            columns.forEach(key => {
                let value = item[key];
                
                // Formateo especial para valores
                if (key === 'item_id' && allItems[value]) {
                    value = allItems[value]; // Mostrar el nombre legible del ítem
                } else if (key === 'city' && allLocations[value]) {
                    value = allLocations[value]; // Mostrar el nombre legible de la ciudad
                } else if (typeof value === 'number' && (key.includes('price') || key.includes('amount'))) {
                    value = value.toLocaleString(); // Formato de número con separador de miles
                } else if ((key.includes('date') || key.includes('timestamp')) && value) {
                    try {
                        const date = new Date(value);
                        if (!isNaN(date.getTime())) {
                            value = date.toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' }); // Formato local de fecha y hora
                        }
                    } catch (e) {
                        // Si no es una fecha válida, se usa el valor original
                    }
                } else if (key === 'quality') {
                    const qualityNames = { 1: 'Normal', 2: 'Bueno', 3: 'Excepcional', 4: 'Excelente', 5: 'Sobresaliente' };
                    value = qualityNames[value] || value;
                }

                tableHTML += `<td>${value !== undefined && value !== null ? value : ''}</td>`;
            });
            tableHTML += '</tr>';
        });

        tableHTML += '</tbody></table>';
        dataContainer.innerHTML = tableHTML;
    }

    // --- Event Listeners ---
    fetchDataButton.addEventListener('click', getAlbionMarketData);

    // --- Iniciar la carga de selectores al cargar la página ---
    initializeSelectors();
});
