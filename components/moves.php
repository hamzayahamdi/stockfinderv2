<!DOCTYPE html>
<html lang="fr">
<head>
    <link rel="icon" type="image/png" sizes="32x32" href="soldp.svg">
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>STOCK MOVES</title>
    <link rel="stylesheet" href="styles.css?v=<?php echo time(); ?>">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.17.0/xlsx.full.min.js"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/shortcut-buttons-flatpickr@0.2.0/dist/themes/light.min.css">
    <link rel="stylesheet" href="https://cdn.datatables.net/1.10.24/css/jquery.dataTables.min.css">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels"></script>
   


    <style>





 /* Heading */
        #usineCharts h3 {
            padding-top: 15px;
            padding-bottom: 15px;
            text-align: left;
            padding-left: 15px;
            font-weight: 300;
            font-size: 20px;
            background-color: #588157;
            color: #f9f9f9;
            margin-top: 10px;
        }
           /* Heading */
        #equipeCharts h3 {
            padding-left: 15px;
            padding-top: 15px;
            padding-bottom: 15px;
            background-color: #588157;
            color: #ffffff;
            font-size: 20px;
            font-weight: 300;
        }





        .chart-container {
            width: 90%;
            margin: auto;
            display: none; /* Hide initially */
        }
        canvas {
            display: block;
        }
        .small-font {
            font-size: 10px !important;
        }
/* Heading */
#usineCharts h3{
 margin-top:0px;
 padding-left:30px;
}

/* Heading */
#equipeCharts h3{
 padding-left:30px;
}

/* Charts container */
#charts-container{
 overflow:hidden;
}



    </style>
