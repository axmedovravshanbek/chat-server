const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const {Types} = require('mongoose');
const express = require('express');
const router = require('./router');
const cors = require('cors');
const http = require("http");
const {Server} = require("socket.io");
const {User, Message} = require('./models');
var session = require('express-session');
var cookieSession = require('cookie-session');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 80;
const io = new Server(server, {
    cors: {
        origin: 'http://192.168.0.104:3000',
        methods: ["GET", "POST", "OPTIONS"],
    },
});


app.use(express.json());
app.use(cookieParser());
app.use(cookieSession({
    name: 'session',
    secureProxy:true,
    keys: ['secret keys'],
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
}));
app.use(cors({
    credentials: true,
    origin: 'http://192.168.0.104:3000'
}));
app.use(session({
    secret: 'air-fun',
    resave: true,
    saveUninitialized: true,
    proxy: true,
    cookie: {
        sameSite: 'none',
        secure: true
    },
}));
app.use('/api', router);
app.get('/', (req, res)=>{
    res.json({message:'hello'})
});


io.on('connection', async (socket) => {
    socket.join('all');

    socket.on('imOnline', async (myId) => {
        await User.updateOne({_id: myId}, {isOnline: true, socketId: socket.id}, {upsert: true});
        const sendUnread = async (RSId, userId = myId) => {
            const unread = await Message.aggregate([
                {$match: {$and: [{receiverId: Types.ObjectId(userId)}, {deliveryStatus: 1}]}},
                {$group: {_id: "$senderId", count: {$sum: 1}, lastTime: {$max: "$sentTime"}}}
            ]);
            if (!RSId) {
                return socket.emit('unreadMessages', unread);
            }
            socket.to(RSId).emit('unreadMessages', unread)

        };
        const myChats = await Message.aggregate([
            {$match: {$or: [{receiverId: Types.ObjectId(myId)}, {senderId: Types.ObjectId(myId)}]}},
            {
                $lookup: {
                    from: 'users',
                    localField: 'senderId',
                    foreignField: '_id',
                    as: 'sender'
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'receiverId',
                    foreignField: '_id',
                    as: 'receiver'
                }
            },
            {$unwind: '$receiver'},
            {$unwind: '$sender'},
            {
                $group: {
                    _id: "$room",
                    receiver: {$first: "$receiver"},
                    sender: {$first: "$sender"},
                    lastMessage: {
                        $last: {
                            msgContent: "$msgContent",
                            deliveryStatus: "$deliveryStatus",
                            msgType: "$msgType",
                            sentTime: "$sentTime"
                        }
                    },
                }
            }
        ]);
        socket.emit('myChats', myChats);
        const allUsers = await User.find();
        socket.emit('allUsers', allUsers);
        socket.to('all').emit('allUsers', allUsers);
        const myMessages = await Message.find({$or: [{senderId: myId}, {receiverId: myId}]});
        socket.emit('myMessages', myMessages);
        await sendUnread();

        socket.on('iSentMessage', async (data) => {
            await new Message({
                ...data,
                room: myId.localeCompare(data.receiverId) === 1 ? `${data.receiverId}${myId}` : `${myId}${data.receiverId}`
            }).save();

            const myMessages = await Message.find({$or: [{senderId: myId}, {receiverId: myId}]});
            socket.emit('myMessages', myMessages);

            const hisMessages = await Message.find({$or: [{senderId: data.receiverId}, {receiverId: data.receiverId}]});
            socket.to(data.RSId).emit('myMessages', hisMessages);

            await sendUnread(data.RSId, data.receiverId)
        });
        socket.on('iRead', async function ({receiverId, senderId, RSId}) {
            const readChanges = await Message.updateMany({receiverId, senderId}, {deliveryStatus: 2});
            if (readChanges.modifiedCount) {

                const myMessages = await Message.find({$or: [{senderId: myId}, {receiverId: myId}]});
                socket.emit('myMessages', myMessages);

                const hisMessages = await Message.find({$or: [{senderId: senderId}, {receiverId: senderId}]});
                socket.to(RSId).emit('myMessages', hisMessages);

                await sendUnread()
            }
        });
        socket.on('imTyping', async ({receiverId = '', RSId}) => {
            await User.updateOne({_id: myId}, {typingTo: receiverId});
            const allUsers = await User.find();
            socket.to(RSId).emit('allUsers', allUsers);
        });
        socket.on('disconnected', async () => {
            const date = Date.now();
            await User.updateOne({_id: myId}, {
                isOnline: false,
                socketId: '',
                lastOnline: date,
                typingTo: ''
            });
            const allUsers = await User.find();
            socket.to('all').emit('allUsers', allUsers);
        });
    });
    socket.on('disconnect', async () => {
        const date = Date.now();
        await User.updateOne({socketId: socket.id}, {
            isOnline: false,
            // socketId: '',
            lastOnline: date,
            typingTo: ''
        });
        const allUsers = await User.find();
        socket.to('all').emit('allUsers', allUsers);
    });
});
const start = async () => {
    try {
        await mongoose.connect('mongodb+srv://airfun:airfun@cluster0.gggz2.mongodb.net/auth?retryWrites=true&w=majority', {
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
