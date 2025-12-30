/**
 * CONTENT SCRIPT: DeepGuard AI
 * Responsible for UI injection and messaging background.js
 */

// 1. Listen for mouse movements to find images
document.addEventListener('mouseover', (e) => {
    // We only target images that haven't been tagged yet
    if (e.target.tagName === 'IMG' && !e.target.dataset.deepguard) {
        setupScanButton(e.target);
    }
});

function setupScanButton(img) {
    // Mark image so we don't add 100 buttons to one image
    img.dataset.deepguard = "ready";

    const btn = document.createElement('button');
    btn.innerText = "🔍 Scan Media";
    btn.className = "deepguard-scan-btn";
    
    // Initial positioning
    updateButtonPosition(img, btn);

    // Update position if window resizes or scrolls
    const positionUpdater = () => updateButtonPosition(img, btn);
    window.addEventListener('scroll', positionUpdater);
    window.addEventListener('resize', positionUpdater);

    btn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation(); // Stop the website from clicking the image
        
        btn.innerText = "⌛ Analyzing...";
        btn.disabled = true;

        // Send to background.js
        chrome.runtime.sendMessage({ 
            action: "analyzeImage", 
            imageUrl: img.src 
        }, (response) => {
            // Clean up event listeners to save memory
            window.removeEventListener('scroll', positionUpdater);
            window.removeEventListener('resize', positionUpdater);

            if (chrome.runtime.lastError) {
                btn.innerText = "❌ Port Error";
                console.error("Connection Error:", chrome.runtime.lastError.message);
                return;
            }

            if (response && response.success) {
                handleResult(img, response.data, btn);
            } else {
                const errorMsg = response ? response.error : "Unknown AI Error";
                btn.innerText = "❌ Failed";
                console.error("DeepGuard AI Error:", errorMsg);
                
                // Reset button after 3 seconds so user can try again
                setTimeout(() => {
                    btn.innerText = "🔍 Scan Media";
                    btn.disabled = false;
                    img.dataset.deepguard = ""; // Allow re-attach
                }, 3000);
            }
        });
    };

    document.body.appendChild(btn);
}

// Helper to keep the button stuck to the top-left of the image
function updateButtonPosition(img, btn) {
    const rect = img.getBoundingClientRect();
    
    // If image is hidden or too small, don't show button
    if (rect.width < 50 || rect.height < 50) {
        btn.style.display = 'none';
        return;
    }

    btn.style.display = 'block';
    btn.style.position = 'absolute';
    btn.style.top = `${window.scrollY + rect.top + 10}px`;
    btn.style.left = `${window.scrollX + rect.left + 10}px`;
    btn.style.zIndex = "2147483647"; // Maximum possible z-index
}

// 2. Handle the AI Verdict (UI Update)
function handleResult(img, data, btn) {
    if (data.isDeepfake) {
        // Visual Warning
        img.style.outline = "5px solid #d93025";
        img.style.outlineOffset = "-5px";
        img.style.filter = "sepia(1) saturate(2) hue-rotate(-50deg)"; // Subtle "fake" look
        
        const warning = document.createElement('div');
        warning.className = "deepguard-warning-banner";
        warning.innerHTML = `
            <div style="background: #d93025; color: white; padding: 12px; font-family: sans-serif; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.4); border: 1px solid white;">
                <strong style="display:block; font-size:14px;">⚠️ HIGH RISK: DEEPFAKE</strong>
                <p style="margin: 5px 0 0 0; font-size: 12px; opacity: 0.9;">Confidence: ${data.confidence}%</p>
                <p style="margin: 3px 0 0 0; font-size: 11px; font-style: italic;">Reason: ${data.reason}</p>
            </div>
        `;
        
        const rect = img.getBoundingClientRect();
        warning.style.position = 'absolute';
        warning.style.top = `${window.scrollY + rect.top - 70}px`;
        warning.style.left = `${window.scrollX + rect.left}px`;
        warning.style.zIndex = "2147483647";
        
        document.body.appendChild(warning);
        btn.remove();
    } else {
        // Success: Likely Real
        btn.innerText = "✅ Authentic";
        btn.style.backgroundColor = "#188038";
        btn.style.color = "white";
        
        setTimeout(() => {
            btn.style.opacity = "0";
            btn.style.transition = "opacity 0.5s";
            setTimeout(() => btn.remove(), 500);
        }, 3000);
    }
}