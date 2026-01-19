/**
 * AI Interview Feedback MVP - Question List Component
 * 
 * Displays available interview questions and handles selection.
 * Fetches questions from the API on mount.
 * 
 * Author: Member 3 (Frontend)
 */

import React, { useEffect, useState } from 'react'
import { getQuestions, Question } from '../api/apiClient'
import { LoadingSpinner } from './ui/LoadingSpinner'

interface QuestionListProps {
    questions: Question[]
    setQuestions: (questions: Question[]) => void
    onQuestionSelect: (question: Question) => void
}

const QuestionList: React.FC<QuestionListProps> = ({
    questions,
    setQuestions,
    onQuestionSelect
}) => {
    const [loading, setLoading] = useState<boolean>(false)
    const [error, setError] = useState<string>('')
    const [selectedCategory, setSelectedCategory] = useState<string>('All')

    // Fetch questions on component mount
    useEffect(() => {
        if (questions.length === 0) {
            fetchQuestions()
        }
    }, [])

    const fetchQuestions = async () => {
        setLoading(true)
        setError('')

        try {
            const response = await getQuestions()
            setQuestions(response.questions)
        } catch (err) {
            setError('Failed to load questions. Please try again.')
            console.error('Error fetching questions:', err)
        } finally {
            setLoading(false)
        }
    }

    // Get unique categories
    const categories = ['All', ...new Set(questions.map(q => q.category))]

    // Filter questions by category
    const filteredQuestions = selectedCategory === 'All'
        ? questions
        : questions.filter(q => q.category === selectedCategory)

    // Category colors
    const getCategoryColor = (category: string): string => {
        const colors: { [key: string]: string } = {
            'Introduction': 'var(--color-blue)',
            'Self-Assessment': 'var(--color-purple)',
            'Behavioral': 'var(--color-green)',
            'Career Goals': 'var(--color-orange)',
            'Motivation': 'var(--color-pink)',
            'Leadership': 'var(--color-cyan)',
            'Candidate Questions': 'var(--color-yellow)',
            'General': 'var(--color-gray)'
        }
        return colors[category] || 'var(--color-primary)'
    }

    if (loading) {
        return (
            <div className="question-list-container">
                <div className="flex flex-col items-center justify-center py-12">
                    <LoadingSpinner size="lg" className="text-primary-500 mb-4" />
                    <p className="text-stone-600 dark:text-surface-300 font-medium">Loading questions...</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="question-list-container">
                <div className="error-state">
                    <span className="error-icon"></span>
                    <p>{error}</p>
                    <button className="btn btn-primary" onClick={fetchQuestions}>
                        Try Again
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="question-list-container">
            <div className="card">
                <h2 className="card-title">
                    <span className="icon"></span>
                    Choose a Question to Practice
                </h2>

                <p className="card-description">
                    Select an interview question and record your answer to get personalized feedback.
                </p>

                {/* Category Filter */}
                <div className="category-filter">
                    {categories.map(category => (
                        <button
                            key={category}
                            className={`category-btn ${selectedCategory === category ? 'active' : ''}`}
                            onClick={() => setSelectedCategory(category)}
                            style={{
                                '--category-color': getCategoryColor(category)
                            } as React.CSSProperties}
                        >
                            {category}
                        </button>
                    ))}
                </div>

                {/* Questions List */}
                <div className="questions-grid">
                    {filteredQuestions.map((question) => (
                        <div
                            key={question.id}
                            className="question-item"
                            onClick={() => onQuestionSelect(question)}
                        >
                            <div className="question-header">
                                <span
                                    className="question-category-tag"
                                    style={{ backgroundColor: getCategoryColor(question.category) }}
                                >
                                    {question.category}
                                </span>
                                <span className="question-id">#{question.id}</span>
                            </div>
                            <h3 className="question-text">{question.question}</h3>
                            <div className="question-footer">
                                <span className="practice-hint">Click to practice →</span>
                            </div>
                        </div>
                    ))}
                </div>

                {filteredQuestions.length === 0 && (
                    <div className="empty-state">
                        <p>No questions found in this category.</p>
                    </div>
                )}
            </div>
        </div>
    )
}

export default QuestionList
