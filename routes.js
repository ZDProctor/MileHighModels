// Routesetting
// Like a Rock Climber
// Zach P
// 4/3/2025

const express = require("express");
const isAuthenticated = require("./authMiddleware");
const router = express.Router();
const app = express();
const pool = require("./db"); // Import the database connection pool
const bcrypt = require("bcrypt");
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Helper function to map URL path to PageName
const getPageName = (path) => {
    if (path === "/" || path === "/index.htm") {
        return "index";
    }
    // Remove leading slash and append '.htm'
    return path.startsWith("/") ? path.slice(1) : path;
};

// List of paths to exclude from the wildcard route
const excludedPaths = ["/favicon.ico", "/robots.txt"]; // Add more if needed

// A logout of all sessions hanlder
router.get("/logout", (req, res) => {
    // Destroy the session
    req.session.destroy((err) => {
        if (err) {
            console.error("Session destruction error:", err);
            return res.status(500).send("Could not log out. Please try again.");
        }
        // Clear the session ID cookie in the user's browser
        // This happens automatically if `saveUninitialized`/`resave` is handled properly, 
        // but you can also manually do:
        // res.clearCookie('connect.sid'); // If needed, depending on your configuration

        // Redirect user to login or home page
        res.redirect("/");
    });
});


// New User Registration
router.post("/register", async (req, res, next) => {
    try {

        const firstName = req.body.firstName;
        const lastName = req.body.lastName;
        const email = req.body.email;
        const pwd = req.body.password;

        if (firstName && lastName && email && pwd) {
            // Enter as new user in DB
            // 1. Encrypt (hash) the password using bcrypt
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(pwd, saltRounds);

            // 2. Store the hashed password in the database
            // Example using a hypothetical User model (Mongoose or similar):
            // const newUser = new User({ firstName, lastName, email, password: hashedPassword });
            // await newUser.save();

            // If using a generic DB query, it might look like:
            // const qry = `INSERT INTO user (firstName, lastName, email, password) VALUES (${firstName}, ${lastname}, ${email}, ${hashedPassword})`

            // SP to add new user

            await pool.query("CALL user_create(?,?,?,?)", [email, hashedPassword, firstName, lastName]);

            // 3. Send a success response
            return res.redirect('login');
        }

        // If required fields are missing
        return res.status(400).send("Missing fields in request body");

    } catch (err) {
        console.error(`Error writing content:`, err);
        res.status(500).send("Internal Server Error");
    }
});

router.get("/register", async (req, res, next) => {
    try {
        const pagePath = req.path;
        const pageName = getPageName(pagePath);

        console.log(`Handling request for: ${pagePath}`);

        res.render("reg");
    } catch (err) {
        console.error(`Error fetching content for ${pageName}:`, err);
        res.status(500).send("Internal Server Error");
    }
});


// Login
router.post("/login", async (req, res, next) => {
    try {
        const email = req.body.email;
        const pwd = req.body.password;

        if (!email || !pwd) {
            return res.status(400).send("Missing fields in request body");
        }

        // 1. Retrieve the user record from DB (including hashed password).
        const [rows] = await pool.query("CALL user_getByEmail(?)", [email]);
        //console.log("rows:", JSON.stringify(rows, null, 2)); // Debugging log
        //console.log(rows);
        //console.log(rows[0]);
        //console.log(rows[0].UserID);
        // 2. Verify user exists and retrieve the row object.
        if (rows && rows[0][0].UserID) {
            const user = rows[0][0]; // user should have { UserID, Email, Pwd, ... }
            const isMatch = await bcrypt.compare(pwd, user.HashedPassword);
            if (isMatch) {
                // Good login
                req.session.UserID = user.UserID; // store ID in session
                req.session.FirstName = user.FirstName; // store ID in session
                req.session.LastName = user.LastName; // store ID in session
                //res.locals.UserID = user.UserID; // store ID in session
                //res.locals.FirstName = user.FirstName; // store ID in session
                //res.locals.LastName = user.LastName; // store ID in session

                await pool.query("CALL user_loginUser(?, ?)", [email, pwd]); // SP to log user in

                return res.redirect("/dashboard");
            }
            if (!isMatch) {
                // Bad password
                return res.redirect("?err=BadLogin");
            }
        } else {
            // No user found for that email
            return res.redirect("?err=BadLogin");
        }

    } catch (err) {
        console.error(`Error during login:`, err);
        res.status(500).send("Internal Server Error");
    }
});

router.post("/neworder", async (req, res, next) => {
    try {
        const user = req.body.user; // Assuming order data is sent in the request body
        const userID = req.session.UserID; // Get the user ID from the session
        console.log(`userID:`, userID); // Debugging log
        console.log("new order post body: " + JSON.stringify(req.body, null, 2)); // Debugging log

        const lines = req.body.lines;
        const reqDate = req.body.reqDate;
        const comment = req.body.comments || ''; // Retrieve comments from the form

        // Validate and process orderData as needed
        // For example, you might want to check if all required fields are present

        // Call stored procedure to create a new order
        await pool.query("CALL orders_create(?, ?, ?, ?)", [userID, reqDate, comment, null]); //Always leave lines null

        for (let i = 0; i < req.body.model.length; i++) {
            const model = req.body.model[i];
            const qty = req.body.quantity[i];

            // Call stored procedure to add order line
            await pool.query("CALL orders_createDetails(?, ?, ?)", [model, qty, i]);
        }
        res.redirect("/dashboard");
    } catch (err) {
        console.error(`Error creating new order:`, err);
        res.status(500).send("Internal Server Error");
    }
});

