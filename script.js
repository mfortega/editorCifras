// ==================== MODELO E ESTADO GLOBAL ====================
let chordModel = [];       // estrutura: linhas de { text, chord }
let activePopup = null;

// ==================== DOM ELEMENTOS ====================
const lyricsTextarea = document.getElementById('lyricsInput');
const refreshBtn = document.getElementById('refreshBtn');
const clearChordsBtn = document.getElementById('clearChordsBtn');
const chordSheetDiv = document.getElementById('chordSheetContainer');
const exampleBtn = document.getElementById('exampleBtn');
const exportPdfBtn = document.getElementById('exportPdfBtn');
const songNameInput = document.getElementById('songName');
const saveSongBtn = document.getElementById('saveSongBtn');
const newSongBtn = document.getElementById('newSongBtn');
const songsListDiv = document.getElementById('songsList');

// ==================== FUNÇÕES AUXILIARES (CORE) ====================
function closePopup() {
    if (activePopup) {
        activePopup.remove();
        activePopup = null;
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// Converte texto bruto em modelo (sem acordes)
function buildModelFromLyrics(text) {
    const lines = text.split(/\r?\n/);
    const newModel = [];
    for (let line of lines) {
        if (line.trim() === "") {
            newModel.push([]);
            continue;
        }
        const words = line.split(/\s+/).filter(w => w.length > 0);
        const wordObjects = words.map(w => ({ text: w, chord: null }));
        newModel.push(wordObjects);
    }
    return newModel;
}

// Reconstrói texto (letra) a partir do modelo atual
function modelToText(model) {
    let lines = [];
    for (let lineWords of model) {
        if (lineWords.length === 0) {
            lines.push('');
        } else {
            const lineText = lineWords.map(w => w.text).join(' ');
            lines.push(lineText);
        }
    }
    return lines.join('\n');
}

// Renderiza a área de cifra interativa
function renderChordSheet() {
    if (!chordSheetDiv) return;
    chordSheetDiv.innerHTML = "";

    if (!chordModel.length) {
        chordSheetDiv.innerHTML = '<div style="text-align:center; padding: 2rem; color: #a3906e;">🎶 Nenhuma letra carregada. Digite uma música e clique em "Carregar".</div>';
        return;
    }

    for (let lineIdx = 0; lineIdx < chordModel.length; lineIdx++) {
        const wordsArray = chordModel[lineIdx];
        const lineDiv = document.createElement('div');
        lineDiv.className = 'line';

        if (!wordsArray || wordsArray.length === 0) {
            const emptySpan = document.createElement('div');
            emptySpan.className = 'empty-line';
            emptySpan.style.width = '100%';
            emptySpan.style.height = '1.8rem';
            emptySpan.style.background = '#f7efdb';
            emptySpan.style.borderRadius = '28px';
            emptySpan.style.margin = '4px 0';
            lineDiv.appendChild(emptySpan);
            chordSheetDiv.appendChild(lineDiv);
            continue;
        }

        for (let wordIdx = 0; wordIdx < wordsArray.length; wordIdx++) {
            const wordData = wordsArray[wordIdx];
            const wordText = wordData.text;
            const chordSymbol = wordData.chord || null;

            const wordContainer = document.createElement('div');
            wordContainer.className = 'word-container';
            wordContainer.setAttribute('data-line', lineIdx);
            wordContainer.setAttribute('data-word', wordIdx);

            const chordSpan = document.createElement('div');
            chordSpan.className = 'chord';
            chordSpan.textContent = chordSymbol || "";

            const wordSpan = document.createElement('div');
            wordSpan.className = 'word';
            wordSpan.textContent = wordText;

            wordContainer.appendChild(chordSpan);
            wordContainer.appendChild(wordSpan);

            wordContainer.addEventListener('click', (function(l, w) {
                return function(event) {
                    event.stopPropagation();
                    openChordPopup(event, l, w);
                };
            })(lineIdx, wordIdx));

            lineDiv.appendChild(wordContainer);
        }
        chordSheetDiv.appendChild(lineDiv);
    }
    closePopup();
}

function openChordPopup(event, lineIndex, wordIndex) {
    closePopup();

    if (!chordModel[lineIndex] || !chordModel[lineIndex][wordIndex]) return;
    const currentChord = chordModel[lineIndex][wordIndex].chord || "";

    const targetElem = event.currentTarget;
    const rect = targetElem.getBoundingClientRect();
    const scrollY = window.scrollY;
    const scrollX = window.scrollX;

    const popup = document.createElement('div');
    popup.className = 'chord-popup';
    popup.style.left = `${Math.min(rect.left + scrollX + 10, window.innerWidth - 280)}px`;
    popup.style.top = `${rect.top + scrollY - 70}px`;
    if (rect.top < 100) {
        popup.style.top = `${rect.bottom + scrollY + 10}px`;
    }

    popup.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 6px; text-align:center;">🎵 Adicionar Acorde</div>
        <input type="text" id="chordInputPopup" placeholder="Ex: C, Dm, G7, Am, F#m" value="${escapeHtml(currentChord)}" autocomplete="off">
        <div class="chord-suggest">
            <span class="suggest-btn" data-chord="C">C</span>
            <span class="suggest-btn" data-chord="Dm">Dm</span>
            <span class="suggest-btn" data-chord="Em">Em</span>
            <span class="suggest-btn" data-chord="F">F</span>
            <span class="suggest-btn" data-chord="G">G</span>
            <span class="suggest-btn" data-chord="Am">Am</span>
            <span class="suggest-btn" data-chord="Bm">Bm</span>
            <span class="suggest-btn" data-chord="C#m">C#m</span>
            <span class="suggest-btn" data-chord="G7">G7</span>
            <span class="suggest-btn" data-chord="A7">A7</span>
            <span class="suggest-btn" data-chord="D">D</span>
            <span class="suggest-btn" data-chord="E">E</span>
        </div>
        <div class="popup-buttons">
            <button id="popupSetChordBtn">✅ Definir</button>
            <button id="popupRemoveChordBtn">❌ Remover</button>
            <button id="popupCancelBtn">✖️ Cancelar</button>
        </div>
        <div class="info-note" style="margin-top:6px;">ou digite qualquer cifra</div>
    `;

    document.body.appendChild(popup);
    activePopup = popup;

    const chordInput = popup.querySelector('#chordInputPopup');
    if (chordInput) chordInput.focus();

    const updateChordAndRender = (newChordValue) => {
        let finalChord = null;
        if (newChordValue && newChordValue.trim() !== "") {
            finalChord = newChordValue.trim().toUpperCase();
        }
        chordModel[lineIndex][wordIndex].chord = finalChord;
        renderChordSheet();
        // Atualiza também o textarea para manter sincronia (opcional)
        lyricsTextarea.value = modelToText(chordModel);
        closePopup();
    };

    const setBtn = popup.querySelector('#popupSetChordBtn');
    const removeBtn = popup.querySelector('#popupRemoveChordBtn');
    const cancelBtn = popup.querySelector('#popupCancelBtn');
    const suggestBtns = popup.querySelectorAll('.suggest-btn');

    setBtn.addEventListener('click', () => updateChordAndRender(chordInput.value));
    removeBtn.addEventListener('click', () => updateChordAndRender(null));
    cancelBtn.addEventListener('click', () => closePopup());

    suggestBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            chordInput.value = btn.getAttribute('data-chord');
            chordInput.focus();
        });
    });

    const closeHandler = (e) => {
        if (activePopup && !activePopup.contains(e.target)) {
            closePopup();
            document.removeEventListener('click', closeHandler);
        }
    };
    setTimeout(() => document.addEventListener('click', closeHandler), 10);
}

// Carrega letra do textarea para o modelo
function loadLyricsToModel() {
    const rawText = lyricsTextarea.value;
    chordModel = buildModelFromLyrics(rawText);
    renderChordSheet();
}

// Remove todos os acordes
function clearAllChords() {
    for (let line of chordModel) {
        for (let word of line) {
            if (word && word.chord !== undefined) word.chord = null;
        }
    }
    renderChordSheet();
    lyricsTextarea.value = modelToText(chordModel);
}

// Exemplo prático
function loadExample() {
    const exampleSong = `Imagine
All the people
Living for today

Eu preciso de você
Você me faz tão bem
Sol Maior
Luz que vem`;

    lyricsTextarea.value = exampleSong;
    loadLyricsToModel();
    setTimeout(() => {
        if (chordModel.length > 0) {
            if (chordModel[0] && chordModel[0][0]) chordModel[0][0].chord = "C";
            if (chordModel[1] && chordModel[1][0]) chordModel[1][0].chord = "G";
            if (chordModel[2] && chordModel[2][0]) chordModel[2][0].chord = "Am";
            if (chordModel[3] && chordModel[3][1]) chordModel[3][1].chord = "Dm";
            if (chordModel[4] && chordModel[4][2]) chordModel[4][2].chord = "Em";
            renderChordSheet();
            lyricsTextarea.value = modelToText(chordModel);
        }
        songNameInput.value = "Música Exemplo";
    }, 20);
}

// ==================== EXPORTAR PDF ====================
function exportToPDF() {
    const elementToExport = document.getElementById('chordSheetContainer');
    if (!elementToExport || elementToExport.innerText.includes("Nenhuma letra carregada")) {
        alert("Nenhuma cifra para exportar. Carregue uma letra e adicione acordes primeiro.");
        return;
    }

    const cloneSheet = elementToExport.cloneNode(true);
    cloneSheet.style.overflow = 'visible';
    cloneSheet.style.maxHeight = 'none';
    cloneSheet.style.backgroundColor = '#ffffff';
    cloneSheet.style.padding = '1rem';
    
    const wrapper = document.createElement('div');
    wrapper.style.fontFamily = 'Segoe UI, system-ui, sans-serif';
    wrapper.style.padding = '20px';
    wrapper.style.backgroundColor = '#fff';
    
    const title = document.createElement('h2');
    const songTitle = songNameInput.value.trim() || "Cifra Musical";
    title.textContent = songTitle;
    title.style.color = '#0b2b26';
    title.style.borderBottom = '2px solid #f4a261';
    title.style.paddingBottom = '10px';
    wrapper.appendChild(title);
    
    const date = new Date();
    const dateSpan = document.createElement('p');
    dateSpan.textContent = `Gerado em: ${date.toLocaleDateString()} - ${date.toLocaleTimeString()}`;
    dateSpan.style.fontSize = '0.8rem';
    dateSpan.style.color = '#666';
    wrapper.appendChild(dateSpan);
    
    wrapper.appendChild(cloneSheet);
    
    const opt = {
        margin:        [0.5, 0.5, 0.5, 0.5],
        filename:     `${songTitle.replace(/[^a-z0-9]/gi, '_')}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, letterRendering: true, useCORS: true, logging: false },
        jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
    };
    
    html2pdf().set(opt).from(wrapper).save();
}

