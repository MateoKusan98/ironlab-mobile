import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { theme, palette } from '../../theme';
import { TextInput } from './TextInput';

// A UI shell representing the Dropdown from Figma Specs
export interface DropdownItem {
  label: string;
  value: string;
  icon?: React.ReactNode;
  subtitle?: string;
}

export interface DropdownProps {
  label?: string;
  placeholder?: string;
  items: DropdownItem[];
  value?: string;
  onSelect: (value: string) => void;
  searchable?: boolean;
}

export const Dropdown: React.FC<DropdownProps> = ({
  label,
  placeholder = 'Select an option',
  items,
  value,
  onSelect,
  searchable = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selectedItem = items.find((itm) => itm.value === value);

  const filteredItems = items.filter((itm) =>
    itm.label.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (val: string) => {
    onSelect(val);
    setIsOpen(false);
  };

  return (
    <View style={styles.container}>
      {label && <Text style={[theme.typography.textSm, styles.label]}>{label}</Text>}
      
      <TouchableOpacity
        style={styles.trigger}
        activeOpacity={0.7}
        onPress={() => setIsOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={[label, selectedItem ? selectedItem.label : placeholder].filter(Boolean).join(', ')}
        accessibilityState={{ expanded: isOpen }}
      >
        {selectedItem?.icon && <View style={styles.triggerIcon}>{selectedItem.icon}</View>}
        <Text style={[theme.typography.textMd, { color: selectedItem ? palette.gray[50] : palette.gray[500] }]}>
          {selectedItem ? selectedItem.label : placeholder}
        </Text>
        <Text style={styles.chevron}>⌄</Text>
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <TouchableWithoutFeedback onPress={() => setIsOpen(false)}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback>
              <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.menuContainer}>
                
                {searchable && (
                  <View style={styles.searchContainer}>
                    <TextInput
                      placeholder="Search..."
                      value={search}
                      onChangeText={setSearch}
                      autoFocus
                    />
                  </View>
                )}

                <FlatList
                  data={filteredItems}
                  keyExtractor={(item) => item.value}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[
                        styles.item,
                        item.value === value && styles.itemSelected,
                      ]}
                      onPress={() => handleSelect(item.value)}
                      accessibilityRole="menuitem"
                      accessibilityLabel={[item.label, item.subtitle].filter(Boolean).join(', ')}
                      accessibilityState={{ selected: item.value === value }}
                    >
                      {item.icon && <View style={styles.itemIcon}>{item.icon}</View>}
                      <View style={styles.itemTexts}>
                        <Text style={[theme.typography.textMd, { color: item.value === value ? palette.brand[400] : palette.gray[200] }]}>
                          {item.label}
                        </Text>
                        {item.subtitle && (
                          <Text style={[theme.typography.textSm, { color: palette.gray[500] }]}>
                            {item.subtitle}
                          </Text>
                        )}
                      </View>
                      {item.value === value && (
                        <Text style={styles.checkIcon}>✓</Text>
                      )}
                    </TouchableOpacity>
                  )}
                  style={styles.list}
                  contentContainerStyle={styles.listContent}
                />
              </KeyboardAvoidingView>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.md,
    width: '100%',
  },
  label: {
    color: palette.gray[300],
    marginBottom: theme.spacing.xs,
    fontWeight: theme.fontWeight.medium,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.gray[950],
    borderWidth: 1,
    borderColor: palette.gray[800],
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    minHeight: 48,
  },
  triggerIcon: {
    marginRight: theme.spacing.sm,
  },
  chevron: {
    marginLeft: 'auto',
    color: palette.gray[400],
    fontSize: 24,
    marginTop: -8,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  menuContainer: {
    backgroundColor: palette.gray[900],
    borderRadius: theme.borderRadius.lg,
    maxHeight: '70%',
    width: '100%',
    borderWidth: 1,
    borderColor: palette.gray[800],
    ...theme.shadow.xl,
    overflow: 'hidden', // maintain border radius
  },
  searchContainer: {
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: palette.gray[800],
    backgroundColor: palette.gray[950],
  },
  list: {
    flexGrow: 0,
  },
  listContent: {
    paddingVertical: theme.spacing.xs,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
  },
  itemSelected: {
    backgroundColor: palette.brand[950],
  },
  itemIcon: {
    marginRight: theme.spacing.md,
  },
  itemTexts: {
    flex: 1,
  },
  checkIcon: {
    color: palette.brand[500],
    fontSize: 16,
    fontWeight: 'bold',
  },
});
