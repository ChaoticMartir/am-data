document.addEventListener('DOMContentLoaded', async () => {
    const itemSelect = document.getElementById('item-select');
    const citySelect = document.getElementById('city-select');
    const fetchDataButton = document.getElementById('fetch-data-button');
    const dataContainer = document.getElementById('data-container');

    let allItems = {}; // Para almacenar los items del JSON (ID: Nombre)
    let allLocations = {}; // Para almacenar las ubicaciones del JSON (ID: Nombre)

    const API_BASE_URL = "https://west.albion-online-data.com/api/v2/stats/prices/";
    const DEFAULT_LANGUAGE = 'ES-ES'; // Cambia esto si prefieres otro idioma (ej. 'EN-US')

    // --- CITIES EXPLICITLY ALLOWED BY USER (CORRECTED UNIQUE NAMES) ---
    const ALLOWED_CITIES_FOR_DROPDOWN = [
        "BRECILIEN",    // Corrected format for Brecilien
        "FORTSTERLING", // Corrected format for Fort Sterling
        "LYMHURST",     // Corrected format for Lymhurst
        "BRIDGEWATCH",  // Corrected format for Bridgewatch
        "MARTLOCK",     // Corrected format for Martlock
        "THETFORD",     // Corrected format for Thetford
        "CAERLEON"      // Corrected format for Caerleon
    ];
    // Convert to a Set for faster lookup
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
        
        // Convertir el objeto de datos en un array de pares [id, nombre] y ordenarlo
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
        
        // Cargar items.json (que es un ARRAY de objetos)
        const rawItemData = await loadJson('items.json');
        // Cargar world.json (que es un ARRAY de objetos)
        const rawLocationData = await loadJson('world.json');

        if (rawItemData) {
            // Mapear el array de objetos a un objeto { UniqueName: LocalizedName }
            allItems = rawItemData.reduce((acc, item) => {
                // Extraer el UniqueName eliminando "@ITEMS_"
                const uniqueName = item.LocalizationNameVariable ? item.LocalizationNameVariable.replace('@ITEMS_', '') : null;
                
                // Obtener el nombre localizado, preferible
