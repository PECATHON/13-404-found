import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useNavigate } from 'react-router-dom';

declare global {
  interface Window {
    cloudinary: any;
  }
}

export default function SettingsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [ownerName, setOwnerName] = useState<string | null>(null);
  const [restaurantName, setRestaurantName] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchVendorData();
    }
  }, [user]);

  const fetchVendorData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const vendorRef = doc(db, 'vendors', user.uid);
      const vendorDoc = await getDoc(vendorRef);
      if (vendorDoc.exists()) {
        const data = vendorDoc.data() as {
          restaurantName?: string;
          description?: string;
          imageUrl?: string;
          ownerName?: string;
        };
        setImageUrl(data.imageUrl || null);
        setRestaurantName(data.restaurantName || '');
        setOwnerName(data.ownerName || null);
      }
    } catch (err) {
      console.error('Error fetching vendor data:', err);
    } finally {
      setLoading(false);
    }
  };

  const openCloudinaryWidget = () => {
    if (!window.cloudinary) {
      alert('Cloudinary not loaded. Please refresh the page.');
      return;
    }

    setUploading(true);

    const widget = window.cloudinary.createUploadWidget(
      {
        cloudName: 'dmjkc24dq',
        uploadPreset: 'food_app_preset',
        sources: ['local', 'url', 'camera'],
        multiple: false,
        maxFiles: 1,
        cropping: true,
        croppingAspectRatio: 1,
        croppingShowDimensions: true,
        resourceType: 'image',
      },
      async (error: any, result: any) => {
        if (error) {
          console.error('Upload error:', error);
          setUploading(false);
          return;
        }

        if (result.event === 'success') {
          const uploadedUrl = result.info.secure_url;
          setImageUrl(uploadedUrl);

          // Save to Firestore
          if (user) {
            try {
              const vendorRef = doc(db, 'vendors', user.uid);
              await updateDoc(vendorRef, {
                imageUrl: uploadedUrl,
              });
              alert('Restaurant image updated successfully!');
            } catch (err) {
              console.error('Error updating image:', err);
              alert('Failed to save image. Please try again.');
            }
          }
          setUploading(false);
          widget.close();
        }
      }
    );

    widget.open();
  };

  const handleLogout = async () => {
    const { signOut } = await import('firebase/auth');
    const { auth } = await import('../firebaseConfig');
    await signOut(auth);
  };

  if (loading) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-layout">
          <aside className="dashboard-sidebar">
            <div>
              <div className="sidebar-brand">
                <div className="sidebar-logo-circle">
                  <span className="sidebar-logo-mark">DD</span>
                </div>
                <span>DormDash</span>
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
                  className="sidebar-nav-item sidebar-nav-item--active"
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
            <p className="dashboard-card-text">Loading settings...</p>
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
                {imageUrl ? (
                  <img src={imageUrl} alt="Restaurant" className="sidebar-logo-image" />
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
                className="sidebar-nav-item sidebar-nav-item--active"
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
              <h1 className="dashboard-title">Restaurant Settings</h1>
              <p className="dashboard-subtitle">Manage your restaurant profile and preferences.</p>
            </div>
          </header>

          <main className="dashboard-main">
            <section className="dashboard-card">
              <h2 className="dashboard-card-title">Restaurant Profile</h2>
              
              <div style={{ marginBottom: 20 }}>
                <label className="auth-label">Restaurant Name</label>
                <p className="dashboard-card-text">{restaurantName}</p>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label className="auth-label">Profile Image</label>
                {imageUrl ? (
                  <div style={{ marginTop: 10 }}>
                    <img
                      src={imageUrl}
                      alt="Restaurant"
                      style={{
                        width: 200,
                        height: 200,
                        objectFit: 'cover',
                        borderRadius: 12,
                        border: '2px solid #ddd',
                      }}
                    />
                  </div>
                ) : (
                  <p className="dashboard-card-text" style={{ marginTop: 10 }}>
                    No image uploaded yet
                  </p>
                )}
              </div>

              <button
                type="button"
                className="auth-button"
                onClick={openCloudinaryWidget}
                disabled={uploading}
                style={{ maxWidth: 300 }}
              >
                {uploading ? 'Uploading...' : imageUrl ? 'Change Image' : 'Upload Image'}
              </button>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
export{}
