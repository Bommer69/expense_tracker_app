import React from 'react';
import { View, Text, Modal, TouchableOpacity } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { confirmModalStyles as styles } from '../styles/confirmModalStyles';

export const ConfirmModal = ({ visible, title, message, onConfirm, onCancel }) => {
  const { theme } = useTheme();

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
          <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
          <Text style={[styles.message, { color: theme.textSecondary }]}>{message}</Text>
          
          <View style={styles.buttonRow}>
            <TouchableOpacity style={[styles.button, { borderColor: theme.border, borderWidth: 1 }]} onPress={onCancel}>
              <Text style={[styles.buttonText, { color: theme.textSecondary }]}>Hủy</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, { backgroundColor: theme.error }]} onPress={onConfirm}>
              <Text style={[styles.buttonText, { color: '#fff' }]}>Xóa</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

