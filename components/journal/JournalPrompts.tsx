import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { Lightbulb, RefreshCw } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const prompts = [
  "What was the biggest challenge I faced today, and how did I handle it?",
  "What is one thing I'm grateful for right now?",
  "What's a small victory I had today?",
  "How am I feeling physically and emotionally at this moment?",
  "What is one thing I can do tomorrow to support my recovery?",
  "Describe a moment of peace or clarity from today.",
  "What or who made me smile today?",
  "What is a limiting belief I want to let go of?",
  "What are my top 3 priorities for tomorrow?",
  "If I could give my younger self one piece of advice, what would it be?",
];

interface JournalPromptsProps {
  onSelectPrompt: (prompt: string) => void;
  selectedPrompt: string;
}

const JournalPrompts: React.FC<JournalPromptsProps> = ({ onSelectPrompt, selectedPrompt }) => {
  const { colors } = useTheme();
  const [currentPrompt, setCurrentPrompt] = useState('');

  const getNewPrompt = () => {
    let newPrompt = prompts[Math.floor(Math.random() * prompts.length)];
    // Ensure the new prompt is different from the current one
    while (newPrompt === currentPrompt) {
      newPrompt = prompts[Math.floor(Math.random() * prompts.length)];
    }
    setCurrentPrompt(newPrompt);
    onSelectPrompt(newPrompt);
  };

  useEffect(() => {
    // Set an initial prompt when the component mounts
    if (!selectedPrompt) {
      getNewPrompt();
    } else {
      setCurrentPrompt(selectedPrompt);
    }
  }, []);

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#1F2937', '#111827']} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} />
      <View style={styles.header}>
        <Lightbulb size={20} color="#6366F1" />
        <Text style={styles.title}>Need a prompt?</Text>
        <TouchableOpacity onPress={getNewPrompt} style={styles.refreshButton}>
          <RefreshCw size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
      <Text style={styles.promptText}>
        {currentPrompt}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    marginLeft: 10,
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    color: '#FFFFFF',
  },
  refreshButton: {
    padding: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promptText: {
    fontSize: 15,
    fontStyle: 'italic',
    lineHeight: 22,
    color: 'rgba(255, 255, 255, 0.9)',
  },
});

export default JournalPrompts; 