const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const db = require('./db');
const { usersTable } = require('../dbSchema/userSchema');
const { eq } = require('drizzle-orm');

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/auth/google/callback"
},
    async (accessToken, refreshToken, profile, done) => {
        try {
            const email = profile.emails[0].value;
            let user = await db.query(usersTable).findFirst({
                where: (user, { eq }) => eq(user.email, email)
            });
            if (!user) {
                const newUser = {
                    name: profile.displayName,
                    email: email,
                    password: null,
                    isVerified: true
                };
                const insertedUser = await db.insert(usersTable).values(newUser).returning();
                user = insertedUser[0];
            }
            return done(null, user);
        } catch (err) {
            return done(err, null);
        }
    }
));