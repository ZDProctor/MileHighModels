// Route Definition
// Jan 4, 2024. Brett Huffman
// routes.js
// routes.js
const express = require("express");
const isAuthenticated = require("./authMiddleware");
const router = express.Router();
const pool = require("./db"); // Import the database connection pool

// Protect all routes starting with /Dashboard
router.use("/dashboard", isAuthenticated);

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

    if(firstName && lastName && email && pwd) {
      // Enter as new user in DB

      // 1. Encrypt (hash) the password using bcrypt
      const bcrypt = require('bcrypt');
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(pwd, saltRounds);

      // 2. Store the hashed password in the database
      // Example using a hypothetical User model (Mongoose or similar):
      // const newUser = new User({ firstName, lastName, email, password: hashedPassword });
      // await newUser.save();

      // If using a generic DB query, it might look like:
      // const qry = `INSERT INTO user (firstName, lastName, email, password) VALUES (${firstName}, ${lastname}, ${email}, ${hashedPassword})`

      // SP to add new user

      await pool.query("CALL UserCreate(?,?,?,?)", [email, hashedPassword, firstName, lastName]);

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


// Login
router.post("/login", async (req, res, next) => {
  try {
    const username = req.body.username;
    const pwd = req.body.password;

    if (!username || !pwd) {
      return res.status(400).send("Missing fields in request body");
    }

    // 1. Retrieve the user record from DB (including hashed password).
    const [rows] = await pool.query("SELECT CustomerNumber AS UserID, ContactFirstName AS FirstName, ContactLastName AS LastName FROM Customers WHERE Username = '" + username + "' AND Pwd = '" + pwd + "';");

    // 2. Verify user exists and retrieve the row object.
    if (rows && rows[0]) {
      const user = rows[0]; // user should have { UserID, Email, Pwd, ... }

        // Good login
        req.session.UserID = user.UserID; // store ID in session
        req.session.FirstName = user.FirstName; // store ID in session
        req.session.LastName = user.LastName; // store ID in session

        return res.redirect("/dashboard");
    } else {
      // No user found for that email
      return res.redirect("login?err=BadLogin");
    }

  } catch (err) {
    console.error(`Error during login:`, err);
    res.status(500).send("Internal Server Error");
  }
});


// Login
router.get("/dashboard", async (req, res, next) => {
  try {
    const searchQuery = req.query.query || '';

    // 🚨 Intentionally Vulnerable SQL Query (for students to exploit)
    const sql = `SELECT productCode, productName, productDescription, MSRP FROM products WHERE productName LIKE '%${searchQuery}%'`;

    const [rows] = await pool.query(sql);

        res.render('dashboard', { products: rows, query: searchQuery });

  } catch (err) {
    console.error(`Error fetching content:`, err);
    res.status(500).send("Internal Server Error");
  }
});


// "My Orders" Route (Vulnerable to SQL Injection)
router.get("/orders", async (req, res, next) => {
  const customerId = req.query.cid || 0;
  let orderBy = req.query.orderBy || "orderDate"; // Default sorting column

  // 🚨 SQL Injection Vulnerability: Directly injecting user input
  const sql = `SELECT orderNumber, orderDate, shippedDate, status, comments FROM orders WHERE customerNumber = ${customerId} ORDER BY ${orderBy}`;

  const [rows] = await pool.query(sql);

  res.render("orders", { orders: rows, orderBy: orderBy });

          
});


// Wildcard Route to Handle All GET Requests
router.get("*", async (req, res, next) => {
  try {
    const pagePath = req.path;
    const pageName = getPageName(pagePath);

    console.log(`Handling request for: ${pagePath}`);

    res.render("login");
  } catch (err) {
    console.error(`Error fetching content for ${pageName}:`, err);
    res.status(500).send("Internal Server Error");
  }
});

module.exports = router;
