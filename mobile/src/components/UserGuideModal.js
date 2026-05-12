import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';

export const UserGuideModal = ({ visible, onClose, title, guideItems }) => {
  const { theme } = useTheme();

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
            {guideItems.map((item, index) => (
              <View key={index} style={styles.itemRow}>
                <View style={styles.itemIcon}>
                  <Ionicons name={item.iconName || 'ellipse'} size={24} color={theme.primary} />
                </View>
                <View style={styles.itemTextWrap}>
                  <Text style={[styles.itemTitle, { color: theme.text }]}>{item.title}</Text>
                  <Text style={[styles.itemDesc, { color: theme.textSecondary }]}>{item.desc}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
          <TouchableOpacity style={[styles.okBtn, { backgroundColor: theme.primary }]} onPress={onClose}>
            <Text style={styles.okText}>Đã hiểu</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', borderRadius: 24, padding: 24, maxHeight: '80%', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 8 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 20, fontWeight: '700' },
  closeBtn: { padding: 4 },
  scroll: { paddingBottom: 10 },
  itemRow: { flexDirection: 'row', marginBottom: 20, alignItems: 'flex-start' },
  itemIcon: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  itemTextWrap: { flex: 1 },
  itemTitle: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  itemDesc: { fontSize: 14, lineHeight: 20 },
  okBtn: { paddingVertical: 14, borderRadius: 14, alignItems: 'center', marginTop: 10 },
  okText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
});
