
/* =====================================================
   TOGETHER-VISITANTES
   Arquivo: js/app.js
   Gerenciamento da aplicação, ocorrências e acessos
   ===================================================== */

'use strict';

// =====================================================
// 1. FIREBASE
// =====================================================

// Compatível com js/firebase-config.js revisado.
const db = window.db;
const auth = window.auth;

// =====================================================
// 2. ESTADO DA APLICAÇÃO
// =====================================================

let selectedSectorCode = '';
let selectedSectorName = '';
let currentFilter = 'all';
let rawOccurrences = [];

let currentStaffUser = null;
let currentAdminUser = null;

let occurrencesUnsubscribe = null;
let adminAuthUnsubscribe = null;

// Recupera a sessão da equipe com segurança.
try {
    const savedStaffUser = sessionStorage.getItem('arena_staff_user');

    if (savedStaffUser) {
        const parsedUser = JSON.parse(savedStaffUser);

        if (
            parsedUser &&
            typeof parsedUser.name === 'string' &&
            typeof parsedUser.code === 'string'
        ) {
            currentStaffUser = parsedUser;
        } else {
            sessionStorage.removeItem('arena_staff_user');
        }
    }
} catch (error) {
    console.error('Erro ao recuperar a sessão da equipe:', error);
    sessionStorage.removeItem('arena_staff_user');
}

// Verifica se os SDKs e a configuração estão disponíveis.
if (!db || !auth || typeof firebase === 'undefined') {
    console.error(
        'Firebase indisponível. Confira js/firebase-config.js ' +
        'e a ordem dos scripts no index.html.'
    );
}

if (typeof lucide !== 'undefined') {
    lucide.createIcons();
}

// =====================================================
// 3. FUNÇÕES AUXILIARES
// =====================================================

// Evita interpretar dados do Firestore como HTML.
function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => {
        const entities = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        };

        return entities[character];
    });
}

function getElement(id) {
    return document.getElementById(id);
}

function setText(id, value) {
    const element = getElement(id);

    if (element) {
        element.textContent = value ?? '';
    }
}

function showElement(id) {
    const element = getElement(id);

    if (element) {
        element.classList.remove('hidden');
    }
}

function hideElement(id) {
    const element = getElement(id);

    if (element) {
        element.classList.add('hidden');
    }
}

