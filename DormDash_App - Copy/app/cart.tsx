import React, { useState } from 'react';
import {
    View, Text, StyleSheet, FlatList, Image, TouchableOpacity,
    Alert, ActivityIndicator
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext'; // ✅ Use Context

export default function CartScreen() {
    const router = useRouter();
    const { user } = useAuth();

    // ✅ Get State directly from Global Context
    const { cartItems, updateQuantity, removeFromCart, clearCart, getCartTotal } = useCart();
    const [loading, setLoading] = useState(false);

    // Derived Data from Context Items
    // Assuming all items are from same vendor for now
    const vendorName = cartItems.length > 0 ? cartItems[0].vendorName : '';
    const vendorId = cartItems.length > 0 ? cartItems[0].vendorId : '';

    const getSubtotal = () => getCartTotal();
    const getTaxes = () => Math.round(getSubtotal() * 0.05); // 5% tax
    const getTotal = () => getSubtotal() + getTaxes();

    const handlePlaceOrder = async () => {
        if (cartItems.length === 0) {
            Alert.alert('Empty Cart', 'Please add items to your cart.');
            return;
        }

        if (!user) {
            Alert.alert("Login Required", "Please login to place an order.");
            return;
        }

        setLoading(true);
        try {
            const orderData = {
                studentId: user.uid,
                vendorId: vendorId,
                vendorName: vendorName,
                items: cartItems.map(item => ({
                    itemId: item.id,
                    name: item.name,
                    quantity: item.quantity,
                    price: item.price
                })),
                totalAmount: getTotal(),
                status: 'Received',
                orderNumber: Math.floor(1000 + Math.random() * 9000), // 4-digit ID
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            };

            await addDoc(collection(db, 'orders'), orderData);

            // Clear Context & Redirect
            clearCart();
            Alert.alert(
                'Order Placed! 🎉',
                'Your order has been placed successfully.',
                [{ text: 'OK', onPress: () => router.replace('/(tabs)') }]
            );
        } catch (error) {
            console.error('Error placing order:', error);
            Alert.alert('Error', 'Failed to place order. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const renderCartItem = ({ item }: { item: any }) => (
        <View style={styles.cartItem}>
            <View style={styles.itemLeft}>
                {/* Fallback Image if not provided in context */}
                <Image
                    source={{ uri: item.imageUrl || 'https://via.placeholder.com/60' }}
                    style={styles.itemImage}
                />

                <View style={styles.itemInfo}>
                    <View style={styles.itemHeader}>
                        <View style={[
                            styles.vegDot,
                            { backgroundColor: item.isVeg !== false ? '#25D366' : '#FF4757' }
                        ]} />
                        <Text style={styles.itemName}>{item.name}</Text>
                    </View>
                    <Text style={styles.itemPrice}>₹{item.price}</Text>
                </View>
            </View>

            <View style={styles.itemRight}>
                <View style={styles.quantityControl}>
                    <TouchableOpacity
                        onPress={() => updateQuantity(item.id, item.quantity - 1)}
                        style={styles.qtyBtn}
                    >
                        <Ionicons name="remove" size={16} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.qtyText}>{item.quantity}</Text>
                    <TouchableOpacity
                        onPress={() => updateQuantity(item.id, item.quantity + 1)}
                        style={styles.qtyBtn}
                    >
                        <Ionicons name="add" size={16} color="#fff" />
                    </TouchableOpacity>
                </View>
                <Text style={styles.itemTotal}>₹{item.price * item.quantity}</Text>
                <TouchableOpacity onPress={() => removeFromCart(item.id)}>
                    <Ionicons name="trash-outline" size={18} color="#FF4757" />
                </TouchableOpacity>
            </View>
        </View>
    );

    if (cartItems.length === 0) {
        return (
            <View style={styles.container}>
                <StatusBar style="light" />
                <LinearGradient colors={['#0F1C15', '#050806']} style={StyleSheet.absoluteFill} />

                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.title}>Cart</Text>
                    <View style={{ width: 40 }} />
                </View>

                <View style={styles.emptyCart}>
                    <Ionicons name="cart-outline" size={80} color="#333" />
                    <Text style={styles.emptyText}>Your cart is empty</Text>
                    <TouchableOpacity style={styles.browseButton} onPress={() => router.back()}>
                        <Text style={styles.browseText}>Browse Menu</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            <LinearGradient colors={['#0F1C15', '#050806']} style={StyleSheet.absoluteFill} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={styles.title}>Cart</Text>
                    <Text style={styles.vendorName}>{vendorName}</Text>
                </View>
                <View style={{ width: 40 }} />
            </View>

            {/* Cart Items */}
            <FlatList
                data={cartItems}
                keyExtractor={(item) => item.id}
                renderItem={renderCartItem}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
            />

            {/* Bill Summary */}
            <View style={styles.billContainer}>
                <Text style={styles.billTitle}>Bill Summary</Text>

                <View style={styles.billRow}>
                    <Text style={styles.billLabel}>Subtotal</Text>
                    <Text style={styles.billValue}>₹{getSubtotal()}</Text>
                </View>

                <View style={styles.billRow}>
                    <Text style={styles.billLabel}>Taxes (5%)</Text>
                    <Text style={styles.billValue}>₹{getTaxes()}</Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.billRow}>
                    <Text style={styles.totalLabel}>Total</Text>
                    <Text style={styles.totalValue}>₹{getTotal()}</Text>
                </View>

                <TouchableOpacity
                    style={[styles.checkoutButton, loading && styles.checkoutButtonDisabled]}
                    onPress={handlePlaceOrder}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#000" />
                    ) : (
                        <>
                            <Text style={styles.checkoutText}>Place Order</Text>
                            <Ionicons name="arrow-forward" size={20} color="#000" />
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#050806', paddingTop: 50 },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        marginBottom: 20
    },
    backButton: { padding: 8 },
    headerCenter: { alignItems: 'center' },
    title: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
    vendorName: { fontSize: 13, color: '#888', marginTop: 2 },

    listContent: { paddingHorizontal: 20, paddingBottom: 20 },

    cartItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: '#111',
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#222'
    },
    itemLeft: { flexDirection: 'row', flex: 1, alignItems:'center' },
    itemImage: { width: 50, height: 50, borderRadius: 8, marginRight: 12, backgroundColor: '#222' },
    itemInfo: { flex: 1, justifyContent: 'center' },
    itemHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
    vegDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
    itemName: { fontSize: 15, fontWeight: 'bold', color: '#fff' },
    itemPrice: { fontSize: 13, color: '#888' },

    itemRight: { alignItems: 'flex-end', justifyContent: 'space-between' },
    quantityControl: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#222', borderRadius: 8, paddingHorizontal: 4 },
    qtyBtn: { padding: 6 },
    qtyText: { color: '#fff', fontSize: 14, fontWeight: 'bold', paddingHorizontal: 10 },
    itemTotal: { fontSize: 16, fontWeight: 'bold', color: '#25D366', marginVertical: 4 },

    billContainer: {
        backgroundColor: '#111',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: '#222'
    },
    billTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 12 },
    billRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    billLabel: { fontSize: 14, color: '#aaa' },
    billValue: { fontSize: 14, color: '#fff' },
    divider: { height: 1, backgroundColor: '#333', marginVertical: 10 },
    totalLabel: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
    totalValue: { fontSize: 18, fontWeight: 'bold', color: '#25D366' },

    checkoutButton: {
        backgroundColor: '#25D366',
        height: 50,
        borderRadius: 12,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 16
    },
    checkoutButtonDisabled: { opacity: 0.6 },
    checkoutText: { color: '#000', fontSize: 16, fontWeight: 'bold', marginRight: 8 },

    emptyCart: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyText: { color: '#666', fontSize: 16, marginTop: 20, marginBottom: 30 },
    browseButton: { backgroundColor: '#25D366', paddingHorizontal: 30, paddingVertical: 12, borderRadius: 10 },
    browseText: { color: '#000', fontWeight: 'bold', fontSize: 14 }
});
