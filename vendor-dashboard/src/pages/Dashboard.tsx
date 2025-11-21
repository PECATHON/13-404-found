import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebaseConfig';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, collection, query, where, onSnapshot } from 'firebase/firestore';


interface OrderItem {
  itemId: string;
  name: string;
  price: number;
  quantity: number;
}


interface Order {
  id: string;
  orderNumber: number;
  status: string;
  studentId: string;
  vendorId: string;
  vendorName: string;
  items: OrderItem[];
  totalAmount: number;
  createdAt: any;
  updatedAt: any;
}


export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isActive, setIsActive] = useState(true);
  const [statusLoading, setStatusLoading] = useState(true);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [ownerName, setOwnerName] = useState<string | null>(null);
  
  const [receivedOrders, setReceivedOrders] = useState<Order[]>([]);
  const [preparingOrders, setPreparingOrders] = useState<Order[]>([]);
  const [readyOrders, setReadyOrders] = useState<Order[]>([]);
  const [historyOrders, setHistoryOrders] = useState<Order[]>([]);


  useEffect(() => {
    if (user) {
      fetchVendorStatus();
      // Subscribe to real-time order updates
      const unsubscribe = subscribeToOrders();
      return () => unsubscribe();
    } else {
      setStatusLoading(false);
    }
  }, [user]);


  const subscribeToOrders = () => {
    if (!user) return () => {};


    const ordersRef = collection(db, 'orders');
    const q = query(ordersRef, where('vendorId', '==', user.uid));


    const unsubscribe = onSnapshot(q, (snapshot) => {
      const received: Order[] = [];
      const preparing: Order[] = [];
      const ready: Order[] = [];
      const history: Order[] = [];


      snapshot.forEach((doc) => {
        const order = { id: doc.id, ...doc.data() } as Order;
        if (order.status === 'Received') {
          received.push(order);
        } else if (order.status === 'Preparing') {
          preparing.push(order);
        } else if (order.status === 'Ready') {
          ready.push(order);
        } else if (order.status === 'Rejected' || order.status === 'Completed') {
          history.push(order);
        }
      });

      // Sort history by updatedAt (most recent first)
      history.sort((a, b) => {
        const timeA = a.updatedAt?.toMillis?.() || 0;
        const timeB = b.updatedAt?.toMillis?.() || 0;
        return timeB - timeA;
      });


      setReceivedOrders(received);
      setPreparingOrders(preparing);
      setReadyOrders(ready);
      setHistoryOrders(history);
    });


    return unsubscribe;
  };


  const fetchVendorStatus = async () => {
    if (!user) return;
    try {
      setStatusLoading(true);
      const vendorRef = doc(db, 'vendors', user.uid);
      const vendorDoc = await getDoc(vendorRef);
      if (vendorDoc.exists()) {
        const data = vendorDoc.data() as {
          isActive?: boolean;
          imageUrl?: string;
          ownerName?: string;
        };
        setIsActive(data.isActive ?? true);
        if (data.imageUrl) {
          setImageUrl(data.imageUrl);
        }
        if (data.ownerName) {
          setOwnerName(data.ownerName);
        }
      }
    } catch (err) {
      console.error('Error fetching vendor status:', err);
    } finally {
      setStatusLoading(false);
    }
  };


  const toggleVendorStatus = async () => {
    if (!user) return;
    try {
      setStatusLoading(true);
      const vendorRef = doc(db, 'vendors', user.uid);
      const newStatus = !isActive;
      await updateDoc(vendorRef, { isActive: newStatus });
      setIsActive(newStatus);
    } catch (err) {
      console.error('Error updating vendor status:', err);
    } finally {
      setStatusLoading(false);
    }
  };


  const handleAcceptOrder = async (orderId: string) => {
    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, {
        status: 'Preparing',
        updatedAt: new Date()
      });
    } catch (err) {
      console.error('Error accepting order:', err);
    }
  };


  const handleRejectOrder = async (orderId: string) => {
    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, {
        status: 'Rejected',
        updatedAt: new Date()
      });
    } catch (err) {
      console.error('Error rejecting order:', err);
    }
  };


  const handleMarkReady = async (orderId: string) => {
    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, {
        status: 'Ready',
        updatedAt: new Date()
      });
    } catch (err) {
      console.error('Error marking order ready:', err);
    }
  };


  const handleLogout = async () => {
    await signOut(auth);
  };

  const readyOrdersListClassName =
    readyOrders.length > 1 ? 'orders-list orders-list--scroll' : 'orders-list';

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
        className="sidebar-nav-item sidebar-nav-item--active"
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
              <h1 className="dashboard-title">Kitchen Performance</h1>
              <p className="dashboard-subtitle">Real-time overview of your kitchen orders.</p>
            </div>
            <div className="header-actions">
              <div className="header-status">
                <span
                  className={
                    'header-status-dot ' +
                    (isActive ? 'header-status-dot--active' : 'header-status-dot--inactive')
                  }
                />
                <span className="header-status-label">
                  {isActive ? 'Kitchen Active' : 'Kitchen Inactive'}
                </span>
              </div>
              <button
                type="button"
                className={
                  'status-toggle-button ' +
                  (isActive
                    ? 'status-toggle-button--active'
                    : 'status-toggle-button--inactive')
                }
                onClick={toggleVendorStatus}
                disabled={statusLoading}
              >
                {isActive ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          </header>

          <main className="dashboard-main">
            {/* Received Orders */}
            <section className="dashboard-card orders-column-card">
              <h2 className="dashboard-card-title">
                New Orders ({receivedOrders.length})
              </h2>
              <div className="orders-column-list">
                {receivedOrders.length === 0 ? (
                  <p className="dashboard-card-text">No new orders</p>
                ) : (
                  <div className="orders-list">
                    {receivedOrders.map((order) => (
                      <div key={order.id} className="order-card">
                        <div className="order-card-header">
                          <strong>Order #{order.orderNumber}</strong>
                          <span className="order-total">₹{order.totalAmount}</span>
                        </div>
                        <div className="order-items">
                          {order.items.map((item, idx) => (
                            <p key={idx} className="order-item-line">
                              {item.name} x {item.quantity}
                            </p>
                          ))}
                        </div>
                        <div className="order-actions">
                          <button
                            type="button"
                            onClick={() => handleAcceptOrder(order.id)}
                            className="order-button order-button--accept"
                          >
                            Accept
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRejectOrder(order.id)}
                            className="order-button order-button--reject"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* Preparing Orders */}
            <section className="dashboard-card orders-column-card">
              <h2 className="dashboard-card-title">
                Preparing ({preparingOrders.length})
              </h2>
              <div className="orders-column-list">
                {preparingOrders.length === 0 ? (
                  <p className="dashboard-card-text">No orders being prepared</p>
                ) : (
                  <div className="orders-list">
                    {preparingOrders.map((order) => (
                      <div key={order.id} className="order-card">
                        <div className="order-card-header">
                          <strong>Order #{order.orderNumber}</strong>
                          <span className="order-total">₹{order.totalAmount}</span>
                        </div>
                        <div className="order-items">
                          {order.items.map((item, idx) => (
                            <p key={idx} className="order-item-line">
                              {item.name} x {item.quantity}
                            </p>
                          ))}
                        </div>
                        <div className="order-actions">
                          <button
                            type="button"
                            onClick={() => handleMarkReady(order.id)}
                            className="order-button order-button--ready"
                          >
                            Mark as Ready
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* Ready Orders */}
            <section className="dashboard-card orders-column-card">
              <h2 className="dashboard-card-title">
                Ready for Pickup ({readyOrders.length})
              </h2>
              <div className="orders-column-list">
                {readyOrders.length === 0 ? (
                  <p className="dashboard-card-text">No orders ready</p>
                ) : (
                  <div className={readyOrdersListClassName}>
                    {readyOrders.map((order) => (
                      <div key={order.id} className="order-card order-card--ready">
                        <div className="order-card-header">
                          <strong>Order #{order.orderNumber}</strong>
                          <span className="order-total">₹{order.totalAmount}</span>
                        </div>
                        <div className="order-items">
                          {order.items.map((item, idx) => (
                            <p key={idx} className="order-item-line">
                              {item.name} x {item.quantity}
                            </p>
                          ))}
                        </div>
                        <p className="order-ready-label">✓ Ready for pickup</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* Order History */}
            <section className="dashboard-card dashboard-card--fullwidth">
              <h2 className="dashboard-card-title">
                Order History ({historyOrders.length})
              </h2>
              {historyOrders.length === 0 ? (
                <p className="dashboard-card-text">No past orders</p>
              ) : (
                <div className="orders-list orders-list--scroll">
                  {historyOrders.map((order) => (
                    <div
                      key={order.id}
                      className={`order-card ${
                        order.status === 'Rejected'
                          ? 'order-card--rejected'
                          : 'order-card--completed'
                      }`}
                    >
                      <div className="order-card-header">
                        <strong>Order #{order.orderNumber}</strong>
                        <span
                          className={`order-status-badge ${
                            order.status === 'Rejected'
                              ? 'order-status-badge--rejected'
                              : 'order-status-badge--completed'
                          }`}
                        >
                          {order.status}
                        </span>
                      </div>
                      <div className="order-items">
                        {order.items.map((item, idx) => (
                          <p key={idx} className="order-item-line">
                            {item.name} x {item.quantity}
                          </p>
                        ))}
                      </div>
                      <p className="order-total">₹{order.totalAmount}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
