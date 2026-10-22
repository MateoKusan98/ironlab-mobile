import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { sessionService, TrainingExportKind } from '../../../services/session.service';

export interface TrainingExportOption {
  kind: TrainingExportKind;
  titleKey: string;
  subKey: string;
}

/** Order on the sheet: the complete file first, then the tables a spreadsheet wants. */
export const TRAINING_EXPORT_OPTIONS: TrainingExportOption[] = [
  { kind: 'json', titleKey: 'trainingExport.jsonTitle', subKey: 'trainingExport.jsonSub' },
  { kind: 'sets', titleKey: 'trainingExport.setsTitle', subKey: 'trainingExport.setsSub' },
  { kind: 'maxes', titleKey: 'trainingExport.maxesTitle', subKey: 'trainingExport.maxesSub' },
  { kind: 'sessions', titleKey: 'trainingExport.sessionsTitle', subKey: 'trainingExport.sessionsSub' },
];

// The UTI is what lets iOS offer Numbers / Excel / Files for the file instead of only
// "Copy"; Android reads the MIME type.
const SHARE_TYPES = {
  json: { mimeType: 'application/json', UTI: 'public.json' },
  csv: { mimeType: 'text/csv', UTI: 'public.comma-separated-values-text' },
};

/**
 * Download one export and hand it to the share sheet. Written to the cache directory:
 * the file is a hand-off, not something the app keeps. Throws on failure — the caller
 * owns the message.
 */
export async function shareTrainingExport(kind: TrainingExportKind, dialogTitle: string): Promise<void> {
  const file = await sessionService.downloadTrainingExport(kind);
  const path = `${FileSystem.cacheDirectory}${file.filename}`;
  await FileSystem.writeAsStringAsync(path, file.body, { encoding: FileSystem.EncodingType.UTF8 });
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this device');
  await Sharing.shareAsync(path, { ...SHARE_TYPES[kind === 'json' ? 'json' : 'csv'], dialogTitle });
}
