const { validationResult } = require('express-validator');
const fs = require('fs');
const io = require('../socket');
const Post = require('../models/post');
const User = require('../models/user');

exports.getPosts = async (req, res, next) => {
    const page = req.query.page || 1;
    const perPage = 2;

    try{
        const totalItems = await Post.find().countDocuments();
        const posts = await Post.find()
            .populate('creator')
            .sort({createdAt: -1})
            .skip((page - 1) * perPage)
            .limit(perPage)
        res.status(200)
        .json({
            posts: posts,
            totalItems: totalItems
        });
            
    } catch (err) {
        const error = new Error('Could not get documents.');
        error.statusCode = 500;
        next(err);
    }
    // const page = req.query.page || 1;
    // const perPage = 2;
    // Post
    //     .find()
    //     .countDocuments()
    //     .then(numDocs => {
    //         Post.find()
    //             .populate('creator')
    //             .skip((page - 1) * perPage)
    //             .limit(perPage)
    //             .then(posts => {
    //                 res.status(200)
    //                 .json({
    //                     posts: posts,
    //                     totalItems: numDocs
    //                 })
    //             })
    //             .catch(err => {
    //                 if (!err.status) {
    //                     err.statusCode = 500;
    //                 }
    //                 next(err);
    //             })            
    //     })
    //     .catch(err => {
    //         const error = new Error('Could not get documents.');
    //         error.statusCode = 500;
    //         next(err);
    //     })


};

exports.createPost = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const error = new Error('Validation failed. Entered data is incorrect');
        error.statusCode = 422;
        throw error;
    };
    if (!req.file) {
        const error = new Error('Image has not been given');
        error.statusCode = 422;
        throw error;
    }
    const userId = req.userId;
    const imageUrl = req.file.path;
    const title = req.body.title;
    const content = req.body.content;
    let creator;

    // create new post
    const post = new Post({
        title: title,
        content: content,
        imageUrl: imageUrl,
        creator: userId,
    });
    post.save()
    .then(result => {
        return User.findById(req.userId);
    })
    .then(user => {
        console.log(user)
        creator = user;
        user.posts.push(post);
        user.save()

    .then(result => {
            io.getIO().emit('posts', {
                action: 'create',
                post: {...post._doc, creator: {_id: req.userId, name: user.name}}
            });
            
            res.status(201)
                .json({
                    message: 'Post craeted successfully',
                    post: post,
                    creator: {_id:creator._id, name: creator.name}
                });
        })        
    })
    .catch(err => {
        if (!err.status) {
            err.statusCode = 500;
        }
        next(err);
    });
}

exports.getPost = (req, res, next) => {
    const postId = req.params.postId; // in url so params
    Post.findById(postId)
        .then(post => {
            if (!post) {
                const error = new Error('Invalid post ID.')
                error.statusCode(404);
                throw error;
            }
            post.imageUrl = convertPostUrl(post.imageUrl)
            res.status(200)
                .json({post: post})
        })
        .catch(err => {
            if (!err.statusCode){
                err.statusCode = 500;
            }
            next(err);
        })
}

exports.updatePost = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const error = new Error('Validation failed. Entered data is incorrect');
        error.statusCode = 422;
        throw error;
    };

    const postId = req.params.postId;
    const title = req.body.title;
    const content = req.body.content;

    let imageUrl
    if (req.file) {
        console.log(req.file)
        imageUrl = req.file.path;
        
    } else {
        imageUrl = null;
    }
    
    Post.findById(postId).populate('creator')
        .then( post => {
            if (!post) {
                const error = new Error('Could not find post');
                error.statusCode = 404;
                throw error;
            }
            if (post.creator._id.toString() !== req.userId) {
                const error = new Error('Not Authorised');
                error.statusCode = 403;
                throw error;
            }

            if (imageUrl !== post.imageUrl && imageUrl !== null){
                deleteImage(post.imageUrl);
            }
            
            // found post
            post.title = title;
            if (imageUrl){
                post.imageUrl = imageUrl;
            }
            
            post.content = content;
            return post.save();

        })
        .then(result => {
            io.getIO().emit('posts', {
                action: 'update',
                post: result
            });
            res.status(200)
                .json({post: result})
        })
        .catch(err => {
            if (!err.statusCode) {
                err.statusCode = 500;
                
            }
            next(err);
        })


}

exports.deletePost = (req, res, next) => {
    const postId = req.params.postId;
    Post.findById(postId)
        .then(post => {
            if (!post) {
                const error = new Error('Invalid post ID.')
                error.statusCode(404);
                throw error;
            }
            if (post.creator.toString() !== req.userId) {
                const error = new Error('Not Authorised');
                error.statusCode = 403;
                throw error;
            }
            deleteImage(post.imageUrl);
            return Post.findByIdAndRemove(postId);

        })
        .then(result => {
            console.log(result);
            return User.findById(req.userId);

        })
        .then(user => {
            user.posts.pull(postId);
            return user.save();
        })
        .then(result => {
            io.getIO().emit('posts', {
                action: 'delete',
                post: postId
            })
            res.status(200)
                .json({message: 'Post deleted.'})            
        })
        .catch(err => {
            if (!err.statusCode) {
                err.statusCode = 500;
            }
            next(err);
        })
}

const deleteImage = (filepath) => { // this will probably fail because of how paths seem to be weird here.
    fs.unlink(filepath, err=> console.log(err));
}

const convertPostUrl = (fullUrl) => {
    let imageUrl = fullUrl.split("\\").splice(-1)[0]
    imageUrl = 'images/' + imageUrl;
    return imageUrl
}
