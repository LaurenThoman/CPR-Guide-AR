// QuizMode.js
var questions = [
    {
        q: "How many compressions per cycle?",
        options: ["15", "30", "50", "10"],
        correct: 1
    },
    {
        q: "What is the target compression rate?",
        options: ["60-80 bpm", "100-120 bpm", "140-160 bpm", "80-100 bpm"],
        correct: 1
    },
    {
        q: "What do you do first?",
        options: ["Start compressions", "Give breaths", "Check scene safety", "Call 911"],
        correct: 2
    },
    {
        q: "How deep should compressions be?",
        options: ["1 inch", "2 inches", "3 inches", "4 inches"],
        correct: 1
    }
];

var currentQ = 0;
var score = 0;
var answered = false;

function loadQuestion(index) {
    currentQ = index;
    answered = false;
    var q = questions[index];

    if (global.QuizMode.onQuestionLoaded) {
        global.QuizMode.onQuestionLoaded(index, q.q, q.options, questions.length);
    }
    print("Quiz Q" + (index + 1) + ": " + q.q);
}

// Person 3 calls this when user taps an answer
function submitAnswer(selectedIndex) {
    if (answered) return;
    answered = true;

    var correct = (selectedIndex === questions[currentQ].correct);
    if (correct) score++;

    if (global.QuizMode.onAnswerResult) {
        global.QuizMode.onAnswerResult(correct, questions[currentQ].correct);
    }
    print("Answer: " + (correct ? "Correct!" : "Wrong.") + " Score: " + score);
}

function next() {
    if (!answered) return;
    if (currentQ < questions.length - 1) {
        loadQuestion(currentQ + 1);
    } else {
        var passed = score >= 3;
        if (global.QuizMode.onQuizComplete) {
            global.QuizMode.onQuizComplete(score, questions.length, passed);
        }
        print("Quiz done. Score: " + score + "/" + questions.length + (passed ? " PASS" : " FAIL"));
    }
}

function reset() {
    score = 0;
    loadQuestion(0);
}

global.QuizMode = {
    submitAnswer: submitAnswer, // ← Person 3 calls this on tap
    next: next,
    reset: reset,

    // Person 3 overwrites these
    onQuestionLoaded: null,
    onAnswerResult: null,
    onQuizComplete: null
};

var onEnabled = script.createEvent("OnEnableEvent");
onEnabled.bind(function() { reset(); });