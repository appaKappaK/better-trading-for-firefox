export async function readImportFile(file: File): Promise<string> {
  if (!file) {
    throw new Error('Choose a backup file first.');
  }

  if (typeof file.text === 'function') {
    const text = await file.text();
    return normalizeImportedText(text);
  }

  return await new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => {
      reject(new Error('Could not read that backup file.'));
    };

    reader.onload = () => {
      resolve(normalizeImportedText(String(reader.result ?? '')));
    };

    reader.readAsText(file);
  });
}

function normalizeImportedText(value: string) {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error('That backup file was empty.');
  }

  return normalized;
}
