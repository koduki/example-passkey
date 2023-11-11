export function ab2base64url(ab) {
    const str = String.fromCharCode.apply(null, new Uint8Array(ab));
    const base64 = window.btoa(str);
    const base64url = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=*$/g, '');

    return base64url;
}

export function base64url2ab(base64url) {
    // base64url to base 64
    let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
    const paddingLength = 4 - (base64.length % 4);
    if (paddingLength !== 4) {
        base64 += '='.repeat(paddingLength);
    }

    // base64 to ArrayBuffer
    const bstr = atob(base64);
    const ab = Uint8Array.from(bstr, str => str.charCodeAt(0)); // Uint8Array化
    return ab;
}

export function s2ab(str) {
    return (new TextEncoder('utf-8')).encode(str);
}

export function obj2ab(charObj) {
    return new Uint8Array(Object.values(charObj)).buffer;
}