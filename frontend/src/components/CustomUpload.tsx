import React, { useState, useRef } from "react";
import { uploadCustomQuestionsToDB, Question } from "../api/apiClient";
import {
  Upload,
  FileText,
  FolderOpen,
  X,
  FileCode,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

interface CustomUploadProps {
  onQuestionsLoaded: (questions: Question[]) => void;
  onCancel: () => void;
  userId: string;
  onSuccess?: () => void;
}

// Error Modal Component
const ErrorModal = ({ 
  error, 
  onClose 
}: { 
  error: { title: string; message: string; details?: string } | null; 
  onClose: () => void;
}) => {
  if (!error) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-white dark:bg-surface-800 rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        <div className="bg-red-500 p-4 flex items-center gap-3">
          <AlertCircle className="w-6 h-6 text-white" />
          <h3 className="text-lg font-bold text-white">{error.title}</h3>
        </div>
        <div className="p-6">
          <p className="text-stone-700 dark:text-surface-200 mb-4">
            {error.message}
          </p>
          {error.details && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
              <p className="text-sm text-red-700 dark:text-red-300 font-mono">
                {error.details}
              </p>
            </div>
          )}
          <div className="space-y-2 text-sm text-stone-600 dark:text-surface-400">
            <p className="font-semibold">Common issues:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Invalid JSON format (missing commas, brackets)</li>
              <li>Missing required fields (question, ideal_answer)</li>
              <li>Empty file or no questions found</li>
              <li>Unsupported file type (use .json or .csv)</li>
            </ul>
          </div>
        </div>
        <div className="p-4 bg-stone-50 dark:bg-surface-900 border-t dark:border-surface-700">
          <button 
            onClick={onClose}
            className="w-full py-2.5 px-4 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default function CustomUpload({
  onQuestionsLoaded,
  onCancel,
  userId,
  onSuccess,
}: CustomUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [errorModal, setErrorModal] = useState<{ title: string; message: string; details?: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [openAfterUpload, setOpenAfterUpload] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      setErrorModal(null);
    } else {
      setErrorModal({
        title: "Invalid File Type",
        message: "Please upload a valid JSON or CSV file.",
        details: `Received: ${file?.name || "unknown"}`
      });
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setErrorModal(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setErrorModal(null);

    try {
      // Use the new endpoint to upload to database first
      const response = await uploadCustomQuestionsToDB(selectedFile, userId);
      
      if (response.success && response.questions.length > 0) {
        toast.success(`Successfully uploaded ${response.count} questions!`);
        
        if (openAfterUpload) {
          onQuestionsLoaded(response.questions);
        } else {
          // Just close the modal via callback or keep it open with success state?
          // User requested "toast comes with no of questions uploaded"
          // If not opening, we should probably reset or close. Let's call success callback if provided
          if (onSuccess) onSuccess();
          // Reset file selection to allow another upload
          setSelectedFile(null);
        }
      } else {
        setErrorModal({
          title: "No Questions Found",
          message: "The file was processed but no valid questions were found.",
          details: "Make sure your file contains an array of question objects with 'question' and 'ideal_answer' fields."
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to upload file";
      setErrorModal({
        title: "Upload Failed",
        message: "There was an error processing your file.",
        details: errorMessage
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="custom-upload-modal">
      {/* Error Modal */}
      <ErrorModal error={errorModal} onClose={() => setErrorModal(null)} />
      
      <div className="modal-header">
        <span className="modal-icon">
          <Upload className="w-6 h-6" />
        </span>
        <div>
          <h3>Upload Custom Questions</h3>
          <p>Practice with your own interview questions</p>
        </div>
      </div>

      <div
        className={`modal-dropzone ${isDragging ? "dragging" : ""} ${
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
          <div className="file-info">
            <span className="file-icon">
              <FileText className="w-6 h-6" />
            </span>
            <div className="file-details">
              <span className="file-name">{selectedFile.name}</span>
              <span className="file-size">
                {(selectedFile.size / 1024).toFixed(1)} KB
              </span>
            </div>
            <button
              className="remove-btn"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedFile(null);
              }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <>
            <span className="upload-icon">
              <FolderOpen className="w-10 h-10" />
            </span>
            <p className="upload-text">
              Drop your file here or click to browse
            </p>
            <span className="upload-hint">Supports .json and .csv files</span>
          </>
        )}
      </div>

      <div className="modal-format">
        <h4>
          <FileCode className="w-5 h-5 inline mr-2" />
          Expected Format
        </h4>
        <pre>{`[
  {
    "question": "Your question here",
    "ideal_answer": "Expected answer",
    "keywords": ["keyword1", "keyword2"],
    "category": "behavioral",
    "domain": "software_engineering",
    "difficulty": "medium"
  }
]`}</pre>
        <p className="format-hint">
          Categories: behavioral, technical, situational, general<br />
          Domains: software_engineering, management, finance, teaching, sales, general<br />
          Difficulty: easy, medium, hard
        </p>
      </div>

      {/* Checkbox for opening questions immediately */}
      <div className="flex items-center gap-2 mt-4 px-1">
        <input 
          type="checkbox" 
          id="open-questions" 
          checked={openAfterUpload}
          onChange={(e) => setOpenAfterUpload(e.target.checked)}
          className="w-4 h-4 rounded border-stone-300 text-primary-500 focus:ring-primary-500"
        />
        <label 
          htmlFor="open-questions" 
          className="text-sm font-medium text-stone-700 dark:text-surface-200 cursor-pointer select-none"
        >
          Start interview with these questions immediately
        </label>
      </div>

      <div className="modal-actions">
        <button
          className="btn-upload"
          onClick={handleUpload}
          disabled={!selectedFile || isUploading}
        >
          {isUploading ? (
            <>
              <span className="spinner"></span>
              Processing...
            </>
          ) : (
            <>
              <Upload className="w-5 h-5" />
              Upload
            </>
          )}
        </button>
        <button className="btn-cancel" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
