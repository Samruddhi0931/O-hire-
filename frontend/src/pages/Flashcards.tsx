import { useEffect, useState } from "react";
import { api } from "../api";
import { Brain, Sparkles, RotateCcw, ChevronDown } from "lucide-react";

interface Flashcard {
  id: number;
  question: string;
  answer: string;
  topic_name: string;
  ease_factor: number;
  interval: number;
  repetitions: number;
}

interface Topic {
  id: number;
  name: string;
  category: string;
}

const QUALITY_BUTTONS = [
  { score: 0, label: "Blackout", color: "bg-red-700 hover:bg-red-600", desc: "Complete blank" },
  { score: 1, label: "Wrong", color: "bg-red-600 hover:bg-red-500", desc: "Wrong but familiar" },
  { score: 2, label: "Hard", color: "bg-orange-600 hover:bg-orange-500", desc: "Correct with effort" },
  { score: 3, label: "Ok", color: "bg-yellow-600 hover:bg-yellow-500", desc: "Correct with difficulty" },
  { score: 4, label: "Good", color: "bg-green-600 hover:bg-green-500", desc: "Correct with hesitation" },
  { score: 5, label: "Perfect", color: "bg-green-500 hover:bg-green-400", desc: "Instant recall" },
];

export default function Flashcards() {
  const [dueCards, setDueCards] = useState<Flashcard[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [mode, setMode] = useState<"review" | "add" | "generate">("review");
  const [loading, setLoading] = useState(true);
  const [sessionDone, setSessionDone] = useState(false);
  const [reviewed, setReviewed] = useState(0);

  // Add card form
  const [selectedTopic, setSelectedTopic] = useState<number | null>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");

  // AI generate form
  const [generateTopic, setGenerateTopic] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<Flashcard[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [due, topicList] = await Promise.all([api.getDueCards(), api.getTopics()]);
    setDueCards(due);
    setTopics(topicList);
    if (topicList.length > 0) {
      setSelectedTopic(topicList[0].id);
      setGenerateTopic(topicList[0].id);
    }
    setLoading(false);
  };

  const handleReview = async (quality: number) => {
    const card = dueCards[currentIndex];
    await api.reviewCard(card.id, quality);
    await api.recordStudySession();
    setReviewed(reviewed + 1);
    setShowAnswer(false);

    if (currentIndex + 1 >= dueCards.length) {
      setSessionDone(true);
    } else {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleAddCard = async () => {
    if (!question.trim() || !answer.trim() || !selectedTopic) return;
    await api.createCard(selectedTopic, question, answer);
    setQuestion("");
    setAnswer("");
    alert("Card added!");
  };

  const handleGenerate = async () => {
    if (!notes.trim() || !generateTopic) return;
    setGenerating(true);
    try {
      const cards = await api.generateCards(generateTopic, notes);
      setGenerated(cards);
    } finally {
      setGenerating(false);
    }
  };

  const currentCard = dueCards[currentIndex];

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Flashcards</h2>
          <p className="text-gray-400 text-sm mt-1">
            {dueCards.length} cards due for review today
          </p>
        </div>
        <div className="flex bg-gray-800 rounded-lg p-1">
          {[
            { id: "review", label: "Review" },
            { id: "add", label: "Add Card" },
            { id: "generate", label: "✨ AI Generate" },
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id as any)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${mode === m.id ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"
                }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* REVIEW MODE */}
      {mode === "review" && (
        <>
          {loading ? (
            <div className="text-center text-gray-500 py-16">Loading cards...</div>
          ) : sessionDone || dueCards.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
              <Brain size={48} className="mx-auto mb-4 text-green-400" />
              <h3 className="text-white text-xl font-bold mb-2">
                {reviewed > 0 ? "Session Complete!" : "No Cards Due"}
              </h3>
              <p className="text-gray-400 mb-6">
                {reviewed > 0
                  ? `You reviewed ${reviewed} cards. Great work!`
                  : "You're all caught up. Add more cards or check back tomorrow."}
              </p>
              {reviewed > 0 && (
                <button
                  onClick={() => { setCurrentIndex(0); setSessionDone(false); setReviewed(0); fetchData(); }}
                  className="flex items-center gap-2 mx-auto text-blue-400 hover:text-blue-300 text-sm"
                >
                  <RotateCcw size={14} />
                  Start new session
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Progress bar */}
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-gray-800 rounded-full h-2">
                  <div
                    className="h-2 bg-blue-500 rounded-full transition-all"
                    style={{ width: `${(currentIndex / dueCards.length) * 100}%` }}
                  />
                </div>
                <span className="text-gray-500 text-sm">{currentIndex}/{dueCards.length}</span>
              </div>

              {/* Card */}
              <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                {/* Topic badge */}
                <div className="px-6 pt-5 pb-0">
                  <span className="text-xs text-blue-400 bg-blue-900/30 border border-blue-800 px-3 py-1 rounded-full">
                    {currentCard?.topic_name}
                  </span>
                </div>

                {/* Question */}
                <div className="px-6 py-6">
                  <p className="text-gray-300 text-sm mb-2">Question</p>
                  <p className="text-white text-lg font-medium leading-relaxed">
                    {currentCard?.question}
                  </p>
                </div>

                {/* Show answer button */}
                {!showAnswer ? (
                  <div className="px-6 pb-6">
                    <button
                      onClick={() => setShowAnswer(true)}
                      className="w-full bg-gray-800 hover:bg-gray-700 text-white py-3 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <ChevronDown size={16} />
                      Show Answer
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Answer */}
                    <div className="px-6 py-4 border-t border-gray-800 bg-gray-800/50">
                      <p className="text-gray-400 text-sm mb-2">Answer</p>
                      <p className="text-green-300 leading-relaxed">{currentCard?.answer}</p>
                    </div>

                    {/* SM-2 Rating */}
                    <div className="px-6 py-5">
                      <p className="text-gray-500 text-xs mb-3 text-center">
                        How well did you recall this? (affects next review date)
                      </p>
                      <div className="grid grid-cols-3 gap-2 md:grid-cols-6">
                        {QUALITY_BUTTONS.map((btn) => (
                          <button
                            key={btn.score}
                            onClick={() => handleReview(btn.score)}
                            className={`${btn.color} text-white py-2 px-1 rounded-lg text-xs font-medium transition-colors`}
                          >
                            <div>{btn.label}</div>
                            <div className="opacity-70 text-xs mt-0.5 hidden md:block">{btn.score}/5</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Card stats */}
              <div className="flex gap-4 text-xs text-gray-600 justify-center">
                <span>Ease: {currentCard?.ease_factor?.toFixed(2)}</span>
                <span>Interval: {currentCard?.interval}d</span>
                <span>Reps: {currentCard?.repetitions}</span>
              </div>
            </>
          )}
        </>
      )}

      {/* ADD CARD MODE */}
      {mode === "add" && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
          <h3 className="text-white font-medium">Add a Flashcard</h3>

          <div>
            <label className="text-gray-400 text-sm mb-1 block">Topic</label>
            <select
              value={selectedTopic || ""}
              onChange={(e) => setSelectedTopic(Number(e.target.value))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
            >
              {topics.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-gray-400 text-sm mb-1 block">Question</label>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. What is the time complexity of binary search?"
              rows={3}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>

          <div>
            <label className="text-gray-400 text-sm mb-1 block">Answer</label>
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="e.g. O(log n) — we halve the search space each step"
              rows={3}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>

          <button
            onClick={handleAddCard}
            disabled={!question.trim() || !answer.trim() || !selectedTopic}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white py-3 rounded-lg font-medium transition-colors"
          >
            Add Card
          </button>
        </div>
      )}

      {/* AI GENERATE MODE */}
      {mode === "generate" && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-yellow-400" />
            <h3 className="text-white font-medium">AI Flashcard Generator</h3>
          </div>
          <p className="text-gray-500 text-sm">Paste your study notes and get 5 flashcards instantly.</p>

          <div>
            <label className="text-gray-400 text-sm mb-1 block">Topic</label>
            <select
              value={generateTopic || ""}
              onChange={(e) => setGenerateTopic(Number(e.target.value))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
            >
              {topics.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-gray-400 text-sm mb-1 block">Your Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Paste your study notes here..."
              rows={6}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>

          <button
            onClick={handleGenerate}
            disabled={!notes.trim() || !generateTopic || generating}
            className="w-full bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-700 disabled:text-gray-500 text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Sparkles size={16} />
            {generating ? "Generating..." : "Generate 5 Flashcards"}
          </button>

          {/* Generated cards preview */}
          {generated.length > 0 && (
            <div className="space-y-3 mt-4">
              <p className="text-green-400 text-sm font-medium">
                ✓ {generated.length} cards added to your deck!
              </p>
              {generated.map((card, i) => (
                <div key={i} className="bg-gray-800 rounded-xl p-4 space-y-2">
                  <p className="text-white text-sm font-medium">Q: {card.question}</p>
                  <p className="text-green-300 text-sm">A: {card.answer}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
