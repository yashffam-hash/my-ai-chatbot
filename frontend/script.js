const chatBox = document.getElementById("chat-box");
const userInput = document.getElementById("user-input");
const sendButton = document.getElementById("send-button");
const clearButton = document.getElementById("clear-button");

let chats = JSON.parse(localStorage.getItem("chats")) || [];
let currentChatId = localStorage.getItem("currentChatId");

const chatsList = document.getElementById("chats-list");
const newChatBtn = document.getElementById("new-chat-btn");
const sidebar = document.getElementById("sidebar");
const sidebarOverlay = document.getElementById("sidebar-overlay");
const sidebarToggle = document.getElementById("sidebar-toggle");

function saveChats() {
    try {
        localStorage.setItem("chats", JSON.stringify(chats));
        localStorage.setItem("currentChatId", currentChatId || "");
    } catch (e) {
        chats.forEach(c => c.messages.forEach(m => {
            if (m.imageData && m.imageData.length > 100000) m.imageData = null;
        }));
        try { localStorage.setItem("chats", JSON.stringify(chats)); }
        catch (e2) { console.error(e2); }
    }
}

function getCurrentChat() { return chats.find(c => c.id === currentChatId); }
function generateId() { return "chat_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8); }

function getCurrentTime() {
    const now = new Date();
    let h = now.getHours();
    const m = now.getMinutes().toString().padStart(2, "0");
    const ap = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return `${h}:${m} ${ap}`;
}

const ICONS = {
    chat: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>`,
    copy: `<svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`,
    check: `<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
    share: `<svg viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>`,
    trash: `<svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`
};

let pendingAttachments = [];

const LANGUAGES = [
    { code: "en-US", name: "English", flag: "🇬🇧" },
    { code: "ur-PK", name: "اردو (Urdu)", flag: "🇵🇰" },
    { code: "hi-IN", name: "हिन्दी (Hindi)", flag: "🇮🇳" },
    { code: "ar-SA", name: "العربية (Arabic)", flag: "🇸🇦" },
    { code: "fa-IR", name: "فارسی (Persian)", flag: "🇮🇷" },
    { code: "fr-FR", name: "Français (French)", flag: "🇫🇷" },
    { code: "de-DE", name: "Deutsch (German)", flag: "🇩🇪" },
    { code: "es-ES", name: "Español (Spanish)", flag: "🇪🇸" },
    { code: "zh-CN", name: "中文 (Chinese)", flag: "🇨🇳" },
    { code: "ja-JP", name: "日本語 (Japanese)", flag: "🇯🇵" },
    { code: "ko-KR", name: "한국어 (Korean)", flag: "🇰🇷" },
    { code: "ru-RU", name: "Русский (Russian)", flag: "🇷🇺" },
    { code: "tr-TR", name: "Türkçe (Turkish)", flag: "🇹🇷" },
    { code: "it-IT", name: "Italiano (Italian)", flag: "🇮🇹" },
    { code: "pt-BR", name: "Português (Portuguese)", flag: "🇧🇷" },
    { code: "bn-BD", name: "বাংলা (Bengali)", flag: "🇧🇩" },
    { code: "pa-IN", name: "ਪੰਜਾਬੀ (Punjabi)", flag: "🇮🇳" },
    { code: "id-ID", name: "Indonesia", flag: "🇮🇩" },
    { code: "nl-NL", name: "Nederlands (Dutch)", flag: "🇳🇱" },
    { code: "th-TH", name: "ไทย (Thai)", flag: "🇹🇭" },
    { code: "ta-IN", name: "தமிழ் (Tamil)", flag: "🇮🇳" },
    { code: "te-IN", name: "తెలుగు (Telugu)", flag: "🇮🇳" },
    { code: "vi-VN", name: "Tiếng Việt", flag: "🇻🇳" },
    { code: "pl-PL", name: "Polski (Polish)", flag: "🇵🇱" },
    { code: "uk-UA", name: "Українська", flag: "🇺🇦" },
    { code: "ro-RO", name: "Română (Romanian)", flag: "🇷🇴" },
    { code: "el-GR", name: "Ελληνικά (Greek)", flag: "🇬🇷" },
    { code: "he-IL", name: "עברית (Hebrew)", flag: "🇮🇱" },
    { code: "ms-MY", name: "Bahasa Melayu", flag: "🇲🇾" },
    { code: "sw-KE", name: "Kiswahili", flag: "🇰🇪" }
];

function detectLanguage(text) {
    if (!text) return "en-US";
    if (/[\u0600-\u06FF]/.test(text)) {
        if (/[پچژگک]/.test(text)) return "fa-IR";
        return "ur-PK";
    }
    if (/[\u0900-\u097F]/.test(text)) return "hi-IN";
    if (/[\u0980-\u09FF]/.test(text)) return "bn-BD";
    if (/[\u0A00-\u0A7F]/.test(text)) return "pa-IN";
    if (/[\u0B80-\u0BFF]/.test(text)) return "ta-IN";
    if (/[\u0C00-\u0C7F]/.test(text)) return "te-IN";
    if (/[\u0590-\u05FF]/.test(text)) return "he-IL";
    if (/[\u0370-\u03FF]/.test(text)) return "el-GR";
    if (/[\u0400-\u04FF]/.test(text)) {
        if (/[іїєґ]/.test(text)) return "uk-UA";
        return "ru-RU";
    }
    if (/[\u4E00-\u9FFF]/.test(text)) return "zh-CN";
    if (/[\u3040-\u30FF]/.test(text)) return "ja-JP";
    if (/[\uAC00-\uD7AF]/.test(text)) return "ko-KR";
    if (/[\u0E00-\u0E7F]/.test(text)) return "th-TH";
    return "en-US";
}

function getTextClass(text) {
    if (!text) return "";
    if (/[\u0600-\u06FF]/.test(text)) {
        if (/[پچژگک]/.test(text)) return "rtl-text persian-text";
        return "rtl-text urdu-text";
    }
    if (/[\u0590-\u05FF]/.test(text)) return "rtl-text hebrew-text";
    return "";
}

function createNewChat() {
    const id = generateId();
    const welcome = "Hello! How can I help you today?";
    const newChat = {
        id: id,
        title: "New Chat",
        messages: [{ message: welcome, sender: "bot", time: getCurrentTime() }],
        createdAt: Date.now()
    };
    chats.unshift(newChat);
    currentChatId = id;
    saveChats();
    renderSidebar();
    loadChat(id);
}

function loadChat(id) {
    currentChatId = id;
    const chat = getCurrentChat();
    if (!chat) return;
    chatBox.innerHTML = "";
    chat.messages.forEach((item, index) => {
        addMessage(item.message, item.sender, true, item.time, index, item.imageData, item.imageName);
    });
    renderSidebar();
    saveChats();
}

function deleteChat(id) {
    if (!confirm("Delete this chat?")) return;
    chats = chats.filter(c => c.id !== id);
    if (chats.length === 0) { createNewChat(); return; }
    if (currentChatId === id) {
        currentChatId = chats[0].id;
        loadChat(currentChatId);
    }
    saveChats();
    renderSidebar();
}

function renderSidebar() {
    chatsList.innerHTML = "";
    chats.forEach(chat => {
        const item = document.createElement("div");
        item.classList.add("chat-item");
        if (chat.id === currentChatId) item.classList.add("active");

        const icon = document.createElement("span");
        icon.classList.add("chat-item-icon");
        icon.innerHTML = ICONS.chat;

        const title = document.createElement("span");
        title.classList.add("chat-title");
        title.textContent = chat.title;

        const delBtn = document.createElement("button");
        delBtn.classList.add("chat-delete");
        delBtn.title = "Delete";
        delBtn.innerHTML = ICONS.trash;
        delBtn.addEventListener("click", (e) => { e.stopPropagation(); deleteChat(chat.id); });

        item.appendChild(icon);
        item.appendChild(title);
        item.appendChild(delBtn);
        item.addEventListener("click", () => { loadChat(chat.id); closeSidebar(); });
        chatsList.appendChild(item);
    });
}

function openSidebar() { sidebar.classList.add("open"); sidebarOverlay.classList.add("open"); }
function closeSidebar() { sidebar.classList.remove("open"); sidebarOverlay.classList.remove("open"); }

sidebarToggle.addEventListener("click", openSidebar);
sidebarOverlay.addEventListener("click", closeSidebar);
newChatBtn.addEventListener("click", () => { createNewChat(); closeSidebar(); });

function updateChatTitle(firstMessage) {
    const chat = getCurrentChat();
    if (!chat) return;
    if (chat.title === "New Chat") {
        chat.title = firstMessage.slice(0, 32) + (firstMessage.length > 32 ? "..." : "");
        saveChats();
        renderSidebar();
    }
}

const menuButton = document.getElementById("menu-button");
const menuDropdown = document.getElementById("menu-dropdown");

menuButton.addEventListener("click", (e) => {
    e.stopPropagation();
    menuDropdown.classList.toggle("open");
    menuButton.classList.toggle("active");
});

document.addEventListener("click", (e) => {
    if (!menuDropdown.contains(e.target) && e.target !== menuButton) {
        menuDropdown.classList.remove("open");
        menuButton.classList.remove("active");
    }
});

const emojiButton = document.getElementById("emoji-button");
const emojiPicker = document.getElementById("emoji-picker");

emojiButton.addEventListener("click", (e) => {
    e.stopPropagation();
    emojiPicker.classList.toggle("open");
    emojiButton.classList.toggle("active");
    if (emojiPicker.classList.contains("open")) setTimeout(() => userInput.focus(), 100);
});

document.querySelectorAll(".emoji").forEach(btn => {
    btn.addEventListener("click", (e) => {
        e.stopPropagation();
        userInput.value += btn.dataset.emoji;
        userInput.focus();
    });
});

document.addEventListener("click", (e) => {
    if (!emojiPicker.contains(e.target) && e.target !== emojiButton) {
        emojiPicker.classList.remove("open");
        emojiButton.classList.remove("active");
    }
});

const attachButton = document.getElementById("attach-button");
const cameraButton = document.getElementById("camera-button");
const fileInput = document.getElementById("file-input");
const cameraInput = document.getElementById("camera-input");
const attachmentPreview = document.getElementById("attachment-preview");

attachButton.addEventListener("click", () => fileInput.click());
cameraButton.addEventListener("click", () => cameraInput.click());

fileInput.addEventListener("change", (e) => handleFiles(e.target.files));
cameraInput.addEventListener("change", (e) => handleFiles(e.target.files));

function handleFiles(files) {
    Array.from(files).forEach(file => {
        if (file.size > 5 * 1024 * 1024) {
            alert("File too large (max 5MB): " + file.name);
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            pendingAttachments.push({
                name: file.name,
                size: file.size,
                type: file.type,
                data: e.target.result,
                isImage: file.type.startsWith("image/")
            });
            renderAttachmentPreview();
        };
        reader.readAsDataURL(file);
    });
    fileInput.value = "";
    cameraInput.value = "";
}

function formatSize(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function renderAttachmentPreview() {
    attachmentPreview.innerHTML = "";
    if (pendingAttachments.length === 0) {
        attachmentPreview.classList.remove("open");
        return;
    }
    attachmentPreview.classList.add("open");

    pendingAttachments.forEach((att, i) => {
        const item = document.createElement("div");
        item.classList.add("attachment-item");

        if (att.isImage) {
            const img = document.createElement("img");
            img.classList.add("attachment-thumb");
            img.src = att.data;
            item.appendChild(img);
        } else {
            const icon = document.createElement("div");
            icon.classList.add("attachment-icon");
            const ext = att.name.split(".").pop().toUpperCase().slice(0, 4);
            icon.textContent = ext;
            item.appendChild(icon);
        }

        const info = document.createElement("div");
        info.classList.add("attachment-info");
        const name = document.createElement("div");
        name.classList.add("attachment-name");
        name.textContent = att.name;
        const size = document.createElement("div");
        size.classList.add("attachment-size");
        size.textContent = formatSize(att.size);
        info.appendChild(name);
        info.appendChild(size);
        item.appendChild(info);

        const removeBtn = document.createElement("button");
        removeBtn.classList.add("attachment-remove");
        removeBtn.innerHTML = "✕";
        removeBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            pendingAttachments.splice(i, 1);
            renderAttachmentPreview();
        });
        item.appendChild(removeBtn);
        attachmentPreview.appendChild(item);
    });
}

