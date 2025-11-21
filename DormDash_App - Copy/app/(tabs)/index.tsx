import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, TextInput, FlatList, Image,
    TouchableOpacity, ScrollView, ActivityIndicator, Dimensions,
    RefreshControl
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebaseConfig';
import { useAuth } from '../../context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

interface Vendor {
    id: string;
    restaurantName: string;
    imageUrl: string;
    rating: number;
    totalReviews: number;
    description: string;
    location: string;
    category: string;
    deliveryTime?: string;
    distance?: string;
}

export default function HomeScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [filteredVendors, setFilteredVendors] = useState<Vendor[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('All');

    const categories = [
        { id: '1', name: 'All' },
        { id: '2', name: 'Breakfast' },
        { id: '3', name: 'Main Course' },
        { id: '4', name: 'Snacks' },
        { id: '5', name: 'Beverages' },
        { id: '6', name: 'Desserts' },
    ];

    useEffect(() => {
        fetchVendors();
    }, []);

    useEffect(() => {
        filterVendors();
    }, [search, selectedCategory, vendors]);

    const fetchVendors = async () => {
        try {
            const querySnapshot = await getDocs(collection(db, 'vendors'));
            const vendorList: Vendor[] = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                // ✅ Filter out inactive restaurants
                if (data.isActive !== false) {
                    vendorList.push({
                        id: doc.id,
                        restaurantName: data.restaurantName || 'Unknown',
                        imageUrl: data.imageUrl || 'https://via.placeholder.com/150',
                        rating: data.rating || 4.2,
                        totalReviews: data.totalReviews || 0,
                        description: data.description || 'Food',
                        location: data.location || 'Campus',
                        category: data.category || 'General',
                        deliveryTime: '20-30 mins',
                        distance: '1.2 km'
                    });
                }
            });
            setVendors(vendorList);
            setFilteredVendors(vendorList);
        } catch (error) {
            console.error("Error fetching vendors:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchVendors();
    }, []);

    const filterVendors = () => {
        let result = vendors;
        if (selectedCategory !== 'All') {
            result = result.filter(v =>
                v.category?.toLowerCase().includes(selectedCategory.toLowerCase()) ||
                v.description?.toLowerCase().includes(selectedCategory.toLowerCase())
            );
        }
        if (search) {
            result = result.filter(v =>
                v.restaurantName.toLowerCase().includes(search.toLowerCase()) ||
                v.description.toLowerCase().includes(search.toLowerCase())
            );
        }
        setFilteredVendors(result);
    };

    const renderVendorCard = ({ item }: { item: Vendor }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/vendor/${item.id}`)}
            activeOpacity={0.9}
        >
            <View style={styles.imageContainer}>
                <Image source={{ uri: item.imageUrl }} style={styles.cardImage} />
                <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.4)']}
                    style={styles.imageGradient}
                />
                {/* ❌ REMOVED 30% OFF OVERLAY HERE */}

                <TouchableOpacity style={styles.heartBtn}>
                    <Ionicons name="heart-outline" size={20} color="#fff" />
                </TouchableOpacity>
            </View>

            <View style={styles.detailsContainer}>
                <View style={styles.titleRow}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{item.restaurantName}</Text>
                    <Ionicons name="ellipsis-vertical" size={16} color="#666" />
                </View>

                <View style={styles.ratingRow}>
                    <View style={styles.starBadge}>
                        <Ionicons name="star" size={10} color="#fff" />
                        <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
                    </View>
                    <Text style={styles.ratingCount}>({item.totalReviews})</Text>
                    <Text style={styles.dot}>•</Text>
                    <Text style={styles.deliveryTime}>{item.deliveryTime}</Text>
                </View>

                <Text style={styles.categoryText} numberOfLines={1}>{item.category}, {item.description}</Text>
                <Text style={styles.locationText}>{item.location} • {item.distance}</Text>

                <View style={styles.benefitsBadge}>
                    <Text style={styles.benefitsText}>FREE DELIVERY</Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            <LinearGradient colors={['#0F1C15', '#050806']} style={StyleSheet.absoluteFill} />

            <View style={styles.header}>
                <View style={styles.locationBox}>
                    <Ionicons name="location" size={22} color="#25D366" />
                    <View>
                        <View style={styles.locationTitleRow}>
                            <Text style={styles.locationTitle}>Campus Hostels</Text>
                            <Ionicons name="chevron-down" size={14} color="#ccc" />
                        </View>
                        <Text style={styles.locationSubtitle}>Block A, Room 302</Text>
                    </View>
                </View>

                <TouchableOpacity
                    style={styles.aiButton}
                    onPress={() => router.push('/ai-chat')}
                >
                    <LinearGradient
                        colors={['#25D366', '#128C7E']}
                        style={styles.aiGradient}
                    >
                        <Ionicons name="sparkles" size={18} color="#fff" />
                    </LinearGradient>
                </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
                <Ionicons name="search" size={18} color="#666" style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search 'Breakfast' or 'Snacks'..."
                    placeholderTextColor="#666"
                    value={search}
                    onChangeText={setSearch}
                />
                <View style={styles.micIcon}>
                    <Ionicons name="mic-outline" size={18} color="#25D366" />
                </View>
            </View>

            <View style={styles.categoriesContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesScroll}>
                    {categories.map((cat) => (
                        <TouchableOpacity
                            key={cat.id}
                            style={[
                                styles.filterChip,
                                selectedCategory === cat.name && styles.filterChipActive
                            ]}
                            onPress={() => setSelectedCategory(cat.name)}
                        >
                            <Text style={[
                                styles.filterText,
                                selectedCategory === cat.name && styles.filterTextActive
                            ]}>
                                {cat.name}
                            </Text>
                            {selectedCategory === cat.name && (
                                <Ionicons name="close" size={14} color="#000" style={{ marginLeft: 4 }} />
                            )}
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            <View style={styles.listContainer}>
                <Text style={styles.sectionTitle}>All Restaurants</Text>
                {loading ? (
                    <ActivityIndicator size="large" color="#25D366" style={{ marginTop: 50 }} />
                ) : (
                    <FlatList
                        data={filteredVendors}
                        keyExtractor={(item) => item.id}
                        renderItem={renderVendorCard}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: 100 }}
                        ListEmptyComponent={
                            <Text style={styles.emptyText}>No restaurants found</Text>
                        }
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                                tintColor="#25D366"
                                colors={['#25D366']}
                                progressBackgroundColor="#111"
                            />
                        }
                    />
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#050806', paddingTop: 45 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 16 },
    locationBox: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    locationTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    locationTitle: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
    locationSubtitle: { fontSize: 12, color: '#888' },
    aiButton: { borderRadius: 20, elevation: 5 },
    aiGradient: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111', marginHorizontal: 16, borderRadius: 12, paddingHorizontal: 12, height: 44, marginBottom: 16, borderWidth: 1, borderColor: '#222' },
    searchIcon: { marginRight: 10 },
    searchInput: { flex: 1, color: '#fff', fontSize: 14 },
    micIcon: { paddingLeft: 8, borderLeftWidth: 1, borderLeftColor: '#333' },

    categoriesContainer: { marginBottom: 20 },
    categoriesScroll: { paddingHorizontal: 16 },
    filterChip: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: 'transparent',
        paddingVertical: 8, paddingHorizontal: 16,
        borderRadius: 20, marginRight: 8,
        borderWidth: 1, borderColor: '#333'
    },
    filterChipActive: {
        backgroundColor: '#25D366',
        borderColor: '#25D366'
    },
    filterText: { color: '#fff', fontWeight: '500', fontSize: 14 },
    filterTextActive: { color: '#000', fontWeight: 'bold' },

    listContainer: { flex: 1, paddingHorizontal: 16 },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#fff', marginBottom: 12, letterSpacing: 0.5 },
    card: { backgroundColor: '#111', borderRadius: 16, marginBottom: 16, flexDirection: 'row', padding: 12, alignItems: 'flex-start', borderWidth: 1, borderColor: '#222', elevation: 2 },
    imageContainer: { width: 110, height: 110, borderRadius: 12, overflow: 'hidden', position: 'relative' },
    cardImage: { width: '100%', height: '100%', resizeMode: 'cover' },
    imageGradient: { position: 'absolute', bottom: 0, width: '100%', height: 60 },

    // Removed Offer Styles

    heartBtn: { position: 'absolute', top: 6, right: 6 },
    detailsContainer: { flex: 1, marginLeft: 12, justifyContent: 'space-between', height: 110 },
    titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#fff', flex: 1, marginRight: 8 },
    ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    starBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0F3D24', paddingHorizontal: 4, paddingVertical: 2, borderRadius: 4, marginRight: 6, borderWidth: 1, borderColor: '#1A5D35' },
    ratingText: { color: '#fff', fontSize: 11, fontWeight: 'bold', marginLeft: 2 },
    ratingCount: { color: '#888', fontSize: 11 },
    dot: { color: '#666', marginHorizontal: 6, fontSize: 10 },
    deliveryTime: { color: '#fff', fontSize: 12, fontWeight: '600' },
    categoryText: { color: '#888', fontSize: 12, marginTop: 4 },
    locationText: { color: '#666', fontSize: 11, marginTop: 2 },
    benefitsBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: 'rgba(37, 211, 102, 0.08)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, marginTop: 'auto' },
    benefitsText: { color: '#25D366', fontSize: 10, fontWeight: 'bold', letterSpacing: 0.5 },
    emptyText: { color: '#666', textAlign: 'center', marginTop: 20 }
});
