// authMiddleware.js
function isAuthenticated(req, res, next) {
  // Check if user session exists (e.g., UserID)
  if (req.session && req.session.UserID) {
    return next(); // user is authenticated, proceed
  }
  // user is not authenticated
  return res.redirect("/login"); 
  // or use: res.status(401).send("Unauthorized") if you prefer an HTTP error
}

module.exports = isAuthenticated;