const quickReplies = {
    "en-US": [
        { label: "Hello", text: "Hello" },
        { label: "Help me", text: "Help me please" },
        { label: "Tell a joke", text: "Tell me a joke" },
        { label: "Explain", text: "Explain something interesting" },
        { label: "Weather", text: "What's the weather like?" },
        { label: "Thanks", text: "Thank you" }
    ],
    "ur-PK": [
        { label: "سلام", text: "سلام" },
        { label: "مدد", text: "مجھے مدد چاہیے" },
        { label: "لطیفہ", text: "ایک لطیفہ سناؤ" },
        { label: "سمجھاؤ", text: "کچھ دلچسپ سمجھاؤ" },
        { label: "شکریہ", text: "شکریہ" }
    ]
};

const quickRepliesBox = document.getElementById("quick-replies");
let suggestionsEnabled = localStorage.getItem("suggestions") === "true";

function renderQuickReplies() {
    quickRepliesBox.innerHTML = "";
    const replies = quickReplies[currentLang] || quickReplies["en-US"];
    replies.forEach(reply => {
        const btn = document.createElement("button");
        btn.classList.add("quick-reply-btn");
        btn.textContent = reply.label;
        btn.addEventListener("click", () => { userInput.value = reply.text; sendMessage(); });
        quickRepliesBox.appendChild(btn);
    });
}

