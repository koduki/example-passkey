import { ab2base64url, base64url2ab, s2ab, obj2ab } from './base64url.js';

export async function createUser(userName) {
    const createUserResp = await fetch('/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: userName
        }),
    });
    return await createUserResp.json();
}

export async function registCredential() {
    // RPからサイト情報や認証方式、チャレンジを取得
    const registOptionsResp = await fetch('/generate-registration-options');
    const registOptions = await registOptionsResp.json();

    // 認証器へ送信して、鍵を生成してRP情報と共に保存
    const credential = await navigator.credentials.create({
        publicKey: buildOptoinsForRegistDevice(registOptions),
    });

    // 暗号化したチャレンジや公開鍵など認証器の戻りをRPに送信して検証して、RPに登録
    const verificationResp = await fetch('/verify-registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildOptionsForRegistPR(credential)),
    });
    return verificationResp;
}

function buildOptoinsForRegistDevice(registOptions) {
    // 認証器へのパラメータを初期化
    return {
        challenge: base64url2ab(registOptions.challenge), // ArrayBuffer型に注意
        rp: { // FIDOで言う認証器を受け入れるサイトのこと（Relying Partyの略）
            name: registOptions.rp.name, // RP名
            id: registOptions.rp.id // ユーザの登録・認証を行うドメイン名
        },
        user: {
            id: s2ab(registOptions.user.id), // RP内でユーザーを一意に識別する値（ArrayBuffer型に注意）
            name: registOptions.user.name, // ユーザー名
            displayName: registOptions.user.displayName // ニックネーム
        },
        pubKeyCredParams: [ // RPがサポートする署名アルゴリズム上から優先的に選択する
            { alg: -7, type: "public-key" },  // -7 (ES256)
            { alg: -257, type: "public-key" }, // -257 (RS256)
            { alg: -8, type: "public-key" } // -8 (Ed25519)
        ],
        excludeCredentials: [{ // 同じデバイスを複数回重複して登録させないためのパラメーター
            id: s2ab(registOptions.user.id), // idがすでに登録済みであればエラーにする。
            type: "public-key", //
            transports: ['internal'] // 別端末をつかった認証。 他にも usb, nfc, ble, smart-cardなどがある。
        }],
        authenticatorSelection: { // 登録を許可する認証器タイプを制限する際に利用
            authenticatorAttachment: "platform", // platform:端末に組み込まれている認証器（FaceID、生体認証など）のみを指定。cross-platform:USBやNFCなどを含めた外部端末の認証器（Yubikeyなど）のみを指定。 
            requireResidentKey: true, // 認証器内にユーザー情報を登録するオプション。Discoverable Credentialにするかどうか。
            userVerification: "preferred" // 認証器によるローカル認証（生体認証、PINなど）の必要性を指定。 required:ローカル認証を必須。preferred:可能な限りローカル認証。discouraged:ローカル認証を許可しない（所有物認証）
        },
    }
}

function buildOptionsForRegistPR(credential) {
    return {
        id: ab2base64url(credential.rawId),
        type: credential.type,
        rawId: ab2base64url(credential.rawId), //Array.from(new Uint8Array(credential.rawId)),
        response: {
            clientDataJSON: ab2base64url(credential.response.clientDataJSON),
            attestationObject: ab2base64url(credential.response.attestationObject)
        }
    };
}