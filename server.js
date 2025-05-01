const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

// Serve static files from 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// Serve video file list from 'assets' folder
app.get('/video-list', (req, res) => {
    const dir = path.join(__dirname, 'public', 'assets');
    fs.readdir(dir, (err, files) => {
        if (err) {
            console.error("Error reading assets folder:", err);
            return res.status(500).json({ error: "Cannot read directory" });
        }
        const videoFiles = files.filter(f => f.endsWith('.webm')).map(f => f.toLowerCase());
        res.json(videoFiles);
    });
});

// Socket.io chat events
io.on('connection', (socket) => {
    console.log('User connected');

    socket.on('chat message', (data) => {
        socket.broadcast.emit('chat message', data);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

// Run on 0.0.0.0 so mobile can connect too
server.listen(3000, '0.0.0.0', () => console.log('Server running at http://localhost:3000'));
