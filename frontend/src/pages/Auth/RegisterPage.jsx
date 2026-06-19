import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register } from '../../api/auth';

export default function RegisterPage() {
  const [form, setForm] = useState({ full_name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  function isValidEmail(email) {
    return email.includes('@');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!isValidEmail(form.email)) {
      setError('Invalid email');
      return;
    }

    setLoading(true);
    try {
      await register(form);
      setSuccess('Registration successful. Wait for admin approval before logging in.');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container">
      <div className="auth-card">
        <h1 className="page-title">Register</h1>
        {error && <div className="error">{error}</div>}
        {success && <div className="loading" style={{ color: 'green' }}>{success}</div>}
        <form className="form" onSubmit={handleSubmit}>
          <label>Full Name</label>
          <input
            type="text"
            required
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
          />
          <label>Email</label>
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <label>Password</label>
          <input
            type="password"
            required
            minLength={6}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>
        <p className="auth-switch">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
}
