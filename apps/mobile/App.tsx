import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, Button } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

// Initialize Supabase client
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const Stack = createNativeStackNavigator();

function HomeScreen({ navigation }: any) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>FishMap</Text>
      <Text style={styles.subtitle}>Your cross-platform fish finder waypoint manager</Text>
      <View style={styles.buttonContainer}>
        <Button title="Upload Waypoints" onPress={() => navigation.navigate('Upload')} />
        <Button title="View Waypoints" onPress={() => navigation.navigate('Waypoints')} />
        <Button title="Map View" onPress={() => navigation.navigate('Map')} />
      </View>
      <StatusBar style="auto" />
    </View>
  );
}

function UploadScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Upload Waypoints</Text>
      <Text>Upload waypoint files from Lowrance, Garmin, or Humminbird devices</Text>
    </View>
  );
}

function WaypointsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Waypoints</Text>
      <Text>View and manage your saved waypoints</Text>
    </View>
  );
}

function MapScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Map View</Text>
      <Text>View your waypoints on a map</Text>
    </View>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: 'FishMap' }}
        />
        <Stack.Screen name="Upload" component={UploadScreen} />
        <Stack.Screen name="Waypoints" component={WaypointsScreen} />
        <Stack.Screen name="Map" component={MapScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  buttonContainer: {
    gap: 10,
    width: '100%',
  },
});
