document.addEventListener('DOMContentLoaded', () => {
    const dataContainer = document.getElementById('data-container');

    // Define los ítems, ubicaciones y calidades que te interesan
    const itemIds = ["T4_BAG", "T5_BAG", "T6_BAG"];
    const locations = ["Martlock", "Fort Sterling", "Thetford", "Lymhurst", "Bridgewatch", "Caerleon"];
    const qualities = [1, 2, 3]; // 1: Normal, 2: Bueno, 3: Excepcional

    const baseUrl = "https://west.albion-online-data.com/api/v2/stats/prices/";
    const url = `${baseUrl}${itemIds.join(',')}.json?locations=${locations.join(',')}&qualities=${qualities.join(',')}`;

    fetch(url)
        .then(response => {
            if (!response.ok) {
                // Si la respuesta no es OK (ej. 404, 500), lanza un error
                throw new Error(`Error HTTP: ${response.status}`);
            }
            return response.json(); // Parsea la respuesta como JSON
        })
        .then(data => {
            if (data && data.length > 0) {
                // Si hay datos, crea una tabla para mostrarlos
                let tableHTML = '<table><thead><tr>';
                
                // Crea las cabeceras de la tabla (columnas)
                // Usamos un conjunto para evitar columnas duplicadas si los objetos tienen campos ligeramente diferentes
                const allKeys = new Set();
                data.forEach(item => {
                    Object.keys(item).forEach(key => allKeys.add(key));
                });
                const columns = Array.from(allKeys).sort(); // Ordena las columnas alfabéticamente

                columns.forEach(key => {
                    tableHTML += `<th>${key.replace(/_/g, ' ').toUpperCase()}</th>`; // Formatea el nombre de la columna
                });
                tableHTML += '</tr></thead><tbody>';

                // Rellena las filas de la tabla con los datos
                data.forEach(item => {
                    tableHTML += '<tr>';
                    columns.forEach(key => {
                        let value = item[key];
                        // Formateo especial para números y fechas
                        if (typeof value === 'number' && key.includes('price')) {
                            value = value.toLocaleString(); // Formato de número con comas
                        } else if (key.includes('date') || key.includes('timestamp')) {
                             // Intenta formatear fechas si son ISO strings
                            try {
                                const date = new Date(value);
                                if (!isNaN(date.getTime())) {
                                    value = date.toLocaleString(); // Formato de fecha y hora local
                                }
                            } catch (e) {
                                // No es una fecha válida, usa el valor original
                            }
                        }
                        tableHTML += `<td>${value !== undefined ? value : ''}</td>`;
                    });
                    tableHTML += '</tr>';
                });

                tableHTML += '</tbody></table>';
                dataContainer.innerHTML = tableHTML;
            } else {
                dataContainer.innerHTML = '<p>No se encontraron datos para los ítems y filtros seleccionados.</p>';
            }
        })
        .catch(error => {
            // Manejo de errores de la petición
            console.error('Hubo un problema con la petición Fetch:', error);
            dataContainer.innerHTML = `<p>Error al cargar los datos: ${error.message}. Por favor, inténtalo de nuevo más tarde.</p>`;
        });
});