const suggestionsToggle = document.getElementById("suggestions-toggle");

function updateSuggestionsToggle() {
    const span = suggestionsToggle.querySelector("span");
    if (suggestionsEnabled) {
        span.textContent = "Suggestions ON";
        quickRepliesBox.classList.remove("hidden");
    } else {
        span.textContent = "Suggestions OFF";
        quickRepliesBox.classList.add("hidden");
    }
}

suggestionsToggle.addEventListener("click", () => {
    suggestionsEnabled = !suggestionsEnabled;
    localStorage.setItem("suggestions", suggestionsEnabled);
    updateSuggestionsToggle();
    if (suggestionsEnabled) renderQuickReplies();
});

const searchToggle = document.getElementById("search-toggle");
const searchBar = document.getElementById("search-bar");
const searchInput = document.getElementById("search-input");
const searchClose = document.getElementById("search-close");

searchToggle.addEventListener("click", () => {
    searchBar.classList.toggle("open");
    if (searchBar.classList.contains("open")) {
        searchInput.focus();
        menuDropdown.classList.remove("open");
        menuButton.classList.remove("active");
    } else {
        searchInput.value = "";
        applySearch("");
    }
});

searchClose.addEventListener("click", () => {
    searchBar.classList.remove("open");
    searchInput.value = "";
    applySearch("");
});

