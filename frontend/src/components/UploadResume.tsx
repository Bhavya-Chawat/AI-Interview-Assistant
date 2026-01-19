/**
 * AI Interview Feedback MVP - Resume Upload Component
 *
 * Handles:
 * - Resume file selection (PDF/DOCX)
 * - Job description input
 * - Upload and analysis submission
 *
 * Author: Member 3 (Frontend)
 */

import React, { useState, useRef } from "react";
import { uploadResume, ResumeAnalysisResponse } from "../api/apiClient";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface UploadResumeProps {
  onAnalysisComplete: (
    analysis: ResumeAnalysisResponse,
    jobDescription: string
  ) => void;
  setIsLoading: (loading: boolean) => void;
}

const UploadResume: React.FC<UploadResumeProps> = ({
  onAnalysisComplete,
  setIsLoading,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [dragActive, setDragActive] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file selection
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      validateAndSetFile(file);
    }
  };

  // Validate file type and size
  const validateAndSetFile = (file: File) => {
    setError("");

    const validTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    const validExtensions = [".pdf", ".docx"];

    const hasValidExtension = validExtensions.some((ext) =>
      file.name.toLowerCase().endsWith(ext)
    );

    if (!validTypes.includes(file.type) && !hasValidExtension) {
      setError("Please upload a PDF or DOCX file");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("File size must be less than 10MB");
      return;
    }

    setSelectedFile(file);
  };

  // Handle drag and drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      validateAndSetFile(file);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!selectedFile) {
      setError("Please select a resume file");
      return;
    }

    if (!jobDescription.trim() || jobDescription.length < 50) {
      setError("Please enter a job description (at least 50 characters)");
      return;
    }

    setIsLoading(true);

    try {
      toast.loading("Analyzing your resume...", { id: "resume-analysis" });
      const analysis = await uploadResume(selectedFile, jobDescription);
      toast.success("Resume analyzed successfully!", { id: "resume-analysis" });
      onAnalysisComplete(analysis, jobDescription);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to analyze resume";
      toast.error(errorMessage, { id: "resume-analysis" });
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="upload-resume-container">
      <div className="card">
        <h2 className="card-title">
          <span className="icon"></span>
          Upload Your Resume
        </h2>

        <form onSubmit={handleSubmit} className="upload-form">
          {/* File Drop Zone */}
          <div
            className={`file-drop-zone ${dragActive ? "active" : ""} ${
              selectedFile ? "has-file" : ""
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx"
              onChange={handleFileChange}
              className="file-input-hidden"
            />

            {selectedFile ? (
              <div className="file-selected">
                <span className="file-icon">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                </span>
                <span className="file-name">{selectedFile.name}</span>
                <span className="file-size">
                  ({(selectedFile.size / 1024).toFixed(1)} KB)
                </span>
              </div>
            ) : (
              <div className="drop-zone-content">
                <span className="drop-icon"></span>
                <p className="drop-text">
                  Drag & drop your resume here or{" "}
                  <span className="link">browse</span>
                </p>
                <p className="drop-hint">Supports PDF and DOCX (max 10MB)</p>
              </div>
            )}
          </div>

          {/* Job Description Input */}
          <div className="form-group">
            <label htmlFor="jobDescription" className="form-label">
              <span className="icon"></span>
              Job Description
            </label>
            <textarea
              id="jobDescription"
              className="form-textarea"
              placeholder="Paste the job description you're applying for here..."
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              rows={8}
            />
            <span className="char-count">
              {jobDescription.length} characters
              {jobDescription.length < 50 && " (minimum 50)"}
            </span>
          </div>

          {/* Error Display */}
          {error && (
            <div className="error-message">
              <span className="error-icon"></span>
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            className="btn btn-primary btn-large"
            disabled={!selectedFile || jobDescription.length < 50}
          >
            <span className="btn-icon"></span>
            Analyze Resume
          </button>
        </form>
      </div>

      {/* Tips Card */}
      <div className="tips-card">
        <h3>Tips for Best Results</h3>
        <ul>
          <li>Upload your most recent resume</li>
          <li>Paste the complete job description</li>
          <li>Include all requirements and qualifications</li>
          <li>The more detail, the better the analysis</li>
        </ul>
      </div>
    </div>
  );
};

export default UploadResume;
