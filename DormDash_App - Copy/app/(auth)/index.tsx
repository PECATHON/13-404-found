import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Dimensions, TouchableOpacity, Animated } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

const SLIDES = [
    { id: '1', title: 'Campus Eats', description: 'Food delivered right to your dorm.', icon: '🍔' },
    { id: '2', title: 'Live Tracking', description: 'Track your order in real-time.', icon: '🚀' },
    { id: '3', title: 'Student Deals', description: 'Exclusive discounts for students.', icon: '🏷️' }
];

export default function OnboardingScreen() {
    const router = useRouter();
    const scrollX = useRef(new Animated.Value(0)).current;
    const [currentIndex, setCurrentIndex] = useState(0);
    const flatListRef = useRef<FlatList>(null);

    const handleNext = () => {
        if (currentIndex < SLIDES.length - 1) {
            flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
        } else {
            // GO TO LOGIN SCREEN
            router.push('/(auth)/login');
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            <LinearGradient colors={['#0F1C15', '#050806']} style={StyleSheet.absoluteFill} />

            <TouchableOpacity style={styles.skipButton} onPress={() => router.push('/(auth)/login')}>
                <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>

            <Animated.FlatList
                ref={flatListRef}
                data={SLIDES}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item.id}
                onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: false })}
                onViewableItemsChanged={({ viewableItems }) => {
                    if (viewableItems[0]) setCurrentIndex(viewableItems[0].index || 0);
                }}
                renderItem={({ item }) => (
                    <View style={styles.slide}>
                        <View style={styles.circle}><Text style={{ fontSize: 64 }}>{item.icon}</Text></View>
                        <Text style={styles.title}>{item.title}</Text>
                        <Text style={styles.description}>{item.description}</Text>
                    </View>
                )}
            />

            <View style={styles.footer}>
                {/* Simple Dots */}
                <View style={styles.indicatorContainer}>
                    {SLIDES.map((_, i) => (
                        <View key={i} style={[styles.dot, { opacity: i === currentIndex ? 1 : 0.3 }]} />
                    ))}
                </View>

                <TouchableOpacity style={styles.button} onPress={handleNext}>
                    <Text style={styles.buttonText}>{currentIndex === SLIDES.length - 1 ? 'Get Started' : 'Next'}</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#050806' },
    skipButton: { position: 'absolute', top: 50, right: 20, zIndex: 10 },
    skipText: { color: '#888', fontSize: 16 },
    slide: { width, alignItems: 'center', justifyContent: 'center', padding: 20 },
    circle: { width: 150, height: 150, borderRadius: 75, backgroundColor: '#1A2E22', justifyContent: 'center', alignItems: 'center', marginBottom: 40 },
    title: { fontSize: 32, fontWeight: 'bold', color: 'white', marginBottom: 10, textAlign: 'center' },
    description: { fontSize: 16, color: '#aaa', textAlign: 'center' },
    footer: { padding: 20, paddingBottom: 50 },
    indicatorContainer: { flexDirection: 'row', justifyContent: 'center', marginBottom: 20 },
    dot: { height: 8, width: 8, borderRadius: 4, backgroundColor: '#25D366', marginHorizontal: 4 },
    button: { backgroundColor: '#25D366', height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
    buttonText: { fontSize: 18, fontWeight: 'bold', color: '#000' }
});
