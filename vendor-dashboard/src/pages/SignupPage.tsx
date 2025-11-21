import React, { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../firebaseConfig';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useNavigate, Link } from 'react-router-dom';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [restaurantName, setRestaurantName] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password || !ownerName || !restaurantName) {
      setError('Please fill all required fields');
      return;
    }

    try {
      setLoading(true);
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const userId = cred.user.uid;

      // vendors collection (same as mobile design)
      await setDoc(doc(db, 'vendors', userId), {
        email,
        ownerName,
        phoneNumber: phone,
        restaurantName,
        description: '',
        imageUrl: '',
        rating: 0,
        totalReviews: 0,
        isActive: true,
        location,
        openingTime: '09:00 AM',
        closingTime: '10:00 PM',
        totalOrders: 0,
        createdAt: serverTimestamp(),
      });

      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo-circle">
          <span className="auth-logo-mark">DD</span>
        </div>
        <h1 className="auth-title">Create Vendor Account</h1>
        <p className="auth-subtitle">Join DormDash and start serving students on campus.</p>

        <form className="auth-form" onSubmit={handleSignup}>
          <div className="auth-input-group">
            <label className="auth-label" htmlFor="ownerName">
              Owner Name
            </label>
            <input
              id="ownerName"
              className="auth-input"
              placeholder="Your full name"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
            />
          </div>

          <div className="auth-input-group">
            <label className="auth-label" htmlFor="restaurantName">
              Restaurant Name
            </label>
            <input
              id="restaurantName"
              className="auth-input"
              placeholder="Your kitchen or brand"
              value={restaurantName}
              onChange={(e) => setRestaurantName(e.target.value)}
            />
          </div>

          <div className="auth-input-group">
            <label className="auth-label" htmlFor="phone">
              Contact Phone
            </label>
            <input
              id="phone"
              className="auth-input"
              placeholder="WhatsApp or phone number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div className="auth-input-group">
            <label className="auth-label" htmlFor="location">
              Location
            </label>
            <input
              id="location"
              className="auth-input"
              placeholder="Hostel, block, or area"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          <div className="auth-input-group">
            <label className="auth-label" htmlFor="email">
              Business Email
            </label>
            <input
              id="email"
              className="auth-input"
              type="email"
              placeholder="you@restaurant.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="auth-input-group">
            <label className="auth-label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              className="auth-input"
              type="password"
              placeholder="Minimum 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? 'Creating your account...' : 'Sign Up'}
          </button>
        </form>

        <div className="auth-footer">
          <span>Already have an account?</span>
          <Link className="auth-link" to="/login">
            Log In
          </Link>
        </div>
      </div>
    </div>
  );
}
