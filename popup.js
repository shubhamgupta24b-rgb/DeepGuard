// Update stats when popup opens
document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.local.get(['scannedCount', 'detectedCount'], (data) => {
        document.getElementById('scannedCount').innerText = data.scannedCount || 0;
        document.getElementById('detectedCount').innerText = data.detectedCount || 0;
    });
});

// Optional: Button to open Firebase Dashboard
document.getElementById('viewHistory').onclick = () => {
    // Replace with your Firebase Hosting URL or a local history page
    chrome.tabs.create({ url: 'https://console.firebase.google.com/' });
};