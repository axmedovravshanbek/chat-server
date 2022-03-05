const uuid = require('uuid');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const {User, Token} = require('./models');
const Router = require('express').Router;

const router = new Router();
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.G_USER,
        pass: process.env.G_PASS
    }
});

const sendMail = async (to, link) => {
    transporter.sendMail({
        from: process.env.G_USER,
        to,
        subject: 'Account Activation',
        html:
            `
                <div>
                    <h1>Press the link below to activate your account</h1>
                    <a href="${link}">${link}</a>
                </div>
            `
    }, (e) => {
        if (e) {
            console.log('error while sending email', e);
            return false
        }
        console.log('email sent');
        return true
    });

};
const generateToken = (payload) => {
    const accessToken = jwt.sign(payload, process.env.JWT_ACCESS_TOKEN, {expiresIn: '30m'});
    const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_TOKEN, {expiresIn: '30d'});
    return {accessToken, refreshToken}
};
const saveToken = async (userId, refreshToken) => {
    const tokenData = await Token.findOne({user: userId});
    if (tokenData) {
        tokenData.refreshToken = refreshToken;
        return tokenData.save()
    }
    return await Token.create({user: userId, refreshToken})
};
const validateAccessToken = (token) => {
    try {
        return jwt.verify(token, process.env.JWT_ACCESS_TOKEN)
    } catch (e) {
        return null
    }
};
const validateRefreshToken = (token) => {
    try {
        return jwt.verify(token, process.env.JWT_REFRESH_TOKEN)
    } catch (e) {
        return null
    }
};
const authMiddleware = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json('cdcsdcsdcs')
        }
        const accessToken = authHeader.split(' ')[1];
        if (!accessToken) {
            return res.status(401).json('cdcsdcsdcs')
        }
        const userData = validateAccessToken(accessToken);
        if (!userData) {
            return res.status(401).json('cdcsdcsdcs')
        }
        req.user = userData;
        next()
    } catch (e) {
        console.log(e)
    }
};

router.post('/registration', async (req, res) => {
    try {
        const {email, password} = req.body;
        const candidate = await User.findOne({email});
        if (candidate) {
            return res.status(400).json({
                message: {en: 'user  exists', uz: 'user  exists', ru: 'user exists'},
                errorField: 'email'
            })
        }
        const hashedPassword = await bcrypt.hash(password, 3);
        const activationLink = uuid.v4();
        const user = await User.create({email, password: hashedPassword, activationLink});
        await sendMail(email, `${process.env.API_URL}/api/activate/${activationLink}/`);
        const tokens = generateToken({
            id: user._id,
            email: user.email,
            isActivated: user.isActivated,
        });
        await saveToken(user._id, tokens.refreshToken);

        res.cookie('refreshToken', tokens.refreshToken, {maxAge: 30 * 24 * 60 * 60 * 100, httpOnly: true});

        return res.json({
            // ...tokens,
            user: {
                id: user._id,
                email: user.email,
                isActivated: user.isActivated,
            }
        })
    } catch (e) {
        console.log(e);
        res.json({message: 'catch error'})
    }
});
router.post('/login', async (req, res) => {
    try {
        const {email, password} = req.body;
        const user = await User.findOne({email});
        if (!user) {
            return res.status(400).json({
                message: {en: 'user not exists', uz: 'user not exists', ru: 'user not exists'},
                errorField: 'email'
            })
        }
        const isPasswordTrue = await bcrypt.compare(password, user.password);
        if (!isPasswordTrue) {
            return res.status(400).json({
                message: {en: 'parol xata', uz: 'parol xata', ru: 'parol xata'},
                errorField: 'password'
            })
        }
        const tokens = generateToken({
            id: user._id,
            email: user.email,
            isActivated: user.isActivated,
        });
        await saveToken(user._id, tokens.refreshToken);
        res.cookie('refreshToken', tokens.refreshToken, {maxAge: 30 * 24 * 60 * 60 * 100, httpOnly: true});

        return res.json({
            ...tokens,
            user: {
                id: user._id,
                email: user.email,
                isActivated: user.isActivated,
            }
        })
    } catch (e) {
        console.log(e);
        res.status(401).json({message: 'catch error'})
    }
});
router.post('/logout', async (req, res) => {
    try {
        const {refreshToken} = req.cookies;
        const tokenData = await Token.deleteOne({refreshToken});
        res.clearCookie('refreshToken');
        return res.json({token: tokenData})
    } catch (e) {
        console.log(e);
        res.json({message: 'catch error'})
    }
});
router.get('/refresh', async (req, res) => {
    try {
        const {refreshToken} = req.cookies;
        if (!refreshToken) {
            return res.status(401).json({message: 'refresh token is not found on cookies'})
        }
        const userValidated = validateRefreshToken(refreshToken);
        const tokenFromDB = await Token.findOne({refreshToken});
        if (!userValidated) {
            return res.status(401).json({message: 'token is not validated'})
        }
        if (!tokenFromDB) {
            return res.status(401).json({message: 'refreshToken '})
        }
        const user = await User.findById(userValidated.id);
        const tokens = generateToken({
            id: user._id,
            email: user.email,
            isActivated: user.isActivated,
        });
        await saveToken(user._id, tokens.refreshToken);
        res.cookie('refreshToken', tokens.refreshToken, {maxAge: 30 * 24 * 60 * 60 * 100, httpOnly: true});

        return res.json({
            ...tokens,
            user: {
                id: user._id,
                email: user.email,
                isActivated: user.isActivated,
            }
        })

    } catch (e) {
        console.log(e);
        res.json({message: 'catch error'})
    }
});
router.get('/activate/:link', async (req, res) => {
    try {
        const activationLink = req.params.link;
        const user = await User.findOne({activationLink});
        if (!user) {
            return res.json({message: 'not dis link'});
        }
        user.isActivated = true;
        await user.save();
        return res.redirect(process.env.CLIENT_URL)
    } catch (e) {
        console.log(e);
        res.json({message: 'catch error'});
    }
});
router.get('/users', authMiddleware, async (req, res) => {
    try {
        const users = await User.find();
        res.json(users)
    } catch (e) {
        console.log(e);
        res.json({message: 'catch error'});
    }
});

module.exports = router;
