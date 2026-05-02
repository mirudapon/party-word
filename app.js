const words = [
    "大象", "披薩", "太空人", "瑜伽", "恐龍",
    "鋼鐵人", "火鍋", "衝浪", "機器人", "跳舞",
    "打噴嚏", "騎腳踏車", "煮飯", "游泳", "彈吉他",
    "拍照", "滑雪", "釣魚", "打籃球", "唱歌",
    "刷牙", "洗碗", "拖地", "澆花", "遛狗",
    "飛機", "潛水艇", "摩天輪", "雲霄飛車", "熱氣球"
];

const TOTAL_ROUNDS = 10;
let currentRound = 0;
let results = [];
let roundStartTime = null;
let usedWords = [];

const gameScreen = document.getElementById("game-screen");
const resultScreen = document.getElementById("result-screen");
const card = document.getElementById("card");
const wordEl = document.getElementById("word");
const currentRoundEl = document.getElementById("current-round");
const resultList = document.getElementById("result-list");
const restartBtn = document.getElementById("restart-btn");

function getRandomWord() {
    const available = words.filter(w => !usedWords.includes(w));
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

    if (currentRound >= TOTAL_ROUNDS) {
        showResults();
    } else {
        card.classList.add("animating");
        card.classList.add(status === "completed" ? "swipe-left" : "swipe-right");
        setTimeout(() => {
            startRound();
        }, 300);
    }
}

function showResults() {
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
    currentRound = 0;
    results = [];
    usedWords = [];
    resultScreen.classList.add("hidden");
    gameScreen.classList.remove("hidden");
    startRound();
}

// Swipe handling
let startX = 0;
let currentX = 0;
let isDragging = false;

function onPointerDown(e) {
    isDragging = true;
    startX = e.clientX;
    card.style.transition = "none";
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

restartBtn.addEventListener("click", resetGame);

// Start game
startRound();
