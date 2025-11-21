import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, Image, TouchableOpacity, ScrollView,
    Alert, ActivityIndicator
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext'; // ✅ Hook used for logout
import { collection, query, where, getCountFromServer } from 'firebase/firestore';
import { db } from '../../config/firebaseConfig';

export default function ProfileScreen() {
    const { user, logout } = useAuth(); // ✅ Destructure logout function
    const router = useRouter();
    const [orderCount, setOrderCount] = useState(0);
    const [loadingOrders, setLoadingOrders] = useState(true);

    useEffect(() => {
        fetchOrderCount();
    }, [user]);

    const fetchOrderCount = async () => {
        if (!user?.uid) return;
        try {
            const q = query(
                collection(db, 'orders'),
                where('studentId', '==', user.uid)
            );
            const snapshot = await getCountFromServer(q);
            setOrderCount(snapshot.data().count);
        } catch (error) {
            console.error("Error fetching order count:", error);
        } finally {
            setLoadingOrders(false);
        }
    };

    // ✅ Actual Logout Function
    const handleLogout = async () => {
        Alert.alert('Logout', 'Are you sure you want to logout?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Logout',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await logout();
                        // ✅ Redirect explicitly to your Auth Index/Login screen
                        router.replace('/(auth)'); // Or '/auth/login' if that's the specific file
                    } catch (error) {
                        console.error("Logout failed:", error);
                        Alert.alert("Error", "Failed to logout.");
                    }
                }
            },
        ]);
    };


    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            <LinearGradient colors={['#0F1C15', '#050806']} style={StyleSheet.absoluteFill} />

            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>My Profile</Text>
                <TouchableOpacity onPress={() => { /* Add Settings Logic */ }}>
                    <Ionicons name="settings-outline" size={24} color="#fff" />
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {/* Profile Card */}
                <View style={styles.profileCard}>
                    <View style={styles.avatarContainer}>
                        <Text style={styles.avatarText}>
                            {user?.email ? user.email[0].toUpperCase() : 'U'}
                        </Text>
                    </View>
                    <Text style={styles.userName}>{user?.email?.split('@')[0] || 'Guest'}</Text>
                    <Text style={styles.userEmail}>{user?.email || 'No email'}</Text>
                    <View style={styles.planBadge}>
                        <Text style={styles.planText}>Student Plan</Text>
                    </View>
                </View>

                {/* Stats Row */}
                <View style={styles.statsContainer}>
                    <View style={styles.statBox}>
                        {loadingOrders ? (
                            <ActivityIndicator size="small" color="#25D366" />
                        ) : (
                            <Text style={styles.statValue}>{orderCount}</Text>
                        )}
                        <Text style={styles.statLabel}>Orders</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statBox}>
                        <Text style={styles.statValue}>0</Text>
                        <Text style={styles.statLabel}>Reviews</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statBox}>
                        <Text style={styles.statValue}>0</Text>
                        <Text style={styles.statLabel}>Saved</Text>
                    </View>
                </View>

                {/* Menu Options */}
                <View style={styles.menuContainer}>
                    <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/(tabs)/orders')}>
                        <View style={styles.menuIconBox}>
                            <Ionicons name="receipt-outline" size={22} color="#25D366" />
                        </View>
                        <Text style={styles.menuText}>Order History</Text>
                        <Ionicons name="chevron-forward" size={20} color="#666" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem}>
                        <View style={styles.menuIconBox}>
                            <Ionicons name="location-outline" size={22} color="#25D366" />
                        </View>
                        <Text style={styles.menuText}>My Addresses</Text>
                        <Ionicons name="chevron-forward" size={20} color="#666" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem}>
                        <View style={styles.menuIconBox}>
                            <Ionicons name="card-outline" size={22} color="#25D366" />
                        </View>
                        <Text style={styles.menuText}>Payment Methods</Text>
                        <Ionicons name="chevron-forward" size={20} color="#666" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem}>
                        <View style={styles.menuIconBox}>
                            <Ionicons name="help-circle-outline" size={22} color="#25D366" />
                        </View>
                        <Text style={styles.menuText}>Help & Support</Text>
                        <Ionicons name="chevron-forward" size={20} color="#666" />
                    </TouchableOpacity>
                </View>

                {/* Logout Button */}
                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <Ionicons name="log-out-outline" size={20} color="#FF4757" />
                    <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>

                <Text style={styles.versionText}>Version 1.0.0</Text>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#050806', paddingTop: 50 },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 20, marginBottom: 20
    },
    headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
    scrollContent: { paddingBottom: 100 },

    profileCard: { alignItems: 'center', marginBottom: 24 },
    avatarContainer: {
        width: 80, height: 80, borderRadius: 40, backgroundColor: '#1A2E22',
        justifyContent: 'center', alignItems: 'center', marginBottom: 12,
        borderWidth: 2, borderColor: '#25D366'
    },
    avatarText: { fontSize: 32, fontWeight: 'bold', color: '#25D366' },
    userName: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
    userEmail: { fontSize: 14, color: '#888', marginBottom: 12 },
    planBadge: {
        backgroundColor: 'rgba(37, 211, 102, 0.1)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12
    },
    planText: { color: '#25D366', fontSize: 12, fontWeight: '600' },

    statsContainer: {
        flexDirection: 'row', backgroundColor: '#111', marginHorizontal: 20,
        borderRadius: 16, paddingVertical: 16, marginBottom: 24,
        borderWidth: 1, borderColor: '#222'
    },
    statBox: { flex: 1, alignItems: 'center' },
    statValue: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
    statLabel: { fontSize: 12, color: '#666' },
    statDivider: { width: 1, backgroundColor: '#222' },

    menuContainer: { marginHorizontal: 20, marginBottom: 24 },
    menuItem: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#111',
        padding: 16, borderRadius: 12, marginBottom: 12,
        borderWidth: 1, borderColor: '#1A1A1A'
    },
    menuIconBox: {
        width: 40, height: 40, borderRadius: 10, backgroundColor: 'rgba(37, 211, 102, 0.1)',
        justifyContent: 'center', alignItems: 'center', marginRight: 12
    },
    menuText: { flex: 1, fontSize: 16, color: '#fff', fontWeight: '500' },

    logoutButton: {
        flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
        marginHorizontal: 20, padding: 16, borderRadius: 12,
        borderWidth: 1, borderColor: 'rgba(255, 71, 87, 0.3)',
        backgroundColor: 'rgba(255, 71, 87, 0.05)', gap: 8
    },
    logoutText: { color: '#FF4757', fontSize: 16, fontWeight: 'bold' },
    versionText: { textAlign: 'center', color: '#444', marginTop: 20, fontSize: 12 }
});
