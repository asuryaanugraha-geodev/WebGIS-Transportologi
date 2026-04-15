// ===================== //
// INIT MAP
// ===================== //
var map = L.map('map', {
    zoomControl: false
});

L.control.zoom({
    position: 'bottomright'
}).addTo(map);

// ===================== //
// BASEMAP
// ===================== //
var osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
});

var satellite = L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    { attribution: 'Tiles © Esri' }
);

osm.addTo(map);

L.control.layers({
    "Street Map": osm,
    "Satellite": satellite
}, null, {
    position: 'bottomleft'
}).addTo(map);

// ===================== //
// GLOBAL VARIABLE
// ===================== //
var defaultLayer;
var level1Layer;
var level1LabelLayer = L.layerGroup();
var level1Data = null; // 🔥 untuk tabel

// ===================== //
// HOME BUTTON
// ===================== //
function goHome() {
    map.setView([-7.5666, 110.8167], 13);
}

// ===================== //
// COLOR FUNCTION
// ===================== //
function getColor(rank) {
    if (rank === 1) return "#08306b";
    if (rank === 2) return "#08519c";
    if (rank === 3) return "#2171b5";
    if (rank === 4) return "#4292c6";
    if (rank === 5) return "#6baed6";
    if (rank === 6) return "#9ecae1";
    if (rank === 7) return "#c6dbef";
    if (rank === 8) return "#deebf7";
    if (rank === 9) return "#f7fbff";
    if (rank === 10) return "#e3f2fd";
    return null;
}

// ===================== //
// STYLE LEVEL 1
// ===================== //
function styleLevel1(feature) {

    var rank = feature.properties.Lvl1Rank;

    if (rank <= 10) {
        return {
            color: "#000",
            weight: 1,
            fillColor: getColor(rank),
            fillOpacity: 0.7
        };
    }

    return {
        color: "#000",
        weight: 1,
        fillOpacity: 0
    };
}

// ===================== //
// LEVEL SWITCH
// ===================== //
function setLevel(event, level) {

    document.querySelectorAll(".nav-btn")
        .forEach(btn => btn.classList.remove("active"));

    event.target.classList.add("active");

    document.getElementById("sidebar").style.display = "block";

    // 🔥 RESET MAP
    if (defaultLayer) map.removeLayer(defaultLayer);
    if (level1Layer) map.removeLayer(level1Layer);
    map.removeLayer(level1LabelLayer);

    if (level === 1) {
        loadLevel1Map();         // 🔥 LOAD MAP DULU
        renderLevel1Sidebar();   // 🔥 BARU TABLE
    } 
    else if (level === 2) {
        renderLevel2Sidebar();
    } 
    else if (level === 3) {
        renderLevel3Sidebar();
    }
}

// ===================== //
// SIDEBAR
// ===================== //
function renderLevel1Sidebar() {

    const sidebar = document.getElementById("sidebar");

    if (!level1Data) {
        sidebar.innerHTML = "Loading...";
        return;
    }

    // 🔥 COPY + SORT DATA
    let sorted = [...level1Data.features];

    sorted.sort((a, b) => {
        return (a.properties.Lvl1Rank || 999) - (b.properties.Lvl1Rank || 999);
    });

    let html = `
        <h3>Level 1 Analysis</h3>
    

        <div class="table-container">
        <table class="data-table">
            <tr>
                <th class="sticky-col">Kelurahan</th>
                <th>Lvl 1 Final Rank</th>
                <th>Lvl 1 Score Rank</th>
                <th>Crash per Population</th>
                <th>School Count</th>
                <th>Population at School Age (%)</th>
                <th>Area Type</th>
                <th>Income</th>
            </tr>
    `;

    sorted.forEach(f => {

        let p = f.properties;
        let popPercent = (p.PopScore * 100).toFixed(2) + "%";

        // 🔥 AMANIN DATA (kalau null)
        let nama = p.KELURAHAN || "-";
        let rank = p.Lvl1Rank ?? "-";
        let score = p.Lvl1Score ?? "-";

        // 🔥 OPTIONAL: highlight top 10
        let rowColor = (rank <= 10) ? "#e3f2fd" : "";

        html += `
            <tr style="background:${rowColor}">
                <td class="sticky-col">${p.KELURAHAN}</td>
                <td>${p.Lvl1Rank}</td>
                <td>${p.Lvl1Score}</td>
                <td>${p.CrashScore}</td>
                <td>${p.SchoolScor}</td>
                <td>${popPercent}</td>
                <td>${p.AreaScore}</td>
                <td>${p.IncomeScor}</td>
            </tr>
        `;
    });

    html += `
        </table>
        </div>
    `;

    sidebar.innerHTML = html;
}