// Protect all routes starting with /Dashboard
router.use("/dashboard", isAuthenticated);
router.get("/dashboard", async (req, res, next) => {
    try {
        const [rows] = await pool.query("CALL orders_getUserOrders(?)", [req.session.UserID]);
        console.log("Dashboard rows[0]:")
        console.log(rows[0]);
        res.render('dashboard', { orders: rows }); // Pass the orders to the EJS template
    } catch (err) {
        console.error(`Error fetching content:`, err);
        res.status(500).send("Internal Server Error");
    }
});

router.use("/neworder", isAuthenticated);
router.get("/neworder", async (req, res, next) => {
    try {
        const pagePath = req.path;
        const pageName = getPageName(pagePath);
        const [rows] = await pool.query("CALL products_listAll()");

        console.log(`Handling request for: ${pagePath}`);
        //console.log(`rows:`, JSON.stringify(rows, null, 2)); // Debugging log

        res.render("neworder", { products: rows[0] });
    } catch (err) {
        console.error(`Error fetching content for page`, err);
        res.status(500).send("Internal Server Error");
    }
});

router.get("/invoice", async (req, res, next) => {
    try {
        const invoiceId = req.query.id || 0;

        // Fetch invoice details from the database
        const [rows] = await pool.query("CALL orders_invoiceDetails(?, ?)", [invoiceId, req.session.UserID]);

        console.log("Invoice rows:");
        console.log(rows);

        // Generate the PDF
        const doc = new PDFDocument();
        //public\invoices
        //C:\Download\Principia\CSCI\WebDev\Projects\ModelsProject\MileHighModels\public\invoices
        const pdfPath = path.join(__dirname, `/public/invoices/invoice_${invoiceId}_${Date.now()}.pdf`); console.log("PDF Path:", pdfPath);
        const writeStream = fs.createWriteStream(pdfPath);

        doc.pipe(writeStream);

        // Add invoice details to the PDF
        doc.fontSize(20).text('Invoice', { align: 'center' });
        doc.moveDown();
        doc.fontSize(14).text(`Order Number: ${invoiceId}`);
        doc.text(`Order Date: ${rows[0][0].orderDate.toISOString().split('T')[0]}`);
        doc.text(`Customer Name: ${req.session.FirstName} ${req.session.LastName}`);
        doc.text(`Status: ${rows[0][0].status}`);
        doc.moveDown();

        // Add table headers
        doc.fontSize(16).text('Order Details:', { underline: true });
        doc.moveDown();
        doc.fontSize(12).text('Product Code | Quantity | Price Each | Total', { underline: true });
        doc.moveDown();

        // Add table rows
        let totalPrice = 0;
        rows[1].forEach(async item => {
            const total = item.quantityOrdered * item.priceEach;
            totalPrice += total;
            doc.text(`${item.productName} | ${item.quantityOrdered} | $${item.priceEach} | $${total}`);
        });

        // Add total price
        doc.moveDown();
        doc.fontSize(14).text(`Total Price: $${totalPrice}`, { align: 'right' });

        // Finalize the PDF
        doc.end();
        // Render the invoice.ejs along with the PDF path
        res.render("invoice", { invoice: rows, invoiceId: invoiceId, pdfPath: pdfPath });
        // Wait for the PDF to be written to the file system
        /*
        writeStream.on('finish', () => {
            // Serve the PDF to the user
            res.sendFile(pdfPath, err => {
                if (err) {
                    console.error('Error sending PDF:', err);
                    res.status(500).send('Error generating PDF');
                }
            });
        });
        */
    } catch (err) {
        console.error(`Error fetching content:`, err);
        res.status(500).send("Internal Server Error");
    }
});

router.get("/login", async (req, res, next) => {
    try {
        const error = req.query.err || null; // Get error message from query string
        const pagePath = req.path;
        const pageName = getPageName(pagePath);

        console.log(`Handling request for: ${pagePath}`);

        res.render("login", { error });
    } catch (err) {
        console.error(`Error fetching content for ${pageName}:`, err);
        res.status(500).send("Internal Server Error");
    }
});


// Wildcard Route to Handle All GET Requests
router.get("*", async (req, res, next) => {
    try {
        const pagePath = req.path;
        const pageName = getPageName(pagePath);

        console.log(`Handling request for: ${pagePath}`);
        res.render("index");
    } catch (err) {
        console.error(`Error fetching content for ${pageName}:`, err);
        res.status(500).send("Internal Server Error");
    }
});

app.use((req, res, next) => {
    res.locals.UserID = req.session?.UserID || null;
    res.locals.FirstName = req.session?.FirstName || null;
    res.locals.LastName = req.session?.LastName || null;
    next();
});

module.exports = router;
