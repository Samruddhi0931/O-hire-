import { useState } from "react";
import { api } from "../api";
import { Brain, Target, TrendingUp, AlertTriangle, CheckCircle, BarChart2 } from "lucide-react";

interface TopicRow {
    topic: string;
    frequency: number;
    solved_count: number;
    avg_ease: string;
    flashcard_count: number;
    strength: "strong" | "moderate" | "weak";
}

interface ReportData {
    company: string;
    readiness: {
        overall: number;
        retentionScore: number;
        completionScore: number;
        confidenceScore: number;
        label: string;
        weakTopics: string[];
    };
    questions: {
        total: string;
        solved: string;
        attempted: string;
        unsolved: string;
        easy_total: string;
        medium_total: string;
        hard_total: string;
    };
    topicBreakdown: TopicRow[];
    focusAreas: {
        topic: string;
        reason: string;
        frequency: number;
    }[];
}

const STRENGTH_CONFIG = {
    strong: { color: "text-green-400", bg: "bg-green-900/20 border-green-800", bar: "bg-green-500" },
    moderate: { color: "text-yellow-400", bg: "bg-yellow-900/20 border-yellow-800", bar: "bg-yellow-500" },
    weak: { color: "text-red-400", bg: "bg-red-900/20 border-red-800", bar: "bg-red-500" },
};

const COMPANIES = ["Google", "Amazon", "Microsoft", "Apple", "Uber", "Netflix"];

