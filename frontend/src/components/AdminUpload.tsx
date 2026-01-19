import { useState, useRef, useEffect } from "react";
import {
  Upload,
  X,
  BarChart3,
  BookOpen,
  FolderOpen,
  TrendingUp,
  Download,
  FileText,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  Target,
  Brain,
  Monitor,
  Briefcase,
  Drama,
  FileJson,
  BookOpenCheck,
} from "lucide-react";

interface AdminUploadProps {
  onClose: () => void;
}

interface UploadStats {
  total: number;
  by_category: Record<string, number>;
  by_difficulty: Record<string, number>;
}

interface UploadResult {
  success: boolean;
  message: string;
  count?: number;
}

const categories = [
  { id: "general", name: "General", icon: "target", color: "#6366f1" },
  { id: "behavioral", name: "Behavioral", icon: "brain", color: "#8b5cf6" },
  { id: "technical", name: "Technical", icon: "monitor", color: "#06b6d4" },
  { id: "management", name: "Management", icon: "briefcase", color: "#f59e0b" },
  { id: "situational", name: "Situational", icon: "drama", color: "#ec4899" },
];

// Icon component map
const CategoryIcons: Record<string, React.ReactNode> = {
  target: <Target className="w-5 h-5" />,
  brain: <Brain className="w-5 h-5" />,
  monitor: <Monitor className="w-5 h-5" />,
  briefcase: <Briefcase className="w-5 h-5" />,
  drama: <Drama className="w-5 h-5" />,
};

const difficulties = [
  { id: "easy", name: "Easy", color: "#22c55e" },
  { id: "medium", name: "Medium", color: "#f59e0b" },
  { id: "hard", name: "Hard", color: "#ef4444" },
];

