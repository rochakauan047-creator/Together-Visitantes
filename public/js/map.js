
'use strict';

const MAP_LEVELS = {
    vermelho: {
        name: 'Área Vermelha',
        color: '#e11d48',
        floors: [
            { id: 'terreo', name: 'Térreo' },
            { id: 'subsolo-2', name: '2º Subsolo' },
            { id: 'subsolo-3', name: '3º Subsolo' },
            { id: 'subsolo-4', name: '4º Subsolo' }
        ]
    },

    roxo: {
        name: 'Área Roxa',
        color: '#9333ea',
        floors: [
            { id: 'terreo', name: 'Térreo' },
            { id: 'subsolo-2', name: '2º Subsolo' },
            { id: 'subsolo-3', name: '3º Subsolo' },
            { id: 'subsolo-4', name: '4º Subsolo' }
        ]
    },

    laranja: {
        name: 'Área Laranja',
        color: '#f97316',
        floors: [
            { id: 'terreo', name: 'Térreo' },
            { id: 'subsolo-2', name: '2º Subsolo' }
        ]
    }
};

let selectedMapArea = '';
let selectedMapFloor = '';

function selectMapArea(area) {
    const config = MAP_LEVELS[area];

    if (!config) return;

    selectedMapArea = area;
    selectedMapFloor = '';

    document.querySelectorAll('[data-map-area]').forEach(element => {
        const selected = element.dataset.mapArea === area;

        element.classList.toggle('map-area-selected', selected);
        element.setAttribute('aria-pressed', String(selected));
    });

    const floorContainer = document.getElementById('mapFloorOptions');
    const floorTitle = document.getElementById('mapFloorTitle');

    if (!floorContainer || !floorTitle) return;

    floorTitle.textContent = `Pavimentos — ${config.name}`;

    floorContainer.innerHTML = config.floors.map(floor => `
        <button
            type="button"
            class="floor-option"
            data-floor="${floor.id}"
            onclick="selectMapFloor('${floor.id}')">
            ${floor.name}
        </button>
    `).join('');

    floorContainer.classList.remove('hidden');

    updateMapSelection();
}

function selectMapFloor(floorId) {
    if (!selectedMapArea) return;

    const config = MAP_LEVELS[selectedMapArea];

    const floor = config.floors.find(item => item.id === floorId);

    if (!floor) return;

    selectedMapFloor = floorId;

    document.querySelectorAll('.floor-option').forEach(button => {
        button.classList.toggle(
            'active',
            button.dataset.floor === floorId
        );
    });

    updateMapSelection();
}

function updateMapSelection() {
    const area = MAP_LEVELS[selectedMapArea];

    if (!area) return;

    const floor = area.floors.find(
        item => item.id === selectedMapFloor
    );

    const badge = document.getElementById('selectedSectorBadge');
    const locationInput = document.getElementById('locationInput');

    if (!floor) {
        if (badge) {
            badge.textContent = `${area.name} — escolha o pavimento`;
        }

        if (locationInput) {
            locationInput.value = '';
        }

        return;
    }

    const location = `${area.name} — ${floor.name}`;

    if (badge) {
        badge.textContent = location;
    }

    if (locationInput) {
        locationInput.value = location;
    }

    // Mantém compatibilidade com o app.js existente.
    if (typeof selectedSectorCode !== 'undefined') {
        selectedSectorCode =
            `${selectedMapArea.toUpperCase()}_${floor.id.toUpperCase()}`;
    }

    if (typeof selectedSectorName !== 'undefined') {
        selectedSectorName = location;
    }
}

function selectSector(code, name) {
    // Compatibilidade com seleções antigas.
    const badge = document.getElementById('selectedSectorBadge');
    const input = document.getElementById('locationInput');

    if (badge) badge.textContent = name;
    if (input) input.value = name;

    if (typeof selectedSectorCode !== 'undefined') {
        selectedSectorCode = code;
    }

    if (typeof selectedSectorName !== 'undefined') {
        selectedSectorName = name;
    }
}

function resetMapSelection() {
    selectedMapArea = '';
    selectedMapFloor = '';

    document.querySelectorAll('[data-map-area]').forEach(element => {
        element.classList.remove('map-area-selected');
        element.setAttribute('aria-pressed', 'false');
    });

    const floors = document.getElementById('mapFloorOptions');

    if (floors) {
        floors.innerHTML = '';
        floors.classList.add('hidden');
    }

    const badge = document.getElementById('selectedSectorBadge');
    const input = document.getElementById('locationInput');

    if (badge) badge.textContent = 'Nenhum setor selecionado';
    if (input) input.value = '';
}

window.selectMapArea = selectMapArea;
window.selectMapFloor = selectMapFloor;
window.selectSector = selectSector;
window.resetMapSelection = resetMapSelection;
