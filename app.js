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
    position: 'bottomright'
}).addTo(map);

// ===================== //
// GLOBAL VARIABLE
// ===================== //
var defaultLayer;
var level1Layer;
var level1LabelLayer = L.layerGroup();
var level1Data = null;
var level1FeatureMap = {};   // 🔥 mapping kelurahan → layer

// ===================== //
// HOME BUTTON
// ===================== //
function goHome() {
    map.setView([-7.5590, 110.8189], 13);
}

// ===================== //
// RESET BUTTON
// ===================== //
function goDefault() {

    if (level1Layer) map.removeLayer(level1Layer);
    level1LabelLayer.clearLayers();

    if (defaultLayer) map.addLayer(defaultLayer);

    document.getElementById("sidebar").style.display = "none";

    document.querySelectorAll(".nav-btn")
        .forEach(btn => btn.classList.remove("active"));

    map.setView([-7.5590, 110.8189], 13);
}

// ===================== //
// COLOR FUNCTION
// ===================== //
function getColor(rank) {
    const colors = [
        "#08306b","#08519c","#2171b5","#4292c6","#6baed6",
        "#9ecae1","#c6dbef","#deebf7","#f7fbff","#e3f2fd"
    ];
    return colors[rank-1] || null;
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

    // RESET
    if (defaultLayer) map.removeLayer(defaultLayer);
    if (level1Layer) map.removeLayer(level1Layer);
    level1LabelLayer.clearLayers();

    if (level === 1) {
        loadLevel1Map();
    } 
    else if (level === 2) {
        renderLevel2Sidebar();
    } 
    else if (level === 3) {
        renderLevel3Sidebar();
    }
}

// ===================== //
// SIDEBAR LEVEL 1
// ===================== //
function renderLevel1Sidebar() {

    if (!level1Data) return;

    let sorted = [...level1Data.features].sort((a, b) =>
        (a.properties.Lvl1Rank || 999) - (b.properties.Lvl1Rank || 999)
    );

    let html = `
        <h3>Level 1 Analysis</h3>

        <div class="table-container">
        <table class="data-table">
            <tr>
                <th class="sticky-col">Kelurahan</th>
                <th>Rank</th>
                <th>Score</th>
                <th>Crash</th>
                <th>School</th>
                <th>Population (%)</th>
                <th>Area</th>
                <th>Income</th>
            </tr>
    `;

    sorted.forEach(f => {

        let p = f.properties;
        let pop = (p.PopScore * 100).toFixed(2) + "%";

        let highlight = (p.Lvl1Rank <= 10) ? "#e3f2fd" : "";

        html += `
            <tr style="background:${highlight}; cursor:pointer;"
                onclick="zoomToKelurahan('${p.KELURAHAN}')">
                <td class="sticky-col">${p.KELURAHAN}</td>
                <td>${p.Lvl1Rank}</td>
                <td>${p.Lvl1Score}</td>
                <td>${p.CrashScore}</td>
                <td>${p.SchoolScor}</td>
                <td>${pop}</td>
                <td>${p.AreaScore}</td>
                <td>${p.IncomeScor}</td>
            </tr>
        `;
    });

    html += `</table></div>`;

    document.getElementById("sidebar").innerHTML = html;
}

// ===================== //
// SIDEBAR OTHER
// ===================== //
function renderLevel2Sidebar() {
    document.getElementById("sidebar").innerHTML =
        "<h3>Level 2 Analysis</h3><p>Under Construction</p>";
}

function renderLevel3Sidebar() {
    document.getElementById("sidebar").innerHTML =
        "<h3>Level 3 Analysis</h3><p>Waiting for Data</p>";
}

