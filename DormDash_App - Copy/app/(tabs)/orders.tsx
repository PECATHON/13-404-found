import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, FlatList, Image, TouchableOpacity,
    ActivityIndicator, Alert
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import {
    collection, query, where, onSnapshot, doc, updateDoc,
    addDoc, runTransaction, serverTimestamp, getDoc
} from 'firebase/firestore';
import { db } from '../../config/firebaseConfig';
import { useAuth } from '../../context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';

type OrderStatus = 'Received' | 'Preparing' | 'Ready' | 'Completed' | 'Cancelled' | 'Rejected';

interface OrderItem {
    itemId: string;
    name: string;
    quantity: number;
    price: number;
}

interface Order {
    id: string;
    vendorId: string;
    vendorName: string;
    vendorImage?: string; // Can be missing in order doc
    items: OrderItem[];
    totalAmount: number;
    status: OrderStatus;
    createdAt: any;
    orderNumber: number;
    rating?: number;
}

export default function OrdersScreen() {
    const { user } = useAuth();
    const [activeOrders, setActiveOrders] = useState<Order[]>([]);
    const [pastOrders, setPastOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<'active' | 'past'>('active');

    // Cache to store fetched vendor images so we don't fetch same one 10 times
    const [vendorImages, setVendorImages] = useState<Record<string, string>>({});

    const formatDate = (timestamp: any) => {
        if (!timestamp) return '';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    };

    useEffect(() => {
        if (!user?.uid) return;

        const q = query(collection(db, 'orders'), where('studentId', '==', user.uid));

        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const active: Order[] = [];
            const past: Order[] = [];
            const missingVendorIds = new Set<string>();

            snapshot.forEach((doc) => {
                const data = doc.data();
                // If vendorImage missing in order, mark vendorId to fetch
                if (!data.vendorImage && data.vendorId) {
                    missingVendorIds.add(data.vendorId);
                }

                const order: Order = {
                    id: doc.id,
                    vendorId: data.vendorId || '',
                    vendorName: data.vendorName || 'Unknown Vendor',
                    vendorImage: data.vendorImage, // Might be undefined initially
                    items: data.items || [],
                    totalAmount: Number(data.totalAmount) || 0,
                    status: data.status || 'Received',
                    createdAt: data.createdAt,
                    orderNumber: Number(data.orderNumber) || 0,
                    rating: data.rating || 0
                };

                if (['Received', 'Preparing', 'Ready'].includes(order.status)) {
                    active.push(order);
                } else {
                    past.push(order);
                }
            });

            // Sort
            past.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
            active.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

            setActiveOrders(active);
            setPastOrders(past);
            setLoading(false);

            // Fetch Missing Vendor Images
            if (missingVendorIds.size > 0) {
                const newImages: Record<string, string> = {};
                await Promise.all(Array.from(missingVendorIds).map(async (vId) => {
                    if (vendorImages[vId]) return; // Already cached
                    try {
                        const vDoc = await getDoc(doc(db, 'vendors', vId));
                        if (vDoc.exists()) {
                            newImages[vId] = vDoc.data().imageUrl; // ✅ Fetch imageUrl from Vendors collection
                        }
                    } catch (e) {
                        console.error("Error fetching vendor image:", e);
                    }
                }));

                if (Object.keys(newImages).length > 0) {
                    setVendorImages(prev => ({ ...prev, ...newImages }));
                }
            }
        });
        return () => unsubscribe();
    }, [user]);

    const handlePickUp = async (orderId: string) => {
        try {
            await updateDoc(doc(db, 'orders', orderId), { status: 'Completed' });
            Alert.alert('Success', 'Order marked as picked up!');
        } catch (error) {
            Alert.alert('Error', 'Failed to update order status');
        }
    };

    const handleCancel = async (orderId: string) => {
        Alert.alert('Cancel Order', 'Are you sure?', [
            { text: 'No', style: 'cancel' },
            {
                text: 'Yes, Cancel', style: 'destructive',
                onPress: async () => await updateDoc(doc(db, 'orders', orderId), { status: 'Cancelled' })
            }
        ]);
    };

    const handleRating = async (orderId: string, vendorId: string, rating: number) => {
        if (!vendorId) return;
        try {
            await updateDoc(doc(db, 'orders', orderId), { rating });
            await addDoc(collection(db, 'reviews'), {
                orderId, vendorId, studentId: user?.uid, rating, createdAt: serverTimestamp(),
            });
            const vendorRef = doc(db, 'vendors', vendorId);
            await runTransaction(db, async (transaction) => {
                const vendorDoc = await transaction.get(vendorRef);
                if (!vendorDoc.exists()) return;
                const data = vendorDoc.data();
                const newTotal = (data.totalReviews || 0) + 1;
                const newRating = (((data.rating || 0) * (data.totalReviews || 0)) + rating) / newTotal;
                transaction.update(vendorRef, { rating: Number(newRating.toFixed(1)), totalReviews: newTotal });
            });
            Alert.alert('Thank You!', 'Your review has been submitted.');
        } catch (error) {
            console.error("Error submitting review:", error);
        }
    };

    // Helper to get correct image
    const getOrderImage = (order: Order) => {
        // Priority 1: Image saved in order
        if (order.vendorImage) return { uri: order.vendorImage };
        // Priority 2: Image fetched from vendor collection
        if (vendorImages[order.vendorId]) return { uri: vendorImages[order.vendorId] };
        // Priority 3: Placeholder
        return { uri: 'https://via.placeholder.com/100?text=Food' };
    };

    const renderOrderCard = ({ item }: { item: Order }) => {
        const isHistory = tab === 'past';
        const isCancelled = isHistory && (item.status === 'Cancelled' || item.status === 'Rejected');
        const dateString = formatDate(item.createdAt);
        const imageSource = getOrderImage(item); // ✅ Use Helper

        if (isHistory) {
            return (
                <View style={[styles.historyCard, isCancelled && styles.historyCardCancelled]}>
                    <View style={styles.historyHeader}>
                        <View style={styles.vendorRow}>
                            <Image source={imageSource} style={styles.historyVendorImg} />
                            <View>
                                <Text style={styles.historyVendorName}>{item.vendorName}</Text>
                                <Text style={styles.historyLocation}>Campus Outlet</Text>
                            </View>
                        </View>
                        <View style={[styles.statusChip, isCancelled ? styles.statusChipCancelled : styles.statusChipCompleted]}>
                            <Text style={[styles.statusChipText, isCancelled ? styles.statusTextCancelled : styles.statusTextCompleted]}>
                                {item.status}
                            </Text>
                            <Ionicons name={isCancelled ? "close-circle" : "checkmark-circle"} size={14} color={isCancelled ? "#FF4757" : "#25D366"} />
                        </View>
                    </View>

                    <View style={styles.historyItemsBox}>
                        {item.items.map((food, i) => (
                            <View key={i} style={styles.historyItemRow}>
                                <View style={styles.historyQtyBadge}>
                                    <Text style={styles.historyQtyText}>{food.quantity}x</Text>
                                </View>
                                <Text style={styles.historyItemName}>{food.name}</Text>
                            </View>
                        ))}
                    </View>
                    <View style={styles.divider} />
                    {!isCancelled && (
                        <View style={styles.ratingSection}>
                            <Text style={styles.ratingLabel}>Rate your food</Text>
                            <View style={styles.starsRow}>
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <TouchableOpacity key={star} onPress={() => handleRating(item.id, item.vendorId, star)}>
                                        <Ionicons name={item.rating && item.rating >= star ? "star" : "star-outline"} size={24} color={item.rating && item.rating >= star ? "#FFD700" : "#444"} />
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    )}
                    <TouchableOpacity style={[styles.reorderButton, isCancelled && styles.reorderButtonCancelled]}>
                        <Text style={[styles.reorderBtnText, isCancelled && styles.reorderBtnTextCancelled]}>REORDER</Text>
                        <Ionicons name="chevron-forward" size={16} color={isCancelled ? "#FF4757" : "#25D366"} />
                    </TouchableOpacity>
                    <Text style={styles.historyMetaText}>Ordered: {dateString} • Bill Total: ₹{item.totalAmount}</Text>
                </View>
            );
        }

        return (
            <View style={styles.card}>
                <View style={styles.headerRow}>
                    <View style={styles.vendorInfo}>
                        <Image source={imageSource} style={styles.vendorImage} />
                        <View>
                            <Text style={styles.vendorName}>{item.vendorName}</Text>
                            <View style={styles.activeOrderMeta}>
                                <Text style={styles.orderNumber}>#{item.orderNumber}</Text>
                                <Text style={styles.metaDot}>•</Text>
                                <Text style={styles.dateText}>{dateString}</Text>
                            </View>
                        </View>
                    </View>
                </View>
                <View style={styles.itemsContainer}>
                    {item.items.map((food, idx) => (
                        <View key={idx} style={styles.itemRow}>
                            <View style={styles.quantityBox}>
                                <Text style={styles.quantityText}>{food.quantity}x</Text>
                            </View>
                            <Text style={styles.itemName}>{food.name}</Text>
                        </View>
                    ))}
                </View>
                <View style={styles.footerRow}>
                    <View style={styles.statusBadge}>
                        <View style={styles.statusDot} />
                        <Text style={styles.statusText}>{item.status}</Text>
                    </View>
                    <View style={styles.rightFooter}>
                        <View style={styles.priceBlock}>
                            <Text style={styles.totalLabel}>Total Bill</Text>
                            <Text style={styles.totalAmount}>₹{item.totalAmount}</Text>
                        </View>
                        {item.status === 'Ready' && (
                            <TouchableOpacity style={styles.pickupButton} onPress={() => handlePickUp(item.id)}>
                                <Text style={styles.pickupButtonText}>Pick Up</Text>
                                <Ionicons name="arrow-forward" size={14} color="#000" />
                            </TouchableOpacity>
                        )}
                        {item.status === 'Received' && (
                            <TouchableOpacity style={styles.cancelButton} onPress={() => handleCancel(item.id)}>
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
                <View style={styles.progressContainer}>
                    {['Received', 'Preparing', 'Ready'].map((step, index) => {
                        const steps = ['Received', 'Preparing', 'Ready'];
                        const currentIndex = steps.indexOf(item.status);
                        const isReached = index <= currentIndex;
                        return (
                            <View key={step} style={styles.progressStep}>
                                <View style={[styles.stepBar, isReached && styles.stepBarActive]} />
                                <Text style={[styles.stepText, isReached && styles.stepTextActive]}>{step}</Text>
                            </View>
                        );
                    })}
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            <LinearGradient colors={['#0F1C15', '#050806']} style={StyleSheet.absoluteFill} />
            <View style={styles.header}><Text style={styles.title}>My Orders</Text></View>
            <View style={styles.tabsContainer}>
                <TouchableOpacity style={[styles.tabButton, tab === 'active' && styles.activeTab]} onPress={() => setTab('active')}>
                    <Text style={[styles.tabText, tab === 'active' && styles.activeTabText]}>Active</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.tabButton, tab === 'past' && styles.activeTab]} onPress={() => setTab('past')}>
                    <Text style={[styles.tabText, tab === 'past' && styles.activeTabText]}>History</Text>
                </TouchableOpacity>
            </View>
            {loading ? <ActivityIndicator size="large" color="#25D366" style={{ marginTop: 50 }} /> :
                <FlatList
                    data={tab === 'active' ? activeOrders : pastOrders}
                    keyExtractor={(item) => item.id}
                    renderItem={renderOrderCard}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Ionicons name="receipt-outline" size={64} color="#333" />
                            <Text style={styles.emptyText}>No {tab === 'active' ? 'active' : 'past'} orders</Text>
                        </View>
                    }
                />
            }
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#050806', paddingTop: 50 },
    header: { paddingHorizontal: 20, marginBottom: 20 },
    title: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
    tabsContainer: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 16 },
    tabButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: '#222' },
    activeTab: { borderBottomColor: '#25D366' },
    tabText: { color: '#666', fontSize: 15, fontWeight: '600' },
    activeTabText: { color: '#25D366' },
    listContent: { paddingHorizontal: 16, paddingBottom: 100 },
    historyCard: { backgroundColor: '#111', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#222' },
    historyCardCancelled: { borderColor: '#3A1111', backgroundColor: '#180F0F' },
    historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
    vendorRow: { flexDirection: 'row', alignItems: 'center' },
    historyVendorImg: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#222', marginRight: 12 },
    historyVendorName: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    historyLocation: { color: '#666', fontSize: 12 },
    statusChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    statusChipCompleted: {},
    statusChipCancelled: {},
    statusChipText: { fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5 },
    statusTextCompleted: { color: '#25D366' },
    statusTextCancelled: { color: '#FF4757' },
    historyItemsBox: { marginBottom: 16 },
    historyItemRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
    historyQtyBadge: { backgroundColor: '#222', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginRight: 10 },
    historyQtyText: { color: '#ccc', fontSize: 12, fontWeight: 'bold' },
    historyItemName: { color: '#eee', fontSize: 15, fontWeight: '500' },
    divider: { height: 1, backgroundColor: '#222', marginBottom: 12 },
    ratingSection: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    ratingLabel: { color: '#888', fontSize: 13 },
    starsRow: { flexDirection: 'row', gap: 6 },
    reorderButton: { backgroundColor: 'rgba(37, 211, 102, 0.1)', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 12, borderRadius: 10, marginBottom: 12, gap: 6 },
    reorderButtonCancelled: { backgroundColor: 'rgba(255, 71, 87, 0.1)' },
    reorderBtnText: { color: '#25D366', fontWeight: 'bold', fontSize: 14, letterSpacing: 1 },
    reorderBtnTextCancelled: { color: '#FF4757' },
    historyMetaText: { color: '#555', fontSize: 11, textAlign: 'center' },
    card: { backgroundColor: '#111', borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#1A2E22' },
    headerRow: { marginBottom: 12 },
    vendorInfo: { flexDirection: 'row', alignItems: 'center' },
    vendorImage: { width: 36, height: 36, borderRadius: 8, marginRight: 10, backgroundColor: '#222' },
    vendorName: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    activeOrderMeta: { flexDirection: 'row', alignItems: 'center' },
    orderNumber: { color: '#888', fontSize: 12 },
    metaDot: { color: '#444', marginHorizontal: 6, fontSize: 10 },
    dateText: { color: '#666', fontSize: 12 },
    itemsContainer: { backgroundColor: '#080808', borderRadius: 8, padding: 10, marginBottom: 12, borderLeftWidth: 2, borderLeftColor: '#25D366' },
    itemRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
    quantityBox: { backgroundColor: '#222', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginRight: 8 },
    quantityText: { color: '#25D366', fontSize: 12, fontWeight: 'bold' },
    itemName: { color: '#eee', fontSize: 14, fontWeight: '500' },
    footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#222', paddingTop: 10 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(37, 211, 102, 0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
    statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#25D366', marginRight: 6 },
    statusText: { color: '#25D366', fontSize: 11, fontWeight: 'bold' },
    rightFooter: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    priceBlock: { alignItems: 'flex-end' },
    totalLabel: { fontSize: 10, color: '#666' },
    totalAmount: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
    pickupButton: { backgroundColor: '#25D366', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, gap: 4 },
    pickupButtonText: { color: '#000', fontSize: 12, fontWeight: 'bold' },
    cancelButton: { backgroundColor: 'rgba(255, 71, 87, 0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255, 71, 87, 0.3)' },
    cancelButtonText: { color: '#FF4757', fontSize: 12, fontWeight: 'bold' },
    progressContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#222' },
    progressStep: { flex: 1, marginHorizontal: 2 },
    stepBar: { height: 3, backgroundColor: '#222', borderRadius: 2, marginBottom: 4 },
    stepBarActive: { backgroundColor: '#25D366' },
    stepText: { color: '#444', fontSize: 9, textAlign: 'center', fontWeight: '600' },
    stepTextActive: { color: '#25D366' },
    emptyState: { alignItems: 'center', marginTop: 50 },
    emptyText: { color: '#666', marginTop: 10 }
});
