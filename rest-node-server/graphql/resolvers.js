const User = require('../models/user');
const bcrypt = require('bcryptjs');
const validator = require('validator');
const jwt = require('jsonwebtoken');
const Post = require('../models/post');
module.exports = {
    createUser: async function (args, req) {
        const userInput = args.userInput;
        console.log(userInput)
        const errors = []

        if (!validator.isEmail(userInput.email)){
            errors.push({message: 'E-Mail is invalid.'});
        }
        if (validator.isEmpty(userInput.password) || !validator.isLength(userInput.password, {min: 5})) {
            console.log(userInput.password)
            errors.push({message: 'Password too short.'})
        }
        if (errors.length > 0) {
            console.log(errors)
            const error = new Error('Invalid input.');
            errors.data = errors;
            error.code = 422;
            throw error;
        }

        const email = userInput.email;

        // return User.findOne().then().catch();
        const existingUser = await User.findOne({email: email})
        if (existingUser) {
            const error = new Error('User exists already!');
            throw error;
        }
        const hashedPw = await bcrypt.hash(userInput.password, 12)
        const user = new User({
            email: userInput.email,
            name: userInput.name,
            password: hashedPw
        })
        const createdUser = await user.save();
        return {...createdUser._doc, _id: createdUser._id.toString()};

    },

    login: async (args) => {
        const user = await User.findOne({email: args.email});
        if (!user) {
            const error = new Error("User not found.");
            error.code = 401;
            throw error;
        }
        const isEqual = await bcrypt.compare(args.password, user.password);
        if (!isEqual) {
            const error = new Error("Passwords is incorrect.");
            error.code = 401;
            throw error;
        }
        const token = jwt.sign({
            userId: user._id.toString(),
            email: user.email
        }, 'secret', {expiresIn: '1h'});

        return {
            token: token,
            userId: user._id.toString()
        }
    },

    createPost: async function(args, req) {
        if (!req.isAuth) {
            const error = new Error('Not authenticated');
            error.code = 401;
            throw error;
        }

        const title = args.title;
        const content = args.content
        const imageUrl = args.imageUrl;

        const errors = [];
        if (validator.isEmpty(title) || !validator.isLength(title, {min: 5})) {
            errors.push({
                message: "Title is invalid"
            })
        }
        if (validator.isEmpty(content) || !validator.isLength(content, {min: 5})) {
            errors.push({
                message: "Title is invalid"
            })
        }
        if (errors.length > 0) {
            console.log(errors)
            const error = new Error('Invalid input.');
            errors.data = errors;
            error.code = 422;
            throw error;
        }
        const user = await User.findById(req.userId);
        if (!user) {
            const error = new Error("Not a user.");
            error.code = 401;
            throw error;
        }
        const post = new Post({
            title: title,
            content: content,
            imageUrl: imageUrl,
            creator: user
        })
        const createdPost = await post.save();
        user.posts.push(createdPost);
        await user.save();
        return {
            ...createdPost._doc,
            _id: createdPost._id.toString(),
            createdAt: createdPost.createdAt.toISOString(),
            updatedAt: createdPost.updatedAt.toISOString()
        }

    },

    posts: async function(args, req) {
        if (!req.isAuth) {
            const error = new Error('Not authenticated');
            error.code = 401;
            throw error;
        }
        // insert pagination here
        const totalPosts = await Post.find().countDocuments();
        console.log(totalPosts)
        const posts = await Post.find()
            .sort({ createdAt: -1})
            .populate('creator');
        return {
            posts: posts.map(
                p => {
                    return {...p._doc, _id: p._id.toString(), createdAt: p.createdAt.toISOString(), updatedAt: p.updatedAt.toISOString()}
                }
            ),
            totalPosts: totalPosts
        }
    }
}