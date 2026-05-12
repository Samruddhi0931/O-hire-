import { useEffect, useState } from "react";
import { api } from "../api";
import { Plus, BookOpen } from "lucide-react";

interface Topic {
    id: number;
    name: string;
    category: string;
    status: "learning" | "reviewed" | "confident";
    created_at: string;
}

const STATUS_CONFIG = {
    learning: { label: "Learning", color: "text-blue-400", bg: "bg-blue-900/30 border-blue-700", dot: "bg-blue-400" },
    reviewed: { label: "Reviewed", color: "text-yellow-400", bg: "bg-yellow-900/30 border-yellow-700", dot: "bg-yellow-400" },
    confident: { label: "Confident", color: "text-green-400", bg: "bg-green-900/30 border-green-700", dot: "bg-green-400" },
};

const DSA_SUGGESTIONS = [
    "Arrays", "Strings", "Linked Lists", "Binary Trees", "Binary Search",
    "Dynamic Programming", "Graphs", "BFS/DFS", "Recursion", "Backtracking",
    "Heaps", "Stacks & Queues", "Hash Maps", "Tries", "Sliding Window",
    "Two Pointers", "Greedy", "Sorting", "Bit Manipulation", "Math",
];

const SYSTEM_DESIGN_SUGGESTIONS = [
    "URL Shortener", "Rate Limiter", "WhatsApp", "Twitter Feed",
    "Google Search", "YouTube", "Uber", "Distributed Cache",
    "Load Balancer", "Message Queue",
];

export default function Topics() {
    const [topics, setTopics] = useState<Topic[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [newName, setNewName] = useState("");
    const [newCategory, setNewCategory] = useState("dsa");
    const [filter, setFilter] = useState("all");
    const [adding, setAdding] = useState(false);

    useEffect(() => {
        fetchTopics();
    }, []);

    const fetchTopics = async () => {
        setLoading(true);
        const data = await api.getTopics();
        setTopics(data);
        setLoading(false);
    };

    const handleAdd = async () => {
        if (!newName.trim()) return;
        setAdding(true);
        const topic = await api.createTopic(newName.trim(), newCategory);
        setTopics([topic, ...topics]);
        setNewName("");
        setShowAdd(false);
        setAdding(false);
    };

    const handleStatusChange = async (id: number, status: string) => {
        const updated = await api.updateTopicStatus(id, status);
        setTopics(topics.map((t) => (t.id === id ? updated : t)));
    };

    const filtered = filter === "all" ? topics : topics.filter((t) => t.status === filter);
    const suggestions = newCategory === "dsa" ? DSA_SUGGESTIONS : SYSTEM_DESIGN_SUGGESTIONS;

    return (
        <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white">Topic Tracker</h2>
                    <p className="text-gray-400 text-sm mt-1">Track what you know and what needs work</p>
                </div>
                <button
                    onClick={() => setShowAdd(!showAdd)}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                    <Plus size={16} />
                    Add Topic
                </button>
            </div>

            {/* Add topic form */}
            {showAdd && (
                <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 space-y-4">
                    <h3 className="text-white font-medium">Add New Topic</h3>

                    {/* Category toggle */}
                    <div className="flex bg-gray-800 rounded-lg p-1 w-fit">
                        {["dsa", "system_design"].map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setNewCategory(cat)}
                                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${newCategory === cat ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"
                                    }`}
                            >
                                {cat === "dsa" ? "DSA" : "System Design"}
                            </button>
                        ))}
                    </div>

                    {/* Name input */}
                    <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="e.g. Binary Trees"
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                        onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                    />

                    {/* Suggestions */}
                    <div>
                        <p className="text-gray-500 text-xs mb-2">Quick add:</p>
                        <div className="flex flex-wrap gap-2">
                            {suggestions.map((s) => (
                                <button
                                    key={s}
                                    onClick={() => setNewName(s)}
                                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${newName === s
                                        ? "bg-blue-600 border-blue-500 text-white"
                                        : "border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white"
                                        }`}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={handleAdd}
                            disabled={!newName.trim() || adding}
                            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                            {adding ? "Adding..." : "Add Topic"}
                        </button>
                        <button
                            onClick={() => setShowAdd(false)}
                            className="text-gray-400 hover:text-white px-4 py-2 text-sm transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                {Object.entries(STATUS_CONFIG).map(([status, config]) => (
                    <div key={status} className={`border rounded-xl p-4 ${config.bg}`}>
                        <div className={`text-2xl font-bold ${config.color}`}>
                            {topics.filter((t) => t.status === status).length}
                        </div>
                        <div className="text-gray-400 text-sm mt-1">{config.label}</div>
                    </div>
                ))}
            </div>

            {/* Filter */}
            <div className="flex gap-2">
                {["all", "learning", "reviewed", "confident"].map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-1.5 rounded-full text-sm transition-colors ${filter === f
                            ? "bg-gray-700 text-white"
                            : "text-gray-500 hover:text-white"
                            }`}
                    >
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                ))}
            </div>

            {/* Topics list */}
            {loading ? (
                <div className="text-gray-500 text-center py-12">Loading topics...</div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-16 text-gray-600">
                    <BookOpen size={40} className="mx-auto mb-3 opacity-30" />
                    <p>No topics yet — add your first one above</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map((topic) => (
                        <div
                            key={topic.id}
                            className="bg-gray-900 border border-gray-800 rounded-xl px-5 py-4 flex items-center justify-between hover:border-gray-700 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-2 h-2 rounded-full ${STATUS_CONFIG[topic.status].dot}`} />
                                <div>
                                    <span className="text-white font-medium">{topic.name}</span>
                                    <span className="text-gray-600 text-xs ml-2">
                                        {topic.category === "dsa" ? "DSA" : "System Design"}
                                    </span>
                                </div>
                            </div>

                            {/* Status buttons */}
                            <div className="flex items-center gap-2">
                                {(["learning", "reviewed", "confident"] as const).map((s) => (
                                    <button
                                        key={s}
                                        onClick={() => handleStatusChange(topic.id, s)}
                                        className={`text-xs px-3 py-1.5 rounded-full border transition-all ${topic.status === s
                                            ? `${STATUS_CONFIG[s].bg} ${STATUS_CONFIG[s].color} border-current`
                                            : "border-gray-700 text-gray-600 hover:border-gray-500 hover:text-gray-400"
                                            }`}
                                    >
                                        {STATUS_CONFIG[s].label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
