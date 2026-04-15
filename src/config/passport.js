const passport = require("passport");
const { Strategy: GoogleStrategy } = require("passport-google-oauth20");
const env = require("./env");

function configurePassport() {
  if (!env.googleConfigured) {
    return passport;
  }

  passport.use(
    new GoogleStrategy(
      {
        clientID: env.googleClientId,
        clientSecret: env.googleClientSecret,
        callbackURL: env.googleCallbackUrl
      },
      async (_accessToken, _refreshToken, profile, done) => {
        const email = profile.emails && profile.emails[0] ? profile.emails[0].value.toLowerCase() : "";
        done(null, {
          googleId: profile.id,
          email,
          displayName: profile.displayName || "XP Reward User",
          avatarUrl: profile.photos && profile.photos[0] ? profile.photos[0].value : "",
          firstName: profile.name?.givenName || "",
          lastName: profile.name?.familyName || ""
        });
      }
    )
  );

  return passport;
}

module.exports = configurePassport;