export default function Report() {
    const [company, setCompany] = useState("Google");
    const [report, setReport] = useState<ReportData | null>(null);
    const [loading, setLoading] = useState(false);

    const fetchReport = async () => {
        setLoading(true);
        try {
            const data = await api.getReport(company);
            setReport(data);
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

    return (
        <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">

            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-white">Company Readiness Report</h2>
                <p className="text-gray-400 text-sm mt-1">
                    Full breakdown of your readiness for a specific company
                </p>
            </div>

            {/* Company selector */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                <div className="flex flex-wrap gap-3 mb-6">
                    {COMPANIES.map((c) => (
                        <button
                            key={c}
                            onClick={() => setCompany(c)}
                            className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all ${company === c
                                ? "bg-blue-600 text-white"
                                : "bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700"
                                }`}
                        >
                            {c}
                        </button>
                    ))}
                </div>

                <button
                    onClick={fetchReport}
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                >
                    <BarChart2 size={18} />
                    {loading ? "Generating report..." : `Generate ${company} Report`}
                </button>
            </div>

            {/* Report */}
            {report && (
                <div className="space-y-6">

                    {/* Readiness score */}
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Brain className="text-blue-400" size={20} />
                                <span className="text-white font-semibold">Overall Readiness — {report.company}</span>
                            </div>
                            <span className={`text-sm font-medium px-3 py-1 rounded-full bg-gray-800 ${getReadinessColor(report.readiness.overall)}`}>
                                {report.readiness.label}
                            </span>
                        </div>

                        <div className="flex items-end gap-3 mb-4">
                            <span className={`text-6xl font-bold ${getReadinessColor(report.readiness.overall)}`}>
                                {report.readiness.overall}
                            </span>
                            <span className="text-gray-500 text-xl mb-2">/100</span>
                        </div>

                        <div className="w-full bg-gray-800 rounded-full h-3 mb-6">
                            <div
                                className={`h-3 rounded-full transition-all duration-700 ${getReadinessBg(report.readiness.overall)}`}
                                style={{ width: `${report.readiness.overall}%` }}
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            {[
                                { label: "Retention", value: report.readiness.retentionScore, weight: "40%", desc: "SM-2 ease factor" },
                                { label: "Completion", value: report.readiness.completionScore, weight: "40%", desc: "Questions solved" },
                                { label: "Confidence", value: report.readiness.confidenceScore, weight: "20%", desc: "Topics confident" },
                            ].map((item) => (
                                <div key={item.label} className="bg-gray-800 rounded-xl p-4">
                                    <div className="flex justify-between mb-1">
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

                    {/* Questions breakdown */}
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Target className="text-purple-400" size={18} />
                            <h3 className="text-white font-semibold">Questions — {report.company}</h3>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            {[
                                { label: "Total", value: report.questions.total, color: "text-white" },
                                { label: "Solved", value: report.questions.solved, color: "text-green-400" },
                                { label: "Attempted", value: report.questions.attempted, color: "text-yellow-400" },
                                { label: "Unsolved", value: report.questions.unsolved, color: "text-red-400" },
                            ].map((item) => (
                                <div key={item.label} className="bg-gray-800 rounded-xl p-4 text-center">
                                    <div className={`text-3xl font-bold ${item.color}`}>{item.value}</div>
                                    <div className="text-gray-500 text-sm mt-1">{item.label}</div>
                                </div>
                            ))}
                        </div>

                        {/* Difficulty breakdown */}
                        <div className="grid grid-cols-3 gap-3">
                            {[
                                { label: "Easy", value: report.questions.easy_total, color: "text-green-400", bg: "bg-green-900/20 border-green-900" },
                                { label: "Medium", value: report.questions.medium_total, color: "text-yellow-400", bg: "bg-yellow-900/20 border-yellow-900" },
                                { label: "Hard", value: report.questions.hard_total, color: "text-red-400", bg: "bg-red-900/20 border-red-900" },
                            ].map((item) => (
                                <div key={item.label} className={`border rounded-xl p-3 text-center ${item.bg}`}>
                                    <div className={`text-xl font-bold ${item.color}`}>{item.value}</div>
                                    <div className="text-gray-500 text-xs mt-1">{item.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Focus areas */}
                    {report.focusAreas?.length > 0 && (
                        <div className="bg-gray-900 border border-orange-900 rounded-2xl p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <AlertTriangle className="text-orange-400" size={18} />
                                <h3 className="text-white font-semibold">Focus Areas</h3>
                                <span className="text-gray-500 text-sm">— study these first</span>
                            </div>
                            <div className="space-y-3">
                                {report.focusAreas.map((area, i) => (
                                    <div key={i} className="bg-gray-800 rounded-xl px-5 py-4 flex items-start justify-between">
                                        <div>
                                            <span className="text-white font-medium capitalize">{area.topic}</span>
                                            <p className="text-gray-500 text-xs mt-1">{area.reason}</p>
                                        </div>
                                        <span className="text-orange-400 text-xs bg-orange-900/30 px-2 py-1 rounded">
                                            {area.frequency}x asked
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Topic breakdown */}
                    {report.topicBreakdown?.length > 0 && (
                        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <TrendingUp className="text-blue-400" size={18} />
                                <h3 className="text-white font-semibold">Topic Breakdown</h3>
                            </div>
                            <div className="space-y-3">
                                {report.topicBreakdown.slice(0, 15).map((topic, i) => {
                                    const config = STRENGTH_CONFIG[topic.strength];
                                    const solvedPct = topic.frequency > 0
                                        ? Math.round((topic.solved_count / topic.frequency) * 100)
                                        : 0;

                                    return (
                                        <div key={i} className={`border rounded-xl px-5 py-3 ${config.bg}`}>
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-white text-sm font-medium capitalize">{topic.topic}</span>
                                                    <span className={`text-xs px-2 py-0.5 rounded-full ${config.color} bg-gray-800`}>
                                                        {topic.strength}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-4 text-xs text-gray-500">
                                                    <span>{topic.solved_count}/{topic.frequency} solved</span>
                                                    <span>{topic.flashcard_count} cards</span>
                                                    <span>ease: {topic.avg_ease}</span>
                                                </div>
                                            </div>
                                            <div className="w-full bg-gray-800 rounded-full h-1.5">
                                                <div
                                                    className={`h-1.5 rounded-full ${config.bar}`}
                                                    style={{ width: `${solvedPct}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Weak topics from readiness */}
                    {report.readiness.weakTopics?.length > 0 && (
                        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <CheckCircle className="text-red-400" size={18} />
                                <h3 className="text-white font-semibold">Weakest Topics by Retention</h3>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {report.readiness.weakTopics.map((topic, i) => (
                                    <span key={i} className="bg-red-900/20 border border-red-900 text-red-300 text-sm px-4 py-2 rounded-xl">
                                        {topic}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                </div>
            )}
        </div>
    );
}
