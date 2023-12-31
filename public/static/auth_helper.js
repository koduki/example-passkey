import { ab2base64url, base64url2ab, s2ab, obj2ab } from './base64url.js';

export async function auth() {
    // チャレンジやPRに登録されている情報を取得
    const authOptionsResp = await fetch('/generate-authentication-options');
    const authOptions = await authOptionsResp.json();
    const deviceId = obj2ab(authOptions.allowCredentials[0].id);

    // チャレンジを検証し、PRから渡された情報にマッチするサイトが認証器に登録されているか検索
    const credential = await navigator.credentials.get({
        publicKey: buildOptionsForVerifyDevice(authOptions),
        mediation: 'optional'
    });
    console.log(credential);

    // チャレンジなど認証器の戻りをRPに送信して検証
    const verificationResp = await fetch('/verify-authentication', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildOptionsForVerifyRP(credential)),
    });
    console.log(verificationResp.ok);
    return verificationResp;
}

function buildOptionsForVerifyDevice(authOptions) {
    return {
        challenge: base64url2ab(authOptions.challenge),
        userVerification: "preferred"
    };
}

function buildOptionsForVerifyRP(credential) {
    return {
        id: ab2base64url(credential.rawId),
        type: credential.type,
        rawId: ab2base64url(credential.rawId),
        response: {
            clientDataJSON: ab2base64url(credential.response.clientDataJSON),
            authenticatorData: ab2base64url(credential.response.authenticatorData),
            signature: ab2base64url(credential.response.signature)
        }
    };
}
