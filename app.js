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
var level2Layer;
var level2BoundaryLayer;
let selectedSchoolLayer = null;

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
    if (level2Layer) map.removeLayer(level2Layer); // 🔥 TAMBAH INI

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

    // =====================
    // BUTTON ACTIVE STYLE
    // =====================
    document.querySelectorAll(".nav-btn")
        .forEach(btn => btn.classList.remove("active"));

    event.target.classList.add("active");

    // =====================
    // SHOW SIDEBAR
    // =====================
    document.getElementById("sidebar").style.display = "block";

    // =====================
    // REMOVE SEMUA LAYER
    // =====================
    if (defaultLayer) map.removeLayer(defaultLayer);

    if (level1Layer) map.removeLayer(level1Layer);

    if (level1LabelLayer) {
        level1LabelLayer.clearLayers();
        map.removeLayer(level1LabelLayer);
    }

    if (level2Layer) map.removeLayer(level2Layer);

    // =====================
    // SWITCH LEVEL
    // =====================
    if (level === 1) {
        loadLevel1Map();
    } 
    else if (level === 2) {
        loadLevel2Map();   // cukup ini saja
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
                <th>Level 1 Rank</th>
                <th>Level 1 Score</th>
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
// SIDEBAR LEVEL 2
// ===================== //
function renderLevel2Sidebar() {

    if (!level2Data) return;

    // 🔥 sort berdasarkan rank
    let sorted = [...level2Data.features].sort((a, b) =>
        (a.properties.Lvl2_Rank || 999) - (b.properties.Lvl2_Rank || 999)
    );

    let html = `
        <h3>Level 2 Analysis</h3>

        <div class="table-container">
        <table class="data-table">
            <tr>
                <th class="sticky-col">School</th>
                <th>Level 2 Rank</th>
                <th>Level 2 Score</th>
                <th>Severity Score</th>
                <th>Number of Student</th>
                <th>School Road Type</th>
                <th>Km of Major Road</th>
                <th>Number of Intersection</th>
                <th>Number of Transit</th>
            </tr>
    `;

    sorted.forEach(f => {

        let p = f.properties;
        let coord = f.geometry.coordinates;

        let lng = coord[0];
        let lat = coord[1];

        // 🔥 highlight rank tinggi
        let highlight =
            p.Lvl2_Rank <= 10 ? "#ffe5e5" :
            p.Lvl2_Rank <= 30 ? "#fff7cc" :
            "";

        html += `
            <tr style="background:${highlight}; cursor:pointer;"
                onclick="selectSchool(${lat}, ${lng})">
                <td class="sticky-col">${p.School_Name || p.School_Nam || "-"}</td>
                <td>${p.Lvl2_Rank}</td>
                <td>${p.Lvl2_Score}</td>
                <td>${p.Severity}</td>
                <td>${p.Student}</td>
                <td>${p.SR_Type}</td>
                <td>${p.Km_major ? p.Km_major.toFixed(2) : "-"}</td>
                <td>${p.Intersect}</td>
                <td>${p.Transit}</td>
            </tr>
        `;
    });

    html += `</table></div>`;

    document.getElementById("sidebar").innerHTML = html;
}

// ===================== //
// SIDEBAR OTHER
// ===================== //
function renderLevel3Sidebar() {
    document.getElementById("sidebar").innerHTML =
        "<h3>Level 3 Analysis</h3><p>Waiting for Data Confirmation</p>";
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

// ===================== //
// LEVEL 2 MAP (REFINED)
// ===================== //
function loadLevel2Map() {

    // 🔥 REMOVE SEMUA LAYER SEBELUMNYA
    if (defaultLayer) map.removeLayer(defaultLayer);
    if (level1Layer) map.removeLayer(level1Layer);
    if (level1LabelLayer) map.removeLayer(level1LabelLayer);
    if (level2Layer) map.removeLayer(level2Layer);
    if (level2BoundaryLayer) map.removeLayer(level2BoundaryLayer);

    // 🔥 LOAD DATA BERSAMAAN
    Promise.all([
        fetch('Data/solo_kelurahan_adm.geojson').then(res => res.json()),
        fetch('Data/(v3_FINAL)_Level_2_School_Analysis.geojson').then(res => res.json())
    ])
    .then(([boundaryData, schoolData]) => {

        // ===================== //
        // 1. KELURAHAN BOUNDARY
        // ===================== //
        level2BoundaryLayer = L.geoJSON(boundaryData, {
            style: {
                color: "#000",
                weight: 1.5,
                fillOpacity: 0
            }
        }).addTo(map);

        level2BoundaryLayer.bringToBack();


        // ===================== //
        // 2. SIMPAN DATA (WAJIB)
        // ===================== //
        level2Data = schoolData;


        // ===================== //
        // 3. SCHOOL POINTS
        // ===================== //
        level2Layer = L.geoJSON(schoolData, {

            // 🎨 STYLE
            pointToLayer: function (feature, latlng) {

                let rank = feature.properties.Lvl2_Rank;

                let color =
                    rank === 1 ? "#8b0000" :
                    rank === 2 ? "#e31a1c" :
                    rank === 3 ? "#fb6a4a" :
                    rank <= 10 ? "#fd8d3c" :
                    rank <= 30 ? "#fed976" :
                    "#31a354";

                let radius =
                    rank === 1 ? 9 :
                    rank === 2 ? 8 :
                    rank === 3 ? 7 :
                    rank <= 10 ? 6 :
                    rank <= 30 ? 5 :
                    4;

                return L.circleMarker(latlng, {
                    radius: radius,
                    fillColor: color,
                    color: "#222",
                    weight: 1,
                    fillOpacity: 0.9
                });
            },

            // ===================== //
            // INTERACTION
            // ===================== //
            onEachFeature: function (feature, layer) {

                let p = feature.properties;

                // 🔹 TOOLTIP (HOVER)
                layer.bindTooltip(`
                    <b>${p.School_Name || p.School_Nam || "Sekolah"}</b><br><br>
                    Rank: <b>${p.Lvl2_Rank}</b><br>
                    Score: <b>${p.Lvl2_Score}</b><br><br>
                    ${p.KELURAHAN}<br>
                    ${p.KECAMATAN}
                `, {
                    direction: "top",
                    offset: [0, -5],
                    opacity: 0.9
                });

                // 🔹 HOVER EFFECT
                layer.on({
                    mouseover: function(e) {
                        e.target.setStyle({
                            weight: 2,
                            color: "#000",
                            fillOpacity: 1
                        });
                    },
                    mouseout: function(e) {
                        level2Layer.resetStyle(e.target);
                    }
                });

                // 🔹 POPUP DETAIL
                layer.bindPopup(`
                    <b>${p.School_Name || p.School_Nam || "Sekolah"}</b><br><br>

                    <b>Rank:</b> ${p.Lvl2_Rank}<br>
                    <b>Score:</b> ${p.Lvl2_Score}<br><br>

                    Kelurahan ${p.KELURAHAN}, ${p.KECAMATAN}<br><br>

                    <b>Severity:</b> ${p.Severity ?? "-"}<br>
                    <b>Intersect:</b> ${p.Intersect ?? "-"}<br>
                    <b>Transit:</b> ${p.Transit ?? "-"}<br>
                    <b>Student:</b> ${p.Student ?? "-"}<br>
                    <b>Km of Major Road:</b> ${p.Km_major ? Number(p.Km_major).toFixed(2) : "-"} km<br>
                    <b>Road Type:</b> ${p.SR_Type ?? "-"}
                `);
            }

        }).addTo(map);


        // ===================== //
        // 4. SET VIEW
        // ===================== //
        map.setView([-7.5590, 110.8189], 13);


        // ===================== //
        // 5. SIDEBAR (TERAKHIR)
        // ===================== //
        renderLevel2Sidebar();

    })
    .catch(err => {
        console.error("Error loading Level 2 data:", err);
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
    }, 15000);

    // 🔥 buka popup
    layer.openPopup();
}

// ===================== //
// ZOOM TO SCHOOL TABLE SIDEBAR
// ===================== //
function zoomToSchool(lat, lng) {
    map.setView([lat, lng], 17); // zoom lebih dekat dari kelurahan
}

// ===================== //
// SELECT SCHOOL (HIGHLIGHT)
// ===================== //
function selectSchool(lat, lng) {

    if (!level2Layer) return;

    level2Layer.eachLayer(function(layer) {

        let coord = layer.getLatLng();

        if (coord.lat === lat && coord.lng === lng) {

            // 🔥 reset sebelumnya
            if (selectedSchoolLayer) {
                level2Layer.resetStyle(selectedSchoolLayer);
            }

            // 🔥 highlight baru
            layer.setStyle({
                color: "#00ffff",   // outline cyan (stand out)
                weight: 3,
                fillOpacity: 1
            });

            layer.bringToFront();

            selectedSchoolLayer = layer;

            // 🔥 zoom
            map.setView([lat, lng], 17);

            // ⏱️ AUTO RESET (optional)
            setTimeout(() => {
                if (selectedSchoolLayer) {
                    level2Layer.resetStyle(selectedSchoolLayer);
                    selectedSchoolLayer = null;
                }
            }, 15000);
        }
    });
}
