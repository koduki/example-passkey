import { ab2base64url, base64url2ab, s2ab, obj2ab } from './base64url.js';

export function showDevices(devices) {
    const deviceList = document.querySelector('.device-list');
    while (deviceList.firstChild) {
        deviceList.removeChild(deviceList.firstChild);
    }

    devices.forEach((device) => {
        const listItem = document.createElement('li');
        listItem.className = 'device-item';

        const detailsDiv = document.createElement('div');
        detailsDiv.className = 'device-details';

        const nameDiv = document.createElement('div');
        nameDiv.className = 'device-name';
        window.hoge = device.credentialID
        nameDiv.innerHTML = "<strong>Device Credential:</strong> " + ab2base64url(obj2ab(device.credentialID));

        detailsDiv.appendChild(nameDiv);
        listItem.appendChild(detailsDiv);
        deviceList.appendChild(listItem);
    });
}

export async function getProfile() {
    const profileResp = await fetch('/profile');
    return await profileResp.json();
}