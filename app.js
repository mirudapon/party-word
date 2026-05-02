const wordBank = {
    action: ["打噴嚏", "騎腳踏車", "煮飯", "游泳", "彈吉他", "拍照", "滑雪", "釣魚", "打籃球", "唱歌", "刷牙", "洗碗", "拖地", "澆花", "遛狗", "跳舞", "瑜伽", "衝浪"],
    animal: ["大象", "恐龍", "企鵝", "長頸鹿", "鯊魚", "蝴蝶", "螃蟹", "貓頭鷹", "袋鼠", "河馬"],
    food: ["披薩", "火鍋", "壽司", "珍珠奶茶", "漢堡", "冰淇淋", "拉麵", "鹹酥雞", "巧克力", "蛋糕"],
    object: ["飛機", "潛水艇", "摩天輪", "雲霄飛車", "熱氣球", "吸塵器", "直升機", "望遠鏡", "滑板", "降落傘"],
    place: ["太空站", "遊樂園", "圖書館", "海底世界", "火山", "沙漠", "北極", "金字塔", "城堡", "夜市"],
    person: ["太空人", "鋼鐵人", "機器人", "忍者", "海盜", "超人", "魔術師", "消防員", "廚師", "偵探"]
};

// Settings
let settings = {
    mode: "rounds",
    rounds: 10,
    timeLimit: 60,
    categories: ["action", "animal", "food", "object", "place", "person"]
};

// Game state
let currentRound = 0;
let results = [];
let roundStartTime = null;
let usedWords = [];
let gameActive = false;
let gameTimer = null;
let timeRemaining = 0;

// DOM elements
const coverScreen = document.getElementById("cover-screen");
const settingsScreen = document.getElementById("settings-screen");
const gameScreen = document.getElementById("game-screen");
const resultScreen = document.getElementById("result-screen");
const card = document.getElementById("card");
const wordEl = document.getElementById("word");
const currentRoundEl = document.getElementById("current-round");
const totalDisplayEl = document.getElementById("total-display");
const progressText = document.getElementById("progress-text");
const timerDisplay = document.getElementById("timer-display");
const resultList = document.getElementById("result-list");
const restartBtn = document.getElementById("restart-btn");
const startBtn = document.getElementById("start-btn");
const settingsBtn = document.getElementById("settings-btn");
const settingsBackBtn = document.getElementById("settings-back-btn");
const roundsSetting = document.getElementById("rounds-setting");
const timeSetting = document.getElementById("time-setting");
const roundsValue = document.getElementById("rounds-value");
const timeValue = document.getElementById("time-value");

function getActiveWords() {
    let words = [];
    settings.categories.forEach(cat => {
        if (wordBank[cat]) words = words.concat(wordBank[cat]);
    });
    return words;
}

function getRandomWord() {
    const allWords = getActiveWords();
    const available = allWords.filter(w => !usedWords.includes(w));
    if (available.length === 0) return "---";
    const word = available[Math.floor(Math.random() * available.length)];
    usedWords.push(word);
    return word;
}

function startRound() {
    currentRound++;
    currentRoundEl.textContent = currentRound;
    wordEl.textContent = getRandomWord();
    roundStartTime = Date.now();
    card.className = "";
    card.style.transform = "";
    card.style.opacity = "";
}

function endRound(status) {
    const timeSpent = ((Date.now() - roundStartTime) / 1000).toFixed(1);
    results.push({
        word: wordEl.textContent,
        time: timeSpent,
        status: status
    });

    if (settings.mode === "rounds" && currentRound >= settings.rounds) {
        showResults();
    } else {
        card.classList.add("animating");
        card.classList.add(status === "completed" ? "swipe-left" : "swipe-right");
        setTimeout(() => startRound(), 300);
    }
}

function startGame() {
    currentRound = 0;
    results = [];
    usedWords = [];

    coverScreen.classList.add("hidden");
    gameScreen.classList.remove("hidden");
    gameActive = true;

    if (settings.mode === "rounds") {
        totalDisplayEl.textContent = settings.rounds;
        progressText.classList.remove("hidden");
        timerDisplay.classList.add("hidden");
    } else {
        progressText.classList.add("hidden");
        timerDisplay.classList.remove("hidden");
        timeRemaining = settings.timeLimit;
        updateTimerDisplay();
        gameTimer = setInterval(() => {
            timeRemaining--;
            updateTimerDisplay();
            if (timeRemaining <= 0) {
                clearInterval(gameTimer);
                // Record current card as skipped
                const timeSpent = ((Date.now() - roundStartTime) / 1000).toFixed(1);
                results.push({ word: wordEl.textContent, time: timeSpent, status: "skipped" });
                showResults();
            }
        }, 1000);
    }

    startRound();
}

