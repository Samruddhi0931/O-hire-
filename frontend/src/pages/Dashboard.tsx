import { useEffect, useState } from "react";
import { api } from "../api";
import { Brain, Flame, AlertTriangle, TrendingUp, BookOpen, CheckCircle, Clock } from "lucide-react";

interface Stats {
    totalCards: number;
    solvedQuestions: number;
    cardsDue: number;
    weakTopics: { name: string; avg_ease: string }[];
    readiness: {
        overall: number;
        retentionScore: number;
        completionScore: number;
        confidenceScore: number;
        label: string;
        weakTopics: string[];
    };
    streak: { days: number; lastStudied: string };
    decayWarning: string | null;
    topics: { status: string; count: string }[];
}

export default function Dashboard() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [company, setCompany] = useState("Google");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, [company]);

    const fetchStats = async () => {
        setLoading(true);
        try {
            const data = await api.getStats(company);
            setStats(data);
        } finally {
            setLoading(false);
        }
    };

    const getReadinessColor = (score: number) => {
        if (score >= 80) return "text-green-400";
        if (score >= 60) return "text-yellow-400";
        if (score >= 40) return "text-orange-400";
        return "text-red-400";
    };

    const getReadinessBg = (score: number) => {
        if (score >= 80) return "bg-green-500";
        if (score >= 60) return "bg-yellow-500";
        if (score >= 40) return "bg-orange-500";
        return "bg-red-500";
    };

    const topicCounts = {
        learning: parseInt(stats?.topics?.find((t) => t.status === "learning")?.count || "0"),
        reviewed: parseInt(stats?.topics?.find((t) => t.status === "reviewed")?.count || "0"),
        confident: parseInt(stats?.topics?.find((t) => t.status === "confident")?.count || "0"),
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-gray-400">Loading your dashboard...</div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">

            {/* Decay Warning */}
            {stats?.decayWarning && (
                <div className="bg-orange-900/30 border border-orange-700 rounded-xl px-5 py-4 flex items-start gap-3">
                    <AlertTriangle className="text-orange-400 mt-0.5 shrink-0" size={18} />
                    <p className="text-orange-300 text-sm">{stats.decayWarning}</p>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white">Dashboard</h2>
                    <p className="text-gray-400 text-sm mt-1">Track your interview readiness</p>
                </div>
                <select
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
                >
                    {["Google", "Amazon", "Microsoft", "Apple", "Uber", "Netflix"].map((c) => (
                        <option key={c} value={c}>{c}</option>
                    ))}
                </select>
            </div>

            {/* Readiness Score — hero card */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Brain className="text-blue-400" size={20} />
                        <span className="text-white font-semibold">Interview Readiness — {company}</span>
                    </div>
                    <span className={`text-sm font-medium px-3 py-1 rounded-full bg-gray-800 ${getReadinessColor(stats?.readiness?.overall || 0)}`}>
                        {stats?.readiness?.label}
                    </span>
                </div>

                {/* Big score */}
                <div className="flex items-end gap-3 mb-4">
                    <span className={`text-6xl font-bold ${getReadinessColor(stats?.readiness?.overall || 0)}`}>
                        {stats?.readiness?.overall || 0}
                    </span>
                    <span className="text-gray-500 text-xl mb-2">/100</span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-gray-800 rounded-full h-3 mb-6">
                    <div
                        className={`h-3 rounded-full transition-all duration-700 ${getReadinessBg(stats?.readiness?.overall || 0)}`}
                        style={{ width: `${stats?.readiness?.overall || 0}%` }}
                    />
                </div>

                {/* Score breakdown */}
                <div className="grid grid-cols-3 gap-4">
                    {[
                        { label: "Retention", value: stats?.readiness?.retentionScore || 0, weight: "40%", desc: "SM-2 ease factor" },
                        { label: "Completion", value: stats?.readiness?.completionScore || 0, weight: "40%", desc: "Questions solved" },
                        { label: "Confidence", value: stats?.readiness?.confidenceScore || 0, weight: "20%", desc: "Topics confident" },
                    ].map((item) => (
                        <div key={item.label} className="bg-gray-800 rounded-xl p-4">
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-gray-400 text-xs">{item.label}</span>
                                <span className="text-gray-600 text-xs">{item.weight}</span>
                            </div>
                            <div className={`text-2xl font-bold ${getReadinessColor(item.value)}`}>{item.value}</div>
                            <div className="text-gray-600 text-xs mt-1">{item.desc}</div>
                            <div className="w-full bg-gray-700 rounded-full h-1.5 mt-2">
                                <div
                                    className={`h-1.5 rounded-full ${getReadinessBg(item.value)}`}
                                    style={{ width: `${item.value}%` }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { icon: <Clock size={18} className="text-blue-400" />, label: "Cards Due", value: stats?.cardsDue || 0, sub: "Review today" },
                    { icon: <CheckCircle size={18} className="text-green-400" />, label: "Solved", value: stats?.solvedQuestions || 0, sub: "Questions" },
                    { icon: <BookOpen size={18} className="text-purple-400" />, label: "Flashcards", value: stats?.totalCards || 0, sub: "Total cards" },
                    { icon: <Flame size={18} className="text-orange-400" />, label: "Streak", value: `${stats?.streak?.days || 0}d`, sub: "Consecutive days" },
                ].map((stat) => (
                    <div key={stat.label} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                        <div className="flex items-center gap-2 mb-3">
                            {stat.icon}
                            <span className="text-gray-400 text-sm">{stat.label}</span>
                        </div>
                        <div className="text-3xl font-bold text-white">{stat.value}</div>
                        <div className="text-gray-600 text-xs mt-1">{stat.sub}</div>
                    </div>
                ))}
            </div>

            {/* Two columns — topics + weak spots */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Topic status */}
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <TrendingUp size={18} className="text-purple-400" />
                        <h3 className="text-white font-semibold">Topic Progress</h3>
                    </div>
                    <div className="space-y-3">
                        {[
                            { label: "Learning", count: topicCounts.learning, color: "bg-blue-500" },
                            { label: "Reviewed", count: topicCounts.reviewed, color: "bg-yellow-500" },
                            { label: "Confident", count: topicCounts.confident, color: "bg-green-500" },
                        ].map((item) => {
                            const total = topicCounts.learning + topicCounts.reviewed + topicCounts.confident;
                            const pct = total === 0 ? 0 : Math.round((item.count / total) * 100);
                            return (
                                <div key={item.label}>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-gray-400">{item.label}</span>
                                        <span className="text-white">{item.count}</span>
                                    </div>
                                    <div className="w-full bg-gray-800 rounded-full h-2">
                                        <div className={`h-2 rounded-full ${item.color}`} style={{ width: `${pct}%` }} />
                                    </div>
                                </div>
                            );
                        })}
                        {topicCounts.learning + topicCounts.reviewed + topicCounts.confident === 0 && (
                            <p className="text-gray-600 text-sm text-center py-4">No topics added yet</p>
                        )}
                    </div>
                </div>

                {/* Weak spots */}
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <AlertTriangle size={18} className="text-red-400" />
                        <h3 className="text-white font-semibold">Weak Spots</h3>
                    </div>
                    <div className="space-y-3">
                        {stats?.weakTopics?.length ? (
                            stats.weakTopics.map((topic, i) => (
                                <div key={i} className="flex items-center justify-between bg-gray-800 rounded-lg px-4 py-3">
                                    <span className="text-white text-sm">{topic.name}</span>
                                    <span className="text-red-400 text-xs">
                                        ease: {parseFloat(topic.avg_ease).toFixed(2)}
                                    </span>
                                </div>
                            ))
                        ) : (
                            <p className="text-gray-600 text-sm text-center py-4">
                                No weak spots detected yet — add flashcards to track retention
                            </p>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
