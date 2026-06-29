import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { MagnifyingGlass, X, PlusCircle } from 'phosphor-react-native';
import { palette, theme } from '../theme';

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  /** Localized exercise names shown as suggestions. */
  options: string[];
  placeholder?: string;
  maxSuggestions?: number;
}

/**
 * Free-text exercise picker: shows matching exercises from the catalog as
 * suggestions while still letting the athlete type their own name. Custom
 * entries are passed straight through — nothing is persisted to the catalog.
 */
export const ExerciseAutocomplete: React.FC<Props> = ({
  value,
  onChangeText,
  options,
  placeholder,
  maxSuggestions = 8,
}) => {
  const { t } = useTranslation();
  const [focused, setFocused] = useState(false);

  const query = value.trim().toLowerCase();

  const suggestions = useMemo(() => {
    if (!focused) return [];
    const matches =
      query.length === 0
        ? options
        : options.filter((o) => o.toLowerCase().includes(query));
    // Don't suggest the exact thing already typed.
    return matches.filter((o) => o.toLowerCase() !== query).slice(0, maxSuggestions);
  }, [focused, query, options, maxSuggestions]);

  // Offer to keep a custom name when it isn't an exact catalog match.
  const showCustom =
    focused &&
    query.length > 0 &&
    !options.some((o) => o.toLowerCase() === query);

  const select = (name: string) => {
    onChangeText(name);
    setFocused(false);
  };

  const open = focused && (suggestions.length > 0 || showCustom);

  return (
    <View style={styles.wrap}>
      <View style={[styles.inputRow, focused && styles.inputRowFocused]}>
        <MagnifyingGlass size={16} weight="bold" color={palette.gray[500]} />
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          // Delay so a tap on a suggestion registers before we close.
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          placeholder={placeholder}
          placeholderTextColor={palette.gray[600]}
          autoCorrect={false}
          autoCapitalize="words"
        />
        {value.length > 0 && (
          <TouchableOpacity onPress={() => onChangeText('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <X size={16} weight="bold" color={palette.gray[500]} />
          </TouchableOpacity>
        )}
      </View>

      {open && (
        <View style={styles.dropdown}>
          {suggestions.map((o) => (
            <TouchableOpacity key={o} style={styles.row} onPress={() => select(o)}>
              <Text style={styles.rowText}>{o}</Text>
            </TouchableOpacity>
          ))}
          {showCustom && (
            <TouchableOpacity style={[styles.row, styles.customRow]} onPress={() => select(value.trim())}>
              <PlusCircle size={16} weight="fill" color={palette.brand[400]} />
              <Text style={styles.customText} numberOfLines={1}>
                {t('formCheck.useCustomExercise', { name: value.trim() })}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { marginBottom: 16 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.backgroundTertiary,
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  inputRowFocused: { borderColor: palette.brand[500] },
  input: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 14,
    paddingVertical: 12,
  },
  dropdown: {
    marginTop: 6,
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  row: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  rowText: { fontSize: 14, color: theme.colors.text },
  customRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderBottomWidth: 0 },
  customText: { flex: 1, fontSize: 14, fontWeight: '600', color: palette.brand[400] },
});
