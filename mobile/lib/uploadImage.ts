/**
 * uploadImage.ts
 *
 * Uses expo-file-system FileSystem.uploadAsync which bypasses the React Native
 * network bridge and talks directly to Android's native OkHttp stack. This
 * correctly handles `file://` URIs produced by expo-image-picker on Android
 * Scoped Storage without any OOM or silent-drop issues.
 *
 * ALL image uploads in the app MUST go through this module.
 * Keep using api.ts (axios) for every other JSON API call.
 */

import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = 'https://snaptip.me/api';

// ─── Token helper ─────────────────────────────────────────────────────────────
async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem('snaptip_token'); // key matches AuthContext.tsx
}

// ─── Profile photo ────────────────────────────────────────────────────────────
export async function uploadProfileImage(imageUri: string): Promise<{
  success: boolean;
  employee?: Record<string, any>;
  photo_url?: string;
  error?: string;
}> {
  try {
    const token = await getToken();
    if (!token) return { success: false, error: 'Not authenticated' };

    console.log('[uploadImage] uploadProfileImage — uri:', imageUri);

    const result = await FileSystem.uploadAsync(
      `${API_BASE}/employee/upload-photo`,
      imageUri,
      {
        httpMethod: 'POST',
        uploadType: FileSystem.FileSystemUploadType.MULTIPART,
        fieldName: 'photo',
        mimeType: 'image/jpeg',
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    console.log('[uploadImage] status:', result.status, '| body:', result.body.slice(0, 200));

    if (result.status !== 200) {
      let serverMsg = `HTTP ${result.status}`;
      try { serverMsg = JSON.parse(result.body)?.error || serverMsg; } catch {}
      return { success: false, error: serverMsg };
    }

    const data = JSON.parse(result.body);
    return { success: true, employee: data.employee, photo_url: data.employee?.photo_url };
  } catch (err: any) {
    console.error('[uploadImage] uploadProfileImage error:', err.message);
    return { success: false, error: err.message || 'Upload failed' };
  }
}

// ─── Business logo ────────────────────────────────────────────────────────────
export async function uploadBusinessLogo(imageUri: string): Promise<{
  success: boolean;
  logo_url?: string;
  error?: string;
}> {
  try {
    const token = await getToken();
    if (!token) return { success: false, error: 'Not authenticated' };

    console.log('[uploadImage] uploadBusinessLogo — uri:', imageUri);

    const result = await FileSystem.uploadAsync(
      `${API_BASE}/business/upload-logo`,
      imageUri,
      {
        httpMethod: 'POST',
        uploadType: FileSystem.FileSystemUploadType.MULTIPART,
        fieldName: 'logo',
        mimeType: 'image/jpeg',
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    console.log('[uploadImage] logo status:', result.status);

    if (result.status !== 200) {
      let serverMsg = `HTTP ${result.status}`;
      try { serverMsg = JSON.parse(result.body)?.error || serverMsg; } catch {}
      return { success: false, error: serverMsg };
    }

    const data = JSON.parse(result.body);
    return { success: true, logo_url: data.logo_url };
  } catch (err: any) {
    console.error('[uploadImage] uploadBusinessLogo error:', err.message);
    return { success: false, error: err.message || 'Upload failed' };
  }
}