searchInput.addEventListener("input", () => applySearch(searchInput.value));

function applySearch(query) {
    const q = query.trim().toLowerCase();
    const rows = chatBox.querySelectorAll(".message-row:not(#typing-indicator)");
    rows.forEach(row => {
        row.classList.remove("search-match", "search-hide");
        if (q === "") return;
        const msgEl = row.querySelector(".message");
        if (!msgEl) return;
        const text = msgEl.textContent.toLowerCase();
        if (text.includes(q)) row.classList.add("search-match");
        else row.classList.add("search-hide");
    });
}

let currentLang = localStorage.getItem("lang") || "en-US";
const langButton = document.getElementById("lang-button");
const langLabel = document.getElementById("lang-label");
const langModal = document.getElementById("lang-modal");
const langModalClose = document.getElementById("lang-modal-close");
const langGrid = document.getElementById("lang-grid");

function getLangInfo(code) { return LANGUAGES.find(l => l.code === code) || LANGUAGES[0]; }

function updateLangButton() {
    langLabel.textContent = getLangInfo(currentLang).name;
    if (suggestionsEnabled) renderQuickReplies();
}

function renderLangGrid() {
    langGrid.innerHTML = "";
    LANGUAGES.forEach(lang => {
        const btn = document.createElement("button");
        btn.classList.add("lang-option");
        if (lang.code === currentLang) btn.classList.add("active");
        btn.innerHTML = `<span class="flag">${lang.flag}</span><span class="name">${lang.name}</span>`;
        btn.addEventListener("click", () => {
            currentLang = lang.code;
            localStorage.setItem("lang", currentLang);
            updateLangButton();
            renderLangGrid();
            langModal.classList.remove("open");
            if (window.speechSynthesis) window.speechSynthesis.cancel();
        });
        langGrid.appendChild(btn);
    });
}

langButton.addEventListener("click", (e) => {
    e.stopPropagation();
    renderLangGrid();
    langModal.classList.add("open");
    menuDropdown.classList.remove("open");
    menuButton.classList.remove("active");
});

langModalClose.addEventListener("click", () => langModal.classList.remove("open"));
langModal.addEventListener("click", (e) => {
    if (e.target === langModal) langModal.classList.remove("open");
});

let voiceEnabled = localStorage.getItem("voiceEnabled") !== "false";
const voiceToggle = document.getElementById("voice-toggle");

function updateVoiceToggle() {
    const span = voiceToggle.querySelector("span");
    span.textContent = voiceEnabled ? "Voice ON" : "Voice OFF";
}

voiceToggle.addEventListener("click", () => {
    voiceEnabled = !voiceEnabled;
    localStorage.setItem("voiceEnabled", voiceEnabled);
    if (!voiceEnabled) window.speechSynthesis.cancel();
    updateVoiceToggle();
});

function copyMessage(text, btn) {
    navigator.clipboard.writeText(text).then(() => {
        btn.innerHTML = ICONS.check;
        btn.classList.add("copied");
        setTimeout(() => {
            btn.innerHTML = ICONS.copy;
            btn.classList.remove("copied");
        }, 1500);
    }).catch(err => console.error("Copy failed:", err));
}

const shareModal = document.getElementById("share-modal");
const shareModalClose = document.getElementById("share-modal-close");
const sharePreview = document.getElementById("share-preview");
let currentShareText = "";

function openShareModal(text) {
    currentShareText = text;
    sharePreview.textContent = text.length > 150 ? text.slice(0, 150) + "..." : text;
    shareModal.classList.add("open");
}

shareModalClose.addEventListener("click", () => shareModal.classList.remove("open"));
shareModal.addEventListener("click", (e) => {
    if (e.target === shareModal) shareModal.classList.remove("open");
});

