const urlInput = document.getElementById('urlInput');
const convertBtn = document.getElementById('convertBtn');
const errorMsg = document.getElementById('error-msg');
const progressArea = document.getElementById('progress-area');
const resultsArea = document.getElementById('results-area');
const playlistArea = document.getElementById('playlist-area');
const playlistList = document.getElementById('playlist-list');

// Servidores da API Cobalt (Rotação para garantir funcionamento)
const COBALT_API_URL = "https://api.cobalt.tools/api/json";

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

// --- LÓGICA DE DECISÃO ---
async function checkUrlType() {
    const url = urlInput.value.trim();
    const videoId = getYoutubeId(url);
    const playlistId = getPlaylistId(url);

    // Reset UI
    errorMsg.classList.add('hidden');
    resultsArea.innerHTML = '';
    playlistArea.classList.add('hidden');
    urlInput.style.borderColor = 'var(--border)';

    // 1. É Playlist?
    if (playlistId) {
        // Se tiver vídeo junto, mostra opção individual primeiro
        if (videoId) {
            createDirectDownloadCard(url, "Vídeo Atual (Baixar Agora)");
            
            const loadPlaylistBtn = document.createElement('button');
            loadPlaylistBtn.className = 'action-btn';
            loadPlaylistBtn.style.marginTop = '15px';
            loadPlaylistBtn.style.background = 'var(--text-secondary)';
            loadPlaylistBtn.innerHTML = '<i class="ph-bold ph-list"></i> Carregar Playlist Completa';
            loadPlaylistBtn.onclick = () => fetchPlaylistData(playlistId);
            resultsArea.appendChild(loadPlaylistBtn);
        } else {
            await fetchPlaylistData(playlistId);
        }
        return;
    }

    // 2. É Vídeo Único?
    if (videoId) {
        createDirectDownloadCard(url, "Vídeo Encontrado");
        return;
    }

    // 3. Erro
    errorMsg.classList.remove('hidden');
    urlInput.style.borderColor = 'var(--primary)';
}

// --- INTERFACE DE DOWNLOAD DIRETO ---
function createDirectDownloadCard(url, title) {
    const item = document.createElement('div');
    item.className = 'download-item';
    item.style.flexDirection = 'column';
    item.style.gap = '10px';
    
    item.innerHTML = `
        <div class="item-info" style="text-align: center;">
            <div class="item-title">${title}</div>
        </div>
        <div style="display: flex; gap: 10px; width: 100%;">
            <button onclick="processDirectDownload('${url}', 'mp3')" class="server-btn primary" style="flex: 1; cursor: pointer; border: none;">
                <i class="ph-bold ph-music-notes"></i> Baixar MP3
            </button>
            <button onclick="processDirectDownload('${url}', '720')" class="server-btn secondary" style="flex: 1; cursor: pointer;">
                <i class="ph-bold ph-video-camera"></i> Baixar MP4
            </button>
        </div>
        <div id="status-${btoa(url).substring(0, 5)}" style="font-size: 0.8rem; color: #666; text-align: center; margin-top: 5px;"></div>
    `;
    resultsArea.appendChild(item);
    resultsArea.scrollIntoView({ behavior: 'smooth' });
}

// --- O MOTOR DE DOWNLOAD (A MÁGICA) ---
async function processDirectDownload(url, format) {
    const statusId = `status-${btoa(url).substring(0, 5)}`;
    const statusDiv = document.getElementById(statusId) || document.createElement('div');
    
    // Feedback Visual
    statusDiv.innerHTML = '<i class="ph-bold ph-spinner ph-spin"></i> Processando no servidor...';
    
    try {
        const requestBody = {
            url: url,
            vCodec: "h264",
            vQuality: format === 'mp3' ? "720" : "720",
            aFormat: "mp3",
            isAudioOnly: format === 'mp3'
        };

        const response = await fetch(COBALT_API_URL, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();

        if (data.status === 'error') throw new Error('Erro na conversão');

        // SUCESSO: Link gerado
        statusDiv.innerHTML = '<span style="color: var(--success)">✅ Download iniciado!</span>';
        
        // Truque para download direto
        const link = document.createElement('a');
        link.href = data.url;
        link.target = '_blank'; // Necessário para evitar bloqueio
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

    } catch (error) {
        console.error(error);
        statusDiv.innerHTML = '<span style="color: red">Erro. Tente novamente.</span>';
        // Fallback se a API falhar
        window.open(`https://cobalt.tools/`, '_blank');
    }
}

// --- LÓGICA DE PLAYLIST (Piped API) ---
async function fetchPlaylistData(playlistId) {
    convertBtn.disabled = true;
    convertBtn.innerHTML = '<i class="ph-bold ph-spinner ph-spin"></i> Lendo Playlist...';
    
    try {
        const response = await fetch(`https://api.piped.co/playlists/${playlistId}`);
        const data = await response.json();
        
        if (!data.relatedStreams) throw new Error("Playlist vazia");
        renderPlaylistItems(data.relatedStreams);
        
    } catch (error) {
        alert("Erro ao carregar playlist. Tente novamente.");
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
        const fullUrl = `https://www.youtube.com/watch?v=${vidId}`;
        
        div.innerHTML = `
            <input type="checkbox" id="${vidId}" value="${fullUrl}" data-title="${video.title}">
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
    resultsArea.innerHTML = '<h3>Downloads Selecionados:</h3>';

    selected.forEach(checkbox => {
        createDirectDownloadCard(checkbox.value, checkbox.getAttribute('data-title'));
    });
}