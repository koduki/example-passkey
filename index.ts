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

    // if (verified && registrationInfo) {
    //     const { credentialPublicKey, credentialID, counter } = registrationInfo;
    //     const existingDevice = user.devices.find((device) =>
    //         isoUint8Array.areEqual(device.credentialID, credentialID)
    //     );

    //     if (!existingDevice) {
    //         /**
    //          * Add the returned device to the user's list of devices
    //          */
    //         const newDevice: AuthenticatorDevice = {
    //             credentialPublicKey,
    //             credentialID,
    //             counter,
    //             transports: body.response.transports,
    //         };
    //         user.devices.push(newDevice);
    //     }
    // }

    dummyStore.currentChallenge = '';
    return c.json({ verified })
});

Deno.serve(app.fetch)