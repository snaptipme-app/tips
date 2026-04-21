import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLanguage } from '../../lib/LanguageContext';
import { useAuth } from '../../lib/AuthContext';

const ACCENT = '#6c6cff';
const INACTIVE = 'rgba(255,255,255,0.3)';

export default function TabLayout() {
  const { t } = useLanguage();
  const { user } = useAuth();

  const isBusiness = user?.account_type === 'business';

  const tabBarStyle = {
    backgroundColor: '#0d0d24',
    borderTopWidth: 0,
    height: 80,
    paddingBottom: 24,
    paddingTop: 10,
    elevation: 0,
  };

  const tabBarBackground = () => (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={['rgba(108,108,255,0.15)', 'rgba(108,108,255,0.03)', 'transparent']}
        style={{ height: 1 }}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      />
      <View style={{ flex: 1, backgroundColor: '#0d0d24' }} />
    </View>
  );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle,
        tabBarActiveTintColor: ACCENT,
        tabBarInactiveTintColor: INACTIVE,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarBackground,
      }}
    >
      {/* ── Home tab (members only) ── */}
      <Tabs.Screen
        name="home"
        options={
          isBusiness
            ? { href: null }
            : {
                title: t('home'),
                tabBarIcon: ({ color, focused }) => (
                  <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} />
                ),
              }
        }
      />

      {/* ── Tips tab (members only) ── */}
      <Tabs.Screen
        name="tips"
        options={
          isBusiness
            ? { href: null }
            : {
                title: t('tips'),
                tabBarIcon: ({ color, focused }) => (
                  <Ionicons name={focused ? 'wallet' : 'wallet-outline'} size={22} color={color} />
                ),
              }
        }
      />

      {/* ── Profile tab (everyone) ── */}
      <Tabs.Screen
        name="profile"
        options={{
          title: t('profile'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
