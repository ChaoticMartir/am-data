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
                    localizedName = item.LocalizedNames[DEFAULT_
