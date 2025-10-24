import JSZip from 'jszip';

import type { RecordCollection } from './export';

/**
 * Import session data from a zip file
 * @param file - The zip file to import
 * @returns The imported record collection
 */
export async function importFromZip(file: File): Promise<RecordCollection> {
  try {
    console.log('[Import] Starting import from zip file...');

    // Load the zip file
    const zip = new JSZip();
    const zipContent = await zip.loadAsync(file);

    // Find and read the JSON file inside the zip
    const jsonFile = zipContent.file('data.json');
    if (!jsonFile) {
      throw new Error('Invalid zip file: data.json not found');
    }

    const jsonText = await jsonFile.async('string');
    const collection: RecordCollection = JSON.parse(jsonText);

    console.log('[Import] ✅ Import completed');
    return collection;
  } catch (error) {
    console.error('[Import] ❌ Import failed:', error);
    throw error;
  }
}

/**
 * Import session data from a JSON file (legacy support)
 * @param file - The JSON file to import
 * @returns The imported record collection
 */
export async function importFromJson(file: File): Promise<RecordCollection> {
  try {
    console.log('[Import] Starting import from JSON file...');

    const text = await file.text();
    const collection: RecordCollection = JSON.parse(text);

    console.log('[Import] ✅ Import completed');
    return collection;
  } catch (error) {
    console.error('[Import] ❌ Import failed:', error);
    throw error;
  }
}

/**
 * Auto-detect file type and import
 * @param file - The file to import (zip or json)
 * @returns The imported record collection
 */
export async function importFromFile(file: File): Promise<RecordCollection> {
  const fileName = file.name.toLowerCase();

  if (fileName.endsWith('.zip')) {
    return importFromZip(file);
  } else if (fileName.endsWith('.json')) {
    return importFromJson(file);
  } else {
    throw new Error('Unsupported file type. Please provide a .zip or .json file');
  }
}
