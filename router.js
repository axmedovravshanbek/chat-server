const Router = require('express').Router;
const {User} = require('./models');

const router = new Router();

router.post('/sign_in', async (req, res) => {
    try {
        const candidate = await User.findOne({email: req.body.email});
        if (candidate) {
            return res.json({user: candidate})
        }
        const user = await User.create(req.body);
        return res.json({user})
    } catch (e) {
        console.log(e);
        res.json({message: 'catch error'})
    }
});
router.post('/set_token', async function (req, res) {
    try {
        const {_id, fcmToken} = req.body;
        if (_id !== undefined) {
            await User.updateOne({_id}, {fcmToken});
            return res.status(200)
        } else res.json({message: 'catch error', error: e})
    } catch (e) {
        console.log(e);
        res.json({message: 'catch error', error: e})
    }
});
router.get('/users', async (req, res) => {
    try {
        const users = await User.find();
        await res.json(users)
    } catch (e) {
        console.log(e);
        await res.json({message: 'catch error'});
    }
});

module.exports = router;
