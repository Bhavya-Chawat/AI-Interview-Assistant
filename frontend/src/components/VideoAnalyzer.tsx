/**
 * AI Interview Feedback MVP - Video Analyzer Component
 * 
 * Real-time video analysis for interview practice:
 * - Face detection and tracking using face-api.js
 * - Eye contact measurement
 * - Expression analysis (confident, nervous, neutral) using neural network
 * - Movement/stability tracking
 * 
 * Uses face-api.js for accurate facial expression recognition
 */

import React, { useEffect, useRef, useState, useCallback } from 'react'
import * as faceapi from 'face-api.js'
import { LoadingSpinner } from './ui/LoadingSpinner'

// Types for video analysis metrics
export interface VideoMetrics {
    eyeContactPercent: number
    expressionCounts: {
        confident: number
        neutral: number
        nervous: number
    }
    dominantExpression: 'confident' | 'neutral' | 'nervous'
    movementStability: number
    overallConfidence: number
    faceDetected: boolean
    frameCount: number
}

export interface RealTimeMetrics {
    eyeContact: boolean
    expression: 'confident' | 'neutral' | 'nervous'
    stability: number
    faceDetected: boolean
}

interface VideoAnalyzerProps {
    videoStream: MediaStream | null
    isAnalyzing: boolean
    showOverlayToUser?: boolean  // Whether to show face box and metrics overlay (default: false)
    onMetricsUpdate?: (metrics: RealTimeMetrics) => void
    onFinalMetrics?: (metrics: VideoMetrics) => void
}

// Map face-api.js expressions to our confidence categories with improved algorithm
const mapExpressionToConfidence = (
    expressions: faceapi.FaceExpressions,
    prevExpression?: 'confident' | 'neutral' | 'nervous'
): 'confident' | 'neutral' | 'nervous' => {
    const { happy, neutral, surprised, sad, fearful, angry, disgusted } = expressions

    // Calculate confidence score based on expression weights with intensity bonuses
    // Happy and surprised indicate engagement and confidence
    let confidentScore = happy * 1.0 + surprised * 0.8 + neutral * 0.2

    // Strong emotion bonuses - a big smile is very confident
    if (happy > 0.6) confidentScore += 0.4  // Strong smile boost
    if (happy > 0.4 && surprised > 0.2) confidentScore += 0.2  // Engaged and interested

    // Sad, fearful, angry, disgusted indicate nervousness
    const nervousScore = sad * 1.0 + fearful * 1.2 + angry * 0.4 + disgusted * 0.4

    // Neutral is baseline but slight expressions still count
    const neutralScore = neutral * 0.8

    // Determine expression with hysteresis to avoid rapid changes
    let newExpression: 'confident' | 'neutral' | 'nervous'

    if (confidentScore > 0.35 && confidentScore > nervousScore && confidentScore > neutralScore) {
        newExpression = 'confident'
    } else if (nervousScore > 0.3 && nervousScore > confidentScore) {
        newExpression = 'nervous'
    } else {
        newExpression = 'neutral'
    }

    // Apply temporal smoothing - require stronger signal to change from previous
    if (prevExpression && prevExpression !== newExpression) {
        // Need a stronger signal to change expression (hysteresis)
        if (newExpression === 'confident' && confidentScore < 0.45) {
            return prevExpression  // Stay with previous
        }
        if (newExpression === 'nervous' && nervousScore < 0.4) {
            return prevExpression
        }
    }

    return newExpression
}

