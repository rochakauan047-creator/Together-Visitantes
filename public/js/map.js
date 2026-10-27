
/* =========================================
   TOGETHER-VISITANTES
   Seleção de setores do mapa da Arena
   ========================================= */

function selectSector(code, name) {
    const badge = document.getElementById('selectedSectorBadge');
    const locationInput = document.getElementById('locationInput');

    // Verifica se os elementos necessários existem.
    if (!badge || !locationInput) {
        console.error('Não foi possível encontrar os campos de localização.');
        return;
    }

    // Remove o destaque anterior.
    document.querySelectorAll('.map-sector').forEach(sector => {
        sector.classList.remove('active');
    });

    // Destaca todos os elementos associados ao setor selecionado.
    const matchedSectors = document.querySelectorAll(
        `[id^="sector-${code}"]`
    );

    matchedSectors.forEach(sector => {
        sector.classList.add('active');
    });

    // Atualiza o setor selecionado.
    selectedSectorCode = code;
    selectedSectorName = name;

    // Atualiza os campos da interface.
    badge.textContent = `Setor ${code} selecionado`;
    locationInput.value = name;

    console.log('Setor selecionado:', code, name);
}
