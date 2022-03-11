const {Schema, model} = require('mongoose');

const User = new Schema({
    email: {type: String, required: true, unique: true},
    username: {type: String, default: 'username'},
    // fullName: {type: String, default: 'full name'},
    socketId: {type: String, default: ''},
    fullName: {type: String, required: true},
    password: {type: String, required: true},
    isActivated: {type: Boolean, default: false},
    activationLink: {type: String},
    imgSrc: {type: String, default: ''},
    lastOnline: {type: Number, default: new Date()},
    isOnline: {type: Boolean, default: false},
    typingTo: {type: String, default:''}
});

const Token = new Schema({
    user: {type: Schema.Types.ObjectId, ref: 'User'},
    refreshToken: {type: String, required: true},
});

const Message = new Schema({
    senderId: {type: Schema.Types.ObjectId, ref: 'User', required: true},
    receiverId: {type: Schema.Types.ObjectId, ref: 'User', required: true},
    msgContent: {type: String, required: true},
    sentTime: {type: Number, default: new Date()},
    msgType: {type: String, default: 'text'},
    room: {type: String, default: 'text'},
    deliveryStatus: {type: Number, default: 1}
});

module.exports.User = model('User', User);
module.exports.Token = model('Token', Token);
module.exports.Message = model('Message', Message);
