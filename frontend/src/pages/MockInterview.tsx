import { useState, useEffect, useRef } from "react";
import { api } from "../api";
import { Play, Clock, Send, ChevronRight, RotateCcw, CheckCircle, XCircle, AlertCircle } from "lucide-react";

interface Question {
    id: number;
    title: string;
    difficulty: string;
    tags: string[];
    url: string;
}

interface Feedback {
    timeComplexity: string;
    spaceComplexity: string;
    correctness: string;
    edgeCasesMissed: string[];
    suggestions: string[];
    score: number;
    summary: string;
}

interface Session {
    sessionId: number;
    question: Question & {
        content: string | null;
        exampleTestcases: string | null;
        hints: string[];
    };
    startedAt: string;
    timeLimit: number;
}

const DIFFICULTY_COLOR: Record<string, string> = {
    easy: "text-green-400",
    medium: "text-yellow-400",
    hard: "text-red-400",
};

const LANGUAGES = ["javascript", "python", "java", "cpp", "typescript"];

export default function MockInterview() {
    const [phase, setPhase] = useState<"setup" | "coding" | "feedback" | "history">("setup");
    const [company, setCompany] = useState("Google");
    const [difficulty, setDifficulty] = useState("medium");
    const [language, setLanguage] = useState("javascript");
    const [session, setSession] = useState<Session | null>(null);
    const [code, setCode] = useState("");
    const [feedback, setFeedback] = useState<Feedback | null>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [timeLeft, setTimeLeft] = useState(0);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const timerRef = useRef<any>(null);

    useEffect(() => {
        if (phase === "history") fetchHistory();
    }, [phase]);

    useEffect(() => {
        if (phase === "coding" && timeLeft > 0) {
            timerRef.current = setInterval(() => {
                setTimeLeft((t) => {
                    if (t <= 1) {
                        clearInterval(timerRef.current);
                        return 0;
                    }
                    return t - 1;
                });
            }, 1000);
        }
        return () => clearInterval(timerRef.current);
    }, [phase]);

    const fetchHistory = async () => {
        const data = await api.getInterviewHistory();
        setHistory(data);
    };

    const handleStart = async () => {
        setLoading(true);
        try {
            const data = await api.startInterview(company, difficulty);
            if (data.error) {
                alert(data.error);
                return;
            }
            setSession(data);
            setTimeLeft(data.timeLimit);
            setCode(getStarterCode(language));
            setPhase("coding");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!session) return;
        setSubmitting(true);
        try {
            const result = await api.submitInterview(session.sessionId, code, language);
            setFeedback(result.feedback);
            setPhase("feedback");
            clearInterval(timerRef.current);
        } finally {
            setSubmitting(false);
        }
    };

    const getStarterCode = (lang: string) => {
        const starters: Record<string, string> = {
            javascript: "/**\n * @param {number[]} nums\n * @return {number}\n */\nvar solution = function(nums) {\n    // Your solution here\n    \n};",
            python: "class Solution:\n    def solution(self, nums: List[int]) -> int:\n        # Your solution here\n        pass",
            java: "class Solution {\n    public int solution(int[] nums) {\n        // Your solution here\n        return 0;\n    }\n}",
            cpp: "class Solution {\npublic:\n    int solution(vector<int>& nums) {\n        // Your solution here\n        return 0;\n    }\n};",
            typescript: "function solution(nums: number[]): number {\n    // Your solution here\n    \n};",
        };
        return starters[lang] || starters.javascript;
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, "0")}`;
    };

    const getTimerColor = () => {
        if (timeLeft > 600) return "text-green-400";
        if (timeLeft > 300) return "text-yellow-400";
        return "text-red-400";
    };

    const getScoreColor = (score: number) => {
        if (score >= 80) return "text-green-400";
        if (score >= 60) return "text-yellow-400";
        return "text-red-400";
    };

    const getCorrectnessIcon = (correctness: string) => {
        if (correctness === "correct") return <CheckCircle className="text-green-400" size={20} />;
        if (correctness === "partially correct") return <AlertCircle className="text-yellow-400" size={20} />;
        return <XCircle className="text-red-400" size={20} />;
    };

    return (
        <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white">Mock Interview</h2>
                    <p className="text-gray-400 text-sm mt-1">Timed coding session with AI feedback</p>
                </div>
                <div className="flex gap-2">
                    {["setup", "history"].map((p) => (
                        <button
                            key={p}
                            onClick={() => { setPhase(p as any); }}
                            className={`px-4 py-2 rounded-lg text-sm transition-colors ${phase === p ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"
                                }`}
                        >
                            {p === "setup" ? "New Session" : "History"}
                        </button>
                    ))}
                </div>
            </div>

            {/* SETUP PHASE */}
            {phase === "setup" && (
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 space-y-6">
                    <h3 className="text-white font-semibold text-lg">Configure Your Session</h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Company */}
                        <div>
                            <label className="text-gray-400 text-sm mb-2 block">Company</label>
                            <select
                                value={company}
                                onChange={(e) => setCompany(e.target.value)}
                                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500"
                            >
                                {["Google", "Amazon", "Microsoft", "Apple", "Uber", "Netflix"].map((c) => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>

                        {/* Difficulty */}
                        <div>
                            <label className="text-gray-400 text-sm mb-2 block">Difficulty</label>
                            <select
                                value={difficulty}
                                onChange={(e) => setDifficulty(e.target.value)}
                                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500"
                            >
                                {["easy", "medium", "hard"].map((d) => (
                                    <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>
                                ))}
                            </select>
                        </div>

                        {/* Language */}
                        <div>
                            <label className="text-gray-400 text-sm mb-2 block">Language</label>
                            <select
                                value={language}
                                onChange={(e) => { setLanguage(e.target.value); }}
                                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500"
                            >
                                {LANGUAGES.map((l) => (
                                    <option key={l} value={l}>{l}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Info cards */}
                    <div className="grid grid-cols-3 gap-4">
                        {[
                            { label: "Time Limit", value: "45 mins" },
                            { label: "AI Feedback", value: "Instant" },
                            { label: "Scoring", value: "0 - 100" },
                        ].map((item) => (
                            <div key={item.label} className="bg-gray-800 rounded-xl p-4 text-center">
                                <div className="text-white font-bold text-lg">{item.value}</div>
                                <div className="text-gray-500 text-sm mt-1">{item.label}</div>
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={handleStart}
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white py-4 rounded-xl font-medium text-lg transition-colors flex items-center justify-center gap-3"
                    >
                        <Play size={20} />
                        {loading ? "Finding a question..." : `Start ${company} ${difficulty} Interview`}
                    </button>
                </div>
            )}

            {/* CODING PHASE */}
            {phase === "coding" && session && (
                <div className="space-y-4">

                    {/* Question header */}
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                        <div className="flex items-start justify-between">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <h3 className="text-white font-semibold text-lg">{session.question.title}</h3>
                                    <span className={`text-sm font-medium ${DIFFICULTY_COLOR[session.question.difficulty]}`}>
                                        {session.question.difficulty}
                                    </span>
                                </div>
                                <div className="flex gap-2 flex-wrap">
                                    {session.question.tags?.slice(0, 4).map((tag) => (
                                        <span key={tag} className="text-xs bg-gray-800 text-gray-400 px-2 py-1 rounded">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Timer */}
                            <div className="text-right">
                                <div className={`text-3xl font-mono font-bold ${getTimerColor()}`}>
                                    {formatTime(timeLeft)}
                                </div>
                                <div className="text-gray-600 text-xs mt-1">remaining</div>
                            </div>
                        </div>

                        {session.question.url && (
                            <a
                                href={session.question.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 text-sm mt-3 transition-colors"
                            >
                                View on Leetcode <ChevronRight size={14} />
                            </a>
                        )}
                        {/* Full question content */}
                        {session.question.content && (
                            <div
                                className="mt-4 text-gray-300 text-sm leading-relaxed prose prose-invert max-w-none border-t border-gray-800 pt-4"
                                dangerouslySetInnerHTML={{ __html: session.question.content }}
                            />
                        )}

                        {/* Example test cases */}
                        {session.question.exampleTestcases && (
                            <div className="mt-3 bg-gray-800 rounded-lg p-3">
                                <p className="text-gray-500 text-xs mb-1">Example test cases:</p>
                                <pre className="text-green-300 text-xs font-mono">{session.question.exampleTestcases}</pre>
                            </div>
                        )}
                    </div>

                    {/* Code editor */}
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-red-500" />
                                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                                <div className="w-3 h-3 rounded-full bg-green-500" />
                            </div>
                            <select
                                value={language}
                                onChange={(e) => { setLanguage(e.target.value); setCode(getStarterCode(e.target.value)); }}
                                className="bg-gray-700 border border-gray-600 text-white rounded px-3 py-1 text-sm focus:outline-none"
                            >
                                {LANGUAGES.map((l) => (
                                    <option key={l} value={l}>{l}</option>
                                ))}
                            </select>
                        </div>
                        <textarea
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            className="w-full bg-gray-950 text-green-300 font-mono text-sm px-6 py-5 focus:outline-none resize-none"
                            rows={20}
                            spellCheck={false}
                            onKeyDown={(e) => {
                                if (e.key === 'Tab') {
                                    e.preventDefault();
                                    const start = e.currentTarget.selectionStart;
                                    const end = e.currentTarget.selectionEnd;
                                    const newCode = code.substring(0, start) + '    ' + code.substring(end);
                                    setCode(newCode);
                                    setTimeout(() => {
                                        e.currentTarget.selectionStart = start + 4;
                                        e.currentTarget.selectionEnd = start + 4;
                                    }, 0);
                                }
                            }}
                            placeholder="Write your solution here..."
                        />
                    </div>

                    {/* Submit */}
                    <button
                        onClick={handleSubmit}
                        disabled={submitting || !code.trim()}
                        className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:text-gray-500 text-white py-4 rounded-xl font-medium text-lg transition-colors flex items-center justify-center gap-3"
                    >
                        <Send size={20} />
                        {submitting ? "Getting AI feedback..." : "Submit Solution"}
                    </button>
                </div>
            )}

            {/* FEEDBACK PHASE */}
            {phase === "feedback" && feedback && (
                <div className="space-y-4">

                    {/* Score */}
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-white font-semibold text-lg">AI Feedback</h3>
                            <div className="flex items-center gap-2">
                                {getCorrectnessIcon(feedback.correctness)}
                                <span className="text-gray-300 text-sm capitalize">{feedback.correctness}</span>
                            </div>
                        </div>

                        {/* Big score */}
                        <div className="flex items-end gap-2 mb-4">
                            <span className={`text-6xl font-bold ${getScoreColor(feedback.score)}`}>
                                {feedback.score}
                            </span>
                            <span className="text-gray-500 text-xl mb-2">/100</span>
                        </div>

                        <div className="w-full bg-gray-800 rounded-full h-3 mb-4">
                            <div
                                className={`h-3 rounded-full transition-all ${feedback.score >= 80 ? "bg-green-500" : feedback.score >= 60 ? "bg-yellow-500" : "bg-red-500"}`}
                                style={{ width: `${feedback.score}%` }}
                            />
                        </div>

                        <p className="text-gray-300 text-sm leading-relaxed">{feedback.summary}</p>
                    </div>

                    {/* Complexity */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                            <div className="text-gray-400 text-sm mb-2">Time Complexity</div>
                            <div className="text-white font-mono font-bold text-lg">{feedback.timeComplexity}</div>
                        </div>
                        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                            <div className="text-gray-400 text-sm mb-2">Space Complexity</div>
                            <div className="text-white font-mono font-bold text-lg">{feedback.spaceComplexity}</div>
                        </div>
                    </div>

                    {/* Edge cases missed */}
                    {feedback.edgeCasesMissed?.length > 0 && (
                        <div className="bg-gray-900 border border-red-900 rounded-xl p-5">
                            <div className="flex items-center gap-2 mb-3">
                                <XCircle size={16} className="text-red-400" />
                                <span className="text-red-400 font-medium text-sm">Edge Cases Missed</span>
                            </div>
                            <ul className="space-y-2">
                                {feedback.edgeCasesMissed.map((e, i) => (
                                    <li key={i} className="text-gray-300 text-sm flex items-start gap-2">
                                        <span className="text-red-500 mt-0.5">•</span>
                                        {e}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Suggestions */}
                    {feedback.suggestions?.length > 0 && (
                        <div className="bg-gray-900 border border-blue-900 rounded-xl p-5">
                            <div className="flex items-center gap-2 mb-3">
                                <CheckCircle size={16} className="text-blue-400" />
                                <span className="text-blue-400 font-medium text-sm">Suggestions</span>
                            </div>
                            <ul className="space-y-2">
                                {feedback.suggestions.map((s, i) => (
                                    <li key={i} className="text-gray-300 text-sm flex items-start gap-2">
                                        <span className="text-blue-500 mt-0.5">•</span>
                                        {s}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Try again */}
                    <button
                        onClick={() => { setPhase("setup"); setSession(null); setFeedback(null); setCode(""); }}
                        className="w-full bg-gray-800 hover:bg-gray-700 text-white py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                    >
                        <RotateCcw size={16} />
                        Start New Session
                    </button>
                </div>
            )}

            {/* HISTORY PHASE */}
            {phase === "history" && (
                <div className="space-y-3">
                    {history.length === 0 ? (
                        <div className="text-center text-gray-600 py-16">
                            No interviews yet — start your first session!
                        </div>
                    ) : (
                        history.map((item) => (
                            <div key={item.id} className="bg-gray-900 border border-gray-800 rounded-xl px-5 py-4 flex items-center justify-between">
                                <div>
                                    <span className="text-white font-medium">{item.title}</span>
                                    <div className="flex items-center gap-3 mt-1">
                                        <span className={`text-xs ${DIFFICULTY_COLOR[item.difficulty]}`}>{item.difficulty}</span>
                                        <span className="text-gray-600 text-xs">{item.company}</span>
                                        <span className="text-gray-600 text-xs">
                                            {Math.floor(item.duration_seconds / 60)}m {item.duration_seconds % 60}s
                                        </span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className={`text-2xl font-bold ${getScoreColor(parseInt(item.score))}`}>
                                        {item.score}
                                    </div>
                                    <div className="text-gray-600 text-xs capitalize">{item.correctness}</div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
