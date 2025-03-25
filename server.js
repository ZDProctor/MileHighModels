// server.js

const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const helmet = require('helmet'); // Optional: For security
const favicon = require('serve-favicon'); // Middleware for favicon

/******* Auth and Sessions */
const bcrypt = require('bcrypt');
const session = require('express-session');

// Specify the path to the .env file
dotenv.config(); //{ path: path.resolve(__dirname, '../.env') });
// Make the routes after you configure the environment
const routes = require('./routes'); // Import the routes

const app = express();
const PORT = process.env.PORT || 3000;

/******** Setup Session */
const SECURE_KEY = process.env.PORT
app.use(session({
    secret: SECURE_KEY,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // Set true if using HTTPS
  }));

// Set EJS as the templating engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'web/views'));

// Middleware Setup
  
app.use(helmet());
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files
// Serve favicon using serve-favicon middleware
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));

// Setup urlencoded forms
app.use(express.urlencoded({ extended: true }));

// Middleware to populate res.locals
app.use((req, res, next) => {
    // Any session vars you want globally accessible in EJS:
    res.locals.UserID = req.session.UserID || null;
    res.locals.FirstName = req.session.FirstName || null;
    res.locals.LastName = req.session.LastName || null;  
    next();
  });

// Use the imported routes
app.use('/', routes);


// 404 Handler (Optional: If not handled in routes.js)
app.use((req, res, next) => {
    res.status(404).send('Page Not Found');
//    res.status(404).render('404', { title: 'Page Not Found' });
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

// Start the Server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
