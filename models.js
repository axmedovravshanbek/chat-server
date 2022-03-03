const {Schema, model} = require('mongoose');

const User = new Schema({
    email: {type: String, required: true, unique: true},
    password: {type: String, required: true},
    isActivated: {type: Boolean, default: false},
    activationLink: {type: String},
});
const Token = new Schema({
    user: {type: Schema.Types.ObjectId, ref: 'User'},
    refreshToken: {type: String, required: true},
});
//


module.exports.User = model('User', User);
module.exports.Token = model('Token', Token);
