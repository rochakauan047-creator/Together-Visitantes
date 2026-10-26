// ==========================================
        // 1. FIREBASE CONFIGURATION & INITIALIZATION
        // ==========================================


        // Application State Variables
        let selectedSectorCode = '';
        let selectedSectorName = '';
        let currentStaffUser = JSON.parse(sessionStorage.getItem('arena_staff_user')) || null;
        let currentFilter = 'all';
        let rawOccurrences = [];

        // Initialize Lucide Icons
        lucide.createIcons();

        // ==========================================
        // 2. NAVIGATION & TAB SWITCHING
        // ==========================================

function switchTab(tab) {
    const abas = {
        visitor: document.getElementById('tabVisitor'),
        staff: document.getElementById('tabStaff'),
        admin: document.getElementById('tabAdmin')
    };

    if (!abas[tab]) {
        console.error('Aba não encontrada:', tab);
        return;
    }

    Object.values(abas).forEach(aba => {
        aba.classList.add('hidden');
    });

    abas[tab].classList.remove('hidden');

    if (tab === 'staff') {
        checkStaffSession();
    }

    if (tab === 'admin') {
        checkAdminSession();
    }

    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

        // ==========================================
        // 4. VISITOR FORM SUBMISSION
        // ==========================================
        async function submitOccurrence(e) {
            e.preventDefault();
            const btn = document.getElementById('submitBtn');
            const categoryEl = document.querySelector('input[name="category"]:checked');
            const locationVal = document.getElementById('locationInput').value;
            const descriptionVal = document.getElementById('descriptionInput').value;

            if (!categoryEl) {
                alert('Por favor, selecione uma categoria para o problema.');
                return;
            }

            if (!locationVal) {
                alert('Por favor, toque no mapa para definir o setor da ocorrência.');
                return;
            }

            btn.disabled = true;
            btn.innerHTML = `<i data-lucide="loader" class="w-5 h-5 animate-spin"></i> <span>Enviando...</span>`;
            lucide.createIcons();

            try {
                await db.collection('occurrences').add({
                    category: categoryEl.value,
                    sectorCode: selectedSectorCode || 'GERAL',
                    location: locationVal,
                    description: descriptionVal,
                    status: 'open',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    history: [{
                        action: 'Ocorrência criada pelo visitante',
                        timestamp: new Date().toISOString()
                    }]
                });

                alert('✅ Ocorrência registrada com sucesso! A equipe técnica já recebeu seu chamado.');
                document.getElementById('visitorForm').reset();
                document.getElementById('selectedSectorBadge').innerText = 'Nenhum setor selecionado';
                document.querySelectorAll('.map-sector').forEach(el => el.classList.remove('active'));
                selectedSectorCode = '';
                selectedSectorName = '';

            } catch (error) {
                console.error("Erro ao salvar no Firestore:", error);
                alert('Ocorreu um erro ao enviar a ocorrência. Tente novamente.');
            } finally {
                btn.disabled = false;
                btn.innerHTML = `<i data-lucide="send" class="w-5 h-5"></i> <span>Registrar Ocorrência Agora</span>`;
                lucide.createIcons();
            }
        }

        // ==========================================
        // 5. STAFF MAINTENANCE AUTH & REALTIME PANEL
        // ==========================================
        function checkStaffSession() {
            if (currentStaffUser) {
                document.getElementById('staffAuthBox').classList.add('hidden');
                document.getElementById('staffDashboard').classList.remove('hidden');
                document.getElementById('staffDisplayName').innerText = currentStaffUser.name;
                document.getElementById('staffAvatar').innerText = currentStaffUser.name.charAt(0).toUpperCase();
                listenToOccurrences();
            } else {
                document.getElementById('staffAuthBox').classList.remove('hidden');
                document.getElementById('staffDashboard').classList.add('hidden');
            }
        }

    
async function handleStaffLogin(e) {
    e.preventDefault();

    const name = document.getElementById('staffNameInput').value.trim();
    const code = document.getElementById('staffCodeInput')
        .value.trim().toUpperCase();

    if (!name || name.length > 80 ||
        !/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/.test(code)) {
        alert('Informe seu nome e um código válido de 6 caracteres.');
        return;
    }

    try {
        const codeDoc = await db
            .collection('access_codes')
            .doc(code)
            .get();

        if (!codeDoc.exists) {
            alert('Código de acesso inválido ou não encontrado.');
            return;
        }

        const codeData = codeDoc.data();

        if (codeData.active !== true) {
            alert('Este código está desativado.');
            return;
        }

        if (!codeData.expiresAt ||
            codeData.expiresAt.toDate() <= new Date()) {
            alert('Este código de acesso expirou.');
            return;
        }

        currentStaffUser = {
            name: name,
            code: code
        };

        sessionStorage.setItem(
            'arena_staff_user',
            JSON.stringify(currentStaffUser)
        );

        checkStaffSession();

    } catch (err) {
        console.error('Erro no login da equipe:', err);
        alert('Erro ao validar código. Confira as regras do Firebase.');
    }
}


        function logoutStaff() {
            sessionStorage.removeItem('arena_staff_user');
            currentStaffUser = null;
            checkStaffSession();
        }

        // Realtime Firestore Listener for Staff Dashboard
        function listenToOccurrences() {
            db.collection('occurrences')
              .orderBy('createdAt', 'desc')
              .onSnapshot(snapshot => {
                  rawOccurrences = [];
                  snapshot.forEach(doc => {
                      rawOccurrences.push({ id: doc.id, ...doc.data() });
                  });
                  updateCounters();
                  renderStaffList();
              }, error => {
                  console.error("Erro no snapshot:", error);
              });
        }

        function updateCounters() {
            const openCount = rawOccurrences.filter(o => o.status === 'open').length;
            const progressCount = rawOccurrences.filter(o => o.status === 'progress').length;
            const doneCount = rawOccurrences.filter(o => o.status === 'done').length;

            document.getElementById('countOpen').innerText = openCount;
            document.getElementById('countProgress').innerText = progressCount;
            document.getElementById('countDone').innerText = doneCount;
        }

        function filterStaffList(status) {
            currentFilter = status;
            ['All', 'Open', 'Progress', 'Done'].forEach(s => {
                const el = document.getElementById(`filterBtn${s}`);
                if (s.toLowerCase() === status) {
                    el.className = "px-3 py-1.5 rounded-lg font-medium text-white bg-brand-600 transition-all";
                } else {
                    el.className = "px-3 py-1.5 rounded-lg font-medium text-slate-400 hover:text-white transition-all";
                }
            });
            renderStaffList();
        }

        function renderStaffList() {
            const container = document.getElementById('staffOccurrencesList');
            let filtered = rawOccurrences;

            if (currentFilter !== 'all') {
                filtered = rawOccurrences.filter(o => o.status === currentFilter);
            }

            if (filtered.length === 0) {
                container.innerHTML = `
                    <div class="text-center py-10 text-slate-500 text-sm">
                        Nenhuma ocorrência encontrada nesta categoria.
                    </div>`;
                return;
            }

            container.innerHTML = filtered.map(item => {
                const dateStr = item.createdAt ? new Date(item.createdAt.toDate()).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'Agora';

                let statusBadge = '';
                if (item.status === 'open') {
                    statusBadge = `<span class="px-2.5 py-1 text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-full">Em Aberto</span>`;
                } else if (item.status === 'progress') {
                    statusBadge = `<span class="px-2.5 py-1 text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded-full">Em Atendimento (${item.assignedTo || 'Técnico'})</span>`;
                } else {
                    statusBadge = `<span class="px-2.5 py-1 text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full">Finalizada por ${item.completedBy || 'Técnico'}</span>`;
                }

                let actionButtons = '';
                if (item.status === 'open') {
                    actionButtons = `
                        <button onclick="updateOccurrenceStatus('${item.id}', 'progress')" class="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-lg transition-all flex items-center space-x-1">
                            <i data-lucide="play" class="w-3.5 h-3.5"></i>
                            <span>Assumir Chamado</span>
                        </button>`;
                } else if (item.status === 'progress') {
                    actionButtons = `
                        <button onclick="updateOccurrenceStatus('${item.id}', 'done')" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-lg transition-all flex items-center space-x-1">
                            <i data-lucide="check" class="w-3.5 h-3.5"></i>
                            <span>Concluir Atendimento</span>
                        </button>`;
                }

                return `
                    <div class="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-700 transition-all">
                        <div class="space-y-1">
                            <div class="flex items-center space-x-2">
                                <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">${item.category}</span>
                                <span class="text-slate-600">•</span>
                                <span class="text-xs text-slate-500">${dateStr}</span>
                                ${statusBadge}
                            </div>
                            <h4 class="text-base font-bold text-white">${item.location}</h4>
                            <p class="text-sm text-slate-300">${item.description}</p>
                        </div>
                        <div class="flex items-center space-x-2 self-end md:self-center">
                            ${actionButtons}
                        </div>
                    </div>
                `;
            }).join('');

            lucide.createIcons();
        }

        async function updateOccurrenceStatus(id, newStatus) {
            if (!currentStaffUser) return;

            const updateData = {
                status: newStatus,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            if (newStatus === 'progress') {
                updateData.assignedTo = currentStaffUser.name;
                updateData.assignedAt = new Date().toISOString();
            } else if (newStatus === 'done') {
                updateData.completedBy = currentStaffUser.name;
                updateData.completedAt = new Date().toISOString();
            }

            try {
                await db.collection('occurrences').doc(id).update(updateData);
            } catch (err) {
                console.error("Erro ao atualizar ocorrência:", err);
                alert("Falha ao atualizar registro.");
            }
        }

        // ==========================================
        // 6. ADMIN AREA & CODE GENERATOR
        // ==========================================
        function checkAdminSession() {
            auth.onAuthStateChanged(user => {
                if (user) {
                    document.getElementById('adminAuthBox').classList.add('hidden');
                    document.getElementById('adminPanel').classList.remove('hidden');
                    document.getElementById('adminEmail').innerText = user.email || 'Administrador Autorizado';
                } else {
                    document.getElementById('adminAuthBox').classList.remove('hidden');
                    document.getElementById('adminPanel').classList.add('hidden');
                }
            });
        }

        async function loginAdminGoogle() {
            const provider = new firebase.auth.GoogleAuthProvider();
            try {
                await auth.signInWithPopup(provider);
                checkAdminSession();
            } catch (error) {
                console.error("Erro de login admin:", error);
                alert("Falha ao realizar login no Google: " + error.message);
            }
        }

        function logoutAdmin() {
            auth.signOut();
            checkAdminSession();
        }


async function generateAccessCode() {
    const botao = document.querySelector(
        'button[onclick="generateAccessCode()"]'
    );

    if (!auth.currentUser) {
        alert("Faça login como administrador primeiro.");
        return;
    }

    if (botao) botao.disabled = true;

    const caracteres = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    try {
        let codigo;
        let salvo = false;

        // Tenta gerar um código que ainda não exista.
        for (let tentativa = 0; tentativa < 10; tentativa++) {
            codigo = "";

            for (let i = 0; i < 6; i++) {
                codigo += caracteres[
                    Math.floor(Math.random() * caracteres.length)
                ];
            }

            const referencia = db.collection("access_codes").doc(codigo);
            const existente = await referencia.get();

            if (existente.exists) continue;

            const agora = new Date();
            const expiracao = new Date(
                agora.getTime() + 24 * 60 * 60 * 1000
            );

            await referencia.set({
                code: codigo,
                active: true,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                expiresAt: firebase.firestore.Timestamp.fromDate(expiracao),
                createdBy: auth.currentUser.email || "Administrador"
            });

            salvo = true;
            break;
        }

        if (!salvo) {
            throw new Error("Não foi possível gerar um código exclusivo.");
        }

        document.getElementById("codeDisplay").innerText = codigo;
        document.getElementById("generatedCodeBox").classList.remove("hidden");

        alert("Código gerado e salvo no Firebase!");

    } catch (erro) {
        console.error("Erro ao gerar código:", erro);
        alert("Não foi possível gerar o código. Confira as regras do Firestore.");
    } finally {
        if (botao) botao.disabled = false;
    }
}


        function copyGeneratedCode() {
            const codeText = document.getElementById('codeDisplay').innerText;
            const tempInput = document.createElement('input');
            tempInput.value = codeText;
            document.body.appendChild(tempInput);
            tempInput.select();
            document.execCommand('copy');
            document.body.removeChild(tempInput);
            alert(`Código ${codeText} copiado para a área de transferência!`);
        }
