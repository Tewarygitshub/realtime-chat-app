const socket = io();
let availableVideos = [];

fetch('/video-list')
    .then(res => res.json())
    .then(files => {
        availableVideos = files;
    })
    .catch(err => {
        console.error("Failed to load video list:", err);
    });

    function sendMessage(text = null, isImage = false) {
        const message = text || document.getElementById('chat-input').value.trim();
        if (!message && !isImage) return;
    
        const msgData = { type: isImage ? "image" : "text", content: message };
        displayMessage(msgData, true);
        saveToLocalHistory(msgData);  // 👈 Save when sending
        socket.emit('chat message', msgData);
        document.getElementById('chat-input').value = "";
    }
    
    socket.on('chat message', (data) => {
        displayMessage(data, false);
        saveToLocalHistory(data);   // 👈 Save when receiving
    });
    
socket.on('chat message', (data) => {
    displayMessage(data, false);
});

function displayMessage(data, isMine) {
    const chatBox = document.getElementById('chat-box');
    const div = document.createElement('div');
    div.className = 'message ' + (isMine ? 'user-message' : 'other-message');

    if (data.type === "image") {
        div.innerHTML = `<img src="${data.content}" style="max-width:100%;" />`;
    } else {
        div.innerHTML = `
            ${data.content}
            <button class="sign-button" onclick="showSignVideos('${data.content}')">Sign</button>
        `;
    }

    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;

    // Save to local history
    let history = JSON.parse(localStorage.getItem('chatHistory')) || [];
    history.push(data);
    localStorage.setItem('chatHistory', JSON.stringify(history));
}


function startSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        alert("Speech Recognition not supported in this browser.");
        return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
        console.log("Voice recognition started...");
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        sendMessage(transcript);
    };

    recognition.onerror = (event) => {
        alert("Speech recognition error: " + event.error);
    };

    recognition.start();
}


function uploadImage(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => sendMessage(reader.result, true);
    reader.readAsDataURL(file);
}

function startCamera() {
    const video = document.getElementById('camera');
    const captureBtn = document.getElementById('captureBtn');
    video.style.display = "block";
    captureBtn.style.display = "block";

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert("Camera not supported on this browser.");
        return;
    }

    navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
            video.srcObject = stream;
            video.play();
        })
        .catch(err => {
            alert("Camera access denied: " + err.message);
        });
}


function captureImage() {
    const video = document.getElementById('camera');
    const canvas = document.getElementById('canvas');
    const context = canvas.getContext('2d');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);

    video.srcObject.getTracks().forEach(track => track.stop());
    video.style.display = "none";
    document.getElementById('captureBtn').style.display = "none";

    sendMessage(canvas.toDataURL(), true);
}

function showSignVideos(text) {
    const container = document.getElementById('video-container');
    container.innerHTML = "";
    const words = text.toLowerCase().split(/\s+/);
    let queue = [];

    words.forEach(word => {
        const wordFile = `${word}.webm`;
        if (availableVideos.includes(wordFile)) {
            queue.push({ src: `assets/${wordFile}`, label: word });
        } else {
            [...word].forEach(char => {
                const charFile = `${char}.webm`;
                if (availableVideos.includes(charFile)) {
                    queue.push({ src: `assets/${charFile}`, label: char });
                }
            });
        }
    });

    if (!queue.length) {
        container.innerHTML = "<p>No sign videos found.</p>";
        return;
    }

    let index = 0;
    function playNext() {
        if (index < queue.length) {
            const videoData = queue[index++];
            container.innerHTML = `
                <video id="signVideo" autoplay muted>
                    <source src="${videoData.src}" type="video/webm">
                </video>
                <p>Showing: <b>${videoData.label.toUpperCase()}</b></p>
            `;
            document.getElementById('signVideo').onended = playNext;
        }
    }

    document.getElementById('video-modal').style.display = "block";
    playNext();
}

function closeModal() {
    document.getElementById('video-modal').style.display = "none";
    document.getElementById('video-container').innerHTML = "";
}


function saveToLocalHistory(message) {
    let history = JSON.parse(localStorage.getItem('chatHistory')) || [];
    history.push(message);
    localStorage.setItem('chatHistory', JSON.stringify(history));
}


function loadChatHistory() {
    const chatBox = document.getElementById('chat-box');
    chatBox.innerHTML = "";  // Clear current messages

    const history = JSON.parse(localStorage.getItem('chatHistory')) || [];
    history.forEach((data) => {
        displayMessage(data, true);  // You can mark history as 'mine' or handle differently if you want
    });
}


document.getElementById('history-icon').addEventListener('click', showHistoryBox);
document.getElementById('back-icon').addEventListener('click', hideHistoryBox);
document.getElementById('delete-history-icon').addEventListener('click', deleteChatHistory);

function showHistoryBox() {
    const historyData = JSON.parse(localStorage.getItem('chatHistory')) || [];
    const container = document.getElementById('history-messages');
    container.innerHTML = '';

    if (historyData.length === 0) {
        container.innerHTML = "<p>No chat history available.</p>";
    } else {
        historyData.forEach(data => {
            const div = document.createElement('div');
            div.className = 'message';
            if (data.type === "image") {
                div.innerHTML = `<img src="${data.content}" style="max-width:100%;" />`;
            } else {
                div.textContent = data.content;
            }
            container.appendChild(div);
        });
    }

    document.getElementById('chat-box').style.display = "none";
    document.getElementById('history-box').style.display = "block";
}

function hideHistoryBox() {
    document.getElementById('chat-box').style.display = "block";
    document.getElementById('history-box').style.display = "none";
}

function deleteChatHistory() {
    if (confirm("Delete all chat history?")) {
        localStorage.removeItem('chatHistory');
        document.getElementById('history-messages').innerHTML = '';
        alert("History cleared.");
    }
}

