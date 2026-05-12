import { useEffect, useState } from "react";
import { api } from "../api";
import { ExternalLink, CheckCircle, Clock, Circle } from "lucide-react";

interface Question {
    id: number;
    title: string;
    difficulty: string;
    category: string;
    companies: string[];
    tags: string[];
    url: string;
    status?: string;
}

const DIFFICULTY_CONFIG: Record<string, { color: string; bg: string }> = {
    easy: { color: "text-green-400", bg: "bg-green-900/30 border-green-800" },
    medium: { color: "text-yellow-400", bg: "bg-yellow-900/30 border-yellow-800" },
    hard: { color: "text-red-400", bg: "bg-red-900/30 border-red-800" },
};

const STATUS_ICONS: Record<string, JSX.Element> = {
    solved: <CheckCircle size={16} className="text-green-400" />,
    attempted: <Clock size={16} className="text-yellow-400" />,
    unsolved: <Circle size={16} className="text-gray-600" />,
};

export default function Questions() {
    const [questions, setQuestions] = useState<Question[]>([]);
    const [progress, setProgress] = useState<Record<number, string>>({});
    const [loading, setLoading] = useState(true);
    const [company, setCompany] = useState("Google");
    const [difficulty, setDifficulty] = useState("");
    const [category, setCategory] = useState("dsa");
    const [search, setSearch] = useState("");

    useEffect(() => {
        fetchQuestions();
    }, [company, difficulty, category]);

    const fetchQuestions = async () => {
        setLoading(true);
        try {
            const filters: any = { company, category };
            if (difficulty) filters.difficulty = difficulty;
            const data = await api.getQuestions(filters);
            setQuestions(data);

            // Build progress map
            const progressMap: Record<number, string> = {};
            data.forEach((q: Question) => {
                if (q.status) progressMap[q.id] = q.status;
            });
            setProgress(progressMap);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (id: number, status: string) => {
        const current = progress[id] || "unsolved";
        const next = current === status ? "unsolved" : status;
        await api.updateQuestionProgress(id, next);
        setProgress({ ...progress, [id]: next });
    };

    const filtered = questions.filter((q) =>
        search ? q.title.toLowerCase().includes(search.toLowerCase()) : true
    );

    const solved = Object.values(progress).filter((s) => s === "solved").length;
    const attempted = Object.values(progress).filter((s) => s === "attempted").length;

    return (
        <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">

            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-white">Question Bank</h2>
                <p className="text-gray-400 text-sm mt-1">
                    {solved} solved · {attempted} attempted · {questions.length} total for {company}
                </p>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
                {/* Company */}
                <select
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
                >
                    {["Google", "Amazon", "Microsoft", "Apple", "Uber", "Netflix"].map((c) => (
                        <option key={c} value={c}>{c}</option>
                    ))}
                </select>

                {/* Category */}
                <div className="flex bg-gray-800 rounded-lg p-1">
                    {[{ id: "dsa", label: "DSA" }, { id: "system_design", label: "System Design" }].map((c) => (
                        <button
                            key={c.id}
                            onClick={() => setCategory(c.id)}
                            className={`px-4 py-1 rounded-md text-sm transition-all ${category === c.id ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"
                                }`}
                        >
                            {c.label}
                        </button>
                    ))}
                </div>

                {/* Difficulty */}
                <div className="flex bg-gray-800 rounded-lg p-1">
                    {[{ id: "", label: "All" }, { id: "easy", label: "Easy" }, { id: "medium", label: "Medium" }, { id: "hard", label: "Hard" }].map((d) => (
                        <button
                            key={d.id}
                            onClick={() => setDifficulty(d.id)}
                            className={`px-3 py-1 rounded-md text-sm transition-all ${difficulty === d.id ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"
                                }`}
                        >
                            {d.label}
                        </button>
                    ))}
                </div>

                {/* Search */}
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search questions..."
                    className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-blue-500 flex-1 min-w-48"
                />
            </div>

            {/* Progress bar */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-400">Progress for {company}</span>
                    <span className="text-white">{questions.length > 0 ? Math.round((solved / questions.length) * 100) : 0}%</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-2">
                    <div
                        className="h-2 bg-green-500 rounded-full transition-all"
                        style={{ width: `${questions.length > 0 ? (solved / questions.length) * 100 : 0}%` }}
                    />
                </div>
                <div className="flex gap-4 mt-2 text-xs text-gray-600">
                    <span className="text-green-400">{solved} solved</span>
                    <span className="text-yellow-400">{attempted} attempted</span>
                    <span>{questions.length - solved - attempted} unsolved</span>
                </div>
            </div>

            {/* Questions list */}
            {loading ? (
                <div className="text-center text-gray-500 py-16">Loading questions...</div>
            ) : filtered.length === 0 ? (
                <div className="text-center text-gray-600 py-16">No questions found</div>
            ) : (
                <div className="space-y-2">
                    {filtered.map((q) => {
                        const status = progress[q.id] || "unsolved";
                        const diffConfig = DIFFICULTY_CONFIG[q.difficulty] || DIFFICULTY_CONFIG.medium;

                        return (
                            <div
                                key={q.id}
                                className="bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl px-5 py-4 flex items-center gap-4 transition-colors"
                            >
                                {/* Status icon */}
                                <button onClick={() => handleStatusChange(q.id, status === "solved" ? "unsolved" : "solved")}>
                                    {STATUS_ICONS[status] || STATUS_ICONS.unsolved}
                                </button>

                                {/* Title */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className={`text-white text-sm font-medium ${status === "solved" ? "line-through opacity-50" : ""}`}>
                                            {q.title}
                                        </span>
                                        <span className={`text-xs px-2 py-0.5 rounded-full border ${diffConfig.bg} ${diffConfig.color}`}>
                                            {q.difficulty}
                                        </span>
                                    </div>
                                    {q.tags?.length > 0 && (
                                        <div className="flex gap-1 mt-1 flex-wrap">
                                            {q.tags.slice(0, 3).map((tag) => (
                                                <span key={tag} className="text-xs text-gray-600 bg-gray-800 px-2 py-0.5 rounded">
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2 shrink-0">
                                    <button
                                        onClick={() => handleStatusChange(q.id, "attempted")}
                                        className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${status === "attempted"
                                            ? "border-yellow-700 text-yellow-400 bg-yellow-900/30"
                                            : "border-gray-700 text-gray-600 hover:text-yellow-400 hover:border-yellow-700"
                                            }`}
                                    >
                                        Attempted
                                    </button>
                                    <button
                                        onClick={() => handleStatusChange(q.id, "solved")}
                                        className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${status === "solved"
                                            ? "border-green-700 text-green-400 bg-green-900/30"
                                            : "border-gray-700 text-gray-600 hover:text-green-400 hover:border-green-700"
                                            }`}
                                    >
                                        Solved
                                    </button>
                                    {q.url && (
                                        <a
                                            href={q.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-gray-600 hover:text-blue-400 transition-colors"
                                        >
                                            <ExternalLink size={15} />
                                        </a>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