function refreshIcons() {
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

function getErrorMessage(error) {
    console.error(error);

    if (error && error.code === 'permission-denied') {
        return 'Acesso negado pelo Firebase. Verifique as regras de segurança.';
    }

    if (error && error.code === 'unavailable') {
        return 'Serviço temporariamente indisponível. Verifique sua conexão.';
    }

    return 'Ocorreu um erro. Tente novamente.';
}

function formatOccurrenceTime(timestamp) {
    if (!timestamp) {
        return 'Agora';
    }

    let date;

    if (typeof timestamp.toDate === 'function') {
        date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
        date = timestamp;
    } else {
        date = new Date(timestamp);
    }

    if (Number.isNaN(date.getTime())) {
        return 'Data indisponível';
    }

    return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// =====================================================
// 4. NAVEGAÇÃO ENTRE ABAS
// =====================================================

function switchTab(tab) {
    const tabs = {
        visitor: getElement('tabVisitor'),
        staff: getElement('tabStaff'),
        admin: getElement('tabAdmin')
    };

    if (!tabs[tab]) {
        console.error('Aba não encontrada:', tab);
        return;
    }

    Object.values(tabs).forEach(element => {
        if (element) {
            element.classList.add('hidden');
        }
    });

    tabs[tab].classList.remove('hidden');

    if (tab === 'staff') {
        checkStaffSession();
    }

    if (tab === 'admin') {
        checkAdminSession();
    }

    refreshIcons();
}

// =====================================================
// 5. REGISTRO DE OCORRÊNCIAS PELOS VISITANTES
// =====================================================

async function submitOccurrence(event) {
    event.preventDefault();

    if (!db) {
        alert('Firebase não está configurado corretamente.');
        return;
    }

    const form = getElement('visitorForm');
    const button = getElement('submitBtn');
    const categoryElement = document.querySelector(
        'input[name="category"]:checked'
    );
    const locationValue = getElement('locationInput')?.value.trim();
    const descriptionValue = getElement('descriptionInput')?.value.trim();

    if (!categoryElement) {
        alert('Por favor, selecione uma categoria.');
        return;
    }

    if (!locationValue || !selectedSectorCode) {
        alert('Toque no mapa para selecionar o setor da ocorrência.');
        return;
    }

    if (!descriptionValue) {
        alert('Descreva o problema encontrado.');
        return;
    }

    if (button) {
        button.disabled = true;
        button.innerHTML =
            '<i data-lucide="loader" class="w-5 h-5 animate-spin"></i>' +
            '<span>Enviando...</span>';
        refreshIcons();
    }

    try {
        await db.collection('occurrences').add({
            category: categoryElement.value,
            sectorCode: selectedSectorCode,
            location: locationValue,
            description: descriptionValue,
            status: 'open',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            history: [{
                action: 'Ocorrência criada pelo visitante',
                timestamp: new Date().toISOString()
            }]
        });

        alert('Ocorrência registrada com sucesso!');

        if (form) {
            form.reset();
        }

        selectedSectorCode = '';
        selectedSectorName = '';

        setText('selectedSectorBadge', 'Nenhum setor selecionado');

        document.querySelectorAll('.map-sector').forEach(sector => {
            sector.classList.remove('active');
        });

    } catch (error) {
        alert(getErrorMessage(error));
    } finally {
        if (button) {
            button.disabled = false;
            button.innerHTML =
                '<i data-lucide="send" class="w-5 h-5"></i>' +
                '<span>Registrar Ocorrência Agora</span>';
            refreshIcons();
        }
    }
}

// =====================================================
// 6. ACESSO DA EQUIPE DE MANUTENÇÃO
// =====================================================

function checkStaffSession() {
    if (currentStaffUser) {
        hideElement('staffAuthBox');
        showElement('staffDashboard');

        setText('staffDisplayName', currentStaffUser.name);
        setText(
            'staffAvatar',
            currentStaffUser.name.charAt(0).toUpperCase()
        );

        listenToOccurrences();
    } else {
        hideElement('staffDashboard');
        showElement('staffAuthBox');

        stopListeningToOccurrences();
    }
}

async function handleStaffLogin(event) {
    event.preventDefault();

    if (!db) {
        alert('Firebase não está configurado corretamente.');
        return;
    }

    const name = getElement('staffNameInput')?.value.trim() || '';
    const code = (
        getElement('staffCodeInput')?.value.trim() || ''
    ).toUpperCase();

    if (
        !name ||
        name.length > 80 ||
        !/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/.test(code)
    ) {
        alert('Informe seu nome e um código válido de 6 caracteres.');
        return;
    }

    try {
        const codeDocument = await db
            .collection('access_codes')
            .doc(code)
            .get();

        if (!codeDocument.exists) {
            alert('Código de acesso inválido ou não encontrado.');
            return;
        }

        const codeData = codeDocument.data();

        if (codeData.active !== true) {
            alert('Este código está desativado.');
            return;
        }

        if (
            !codeData.expiresAt ||
            typeof codeData.expiresAt.toDate !== 'function' ||
            codeData.expiresAt.toDate() <= new Date()
        ) {
            alert('Este código de acesso expirou ou é inválido.');
            return;
        }

        currentStaffUser = { name, code };

        sessionStorage.setItem(
            'arena_staff_user',
            JSON.stringify(currentStaffUser)
        );

        checkStaffSession();

    } catch (error) {
        alert(getErrorMessage(error));
    }
}

function logoutStaff() {
    currentStaffUser = null;
    sessionStorage.removeItem('arena_staff_user');

    stopListeningToOccurrences();
    checkStaffSession();
}

// =====================================================
// 7. ATUALIZAÇÃO EM TEMPO REAL
// =====================================================

function stopListeningToOccurrences() {
    if (typeof occurrencesUnsubscribe === 'function') {
        occurrencesUnsubscribe();
    }

    occurrencesUnsubscribe = null;
}

function listenToOccurrences() {
    if (!db || !currentStaffUser) {
        return;
    }

    // Evita criar vários listeners para a mesma tela.
    if (occurrencesUnsubscribe) {
        return;
    }

    occurrencesUnsubscribe = db
        .collection('occurrences')
        .orderBy('createdAt', 'desc')
        .onSnapshot(snapshot => {
            rawOccurrences = [];

            snapshot.forEach(document => {
                rawOccurrences.push({
                    id: document.id,
                    ...document.data()
                });
            });

            updateCounters();
            renderStaffList();

        }, error => {
            console.error('Erro ao carregar ocorrências:', error);
            alert(getErrorMessage(error));

            stopListeningToOccurrences();
        });
}

// =====================================================
// 8. CONTADORES DO PAINEL
// =====================================================

function updateCounters() {
    const openCount = rawOccurrences.filter(
        occurrence => occurrence.status === 'open'
    ).length;

    const progressCount = rawOccurrences.filter(
        occurrence => occurrence.status === 'progress'
    ).length;

    const doneCount = rawOccurrences.filter(
        occurrence => occurrence.status === 'done'
    ).length;

    setText('countOpen', openCount);
    setText('countProgress', progressCount);
    setText('countDone', doneCount);
}

// =====================================================
// 9. FILTROS DAS OCORRÊNCIAS
// =====================================================

function filterStaffList(status) {
    const allowedStatuses = ['all', 'open', 'progress', 'done'];

    if (!allowedStatuses.includes(status)) {
        return;
    }

    currentFilter = status;

    const buttons = {
        all: 'filterBtnAll',
        open: 'filterBtnOpen',
        progress: 'filterBtnProgress',
        done: 'filterBtnDone'
    };

    Object.entries(buttons).forEach(([key, id]) => {
        const element = getElement(id);

        if (!element) {
            return;
        }

        if (key === status) {
            element.className =
                'px-3 py-1.5 rounded-lg font-medium text-white ' +
                'bg-brand-600 transition-all';
        } else {
            element.className =
                'px-3 py-1.5 rounded-lg font-medium text-slate-400 ' +
                'hover:text-white transition-all';
        }
    });

    renderStaffList();
}

// =====================================================
// 10. EXIBIÇÃO DA FILA DE OCORRÊNCIAS
// =====================================================

function renderStaffList() {
    const container = getElement('staffOccurrencesList');

    if (!container) {
        return;
    }

    let filteredOccurrences = rawOccurrences;

    if (currentFilter !== 'all') {
        filteredOccurrences = rawOccurrences.filter(
            occurrence => occurrence.status === currentFilter
        );
    }

    if (filteredOccurrences.length === 0) {
        container.innerHTML = `
            <div class="text-center py-10 text-slate-500 text-sm">
                Nenhuma ocorrência encontrada nesta categoria.
            </div>
        `;
        return;
    }

    container.innerHTML = filteredOccurrences.map(item => {
        const category = escapeHTML(item.category || 'Sem categoria');
        const location = escapeHTML(item.location || 'Local não informado');
        const description = escapeHTML(
            item.description || 'Sem descrição'
        );
        const id = escapeHTML(item.id);
        const date = escapeHTML(formatOccurrenceTime(item.createdAt));

        let statusBadge = '';
        let actionButtons = '';

        if (item.status === 'open') {
            statusBadge = `
                <span class="px-2.5 py-1 text-xs font-bold
                    bg-amber-500/10 text-amber-400
                    border border-amber-500/30 rounded-full">
                    Em aberto
                </span>
            `;

            actionButtons = `
                <button
                    onclick="updateOccurrenceStatus('${id}', 'progress')"
                    class="px-3 py-1.5 bg-blue-600 hover:bg-blue-500
                        text-white font-semibold text-xs rounded-lg
                        transition-all flex items-center space-x-1">
                    <i data-lucide="play" class="w-3.5 h-3.5"></i>
                    <span>Assumir chamado</span>
                </button>
            `;
        } else if (item.status === 'progress') {
            const assignedTo = escapeHTML(
                item.assignedTo || 'Técnico'
            );

            statusBadge = `
                <span class="px-2.5 py-1 text-xs font-bold
                    bg-blue-500/10 text-blue-400
                    border border-blue-500/30 rounded-full">
                    Em atendimento: ${assignedTo}
                </span>
            `;

            actionButtons = `
                <button
                    onclick="updateOccurrenceStatus('${id}', 'done')"
                    class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500
                        text-white font-semibold text-xs rounded-lg
                        transition-all flex items-center space-x-1">
                    <i data-lucide="check" class="w-3.5 h-3.5"></i>
                    <span>Concluir atendimento</span>
                </button>
            `;
        } else if (item.status === 'done') {
            const completedBy = escapeHTML(
                item.completedBy || 'Técnico'
            );

            statusBadge = `
                <span class="px-2.5 py-1 text-xs font-bold
                    bg-emerald-500/10 text-emerald-400
                    border border-emerald-500/30 rounded-full">
                    Finalizada: ${completedBy}
                </span>
            `;
        } else {
            statusBadge = `
                <span class="px-2.5 py-1 text-xs font-bold
                    bg-slate-700 text-slate-300 rounded-full">
                    Status desconhecido
                </span>
            `;
        }

        return `
            <div class="bg-slate-950 border border-slate-800 rounded-xl
                p-4 flex flex-col md:flex-row md:items-center
                justify-between gap-4 hover:border-slate-700 transition-all">

                <div class="space-y-2 min-w-0">
                    <div class="flex flex-wrap items-center gap-2">
                        <span class="text-xs font-bold text-slate-400
                            uppercase tracking-wider">${category}</span>
                        <span class="text-slate-600">•</span>
                        <span class="text-xs text-slate-500">${date}</span>
                        ${statusBadge}
                    </div>

                    <h4 class="text-base font-bold text-white break-words">
                        ${location}
                    </h4>

                    <p class="text-sm text-slate-300 whitespace-pre-wrap
                        break-words">${description}</p>
                </div>

                <div class="flex items-center gap-2 self-end md:self-center">
                    ${actionButtons}
                </div>
            </div>
        `;
    }).join('');

    refreshIcons();
}

// =====================================================
// 11. ATUALIZAÇÃO DO STATUS
// =====================================================

async function updateOccurrenceStatus(id, newStatus) {
    if (!currentStaffUser) {
        alert('Entre na área da manutenção para continuar.');
        return;
    }

    if (!['progress', 'done'].includes(newStatus)) {
        alert('Status solicitado inválido.');
        return;
    }

    if (!db) {
        alert('Firebase não está configurado corretamente.');
        return;
    }

    const occurrence = rawOccurrences.find(item => item.id === id);

    if (!occurrence) {
        alert('Ocorrência não encontrada. Atualize a lista e tente novamente.');
        return;
    }

    // Evita transições incompatíveis com o fluxo normal.
    if (
        (newStatus === 'progress' && occurrence.status !== 'open') ||
        (newStatus === 'done' && occurrence.status !== 'progress')
    ) {
        alert('O status desta ocorrência já foi alterado.');
        return;
    }

    const updateData = {
        status: newStatus,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    if (newStatus === 'progress') {
        updateData.assignedTo = currentStaffUser.name;
        updateData.assignedAt = new Date().toISOString();
    }

    if (newStatus === 'done') {
        updateData.completedBy = currentStaffUser.name;
        updateData.completedAt = new Date().toISOString();
    }

    try {
        await db.collection('occurrences').doc(id).update(updateData);
    } catch (error) {
        alert(getErrorMessage(error));
    }
}

// =====================================================
// 12. SESSÃO DO ADMINISTRADOR
// =====================================================

function renderAdminSession() {
    if (currentAdminUser) {
        hideElement('adminAuthBox');
        showElement('adminPanel');

        setText(
            'adminEmail',
            currentAdminUser.email || 'Administrador autorizado'
        );
    } else {
        showElement('adminAuthBox');
        hideElement('adminPanel');
    }
}

function checkAdminSession() {
    if (!auth) {
        console.error('Firebase Authentication não está disponível.');
        return;
    }

    // Registra apenas um observador de autenticação.
    if (!adminAuthUnsubscribe) {
        adminAuthUnsubscribe = auth.onAuthStateChanged(user => {
            currentAdminUser = user;
            renderAdminSession();
        });
    }

    currentAdminUser = auth.currentUser || currentAdminUser;
    renderAdminSession();
}

async function loginAdminGoogle() {
    if (!auth) {
        alert('Firebase Authentication não está configurado.');
        return;
    }

    try {
        const provider = new firebase.auth.GoogleAuthProvider();

        await auth.signInWithPopup(provider);
        checkAdminSession();

    } catch (error) {
        console.error('Erro no login administrativo:', error);

        if (error.code === 'auth/unauthorized-domain') {
            alert(
                'Este domínio não está autorizado no Firebase. ' +
                'Adicione o domínio do seu site em Authentication > Settings.'
            );
        } else {
            alert('Falha no login com Google: ' + error.message);
        }
    }
}

async function logoutAdmin() {
    if (!auth) {
        return;
    }

    try {
        await auth.signOut();
        currentAdminUser = null;
        renderAdminSession();
    } catch (error) {
        alert(getErrorMessage(error));
    }
}

// =====================================================
// 13. GERAÇÃO DE CÓDIGOS DE ACESSO
// =====================================================

async function generateAccessCode() {
    if (!db || !auth || !auth.currentUser) {
        alert('Faça login como administrador primeiro.');
        return;
    }

    const button = document.querySelector(
        'button[onclick="generateAccessCode()"]'
    );

    if (button) {
        button.disabled = true;
    }

    const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

    try {
        let code = '';
        let saved = false;

        for (let attempt = 0; attempt < 10; attempt++) {
            code = '';

            for (let i = 0; i < 6; i++) {
                code += characters[
                    Math.floor(Math.random() * characters.length)
                ];
            }

            const reference = db.collection('access_codes').doc(code);
            const existing = await reference.get();

            if (existing.exists) {
                continue;
            }

            const now = new Date();
            const expiration = new Date(
                now.getTime() + 24 * 60 * 60 * 1000
            );

            await reference.set({
                code,
                active: true,
                createdAt:
                    firebase.firestore.FieldValue.serverTimestamp(),
                expiresAt:
                    firebase.firestore.Timestamp.fromDate(expiration),
                createdBy: auth.currentUser.email || 'Administrador'
            });

            saved = true;
            break;
        }

        if (!saved) {
            throw new Error(
                'Não foi possível gerar um código exclusivo.'
            );
        }

        setText('codeDisplay', code);
        showElement('generatedCodeBox');

        alert('Código gerado e salvo no Firebase!');

    } catch (error) {
        alert(getErrorMessage(error));
    } finally {
        if (button) {
            button.disabled = false;
        }
    }
}

// =====================================================
// 14. COPIAR CÓDIGO GERADO
// =====================================================

async function copyGeneratedCode() {
    const code = getElement('codeDisplay')?.textContent.trim();

    if (!code || code === '------') {
        alert('Gere um código antes de copiar.');
        return;
    }

    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(code);
        } else {
            const input = document.createElement('textarea');

            input.value = code;
            input.style.position = 'fixed';
            input.style.opacity = '0';

            document.body.appendChild(input);
            input.select();

            const copied = document.execCommand('copy');
            input.remove();

            if (!copied) {
                throw new Error('Não foi possível copiar o código.');
            }
        }

        alert('Código copiado: ' + code);

    } catch (error) {
        console.error('Erro ao copiar código:', error);
        alert('Não foi possível copiar automaticamente. Código: ' + code);
    }
}

// =====================================================
// 15. INICIALIZAÇÃO
// =====================================================

document.addEventListener('DOMContentLoaded', () => {
    refreshIcons();

    // Mantém o visitante como tela inicial.
    switchTab('visitor');

    console.log('Together-Visitantes iniciado.');
});
