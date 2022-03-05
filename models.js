const {Schema, model} = require('mongoose');

const User = new Schema({
    email: {type: String, required: true, unique: true},
    username: {type: String, default: 'username'},
    fullName: {type: String, default: 'full name'},
    // username: {type: String, unique: true, required: true},
    // fullName: {type: String, required: true},
    password: {type: String, required: true},
    isActivated: {type: Boolean, default: false},
    activationLink: {type: String},
    imgSrc: {type: String, default: ''},
    lastOnline: {type: Number, default: Date.now()},
    isOnline: {type: Boolean, default: false},
    typingTo: {type: String, default:''}
    // typingTo: {type: Schema.Types.ObjectId, ref: 'User'}
});

const Token = new Schema({
    user: {type: Schema.Types.ObjectId, ref: 'User'},
    refreshToken: {type: String, required: true},
});

const Message = new Schema({
    senderId: {type: Schema.Types.ObjectId, ref: 'User', required: true},
    receiverId: {type: Schema.Types.ObjectId, ref: 'User', required: true},
    sentTime: {type: Number, required: true},
    msgType: {type: String, required: true},
    deliveryStatus: {type: Number, default: 1},
    msgContent: {type: String, required: true}
});

module.exports.User = model('User', User);
module.exports.Token = model('Token', Token);
module.exports.Message = model('Message', Message);