document.querySelectorAll(".share-action").forEach(btn => {
    btn.addEventListener("click", async () => {
        const action = btn.dataset.action;
        const text = currentShareText;
        const encoded = encodeURIComponent(text);

        try {
            switch (action) {
                case "whatsapp": window.open(`https://wa.me/?text=${encoded}`, "_blank"); break;
                case "telegram": window.open(`https://t.me/share/url?url=&text=${encoded}`, "_blank"); break;
                case "twitter": window.open(`https://twitter.com/intent/tweet?text=${encoded}`, "_blank"); break;
                case "facebook": window.open(`https://www.facebook.com/sharer/sharer.php?u=${encoded}`, "_blank"); break;
                case "email": window.location.href = `mailto:?subject=Shared%20Message&body=${encoded}`; break;
                case "sms": window.location.href = `sms:?body=${encoded}`; break;
                case "copy":
                    await navigator.clipboard.writeText(text);
                    const label = btn.querySelector("span:last-child");
                    label.textContent = "Copied!";
                    setTimeout(() => { label.textContent = "Copy text"; }, 1500);
                    return;
                case "native":
                    if (navigator.share) {
                        await navigator.share({ title: "Shared Message", text: text });
                    } else {
                        alert("Browser doesn't support native share.");
                        return;
                    }
                    break;
            }
            shareModal.classList.remove("open");
        } catch (err) { console.error("Share error:", err); }
    });
});

function deleteMessage(row, index) {
    row.classList.add("deleting");
    setTimeout(() => {
        row.remove();
        const chat = getCurrentChat();
        if (chat && index !== -1 && chat.messages[index]) {
            chat.messages.splice(index, 1);
            saveChats();
        }
    }, 250);
}

const imageViewer = document.getElementById("image-viewer");
const imageViewerImg = document.getElementById("image-viewer-img");
const imageViewerClose = document.getElementById("image-viewer-close");

function openImageViewer(src) {
    imageViewerImg.src = src;
    imageViewer.classList.add("open");
}

imageViewerClose.addEventListener("click", () => imageViewer.classList.remove("open"));
imageViewer.addEventListener("click", (e) => {
    if (e.target === imageViewer) imageViewer.classList.remove("open");
});

