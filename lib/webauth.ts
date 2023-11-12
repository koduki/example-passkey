import {
    verifyAuthenticationResponse,
    verifyRegistrationResponse,
} from 'https://deno.land/x/simplewebauthn/deno/server.ts';

import type {
    VerifiedAuthenticationResponse,
    VerifiedRegistrationResponse,
    VerifyAuthenticationResponseOpts,
    VerifyRegistrationResponseOpts,
    AuthenticatorDevice,
} from 'https://deno.land/x/simplewebauthn/deno/typescript-types.ts';

import { isoBase64URL, isoUint8Array } from "https://deno.land/x/simplewebauthn@v8.3.5/deno/server/helpers.ts";

function genRandomStr(length: number) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const randomArray = new Uint8Array(length);
    crypto.getRandomValues(randomArray);
    return Array.from(randomArray, byte => characters[byte % characters.length]).join('');
}

export function buildRegistrationOptions(rpName: string, rpId: string, user: any) {
    return {
        challenge: isoBase64URL.fromString(genRandomStr(32)),
        rp: { name: rpName, id: rpId },
        user: {
            id: user.id,
            name: user.username,
            displayName: user.username
        }
    };
}

export function buildAuthOptions(user: any, rpId: string) {
    return {
        challenge: isoBase64URL.fromString(genRandomStr(32)),
        allowCredentials: user.devices.map((dev) => ({
            id: dev.credentialID,
            type: 'public-key',
            transports: dev.transports,
        })),
        timeout: 60000,
        userVerification: 'required',
        extensions: undefined,
        rpId: rpId
    };
}

export async function verifyRegstration(user: any, body: any, expectedChallenge: string, rpId: string, expectedOrigin: string) {
    let verification: VerifiedRegistrationResponse;
    const opts: VerifyRegistrationResponseOpts = {
        response: body,
        expectedChallenge: `${expectedChallenge}`,
        expectedOrigin,
        expectedRPID: rpId,
        requireUserVerification: true,
    };
    verification = await verifyRegistrationResponse(opts);

    const { verified, registrationInfo } = verification;

    if (verified && registrationInfo) {
        const { credentialPublicKey, credentialID, counter } = registrationInfo;
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

    return verified;
}

export async function verifyAuth(user: any, body: any, expectedChallenge: string, rpId: string, expectedOrigin: string) {
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

    const opts: VerifyAuthenticationResponseOpts = {
        response: body,
        expectedChallenge: `${expectedChallenge}`,
        expectedOrigin,
        expectedRPID: rpId,
        authenticator: dbAuthenticator,
        requireUserVerification: true,
    };
    verification = await verifyAuthenticationResponse(opts);


    const { verified, authenticationInfo } = verification;

    if (verified) {
        // Update the authenticator's counter in the DB to the newest count in the authentication
        dbAuthenticator.counter = authenticationInfo.newCounter;
    }
    return verified;
}

export function createUser(user: any, rpId: string) {
    const id = self.crypto.randomUUID()
    return {
        id: id,
        username: `${user.name}@${rpId}`,
        devices: []
    };
}
