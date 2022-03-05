require('dotenv').config();
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const express = require('express');
const router = require('./router');
const cors = require('cors');
const {User, Message} =require('./models');

const http = require("http");
const {Server} = require("socket.io");

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 80;
const io = new Server(server, {
    cors: {
        origin: process.env.CLIENT_URL,
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

// io.on("connection", async (socket) => {
//     // console.log(socket.id);
//     socket.on('online', async () => {
//         // console.count('online-------------------------')
//     });
// });
io.on("connection", async (socket) => {
    socket.join('room');
    let userIds = {};

    async function sendMessages() {
        const newMessages = await Message.find();
        socket.to('room').emit("backend_sends_message", newMessages);
        socket.emit("backend_sends_message", newMessages);
    }

    async function sendUnread() {
        const unread = await Message.aggregate([
            {
                $match: {$and: [{receiverId: userIds[socket.id]}, {deliveryStatus: 1}]}
            },
            {
                $group: {
                    _id: "$senderId",
                    count: {$sum: 1}
                }
            }
        ]);
        socket.emit("backend_sends_unread", unread);
    }

    async function sendUsers() {
        const users = await User.find();
        socket.to('room').emit("backend_sends_user", users);
        socket.emit("backend_sends_user", users);
    }

    await sendMessages();
    await sendUsers();
    await sendUnread();

    socket.on('frontend_registers', async () => {
        await sendUsers()
    });
    socket.on("frontend_sends_message", async (data) => {
        await new Message(data).save();
        await sendMessages();
        await sendUnread();
    });
    socket.on("read_messages", async function (data) {
        await Message.updateMany({receiverId: data.receiverId, senderId: data.senderId}, {deliveryStatus: 2});
        await sendMessages();
        await sendUnread();
    });
    socket.on('user_online', async function (data) {
        // userIds = {...userIds, [socket.id]: data.userId};
        // await User.updateOne({_id: data.userId}, {isOnline: true, typingTo: ''});
        // await sendUsers();
        // await sendUnread()
    });
    socket.on('is_typing', async function (data) {
        await User.updateOne({_id: data.userId}, {typingTo: data.otherId});
        await sendUsers()
    });
    socket.on('is_not_typing', async function (data) {
        await User.updateOne({_id: data.userId}, {typingTo: ''});
        await sendUsers()
    });
    socket.on("disconnect", async function (e) {
        const date = Date.now();
        await User.updateOne({_id: userIds[socket.id]}, {isOnline: false, lastOnline: date, typingTo: ''});
        await sendUsers();
        delete userIds[socket.id];
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
