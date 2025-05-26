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
    const DEFAULT_LANGUAGE = 'ES-ES';

    // Correctly defined city names as they appear in the API and world.json
    const mainCities = new Set([
        "Black Market", "Bridgewatch", "Caerleon", "Fort Sterling",
        "Lymhurst", "Martlock", "Thetford", "Brecilien"
    ]);

    // --- Function to load local JSON ---
    async function loadJson(filename) {
        try {
            const response = await fetch(filename);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (e) {
            console.error(`Error loading ${filename}:`, e);
            dataContainer.innerHTML = `<p style="color: red;">Error loading necessary file: ${filename}. Check the console for more details.</p>`;
            return null;
        }
    }

    // --- Populate Items Dropdown ---
    async function populateItems() {
        const itemsData = await loadJson('items.json');
        if (!itemsData) return;

        const filteredItems = {};
        itemsData.forEach(item => {
            const itemName = item.LocalizedNames ? item.LocalizedNames[DEFAULT_LANGUAGE] : item.UniqueName;
            const itemID = item.UniqueName;
            if (itemName && itemID) {
                // We only add items that are not sub-quality variations for the selector
                if (!itemID.includes('@')) {
                   filteredItems[itemID] = itemName;
                }
                // But we store all items for later display
                rawAllItems[itemID] = itemName;
            }
        });

        // Sort items by name
        allItems = Object.fromEntries(
            Object.entries(filteredItems).sort(([, a], [, b]) => a.localeCompare(b))
        );

        renderItems(Object.keys(allItems));
    }

    // --- Render Items in the Select Box ---
    function renderItems(itemKeys) {
        itemSelect.innerHTML = '';
        itemKeys.forEach(key => {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = allItems[key];
            itemSelect.appendChild(option);
        });
    }

    // --- Populate Cities Dropdown ---
    async function populateCities() {
        const worldData = await loadJson('world.json');
        if (!worldData) return;

        const uniqueLocations = new Map();
        worldData.forEach(location => {
            // Use the UniqueName as the value for the dropdown, which is what the API expects
            if (mainCities.has(location.UniqueName)) {
               uniqueLocations.set(location.UniqueName, location.UniqueName);
            }
        });

        // Clear previous options
        citySelect.innerHTML = '';

        // Sort and populate the dropdown
        const sortedCities = Array.from(uniqueLocations.keys()).sort();
        sortedCities.forEach(city => {
            const option = document.createElement('option');
            option.value = city;
            option.textContent = city;
            citySelect.appendChild(option);
            allLocations[city] = city; // Store for later reference
        });
    }

    // --- Fetch Data from Albion API ---
    async function fetchData() {
        const selectedItems = Array.from(itemSelect.selectedOptions).map(opt => opt.value);
        const selectedCities = Array.from(citySelect.selectedOptions).map(opt => opt.value);

        if (selectedItems.length === 0 || selectedCities.length === 0) {
            dataContainer.innerHTML = '<p style="color: orange;">Por favor, selecciona al menos un ítem y una ciudad.</p>';
            return;
        }

        const itemsQuery = selectedItems.join(',');
        const citiesQuery = selectedCities.join(',');

        const url = `${API_BASE_URL}${itemsQuery}?locations=${citiesQuery}`;

        dataContainer.innerHTML = '<p>Cargando datos...</p>';

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Error en la solicitud a la API: ${response.status} ${response.statusText}`);
            }
            const data = await response.json();
            displayData(data);
        } catch (error) {
            console.error('Error fetching data:', error);
            dataContainer.innerHTML = `<p style="color: red;">Error al obtener datos: ${error.message}</p>`;
        }
    }

    // --- Display Data in a Table ---
    function displayData(data) {
        if (data.length === 0) {
            dataContainer.innerHTML = '<p>No se encontraron datos para la selección actual.</p>';
            return;
        }

        const columns = [
            'item_id', 'city', 'quality',
            'sell_price_min', 'sell_price_min_date',
            'sell_price_max', 'sell_price_max_date',
            'buy_price_min', 'buy_price_min_date',
            'buy_price_max', 'buy_price_max_date'
        ];

        let tableHTML = '<table><thead><tr>';
        columns.forEach(key => {
            let headerText = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            if (key === 'item_id') headerText = 'Ítem';
            if (key === 'city') headerText = 'Ciudad';
            if (key === 'quality') headerText = 'Calidad';
            if (key === 'sell_price_min') headerText = 'Precio Venta Mín.';
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
                } else if (key === 'city') {
                    value = value;
                } else if (typeof value === 'number' && (key.includes('price'))) {
                    value = value.toLocaleString();
                } else if (key.includes('date')) {
                    try {
                        value = new Date(value).toLocaleString('es-ES');
                    } catch (e) { /* keep original value */ }
                } else if (key === 'quality') {
                    const qualityNames = { 1: 'Normal', 2: 'Buena', 3: 'Excepcional', 4: 'Excelente', 5: 'Obra Maestra' };
                    value = qualityNames[value] || value;
                }

                tableHTML += `<td>${value}</td>`;
            });
            tableHTML += '</tr>';
        });

        tableHTML += '</tbody></table>';
        dataContainer.innerHTML = tableHTML;
    }

    // --- Event Listeners ---
    fetchDataButton.addEventListener('click', fetchData);

    itemSearchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filteredKeys = Object.keys(allItems).filter(key =>
            allItems[key].toLowerCase().includes(searchTerm)
        );
        renderItems(filteredKeys);
    });

    // --- Initial Load ---
    await populateItems();
    await populateCities();
});
