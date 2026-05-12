import Topics from "./pages/Topics";
import { useState, useEffect } from "react";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Flashcards from "./pages/Flashcards";
import Questions from "./pages/Questions";
import MockInterview from "./pages/MockInterview";
import Report from "./pages/Report";

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentPage, setCurrentPage] = useState("dashboard");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) setIsLoggedIn(true);
  }, []);

  const handleLogin = () => setIsLoggedIn(true);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setIsLoggedIn(false);
  };

  if (!isLoggedIn) return <Auth onLogin={handleLogin} />;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex justify-between items-center sticky top-0 z-10">
        <h1 className="text-xl font-bold">
          O(<span className="text-blue-500">(hire)</span>)
        </h1>
        <div className="flex items-center gap-6">
          {[
            { id: "dashboard", label: "Dashboard" },
            { id: "topics", label: "Topics" },
            { id: "flashcards", label: "Flashcards" },
            { id: "questions", label: "Questions" },
            { id: "interview", label: "Mock Interview" },
            { id: "report", label: "Report" },
          ].map((page) => (
            <button
              key={page.id}
              onClick={() => setCurrentPage(page.id)}
              className={`text-sm transition-colors ${currentPage === page.id
                ? "text-blue-400 font-medium"
                : "text-gray-400 hover:text-white"
                }`}
            >
              {page.label}
            </button>
          ))}
          <button
            onClick={handleLogout}
            className="text-gray-500 hover:text-white text-sm transition-colors ml-4"
          >
            Logout
          </button>
        </div>
      </nav>
      {currentPage === "report" && <Report />}
      {currentPage === "questions" && <Questions />}
      {currentPage === "interview" && <MockInterview />}
      {currentPage === "flashcards" && <Flashcards />}
      {currentPage === "dashboard" && <Dashboard />}
      {currentPage === "topics" && <Topics />}
      {currentPage !== "dashboard" && currentPage !== "topics" && currentPage !== "flashcards" && currentPage !== "questions" && currentPage !== "interview" && currentPage !== "report" && (
        <div className="flex items-center justify-center h-64 text-gray-500">
          {currentPage.charAt(0).toUpperCase() + currentPage.slice(1)} page coming soon...
        </div>
      )}
    </div>
  );
}