function selectSector(code, name) {
            // Highlight selected sector SVG
            document.querySelectorAll('.map-sector').forEach(el => el.classList.remove('active'));
            
            // Highlight all elements belonging to code (e.g. P3 has two paths)
            const matchedSectors = document.querySelectorAll(`[id^="sector-${code}"]`);
            matchedSectors.forEach(el => el.classList.add('active'));

            selectedSectorCode = code;
            selectedSectorName = name;

            // Update UI & Input
            document.getElementById('selectedSectorBadge').innerText = `Setor ${code} Selecionado`;
            document.getElementById('locationInput').value = `${name}`;
        }
