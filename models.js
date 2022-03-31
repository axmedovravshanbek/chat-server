const {Schema, model} = require('mongoose');

const User = new Schema({
    email:      {type: String,  required: true, unique: true},
    givenName:  {type: String,  required: true},
    familyName: {type: String,  required: true},
    imageUrl:   {type: String,  required: true},

    typingTo:   {type: String,  default: ''},
    fcmToken:   {type: String,  default: ''},
    socketId:   {type: String,  default: ''},
    lastOnline: {type: Number,  default: new Date()},
    isOnline:   {type: Boolean, default: true}
});

const Message = new Schema({
    senderId:       {type: Schema.Types.ObjectId, ref: 'User', required: true},
    receiverId:     {type: Schema.Types.ObjectId, ref: 'User', required: true},
    msgContent:     {type: String, required: true},
    sentTime:       {type: Number, default: new Date()},
    msgType:        {type: String, default: 'text'},
    deliveryStatus: {type: Number, default: 1}
});

module.exports.User = model('User', User);
module.exports.Message = model('Message', Message);