function updateTimerDisplay() {
    const mins = Math.floor(timeRemaining / 60);
    const secs = timeRemaining % 60;
    timerDisplay.textContent = `${mins}:${secs.toString().padStart(2, "0")}`;
}

function showResults() {
    gameActive = false;
    if (gameTimer) {
        clearInterval(gameTimer);
        gameTimer = null;
    }
    gameScreen.classList.add("hidden");
    resultScreen.classList.remove("hidden");

    resultList.innerHTML = results.map((r, i) => `
        <div class="result-item">
            <span class="result-word">${i + 1}. ${r.word}</span>
            <div class="result-info">
                <span class="result-time">${r.time}s</span>
                <span class="result-status ${r.status}">${r.status === "completed" ? "完成" : "跳過"}</span>
            </div>
        </div>
    `).join("");
}

function resetGame() {
    resultScreen.classList.add("hidden");
    coverScreen.classList.remove("hidden");
}

// Settings
function openSettings() {
    coverScreen.classList.add("hidden");
    settingsScreen.classList.remove("hidden");
}

function closeSettings() {
    settingsScreen.classList.add("hidden");
    coverScreen.classList.remove("hidden");
}

// Mode toggle
document.querySelectorAll(".toggle-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".toggle-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        settings.mode = btn.dataset.mode;
        if (settings.mode === "rounds") {
            roundsSetting.classList.remove("hidden");
            timeSetting.classList.add("hidden");
        } else {
            roundsSetting.classList.add("hidden");
            timeSetting.classList.remove("hidden");
        }
    });
});

// Rounds stepper
document.getElementById("rounds-minus").addEventListener("click", () => {
    settings.rounds = Math.max(3, settings.rounds - 1);
    roundsValue.textContent = settings.rounds;
});
document.getElementById("rounds-plus").addEventListener("click", () => {
    settings.rounds = Math.min(30, settings.rounds + 1);
    roundsValue.textContent = settings.rounds;
});

// Time stepper
document.getElementById("time-minus").addEventListener("click", () => {
    settings.timeLimit = Math.max(15, settings.timeLimit - 15);
    timeValue.textContent = settings.timeLimit;
});
document.getElementById("time-plus").addEventListener("click", () => {
    settings.timeLimit = Math.min(300, settings.timeLimit + 15);
    timeValue.textContent = settings.timeLimit;
});

// Category toggles
document.querySelectorAll(".category-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        const cat = btn.dataset.category;
        if (btn.classList.contains("active")) {
            if (settings.categories.length > 1) {
                settings.categories = settings.categories.filter(c => c !== cat);
                btn.classList.remove("active");
            }
        } else {
            settings.categories.push(cat);
            btn.classList.add("active");
        }
    });
});

// Swipe handling
let startX = 0;
let currentX = 0;
let isDragging = false;

function onPointerDown(e) {
    if (!gameActive) return;
    isDragging = true;
    startX = e.clientX;
    card.style.transition = "none";
    e.preventDefault();
}

function onPointerMove(e) {
    if (!isDragging) return;
    currentX = e.clientX - startX;
    const rotation = currentX * 0.1;
    card.style.transform = `translateX(${currentX}px) rotate(${rotation}deg)`;
    card.style.opacity = Math.max(0.5, 1 - Math.abs(currentX) / 300);
}

function onPointerUp() {
    if (!isDragging) return;
    isDragging = false;

    const threshold = 100;

    if (currentX < -threshold) {
        card.classList.add("animating");
        card.classList.add("swipe-left");
        setTimeout(() => endRound("completed"), 300);
    } else if (currentX > threshold) {
        card.classList.add("animating");
        card.classList.add("swipe-right");
        setTimeout(() => endRound("skipped"), 300);
    } else {
        card.style.transition = "transform 0.3s ease, opacity 0.3s ease";
        card.style.transform = "";
        card.style.opacity = "";
    }
    currentX = 0;
}

card.addEventListener("pointerdown", onPointerDown);
document.addEventListener("pointermove", onPointerMove);
document.addEventListener("pointerup", onPointerUp);

// Button listeners
startBtn.addEventListener("click", startGame);
settingsBtn.addEventListener("click", openSettings);
settingsBackBtn.addEventListener("click", closeSettings);
restartBtn.addEventListener("click", resetGame);
