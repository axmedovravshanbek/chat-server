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
        user: 'ahmedovravshanbek21@gmail.com',
        pass: 'axmedov312'
    }
});

const sendMail = async (to, link) => {
    transporter.sendMail({
        from: 'ahmedovravshanbek21@gmail.com',
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
    const refreshToken = jwt.sign(payload, 'air-fun-refresh-key', {expiresIn: '30d'});
    return {refreshToken}
};
const saveToken = async (userId, refreshToken) => {
    const tokenData = await Token.findOne({user: userId});
    if (tokenData) {
        tokenData.refreshToken = refreshToken;
        return tokenData.save()
    }
    return await Token.create({user: userId, refreshToken})
};
const validateRefreshToken = (token) => {
    try {
        return jwt.verify(token, 'air-fun-refresh-key')
    } catch (e) {
        return null
    }
};

router.post('/registration', async (req, res) => {
    try {
        const {email, password, fullName, imgSrc} = req.body;
        const candidate = await User.findOne({email});
        if (candidate) {
            return res.status(400).json({
gi                message: {en: 'User already exists', uz: 'Foydalanuvchi allaqachon mavjud', ru: 'Пользователь уже существует'},
                errorField: 'email'
            })
        }
        const hashedPassword = await bcrypt.hash(password, 3);
        const activationLink = uuid.v4();
        const user = await User.create({
            email,
            fullName,
            imgSrc,
            password: hashedPassword,
            activationLink
        });
        await sendMail(email, `https://airfun-b.herokuapp.com/api/activate/${activationLink}/`);
        const tokens = generateToken({
            _id: user._id,
            email: user.email,
            isActivated: user.isActivated,
            fullName: user.fullName,
            imgSrc: user.imgSrc,
            activationLink: user.activationLink
        });
        await saveToken(user._id, tokens.refreshToken);

        return res.json({
            ...tokens,
            user: {
                _id: user._id,
                email: user.email,
                isActivated: user.isActivated,
                fullName: user.fullName,
                imgSrc: user.imgSrc,
                activationLink: user.activationLink
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
                message: {en: 'User not found', uz: 'Foydalanuvchi topilmadi', ru: 'Пользователь не найден'},
                errorField: 'email'
            })
        }
        const isPasswordTrue = await bcrypt.compare(password, user.password);
        if (!isPasswordTrue) {
            return res.status(400).json({
                message: {en: 'Wrong password', uz: 'Noto\'g\'ri parol', ru: 'Неправильный пароль'},
                errorField: 'password'
            })
        }
        const tokens = generateToken({
            _id: user._id,
            email: user.email,
            isActivated: user.isActivated,
            fullName: user.fullName,
            imgSrc: user.imgSrc,
            activationLink: user.activationLink
        });
        await saveToken(user._id, tokens.refreshToken);

        return res.json({
            ...tokens,
            user: {
                _id: user._id,
                email: user.email,
                isActivated: user.isActivated,
                fullName: user.fullName,
                imgSrc: user.imgSrc,
                activationLink: user.activationLink
            }
        })
    } catch (e) {
        console.log(e);
        res.status(401).json({message: 'catch error'})
    }
});
// router.post('/logout', async (req, res) => {
//     try {
//         const {refreshToken} = req.cookies;
//         const tokenData = await Token.deleteOne({refreshToken});
//         return res.json({token: tokenData})
//     } catch (e) {
//         console.log(e);
//         res.json({message: 'catch error'})
//     }
// });
router.get('/refresh', async (req, res) => {
    try {
        const refreshToken = req.headers.authorization.split(' ')[1];
        if (!refreshToken) {
            return res.status(401).json({
                message: `refresh token is not found`
            })
        }
        const userValidated = validateRefreshToken(refreshToken);
        const tokenFromDB = await Token.findOne({refreshToken});
        if (!userValidated) {
            return res.status(401).json({message: 'token is not validated'})
        }
        if (!tokenFromDB) {
            return res.status(401).json({message: 'refreshToken '})
        }
        const user = await User.findById(userValidated._id);
        const tokens = generateToken({
            _id: user._id,
            email: user.email,
            isActivated: user.isActivated,
            fullName: user.fullName,
            imgSrc: user.imgSrc,
            activationLink: user.activationLink
        });
        await saveToken(user._id, tokens.refreshToken);

        return res.json({
            refTok: refreshToken,
            ...tokens,
            user: {
                _id: user._id,
                email: user.email,
                isActivated: user.isActivated,
                fullName: user.fullName,
                imgSrc: user.imgSrc,
                activationLink: user.activationLink
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
        return res.redirect('http://192.168.0.104:3000')
    } catch (e) {
        console.log(e);
        res.json({message: 'catch error'});
    }
});
router.get('/users', async (req, res) => {
    try {
        const users = await User.find();
        res.json(users)
    } catch (e) {
        console.log(e);
        res.json({message: 'catch error'});
    }
});

module.exports = router;