// Face detection using face-api.js neural network
const VideoAnalyzer: React.FC<VideoAnalyzerProps> = ({
    videoStream,
    isAnalyzing,
    showOverlayToUser = false,  // Default: hide overlay from interviewee
    onMetricsUpdate,
    onFinalMetrics
}) => {
    const videoRef = useRef<HTMLVideoElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const overlayCanvasRef = useRef<HTMLCanvasElement>(null)
    const animationRef = useRef<number | null>(null)

    // Model loading state
    const [modelsLoaded, setModelsLoaded] = useState(false)
    const [modelError, setModelError] = useState<string | null>(null)

    // Tracking state
    const [faceDetected, setFaceDetected] = useState(false)
    const [currentExpression, setCurrentExpression] = useState<'confident' | 'neutral' | 'nervous'>('neutral')
    const [eyeContactPercent, setEyeContactPercent] = useState(100)
    const [stability, setStability] = useState(100)

    // Cumulative metrics for final score
    const metricsRef = useRef<VideoMetrics>({
        eyeContactPercent: 0,
        expressionCounts: { confident: 0, neutral: 0, nervous: 0 },
        dominantExpression: 'neutral',
        movementStability: 100,
        overallConfidence: 0,
        faceDetected: false,
        frameCount: 0
    })

    // Previous frame data for movement detection
    const prevFacePositionRef = useRef<{ x: number, y: number } | null>(null)

    // Load face-api.js models on mount
    useEffect(() => {
        const loadModels = async () => {
            try {
                const MODEL_URL = '/models'
                await Promise.all([
                    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                    faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
                ])
                console.log('Face-api.js models loaded successfully')
                setModelsLoaded(true)
            } catch (error) {
                console.error('❌ Error loading face-api.js models:', error)
                setModelError('Failed to load expression models. Using fallback detection.')
            }
        }
        loadModels()
    }, [])

    // Set up video stream
    useEffect(() => {
        if (videoRef.current && videoStream) {
            videoRef.current.srcObject = videoStream
            videoRef.current.play().catch(console.error)
        }
    }, [videoStream])

    // Analyze a single frame using face-api.js
    const analyzeFrame = useCallback(async () => {
        if (!videoRef.current || !canvasRef.current || !isAnalyzing) return

        const video = videoRef.current
        const canvas = canvasRef.current

        // Set canvas size to match video
        canvas.width = video.videoWidth || 640
        canvas.height = video.videoHeight || 480

        let faceDetected = false
        let expression: 'confident' | 'neutral' | 'nervous' = 'neutral'
        let faceBox: { x: number, y: number, width: number, height: number } | null = null

        // Try face-api.js detection if models are loaded
        if (modelsLoaded) {
            try {
                const detection = await faceapi
                    .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({
                        inputSize: 320,
                        scoreThreshold: 0.5
                    }))
                    .withFaceExpressions()

                if (detection) {
                    faceDetected = true
                    faceBox = detection.detection.box
                    expression = mapExpressionToConfidence(detection.expressions)
                }
            } catch (error) {
                console.warn('Face detection error:', error)
            }
        } else {
            // Fallback: Simple skin-color based face detection
            const ctx = canvas.getContext('2d')
            if (ctx) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
                const faceInfo = detectFaceRegion(imageData, canvas.width, canvas.height)
                faceDetected = faceInfo.detected
                if (faceDetected) {
                    faceBox = {
                        x: faceInfo.bounds.minX,
                        y: faceInfo.bounds.minY,
                        width: faceInfo.bounds.maxX - faceInfo.bounds.minX,
                        height: faceInfo.bounds.maxY - faceInfo.bounds.minY
                    }
                    // Fallback expression detection using brightness
                    const brightness = faceInfo.avgBrightness
                    const variance = faceInfo.brightnessVariance
                    if (brightness > 130 && variance > 1000) {
                        expression = 'confident'
                    } else if (brightness < 100 || variance < 500) {
                        expression = 'nervous'
                    }
                }
            }
        }

        setFaceDetected(faceDetected)
        setCurrentExpression(expression)

        // Calculate movement from previous frame for stability
        let frameStability = 100
        if (prevFacePositionRef.current && faceBox) {
            const centerX = faceBox.x + faceBox.width / 2
            const centerY = faceBox.y + faceBox.height / 2
            const dx = Math.abs(centerX - prevFacePositionRef.current.x)
            const dy = Math.abs(centerY - prevFacePositionRef.current.y)
            const movement = Math.sqrt(dx * dx + dy * dy)
            // More stable = less movement = higher score
            frameStability = Math.max(0, 100 - movement * 2)
        }

        if (faceBox) {
            const centerX = faceBox.x + faceBox.width / 2
            const centerY = faceBox.y + faceBox.height / 2
            prevFacePositionRef.current = { x: centerX, y: centerY }
        }

        // Update running average for stability
        const newStability = Math.round(stability * 0.9 + frameStability * 0.1)
        setStability(newStability)

        // Eye contact estimation based on face position
        // If face is centered, assume good eye contact
        let eyeContact = false
        if (faceBox) {
            const centerX = faceBox.x + faceBox.width / 2
            const centerY = faceBox.y + faceBox.height / 2
            const centerThresholdX = canvas.width * 0.3
            const centerThresholdY = canvas.height * 0.3
            const isXCentered = Math.abs(centerX - canvas.width / 2) < centerThresholdX
            const isYCentered = Math.abs(centerY - canvas.height / 2) < centerThresholdY
            eyeContact = isXCentered && isYCentered
        }

        // Update eye contact running average
        const newEyeContact = Math.round(eyeContactPercent * 0.95 + (eyeContact ? 100 : 0) * 0.05)
        setEyeContactPercent(newEyeContact)

        // Update cumulative metrics
        metricsRef.current.frameCount++
        metricsRef.current.expressionCounts[expression]++
        metricsRef.current.faceDetected = faceDetected
        metricsRef.current.eyeContactPercent = newEyeContact
        metricsRef.current.movementStability = newStability

        // Draw overlay visualization
        const faceInfo = faceBox ? {
            detected: true,
            centerX: faceBox.x + faceBox.width / 2,
            centerY: faceBox.y + faceBox.height / 2,
            bounds: {
                minX: faceBox.x,
                maxX: faceBox.x + faceBox.width,
                minY: faceBox.y,
                maxY: faceBox.y + faceBox.height
            },
            avgBrightness: 0,
            brightnessVariance: 0
        } : {
            detected: false,
            centerX: canvas.width / 2,
            centerY: canvas.height / 2,
            bounds: { minX: 0, maxX: 0, minY: 0, maxY: 0 },
            avgBrightness: 0,
            brightnessVariance: 0
        }
        drawOverlay(faceInfo, expression, eyeContact, newStability)

        // Send real-time update
        if (onMetricsUpdate) {
            onMetricsUpdate({
                eyeContact,
                expression,
                stability: newStability,
                faceDetected
            })
        }

        // Continue analysis loop (throttled for performance)
        animationRef.current = window.setTimeout(() => {
            requestAnimationFrame(() => analyzeFrame())
        }, 100) as unknown as number // Analyze at ~10fps for performance
    }, [isAnalyzing, stability, eyeContactPercent, onMetricsUpdate, modelsLoaded])

    // Simple face detection using skin color
    const detectFaceRegion = (imageData: ImageData, width: number, height: number) => {
        const data = imageData.data
        let skinPixels = 0
        let totalX = 0
        let totalY = 0
        let minX = width, maxX = 0, minY = height, maxY = 0
        let totalBrightness = 0
        const brightnessValues: number[] = []

        for (let y = 0; y < height; y += 4) {  // Sample every 4th pixel for speed
            for (let x = 0; x < width; x += 4) {
                const i = (y * width + x) * 4
                const r = data[i]
                const g = data[i + 1]
                const b = data[i + 2]

                // Simple skin color detection (works for various skin tones)
                const isSkinColor = (
                    r > 60 && g > 40 && b > 20 &&
                    r > g && r > b &&
                    Math.abs(r - g) > 15 &&
                    r - b > 15 && r - b < 170
                )

                if (isSkinColor) {
                    skinPixels++
                    totalX += x
                    totalY += y
                    minX = Math.min(minX, x)
                    maxX = Math.max(maxX, x)
                    minY = Math.min(minY, y)
                    maxY = Math.max(maxY, y)

                    const brightness = (r + g + b) / 3
                    totalBrightness += brightness
                    brightnessValues.push(brightness)
                }
            }
        }

        const detected = skinPixels > 500 // Minimum skin pixels to consider face detected

        // Calculate brightness variance
        let variance = 0
        if (brightnessValues.length > 0) {
            const avgBrightness = totalBrightness / brightnessValues.length
            variance = brightnessValues.reduce((sum, b) => sum + Math.pow(b - avgBrightness, 2), 0) / brightnessValues.length
        }

        return {
            detected,
            centerX: detected ? totalX / skinPixels : width / 2,
            centerY: detected ? totalY / skinPixels : height / 2,
            bounds: { minX, maxX, minY, maxY },
            avgBrightness: detected ? totalBrightness / skinPixels : 0,
            brightnessVariance: variance
        }
    }

    // Draw overlay on canvas (only if showOverlayToUser is true)
    const drawOverlay = (
        faceInfo: ReturnType<typeof detectFaceRegion>,
        expression: string,
        eyeContact: boolean,
        stability: number
    ) => {
        if (!overlayCanvasRef.current || !videoRef.current) return

        const canvas = overlayCanvasRef.current
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        canvas.width = videoRef.current.videoWidth || 640
        canvas.height = videoRef.current.videoHeight || 480

        // Always clear the canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height)

        // If overlay should be hidden from user, skip drawing visual indicators
        if (!showOverlayToUser) {
            return  // Analysis still runs, just no visuals
        }

        if (faceInfo.detected) {
            // Draw face region indicator
            const { minX, maxX, minY, maxY } = faceInfo.bounds
            const padding = 30

            ctx.strokeStyle = eyeContact ? '#10B981' : '#F59E0B'  // Green if good eye contact
            ctx.lineWidth = 3
            ctx.beginPath()
            ctx.roundRect(
                minX - padding,
                minY - padding,
                maxX - minX + padding * 2,
                maxY - minY + padding * 2,
                10
            )
            ctx.stroke()

            // Draw status indicators
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
            ctx.fillRect(10, canvas.height - 90, 200, 80)

            ctx.fillStyle = '#FFFFFF'
            ctx.font = '14px Inter, sans-serif'
            ctx.fillText(`Eye Contact: ${eyeContact ? 'Good' : 'Low'}`, 20, canvas.height - 65)
            ctx.fillText(`Expression: ${expression}`, 20, canvas.height - 45)
            ctx.fillText(`Stability: ${stability}%`, 20, canvas.height - 25)
        } else {
            // No face detected warning
            ctx.fillStyle = 'rgba(239, 68, 68, 0.8)'
            ctx.fillRect(canvas.width / 2 - 100, 20, 200, 40)
            ctx.fillStyle = '#FFFFFF'
            ctx.font = '16px Inter, sans-serif'
            ctx.textAlign = 'center'
            ctx.fillText('Face not detected', canvas.width / 2, 45)
            ctx.textAlign = 'left'
        }
    }

    // Start/stop analysis loop
    useEffect(() => {
        if (isAnalyzing && videoStream) {
            // Reset metrics
            metricsRef.current = {
                eyeContactPercent: 0,
                expressionCounts: { confident: 0, neutral: 0, nervous: 0 },
                dominantExpression: 'neutral',
                movementStability: 100,
                overallConfidence: 0,
                faceDetected: false,
                frameCount: 0
            }
            prevFacePositionRef.current = null

            // Start analysis
            analyzeFrame()
        } else {
            // Stop analysis
            if (animationRef.current) {
                clearTimeout(animationRef.current)
            }

            // Calculate final metrics
            if (metricsRef.current.frameCount > 0 && onFinalMetrics) {
                const counts = metricsRef.current.expressionCounts
                const total = counts.confident + counts.neutral + counts.nervous

                // Determine dominant expression
                if (counts.confident >= counts.neutral && counts.confident >= counts.nervous) {
                    metricsRef.current.dominantExpression = 'confident'
                } else if (counts.nervous > counts.neutral) {
                    metricsRef.current.dominantExpression = 'nervous'
                } else {
                    metricsRef.current.dominantExpression = 'neutral'
                }

                // Calculate overall confidence score
                const expressionScore = total > 0
                    ? (counts.confident * 100 + counts.neutral * 70 + counts.nervous * 40) / total
                    : 50
                const eyeScore = metricsRef.current.eyeContactPercent
                const stabilityScore = metricsRef.current.movementStability

                metricsRef.current.overallConfidence = Math.round(
                    expressionScore * 0.4 + eyeScore * 0.35 + stabilityScore * 0.25
                )

                onFinalMetrics(metricsRef.current)
            }
        }

        return () => {
            if (animationRef.current) {
                clearTimeout(animationRef.current)
            }
        }
    }, [isAnalyzing, videoStream, analyzeFrame, onFinalMetrics])

    return (
        <div className="video-analyzer">
            <div className="video-container">
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="video-preview"
                />
                <canvas ref={canvasRef} style={{ display: 'none' }} />
                <canvas ref={overlayCanvasRef} className="video-overlay" />
            </div>

            {/* Model loading status */}
            {modelError && (
                <div className="model-error" style={{ padding: '8px', background: '#FEF3C7', color: '#92400E', borderRadius: '4px', marginBottom: '8px', fontSize: '12px' }}>
                    {modelError}
                </div>
            )}

            {/* Real-time metrics display */}
            <div className="video-metrics">
                <div className={`metric-indicator ${faceDetected ? 'active' : 'warning'}`}>
                    {!modelsLoaded && !modelError ? (
                        <div className="flex items-center gap-2">
                            <LoadingSpinner size="sm" className="text-amber-500" />
                            <span>Loading models...</span>
                        </div>
                    ) : faceDetected ? 'Face Detected' : 'No Face'}
                </div>
                <div className="metric-bars">
                    <div className="metric-bar">
                        <span className="metric-label">Eye Contact</span>
                        <div className="metric-progress">
                            <div
                                className="metric-fill"
                                style={{
                                    width: `${eyeContactPercent}%`,
                                    backgroundColor: eyeContactPercent > 70 ? '#10B981' : eyeContactPercent > 40 ? '#F59E0B' : '#EF4444'
                                }}
                            />
                        </div>
                        <span className="metric-value">{eyeContactPercent}%</span>
                    </div>
                    <div className="metric-bar">
                        <span className="metric-label">Expression</span>
                        <span className={`expression-badge ${currentExpression}`}>
                            {currentExpression === 'confident' && 'Confident'}
                            {currentExpression === 'neutral' && 'Neutral'}
                            {currentExpression === 'nervous' && 'Nervous'}
                        </span>
                    </div>
                    <div className="metric-bar">
                        <span className="metric-label">Stability</span>
                        <div className="metric-progress">
                            <div
                                className="metric-fill"
                                style={{
                                    width: `${stability}%`,
                                    backgroundColor: stability > 70 ? '#10B981' : stability > 40 ? '#F59E0B' : '#EF4444'
                                }}
                            />
                        </div>
                        <span className="metric-value">{stability}%</span>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default VideoAnalyzer
