const User = require('../models/user');
const bcrypt = require('bcryptjs');
const {validationResult} = require('express-validator')
const jwt = require('jsonwebtoken');

exports.signUp = (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        const error = new Error('Validation Errors');
        error.statusCode = 422;
        error.data = errors.array();
        throw error;
    }

    const email = req.body.email;
    const name = req.body.name;
    const password = req.body.password;

    bcrypt.hash(password, 12)
        .then(hashedPassword => {
            const user = new User({
                email: email,
                password: hashedPassword,
                name: name
            });
            return user.save();
        })
        .then(result => {
            res.status(201)
                .json({message: 'User created', userId: result._id});
        })
        .catch((err) => {
            if (!err.statusCode) {
                err.statusCode = 500;
            }
            next(err);
        });

};

exports.login = (req, res, next) => {
    const email = req.body.email;
    const password = req.body.password;
    let loadedUser;

    User.findOne({email: email})
        .then(user => {
            if (!user) {
                const error = new Error('User with this email could not be found.')
                error.statusCode = 401;
                throw error;
            }
            console.log("Checking user");
            loadedUser = user;
            return bcrypt.compare(password, loadedUser.password);

        })
        .then(isEqual => {
            if (!isEqual) {
                const error = new Error('Wrong password');
                error.statusCode = 401;
                throw error;
            }
            console.log("Creating JWT");
            const token = jwt.sign({
                email: loadedUser.email,
                userId: loadedUser._id.toString()
            }, 
            'secret', 
            {expiresIn: '1h'});

            res.status(200)
                .json({
                    token: token,
                    userId: loadedUser._id.toString()
                });

        })
        .catch(err => {
            if (!err.statusCode) {
                err.statusCode = 500;
            }
            next(err);
        })

}

exports.getUserStatus = async (req, res, next) => {
    try {
      const user = await User.findById(req.userId);
      if (!user) {
        const error = new Error('User not found.');
        error.statusCode = 404;
        throw error;
      }
      res.status(200).json({ status: user.status });
    } catch (err) {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    }
  };

exports.updateUserStatus = async (req, res, next) => {
const newStatus = req.body.status;
try {
    const user = await User.findById(req.userId);
    if (!user) {
    const error = new Error('User not found.');
    error.statusCode = 404;
    throw error;
    }
    user.status = newStatus;
    await user.save();
    console.log("HERE")
    res.status(200).json({ message: 'User updated.' });
} catch (err) {
    if (!err.statusCode) {
    err.statusCode = 500;
    }
    next(err);
}
};