function addMessage(message, sender, skipSave = false, time = null, historyIndex = null, imageData = null, imageName = null) {
    const row = document.createElement("div");
    row.classList.add("message-row");
    if (sender === "user") row.classList.add("user-row");

    const avatar = document.createElement("div");
    avatar.classList.add("avatar");
    avatar.textContent = "AI";

    const bubbleWrapper = document.createElement("div");
    bubbleWrapper.classList.add("bubble-wrapper");

    const messageDiv = document.createElement("div");
    messageDiv.classList.add("message");

    if (imageData) {
        messageDiv.classList.add("has-image");
        
        const loader = document.createElement("div");
        loader.classList.add("image-loader");
        loader.innerHTML = `
            <div style="display:flex;flex-direction:column;align-items:center;gap:10px;padding:40px 20px;">
                <div style="width:36px;height:36px;border:3px solid #e0e4ff;border-top-color:#667eea;border-radius:50%;animation:spin 0.8s linear infinite;"></div>
                <div style="font-size:13px;color:#888;">Image ban rahi hai... 3-5 sec</div>
            </div>
        `;
        messageDiv.appendChild(loader);

        const img = document.createElement("img");
        img.classList.add("message-image");
        img.src = imageData;
        img.alt = "Generated image";
        img.style.display = "none";

        img.addEventListener("load", () => {
            loader.remove();
            img.style.display = "block";
        });

        img.addEventListener("error", () => {
            loader.remove();
            messageDiv.innerHTML = "";
            const errText = document.createElement("div");
            errText.style.padding = "16px";
            errText.style.fontSize = "13px";
            errText.style.color = "#ef4146";
            errText.style.textAlign = "center";
            errText.innerHTML = `⚠️ Image load nahi hui.`;
            messageDiv.appendChild(errText);
        });

        img.addEventListener("click", () => openImageViewer(img.src));
        messageDiv.appendChild(img);

        if (message && message.trim() && message !== "[Image]") {
            const caption = document.createElement("div");
            caption.classList.add("message-caption");
            caption.textContent = message;
            messageDiv.appendChild(caption);
        }
    } else {
        const textClass = getTextClass(message);
        if (textClass) textClass.split(" ").forEach(c => c && messageDiv.classList.add(c));
        messageDiv.textContent = message;
    }

    bubbleWrapper.appendChild(messageDiv);

    const timestampDiv = document.createElement("div");
    timestampDiv.classList.add("timestamp");
    const msgTime = time || getCurrentTime();
    timestampDiv.textContent = msgTime;
    bubbleWrapper.appendChild(timestampDiv);

    const actionsDiv = document.createElement("div");
    actionsDiv.classList.add("action-buttons");

    const copyBtn = document.createElement("button");
    copyBtn.classList.add("copy-btn");
    copyBtn.title = "Copy";
    copyBtn.innerHTML = ICONS.copy;
    copyBtn.addEventListener("click", () => copyMessage(message || (imageName || "Image"), copyBtn));

    const shareBtn = document.createElement("button");
    shareBtn.classList.add("share-btn");
    shareBtn.title = "Share";
    shareBtn.innerHTML = ICONS.share;
    shareBtn.addEventListener("click", () => {
        const shareText = message || (imageName ? `📎 ${imageName}` : "Message");
        openShareModal(shareText);
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.classList.add("delete-btn");
    deleteBtn.title = "Delete";
    deleteBtn.innerHTML = ICONS.trash;
    deleteBtn.addEventListener("click", () => {
        const idx = historyIndex !== null ? historyIndex : chatBox.querySelectorAll(".message-row:not(#typing-indicator)").length - 1;
        deleteMessage(row, idx);
    });

    actionsDiv.appendChild(copyBtn);
    actionsDiv.appendChild(shareBtn);
    actionsDiv.appendChild(deleteBtn);

    row.appendChild(avatar);
    row.appendChild(bubbleWrapper);
    row.appendChild(actionsDiv);

    chatBox.appendChild(row);
    chatBox.scrollTop = chatBox.scrollHeight;

    if (!skipSave) {
        const chat = getCurrentChat();
        if (chat) {
            chat.messages.push({
                message: message,
                sender: sender,
                time: msgTime,
                imageData: imageData || undefined,
                imageName: imageName || undefined
            });
            saveChats();
        }
    }

    if (searchInput.value.trim() !== "") applySearch(searchInput.value);
}

function showTyping() {
    const typingRow = document.createElement("div");
    typingRow.classList.add("message-row");
    typingRow.id = "typing-indicator";

    const typingAvatar = document.createElement("div");
    typingAvatar.classList.add("avatar");
    typingAvatar.textContent = "AI";

    const typingBubble = document.createElement("div");
    typingBubble.classList.add("typing-indicator");
    typingBubble.innerHTML = "<span></span><span></span><span></span>";

    const typingWrapper = document.createElement("div");
    typingWrapper.classList.add("bubble-wrapper");
    typingWrapper.appendChild(typingBubble);

    typingRow.appendChild(typingAvatar);
    typingRow.appendChild(typingWrapper);
    chatBox.appendChild(typingRow);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function hideTyping() {
    const typing = document.getElementById("typing-indicator");
    if (typing) typing.remove();
}

// ===== IMAGE REQUEST DETECTION =====

const IMAGE_ACTION_WORDS = [
    "draw", "draws", "drawing", "paint", "paints", "painting",
    "sketch", "sketches", "illustrate", "illustration",
    "generate", "generates", "create", "creates", "make", "makes",
    "render", "renders", "design", "designs", "show", "shows",
    "imagine", "picture", "pictures", "image", "images",
    "photo", "photos", "artwork", "wallpaper",
    "banao", "bana", "banawo", "dikhao", "dikha", "dikhawo"
];

const COMMON_SUBJECTS = [
    "cat", "cats", "dog", "dogs", "puppy", "puppies", "kitten", "kittens",
    "bird", "birds", "elephant", "tiger", "lion", "bear", "rabbit", "horse",
    "fish", "shark", "whale", "dolphin", "dragon", "unicorn", "monster",
    "sunset", "sunrise", "mountain", "mountains", "forest", "ocean", "sea",
    "beach", "city", "village", "house", "car", "bike", "robot", "flower",
    "rose", "tree", "river", "waterfall", "castle", "galaxy", "planet",
    "astronaut", "pirate", "ninja", "warrior", "princess", "king", "queen",
    "falcon", "peacock", "parrot", "monkey", "gorilla", "panda", "koala",
    "snow", "rain", "storm", "cloud", "sky", "moon", "sun", "stars"
];

const CONTINUATION_WORDS = [
    "another", "more", "again", "one more", "next", "same",
    "aur", "doosri", "doosra", "phir", "aur ek"
];

const FOLLOW_UP_MODIFIERS = [
    "another", "more", "again", "one more", "next", "same",
    "aur", "doosri", "doosra", "phir", "aur ek",
    "blue", "red", "green", "yellow", "pink", "purple", "orange", "black", "white",
    "bigger", "smaller", "cute", "big", "small", "large",
    "night", "day", "sunset", "sunrise", "rain", "snow", "dark", "bright"
];

function isImageRequest(text) {
    const lower = text.toLowerCase().trim();
    
    const hasActionWord = IMAGE_ACTION_WORDS.some(w => {
        const regex = new RegExp(`\\b${w}\\b`, "i");
        return regex.test(lower);
    });
    
    const hasImageKeyword = /\b(image|picture|photo|art|drawing|illustration|wallpaper|painting|sketch)\b/i.test(lower);
    
    const hasSubject = COMMON_SUBJECTS.some(s => {
        const regex = new RegExp(`\\b${s}\\b`, "i");
        return regex.test(lower);
    });
    
    const isContinuation = CONTINUATION_WORDS.some(w => 
        new RegExp(`^${w}\\b`, "i").test(lower) || new RegExp(`\\b${w}\\b`, "i").test(lower)
    );
    
    if (hasActionWord) return true;
    if (hasImageKeyword) return true;
    if (isContinuation) return true;
    if (hasSubject && lower.split(/\s+/).length <= 5) return true;
    
    return false;
}

function lastBotMessageWasImage() {
    const chat = getCurrentChat();
    if (!chat || !chat.messages) return false;
    for (let i = chat.messages.length - 1; i >= 0; i--) {
        const msg = chat.messages[i];
        if (msg.sender === "bot") {
            return !!msg.imageData;
        }
    }
    return false;
}

function isImageFollowUp(text) {
    const lower = text.toLowerCase().trim();
    const words = lower.split(/\s+/);
    if (words.length > 5) return false;

    const hasSubject = COMMON_SUBJECTS.some(s =>
        new RegExp(`\\b${s}\\b`, "i").test(lower)
    );
    if (hasSubject) return true;

    const hasModifier = FOLLOW_UP_MODIFIERS.some(m =>
        new RegExp(`\\b${m}\\b`, "i").test(lower)
    );
    if (hasModifier) return true;

    return false;
}

function extractImagePrompt(text) {
    let cleaned = text.trim();
    cleaned = cleaned.replace(/^(generate|create|make|draw|paint|render|show|imagine|design|sketch|illustrate)\s+(me\s+)?(a\s+|an\s+|the\s+)?(image|picture|photo|art|drawing|illustration|wallpaper|painting|sketch)\s+(of\s+|about\s+)?/i, "");
    cleaned = cleaned.replace(/^(banao|bana|banawo|dikhao|dikha|dikhawo)\s+/i, "");
    cleaned = cleaned.replace(/\s+(banao|bana|banawo|dikhao|dikha|dikhawo)$/i, "");
    return cleaned.trim() || text;
}

// ===== Generate Image =====
let isGeneratingImage = false;

async function generateImage(userPrompt) {
    if (isGeneratingImage) {
        addMessage("⏳ Ek image abhi ban rahi hai. Thoda intezar karein...", "bot");
        return;
    }

    isGeneratingImage = true;
    showTyping();

    try {
        let cleanPrompt = userPrompt.replace(/^🎨\s*/, "").trim();

        if (cleanPrompt.split(/\s+/).length <= 2 && lastBotMessageWasImage()) {
            const chat = getCurrentChat();
            let prevSubject = "";
            
            for (let i = chat.messages.length - 1; i >= 0; i--) {
                const msg = chat.messages[i];
                if (msg.sender === "user" && msg.message.includes("🎨")) {
                    prevSubject = msg.message.replace("🎨", "").trim();
                    break;
                }
            }
            
            if (prevSubject) {
                cleanPrompt = cleanPrompt + ", " + prevSubject;
            }
        }

        // Simple suffix that doesn't trigger NSFW
        const enhancedPrompt = cleanPrompt + ", digital art";
        console.log("🎨 Final prompt:", enhancedPrompt);

        const response = await fetch("/generate-image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: enhancedPrompt })
        });

        if (!response.ok) {
            throw new Error("Server error " + response.status);
        }

        const data = await response.json();

        if (data.error) {
            throw new Error(data.error);
        }

        hideTyping();
        addMessage("Here's your image:", "bot", false, null, null, data.image, "Generated: " + cleanPrompt);
        isGeneratingImage = false;

    } catch (err) {
        console.error("Image gen error:", err);
        hideTyping();
        isGeneratingImage = false;
        addMessage("⚠️ Image generate nahi ho saki. " + (err.message || "Dobara try karein."), "bot");
    }
}

// ===== Send Message =====
async function sendMessage() {
    const message = userInput.value.trim();
    if (message === "" && pendingAttachments.length === 0) return;

    const isExplicit = isImageRequest(message);
    const isFollowUp = pendingAttachments.length === 0 && lastBotMessageWasImage() && isImageFollowUp(message);
    const isImageIntent = isExplicit || isFollowUp;

    if (message && pendingAttachments.length === 0 && isImageIntent) {
        const imagePrompt = extractImagePrompt(message);
        addMessage("🎨 " + imagePrompt, "user");
        userInput.value = "";
        updateChatTitle("🎨 " + imagePrompt);

        emojiPicker.classList.remove("open");
        emojiButton.classList.remove("active");

        generateImage(imagePrompt);
        return;
    }

    let userMessageForAPI = message;

    if (pendingAttachments.length > 0) {
        pendingAttachments.forEach(att => {
            addMessage(message || "", "user", false, null, null, att.data, att.name);
            if (message) userMessageForAPI = message;
        });

        if (!message) {
            userMessageForAPI = pendingAttachments.map(a => a.isImage ? "[Sent a photo]" : "[Sent file: " + a.name + "]").join(" ");
        }

        pendingAttachments = [];
        renderAttachmentPreview();
    } else {
        addMessage(message, "user");
    }

    userInput.value = "";
    if (message) updateChatTitle(message);
    else if (userMessageForAPI) updateChatTitle(userMessageForAPI);

    emojiPicker.classList.remove("open");
    emojiButton.classList.remove("active");

    if (suggestionsEnabled) {
        quickRepliesBox.style.opacity = "0.4";
        quickRepliesBox.style.pointerEvents = "none";
    }

    sendButton.disabled = true;
    showTyping();

    try {
        const chat = getCurrentChat();
        const history = chat ? chat.messages.slice(0, -1) : [];

        const response = await fetch("/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                message: userMessageForAPI,
                history: history
            })
        });

        if (!response.ok) throw new Error("Server error " + response.status);

        const data = await response.json();
        hideTyping();

        const reply = data.reply || "";
        const hasFakeImage = /!\[.*?\]\(https?:\/\/.*?(dall-e|oaidalle|openai|blob\.core).*?\)/i.test(reply);
        
        if (hasFakeImage) {
            console.log("🎨 Fake image detected, generating with Cloudflare instead");
            const cleanPrompt = extractImagePrompt(userMessageForAPI);
            generateImage(cleanPrompt);
            return;
        }

        addMessage(reply, "bot");
        speakText(reply);

    } catch (error) {
        console.error("Chat error:", error);
        hideTyping();
        addMessage("Error: " + (error.message || "Connection failed"), "bot");
    } finally {
        sendButton.disabled = false;
        userInput.focus();
        if (suggestionsEnabled) {
            quickRepliesBox.style.opacity = "1";
            quickRepliesBox.style.pointerEvents = "auto";
        }
    }
}

