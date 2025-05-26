document.addEventListener('DOMContentLoaded', async () => {
    const itemSearchInput = document.getElementById('item-search');
    const itemSelect = document.getElementById('item-select');
    const citySelect = document.getElementById('city-select');
    const itemTypeSelect = document.getElementById('item-type-select'); // New: Get the item type select element
    const fetchDataButton = document.getElementById('fetch-data-button');
    const dataContainer = document.getElementById('data-container');

    let allItems = {}; // For storing ID: Name mapping (filtered for dropdown)
    let rawAllItems = {}; // For storing ALL items from items.json (ID: Name mapping, unfiltered)
    let allLocations = {}; // For storing location data (ID: Name)
    let groupedItems = {}; // New: To store items grouped by type

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

    // New: Function to determine item type based on UniqueName
    function getItemType(uniqueName) {
        uniqueName = uniqueName.toUpperCase();
        if (uniqueName.includes('MAIN_') || uniqueName.includes('2H_')) {
            // Check for specific weapon types
            if (uniqueName.includes('_AXE') || uniqueName.includes('_BOW') || uniqueName.includes('_CROSSBOW') ||
                uniqueName.includes('_DAGGER') || uniqueName.includes('_FIRE') || uniqueName.includes('_FROST') ||
                uniqueName.includes('_HAMMER') || uniqueName.includes('_HOLY') || uniqueName.includes('_ARCANE') ||
                uniqueName.includes('_NATURE') || uniqueName.includes('_MACE') || uniqueName.includes('_SPEAR') ||
                uniqueName.includes('_SWORD') || uniqueName.includes('_CURSED') || uniqueName.includes('_STAFF')) {
                return 'Weapon';
            }
        }
        if (uniqueName.includes('_ARMOR') || uniqueName.includes('_HELM_') || uniqueName.includes('_SHOES_') ||
            uniqueName.includes('_CAPE') || uniqueName.includes('_TORSO')) {
            return 'Armor';
        }
        if (uniqueName.includes('_OFF_')) {
            return 'Offhand';
        }
        if (uniqueName.includes('_TOOL_')) {
            return 'Tool';
        }
        if (uniqueName.includes('RESOURCE') || uniqueName.includes('ORE') || uniqueName.includes('WOOD') ||
            uniqueName.includes('FIBER') || uniqueName.includes('LEATHER') || uniqueName.includes('STONE') ||
            uniqueName.includes('FISH')) {
            return 'Resource';
        }
        if (uniqueName.includes('POTION') || uniqueName.includes('FOOD') || uniqueName.includes('OMELET') ||
            uniqueName.includes('SANDWICH') || uniqueName.includes('SOUP') || uniqueName.includes('SALAD')) {
            return 'Consumable';
        }
        if (uniqueName.includes('BAG') || uniqueName.includes('BACKPACK')) {
            return 'Bag';
        }
        if (uniqueName.includes('JOURNAL')) {
            return 'Journal';
        }
        if (uniqueName.includes('MOUNT') || uniqueName.includes('RIDEABLE')) {
            return 'Mount';
        }
        if (uniqueName.includes('FURNITURE') || uniqueName.includes('DECORATION')) {
            return 'Furniture/Decoration';
        }
        if (uniqueName.includes('FISHINGBAIT') || uniqueName.includes('FISHINGROD')) {
            return 'Fishing';
        }
        return 'Other'; // Default category if no specific match
    }

    // --- Populate Items Dropdown ---
    async function populateItems() {
        const itemsData = await loadJson('items.json');
        if (!itemsData) return;

        const filteredItems = {};
        groupedItems = { 'All': {} }; // Initialize with 'All' category

        itemsData.forEach(item => {
            const itemName = item.LocalizedNames ? item.LocalizedNames[DEFAULT_LANGUAGE] : item.UniqueName;
            const itemID = item.UniqueName;

            if (itemName && itemID) {
                rawAllItems[itemID] = itemName; // Store all items for later display

                // We only add items that are not sub-quality variations for the selector
                if (!itemID.includes('@')) {
                    filteredItems[itemID] = itemName;
                    const itemType = getItemType(itemID);
                    if (!groupedItems[itemType]) {
                        groupedItems[itemType] = {};
                    }
                    groupedItems[itemType][itemID] = itemName;
                }
            }
        });

        // Populate item type dropdown
        itemTypeSelect.innerHTML = '<option value="All">Todos los Tipos</option>';
        Object.keys(groupedItems)
            .filter(type => type !== 'All') // Don't re-add 'All'
            .sort() // Sort types alphabetically
            .forEach(type => {
                const option = document.createElement('option');
                option.value = type;
                option.textContent = type;
                itemTypeSelect.appendChild(option);
            });

        // Sort items by name within 'All' for initial display
        groupedItems['All'] = Object.fromEntries(
            Object.entries(filteredItems).sort(([, a], [, b]) => a.localeCompare(b))
        );

        renderItems(Object.keys(groupedItems['All'])); // Initially render all items
    }

    // --- Render Items in the Select Box ---
    function renderItems(itemKeys) {
        itemSelect.innerHTML = '';
        itemKeys.forEach(key => {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = rawAllItems[key]; // Use rawAllItems for full name
            itemSelect.appendChild(option);
        });
    }

    // --- Populate Cities Dropdown (No change needed) ---
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

    // --- Fetch Data from Albion API (No change needed) ---
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
        // Filter out items where sell_price_min or buy_price_min is 0
        const filteredData = data.filter(item =>
            (item.sell_price_min > 0 || item.buy_price_min > 0)
        );

        if (filteredData.length === 0) {
            dataContainer.innerHTML = '<p>No se encontraron datos válidos para la selección actual (precios de venta/compra mínimos son 0 o no hay datos).</p>';
            return;
        }

        // Define columns to display, excluding date columns
        const columns = [
            'item_id', 'city', 'quality',
            'sell_price_min',
            'sell_price_max',
            'buy_price_min',
            'buy_price_max'
        ];

        let tableHTML = '<table><thead><tr>';
        columns.forEach(key => {
            let headerText = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            if (key === 'item_id') headerText = 'Ítem';
            if (key === 'city') headerText = 'Ciudad';
            if (key === 'quality') headerText = 'Calidad';
            if (key === 'sell_price_min') headerText = 'Precio Venta Mín.';
            if (key === 'sell_price_max') headerText = 'Precio Venta Máx.';
            if (key === 'buy_price_min') headerText = 'Precio Compra Mín.';
            if (key === 'buy_price_max') headerText = 'Precio Compra Máx.';

            tableHTML += `<th>${headerText}</th>`;
        });
        tableHTML += '</tr></thead><tbody>';

        filteredData.forEach(item => {
            tableHTML += '<tr>';
            columns.forEach(key => {
                let value = item[key];

                if (key === 'item_id' && rawAllItems[value]) {
                    value = rawAllItems[value];
                } else if (key === 'city') {
                    value = value;
                } else if (typeof value === 'number' && (key.includes('price'))) {
                    value = value.toLocaleString();
                } else if (key === 'quality') {
                    const qualityNames = { 1: 'Normal', 2: 'Buena', 3: 'Excepcional', 4: 'Excelente', 5: 'Obra Maestra' };
                    value = qualityNames[value] || value;
                }
                // Date columns are already excluded from 'columns' array, so no need for 'else if (key.includes('date'))'

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
        // New: Filter based on currently selected item type
        const selectedType = itemTypeSelect.value;
        const itemsToFilter = selectedType === 'All' ? groupedItems['All'] : groupedItems[selectedType];

        const filteredKeys = Object.keys(itemsToFilter).filter(key =>
            itemsToFilter[key].toLowerCase().includes(searchTerm)
        );
        renderItems(filteredKeys);
    });

    // New: Event listener for item type dropdown
    itemTypeSelect.addEventListener('change', (e) => {
        const selectedType = e.target.value;
        const currentSearchTerm = itemSearchInput.value.toLowerCase();

        let itemsToRender = {};
        if (selectedType === 'All') {
            itemsToRender = groupedItems['All'];
        } else {
            itemsToRender = groupedItems[selectedType];
        }

        // Apply existing search filter to the newly selected type's items
        const filteredKeys = Object.keys(itemsToRender).filter(key =>
            itemsToRender[key].toLowerCase().includes(currentSearchTerm)
        );
        renderItems(filteredKeys);
    });

    // --- Initial Load ---
    await populateItems();
    await populateCities();
});document.addEventListener('DOMContentLoaded', async () => {
    const itemSearchInput = document.getElementById('item-search');
    const itemSelect = document.getElementById('item-select');
    const citySelect = document.getElementById('city-select');
    const itemTypeSelect = document.getElementById('item-type-select'); // New: Get the item type select element
    const fetchDataButton = document.getElementById('fetch-data-button');
    const dataContainer = document.getElementById('data-container');

    let allItems = {}; // For storing ID: Name mapping (filtered for dropdown)
    let rawAllItems = {}; // For storing ALL items from items.json (ID: Name mapping, unfiltered)
    let allLocations = {}; // For storing location data (ID: Name)
    let groupedItems = {}; // New: To store items grouped by type

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

    // New: Function to determine item type based on UniqueName
    function getItemType(uniqueName) {
        uniqueName = uniqueName.toUpperCase();
        if (uniqueName.includes('MAIN_') || uniqueName.includes('2H_')) {
            // Check for specific weapon types
            if (uniqueName.includes('_AXE') || uniqueName.includes('_BOW') || uniqueName.includes('_CROSSBOW') ||
                uniqueName.includes('_DAGGER') || uniqueName.includes('_FIRE') || uniqueName.includes('_FROST') ||
                uniqueName.includes('_HAMMER') || uniqueName.includes('_HOLY') || uniqueName.includes('_ARCANE') ||
                uniqueName.includes('_NATURE') || uniqueName.includes('_MACE') || uniqueName.includes('_SPEAR') ||
                uniqueName.includes('_SWORD') || uniqueName.includes('_CURSED') || uniqueName.includes('_STAFF')) {
                return 'Weapon';
            }
        }
        if (uniqueName.includes('_ARMOR') || uniqueName.includes('_HELM_') || uniqueName.includes('_SHOES_') ||
            uniqueName.includes('_CAPE') || uniqueName.includes('_TORSO')) {
            return 'Armor';
        }
        if (uniqueName.includes('_OFF_')) {
            return 'Offhand';
        }
        if (uniqueName.includes('_TOOL_')) {
            return 'Tool';
        }
        if (uniqueName.includes('RESOURCE') || uniqueName.includes('ORE') || uniqueName.includes('WOOD') ||
            uniqueName.includes('FIBER') || uniqueName.includes('LEATHER') || uniqueName.includes('STONE') ||
            uniqueName.includes('FISH')) {
            return 'Resource';
        }
        if (uniqueName.includes('POTION') || uniqueName.includes('FOOD') || uniqueName.includes('OMELET') ||
            uniqueName.includes('SANDWICH') || uniqueName.includes('SOUP') || uniqueName.includes('SALAD')) {
            return 'Consumable';
        }
        if (uniqueName.includes('BAG') || uniqueName.includes('BACKPACK')) {
            return 'Bag';
        }
        if (uniqueName.includes('JOURNAL')) {
            return 'Journal';
        }
        if (uniqueName.includes('MOUNT') || uniqueName.includes('RIDEABLE')) {
            return 'Mount';
        }
        if (uniqueName.includes('FURNITURE') || uniqueName.includes('DECORATION')) {
            return 'Furniture/Decoration';
        }
        if (uniqueName.includes('FISHINGBAIT') || uniqueName.includes('FISHINGROD')) {
            return 'Fishing';
        }
        return 'Other'; // Default category if no specific match
    }

    // --- Populate Items Dropdown ---
    async function populateItems() {
        const itemsData = await loadJson('items.json');
        if (!itemsData) return;

        const filteredItems = {};
        groupedItems = { 'All': {} }; // Initialize with 'All' category

        itemsData.forEach(item => {
            const itemName = item.LocalizedNames ? item.LocalizedNames[DEFAULT_LANGUAGE] : item.UniqueName;
            const itemID = item.UniqueName;

            if (itemName && itemID) {
                rawAllItems[itemID] = itemName; // Store all items for later display

                // We only add items that are not sub-quality variations for the selector
                if (!itemID.includes('@')) {
                    filteredItems[itemID] = itemName;
                    const itemType = getItemType(itemID);
                    if (!groupedItems[itemType]) {
                        groupedItems[itemType] = {};
                    }
                    groupedItems[itemType][itemID] = itemName;
                }
            }
        });

        // Populate item type dropdown
        itemTypeSelect.innerHTML = '<option value="All">Todos los Tipos</option>';
        Object.keys(groupedItems)
            .filter(type => type !== 'All') // Don't re-add 'All'
            .sort() // Sort types alphabetically
            .forEach(type => {
                const option = document.createElement('option');
                option.value = type;
                option.textContent = type;
                itemTypeSelect.appendChild(option);
            });

        // Sort items by name within 'All' for initial display
        groupedItems['All'] = Object.fromEntries(
            Object.entries(filteredItems).sort(([, a], [, b]) => a.localeCompare(b))
        );

        renderItems(Object.keys(groupedItems['All'])); // Initially render all items
    }

    // --- Render Items in the Select Box ---
    function renderItems(itemKeys) {
        itemSelect.innerHTML = '';
        itemKeys.forEach(key => {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = rawAllItems[key]; // Use rawAllItems for full name
            itemSelect.appendChild(option);
        });
    }

    // --- Populate Cities Dropdown (No change needed) ---
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

    // --- Fetch Data from Albion API (No change needed) ---
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
        // Filter out items where sell_price_min or buy_price_min is 0
        const filteredData = data.filter(item =>
            (item.sell_price_min > 0 || item.buy_price_min > 0)
        );

        if (filteredData.length === 0) {
            dataContainer.innerHTML = '<p>No se encontraron datos válidos para la selección actual (precios de venta/compra mínimos son 0 o no hay datos).</p>';
            return;
        }

        // Define columns to display, excluding date columns
        const columns = [
            'item_id', 'city', 'quality',
            'sell_price_min',
            'sell_price_max',
            'buy_price_min',
            'buy_price_max'
        ];

        let tableHTML = '<table><thead><tr>';
        columns.forEach(key => {
            let headerText = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            if (key === 'item_id') headerText = 'Ítem';
            if (key === 'city') headerText = 'Ciudad';
            if (key === 'quality') headerText = 'Calidad';
            if (key === 'sell_price_min') headerText = 'Precio Venta Mín.';
            if (key === 'sell_price_max') headerText = 'Precio Venta Máx.';
            if (key === 'buy_price_min') headerText = 'Precio Compra Mín.';
            if (key === 'buy_price_max') headerText = 'Precio Compra Máx.';

            tableHTML += `<th>${headerText}</th>`;
        });
        tableHTML += '</tr></thead><tbody>';

        filteredData.forEach(item => {
            tableHTML += '<tr>';
            columns.forEach(key => {
                let value = item[key];

                if (key === 'item_id' && rawAllItems[value]) {
                    value = rawAllItems[value];
                } else if (key === 'city') {
                    value = value;
                } else if (typeof value === 'number' && (key.includes('price'))) {
                    value = value.toLocaleString();
                } else if (key === 'quality') {
                    const qualityNames = { 1: 'Normal', 2: 'Buena', 3: 'Excepcional', 4: 'Excelente', 5: 'Obra Maestra' };
                    value = qualityNames[value] || value;
                }
                // Date columns are already excluded from 'columns' array, so no need for 'else if (key.includes('date'))'

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
        // New: Filter based on currently selected item type
        const selectedType = itemTypeSelect.value;
        const itemsToFilter = selectedType === 'All' ? groupedItems['All'] : groupedItems[selectedType];

        const filteredKeys = Object.keys(itemsToFilter).filter(key =>
            itemsToFilter[key].toLowerCase().includes(searchTerm)
        );
        renderItems(filteredKeys);
    });

    // New: Event listener for item type dropdown
    itemTypeSelect.addEventListener('change', (e) => {
        const selectedType = e.target.value;
        const currentSearchTerm = itemSearchInput.value.toLowerCase();

        let itemsToRender = {};
        if (selectedType === 'All') {
            itemsToRender = groupedItems['All'];
        } else {
            itemsToRender = groupedItems[selectedType];
        }

        // Apply existing search filter to the newly selected type's items
        const filteredKeys = Object.keys(itemsToRender).filter(key =>
            itemsToRender[key].toLowerCase().includes(currentSearchTerm)
        );
        renderItems(filteredKeys);
    });

    // --- Initial Load ---
    await populateItems();
    await populateCities();
});
