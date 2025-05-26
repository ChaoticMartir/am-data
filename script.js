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
    // Keeping this defined, but temporarily NOT used in filtering for debugging
    const ALLOWED_CITIES_FOR_DROPDOWN = [
        "BRECILIEN",
        "FORTSTERLING",
        "LYMHURST",
        "BRIDGEWATCH",
        "MARTLOCK",
        "THETFORD",
        "CAERLEON"
    ];
    // const allowedCitiesSet = new Set(ALLOWED_CITIES_FOR_DROPDOWN); // Temporarily not used


    // --- Función para cargar JSON local ---
    async function loadJson(filename) {
        try {
            const response = await fetch(filename);
            if (!response.ok) {
                const errorText = `Error HTTP (${response.status}) al cargar ${filename}: ${response.statusText}`;
                console.error(errorText);
                dataContainer.innerHTML += `<p style="color: red;">${errorText}</p>`; // Append error
                return null;
            }
            const data = await response.json();
            console.log(`Successfully loaded ${filename}. Data size: ${JSON.stringify(data).length} bytes.`); // Log success and size
            if (!Array.isArray(data) || data.length === 0) {
                 const warningText = `Advertencia: El archivo ${filename} se cargó pero está vacío o no es un array válido.`;
                 console.warn(warningText);
                 dataContainer.innerHTML += `<p style="color: orange;">${warningText}</p>`; // Append warning
            }
            return data;
        } catch (error) {
            const errorText = `Error fatal al cargar el archivo ${filename}: ${error.message}.`;
            console.error(errorText, error);
            dataContainer.innerHTML += `<p style="color: red;">${errorText} Asegúrate de que los archivos estén en la misma carpeta y accesibles.</p>`; // Append fatal error
            return null;
        }
    }

    // --- Función para poblar los selectores ---
    function populateSelect(selectElement, data) {
        selectElement.innerHTML = ''; // Limpiar opciones existentes
        
        const sortedData = Object.entries(data).sort(([, a], [, b]) => a.localeCompare(b));

        if (sortedData.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = `No hay ${selectElement.id === 'item-select' ? 'ítems' : 'ciudades'} disponibles.`;
            selectElement.appendChild(option);
            selectElement.disabled = true; // Disable if empty
        } else {
            selectElement.disabled = false; // Enable if not empty
            for (const [id, name] of sortedData) {
                const option = document.createElement('option');
                option.value = id;
                option.textContent = name;
                selectElement.appendChild(option);
            }
        }
        console.log(`Populated ${selectElement.id} with ${sortedData.length} entries.`);
    }

    // Function to filter and populate item dropdown
    function filterAndPopulateItems(searchTerm = '') {
        const lowerCaseSearchTerm = searchTerm.toLowerCase();
        const filteredItems = {};
        let count = 0;
        for (const id in rawAllItems) {
            if (typeof rawAllItems[id] === 'string' && rawAllItems[id].toLowerCase().includes(lowerCaseSearchTerm)) {
                filteredItems[id] = rawAllItems[id];
                count++;
            }
        }
        populateSelect(itemSelect, filteredItems);
        console.log(`Filtered items: <span class="math-inline">\{count\} found for search term "</span>{searchTerm}"`);
    }

    // --- Cargar y poblar selectores al inicio ---
    async function initializeSelectors() {
        dataContainer.innerHTML = '<p>Cargando listas de ítems y ciudades...</p>'; // Initial loading message
        
        const rawItemData = await loadJson('items.json');
        const rawLocationData = await loadJson('world.json');

        // --- Process Items ---
        if (rawItemData && Array.isArray(rawItemData) && rawItemData.length > 0) {
            rawAllItems = rawItemData.reduce((acc, item) => {
                let uniqueId = null;
                if (typeof item.LocalizationNameVariable === 'string' && item.LocalizationNameVariable.startsWith('@ITEMS_')) {
                    uniqueId = item.LocalizationNameVariable.replace('@ITEMS_', '');
                } else if (typeof item.UniqueName === 'string' && item.UniqueName.trim() !== '') {
                    uniqueId = item.UniqueName;
                }

                let displayDisplayName = null;
                if (item.LocalizedNames && typeof item.LocalizedNames === 'object') {
                    displayDisplayName = item.LocalizedNames[DEFAULT_LANGUAGE] || item.LocalizedNames['EN-US'];
                }
                
                if (typeof displayDisplayName !== 'string' || displayDisplayName.trim() === '') {
                    displayDisplayName = uniqueId || `Item ID: ${uniqueId || 'N/A'}`;
                    if (typeof displayDisplayName !== 'string' || displayDisplayName.trim() === '') {
                        displayDisplayName = 'Missing Name';
                    }
                }

                if (uniqueId && typeof uniqueId === 'string' && uniqueId.trim() !== '') {
                    acc[uniqueId] = displayDisplayName;
                }
                return acc;
            }, {});
            
            console.log(`Raw All Items loaded: ${Object.keys(rawAllItems).length} entries.`);
            filterAndPopulateItems();
        } else {
            console.error("No se pudieron procesar los datos de ítems (archivo vacío o inválido después de cargar).");
            dataContainer.innerHTML += '<p style="color: red;">Error: La lista de ítems está vacía o es inválida después de procesar.</p>';
            populateSelect(itemSelect, {});
        }

        // --- Process Cities ---
        if (rawLocationData && Array.isArray(rawLocationData) && rawLocationData.length > 0) {
            allLocations = rawLocationData.reduce((acc, loc) => {
                if (loc.UniqueName && typeof loc.UniqueName === 'string' && loc.UniqueName.trim() !== '') {
                    // Temporarily keeping the filter broad for debugging.
                    // If you see many unexpected entries, we'll need to refine this.
                    if (!loc.UniqueName.startsWith('ISLAND-') && loc.UniqueName !== 'Debug') {
                        acc[loc.UniqueName] = loc.UniqueName;
                    }
                }
                return acc;
            }, {});
            console.log(`All Locations loaded (unfiltered for debug): ${Object.keys(allLocations).length} entries.`);
            populateSelect(citySelect, allLocations);
        } else {
            console.error("No se pudieron procesar los datos de ubicaciones (archivo vacío o inválido después de cargar).");
            dataContainer.innerHTML += '<p style="color: red;">Error: La lista de ciudades está vacía o es inválida después de procesar.</p>';
            populateSelect(citySelect, {});
        }
        
        // Final message only if no critical errors happened
        if (!dataContainer.innerHTML.includes('Error:') && !dataContainer.innerHTML.includes('Advertencia:')) {
            dataContainer.innerHTML += '<p>Selecciona tus opciones y haz clic en "Obtener Datos del Mercado".</p>';
        }
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

        const url = `<span class="math-inline">\{API\_BASE\_URL\}</span>{itemIdsStr}.json?locations=<span class="math-inline">\{locationsStr\}&qualities\=</span>{qualitiesStr}`;

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
            dataContainer.innerHTML = `<p style="color: red;">Error al cargar los datos de la API: ${error.message}. Por favor, inténtalo de nuevo.</p>`;
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
