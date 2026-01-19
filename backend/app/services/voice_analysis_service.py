"""
Voice Analysis Service using librosa

This module provides comprehensive voice quality analysis for interview responses,
extracting features like pitch variation, energy projection, pause patterns,
and rhythm stability to score vocal delivery.

Created as part of the 6-score system implementation.
"""

import os
import logging
import numpy as np
from typing import Dict, List, Tuple, Optional, Any
from dataclasses import dataclass, field
from pathlib import Path

# Audio processing
import librosa
import soundfile as sf

# Configuration
from ..config import (
    VOICE_WEIGHTS,
    PITCH_STD_MONOTONE, PITCH_STD_OPTIMAL_MIN, PITCH_STD_OPTIMAL_MAX, PITCH_STD_DRAMATIC,
    ENERGY_DB_QUIET, ENERGY_DB_OPTIMAL_MIN, ENERGY_DB_OPTIMAL_MAX, ENERGY_DB_LOUD,
    PAUSE_PER_MIN_TOO_FEW, PAUSE_PER_MIN_OPTIMAL_MIN, PAUSE_PER_MIN_OPTIMAL_MAX, PAUSE_PER_MIN_TOO_MANY
)

logger = logging.getLogger(__name__)


@dataclass
class VoiceMetrics:
    """Container for extracted voice metrics"""
    # Pitch metrics
    pitch_mean: float = 0.0
    pitch_std: float = 0.0
    pitch_range: float = 0.0
    
    # Energy metrics
    energy_mean_db: float = 0.0
    energy_std_db: float = 0.0
    energy_range_db: float = 0.0
    
    # Pause metrics
    pause_count: int = 0
    pause_total_duration: float = 0.0
    pause_mean_duration: float = 0.0
    pauses_per_minute: float = 0.0
    
    # Rhythm metrics
    speech_rate_syllables: float = 0.0
    rhythm_variance: float = 0.0
    
    # Duration
    total_duration: float = 0.0
    speech_duration: float = 0.0
    
    # Raw data for advanced analysis
    pitch_contour: List[float] = field(default_factory=list)
    energy_contour: List[float] = field(default_factory=list)


@dataclass
class VoiceScores:
    """Container for individual voice component scores"""
    pitch_variation_score: float = 0.0
    energy_projection_score: float = 0.0
    pause_appropriateness_score: float = 0.0
    energy_consistency_score: float = 0.0
    rhythm_stability_score: float = 0.0
    
    # Overall weighted score
    overall_score: float = 0.0
    
    # Confidence level from voice (for Confidence score)
    voice_confidence: float = 0.0
    
    # Feedback suggestions
    feedback: List[str] = field(default_factory=list)


