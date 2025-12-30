const GEMINI_API_KEY = "Add your API_KEY_HERE"; 
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

const firebaseConfig = {
  apiKey: "ADD YOUR API_KEY_HERE"
  authDomain: "deepguard-27f0b.firebaseapp.com",
  projectId: "deepguard-27f0b",
  storageBucket: "deepguard-27f0b.firebasestorage.app",
  messagingSenderId: "961548052780",
  appId: "1:961548052780:web:6849de38fcae8758c5a489",
  measurementId: "G-PLPTLVRJE2"
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("📥 [Background] Message Received:", request.action);
    if (request.action === "analyzeImage") {
        handleAnalysis(request.imageUrl, sendResponse);
        return true; // Keep the message channel open for async response
    }
});

async function handleAnalysis(url, sendResponse) {
    try {
        console.log("🛰️ [Step 1] Fetching Image:", url);
        const imgResp = await fetch(url);
        if (!imgResp.ok) throw new Error("Could not download image.");
        
        const blob = await imgResp.blob();
        const base64 = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result.split(',')[1]);
            reader.readAsDataURL(blob);
        });

        console.log("🧠 [Step 2] Sending to Gemini AI...");
        // ✅ FIXED: Changed function name to match the definition below
        const aiResult = await callGeminiAPI(base64);
        
        console.log("✅ [Step 3] Success! Result:", aiResult);
        sendResponse({ success: true, data: aiResult });
    } catch (err) {
        console.error("❌ [Background Error]:", err.message);
        sendResponse({ success: false, error: err.message });
    }
}

async function callGeminiAPI(base64Image) {
   
    const promptText = `Analyze this image for deepfake signs. Return ONLY a JSON object: {"isDeepfake": boolean, "confidence": number, "reason": string}`;

    const response = await fetch(GEMINI_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: [{
                parts: [
                    { text: promptText }, // ✅ Using the defined promptText
                    { inline_data: { mime_type: "image/jpeg", data: base64Image } }
                ]
            }],
            safetySettings: [
                { "category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE" },
                { "category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE" },
                { "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE" },
                { "category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE" }
            ],
            generationConfig: { response_mime_type: "application/json" }
        })
    });

    const result = await response.json();

    if (result.error) throw new Error(`Gemini API Error: ${result.error.message}`);
    
    // Safety check for empty candidates
    if (!result.candidates || result.candidates.length === 0) {
        throw new Error("AI blocked this image due to safety filters.");
    }

    const candidate = result.candidates[0];
    if (candidate.finishReason === "SAFETY") throw new Error("Safety Filter triggered.");

    return JSON.parse(candidate.content.parts[0].text);

}
