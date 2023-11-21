import { Hono } from 'https://deno.land/x/hono/mod.ts';
import { serveStatic } from 'https://deno.land/x/hono@v3.3.0/middleware.ts';
import { Session, sessionMiddleware, CookieStore } from 'https://deno.land/x/hono_sessions/mod.ts';

import type {
    AuthenticationResponseJSON, 
    RegistrationResponseJSON
} from 'https://deno.land/x/simplewebauthn/deno/typescript-types.ts';

import {
    buildRegistrationOptions, 
    buildAuthOptions,
    verifyRegstration, 
    verifyAuth,
    createUser
} from "./lib/webauth.ts";

const rpID = 'localhost';
const port = 8000;
const expectedOrigin = `http://${rpID}:${port}`;
const rpName = 'SimpleWebAuthn Example';

const users = {};

const app = new Hono<{
    Variables: {
        session: Session,
        session_key_rotation: boolean
    }
}>()

const store = new CookieStore();
app.use('*', sessionMiddleware({
    store,
    encryptionKey: 'password_at_least_32_characters_long', // Required for CookieStore, recommended for others
    expireAfterSeconds: 900, // Expire session after 15 minutes
    cookieOptions: {
        sameSite: 'Lax',
        path: '/',
    },
}));

app.get('/echo', (c) => {
    return c.text('Hello Deno!');
});

app.get('/generate-registration-options', (c) => {
    const user = users[c.get('session').get("currentUserId")];
    const options = buildRegistrationOptions(rpName, rpID, user);
    c.get('session').set('currentChallenge', options.challenge);

    return c.json(options);
});

app.get('/generate-authentication-options', (c) => {
    const user = users[c.get('session').get("currentUserId")];
    const options = buildAuthOptions(user, rpID);
    c.get('session').set('currentChallenge', options.challenge);

    return c.json(options);
});

app.get('/profile', (c) => {
    const user = users[c.get('session').get("currentUserId")];
    return c.json(user);
});

app.post('/verify-registration', async (c) => {
    const body: RegistrationResponseJSON = await c.req.json();
    const user = users[c.get('session').get("currentUserId")];
    const expectedChallenge = c.get('session').get('currentChallenge');
    const verified = verifyRegstration(user, body, expectedChallenge, rpID, expectedOrigin);

    c.get('session').set('currentChallenge', '');
    return c.json({ verified });
});

app.post('/verify-authentication', async (c) => {
    const body: AuthenticationResponseJSON = await c.req.json();
    const user = users[c.get('session').get("currentUserId")];
    const expectedChallenge = c.get('session').get('currentChallenge');
    const verified = verifyAuth(user, body, expectedChallenge, rpID, expectedOrigin);

    c.get('session').set('currentChallenge', '');
    return c.json({ verified });
});

app.post('/create-user', async (c) => {
    const user = createUser(await c.req.json(), rpID);
    users[user.id] = user;

    c.get('session').set("currentUserId", user.id);
    return c.json({ "name": user.username });
});

app.use('/*', serveStatic({ root: './public' }));
Deno.serve(app.fetch);
