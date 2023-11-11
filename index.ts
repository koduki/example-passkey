import { Hono } from 'https://deno.land/x/hono/mod.ts';
import { serveStatic } from 'https://deno.land/x/hono@v3.3.0/middleware.ts'

import {
    // Authentication
    generateAuthenticationOptions,
    // Registration
    generateRegistrationOptions,
    verifyAuthenticationResponse,
    verifyRegistrationResponse,
} from 'https://deno.land/x/simplewebauthn/deno/server.ts';

import type {
    VerifiedAuthenticationResponse,
    VerifiedRegistrationResponse,
    VerifyAuthenticationResponseOpts,
    VerifyRegistrationResponseOpts,
    AuthenticationResponseJSON,
    AuthenticatorDevice,
    RegistrationResponseJSON,
} from 'https://deno.land/x/simplewebauthn/deno/typescript-types.ts';


import { isoBase64URL, isoUint8Array } from "https://deno.land/x/simplewebauthn@v8.3.5/deno/server/helpers.ts";

function genRandomStr(length: number) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const randomArray = new Uint8Array(length);
    crypto.getRandomValues(randomArray);
    return Array.from(randomArray, byte => characters[byte % characters.length]).join('');
}

const rpID = 'localhost';
const port = 8000;
const expectedOrigin = `http://${rpID}:${port}`;

const user = {
    id: self.crypto.randomUUID(),
    username: `user@${rpID}`,
    devices: [],
}

const dummyStore = {
    currentChallenge: "",
}
const app = new Hono();

app.use('/*', serveStatic({ root: './public' }));

app.get('/signup', serveStatic({ path: './public/signup.html' }));
app.get('/profile', serveStatic({ path: './public/profile.html' }));

app.get('/echo', (c) => {
    return c.text('Hello Deno!')
})

app.get('/generate-registration-options', (c) => {
    const options = {
        challenge: isoBase64URL.fromString(genRandomStr(32)),
        rp: { name: 'SimpleWebAuthn Example', id: rpID },
        user: {
            id: user.id,
            name: user.username,
            displayName: user.username
        }
    }
    dummyStore.currentChallenge = options.challenge;
    return c.json(options)
});

/**
 * Login (a.k.a. "Authentication")
 */
app.get('/generate-authentication-options', (c) => {

    const options = {
        challenge: isoBase64URL.fromString(genRandomStr(32)),
        allowCredentials: user.devices.map((dev) => ({
            id: dev.credentialID,
            type: 'public-key',
            transports: dev.transports,
        })),
        timeout: 60000,
        userVerification: 'required',
        extensions: undefined,
        rpId: 'localhost'
    }

    dummyStore.currentChallenge = options.challenge;
    return c.json(options)
});

app.post('/verify-registration', async (c) => {
    const body: RegistrationResponseJSON = await c.req.json();
    const expectedChallenge = dummyStore.currentChallenge;
    let verification: VerifiedRegistrationResponse;
    try {
        const opts: VerifyRegistrationResponseOpts = {
            response: body,
            expectedChallenge: `${expectedChallenge}`,
            expectedOrigin,
            expectedRPID: rpID,
            requireUserVerification: true,
        };
        console.log(opts)
        verification = await verifyRegistrationResponse(opts);
    } catch (error) {
        const _error = error as Error;
        console.log(error)
        return new Response(_error.message, { status: 500 });
    }

    const { verified, registrationInfo } = verification;

    if (verified && registrationInfo) {
        const { credentialPublicKey, credentialID, counter } = registrationInfo;
        console.log(credentialID);
        const existingDevice = user.devices.find((device) =>
            isoUint8Array.areEqual(device.credentialID, credentialID)
        );

        if (!existingDevice) {
            /**
             * Add the returned device to the user's list of devices
             */
            const newDevice: AuthenticatorDevice = {
                credentialPublicKey,
                credentialID,
                counter,
                transports: body.response.transports,
            };
            user.devices.push(newDevice);
        }
    }

    dummyStore.currentChallenge = '';
    return c.json({ verified })
});

app.post('/verify-authentication', async (c) => {

    const body: AuthenticationResponseJSON = await c.req.json();

    const expectedChallenge = dummyStore.currentChallenge;

    let dbAuthenticator;
    const bodyCredIDBuffer = isoBase64URL.toBuffer(body.rawId);
    // "Query the DB" here for an authenticator matching `credentialID`
    for (const dev of user.devices) {
        if (isoUint8Array.areEqual(dev.credentialID, bodyCredIDBuffer)) {
            dbAuthenticator = dev;
            break;
        }
    }

    if (!dbAuthenticator) {
        return new Response('Authenticator is not registered with this site', { status: 400 });
    }

    let verification: VerifiedAuthenticationResponse;
    try {
        const opts: VerifyAuthenticationResponseOpts = {
            response: body,
            expectedChallenge: `${expectedChallenge}`,
            expectedOrigin,
            expectedRPID: rpID,
            authenticator: dbAuthenticator,
            requireUserVerification: true,
        };
        verification = await verifyAuthenticationResponse(opts);
    } catch (error) {
        const _error = error as Error;
        console.error(_error);
        return new Response(_error.message, { status: 400 });

    }

    const { verified, authenticationInfo } = verification;

    if (verified) {
        // Update the authenticator's counter in the DB to the newest count in the authentication
        dbAuthenticator.counter = authenticationInfo.newCounter;
    }

    dummyStore.currentChallenge = '';
    console.log(verification)
    return c.json({ verified })
});


Deno.serve(app.fetch)