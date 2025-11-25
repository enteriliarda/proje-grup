async function loadAnnouncements() {
    const res = await fetch("/api/announcements");
    const data = await res.json();
    let html = "";
    data.forEach(a => {
        html += `
        <div class="announce-item">
            <strong>${a.title}</strong>
            <p>${a.body}</p>
            <small>${a.time}</small>
        </div>`;
    });
    document.getElementById("announceList").innerHTML = html;
}

async function loadFiles() {
    const res = await fetch("/api/files");
    const data = await res.json();
    let html = "";
    data.forEach(f => {
        html += `
        <div class="file-item">
            ${f.filename}
            <a href="/download/${f.filename}">İndir</a>
        </div>`;
    });
    document.getElementById("fileList").innerHTML = html;
}

loadAnnouncements();
loadFiles();
