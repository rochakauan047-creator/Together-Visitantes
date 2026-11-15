
'use strict';

/* ==================================================
   TOGETHER — CONFIGURAÇÃO DO MAPA
================================================== */

/* SETORES DISPONÍVEIS */

const MAP_AREAS = {
    'laranja-3': {
        group: 'laranja',
        name: 'Área Laranja',
        sector: 'Setor 3'
    },

    'laranja-4': {
        group: 'laranja',
        name: 'Área Laranja',
        sector: 'Setor 4'
    },

    'vermelho-1': {
        group: 'vermelho',
        name: 'Área Vermelha',
        sector: 'Setor 1'
    },

    'vermelho-2': {
        group: 'vermelho',
        name: 'Área Vermelha',
        sector: 'Setor 2'
    },

    'amarelo-5': {
        group: 'amarelo',
        name: 'Área Amarela',
        sector: 'Setor 5'
    },

    'amarelo-6': {
        group: 'amarelo',
        name: 'Área Amarela',
        sector: 'Setor 6'
    },

    'azul-7': {
        group: 'azul',
        name: 'Área Azul',
        sector: 'Setor 7'
    },

    'azul-8': {
        group: 'azul',
        name: 'Área Azul',
        sector: 'Setor 8'
    }
};


/* ==================================================
   PAVIMENTOS DISPONÍVEIS
================================================== */

const MAP_LEVELS = {
    laranja: [
        { id: 'terreo', name: 'Térreo' },
        { id: 'subsolo-2', name: '2º Subsolo' },
        { id: 'subsolo-3', name: '3º Subsolo' },
        { id: 'subsolo-4', name: '4º Subsolo' }
    ],

    vermelho: [
        { id: 'terreo', name: 'Térreo' },
        { id: 'subsolo-2', name: '2º Subsolo' },
        { id: 'subsolo-3', name: '3º Subsolo' },
        { id: 'subsolo-4', name: '4º Subsolo' }
    ],

    amarelo: [
        { id: 'terreo', name: 'Térreo' },
        { id: 'subsolo-2', name: '2º Subsolo' },
        { id: 'subsolo-3', name: '3º Subsolo' },
        { id: 'subsolo-4', name: '4º Subsolo' }
    ],

    azul: [
        { id: 'terreo', name: 'Térreo' },
        { id: 'subsolo-2', name: '2º Subsolo' },
        { id: 'subsolo-3', name: '3º Subsolo' },
        { id: 'subsolo-4', name: '4º Subsolo' }
    ]
};


/* ==================================================
   ESTADO ATUAL
================================================== */

let selectedMapArea = '';
let selectedMapFloor = '';


/* ==================================================
   ELEMENTOS DO MAPA
================================================== */

function getMapZones() {
    return document.querySelectorAll(
        '.arena-map-overlay [data-map-area]'
    );
}


/* ==================================================
   ATUALIZAR DESTAQUE VISUAL
================================================== */

function updateMapHighlight(areaId) {
    getMapZones().forEach(element => {
        const isSelected = element.dataset.mapArea === areaId;

        element.classList.remove('map-area-selected');

        element.setAttribute(
            'aria-pressed',
            String(isSelected)
        );

        if (isSelected) {
            // Reinicia a animação de seleção.
            void element.getBoundingClientRect();

            element.classList.add('map-area-selected');
        }
    });
}


/* ==================================================
   SELECIONAR SETOR
================================================== */

function selectMapArea(areaId) {
    const area = MAP_AREAS[areaId];

    if (!area) {
        console.warn('[TOGETHER] Setor não encontrado:', areaId);
        return;
    }

    selectedMapArea = areaId;
    selectedMapFloor = '';

    // Atualiza o destaque no mapa.
    updateMapHighlight(areaId);

    // Atualiza o título dos pavimentos.
    const floorTitle = document.getElementById('mapFloorTitle');
    const floorContainer = document.getElementById('mapFloorOptions');

    if (floorTitle) {
        floorTitle.textContent =
            `${area.sector} — ${area.name}: escolha o pavimento`;
    }

    // Gera as opções de pavimento.
    if (floorContainer) {
        const floors = MAP_LEVELS[area.group] || [];

        floorContainer.innerHTML = floors.map(floor => `
            <button
                type="button"
                class="floor-option"
                data-floor="${floor.id}">
                ${floor.name}
            </button>
        `).join('');

        floorContainer.classList.remove('hidden');
    }

    // Atualiza o indicador de seleção.
    const badge = document.getElementById('selectedSectorBadge');

    if (badge) {
        badge.textContent = `${area.sector} — escolha o pavimento`;
    }

    // Limpa a localização anterior.
    const locationInput = document.getElementById('locationInput');

    if (locationInput) {
        locationInput.value = '';
    }

    // Limpa os dados anteriores do app.js.
    if (typeof selectedSectorCode !== 'undefined') {
        selectedSectorCode = '';
    }

    if (typeof selectedSectorName !== 'undefined') {
        selectedSectorName = '';
    }
}


