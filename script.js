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
                // If response is not OK, log more details
                console.error(`Error HTTP al cargar ${filename}: ${response.status} - ${response.statusText}`);
                throw new Error(`Error al cargar ${filename}: ${response.statusText}`);
            }
            const data = await response.json();
            console.log(`Successfully loaded ${filename}. First 500 characters:`, JSON.stringify(data).substring(0, 500)); // Log part of content
            return data;
        } catch (error) {
            console.error(`No se pudo cargar el archivo ${filename}:`, error);
            dataContainer.innerHTML = `<p style="color: red;">Error: No se pudo cargar la lista de ${filename.includes('items') ? 'ítems' : 'ciudades'}. Asegúrate de que los archivos estén en la misma carpeta y accesibles.</p>`;
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
            // Ensure rawAllItems[id] is a string before calling toLowerCase
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
        dataContainer.innerHTML = '<p>Cargando listas de ítems y ciudades...</p>';
        
        const rawItemData = await loadJson('items.json');
        const rawLocationData = await loadJson('world.json');

        // --- Process Items ---
        if (rawItemData && Array.isArray(rawItemData) && rawItemData.length > 0) {
            rawAllItems = rawItemData.reduce((acc, item) => {
                let uniqueId = null;
                // Prefer LocalizationNameVariable after stripping prefix, fallback to UniqueName
                if (typeof item.LocalizationNameVariable === 'string' && item.LocalizationNameVariable.startsWith('@ITEMS_')) {
                    uniqueId = item.LocalizationNameVariable.replace('@ITEMS_', '');
                } else if (typeof item.UniqueName === 'string' && item.UniqueName.trim() !== '') {