</head>
<body>
    <div class="header">
        <button class="sidebar-toggle">
            <span class="menu-icon">☰</span> Menu
        </button>
        <form id="searchForm">
            <div id="totalStockValue">Total Stock Value HT : 0.00 MAD</div>
            <div style="position: relative;">
                <i class="fas fa-calendar-alt custom-calendar-icon"></i>
                <input type="text" id="dateRangePicker" placeholder="Sélectionnez une plage de dates">
            </div>
            <button type="button" id="downloadButton"><i class="fa fa-download"></i> Télécharger en Excel </button>
        </form>
    </div>

    <div class="sidebar" id="sidebar">
        <section>
            <img class="logo" src="moves.svg" alt="Logo">
        </section>
          <a href="#" id="show-charts">Charts</a>
        <div id="suppliers">
            <h3 id="recep">réception</h3>
            <h3 id="usi">Usines</h3>
            <a href="#" data-type="supplier" data-query="all" id="all-factories">Toutes les usines</a>
            <a href="#" data-type="supplier" data-query="BOIS Lissassfa">BOIS Lissassfa</a>
            <a href="#" data-type="supplier" data-query="OUTDOORZ">OUTDOORZ</a>
            <a href="#" data-type="supplier" data-query="TAPISSERIE">TAPISSERIE</a>
            <a href="#" data-type="supplier" data-query="GAYAL">GAYAL</a>
        </div>
        <div id="suppliers">
            <h3 id="eq">Equipes</h3>
            <a href="#" data-type="equipes" data-query="ABDELAZIZ ALAIDI">ABDELAZIZ ALAIDI</a>
            <a href="#" data-type="equipes" data-query="AIT MAZIGHT">AIT MAZIGHT</a>
            <a href="#" data-type="equipes" data-query="ANI REDOUANE">ANI REDOUANE</a>
            <a href="#" data-type="equipes" data-query="AZTOT NASER">AZTOT NASER</a>
            <a href="#" data-type="equipes" data-query="BAMOU MOHAMED">BAMOU MOHAMED</a>
            <a href="#" data-type="equipes" data-query="BELFQIH JAWAD">BELFQIH JAWAD</a>
            <a href="#" data-type="equipes" data-query="DARIF MUSTAPHA">DARIF MUSTAPHA</a>
            <a href="#" data-type="equipes" data-query="FIKRI MOHAMED">FIKRI MOHAMED</a>
            <a href="#" data-type="equipes" data-query="GAYAL">GAYAL</a>
            <a href="#" data-type="equipes" data-query="NASR RACHID">NASR RACHID</a>
            <a href="#" data-type="equipes" data-query="NIAMI ABDELKEBIR">NIAMI ABDELKEBIR</a>
            <a href="#" data-type="equipes" data-query="OUHAJJOU ABDELLATIF">OUHAJJOU ABDELLATIF</a>
            <a href="#" data-type="equipes" data-query="OUTDOORZ">OUTDOORZ</a>
            <a href="#" data-type="equipes" data-query="SAOUD MOHAMED">SAOUD MOHAMED</a>
            <a href="#" data-type="equipes" data-query="TAOUDI SLAOUI">TAOUDI SLAOUI</a>
            <a href="#" data-type="equipes" data-query="NAQRAOUI AZEDINE">NAQRAOUI AZEDINE</a>
            <a href="#" data-type="equipes" data-query="SAID AKCHOUCH">SAID AKCHOUCH</a>
        </div>
        <hr>
        <div id="clients">
            <h3 id="exp">expédition</h3>
            <h3 id="Magasins">Magasins</h3>
            <a href="#" data-type="client" data-query="SKETCH CASABLANCA">SKETCH CASABLANCA</a>
            <a href="#" data-type="client" data-query="SKETCH RABAT">SKETCH RABAT</a>
            <a href="#" data-type="client" data-query="SKETCH TANGER">SKETCH TANGER</a>
            <a href="#" data-type="client" data-query="SKETCH MARRAKECH">SKETCH MARRAKECH</a>
            <a href="#" data-type="client" data-query="OUTLET">OUTLET</a>
        </div>
        <hr>
      
    </div>

    <div class="content">
        <div id="results">
            <p>Veuillez suivre ces étapes pour commencer :</p>
            <ol>
                <li><strong>Sélectionnez une plage de dates :</strong> Utilisez le sélecteur de dates pour choisir les dates de début et de fin pour les données que vous souhaitez consulter.</li>
                <li><strong>Sélectionnez un fournisseur ou un client :</strong> Choisissez un fournisseur ou un client dans la barre latérale pour afficher les produits reçus ou expédiés.</li>
            </ol>
        </div>

       <div id="charts-container" class="chart-container">
    <div id="usineCharts" class="charts-section">
        <h3 class="chart-heading">Usines</h3>
        <canvas id="usineChartBOIS_BAMO" class="chart-box"></canvas>
        <canvas id="usineChartOUTDOORZ" class="chart-box"></canvas>
        <canvas id="usineChartTAPPISSERIE" class="chart-box"></canvas>
        <canvas id="usineChartGAYAL" class="chart-box"></canvas>
    </div>
    <div id="equipeCharts" class="charts-section">
        <h3 class="chart-heading">Equipes</h3>
        <canvas id="equipeChartABDELAZIZ_ALAIDI" class="chart-box"></canvas>
        <canvas id="equipeChartAIT_MAZIGHT" class="chart-box"></canvas>
        <canvas id="equipeChartANI_REDOUANE" class="chart-box"></canvas>
        <canvas id="equipeChartAZTOT_NASER" class="chart-box"></canvas>
        <canvas id="equipeChartBAMOU_MOHAMED" class="chart-box"></canvas>
        <canvas id="equipeChartBELFQIH_JAWAD" class="chart-box"></canvas>
        <canvas id="equipeChartDARIF_MUSTAPHA" class="chart-box"></canvas>
        <canvas id="equipeChartFIKRI_MOHAMED" class="chart-box"></canvas>
        <canvas id="equipeChartGAYAL" class="chart-box"></canvas>
        <canvas id="equipeChartNASR_RACHID" class="chart-box"></canvas>
        <canvas id="equipeChartNIAMI_ABDELKEBIR" class="chart-box"></canvas>
        <canvas id="equipeChartOUHAJJOU_ABDELLATIF" class="chart-box"></canvas>
        <canvas id="equipeChartOUTDOORZ" class="chart-box"></canvas>
        <canvas id="equipeChartSAOUD_MOHAMED" class="chart-box"></canvas>
        <canvas id="equipeChartTAOUDI_SLAOUI" class="chart-box"></canvas>
        <canvas id="equipeChartNAQRAOUI_AZEDINE" class="chart-box"></canvas>
        <canvas id="equipeChartSAID_AKCHOUCH" class="chart-box"></canvas>
    </div>