sendButton.addEventListener("click", sendMessage);
userInput.addEventListener("keydown", (e) => { if (e.key === "Enter") sendMessage(); });

clearButton.addEventListener("click", () => {
    const chat = getCurrentChat();
    if (!chat) return;
    chatBox.innerHTML = "";
    chat.messages = [];
    chat.title = "New Chat";
    addMessage("Hello! How can I help you today?", "bot");
    window.speechSynthesis.cancel();
    saveChats();
    renderSidebar();
});

const voiceButton = document.getElementById("voice-button");
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognition) {
    let recognition = null;
    let isListening = false;

    function createRecognition() {
        recognition = new SpeechRecognition();
        recognition.lang = currentLang;
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onstart = () => {
            isListening = true;
            voiceButton.classList.add("listening");
        };

        recognition.onend = () => {
            isListening = false;
            voiceButton.classList.remove("listening");
        };

        recognition.onresult = (event) => {
            userInput.value = event.results[0][0].transcript;
            userInput.focus();
        };

        recognition.onerror = (event) => {
            console.log("Mic error:", event.error);
            alert("Mic error: " + event.error);
        };
    }

    createRecognition();

    voiceButton.addEventListener("click", () => {
        if (isListening) { recognition.stop(); return; }
        try { createRecognition(); recognition.start(); }
        catch (err) { console.log("Mic start error:", err); }
    });
} else {
    voiceButton.addEventListener("click", () => {
        alert("Browser doesn't support voice input. Use Chrome.");
    });
}

