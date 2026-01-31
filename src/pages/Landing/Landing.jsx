import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import './Landing.css'

function Landing() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle') // idle, loading, success, error
  const [errorMessage, setErrorMessage] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email) return

    setStatus('loading')
    setErrorMessage('')

    const { error } = await supabase
      .from('waitlist')
      .insert([{ email }])

    if (error) {
      if (error.code === '23505') {
        setErrorMessage('This email is already on the waitlist.')
      } else {
        setErrorMessage('Something went wrong. Please try again.')
      }
      setStatus('error')
    } else {
      setStatus('success')
      setEmail('')
    }
  }

  return (
    <div className="landing">
      <header className="landing-header">
        <div className="landing-logo">Botso</div>
        <Link to="/login" className="landing-auth-btn">Sign in</Link>
      </header>

      <main className="landing-main">
        <div className="landing-content">
          <h1 className="landing-title">Your thoughts, organized by time.</h1>
          <p className="landing-subtitle">
            A minimalist journal that helps you capture ideas, track habits, and reflect on your days.
            Simple, private, and designed to get out of your way.
          </p>

          <div className="landing-screenshot">
            <img
              src="/screenshot.png"
              alt="Botso app interface showing calendar and journal entries"
            />
          </div>

          <div className="landing-features">
            <div className="landing-feature">
              <span className="feature-icon">+</span>
              <span>Daily entries with markdown support</span>
            </div>
            <div className="landing-feature">
              <span className="feature-icon">+</span>
              <span>Visual activity tracking</span>
            </div>
            <div className="landing-feature">
              <span className="feature-icon">+</span>
              <span>Tags and search</span>
            </div>
          </div>

          <div className="landing-waitlist">
            <h2>Join the waitlist</h2>
            <p>Be the first to know when we launch publicly.</p>

            {status === 'success' ? (
              <div className="waitlist-success">
                You're on the list. We'll be in touch.
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="waitlist-form">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  disabled={status === 'loading'}
                />
                <button type="submit" disabled={status === 'loading'}>
                  {status === 'loading' ? 'Joining...' : 'Join waitlist'}
                </button>
              </form>
            )}

            {status === 'error' && (
              <div className="waitlist-error">{errorMessage}</div>
            )}
          </div>
        </div>
      </main>

      <footer className="landing-footer">
        <p>Built for those who value simplicity.</p>
      </footer>
    </div>
  )
}

export default Landing