// ==================== GERENCIAMENTO DE MÚSICAS (localStorage) ====================
const STORAGE_KEY = "saved_chord_songs";

function getSavedSongs() {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
}

function saveSongsToStorage(songs) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(songs));
}

function renderSongsList() {
    const songs = getSavedSongs();
    if (!songsListDiv) return;
    songsListDiv.innerHTML = "";
    if (songs.length === 0) {
        songsListDiv.innerHTML = '<div class="empty-message">Nenhuma música salva ainda. Salve sua primeira música!</div>';
        return;
    }
    songs.forEach(song => {
        const songDiv = document.createElement('div');
        songDiv.className = 'song-item';
        const nameSpan = document.createElement('span');
        nameSpan.className = 'song-name';
        nameSpan.textContent = song.nome;
        nameSpan.title = "Clique para carregar";
        nameSpan.addEventListener('click', () => loadSongById(song.id));
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = "✖";
        deleteBtn.className = "delete-song";
        deleteBtn.title = "Excluir música";
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteSongById(song.id);
        });
        songDiv.appendChild(nameSpan);
        songDiv.appendChild(deleteBtn);
        songsListDiv.appendChild(songDiv);
    });
}

function saveCurrentSong() {
    const nome = songNameInput.value.trim();
    if (!nome) {
        alert("Por favor, insira um nome para a música.");
        return;
    }
    if (!chordModel || chordModel.length === 0 || (chordModel.length === 1 && chordModel[0].length === 0)) {
        alert("A letra da música está vazia. Digite algo antes de salvar.");
        return;
    }
    const songs = getSavedSongs();
    // Verifica se já existe música com mesmo nome
    const existingIndex = songs.findIndex(s => s.nome.toLowerCase() === nome.toLowerCase());
    if (existingIndex !== -1) {
        if (!confirm(`Já existe uma música chamada "${nome}". Deseja sobrescrevê-la?`)) {
            return;
        }
        // Sobrescrever
        songs[existingIndex] = {
            id: songs[existingIndex].id,
            nome: nome,
            chordModel: JSON.parse(JSON.stringify(chordModel)) // deep copy
        };
    } else {
        // Nova música
        const newId = Date.now().toString() + '-' + Math.random().toString(36).substr(2, 6);
        songs.push({
            id: newId,
            nome: nome,
            chordModel: JSON.parse(JSON.stringify(chordModel))
        });
    }
    saveSongsToStorage(songs);
    renderSongsList();
    alert(`Música "${nome}" salva com sucesso!`);
}

