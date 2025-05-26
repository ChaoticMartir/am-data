document.addEventListener('DOMContentLoaded', async () => {
    const itemSearchInput = document.getElementById('item-search');
    const itemSelect = document.getElementById('item-select');
    const citySelect = document.getElementById('city-select');
    const fetchDataButton = document.getElementById('fetch-data-button');
    const dataContainer = document.getElementById('data-container');

    let allItems = {}; // For storing ID: Name mapping (filtered for dropdown)
    let rawAllItems = {}; // For storing ALL items from items.json (ID: Name mapping, unfiltered)
    let allLocations = {}; // For storing location data (ID: Name)

    const API_BASE_URL = "https://west.albion-online-data.com/api/v2/stats/prices/";
    const DEFAULT_LANGUAGE = 'ES-ES'; // Change this if you prefer another language (e.g., 'EN-US')

    // --- CITIES EXPLICITLY ALLOWED BY USER (CORRECTED UNIQUE NAMES) ---
    const ALLOWED_CITIES_FOR_DROPDOWN = [
        "BRECILIEN",
        "FORTSTERLING",
        "LYMHURST",
        "BRIDGEWATCH",
        "MARTLOCK",
        "THETFORD",
        "CAERLEON"
    ];
    const allowedCitiesSet = new Set(ALLOWED_CITIES_FOR_DROPDOWN);


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
        
        const sortedData = Object.entries(data).sort(([, a], [, b]) => a.localeCompare(b));

        for (const [id, name] of sortedData) {
            const option = document.createElement('option');
            option.value = id;
            option.textContent = name;
            selectElement.appendChild(option);
        }
    }

    // Function to filter and populate item dropdown
    function filterAndPopulateItems(searchTerm = '') {
        const lowerCaseSearchTerm = searchTerm.toLowerCase();
        const filteredItems = {};
        for (const id in rawAllItems) {
            // Ensure rawAllItems[id] is a string before calling toLowerCase
            if (typeof rawAllItems[id] === 'string' && rawAllItems[id].toLowerCase().includes(lowerCaseSearchTerm)) {
                filteredItems[id] = rawAllItems[id];
            }
        }
        populateSelect(itemSelect, filteredItems);
    }

    // --- Cargar y poblar selectores al inicio ---
    async function initializeSelectors() {
        dataContainer.innerHTML = '<p>Cargando listas de ítems y ciudades...</p>';
        
        const rawItemData = await loadJson('items.json');
        const rawLocationData = await loadJson('world.json');

        if (rawItemData) {
            rawAllItems = rawItemData.reduce((acc, item) => {
                let uniqueName = null;
                // Try to extract uniqueName from LocalizationNameVariable, handling potential errors
                if (typeof item.LocalizationNameVariable === 'string' && item.LocalizationNameVariable.startsWith('@ITEMS_')) {
                    uniqueName = item.LocalizationNameVariable.replace('@ITEMS_', '');
                } else if (typeof item.UniqueName === 'string') { // Fallback if some entries use UniqueName directly
                    uniqueName = item.UniqueName;
                }

                let localizedName = null;
                // Try to extract localizedName from LocalizedNames, handling potential errors
                if (item.LocalizedNames && typeof item.LocalizedNames === 'object') {
                    localizedName = item.LocalizedNames[DEFAULT_LANGUAGE] || item.LocalizedNames['EN-US'];
                }
                
                // Final fallback if localizedName is still not a valid string
                if (typeof localizedName !== 'string' || localizedName.trim() === '') {
                    localizedName = uniqueName || `Unknown Item (${item.LocalizationNameVariable || item.UniqueName || 'No ID'})`;
                    // If even uniqueName is bad, use a generic placeholder
                    if (typeof localizedName !== 'string' || localizedName.trim() === '') {
                        localizedName = 'Missing Name';
                    }
                }
                
                // Only add to accumulator if uniqueName is valid and not empty
                if (uniqueName && typeof uniqueName === 'string' && uniqueName.trim() !== '') {
                    acc[uniqueName] = localizedName;
                }
                return acc;
            }, {});
            
            filterAndPopulateItems(); // Populate the item select initially with all items
        } else {
            console.error("No se pudieron cargar los datos de ítems.");
        }

        if (rawLocationData) {
            allLocations = rawLocationData.reduce((acc, loc) => {
                if (loc.UniqueName && allowedCitiesSet.has(loc.UniqueName)) {
                    acc[loc.UniqueName] = loc.UniqueName;
                }
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

        const allKeys = new Set();
        data.forEach(item => {
            Object.keys(item).forEach(key => allKeys.add(key));
        });
        const preferredOrder = ['item_id', 'city', 'quality', 'sell_price_min', 'sell_price_min_date', 'buy_price_max', 'buy_price_max_date', 'sell_price_max', 'buy_price_min', 'timestamp'];
        const columns = preferredOrder.filter(key => allKeys.has(key)).concat(Array.from(allKeys).filter(key => !preferredOrder.includes(key)).sort());


        columns.forEach(key => {
            let headerText = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
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
                
                // Use rawAllItems for lookup to display full item name
                if (key === 'item_id' && rawAllItems[value]) {
                    value = rawAllItems[value];
                } else if (key === 'city' && allLocations[value]) {
                    value = allLocations[value];
                } else if (typeof value === 'number' && (key.includes('price') || key.includes('amount'))) {
                    value = value.toLocaleString();
                } else if ((key.includes('date') || key.includes('timestamp')) && value) {
                    try {
                        const date = new Date(value);
                        if (!isNaN(date.getTime())) {
                            value = date.toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
                        }
                    } catch (e) {
                        // If not a valid date, use original value
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

    itemSearchInput.addEventListener('keyup', (event) => {
        filterAndPopulateItems(event.target.value);
    });

    // --- Iniciar la carga de selectores al cargar la página ---
    initializeSelectors();
});
