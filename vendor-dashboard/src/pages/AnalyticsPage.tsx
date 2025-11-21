import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useNavigate } from 'react-router-dom';

interface OrderReview {
  id: string;
  orderNumber: number;
  rating?: number;
  review?: string;
  studentId: string;
  studentName?: string;
  totalAmount: number;
  createdAt: any;
  items: Array<{
    name: string;
    quantity: number;
  }>;
}

export default function AnalyticsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [reviews, setReviews] = useState<OrderReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [vendorImageUrl, setVendorImageUrl] = useState<string | null>(null);
  const [totalRevenueToday, setTotalRevenueToday] = useState(0);
  const [ownerName, setOwnerName] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchReviews();
    }
  }, [user]);

  // Fetch vendor profile image for sidebar logo
  useEffect(() => {
    const fetchVendorImage = async () => {
      if (!user) return;
      try {
        const vendorRef = doc(db, 'vendors', user.uid);
        const vendorDoc = await getDoc(vendorRef);
        if (vendorDoc.exists()) {
          const data = vendorDoc.data() as { imageUrl?: string; ownerName?: string };
          if (data.imageUrl) {
            setVendorImageUrl(data.imageUrl);
          }
          if (data.ownerName) {
            setOwnerName(data.ownerName);
          }
        }
      } catch (err) {
        console.error('Error fetching vendor image:', err);
      }
    };

    fetchVendorImage();
  }, [user]);

  const fetchReviews = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const ordersRef = collection(db, 'orders');
      const q = query(
        ordersRef,
        where('vendorId', '==', user.uid),
        where('status', '==', 'Completed')
      );

      const snapshot = await getDocs(q);
      const reviewData: OrderReview[] = [];
      let totalRating = 0;
      let ratingCount = 0;

      // Calculate revenue for current day (based on createdAt timestamp)
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayStartMs = todayStart.getTime();
      let revenueToday = 0;

      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.rating !== undefined && data.rating !== null) {
          reviewData.push({
            id: doc.id,
            orderNumber: data.orderNumber,
            rating: data.rating,
            review: data.review || '',
            studentId: data.studentId,
            studentName: data.studentName || data.customerName || '',
            totalAmount: data.totalAmount,
            createdAt: data.createdAt,
            items: data.items || [],
          });
          totalRating += data.rating;
          ratingCount++;
        }

        const createdAtMs = data.createdAt?.toMillis?.() || 0;
        if (createdAtMs >= todayStartMs) {
          revenueToday += data.totalAmount || 0;
        }
      });

      // Sort by most recent
      reviewData.sort((a, b) => {
        const timeA = a.createdAt?.toMillis?.() || 0;
        const timeB = b.createdAt?.toMillis?.() || 0;
        return timeB - timeA;
      });

      setReviews(reviewData);
      setTotalReviews(ratingCount);
      setAverageRating(ratingCount > 0 ? totalRating / ratingCount : 0);
      setTotalRevenueToday(revenueToday);
    } catch (err) {
      console.error('Error fetching reviews:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    const { signOut } = await import('firebase/auth');
    const { auth } = await import('../firebaseConfig');
    await signOut(auth);
  };

  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span
          key={i}
          style={{
            color: i <= rating ? '#FFD700' : '#ddd',
            fontSize: 20,
            marginRight: 4,
          }}
        >
          ★
        </span>
      );
    }
    return stars;
  };

  if (loading) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-layout">
          <aside className="dashboard-sidebar">
            <div>
              <div className="sidebar-brand">
                <div className="sidebar-logo-circle">
                  {vendorImageUrl ? (
                    <img
                      src={vendorImageUrl}
                      alt="Restaurant"
                      className="sidebar-logo-image"
                    />
                  ) : (
                    <span className="sidebar-logo-mark">DD</span>
                  )}
                </div>
                <span>{ownerName || 'DormDash'}</span>
              </div>
              <nav className="sidebar-nav">
                <button
                  type="button"
                  className="sidebar-nav-item"
                  onClick={() => navigate('/dashboard')}
                >
                  Dashboard
                </button>
                <button
                  type="button"
                  className="sidebar-nav-item"
                  onClick={() => navigate('/menu')}
                >
                  Menu
                </button>
                <button
                  type="button"
                  className="sidebar-nav-item sidebar-nav-item--active"
                  onClick={() => navigate('/analytics')}
                >
                  Analytics
                </button>
                <button
                  type="button"
                  className="sidebar-nav-item"
                  onClick={() => navigate('/settings')}
                >
                  Settings
                </button>
              </nav>
            </div>
            <div className="sidebar-footer">
              <button
                type="button"
                className="sidebar-logout-button"
                onClick={handleLogout}
              >
                Log out
              </button>
            </div>
          </aside>

          <div className="dashboard-shell">
            <p className="dashboard-card-text">Loading analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-layout">    
        <aside className="dashboard-sidebar">
          <div>
            <div className="sidebar-brand">
              <div className="sidebar-logo-circle">
                {vendorImageUrl ? (
                  <img
                    src={vendorImageUrl}
                    alt="Restaurant"
                    className="sidebar-logo-image"
                  />
                ) : (
                  <span className="sidebar-logo-mark">DD</span>
                )}
              </div>
              <span>{ownerName || 'DormDash'}</span>
            </div>
            <nav className="sidebar-nav">
              <button
                type="button"
                className="sidebar-nav-item"
                onClick={() => navigate('/dashboard')}
              >
                Dashboard
              </button>
              <button
                type="button"
                className="sidebar-nav-item"
                onClick={() => navigate('/menu')}
              >
                Menu
              </button>
              <button
                type="button"
                className="sidebar-nav-item sidebar-nav-item--active"
                onClick={() => navigate('/analytics')}
              >
                Analytics
              </button>
              <button
                type="button"
                className="sidebar-nav-item"
                onClick={() => navigate('/settings')}
              >
                Settings
              </button>
            </nav>
          </div>
          <div className="sidebar-footer">
            <button
              type="button"
              className="sidebar-logout-button"
              onClick={handleLogout}
            >
              Log out
            </button>
          </div>
        </aside>

        <div className="dashboard-shell">
          <header className="dashboard-header">
            <div>
              <h1 className="dashboard-title">Analytics & Reviews</h1>
              <p className="dashboard-subtitle">
                Customer feedback and ratings for your restaurant.
              </p>
            </div>
          </header>

          <main className="dashboard-main">
            {/* Rating Overview */}
            <section className="dashboard-card">
              <h2 className="dashboard-card-title">Rating Overview</h2>
              <div style={{ display: 'flex', gap: 40, marginTop: 20 }}>
                <div>
                  <p className="dashboard-card-text">Average Rating</p>
                  <div style={{ display: 'flex', alignItems: 'center', marginTop: 8 }}>
                    <span style={{ fontSize: 36, fontWeight: 'bold', marginRight: 10 }}>
                      {averageRating.toFixed(1)}
                    </span>
                    <div>{renderStars(Math.round(averageRating))}</div>
                  </div>
                </div>
                <div>
                  <p className="dashboard-card-text">Total Reviews</p>
                  <p style={{ fontSize: 36, fontWeight: 'bold', marginTop: 8 }}>
                    {totalReviews}
                  </p>
                </div>
               
              </div>
            </section>

            {/* Customer Reviews */}
            <section className="dashboard-card">
              <h2 className="dashboard-card-title">Customer Reviews</h2>
              {reviews.length === 0 ? (
                <p className="dashboard-card-text" style={{ marginTop: 15 }}>
                  No reviews yet. Complete orders will show customer ratings here.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginTop: 20 }}>
                  {reviews.map((review) => (
                    <div
                      key={review.id}
                      style={{
                        border: '1px solid #ddd',
                        padding: 20,
                        borderRadius: 12,
                        background: '#111827;',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: 10,
                        }}
                      >
                        <div>
                          <strong style={{ color: '#666' }}>Order #{review.orderNumber}</strong>
                         
                          <div style={{ marginTop: 5 }}>
                            {renderStars(review.rating || 0)}
                          </div>
                        </div>
                        <span style={{ color: '#666' }}>₹{review.totalAmount}</span>
                      </div>

                      {review.review && (
                        <p
                          style={{
                            marginTop: 10,
                            padding: 12,
                            background: 'white',
                            borderRadius: 8,
                            fontStyle: 'italic',
                          }}
                        >
                          "{review.review}"
                        </p>
                      )}

                      <div style={{ marginTop: 10, fontSize: 14, color: '#666' }}>
                        <strong>Items ordered:</strong>
                        {review.items.map((item, idx) => (
                          <span key={idx}>
                            {' '}
                            {item.name} x{item.quantity}
                            {idx < review.items.length - 1 ? ',' : ''}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
            <section className="dashboard-card">
              <h2 className="dashboard-card-title">Total Earning of Today </h2>
              <p style={{ fontSize: 32, fontWeight: 'bold', marginTop: 8 }}>
                    ₹{totalRevenueToday.toFixed(2)}
                  </p>
             
                
              
            </section>
            
          </main>
        </div>
      </div>
    </div>
  );
}
