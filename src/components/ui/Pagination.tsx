import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme, palette } from '../../theme';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
}) => {
  // Generate array of page numbers to show (e.g. [1, 2, '...', 9, 10])
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5; // e.g., max 5 pages visible around current

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = start; i <= end; i++) pages.push(i);
      
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        style={[styles.navButton, currentPage === 1 && styles.disabled]}
        accessibilityRole="button"
        accessibilityLabel="Previous page"
        accessibilityState={{ disabled: currentPage === 1 }}
      >
        <Text style={styles.navText}>Previous</Text>
      </TouchableOpacity>

      <View style={styles.pageNumbers}>
        {getPageNumbers().map((page, index) => (
          <TouchableOpacity
            key={`page-${index}`}
            onPress={() => typeof page === 'number' && onPageChange(page)}
            disabled={page === '...'}
            accessibilityRole={page === '...' ? 'none' : 'button'}
            accessibilityLabel={typeof page === 'number' ? `Page ${page}` : undefined}
            accessibilityState={{ selected: currentPage === page, disabled: page === '...' }}
            style={[
              styles.pageButton,
              currentPage === page && styles.activePageButton,
            ]}
          >
            <Text
              style={[
                styles.pageText,
                currentPage === page && styles.activePageText,
              ]}
            >
              {page}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        onPress={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        style={[styles.navButton, currentPage === totalPages && styles.disabled]}
        accessibilityRole="button"
        accessibilityLabel="Next page"
        accessibilityState={{ disabled: currentPage === totalPages }}
      >
        <Text style={styles.navText}>Next</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: theme.spacing.lg,
  },
  navButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderWidth: 1,
    borderColor: palette.gray[800],
    borderRadius: theme.borderRadius.md,
    backgroundColor: palette.gray[950],
  },
  disabled: {
    opacity: 0.5,
  },
  navText: {
    color: palette.gray[300],
    fontSize: 14,
    fontWeight: theme.fontWeight.medium,
  },
  pageNumbers: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: theme.spacing.md,
  },
  pageButton: {
    minWidth: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  activePageButton: {
    backgroundColor: palette.brand[600],
  },
  pageText: {
    color: palette.gray[400],
    fontSize: 14,
    fontWeight: theme.fontWeight.medium,
  },
  activePageText: {
    color: palette.gray[50], // White text on brand background
  },
});