export default function AdminUpload({ onClose }: AdminUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [category, setCategory] = useState("behavioral");
  const [difficulty, setDifficulty] = useState("medium");
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [stats, setStats] = useState<UploadStats | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await fetch("/api/v1/admin/questions/stats");
      if (response.ok) {
        setStats(await response.json());
      }
    } catch {
      console.log("Stats not available");
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith(".json") || file.name.endsWith(".csv"))) {
      setSelectedFile(file);
      setUploadResult(null);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUploadResult(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("category", category);
      formData.append("difficulty", difficulty);

      // Determine endpoint based on file type
      const isJSON = selectedFile.name.endsWith(".json");
      const endpoint = isJSON
        ? "/api/v1/admin/questions/upload/json"
        : "/api/v1/admin/questions/upload/csv";

      const response = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setUploadResult({
          success: true,
          message: data.message || "Questions uploaded successfully!",
          count: data.count,
        });
        setSelectedFile(null);
        loadStats();
      } else {
        throw new Error(data.detail || "Upload failed");
      }
    } catch (err) {
      setUploadResult({
        success: false,
        message: err instanceof Error ? err.message : "Upload failed",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const downloadJSONTemplate = () => {
    const template = [
      {
        question: "What is your experience with [technology]?",
        ideal_answer:
          "I have X years of experience with [technology]. I've used it to [achievements]. For example, [specific project].",
        keywords: ["experience", "technology", "years", "projects"],
        difficulty: "medium",
        domain: "software_engineering",
        time_limit_seconds: 120,
      },
      {
        question: "Tell me about a time you faced a challenge.",
        ideal_answer:
          "Situation: [context]. Task: [responsibility]. Action: [steps taken]. Result: [outcome with metrics].",
        keywords: ["challenge", "STAR", "problem", "solution", "result"],
        difficulty: "medium",
        domain: "general",
        time_limit_seconds: 150,
      },
    ];

    const blob = new Blob([JSON.stringify(template, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "questions_template.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadCSVTemplate = () => {
    const template = `question,ideal_answer,keywords,difficulty,domain,time_limit_seconds
"What is your experience with Python?","I have X years of Python experience...","python,experience,projects",medium,software_engineering,120
"Tell me about a time you led a team.","I led a team of X people on...","leadership,team,management",medium,management,150`;

    const blob = new Blob([template], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "questions_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="admin-upload-fullscreen">
      {/* Header */}
      <div className="admin-header">
        <div className="admin-header-left">
          <span className="admin-icon">
            <Upload className="w-6 h-6" />
          </span>
          <div>
            <h1>Upload Questions</h1>
            <p>Add interview questions to the database</p>
          </div>
        </div>
        <button className="close-btn" onClick={onClose}>
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Content */}
      <div className="admin-content">
        {/* Stats Overview */}
        {stats && (
          <div className="stats-section">
            <h2>
              <BarChart3 className="w-5 h-5 inline mr-2" />
              Current Database
            </h2>
            <div className="stats-grid">
              <div className="stat-card total">
                <span className="stat-icon">
                  <BookOpen className="w-5 h-5" />
                </span>
                <div className="stat-info">
                  <span className="stat-value">{stats.total}</span>
                  <span className="stat-label">Total Questions</span>
                </div>
              </div>
              {Object.entries(stats.by_category).map(([cat, count]) => {
                const catInfo = categories.find((c) => c.id === cat);
                return (
                  <div key={cat} className="stat-card">
                    <span className="stat-icon">
                      {catInfo?.icon ? (
                        CategoryIcons[catInfo.icon]
                      ) : (
                        <FileText className="w-5 h-5" />
                      )}
                    </span>
                    <div className="stat-info">
                      <span className="stat-value">{count}</span>
                      <span className="stat-label">{catInfo?.name || cat}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Upload Section */}
        <div className="upload-section">
          <div className="upload-left">
            {/* Category Selection */}
            <div className="selection-group">
              <h3>
                <FolderOpen className="w-5 h-5 inline mr-2" />
                Select Category
              </h3>
              <div className="category-grid">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    className={`category-card ${
                      category === cat.id ? "active" : ""
                    }`}
                    onClick={() => setCategory(cat.id)}
                    style={
                      {
                        "--cat-color": cat.color,
                      } as React.CSSProperties
                    }
                  >
                    <span className="cat-icon">{CategoryIcons[cat.icon]}</span>
                    <span className="cat-name">{cat.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty Selection */}
            <div className="selection-group">
              <h3>
                <TrendingUp className="w-5 h-5 inline mr-2" />
                Default Difficulty
              </h3>
              <div className="difficulty-grid">
                {difficulties.map((diff) => (
                  <button
                    key={diff.id}
                    className={`difficulty-card ${
                      difficulty === diff.id ? "active" : ""
                    }`}
                    onClick={() => setDifficulty(diff.id)}
                    style={
                      {
                        "--diff-color": diff.color,
                      } as React.CSSProperties
                    }
                  >
                    <span className="diff-dot"></span>
                    <span className="diff-name">{diff.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Templates */}
            <div className="selection-group">
              <h3>
                <Download className="w-5 h-5 inline mr-2" />
                Download Templates
              </h3>
              <div className="template-grid">
                <button
                  className="template-card"
                  onClick={downloadJSONTemplate}
                >
                  <span className="template-icon">
                    <FileJson className="w-5 h-5" />
                  </span>
                  <div className="template-info">
                    <span className="template-name">JSON Template</span>
                    <span className="template-desc">Structured format</span>
                  </div>
                </button>
                <button className="template-card" onClick={downloadCSVTemplate}>
                  <span className="template-icon">
                    <FileSpreadsheet className="w-5 h-5" />
                  </span>
                  <div className="template-info">
                    <span className="template-name">CSV Template</span>
                    <span className="template-desc">Spreadsheet format</span>
                  </div>
                </button>
              </div>
            </div>
          </div>

          <div className="upload-right">
            {/* Drop Zone */}
            <div
              className={`drop-zone ${isDragging ? "dragging" : ""} ${
                selectedFile ? "has-file" : ""
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.csv"
                onChange={handleFileSelect}
                style={{ display: "none" }}
              />

              {selectedFile ? (
                <div className="file-preview">
                  <span className="file-type-icon">
                    {selectedFile.name.endsWith(".json") ? (
                      <FileJson className="w-6 h-6" />
                    ) : (
                      <FileSpreadsheet className="w-6 h-6" />
                    )}
                  </span>
                  <div className="file-details">
                    <span className="file-name">{selectedFile.name}</span>
                    <span className="file-size">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </span>
                  </div>
                  <button
                    className="remove-file-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                    }}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="drop-content">
                  <div className="drop-icon">
                    <FolderOpen className="w-12 h-12" />
                  </div>
                  <h3>Drag & Drop File</h3>
                  <p>or click to browse</p>
                  <span className="drop-hint">
                    Supports .json and .csv files up to 5MB
                  </span>
                </div>
              )}
            </div>

            {/* Upload Result */}
            {uploadResult && (
              <div
                className={`upload-result ${
                  uploadResult.success ? "success" : "error"
                }`}
              >
                <span className="result-icon">
                  {uploadResult.success ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500" />
                  )}
                </span>
                <div className="result-content">
                  <p className="result-message">{uploadResult.message}</p>
                  {uploadResult.count && (
                    <p className="result-count">
                      {uploadResult.count} questions added
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Upload Button */}
            <button
              className="upload-btn"
              onClick={handleUpload}
              disabled={!selectedFile || isUploading}
            >
              {isUploading ? (
                <>
                  <span className="spinner"></span>
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  Upload Questions
                </>
              )}
            </button>
          </div>
        </div>

        {/* Format Guide */}
        <div className="format-section">
          <h2>
            <BookOpenCheck className="w-5 h-5 inline mr-2" />
            File Format Guide
          </h2>
          <div className="format-grid">
            <div className="format-card">
              <h3>JSON Format</h3>
              <pre className="code-preview">{`[
  {
    "question": "Your question here",
    "ideal_answer": "Expected answer",
    "keywords": ["keyword1", "keyword2"],
    "difficulty": "easy|medium|hard",
    "domain": "general|software_engineering|...",
    "time_limit_seconds": 120
  }
]`}</pre>
            </div>
            <div className="format-card">
              <h3>CSV Format</h3>
              <pre className="code-preview">{`question,ideal_answer,keywords,difficulty,domain,time_limit_seconds
"Question text","Answer text","kw1,kw2",medium,general,120
"Another question","Another answer","kw3,kw4",hard,technical,150`}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
