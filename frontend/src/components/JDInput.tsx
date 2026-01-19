/**
 * AI Interview Feedback MVP - Job Description Input Component
 *
 * A standalone component for job description input.
 * Can be used separately or within the UploadResume component.
 *
 * Author: Member 3 (Frontend)
 */

import React from "react";
import { CheckCircle2 } from "lucide-react";

interface JDInputProps {
  value: string;
  onChange: (value: string) => void;
  minLength?: number;
  placeholder?: string;
  disabled?: boolean;
}

const JDInput: React.FC<JDInputProps> = ({
  value,
  onChange,
  minLength = 50,
  placeholder = "Paste the job description here...",
  disabled = false,
}) => {
  const isValid = value.length >= minLength;
  const remaining = minLength - value.length;

  return (
    <div className="jd-input-container">
      <label htmlFor="jd-input" className="form-label">
        <span className="icon"></span>
        Job Description
      </label>

      <textarea
        id="jd-input"
        className={`form-textarea ${isValid ? "valid" : ""}`}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={10}
        disabled={disabled}
      />

      <div className="jd-input-footer">
        <span className={`char-count ${isValid ? "valid" : "invalid"}`}>
          {value.length} characters
          {!isValid && ` (${remaining} more needed)`}
        </span>

        {isValid && (
          <span className="valid-indicator">
            <CheckCircle2 className="w-4 h-4 inline mr-1" /> Ready
          </span>
        )}
      </div>

      {/* Helper text */}
      <p className="helper-text">
        Include the full job description with requirements and qualifications
        for the most accurate analysis.
      </p>
    </div>
  );
};

export default JDInput;