</div>

    </div>

    <footer>
        <p>&copy; 2024 SKETCH STOCK MOVES Made with &#10084; by Hamza</p>
    </footer>

    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/flatpickr"></script>
    <script src="https://cdn.jsdelivr.net/npm/flatpickr/dist/l10n/fr.js"></script>
    <script src="https://cdn.datatables.net/1.10.24/js/jquery.dataTables.min.js"></script>
    <link rel="stylesheet" type="text/css" href="https://cdn.datatables.net/responsive/2.2.9/css/responsive.dataTables.min.css">
    <script type="text/javascript" src="https://cdn.datatables.net/responsive/2.2.9/js/dataTables.responsive.min.js"></script>

    <script>
 document.addEventListener('DOMContentLoaded', function() {
    const datePicker = flatpickr("#dateRangePicker", {
        mode: "range",
        dateFormat: "d-m-Y",
        locale: "fr",
        position: 'auto center',
        onChange: function(selectedDates, dateStr, instance) {
            const activeLink = document.querySelector('#sidebar a.active');
            if (activeLink) {
                const type = activeLink.getAttribute('data-type');
                const query = activeLink.getAttribute('data-query');
                fetchData(type, query);
            }
        }
    });

    document.querySelector('.custom-calendar-icon').addEventListener('click', function() {
        datePicker.open();
    });

    const toggleButton = document.querySelector('.sidebar-toggle');
    const sidebar = document.getElementById('sidebar');

    function toggleSidebar() {
        if (window.innerWidth < 768) {
            sidebar.style.left = (sidebar.style.left === '0px' ? '-250px' : '0px');
        }
    }

    toggleButton.addEventListener('click', toggleSidebar);

    sidebar.addEventListener('click', function(event) {
        if (event.target.tagName === 'A' && window.innerWidth < 768) {
            sidebar.style.left = '-250px';
        }
    });

    document.addEventListener('click', function(event) {
        const isClickInsideSidebar = sidebar.contains(event.target);
        const isClickOnToggleButton = toggleButton.contains(event.target);

        if (!isClickInsideSidebar && !isClickOnToggleButton && window.innerWidth < 768) {
            sidebar.style.left = '-250px';
        }
    });

    function fetchData(type, query) {
        const dateRange = datePicker.selectedDates;
        if (dateRange.length !== 2) {
            displayMessage('Veuillez sélectionner une plage de dates avant de lancer une recherche.');
            return;
        }

        const startDate = flatpickr.formatDate(dateRange[0], "Y-m-d");
        const endDate = flatpickr.formatDate(dateRange[1], "Y-m-d");

        document.getElementById('results').innerHTML = '<p>Chargement des données...</p>';
        fetch(`backend.php?type=${type}&query=${encodeURIComponent(query)}&start_date=${startDate}&end_date=${endDate}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                console.log("Fetched data:", data);
                if (Array.isArray(data)) {
                    displayData(type, data);
                } else {
                    console.error('Invalid data format:', data);
                    document.getElementById('results').innerHTML = 'Error fetching data. Please try again.';
                }
            })
            .catch(error => {
                console.error('Error fetching data:', error);
                document.getElementById('results').innerHTML = 'Error fetching data. Please try again.';
            });
    }

    function displayData(type, data) {
        let totalStockValueHT = 0;
        let columns = [];
        let rows = [];

        if (type === 'supplier' || type === 'client' || type === 'equipes') {
            columns = [
                { title: "Réf. Produit" },
                { title: "Libellé" },
                { title: type === 'client' ? "QTE Expédiée" : "QTE Reçus" },
                { title: "Prix HT Unitaire" },
                { title: "Total HT" },
                { title: type === 'client' ? "Date d'expédition" : "Date de réception" }
            ];

            if (type === 'supplier') {
                columns.splice(5, 0, { title: "Supplier" });
                rows = data.map(item => {
                    const prix_ht = parseFloat(item.prix_ht) || 0;
                    totalStockValueHT += prix_ht;
                    return [
                        item.product_ref,
                        `${item.product_label} <span class="description">${item.description}</span>`,
                        Number(item.qte_recus).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }),
                        Number(item.prix_ht_unitaire).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }),
                        prix_ht.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }),
                        item.supplier,
                        item.date_reception
                    ];
                });
            } else if (type === 'client') {
                rows = data.map(item => {
                    const prix_ht = parseFloat(item.prix_ht) || 0;
                    totalStockValueHT += prix_ht;
                    return [
                        item.product_ref,
                        `${item.product_label} <span class="description">${item.description}</span>`,
                        Number(item.qte_expediee).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }),
                        Number(item.prix_ht_unitaire).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }),
                        prix_ht.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }),
                        item.date_expedition
                    ];
                });
            } else if (type === 'equipes') {
                rows = data.map(item => {
                    const prix_ht = parseFloat(item.prix_ht) || 0;
                    totalStockValueHT += prix_ht;
                    return [
                        item.product_ref,
                        `${item.product_label} <span class="description">${item.description}</span>`,
                        Number(item.qte_recus).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }),
                        Number(item.prix_ht_unitaire).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }),
                        prix_ht.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }),
                        item.date_reception
                    ];
                });
            }
        }

        document.getElementById('results').innerHTML = '<table id="resultsTable" class="display" style="width:100%"></table>';
        const dataTable = $('#resultsTable').DataTable({
            data: rows,
            columns: columns,
            pageLength: -1,
            lengthMenu: [[10, 25, 50, 100, -1], [10, 25, 50, 100, "All"]],
            destroy: true,
            order: [[columns.length - 1, 'desc']],
            responsive: true
        });

        document.getElementById('totalStockValue').innerText = `Total Stock Value HT: ${totalStockValueHT.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).replace(/,/g, ' ')} MAD`;
    }

    function displayMessage(message) {
        document.getElementById('results').innerHTML = `<p>${message}</p>`;
    }

    document.querySelectorAll('#sidebar a').forEach(link => {
        link.addEventListener('click', function(event) {
            event.preventDefault();
            document.querySelectorAll('#sidebar a').forEach(a => a.classList.remove('active'));
            this.classList.add('active');
            const type = this.getAttribute('data-type');
            const query = this.getAttribute('data-query');
            if (datePicker.selectedDates.length === 2) {
                fetchData(type, query);
            } else {
                displayMessage('Veuillez sélectionner une plage de dates avant de choisir un fournisseur ou un client.');
            }
            document.getElementById('charts-container').style.display = 'none';
            document.getElementById('results').style.display = 'block';
            document.getElementById('totalStockValue').style.display = 'flex'; // Show the total stock value when data table is shown
            if (window.innerWidth >= 768) {
                document.querySelector('.header').style.display = 'block';
            }
        });
    });

    document.getElementById('downloadButton').addEventListener('click', function() {
        const table = document.getElementById("resultsTable");
        if (!table) {
            console.error("No table found to export");
            return;
        }

        const dateRange = $('#dateRangePicker').val().replace(/-/g, '').replace(/ to /g, ' au ');

        const activeCategory = document.querySelector('.sidebar a.active');
        const query = activeCategory ? activeCategory.getAttribute('data-query') : 'general';
        const type = activeCategory ? activeCategory.getAttribute('data-type') : 'search';

        const formattedQuery = query.replace(/\s+/g, '_').replace(/[^\w-]/g, '');
        const fileName = `${formattedQuery}_${dateRange}.xlsx`;

        console.log("Generated Filename:", fileName);

        // Create a workbook from all rows, handling empty cells properly
        const wb = XLSX.utils.book_new();
        const wsData = [];
        
        // First, add the header row
        const headers = [];
        $(table).find('thead th').each(function() {
            headers.push($(this).text());
        });
        wsData.push(headers);
        
        // Then add all data rows, making sure to handle empty cells
        $(table).find('tbody tr').each(function() {
            const rowData = [];
            $(this).find('td').each(function() {
                // Get text content without HTML tags
                const cellText = $(this).text().trim() || ""; // Use empty string for null values
                rowData.push(cellText);
            });
            wsData.push(rowData);
        });
        
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
        XLSX.writeFile(wb, fileName);
    });

    document.getElementById('show-charts').addEventListener('click', function() {
        document.getElementById('results').style.display = 'none';
        document.getElementById('charts-container').style.display = 'block';
        document.getElementById('totalStockValue').style.display = 'none'; // Hide the total stock value when charts are shown
        if (window.innerWidth >= 768) {
            document.querySelector('.header').style.display = 'none';
        }
        showCharts();
    });

    let chartInstances = [];

    function showCharts() {
        const usines = ['BOIS BAMO', 'OUTDOORZ', 'TAPPISSERIE', 'GAYAL'];
        const equipes = ['ABDELAZIZ ALAIDI', 'AIT MAZIGHT', 'ANI REDOUANE', 'AZTOT NASER', 'BAMOU MOHAMED', 'BELFQIH JAWAD', 'DARIF MUSTAPHA', 'FIKRI MOHAMED', 'GAYAL', 'NASR RACHID', 'NIAMI ABDELKEBIR', 'OUHAJJOU ABDELLATIF', 'OUTDOORZ', 'SAOUD MOHAMED', 'TAOUDI SLAOUI', 'NAQRAOUI AZEDINE', 'SAID AKCHOUCH'];

        const usineColor = '#96C9F4';
        const usineBorderColor = '#96C9F4';
        const equipeColor = '#3FA2F6';
        const equipeBorderColor = '#3FA2F6';
        const lineColor = '#FF5733';

        // Destroy existing chart instances to avoid conflicts
        chartInstances.forEach(chart => chart.destroy());
        chartInstances = [];

        function formatNumber(value) {
            return Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
        }

        function createChart(ctx, labels, barDatasets, lineDataset, title) {
            return new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [
                        ...barDatasets,
                        {
                            type: 'line',
                            label: 'Line Dataset',
                            data: lineDataset.data,
                            borderColor: lineColor,
                            borderWidth: 2,
                            fill: false,
                            pointBackgroundColor: lineColor,
                            pointBorderColor: lineColor,
                            yAxisID: 'line-axis',
                        }
                    ]
                },
                options: {
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top'
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return formatNumber(context.raw);
                                }
                            }
                        },
                        title: {
                            display: true,
                            text: title,
                            font: {
                                size: 14
                            }
                        },
                        datalabels: {
                            display: true,
                            color: 'black',
                            anchor: 'end',
                            align: 'end',
                            formatter: (value) => formatNumber(value),
                            font: {
                                size: 10
                            },
                            offset: -10 // Adjust the position
                        }
                    },
                    scales: {
                        x: {
                            title: {
                                display: true,
                                text: 'Weeks - 2024'
                            }
                        },
                        y: {
                            title: {
                                display: true,
                                text: 'Production Value 2024'
                            }
                        },
                        'line-axis': {
                            position: 'right',
                            grid: {
                                drawOnChartArea: false
                            }
                        }
                    }
                },
                plugins: [{
                    afterDatasetsDraw: function(chart) {
                        const ctx = chart.ctx;
                        chart.data.datasets.forEach((dataset, i) => {
                            const meta = chart.getDatasetMeta(i);
                            if (meta.type === 'bar') {
                                meta.data.forEach((bar, index) => {
                                    const value = dataset.data[index];
                                    ctx.fillStyle = 'black';
                                    ctx.font = '10px Arial';
                                    ctx.textAlign = 'center';
                                    ctx.textBaseline = 'bottom';
                                    ctx.fillText(formatNumber(value), bar.x, bar.y);
                                });
                            }
                        });
                    }
                }]
            });
        }

        usines.forEach(usine => {
            fetch(`backend_charts.php?type=usine&query=${encodeURIComponent(usine)}`)
                .then(response => response.json())
                .then(data => {
                    data.datasets.forEach(dataset => {
                        dataset.backgroundColor = usineColor;
                        dataset.borderColor = usineBorderColor;
                    });

                    const ctx = document.getElementById(`usineChart${usine.replace(/\s+/g, '_')}`).getContext('2d');
                    const totalHT = data.datasets.reduce((total, dataset) => total + dataset.data.reduce((sum, value) => sum + value, 0), 0);
                    const title = `2024 Total HT for ${usine} - ${formatNumber(totalHT)} MAD`;

                    // Example line dataset (replace with actual data)
                    const lineDataset = {
                        label: 'Line Dataset',
                        data: data.datasets[0].data.map(value => value / 2) // Example transformation
                    };

                    chartInstances.push(createChart(ctx, data.labels, data.datasets, lineDataset, title));
                });
        });

        equipes.forEach(equipe => {
            fetch(`backend_charts.php?type=equipe&query=${encodeURIComponent(equipe)}`)
                .then(response => response.json())
                .then(data => {
                    data.datasets.forEach(dataset => {
                        dataset.backgroundColor = equipeColor;
                        dataset.borderColor = equipeBorderColor;
                    });

                    const ctx = document.getElementById(`equipeChart${equipe.replace(/\s+/g, '_')}`).getContext('2d');
                    const totalHT = data.datasets.reduce((total, dataset) => total + dataset.data.reduce((sum, value) => sum + value, 0), 0);
                    const title = `2024 Total HT for ${equipe} - ${formatNumber(totalHT)} MAD`;

                    // Example line dataset (replace with actual data)
                    const lineDataset = {
                        label: 'Line Dataset',
                        data: data.datasets[0].data.map(value => value / 2) // Example transformation
                    };

                    chartInstances.push(createChart(ctx, data.labels, data.datasets, lineDataset, title));
                });
        });
    }

    // Show charts on first load and hide the datatable text and total stock value
    document.getElementById('results').style.display = 'none';
    document.getElementById('charts-container').style.display = 'block';
    document.getElementById('totalStockValue').style.display = 'none';
    if (window.innerWidth >= 768) {
        document.querySelector('.header').style.display = 'none';
    }

    showCharts();

    // Set the "Charts" link as active
    document.getElementById('show-charts').classList.add('active');
});

    </script>
</body>
</html>
