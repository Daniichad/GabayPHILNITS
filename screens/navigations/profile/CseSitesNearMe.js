import React, { useState, useEffect } from 'react'
import {
  StyleSheet, Text, View, ActivityIndicator, TouchableOpacity,
  Modal, Alert, ScrollView, Platform, Linking, StatusBar
} from 'react-native'
import { Ionicons, Feather } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Location from 'expo-location'

let MapView, Marker
try {
  const Maps = require('react-native-maps')
  MapView = Maps.default || Maps
  Marker = Maps.Marker
} catch (e) {
  console.warn('react-native-maps failed to load:', e)
}

const NAVY = '#0f2747'
const ACCENT = '#d85e67'

// Fallback data in case HTTP request fails or user is offline
const FALLBACK_SITES = [
  { id: 1, name: 'PhilNITS Foundation Headquarters', address: '3/F Oppen Bldg, 349 Sen. Gil Puyat Ave, Makati City', lat: 14.5606, lng: 121.0189, phone: '(02) 8890-5026' },
  { id: 2, name: 'UP Diliman (Dept. of Computer Science)', address: 'Engineering Complex, UP Diliman, Quezon City', lat: 14.6538, lng: 121.0685, phone: '(02) 8981-8500' },
  { id: 3, name: 'Ateneo de Manila University (DISCS)', address: 'Katipunan Ave, Loyola Heights, Quezon City', lat: 14.6396, lng: 121.0775, phone: '(02) 8426-6001' },
  { id: 4, name: 'De La Salle University (CCS)', address: '2401 Taft Ave, Malate, Manila', lat: 14.5648, lng: 120.9932, phone: '(02) 8524-4611' },
  { id: 5, name: 'University of Santo Tomas (CICS)', address: 'España Blvd, Sampaloc, Manila', lat: 14.6095, lng: 120.9898, phone: '(02) 8786-1611' },
  { id: 6, name: 'Mapúa University (School of IT)', address: 'Muralla St, Intramuros, Manila', lat: 14.5905, lng: 120.9779, phone: '(02) 8247-5000' },
  { id: 7, name: 'Saint Louis University (Baguio)', address: 'A. Bonifacio St, Baguio City, Benguet', lat: 16.4178, lng: 120.5985, phone: '(074) 442-2793' },
  { id: 8, name: 'Angeles University Foundation (AUF)', address: 'MacArthur Hwy, Angeles City, Pampanga', lat: 15.1451, lng: 120.5935, phone: '(045) 625-2888' },
  { id: 9, name: 'University of Saint Louis (Tuguegarao)', address: 'Mabini St, Tuguegarao City, Cagayan', lat: 17.6186, lng: 121.7303, phone: '(078) 844-1872' },
  { id: 10, name: 'Cebu Institute of Technology - University', address: 'N. Bacalso Ave, Cebu City', lat: 10.2946, lng: 123.8809, phone: '(032) 261-7741' },
  { id: 11, name: 'University of San Carlos (Talamban)', address: 'Gov. M. Cuenco Ave, Cebu City', lat: 10.3541, lng: 123.9130, phone: '(032) 230-0100' },
  { id: 12, name: 'Iloilo Science & Technology University', address: 'Burgos St, La Paz, Iloilo City', lat: 10.7169, lng: 122.5648, phone: '(033) 320-7190' },
  { id: 13, name: 'Ateneo de Davao University', address: 'E. Jacinto St, Poblacion District, Davao City', lat: 7.0722, lng: 125.6128, phone: '(082) 221-2411' },
  { id: 14, name: 'Xavier University - Ateneo de Cagayan', address: '73 Corrales Ave, Cagayan de Oro City', lat: 8.4776, lng: 124.6468, phone: '(088) 853-9800' }
]