/* ==================================================
   SELECIONAR PAVIMENTO
================================================== */

function selectMapFloor(floorId) {
    if (!selectedMapArea) {
        return;
    }

    const area = MAP_AREAS[selectedMapArea];
    const floors = MAP_LEVELS[area.group] || [];

    const floor = floors.find(item => item.id === floorId);

    if (!floor) {
        console.warn('[TOGETHER] Pavimento não encontrado:', floorId);
        return;
    }

    selectedMapFloor = floorId;

    // Atualiza os botões.
    document.querySelectorAll('.floor-option').forEach(button => {
        const isActive = button.dataset.floor === floorId;

        button.classList.toggle('active', isActive);
        button.setAttribute('aria-pressed', String(isActive));
    });

    // Monta a localização completa.
    const location =
        `${area.sector} — ${area.name} — ${floor.name}`;

    // Atualiza o indicador.
    const badge = document.getElementById('selectedSectorBadge');

    if (badge) {
        badge.textContent = location;
    }

    // Atualiza o campo de localização.
    const locationInput = document.getElementById('locationInput');

    if (locationInput) {
        locationInput.value = location;
    }

    // Compatibilidade com o app.js.
    if (typeof selectedSectorCode !== 'undefined') {
        selectedSectorCode =
            `${selectedMapArea.toUpperCase()}_${floor.id.toUpperCase()}`;
    }

    if (typeof selectedSectorName !== 'undefined') {
        selectedSectorName = location;
    }
}


/* ==================================================
   LIMPAR SELEÇÃO
================================================== */

function resetMapSelection() {
    selectedMapArea = '';
    selectedMapFloor = '';

    // Remove o destaque de todos os setores.
    getMapZones().forEach(element => {
        element.classList.remove('map-area-selected');

        element.setAttribute('aria-pressed', 'false');
    });

    // Limpa os pavimentos.
    const floorContainer = document.getElementById('mapFloorOptions');
    const floorTitle = document.getElementById('mapFloorTitle');
    const badge = document.getElementById('selectedSectorBadge');
    const locationInput = document.getElementById('locationInput');

    if (floorContainer) {
        floorContainer.innerHTML = '';
        floorContainer.classList.add('hidden');
    }

    if (floorTitle) {
        floorTitle.textContent = '03. Escolha uma área primeiro';
    }

    if (badge) {
        badge.textContent = 'Nenhum setor selecionado';
    }

    if (locationInput) {
        locationInput.value = '';
    }

    // Limpa os dados do app.js.
    if (typeof selectedSectorCode !== 'undefined') {
        selectedSectorCode = '';
    }

    if (typeof selectedSectorName !== 'undefined') {
        selectedSectorName = '';
    }
}


/* ==================================================
   EVENTOS DO MAPA
================================================== */

function initializeMap() {
    const zones = getMapZones();

    if (!zones.length) {
        console.warn('[TOGETHER] Nenhum setor do mapa foi encontrado.');
        return;
    }

    zones.forEach(element => {
        const areaId = element.dataset.mapArea;

        // Configura acessibilidade.
        element.setAttribute('role', 'button');
        element.setAttribute('tabindex', '0');
        element.setAttribute('aria-pressed', 'false');

        const area = MAP_AREAS[areaId];

        if (area) {
            element.setAttribute(
                'aria-label',
                `${area.name}, ${area.sector}`
            );
        }

        // Clique ou toque.
        element.addEventListener('click', () => {
            selectMapArea(areaId);
        });

        // Navegação pelo teclado.
        element.addEventListener('keydown', event => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                selectMapArea(areaId);
            }
        });
    });

    console.log(
        `[TOGETHER] Mapa inicializado: ${zones.length} setores encontrados.`
    );
}


/* ==================================================
   EVENTOS DOS PAVIMENTOS
================================================== */

function initializeFloorOptions() {
    const floorContainer = document.getElementById('mapFloorOptions');

    if (!floorContainer) {
        return;
    }

    floorContainer.addEventListener('click', event => {
        const button = event.target.closest('.floor-option');

        if (!button || !floorContainer.contains(button)) {
            return;
        }

        selectMapFloor(button.dataset.floor);
    });
}


/* ==================================================
   INICIALIZAÇÃO
================================================== */

function initializeTogetherMap() {
    initializeMap();
    initializeFloorOptions();
}

if (document.readyState === 'loading') {
    document.addEventListener(
        'DOMContentLoaded',
        initializeTogetherMap,
        { once: true }
    );
} else {
    initializeTogetherMap();
}


/* ==================================================
   FUNÇÕES DISPONÍVEIS PARA O HTML
================================================== */

window.selectMapArea = selectMapArea;
window.selectMapFloor = selectMapFloor;
window.resetMapSelection = resetMapSelection;
window.selectedMapArea = selectedMapArea;
