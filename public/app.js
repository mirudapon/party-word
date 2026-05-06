const categoryNameMap = {
    action: "動作",
    animal: "動物",
    food: "食物",
    object: "物品",
    place: "地點",
    person: "人物"
};

let fetchedWords = [];

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
let gameActive = false;
let gameTimer = null;
let timeRemaining = 0;

// DOM elements
const coverScreen = document.getElementById("cover-screen");
const gameScreen = document.getElementById("game-screen");
const resultScreen = document.getElementById("result-screen");
const card = document.getElementById("card");
const wordEl = document.getElementById("word");
const currentRoundEl = document.getElementById("current-round");
const totalDisplayEl = document.getElementById("total-display");
const progressText = document.getElementById("progress-text");
const timerDisplay = document.getElementById("timer-display");
const resultList = document.getElementById("result-list");
const wordEnglishEl = document.getElementById("word-english");
const restartBtn = document.getElementById("restart-btn");
const startBtn = document.getElementById("start-btn");
const roundsSetting = document.getElementById("rounds-setting");
const timeSetting = document.getElementById("time-setting");
const roundsValue = document.getElementById("rounds-value");
const timeValue = document.getElementById("time-value");

async function fetchWords(count, categories) {
    const categoryNames = categories.map(c => categoryNameMap[c] || c);
    const res = await fetch("/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count, category: categoryNames })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    // Normalize: ensure each item is { word, english }
    return data.words.map(item => {
        if (typeof item === "string") {
            return { word: item, english: "" };
        }
        return { word: item.word || "", english: item.english || "" };
    });
}

function getRandomWord() {
    if (fetchedWords.length === 0) return { word: "---", english: "" };
    return fetchedWords.shift();
}

function startRound() {
    currentRound++;
    currentRoundEl.textContent = currentRound;
    const item = getRandomWord();
    wordEl.textContent = item.word;
    wordEnglishEl.textContent = item.english;
    roundStartTime = Date.now();
    card.className = "";
    card.style.transform = "";
    card.style.opacity = "";
    card.style.transition = "";
}

function endRound(status) {
    const timeSpent = ((Date.now() - roundStartTime) / 1000).toFixed(1);
    results.push({
        word: wordEl.textContent,
        english: wordEnglishEl.textContent,
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

async function startGame() {
    currentRound = 0;
    results = [];
    fetchedWords = [];

    // Show loading state
    startBtn.disabled = true;
    startBtn.textContent = "載入中...";

    try {
        const count = settings.mode === "rounds" ? settings.rounds : 50;
        fetchedWords = await fetchWords(count, settings.categories);
    } catch (err) {
        alert("無法取得詞語：" + err.message);
        startBtn.disabled = false;
        startBtn.textContent = "開始遊戲";
        return;
    }

    startBtn.disabled = false;
    startBtn.textContent = "開始遊戲";

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
                results.push({ word: wordEl.textContent, english: wordEnglishEl.textContent, time: timeSpent, status: "skipped" });
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
            <span class="result-word">${i + 1}. ${r.word}${r.english ? " / " + r.english : ""}</span>
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
        card.style.transition = "transform 0.3s ease, opacity 0.3s ease";
        card.style.transform = "translateX(-150%) rotate(-20deg)";
        card.style.opacity = "0";
        setTimeout(() => endRound("completed"), 300);
    } else if (currentX > threshold) {
        card.style.transition = "transform 0.3s ease, opacity 0.3s ease";
        card.style.transform = "translateX(150%) rotate(20deg)";
        card.style.opacity = "0";
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

// Keyboard support
document.addEventListener("keydown", (e) => {
    if (!gameActive) return;
    if (e.key === "ArrowLeft") {
        card.style.transition = "";
        card.classList.add("animating");
        card.classList.add("swipe-left");
        setTimeout(() => endRound("completed"), 300);
    } else if (e.key === "ArrowRight") {
        card.style.transition = "";
        card.classList.add("animating");
        card.classList.add("swipe-right");
        setTimeout(() => endRound("skipped"), 300);
    }
});

// Button listeners
startBtn.addEventListener("click", startGame);
restartBtn.addEventListener("click", resetGame);
