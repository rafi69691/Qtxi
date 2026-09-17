/**
 * ⚡ XT AI PRO - Quotex Live OTC Data Bridge ⚡
 * 
 * এটি আপনার Kiwi Browser-এ Quotex-এর আসল লাইভ OTC মার্কেট ডাটা
 * ক্লাউডফ্লেয়ার বাইপাস করে সরাসরি টেলিগ্রাম বোটে পুশ করে।
 */

(function () {
    // ⚙️ আপনার বটের ব্রিজ সার্ভার লিঙ্ক (সার্ভার অনুযায়ী পরিবর্তন করতে পারেন)
    // লোকাল / রেন্ডার / কোডস্পেস URL
    let BRIDGE_URL = "http://localhost:8080/feed"; 

    console.log("%c[XT AI PRO] Quotex Live Bridge Initializing...", "color: #00e676; font-size: 16px; font-weight: bold;");

    // UI Floating Status Badge তৈরি
    const badge = document.createElement("div");
    badge.id = "xt-bridge-badge";
    badge.style.position = "fixed";
    badge.style.bottom = "15px";
    badge.style.right = "15px";
    badge.style.backgroundColor = "#0f172a";
    badge.style.color = "#00e676";
    badge.style.border = "1.5px solid #00e676";
    badge.style.borderRadius = "8px";
    badge.style.padding = "8px 14px";
    badge.style.fontSize = "12px";
    badge.style.fontWeight = "bold";
    badge.style.zIndex = "9999999";
    badge.style.boxShadow = "0 4px 12px rgba(0,0,0,0.6)";
    badge.style.cursor = "pointer";
    badge.innerHTML = "⚡ XT AI Bridge: <span id='xt-status' style='color:#facc15'>Connecting...</span>";
    document.body.appendChild(badge);

    badge.onclick = function() {
        const newUrl = prompt("Enter your Bot Server URL (e.g., http://localhost:8080/feed):", BRIDGE_URL);
        if (newUrl) {
            BRIDGE_URL = newUrl.trim();
            alert("Bridge URL updated to: " + BRIDGE_URL);
        }
    };

    let tickCount = 0;

    // ১. বোটে ডাটা পাঠানোর ফাংশন
    function sendTickToBot(asset, price, timestamp) {
        if (!asset || !price) return;
        
        const payload = {
            asset: asset.toUpperCase().replace("_", "-"),
            price: parseFloat(price),
            timestamp: timestamp || Math.floor(Date.now() / 1000)
        };

        fetch(BRIDGE_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload),
            mode: "cors"
        }).then(res => {
            if (res.ok) {
                tickCount++;
                const statusEl = document.getElementById("xt-status");
                if (statusEl) {
                    statusEl.innerHTML = `<span style="color:#00e676">Streaming (${tickCount} ticks)</span>`;
                }
            }
        }).catch(err => {
            const statusEl = document.getElementById("xt-status");
            if (statusEl) {
                statusEl.innerHTML = `<span style="color:#ef4444">Bot Offline</span>`;
            }
        });
    }

    // ২. WebSocket Interceptor (Quotex-এর ভেতরকার লাইভ সকেট হুক করা)
    const originalWebSocket = window.WebSocket;
    window.WebSocket = function (...args) {
        const ws = new originalWebSocket(...args);

        ws.addEventListener("message", function (event) {
            try {
                const raw = event.data;
                if (typeof raw === "string" && raw.startsWith("42")) {
                    const data = JSON.parse(raw.substring(2));
                    const eventName = data[0];
                    const content = data[1];

                    // Ticks
                    if (eventName === "tick" || eventName === "live_tick") {
                        sendTickToBot(content.asset, content.price, content.time);
                    } else if (eventName === "quotes" && Array.isArray(content)) {
                        content.forEach(item => {
                            sendTickToBot(item.asset, item.price, item.time);
                        });
                    }
                }
            } catch (e) {
                // Ignore parse errors
            }
        });

        return ws;
    };

    // ৩. DOM Observer Fallback (যদি সকেট মেসেজ এনক্রিপ্টেড থাকে তবে সরাসরি স্ক্রিনের লাইভ প্রাইস ডিটেক্ট করবে)
    setInterval(() => {
        try {
            // সক্রিয় পেয়ারের নাম খোঁজা
            let assetName = "";
            const assetElements = document.querySelectorAll(".current-symbol, .asset-select__name, [class*='asset-name'], [class*='symbol']");
            for (let el of assetElements) {
                if (el.innerText && el.innerText.includes("OTC")) {
                    assetName = el.innerText.trim();
                    break;
                }
            }

            // লাইভ প্রাইস খোঁজা
            let priceText = "";
            const priceElements = document.querySelectorAll("[class*='current-price'], [class*='price-value'], [class*='value__val']");
            for (let el of priceElements) {
                const val = parseFloat(el.innerText.replace(/[^0-9.]/g, ''));
                if (!isNaN(val) && val > 0) {
                    priceText = val;
                    break;
                }
            }

            if (assetName && priceText) {
                const formattedAsset = assetName.replace(/[^a-zA-Z0-9]/g, '-').replace(/--+/g, '-');
                sendTickToBot(formattedAsset, priceText, Math.floor(Date.now() / 1000));
            }
        } catch (e) {}
    }, 1000);

    console.log("%c[XT AI PRO] Quotex Live Bridge Active & Monitoring!", "color: #00e676; font-weight: bold;");
})();