function speakText(text) {
    if (!voiceEnabled) return;
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    const detectedLang = detectLanguage(text);
    const voices = window.speechSynthesis.getVoices();
    const langPrefix = detectedLang.split("-")[0].toLowerCase();
    const hasVoice = voices.some(v => v.lang.toLowerCase().startsWith(langPrefix));

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = hasVoice ? detectedLang : (currentLang || "en-US");
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;
    window.speechSynthesis.speak(utterance);
}

if (window.speechSynthesis) {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
}

const themeButton = document.getElementById("theme-button");

function updateThemeButton() {
    const span = themeButton.querySelector("span");
    span.textContent = document.body.classList.contains("dark-mode") ? "Light mode" : "Dark mode";
}

if (localStorage.getItem("theme") === "dark") {
    document.body.classList.add("dark-mode");
}

themeButton.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
    localStorage.setItem("theme", document.body.classList.contains("dark-mode") ? "dark" : "light");
    updateThemeButton();
});

updateLangButton();
updateVoiceToggle();
updateSuggestionsToggle();
updateThemeButton();
if (suggestionsEnabled) renderQuickReplies();

if (chats.length === 0) {
    createNewChat();
} else {
    if (!currentChatId || !chats.find(c => c.id === currentChatId)) {
        currentChatId = chats[0].id;
    }
    loadChat(currentChatId);
}

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('service-worker.js')
            .then(reg => console.log('PWA ready'))
            .catch(err => console.log('PWA error:', err));
    });
}

const imageButton = document.getElementById("image-button");

imageButton.addEventListener("click", () => {
    const prompt = userInput.value.trim();
    if (!prompt) {
        alert("Please describe the image you want to generate.");
        return;
    }

    addMessage("🎨 " + prompt, "user");
    userInput.value = "";
    updateChatTitle("🎨 " + prompt);

    emojiPicker.classList.remove("open");
    emojiButton.classList.remove("active");

    generateImage(prompt);
});