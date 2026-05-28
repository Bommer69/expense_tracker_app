import { StyleSheet } from 'react-native';

export const homeStyles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 60, paddingBottom: 16, paddingHorizontal: 20, borderBottomWidth: 0.5 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greeting: { fontSize: 13, marginBottom: 2, fontWeight: '500' },
  userName: { fontSize: 24, fontWeight: '700', letterSpacing: -0.5 },
  infoBtn: { padding: 4 },
  scrollContent: { paddingBottom: 100 },
});