class VoiceAnalyzer:
    """
    Analyzes voice characteristics from audio recordings.
    
    Uses librosa for feature extraction to assess:
    - Pitch variation (expressiveness vs monotone)
    - Energy projection (volume confidence)
    - Pause patterns (natural vs hesitant)
    - Rhythm stability (consistent pacing)
    """
    
    def __init__(self, sample_rate: int = 22050):
        """
        Initialize the voice analyzer.
        
        Args:
            sample_rate: Target sample rate for audio processing
        """
        self.sample_rate = sample_rate
        self.hop_length = 512
        self.frame_length = 2048
        
        # Silence detection threshold
        self.silence_threshold_db = -40.0
        self.min_pause_duration = 0.3  # Minimum pause length in seconds
        
        logger.info("VoiceAnalyzer initialized with librosa backend")
    
    def analyze(self, audio_path: str) -> Tuple[VoiceScores, VoiceMetrics]:
        """
        Perform complete voice analysis on an audio file.
        
        Args:
            audio_path: Path to the audio file (WAV, MP3, etc.)
            
        Returns:
            Tuple of (VoiceScores, VoiceMetrics)
        """
        try:
            # Load audio
            y, sr = self._load_audio(audio_path)
            
            if y is None or len(y) == 0:
                logger.warning(f"Could not load audio from {audio_path}")
                return self._get_default_scores(), VoiceMetrics()
            
            # Extract metrics
            metrics = self._extract_metrics(y, sr)
            
            # Calculate scores
            scores = self._calculate_scores(metrics)
            
            logger.info(f"Voice analysis complete. Overall score: {scores.overall_score:.1f}")
            return scores, metrics
            
        except Exception as e:
            logger.error(f"Voice analysis failed: {e}")
            return self._get_default_scores(), VoiceMetrics()
    
    def analyze_from_array(self, audio_array: np.ndarray, sample_rate: int) -> Tuple[VoiceScores, VoiceMetrics]:
        """
        Perform voice analysis on an audio array.
        
        Args:
            audio_array: Audio signal as numpy array
            sample_rate: Sample rate of the audio
            
        Returns:
            Tuple of (VoiceScores, VoiceMetrics)
        """
        try:
            # Resample if needed
            if sample_rate != self.sample_rate:
                audio_array = librosa.resample(audio_array, orig_sr=sample_rate, target_sr=self.sample_rate)
                sample_rate = self.sample_rate
            
            metrics = self._extract_metrics(audio_array, sample_rate)
            scores = self._calculate_scores(metrics)
            
            return scores, metrics
            
        except Exception as e:
            logger.error(f"Voice analysis from array failed: {e}")
            return self._get_default_scores(), VoiceMetrics()
    
    def _load_audio(self, audio_path: str) -> Tuple[Optional[np.ndarray], int]:
        """Load and preprocess audio file."""
        try:
            # Try soundfile first (better for WAV)
            if audio_path.lower().endswith('.wav'):
                y, sr = sf.read(audio_path)
                if len(y.shape) > 1:
                    y = np.mean(y, axis=1)  # Convert to mono
                if sr != self.sample_rate:
                    y = librosa.resample(y, orig_sr=sr, target_sr=self.sample_rate)
                return y.astype(np.float32), self.sample_rate
        except Exception:
            pass
        
        try:
            # Fall back to librosa
            y, sr = librosa.load(audio_path, sr=self.sample_rate, mono=True)
            return y, sr
        except Exception as e:
            logger.error(f"Failed to load audio: {e}")
            return None, 0
    
    def _extract_metrics(self, y: np.ndarray, sr: int) -> VoiceMetrics:
        """Extract all voice metrics from audio signal."""
        metrics = VoiceMetrics()
        
        # Calculate duration
        metrics.total_duration = len(y) / sr
        
        # Extract pitch (F0)
        self._extract_pitch_metrics(y, sr, metrics)
        
        # Extract energy
        self._extract_energy_metrics(y, sr, metrics)
        
        # Extract pause information
        self._extract_pause_metrics(y, sr, metrics)
        
        # Extract rhythm metrics
        self._extract_rhythm_metrics(y, sr, metrics)
        
        return metrics
    
    def _extract_pitch_metrics(self, y: np.ndarray, sr: int, metrics: VoiceMetrics) -> None:
        """Extract pitch (fundamental frequency) metrics."""
        try:
            # Use pyin for more robust pitch tracking
            f0, voiced_flag, voiced_probs = librosa.pyin(
                y,
                fmin=librosa.note_to_hz('C2'),  # ~65 Hz
                fmax=librosa.note_to_hz('C6'),  # ~1047 Hz
                sr=sr,
                hop_length=self.hop_length
            )
            
            # Filter to voiced frames only
            voiced_f0 = f0[~np.isnan(f0)]
            
            if len(voiced_f0) > 0:
                metrics.pitch_mean = float(np.mean(voiced_f0))
                metrics.pitch_std = float(np.std(voiced_f0))
                metrics.pitch_range = float(np.max(voiced_f0) - np.min(voiced_f0))
                metrics.pitch_contour = voiced_f0.tolist()
            else:
                # Fallback values
                metrics.pitch_mean = 150.0
                metrics.pitch_std = 20.0
                metrics.pitch_range = 50.0
                
        except Exception as e:
            logger.warning(f"Pitch extraction failed: {e}")
            metrics.pitch_mean = 150.0
            metrics.pitch_std = 20.0
            metrics.pitch_range = 50.0
    
    def _extract_energy_metrics(self, y: np.ndarray, sr: int, metrics: VoiceMetrics) -> None:
        """Extract energy/loudness metrics."""
        try:
            # RMS energy
            rms = librosa.feature.rms(y=y, frame_length=self.frame_length, hop_length=self.hop_length)[0]
            
            # Convert to dB
            rms_db = librosa.amplitude_to_db(rms + 1e-10, ref=np.max)
            
            # Filter out very quiet frames (silence)
            active_frames = rms_db[rms_db > self.silence_threshold_db]
            
            if len(active_frames) > 0:
                metrics.energy_mean_db = float(np.mean(active_frames))
                metrics.energy_std_db = float(np.std(active_frames))
                metrics.energy_range_db = float(np.max(active_frames) - np.min(active_frames))
                metrics.energy_contour = rms_db.tolist()
            else:
                metrics.energy_mean_db = -20.0
                metrics.energy_std_db = 5.0
                metrics.energy_range_db = 15.0
                
        except Exception as e:
            logger.warning(f"Energy extraction failed: {e}")
            metrics.energy_mean_db = -20.0
            metrics.energy_std_db = 5.0
            metrics.energy_range_db = 15.0
    
    def _extract_pause_metrics(self, y: np.ndarray, sr: int, metrics: VoiceMetrics) -> None:
        """Extract pause pattern metrics."""
        try:
            # Get RMS energy
            rms = librosa.feature.rms(y=y, frame_length=self.frame_length, hop_length=self.hop_length)[0]
            rms_db = librosa.amplitude_to_db(rms + 1e-10, ref=np.max)
            
            # Identify silent frames
            is_silent = rms_db < self.silence_threshold_db
            
            # Convert to time
            frame_time = self.hop_length / sr
            
            # Find pause regions
            pause_durations = []
            current_pause = 0
            
            for silent in is_silent:
                if silent:
                    current_pause += frame_time
                else:
                    if current_pause >= self.min_pause_duration:
                        pause_durations.append(current_pause)
                    current_pause = 0
            
            # Handle trailing pause
            if current_pause >= self.min_pause_duration:
                pause_durations.append(current_pause)
            
            metrics.pause_count = len(pause_durations)
            metrics.pause_total_duration = sum(pause_durations)
            metrics.pause_mean_duration = np.mean(pause_durations) if pause_durations else 0.0
            metrics.speech_duration = metrics.total_duration - metrics.pause_total_duration
            
            # Calculate pauses per minute
            if metrics.total_duration > 0:
                metrics.pauses_per_minute = (metrics.pause_count / metrics.total_duration) * 60
                
        except Exception as e:
            logger.warning(f"Pause extraction failed: {e}")
            metrics.pause_count = 5
            metrics.pauses_per_minute = 5.0
    
    def _extract_rhythm_metrics(self, y: np.ndarray, sr: int, metrics: VoiceMetrics) -> None:
        """Extract rhythm and tempo metrics."""
        try:
            # Onset detection for rhythm analysis
            onset_env = librosa.onset.onset_strength(y=y, sr=sr, hop_length=self.hop_length)
            
            # Tempo estimation
            tempo, beats = librosa.beat.beat_track(onset_envelope=onset_env, sr=sr, hop_length=self.hop_length)
            
            # Calculate inter-onset intervals
            onset_frames = librosa.onset.onset_detect(onset_envelope=onset_env, sr=sr, hop_length=self.hop_length)
            onset_times = librosa.frames_to_time(onset_frames, sr=sr, hop_length=self.hop_length)
            
            if len(onset_times) > 1:
                intervals = np.diff(onset_times)
                metrics.rhythm_variance = float(np.std(intervals) / (np.mean(intervals) + 1e-10))
            else:
                metrics.rhythm_variance = 0.5  # Default
            
            # Estimate syllable rate (rough approximation based on onsets)
            if metrics.speech_duration > 0:
                metrics.speech_rate_syllables = len(onset_frames) / metrics.speech_duration
                
        except Exception as e:
            logger.warning(f"Rhythm extraction failed: {e}")
            metrics.rhythm_variance = 0.5
            metrics.speech_rate_syllables = 3.5
    
    def _calculate_scores(self, metrics: VoiceMetrics) -> VoiceScores:
        """Calculate all voice scores from extracted metrics."""
        scores = VoiceScores()
        
        # 1. Pitch Variation Score (0-100)
        scores.pitch_variation_score = self._score_pitch_variation(metrics.pitch_std)
        
        # 2. Energy Projection Score (0-100)
        scores.energy_projection_score = self._score_energy_projection(metrics.energy_mean_db)
        
        # 3. Pause Appropriateness Score (0-100)
        scores.pause_appropriateness_score = self._score_pause_pattern(metrics.pauses_per_minute)
        
        # 4. Energy Consistency Score (0-100)
        scores.energy_consistency_score = self._score_energy_consistency(metrics.energy_std_db)
        
        # 5. Rhythm Stability Score (0-100)
        scores.rhythm_stability_score = self._score_rhythm_stability(metrics.rhythm_variance)
        
        # Calculate weighted overall score
        scores.overall_score = (
            VOICE_WEIGHTS["pitch_variation"] * scores.pitch_variation_score +
            VOICE_WEIGHTS["energy_projection"] * scores.energy_projection_score +
            VOICE_WEIGHTS["pause_appropriateness"] * scores.pause_appropriateness_score +
            VOICE_WEIGHTS["energy_consistency"] * scores.energy_consistency_score +
            VOICE_WEIGHTS["rhythm_stability"] * scores.rhythm_stability_score
        )
        
        # Calculate voice confidence (for confidence score)
        scores.voice_confidence = self._calculate_voice_confidence(scores, metrics)
        
        # Generate feedback
        scores.feedback = self._generate_feedback(scores, metrics)
        
        return scores
    
    def _score_pitch_variation(self, pitch_std: float) -> float:
        """
        Score pitch variation on 0-100 scale.
        
        Optimal: 25-50 Hz std deviation (expressive but not erratic)
        Too low: < 15 Hz (monotone)
        Too high: > 70 Hz (overly dramatic)
        """
        if pitch_std < PITCH_STD_MONOTONE:
            # Monotone - scale from 0-50
            return max(0, (pitch_std / PITCH_STD_MONOTONE) * 50)
        elif pitch_std <= PITCH_STD_OPTIMAL_MIN:
            # Below optimal - scale 50-80
            ratio = (pitch_std - PITCH_STD_MONOTONE) / (PITCH_STD_OPTIMAL_MIN - PITCH_STD_MONOTONE)
            return 50 + ratio * 30
        elif pitch_std <= PITCH_STD_OPTIMAL_MAX:
            # Optimal range - 80-100
            ratio = (pitch_std - PITCH_STD_OPTIMAL_MIN) / (PITCH_STD_OPTIMAL_MAX - PITCH_STD_OPTIMAL_MIN)
            return 80 + ratio * 20
        elif pitch_std <= PITCH_STD_DRAMATIC:
            # Above optimal - scale 100-70
            ratio = (pitch_std - PITCH_STD_OPTIMAL_MAX) / (PITCH_STD_DRAMATIC - PITCH_STD_OPTIMAL_MAX)
            return 100 - ratio * 30
        else:
            # Overly dramatic
            return max(50, 70 - (pitch_std - PITCH_STD_DRAMATIC) * 0.5)
    
    def _score_energy_projection(self, energy_db: float) -> float:
        """
        Score energy projection on 0-100 scale.
        
        Note: librosa returns dB relative to max, so values are typically negative.
        We normalize based on typical speech patterns.
        """
        # Normalize: librosa dB is relative, adjust for typical ranges
        normalized_db = energy_db + 30  # Shift to positive range
        
        if normalized_db < 0:
            return max(30, 50 + normalized_db * 2)
        elif normalized_db < 10:
            return 50 + normalized_db * 3
        elif normalized_db < 20:
            return 80 + (normalized_db - 10) * 2
        else:
            return min(100, 100)
    
    def _score_pause_pattern(self, pauses_per_minute: float) -> float:
        """
        Score pause patterns on 0-100 scale.
        
        Optimal: 3-8 pauses per minute
        """
        if pauses_per_minute < PAUSE_PER_MIN_TOO_FEW:
            # Too rushed
            return max(40, 60 + (pauses_per_minute - PAUSE_PER_MIN_TOO_FEW) * 10)
        elif pauses_per_minute <= PAUSE_PER_MIN_OPTIMAL_MIN:
            # Slightly rushed
            ratio = (pauses_per_minute - PAUSE_PER_MIN_TOO_FEW) / (PAUSE_PER_MIN_OPTIMAL_MIN - PAUSE_PER_MIN_TOO_FEW)
            return 60 + ratio * 20
        elif pauses_per_minute <= PAUSE_PER_MIN_OPTIMAL_MAX:
            # Optimal
            return 90 + min(10, (pauses_per_minute - PAUSE_PER_MIN_OPTIMAL_MIN) * 2)
        elif pauses_per_minute <= PAUSE_PER_MIN_TOO_MANY:
            # Slightly hesitant
            ratio = (pauses_per_minute - PAUSE_PER_MIN_OPTIMAL_MAX) / (PAUSE_PER_MIN_TOO_MANY - PAUSE_PER_MIN_OPTIMAL_MAX)
            return 100 - ratio * 30
        else:
            # Too hesitant
            return max(40, 70 - (pauses_per_minute - PAUSE_PER_MIN_TOO_MANY) * 3)
    
    def _score_energy_consistency(self, energy_std: float) -> float:
        """
        Score energy consistency on 0-100 scale.
        
        Lower std = more consistent (good)
        Very low std = might be monotone (okay but not great)
        """
        # Optimal std is around 5-10 dB
        if energy_std < 3:
            # Very consistent, might be too flat
            return 75
        elif energy_std <= 8:
            # Optimal - dynamic but controlled
            return 90 + min(10, (8 - energy_std))
        elif energy_std <= 15:
            # Slightly inconsistent
            ratio = (energy_std - 8) / 7
            return 90 - ratio * 20
        else:
            # Too inconsistent (nervous)
            return max(50, 70 - (energy_std - 15) * 2)
    
    def _score_rhythm_stability(self, rhythm_variance: float) -> float:
        """
        Score rhythm stability on 0-100 scale.
        
        Lower variance = more stable rhythm
        """
        # Optimal variance is 0.2-0.5
        if rhythm_variance < 0.1:
            # Too uniform (robotic)
            return 70
        elif rhythm_variance <= 0.3:
            # Optimal - stable but natural
            ratio = (rhythm_variance - 0.1) / 0.2
            return 85 + ratio * 15
        elif rhythm_variance <= 0.6:
            # Slightly variable
            ratio = (rhythm_variance - 0.3) / 0.3
            return 100 - ratio * 20
        else:
            # Erratic pacing
            return max(50, 80 - (rhythm_variance - 0.6) * 50)
    
    def _calculate_voice_confidence(self, scores: VoiceScores, metrics: VoiceMetrics) -> float:
        """
        Calculate voice-based confidence indicator.
        
        Combines energy projection and stability for confidence estimate.
        """
        # Energy projection is the main confidence indicator
        # Consistency also matters - nervous speakers have inconsistent energy
        
        confidence = (
            0.5 * scores.energy_projection_score +
            0.3 * scores.energy_consistency_score +
            0.2 * scores.pitch_variation_score
        )
        
        return min(100, max(0, confidence))
    
    def _generate_feedback(self, scores: VoiceScores, metrics: VoiceMetrics) -> List[str]:
        """Generate actionable feedback based on scores."""
        feedback = []
        
        # Pitch feedback
        if scores.pitch_variation_score < 60:
            if metrics.pitch_std < PITCH_STD_OPTIMAL_MIN:
                feedback.append("Try varying your pitch more to sound more engaging and expressive.")
            else:
                feedback.append("Your pitch variation is excessive; try to moderate your tone.")
        elif scores.pitch_variation_score >= 85:
            feedback.append("Excellent vocal expressiveness!")
        
        # Energy feedback
        if scores.energy_projection_score < 60:
            feedback.append("Speak up! Project your voice more confidently.")
        elif scores.energy_projection_score >= 85:
            feedback.append("Great voice projection and volume.")
        
        # Pause feedback
        if scores.pause_appropriateness_score < 60:
            if metrics.pauses_per_minute < PAUSE_PER_MIN_OPTIMAL_MIN:
                feedback.append("Try to pause more between thoughts to let ideas sink in.")
            else:
                feedback.append("Reduce hesitation pauses; practice for smoother delivery.")
        elif scores.pause_appropriateness_score >= 85:
            feedback.append("Natural and effective use of pauses.")
        
        # Consistency feedback
        if scores.energy_consistency_score < 60:
            feedback.append("Work on maintaining consistent energy throughout your response.")
        
        # Rhythm feedback
        if scores.rhythm_stability_score < 60:
            feedback.append("Focus on steady pacing; avoid rushing or slowing down erratically.")
        elif scores.rhythm_stability_score >= 85:
            feedback.append("Excellent pacing and rhythm.")
        
        # Overall
        if scores.overall_score >= 80:
            feedback.insert(0, "Strong overall vocal delivery!")
        elif scores.overall_score < 50:
            feedback.insert(0, "Voice delivery needs significant improvement.")
        
        return feedback
    
    def _get_default_scores(self) -> VoiceScores:
        """Return default scores when analysis fails."""
        return VoiceScores(
            pitch_variation_score=70.0,
            energy_projection_score=70.0,
            pause_appropriateness_score=70.0,
            energy_consistency_score=70.0,
            rhythm_stability_score=70.0,
            overall_score=70.0,
            voice_confidence=70.0,
            feedback=["Unable to analyze voice quality from audio."]
        )