export default function CseSitesNearMe({ navigation }) {
  const insets = useSafeAreaInsets()
  const [permissionModalVisible, setPermissionModalVisible] = useState(false)
  const [location, setLocation] = useState(null)
  const [sites, setSites] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState(null)
  const [selectedSite, setSelectedSite] = useState(null)

  // Load PhilNITS examination centers and partner universities
  const fetchCseSites = async () => {
    try {
      setSites(FALLBACK_SITES)
    } catch (err) {
      setSites(FALLBACK_SITES)
    }
  }

  const checkPermissionAndGetLocation = async () => {
    if (Platform.OS === 'web') {
      getUserLocation()
      return
    }

    try {
      const { status } = await Location.getForegroundPermissionsAsync()
      if (status === 'granted') {
        getUserLocation()
      } else {
        setPermissionModalVisible(true)
      }
    } catch (err) {
      console.error(err)
      setSites(FALLBACK_SITES)
      setLoading(false)
    }
  }

  const requestPermission = async () => {
    setPermissionModalVisible(false)
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status === 'granted') {
        getUserLocation()
      } else {
        setErrorMsg('Permission to access location was denied')
        setLocation({
          latitude: 14.5995,
          longitude: 120.9842,
          latitudeDelta: 3.5,
          longitudeDelta: 3.5,
        })
        setLoading(false)
      }
    } catch (err) {
      console.error(err)
      setErrorMsg('Error requesting permission')
      setLoading(false)
    }
  }

  const getUserLocation = async () => {
    setLoading(true)
    if (Platform.OS === 'web' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            latitudeDelta: 0.8,
            longitudeDelta: 0.8,
          })
          setLoading(false)
        },
        (error) => {
          console.warn('Navigator geolocation error:', error)
          setErrorMsg('Unable to retrieve location')
          setLocation({
            latitude: 14.5995,
            longitude: 120.9842,
            latitudeDelta: 3.5,
            longitudeDelta: 3.5,
          })
          setLoading(false)
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 10000 }
      )
      return
    }

    try {
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      })
      setLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.8,
        longitudeDelta: 0.8,
      })
    } catch (err) {
      console.warn('Could not get current location:', err)
      setErrorMsg('Unable to retrieve location')
      setLocation({
        latitude: 14.5995,
        longitude: 120.9842,
        latitudeDelta: 3.5,
        longitudeDelta: 3.5,
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCseSites()
    checkPermissionAndGetLocation()
  }, [])

  const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371 // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1)
    const dLon = deg2rad(lon2 - lon1)
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    const d = R * c // Distance in km
    return d.toFixed(1)
  }

  const deg2rad = (deg) => {
    return deg * (Math.PI / 180)
  }

  const sortedSites = React.useMemo(() => {
    if (!location || !sites || sites.length === 0) return sites
    return [...sites].map(site => {
      const dist = getDistance(location.latitude, location.longitude, site.lat, site.lng)
      return { ...site, distance: parseFloat(dist) }
    }).sort((a, b) => a.distance - b.distance)
  }, [location, sites])

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={24} color={NAVY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>PhilNITS Testing Venues</Text>
        <View style={styles.placeholderBtn} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={NAVY} />
          <Text style={styles.loadingText}>Locating nearest testing centers...</Text>
        </View>
      ) : (
        <View style={styles.content}>
          {/* Map View */}
          {MapView && Platform.OS !== 'web' ? (
            <MapView
              style={styles.map}
              initialRegion={location}
              showsUserLocation={true}
              showsMyLocationButton={true}
            >
              {location && Marker && (
                <Marker
                  coordinate={{ latitude: location.latitude, longitude: location.longitude }}
                  title="Your Location"
                  pinColor="blue"
                />
              )}

              {Marker && sites.map((site) => (
                <Marker
                  key={site.id}
                  coordinate={{ latitude: site.lat, longitude: site.lng }}
                  title={site.name}
                  description={site.address}
                  onPress={() => setSelectedSite(site)}
                >
                  <View style={styles.markerContainer}>
                    <View style={styles.markerPin}>
                      <Ionicons name="location" size={26} color={ACCENT} />
                    </View>
                  </View>
                </Marker>
              ))}
            </MapView>
          ) : Platform.OS === 'web' ? (
            <View style={styles.map}>
              <iframe
                srcDoc={`
                  <!DOCTYPE html>
                  <html>
                  <head>
                    <meta charset="utf-8" />
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
                    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
                    <style>
                      html, body, #map {
                        width: 100%;
                        height: 100%;
                        margin: 0;
                        padding: 0;
                      }
                    </style>
                  </head>
                  <body>
                    <div id="map"></div>
                    <script>
                      var userLat = ${location?.latitude || 14.5995};
                      var userLng = ${location?.longitude || 120.9842};
                      var map = L.map('map').setView([userLat, userLng], 9);
                      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                        attribution: '&copy; OpenStreetMap contributors'
                      }).addTo(map);

                      // User marker
                      var userIcon = L.icon({
                        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
                        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                        iconSize: [25, 41],
                        iconAnchor: [12, 41],
                        popupAnchor: [1, -34],
                        shadowSize: [41, 41]
                      });
                      L.marker([userLat, userLng], {icon: userIcon}).addTo(map)
                        .bindPopup('<b>Your Location</b>').openPopup();

                      // PhilNITS Testing Sites markers
                      var siteIcon = L.icon({
                        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
                        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                        iconSize: [25, 41],
                        iconAnchor: [12, 41],
                        popupAnchor: [1, -34],
                        shadowSize: [41, 41]
                      });

                      var sitesList = ${JSON.stringify(sites)};
                      sitesList.forEach(function(site) {
                        L.marker([site.lat, site.lng], {icon: siteIcon}).addTo(map)
                          .bindPopup('<b>' + site.name + '</b><br>' + site.address + '<br>Tel: ' + site.phone);
                      });
                    </script>
                  </body>
                  </html>
                `}
                style={{ width: '100%', height: '100%', minHeight: 350, border: 'none' }}
                title="PhilNITS Testing Venues Map"
              />
            </View>
          ) : (
            <View style={styles.mapFallback}>
              <Feather name="map" size={48} color="#94a3b8" />
              <Text style={styles.fallbackText}>Map component not available in this environment</Text>
            </View>
          )}

          {/* Quick Info & Site Selector list */}
          <View style={styles.sitesSheet}>
            <Text style={styles.sheetSectionTitle}>
              {errorMsg ? 'All PhilNITS Venues' : 'Nearest Centers'}
            </Text>
            <ScrollView style={styles.sitesList} showsVerticalScrollIndicator={false}>
              {sortedSites.map((site) => (
                <TouchableOpacity
                  key={site.id}
                  style={[
                    styles.siteItem,
                    selectedSite?.id === site.id && styles.siteItemActive
                  ]}
                  onPress={() => {
                    setSelectedSite(site)
                  }}
                >
                  <View style={styles.siteItemHeader}>
                    <Text style={styles.siteName}>{site.name}</Text>
                    {site.distance !== undefined && (
                      <View style={styles.distanceBadge}>
                        <Text style={styles.distanceText}>{site.distance} km</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.siteAddress} numberOfLines={1}>{site.address}</Text>
                  <Text style={styles.sitePhone}><Feather name="phone" size={10} /> {site.phone}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      )}

      {/* Permission Request Modal */}
      <Modal
        visible={permissionModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPermissionModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.permissionCard}>
            <View style={styles.iconCircle}>
              <Ionicons name="location-outline" size={40} color={NAVY} />
            </View>
            <Text style={styles.permissionTitle}>Enable Location Services</Text>
            <Text style={styles.permissionDesc}>
              We need access to your device location to search and display accredited PhilNITS partner testing venues and university testing centers near you.
            </Text>

            <TouchableOpacity style={styles.allowButton} onPress={requestPermission}>
              <Text style={styles.allowButtonText}>Allow Access</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.denyButton} onPress={() => {
              setPermissionModalVisible(false)
              setLoading(false)
            }}>
              <Text style={styles.denyButtonText}>Not Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f5f7fb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e8edf5',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: NAVY,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  placeholderBtn: {
    width: 32,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    color: '#64748b',
    fontSize: 14,
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  map: {
    flex: 1,
    minHeight: 350,
  },
  mapFallback: {
    flex: 1,
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackText: {
    marginTop: 10,
    color: '#64748b',
    fontSize: 14,
  },
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerPin: {
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 4,
  },
  sitesSheet: {
    height: 250,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: -3 },
    shadowRadius: 10,
    elevation: 10,
  },
  sheetSectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: NAVY,
    marginBottom: 12,
  },
  sitesList: {
    flex: 1,
  },
  siteItem: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  siteItemActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  siteItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  siteName: {
    fontSize: 14,
    fontWeight: '700',
    color: NAVY,
    flex: 1,
    marginRight: 8,
  },
  distanceBadge: {
    backgroundColor: NAVY,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  distanceText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '700',
  },
  siteAddress: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  sitePhone: {
    fontSize: 11,
    color: '#94a3b8',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 39, 71, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  permissionCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 15,
    elevation: 10,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: NAVY,
    marginBottom: 8,
    textAlign: 'center',
  },
  permissionDesc: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 10,
  },
  allowButton: {
    backgroundColor: NAVY,
    width: '100%',
    paddingVertical: 14,
    borderRadius: 30,
    alignItems: 'center',
    marginBottom: 10,
  },
  allowButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  denyButton: {
    paddingVertical: 12,
    width: '100%',
    alignItems: 'center',
  },
  denyButtonText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '600',
  },
})
