import { File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';
import { uid } from './dates';

export type Angle = 'front' | 'side' | 'back';
export const ANGLES: [Angle, string][] = [['front', 'Front'], ['side', 'Side'], ['back', 'Back']];

/**
 * Photos are copied into the app's documents folder so they survive cache
 * clean-ups. Only the file name is stored, because the folder's absolute path
 * changes when the app is updated. On web the picker's data URI is kept as-is.
 */
export const photoUri = (ref: string): string => (ref.includes(':') ? ref : new File(Paths.document, ref).uri);

export type PickResult = { ref: string } | { error: string } | null;

export async function pickPhoto(source: 'camera' | 'library'): Promise<PickResult> {
  try {
    if (source === 'camera') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return { error: 'Camera access is off. Turn it on in Settings, or choose a photo from your library.' };
    }
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.7, allowsEditing: true, aspect: [3, 4] };
    const res = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
    if (res.canceled || !res.assets?.[0]) return null;
    const uri = res.assets[0].uri;
    if (Platform.OS === 'web') return { ref: uri };
    const name = `progress-${uid()}.jpg`;
    new File(uri).copy(new File(Paths.document, name));
    return { ref: name };
  } catch {
    return { error: "Couldn't save that photo. Please try again." };
  }
}

export function deletePhoto(ref: string) {
  if (ref.includes(':')) return;
  try {
    const file = new File(Paths.document, ref);
    if (file.exists) file.delete();
  } catch {
    // Best effort: an orphaned file is harmless.
  }
}
