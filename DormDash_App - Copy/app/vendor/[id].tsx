import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, Image, TouchableOpacity, FlatList,
    ActivityIndicator, Dimensions, ScrollView
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebaseConfig';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useCart } from '../../context/CartContext';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

interface MenuItem {
    id: string;
    name: string;
    price: number;
    description: string;
    imageUrl?: string;
    isVeg?: boolean;
}

interface Vendor {
    id: string;
    restaurantName: string;
    imageUrl: string;
    rating: number;
    deliveryTime: string;
    location: string;
    category: string;
}

export default function VendorDetailsScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { addToCart, cartItems, updateQuantity } = useCart();

    const [vendor, setVendor] = useState<Vendor | null>(null);
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) fetchVendorData();
    }, [id]);

    const fetchVendorData = async () => {
        try {
            // Fetch Vendor Details
            const vendorDoc = await getDoc(doc(db, 'vendors', id as string));
            if (vendorDoc.exists()) {
                const data = vendorDoc.data();
                setVendor({
                    id: vendorDoc.id,
                    restaurantName: data.restaurantName || 'Unknown',
                    imageUrl: data.imageUrl || 'https://via.placeholder.com/300',
                    rating: data.rating || 4.0,
                    deliveryTime: '25-30 min',
                    location: data.location || 'Campus',
                    category: data.category || 'Food'
                });
            }

            // Fetch Menu
            const menuSnap = await getDocs(collection(db, 'vendors', id as string, 'menuItems'));
            const items: MenuItem[] = [];
            menuSnap.forEach((doc) => {
                items.push({ id: doc.id, ...doc.data() } as MenuItem);
            });
            setMenuItems(items);
        } catch (error) {
            console.error("Error:", error);
        } finally {
            setLoading(false);
        }
    };

    const getCartQuantity = (itemId: string) => {
        const item = cartItems.find(i => i.id === itemId);
        return item ? item.quantity : 0;
    };

    const renderMenuItem = ({ item }: { item: MenuItem }) => {
        const quantity = getCartQuantity(item.id);

        return (
            <View style={styles.menuItemCard}>
                {/* LEFT: Info */}
                <View style={styles.menuInfo}>
                    {/* Veg/Non-Veg Icon */}
                    <View style={styles.vegIconContainer}>
                        <MaterialCommunityIcons
                            name="square-rounded-outline"
                            size={16}
                            color={item.isVeg !== false ? "#25D366" : "#FF4757"}
                        />
                        <View style={[
                            styles.vegDot,
                            { backgroundColor: item.isVeg !== false ? "#25D366" : "#FF4757" }
                        ]} />
                    </View>

                    <Text style={styles.menuName}>{item.name}</Text>
                    <Text style={styles.menuPrice}>₹{item.price}</Text>
                    <Text style={styles.menuDesc} numberOfLines={2}>
                        {item.description || "A delicious choice for your meal."}
                    </Text>
                </View>

                {/* RIGHT: Image & Add Button */}
                <View style={styles.menuImageContainer}>
                    <Image
                        source={{ uri: item.imageUrl || 'https://via.placeholder.com/150' }}
                        style={styles.menuImage}
                    />

                    {/* Add Button / Counter */}
                    <View style={styles.addButtonContainer}>
                        {quantity === 0 ? (
                            <TouchableOpacity
                                style={styles.addButton}
                                onPress={() => addToCart({ ...item, vendorId: id as string, vendorName: vendor?.restaurantName || '' })}
                            >
                                <Text style={styles.addButtonText}>ADD</Text>
                                <Ionicons name="add" size={12} color="#25D366" style={{position:'absolute', top:2, right:2}} />
                            </TouchableOpacity>
                        ) : (
                            <View style={styles.qtyContainer}>
                                <TouchableOpacity onPress={() => updateQuantity(item.id, quantity - 1)} style={styles.qtyBtn}>
                                    <Ionicons name="remove" size={16} color="#25D366" />
                                </TouchableOpacity>
                                <Text style={styles.qtyText}>{quantity}</Text>
                                <TouchableOpacity onPress={() => updateQuantity(item.id, quantity + 1)} style={styles.qtyBtn}>
                                    <Ionicons name="add" size={16} color="#25D366" />
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>
            </View>
        );
    };

    if (loading) return (
        <View style={styles.center}>
            <ActivityIndicator size="large" color="#25D366" />
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar style="light" />

            {/* 1. COMPACT HEADER */}
            <View style={styles.headerContainer}>
                {/* Back Button Overlay */}
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>

                <Image source={{ uri: vendor?.imageUrl }} style={styles.headerImage} />
                <LinearGradient colors={['transparent', '#050806']} style={styles.gradientOverlay} />

                {/* Vendor Info Block */}
                <View style={styles.vendorInfoContainer}>
                    <Text style={styles.vendorName}>{vendor?.restaurantName}</Text>
                    <View style={styles.metaRow}>
                        <View style={styles.ratingBadge}>
                            <Ionicons name="star" size={12} color="#fff" />
                            <Text style={styles.ratingText}>{vendor?.rating}</Text>
                        </View>
                        <Text style={styles.metaText}> • {vendor?.deliveryTime} • {vendor?.category}</Text>
                    </View>
                    <Text style={styles.locationText}>{vendor?.location} • 1.2 km away</Text>

                    <View style={styles.divider} />
                    <Text style={styles.menuTitle}>RECOMMENDED</Text>
                </View>
            </View>

            {/* 2. MENU LIST */}
            <FlatList
                data={menuItems}
                keyExtractor={(item) => item.id}
                renderItem={renderMenuItem}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
            />

            {/* 3. FLOATING CART BUTTON (If items in cart) */}
            {cartItems.length > 0 && (
                <TouchableOpacity style={styles.viewCartBtn} onPress={() => router.push('/cart')}>
                    <View style={styles.cartInfo}>
                        <Text style={styles.cartCountText}>{cartItems.length} ITEM{cartItems.length > 1 ? 'S' : ''}</Text>
                        <Text style={styles.cartTotalText}>₹{cartItems.reduce((acc, i) => acc + i.price * i.quantity, 0)}</Text>
                    </View>
                    <View style={styles.viewCartRight}>
                        <Text style={styles.viewCartText}>View Cart</Text>
                        <Ionicons name="cart-outline" size={20} color="#fff" />
                    </View>
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#050806' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#050806' },

    // Header Styles
    headerContainer: { position: 'relative', marginBottom: 10 },
    headerImage: { width: '100%', height: 180, resizeMode: 'cover', opacity: 0.8 }, // Thinned height
    gradientOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 100 },

    backButton: {
        position: 'absolute', top: 45, left: 20, zIndex: 10,
        backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20, padding: 8
    },

    vendorInfoContainer: {
        paddingHorizontal: 20, marginTop: -40,
    },
    vendorName: { fontSize: 26, fontWeight: 'bold', color: '#fff', marginBottom: 6, textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 10 },
    metaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
    ratingBadge: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#0F3D24',
        paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
        borderWidth: 1, borderColor: '#1A5D35'
    },
    ratingText: { color: '#fff', fontWeight: 'bold', fontSize: 12, marginLeft: 4 },
    metaText: { color: '#ccc', fontSize: 13 },
    locationText: { color: '#888', fontSize: 12, marginBottom: 16 },

    divider: { height: 1, backgroundColor: '#222', marginVertical: 10 },
    menuTitle: { color: '#fff', fontSize: 14, fontWeight: 'bold', letterSpacing: 1, marginTop: 10 },

    // Menu Item Styles
    listContent: { paddingHorizontal: 16, paddingBottom: 100 },
    menuItemCard: {
        flexDirection: 'row', justifyContent: 'space-between',
        paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: '#1A1A1A'
    },
    menuInfo: { flex: 1, paddingRight: 16 },

    vegIconContainer: { position: 'relative', width: 16, height: 16, justifyContent:'center', alignItems:'center', marginBottom: 6 },
    vegDot: { width: 6, height: 6, borderRadius: 3, position: 'absolute' },

    menuName: { fontSize: 17, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
    menuPrice: { fontSize: 15, color: '#fff', marginBottom: 8, fontWeight: '600' },
    menuDesc: { fontSize: 13, color: '#888', lineHeight: 18 },

    menuImageContainer: { position: 'relative', width: 120, height: 110, alignItems: 'center' },
    menuImage: { width: 110, height: 110, borderRadius: 16, backgroundColor: '#222', borderWidth: 1, borderColor: '#222' },

    addButtonContainer: {
        position: 'absolute', bottom: -10,
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 5
    },
    addButton: {
        backgroundColor: '#fff', paddingVertical: 8, paddingHorizontal: 28,
        borderRadius: 8, borderWidth: 1, borderColor: '#ddd'
    },
    addButtonText: { color: '#25D366', fontWeight: '900', fontSize: 14 },

    qtyContainer: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
        borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6, gap: 10,
        borderWidth: 1, borderColor: '#25D366'
    },
    qtyBtn: { padding: 2 },
    qtyText: { fontSize: 14, fontWeight: 'bold', color: '#25D366' },

    // Cart Button
    viewCartBtn: {
        position: 'absolute', bottom: 30, left: 20, right: 20,
        backgroundColor: '#25D366', borderRadius: 12, padding: 16,
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        shadowColor: '#25D366', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 10
    },
    cartInfo: { flexDirection: 'column' },
    cartCountText: { color: '#000', fontSize: 10, fontWeight: 'bold' },
    cartTotalText: { color: '#000', fontSize: 16, fontWeight: 'bold' },
    viewCartRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    viewCartText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
