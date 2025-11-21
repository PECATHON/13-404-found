import React, { useEffect, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  getDoc,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';

import { db } from '../firebaseConfig';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

declare global {
  interface Window {
    cloudinary: any;
  }
}

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  isVeg: boolean;
  isAvailable: boolean;
  prepTime: number;
  imageUrl?: string;
}

export default function MenuPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [vendorImageUrl, setVendorImageUrl] = useState<string | null>(null);
  const [isClosingModal, setIsClosingModal] = useState(false);
  const [ownerName, setOwnerName] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('Main Course');
  const [isVeg, setIsVeg] = useState(true);
  const [prepTime, setPrepTime] = useState('15');
  const [imageUrl, setImageUrl] = useState('');
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchMenuItems();
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

  const fetchMenuItems = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const menuRef = collection(db, 'vendors', user.uid, 'menuItems');
      const snapshot = await getDocs(menuRef);
      const items: MenuItem[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<MenuItem, 'id'>),
      }));
      setMenuItems(items);
    } catch (err) {
      console.error('Error fetching menu:', err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setPrice('');
    setCategory('Main Course');
    setIsVeg(true);
    setPrepTime('15');
    setImageUrl('');
    setEditingItemId(null);
    setError('');
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
      (error: any, result: any) => {
        if (error) {
          console.error('Upload error:', error);
          setUploading(false);
          return;
        }

        if (result.event === 'success') {
          const uploadedUrl = result.info.secure_url;
          setImageUrl(uploadedUrl);
          setUploading(false);
          widget.close();
        }
      }
    );

    widget.open();
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name || !price) {
      setError('Name and price are required');
      return;
    }
    if (!user) return;

    try {
      const menuRef = collection(db, 'vendors', user.uid, 'menuItems');
      await addDoc(menuRef, {
        name,
        description,
        price: parseFloat(price),
        category,
        isVeg,
        isAvailable: true,
        prepTime: parseInt(prepTime, 10),
        imageUrl: imageUrl || '',
        createdAt: serverTimestamp(),
      });

      resetForm();
      setShowAddForm(false);
      fetchMenuItems();
    } catch (err: any) {
      setError(err.message || 'Failed to add item');
    }
  };

  const handleEditItem = (item: MenuItem) => {
    setName(item.name);
    setDescription(item.description);
    setPrice(item.price.toString());
    setCategory(item.category);
    setIsVeg(item.isVeg);
    setPrepTime(item.prepTime.toString());
    setImageUrl(item.imageUrl || '');
    setEditingItemId(item.id);
    setShowAddForm(true);
  };

  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name || !price) {
      setError('Name and price are required');
      return;
    }
    if (!user || !editingItemId) return;

    try {
      const itemRef = doc(db, 'vendors', user.uid, 'menuItems', editingItemId);
      await updateDoc(itemRef, {
        name,
        description,
        price: parseFloat(price),
        category,
        isVeg,
        prepTime: parseInt(prepTime, 10),
        imageUrl: imageUrl || '',
        updatedAt: serverTimestamp(),
      });

      resetForm();
      setShowAddForm(false);
      fetchMenuItems();
    } catch (err: any) {
      setError(err.message || 'Failed to update item');
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!user) return;
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    try {
      await deleteDoc(doc(db, 'vendors', user.uid, 'menuItems', itemId));
      fetchMenuItems();
    } catch (err) {
      console.error('Error deleting item:', err);
    }
  };

  const handleCancelEdit = () => {
    setIsClosingModal(true);
    setTimeout(() => {
      resetForm();
      setShowAddForm(false);
      setIsClosingModal(false);
    }, 180);
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
                  className="sidebar-nav-item sidebar-nav-item--active"
                  onClick={() => navigate('/menu')}
                >
                  Menu
                </button>
                <button
                  type="button"
                  className="sidebar-nav-item"
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
            <p className="dashboard-card-text">Loading menu...</p>
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
                className="sidebar-nav-item sidebar-nav-item--active"
                onClick={() => navigate('/menu')}
              >
                Menu
              </button>
              <button
                type="button"
                className="sidebar-nav-item"
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
              <h1 className="dashboard-title">Menu Management</h1>
              <p className="dashboard-subtitle">
                Add dishes and manage what students can order from your kitchen.
              </p>
            </div>
            <button
              type="button"
              className="outline-button"
              onClick={() => {
                if (showAddForm) {
                  handleCancelEdit();
                } else {
                  setIsClosingModal(false);
                  setShowAddForm(true);
                }
              }}
            >
              {showAddForm ? 'Cancel' : 'Add New Item'}
            </button>
          </header>

          <main className="dashboard-main">

            <section className="dashboard-card menu-list-card">
              <div className="menu-list-header">
                <h2 className="dashboard-card-title">Your Menu</h2>
                <span className="menu-count">{menuItems.length} items</span>
              </div>

              {menuItems.length === 0 ? (
                <p className="dashboard-card-text">
                  No menu items yet. Add your first item.
                </p>
              ) : (
                <div className="menu-list">
                  {menuItems.map((item) => (
                    <div key={item.id} className="menu-item-row">
                      {item.imageUrl && (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          style={{
                            width: 80,
                            height: 80,
                            objectFit: 'cover',
                            borderRadius: 8,
                            marginBottom: 10,
                          }}
                        />
                      )}
                      <div className="menu-item-header">
                        <span className="menu-item-name">{item.name}</span>
                        <span
                          className={
                            item.isVeg
                              ? 'menu-badge'
                              : 'menu-badge menu-badge--nonveg'
                          }
                        >
                          {item.isVeg ? 'Veg' : 'Non-Veg'}
                        </span>
                      </div>
                      {item.description && (
                        <p className="menu-item-description">{item.description}</p>
                      )}
                      <p className="menu-item-meta">
                        ₹{item.price} • {item.category} • {item.prepTime} min
                      </p>
                      <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                        <button
                          type="button"
                          className="menu-edit-button"
                          onClick={() => handleEditItem(item)}
                          style={{ padding: '6px 12px', cursor: 'pointer' }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="menu-delete-button"
                          onClick={() => handleDeleteItem(item.id)}
                          style={{ padding: '6px 12px', cursor: 'pointer' }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </main>

          {(showAddForm || isClosingModal) && (
            <div className="modal-overlay" onClick={handleCancelEdit}>
              <div
                className={
                  isClosingModal
                    ? 'modal-content modal-content--closing'
                    : 'modal-content'
                }
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  className="modal-close"
                  onClick={handleCancelEdit}
                >
                  ×
                </button>

                <form
                  className="menu-form"
                  onSubmit={editingItemId ? handleUpdateItem : handleAddItem}
                >
                  <h3 className="dashboard-card-title">
                    {editingItemId ? 'Edit Menu Item' : 'Add New Menu Item'}
                  </h3>

                  <div className="menu-field-group">
                    <label className="auth-label">Item Image</label>
                    {imageUrl ? (
                      <div style={{ marginTop: 10, marginBottom: 10 }}>
                        <img
                          src={imageUrl}
                          alt="Food preview"
                          style={{
                            width: 150,
                            height: 150,
                            objectFit: 'cover',
                            borderRadius: 12,
                            border: '2px solid #ddd',
                          }}
                        />
                      </div>
                    ) : (
                      <p
                        className="dashboard-card-text"
                        style={{ marginTop: 10, marginBottom: 10 }}
                      >
                        No image uploaded
                      </p>
                    )}
                    <button
                      type="button"
                      className="outline-button"
                      onClick={openCloudinaryWidget}
                      disabled={uploading}
                      style={{ marginBottom: 15 }}
                    >
                      {uploading
                        ? 'Uploading...'
                        : imageUrl
                        ? 'Change Image'
                        : 'Upload Image'}
                    </button>
                  </div>

                  <div className="menu-field-group">
                    <label className="auth-label" htmlFor="itemName">
                      Item Name *
                    </label>
                    <input
                      id="itemName"
                      className="auth-input"
                      type="text"
                      placeholder="e.g., Paneer Butter Masala"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>

                  <div className="menu-field-group">
                    <label className="auth-label" htmlFor="description">
                      Description
                    </label>
                    <textarea
                      id="description"
                      className="auth-input menu-textarea"
                      placeholder="Brief description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>

                  <div className="menu-inline-fields">
                    <div className="menu-field-group">
                      <label className="auth-label" htmlFor="price">
                        Price (₹) *
                      </label>
                      <input
                        id="price"
                        className="auth-input"
                        type="number"
                        step="0.01"
                        placeholder="120"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                      />
                    </div>

                    <div className="menu-field-group">
                      <label className="auth-label" htmlFor="prepTime">
                        Prep Time (minutes)
                      </label>
                      <input
                        id="prepTime"
                        className="auth-input"
                        type="number"
                        value={prepTime}
                        onChange={(e) => setPrepTime(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="menu-inline-fields">
                    <div className="menu-field-group">
                      <label className="auth-label" htmlFor="category">
                        Category
                      </label>
                      <select
                        id="category"
                        className="auth-input"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                      >
                        <option>Breakfast</option>
                        <option>Main Course</option>
                        <option>Snacks</option>
                        <option>Beverages</option>
                        <option>Desserts</option>
                      </select>
                    </div>

                    <div className="menu-field-group menu-checkbox-row">
                      <label className="auth-label">Type</label>
                      <label className="menu-checkbox-label">
                        <input
                          type="checkbox"
                          checked={isVeg}
                          onChange={(e) => setIsVeg(e.target.checked)}
                        />
                        <span>{isVeg ? 'Vegetarian' : 'Non-vegetarian'}</span>
                      </label>
                    </div>
                  </div>

                  {error && <p className="auth-error">{error}</p>}

                  <button type="submit" className="auth-button">
                    {editingItemId ? 'Update Item' : 'Add Item'}
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}