// ===================== //
// SIDEBAR LEVEL 2 & 3
// ===================== //
function renderLevel2Sidebar() {
    document.getElementById("sidebar").innerHTML = `
        <h3>Level 2 Analysis</h3>
        <p>Under Construction</p>
    `;
}

function renderLevel3Sidebar() {
    document.getElementById("sidebar").innerHTML = `
        <h3>Level 3 Analysis</h3>
        <p>Waiting for the Data</p>
    `;
}

// ===================== //
// DEFAULT MAP
// ===================== //
fetch('Data/solo_kelurahan_adm.geojson')
.then(res => res.json())
.then(data => {

    defaultLayer = L.geoJSON(data, {
        style: {
            color: "#3388ff",
            weight: 1,
            fillOpacity: 0.2
        },

        onEachFeature: function (feature, layer) {

            var p = feature.properties;

            var kecamatan = p.KECAMATAN.replace("Kecamatan ", "");
            var provinsi = p.PROVINSI.replace("Provinsi ", "");

            layer.bindPopup(`
                <table style="font-size: 13px;">
                    <tr><td><b>Kelurahan</b></td><td>: ${p.KELURAHAN}</td></tr>
                    <tr><td><b>Luas</b></td><td>: ${p.area_km2.toFixed(2)} km²</td></tr>
                    <tr><td><b>Kecamatan</b></td><td>: ${kecamatan}</td></tr>
                    <tr><td><b>Kota</b></td><td>: ${p.KABUPATEN.replace("Kota ", "")}</td></tr>
                    <tr><td><b>Provinsi</b></td><td>: ${provinsi}</td></tr>
                </table>
            `);
        }

    }).addTo(map);

    map.fitBounds(defaultLayer.getBounds());
});

// ===================== //
// LEVEL 1 MAP
// ===================== //
function loadLevel1Map() {

    level1LabelLayer.clearLayers();
    level1LabelLayer.addTo(map);

    fetch('Data/(v3)_Level_1_Analysis.geojson')
    .then(res => res.json())
    .then(data => {

        level1Data = data; // SIMPAN UNTUK TABEL

        level1Layer = L.geoJSON(data, {
            style: styleLevel1,

            onEachFeature: function (feature, layer) {

                var p = feature.properties;
                var rank = p.Lvl1Rank;

                layer.bindPopup(`
                    Kelurahan: <b>${p.KELURAHAN}</b><br>
                    Rank: ${p.Lvl1Rank}<br>
                    Score: ${p.Lvl1Score}
                `);

                if (rank <= 10) {

                    var center = layer.getBounds().getCenter();

                    var label = L.marker(center, {
                        icon: L.divIcon({
                            className: 'rank-label',
                            html: `<b>${rank}</b>`,
                            iconSize: [30, 30],
                            iconAnchor: [15, 15]
                        })
                    });

                    label.addTo(level1LabelLayer);
                }
            }

        }).addTo(map);

        map.fitBounds(level1Layer.getBounds());

        // UPDATE SIDEBAR SETELAH DATA READY
        renderLevel1Sidebar();
    });
}