function loadSongById(id) {
    const songs = getSavedSongs();
    const song = songs.find(s => s.id === id);
    if (!song) return;
    // Restaurar modelo e nome
    chordModel = JSON.parse(JSON.stringify(song.chordModel));
    songNameInput.value = song.nome;
    // Reconstruir letra no textarea a partir do modelo
    lyricsTextarea.value = modelToText(chordModel);
    renderChordSheet();
    closePopup();
}

function deleteSongById(id) {
    const songs = getSavedSongs();
    const newSongs = songs.filter(s => s.id !== id);
    saveSongsToStorage(newSongs);
    renderSongsList();
    // Se a música atual for a excluída, opcionalmente limpar? Não precisa.
}

function newSong() {
    if (chordModel.length > 0 && (lyricsTextarea.value.trim() !== "" || songNameInput.value.trim() !== "")) {
        if (!confirm("Tem certeza? Isso limpará a música atual. Salve antes se necessário.")) {
            return;
        }
    }
    chordModel = [];
    songNameInput.value = "";
    lyricsTextarea.value = "";
    renderChordSheet();
    closePopup();
}

// ==================== EVENT LISTENERS E INICIALIZAÇÃO ====================
refreshBtn.addEventListener('click', loadLyricsToModel);
clearChordsBtn.addEventListener('click', clearAllChords);
exampleBtn.addEventListener('click', loadExample);
exportPdfBtn.addEventListener('click', exportToPDF);
saveSongBtn.addEventListener('click', saveCurrentSong);
newSongBtn.addEventListener('click', newSong);

// Sincroniza o textarea com o modelo quando o usuário digitar manualmente (opcional)
lyricsTextarea.addEventListener('input', () => {
    // Não recarrega automaticamente para preservar acordes? Melhor deixar explícito com botão "Carregar"
    // Mas para manter coerência, se digitar sem carregar, o modelo fica dessincronizado.
    // O usuário deve clicar em "Carregar" para sincronizar. Isso é intencional.
});

function initDefault() {
    const defaultLyrics = `Eu só quero ver você brilhar
A luz do teu olhar
Toma conta do meu ser
Céu azul`;

    lyricsTextarea.value = defaultLyrics;
    chordModel = buildModelFromLyrics(defaultLyrics);
    if (chordModel[0] && chordModel[0][0]) chordModel[0][0].chord = "D";
    if (chordModel[0] && chordModel[0][3]) chordModel[0][3].chord = "A";
    if (chordModel[2] && chordModel[2][0]) chordModel[2][0].chord = "Em";
    renderChordSheet();
    songNameInput.value = "";
    renderSongsList();
}

initDefault();