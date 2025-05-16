import { useState, useEffect } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, TextInput } from 'react-native';
import { useGamification } from '@/context/GamificationContext';
import { useTheme } from '@/context/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CirclePlus as PlusCircle, CreditCard as Edit, Trash2, Save, X, Calendar } from 'lucide-react-native';
import JournalEntry from '@/components/journal/JournalEntry';
import { formatDate } from '@/utils/dateUtils';

export default function JournalScreen() {
  const { colors } = useTheme();
  const { addJournalEntry, journalEntries, deleteJournalEntry } = useGamification();
  
  const [isWriting, setIsWriting] = useState(false);
  const [entryText, setEntryText] = useState('');
  const [filterVisible, setFilterVisible] = useState(false);
  
  const handleAddEntry = () => {
    if (entryText.trim().length > 0) {
      addJournalEntry(entryText);
      setEntryText('');
      setIsWriting(false);
    }
  };

  const handleCancel = () => {
    setEntryText('');
    setIsWriting(false);
  };

  const renderItem = ({ item }) => (
    <JournalEntry
      entry={item}
      onDelete={() => deleteJournalEntry(item.id)}
    />
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Journal</Text>
        <TouchableOpacity 
          style={[styles.filterButton, { backgroundColor: colors.cardAlt }]}
          onPress={() => setFilterVisible(!filterVisible)}
        >
          <Calendar size={20} color={colors.primary} />
          <Text style={[styles.filterText, { color: colors.primary }]}>Filter</Text>
        </TouchableOpacity>
      </View>
      
      {isWriting ? (
        <View style={[styles.writeContainer, { backgroundColor: colors.card }]}>
          <TextInput
            style={[styles.textInput, { color: colors.text, backgroundColor: colors.inputBackground }]}
            placeholder="Write your thoughts..."
            placeholderTextColor={colors.placeholder}
            multiline
            value={entryText}
            onChangeText={setEntryText}
            autoFocus
          />
          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={[styles.cancelButton, { backgroundColor: colors.error }]} 
              onPress={handleCancel}
            >
              <X size={20} color={colors.white} />
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.saveButton, { backgroundColor: colors.success }]} 
              onPress={handleAddEntry}
            >
              <Save size={20} color={colors.white} />
              <Text style={styles.buttonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <>
          <FlatList
            data={journalEntries}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={[styles.emptyState, { backgroundColor: colors.cardAlt }]}>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  Your Journal is Empty
                </Text>
                <Text style={[styles.emptyText, { color: colors.secondaryText }]}>
                  Start writing about your journey, feelings, and progress. Regular journaling helps in recovery.
                </Text>
              </View>
            }
          />
          
          <TouchableOpacity 
            style={[styles.addButton, { backgroundColor: colors.primary }]}
            onPress={() => setIsWriting(true)}
          >
            <PlusCircle size={24} color={colors.white} />
            <Text style={styles.addButtonText}>New Entry</Text>
          </TouchableOpacity>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontFamily: 'Nunito-Bold',
    fontSize: 28,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
  },
  filterText: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 14,
    marginLeft: 4,
  },
  listContent: {
    paddingBottom: 80,
  },
  writeContainer: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  textInput: {
    height: 200,
    padding: 12,
    borderRadius: 8,
    fontFamily: 'Nunito-Regular',
    fontSize: 16,
    textAlignVertical: 'top',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    flex: 1,
    marginLeft: 8,
  },
  buttonText: {
    color: 'white',
    fontFamily: 'Nunito-SemiBold',
    fontSize: 16,
    marginLeft: 8,
  },
  addButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 30,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  addButtonText: {
    color: 'white',
    fontFamily: 'Nunito-SemiBold',
    fontSize: 16,
    marginLeft: 8,
  },
  emptyState: {
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
  },
  emptyTitle: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 18,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontFamily: 'Nunito-Regular',
    fontSize: 16,
    textAlign: 'center',
  },
});