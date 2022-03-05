require('dotenv').config();
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const express = require('express');
const router = require('./router');
const cors = require('cors');

const http = require("http");
const {Server} = require("socket.io");

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 80;
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
    },
});


app.use(express.json());
app.use(cookieParser());
app.use(cors({
    credentials: true,
    origin: process.env.CLIENT_URL
}));
app.use('/api', router);

io.on("connection", async (socket) => {
    // console.log(socket.id);
    socket.on('online', async () => {
        // console.count('online-------------------------')
    });
});


const start = async () => {
    try {
        await mongoose.connect(process.env.DB_URL, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        server.listen(PORT, () => {
            console.log(`started on port ${PORT}`);
        });
    } catch (e) {
        console.log('e ', e)
    }
};

start();