# Singleton instance
_voice_analyzer: Optional[VoiceAnalyzer] = None


def get_voice_analyzer() -> VoiceAnalyzer:
    """Get or create the voice analyzer singleton."""
    global _voice_analyzer
    if _voice_analyzer is None:
        _voice_analyzer = VoiceAnalyzer()
    return _voice_analyzer


def analyze_voice(audio_path: str) -> Dict[str, Any]:
    """
    Convenience function to analyze voice from a file.
    
    Args:
        audio_path: Path to audio file
        
    Returns:
        Dictionary with scores and metrics
    """
    analyzer = get_voice_analyzer()
    scores, metrics = analyzer.analyze(audio_path)
    
    return {
        "scores": {
            "pitch_variation": scores.pitch_variation_score,
            "energy_projection": scores.energy_projection_score,
            "pause_appropriateness": scores.pause_appropriateness_score,
            "energy_consistency": scores.energy_consistency_score,
            "rhythm_stability": scores.rhythm_stability_score,
            "overall": scores.overall_score,
            "voice_confidence": scores.voice_confidence
        },
        "metrics": {
            "pitch_mean_hz": metrics.pitch_mean,
            "pitch_std_hz": metrics.pitch_std,
            "energy_mean_db": metrics.energy_mean_db,
            "pause_count": metrics.pause_count,
            "pauses_per_minute": metrics.pauses_per_minute,
            "total_duration_sec": metrics.total_duration,
            "speech_duration_sec": metrics.speech_duration
        },
        "feedback": scores.feedback
    }
