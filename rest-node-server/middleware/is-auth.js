const jwt = require('jsonwebtoken');

/*Checks headers for authorization tokens! */
module.exports = (req, res, next) => {
    const authHeader = req.get('Authorization');
    if (!authHeader) {
        req.isAuth = false;
        return next();
    }

    const token = req.get('Authorization').split(' ')[1]; // gets Bearer iujtnsgjkndjkgnr 
    let decodedToken;

    try {
        decodedToken = jwt.verify(token, 'secret');
    } catch (err) {
        req.isAuth = false;
        return next();
    }

    if (!decodedToken) {
        req.isAuth = false;
        return next();
    }

    req.userId = decodedToken.userId;
    req.isAuth = true;
    next();

};