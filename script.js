const urlInput = document.getElementById('urlInput');
const convertBtn = document.getElementById('convertBtn');
const errorMsg = document.getElementById('error-msg');
const progressArea = document.getElementById('progress-area');
const resultsArea = document.getElementById('results-area');
const playlistArea = document.getElementById('playlist-area');
const playlistList = document.getElementById('playlist-list');

// --- UTILITÁRIOS ---
function getYoutubeId(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

function getPlaylistId(url) {
    const regExp = /[?&]list=([^#\&\?]+)/;
    const match = url.match(regExp);
    return match ? match[1] : null;
}

// --- LÓGICA PRINCIPAL ---
async function checkUrlType() {
    const url = urlInput.value.trim();
    const videoId = getYoutubeId(url);
    const playlistId = getPlaylistId(url);

    // Limpa a tela
    errorMsg.classList.add('hidden');
    resultsArea.innerHTML = '';
    playlistArea.classList.add('hidden');
    urlInput.style.borderColor = 'var(--border)';

    // 1. É Playlist?
    if (playlistId) {
        if (videoId) {
            // Se tiver vídeo junto, mostra ele primeiro
            createDirectButton(videoId, "Vídeo Atual (Destaque)");
            
            // Botão para carregar o resto
            const loadPlaylistBtn = document.createElement('button');
            loadPlaylistBtn.className = 'action-btn';
            loadPlaylistBtn.style.marginTop = '15px';
            loadPlaylistBtn.style.background = 'var(--text-secondary)';
            loadPlaylistBtn.innerHTML = '<i class="ph-bold ph-list"></i> Carregar Resto da Playlist';
            loadPlaylistBtn.onclick = () => fetchPlaylistData(playlistId);
            resultsArea.appendChild(loadPlaylistBtn);
        } else {
            await fetchPlaylistData(playlistId);
        }
        return;
    }

    // 2. É Vídeo Único?
    if (videoId) {
        createDirectButton(videoId, "Vídeo Encontrado");
        return;
    }

    // 3. Erro
    errorMsg.classList.remove('hidden');
    urlInput.style.borderColor = 'var(--primary)';
}

// --- CRIA O BOTÃO DE DOWNLOAD (100% FUNCIONAL) ---
function createDirectButton(videoId, title) {
    const item = document.createElement('div');
    item.className = 'download-item';
    item.style.flexDirection = 'column';
    item.style.gap = '10px';
    item.style.alignItems = 'stretch';

    // Link Mágico Limpo (Yout)
    const magicLink = `https://yout.com/video/${videoId}`;

    item.innerHTML = `
        <div class="item-info" style="text-align: center;">
            <div class="item-title" style="font-size: 1rem;">${title}</div>
            <div class="item-meta" style="margin-top: 4px;">Pronto para baixar</div>
        </div>
        
        <a href="${magicLink}" target="_blank" class="server-btn primary" style="text-align: center; justify-content: center; padding: 15px; font-size: 1rem;">
            <i class="ph-bold ph-download-simple"></i> 
            BAIXAR MP3 AGORA
        </a>
        
        <p style="font-size: 0.75rem; color: #999; text-align: center;">
            *Abrirá a tela de salvamento segura em nova aba.
        </p>
    `;

    resultsArea.appendChild(item);
    resultsArea.scrollIntoView({ behavior: 'smooth' });
}

// --- LÓGICA DE PLAYLIST (Piped API) ---
async function fetchPlaylistData(playlistId) {
    const existingBtn = resultsArea.querySelector('button.action-btn');
    if (existingBtn) existingBtn.remove();

    convertBtn.disabled = true;
    convertBtn.innerHTML = '<i class="ph-bold ph-spinner ph-spin"></i> Lendo Playlist...';
    
    try {
        const response = await fetch(`https://api.piped.co/playlists/${playlistId}`);
        const data = await response.json();
        
        if (!data.relatedStreams) throw new Error("Playlist vazia");
        renderPlaylistItems(data.relatedStreams);
        
    } catch (error) {
        try {
            // Backup
            const backup = await fetch(`https://pipedapi.kavin.rocks/playlists/${playlistId}`);
            const dataBackup = await backup.json();
            renderPlaylistItems(dataBackup.relatedStreams);
        } catch (e) {
            alert("Erro ao ler playlist. Verifique se ela é Pública.");
        }
    } finally {
        convertBtn.disabled = false;
        convertBtn.innerHTML = '<span class="btn-text">Buscar</span><i class="ph-bold ph-magnifying-glass"></i>';
    }
}

function renderPlaylistItems(videos) {
    playlistList.innerHTML = '';
    playlistArea.classList.remove('hidden');
    playlistArea.querySelector('h3').innerText = `Playlist: ${videos.length} vídeos`;

    videos.forEach(video => {
        const div = document.createElement('div');
        div.className = 'playlist-item';
        let vidId = video.url.split('v=')[1];
        if (vidId.includes('&')) vidId = vidId.split('&')[0];
        
        div.innerHTML = `
            <input type="checkbox" id="${vidId}" value="${vidId}" data-title="${video.title}">
            <label for="${vidId}">${video.title}</label>
        `;
        playlistList.appendChild(div);
    });
    playlistArea.scrollIntoView({ behavior: 'smooth' });
}

function selectAll() {
    const checkboxes = playlistList.querySelectorAll('input[type="checkbox"]');
    const allChecked = Array.from(checkboxes).every(c => c.checked);
    checkboxes.forEach(c => c.checked = !allChecked);
}

function processSelectedVideos() {
    const selected = playlistList.querySelectorAll('input[type="checkbox"]:checked');
    if (selected.length === 0) return alert("Selecione um vídeo.");

    playlistArea.classList.add('hidden');
    resultsArea.innerHTML = '<h3>Downloads Prontos:</h3>';

    selected.forEach(checkbox => {
        createDirectButton(checkbox.value, checkbox.getAttribute('data-title'));
    });
}