// ===================== //
// DEFAULT MAP
// ===================== //
fetch('Data/solo_kelurahan_adm.geojson')
.then(res => res.json())
.then(data => {

    defaultLayer = L.geoJSON(data, {

        // ========================= //
        // 🎨 STYLE AWAL
        // ========================= //
        style: function () {
            return {
                color: "#3388ff",
                weight: 1,
                fillOpacity: 0.2
            };
        },

        // ========================= //
        // 🔍 INTERAKSI FEATURE
        // ========================= //
        onEachFeature: function (feature, layer) {

            var p = feature.properties;

            // ========================= //
            // 🔥 POPUP
            // ========================= //
            layer.bindPopup(`
                <b>Kelurahan ${p.KELURAHAN || "-"}</b><br>
                ${p.KECAMATAN || "-"}<br>
                ${p.KABUPATEN || "-"}<br>
                Luas: ${p.area_km2 ? p.area_km2.toFixed(2) : "-"} km²
            `);

            // ========================= //
            // ✨ HOVER EFFECT
            // ========================= //

            layer.on('mouseover', function () {
                layer.setStyle({
                    weight: 3,
                    color: '#ff7800',
                    fillOpacity: 0.3
                });

                layer.bringToFront();
            });

            layer.on('mouseout', function () {
                defaultLayer.resetStyle(layer);
            });

        }

    }).addTo(map);

    // ========================= //
    // 🔍 ZOOM KE EXTENT
    // ========================= //
    map.fitBounds(defaultLayer.getBounds());
});
// ===================== //
// LEVEL 1 MAP
// ===================== //
function loadLevel1Map() {

    // 🔹 Reset label layer
    level1LabelLayer.clearLayers();
    level1LabelLayer.addTo(map);

    fetch('Data/(v3)_Level_1_Analysis.geojson')
    .then(res => res.json())
    .then(data => {

        level1Data = data;

        level1Layer = L.geoJSON(data, {

            style: styleLevel1,

            onEachFeature: function (feature, layer) {

                let p = feature.properties;
                let rank = p.Lvl1Rank;

                // 🔥 simpan layer berdasarkan nama kelurahan
                level1FeatureMap[p.KELURAHAN] = layer;

                // ========================= //
                // 🔥 POPUP (WAJIB)
                // ========================= //
                layer.bindPopup(`
                    <b>Kelurahan ${p.KELURAHAN}</b><br>
                    ${p.KECAMATAN || "-"}<br>
                    <b> Level 1</b> Rank: ${p.Lvl1Rank}<br>
                    <b>Level 1</b> Score: ${p.Lvl1Score}<br>
                `);

                // ========================= //
                // 🔵 LABEL TOP 10
                // ========================= //
                if (rank <= 10) {

                    let center = layer.getBounds().getCenter();

                    let label = L.marker(center, {
                        icon: L.divIcon({
                            className: 'rank-label',
                            html: `<b>${rank}</b>`,
                            iconSize: [30,30],
                            iconAnchor: [15,15]
                        })
                    });

                    label.addTo(level1LabelLayer);
                }

                // ========================= //
                // ✨ HOVER EFFECT (BONUS UX)
                // ========================= //
                layer.on('mouseover', function () {
                    layer.setStyle({
                        weight: 3,
                        color: '#ff7800'
                    });
                });

                layer.on('mouseout', function () {
                    level1Layer.resetStyle(layer);
                });
            }

        }).addTo(map);

        // 🔹 Zoom ke extent Level 1
        map.fitBounds(level1Layer.getBounds());

        // 🔹 Update sidebar
        renderLevel1Sidebar();
    });
}


// ========================= //
// ZOOM TO KELURAHAN TABLE SIDEBAR
// ========================= //
function zoomToKelurahan(namaKelurahan) {

    let layer = level1FeatureMap[namaKelurahan];

    if (!layer) return;

    // 🔍 zoom ke polygon
    map.fitBounds(layer.getBounds());

    // 🔥 highlight sementara
    layer.setStyle({
        color: '#ff0000',
        weight: 8
    });

    // 🔁 balik normal
    setTimeout(() => {
        level1Layer.resetStyle(layer);
    }, 1500);

    // 🔥 buka popup
    layer.openPopup();
}