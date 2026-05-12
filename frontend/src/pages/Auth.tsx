import { useState } from "react";
import { api } from "../api";

interface Props {
    onLogin: () => void;
}

export default function Auth({ onLogin }: Props) {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        setError("");
        setLoading(true);
        try {
            const res = isLogin
                ? await api.login(email, password)
                : await api.register(email, password);

            if (res.token) {
                localStorage.setItem("token", res.token);
                localStorage.setItem("user", JSON.stringify(res.user));
                onLogin();
            } else {
                setError(res.error || "Something went wrong");
            }
        } catch {
            setError("Could not connect to server");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
            <div className="w-full max-w-md">

                {/* Logo */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-white">
                        O<span className="text-blue-500">(hire)</span>
                    </h1>
                    <p className="text-gray-400 mt-2">Your personal interview prep brain</p>
                </div>

                {/* Card */}
                <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800">

                    {/* Toggle */}
                    <div className="flex bg-gray-800 rounded-lg p-1 mb-6">
                        <button
                            onClick={() => setIsLogin(true)}
                            className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${isLogin
                                ? "bg-blue-600 text-white"
                                : "text-gray-400 hover:text-white"
                                }`}
                        >
                            Login
                        </button>
                        <button
                            onClick={() => setIsLogin(false)}
                            className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${!isLogin
                                ? "bg-blue-600 text-white"
                                : "text-gray-400 hover:text-white"
                                }`}
                        >
                            Register
                        </button>
                    </div>

                    {/* Form */}
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm text-gray-400 mb-1 block">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                            />
                        </div>

                        <div>
                            <label className="text-sm text-gray-400 mb-1 block">Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                            />
                        </div>

                        {error && (
                            <div className="bg-red-900/30 border border-red-700 rounded-lg px-4 py-3 text-red-400 text-sm">
                                {error}
                            </div>
                        )}

                        <button
                            onClick={handleSubmit}
                            disabled={loading || !email || !password}
                            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white font-medium py-3 rounded-lg transition-colors"
                        >
                            {loading ? "Please wait..." : isLogin ? "Login" : "Create Account"}
                        </button>
                    </div>

                    {/* Switch mode */}
                    <p className="text-center text-gray-500 text-sm mt-6">
                        {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
                        <button
                            onClick={() => setIsLogin(!isLogin)}
                            className="text-blue-400 hover:text-blue-300"
                        >
                            {isLogin ? "Register" : "Login"}
                        </button>
                    </p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mt-6">
                    {[
                        { label: "Questions", value: "941+" },
                        { label: "Companies", value: "6" },
                        { label: "Algorithm", value: "SM-2" },
                    ].map((stat) => (
                        <div key={stat.label} className="bg-gray-900 rounded-xl p-4 text-center border border-gray-800">
                            <div className="text-white font-bold text-lg">{stat.value}</div>
                            <div className="text-gray-500 text-xs mt-1">{stat.label}</div>
                        </div>
                    ))}
                </div>

            </div>
        </div>
    );
}
