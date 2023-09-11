const MONGODB_URI = 'mongodb+srv://vjmartinezt01:m3metatronmongodb@cluster0.eyvuzz3.mongodb.net/feeds?retryWrites=true&w=majority'

const path = require('path');
const fs = require('fs');
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const multer = require('multer');

const { graphqlHTTP } = require("express-graphql")
const graphqlSchema = require('./graphql/schema');
const graphqlResolver = require('./graphql/resolvers');
const auth = require('./middleware/is-auth');

const app = express();
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        const location = path.join(__dirname, 'images');
        cb(null, location);
    },
    filename: function(req, file, cb) {
        cb(null, file.originalname);
    }
});

const filter = (req, file, cb) => {
    if (file.mimetype === 'image/png' || file.mimetype === 'image/jpeg'  || file.mimetype === 'image/jpg' ) {
        cb(null, true); // valid file
    }
    else {
        cb(null, false);
    }
}

// app.use(bodyParser.urlencoded()) // x-www-form-urlencoded <form>
app.use(bodyParser.json())
app.use(multer({storage: storage, fileFilter: filter}).single('image'))
app.use('/images', express.static(path.join(__dirname, 'images')));

// enable CORS
app.use((req, res, next) => {
    console.log(req.url);
    res.setHeader('Access-Control-Allow-Origin', '*'); // 'app.net, server.set'
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATH, DELETE', "OPTIONS");
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === "OPTIONS") {
        return res.sendStatus(200);
    }
    next();
});

app.use(auth);

app.use('/graphql', graphqlHTTP({
    schema: graphqlSchema,
    rootValue: graphqlResolver,
    graphiql: true, // can test on host/graphql in browser now
    customFormatErrorFn(err) {
        if (!err.originalError) {
            return err;
        }
        const data = err.originalError.data;
        const message = err.message || 'An error occurred';
        const code = err.originalError.code || 500;
        return {message: message, status: code, data: data};
    }
}));
// # mutation {
// #  createUser(userInput: {email:"test@test.com", name:"Vince Test", password:"testtesttest"}) {
// #    _id
// #    email
// #  }



// general error handling -> can now just throw errors in other routes.
app.use((error, req, res, next) => {
    console.log(error);
    const status = error.statusCode || 500;
    const message = error.message;
    const data = error.data;
    res.status(status).json({message: message, data: data});
});

mongoose.connect(MONGODB_URI)
    .then(result=> {
        app.listen(8080);

    })
    .catch(err=> console.log(err));

