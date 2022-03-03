require('dotenv').config();
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const express = require('express');
const router = require('./router');
const cors = require('cors');

const PORT = process.env.PORT || 80;
const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(cors({
    credentials: true,
    origin: process.env.CLIENT_URL
}));
app.use('/api', router);

const start = async () => {
    try {
        await mongoose.connect(process.env.DB_URL, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        app.listen(PORT, console.log(`started on ${PORT}`))
    } catch (e) {
        console.log(e)
    }
};

start();
