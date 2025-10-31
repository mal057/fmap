import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { Waypoint } from '@fmap/shared-types';

interface WaypointCardProps {
  waypoint: Waypoint;
  onPress?: () => void;
}

export function WaypointCard({ waypoint }: WaypointCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.name}>{waypoint.name}</Text>
      <View style={styles.details}>
        <Text style={styles.detailText}>
          Lat: {waypoint.latitude.toFixed(6)}°
        </Text>
        <Text style={styles.detailText}>
          Lon: {waypoint.longitude.toFixed(6)}°
        </Text>
      </View>
      {waypoint.depth && (
        <Text style={styles.detailText}>Depth: {waypoint.depth}m</Text>
      )}
      {waypoint.temperature && (
        <Text style={styles.detailText}>Temp: {waypoint.temperature}°C</Text>
      )}
      <Text style={styles.device}>Device: {waypoint.device}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 8,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  details: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
  },
  device: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
    textTransform: 'capitalize',
  },
});
