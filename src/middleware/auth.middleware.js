const User = require("../models/User");
const { USER_COOKIE, ADMIN_COOKIE, verifyToken } = require("../utils/tokens");

async function optionalUser(req, _res, next) {
  try {
    const token = req.cookies?.[USER_COOKIE];
    if (!token) {
      return next();
    }

    const payload = verifyToken(token);
    const user = await User.findById(payload.userId);
    if (user) {
      req.user = user;
    }
    return next();
  } catch (_error) {
    return next();
  }
}

async function requireUser(req, res, next) {
  try {
    const token = req.cookies?.[USER_COOKIE];
    if (!token) {
      return res.status(401).json({ message: "Please sign in with Google to continue." });
    }

    const payload = verifyToken(token);
    const user = await User.findById(payload.userId);
    if (!user) {
      return res.status(401).json({ message: "User session expired. Please sign in again." });
    }

    req.user = user;
    return next();
  } catch (_error) {
    return res.status(401).json({ message: "Invalid user session." });
  }
}

function requireAdmin(req, res, next) {
  const adminToken = req.cookies?.[ADMIN_COOKIE];
  const userToken = req.cookies?.[USER_COOKIE];

  try {
    if (adminToken) {
      req.admin = verifyToken(adminToken);
      return next();
    }

    if (userToken) {
      const payload = verifyToken(userToken);
      if (payload.roles && payload.roles.includes("admin")) {
        req.admin = payload;
        return next();
      }
    }

    return res.status(401).json({ message: "Admin login required." });
  } catch (_error) {
    return res.status(401).json({ message: "Invalid admin session." });
  }
}

module.exports = {
  optionalUser,
  requireUser,
  requireAdmin
};
