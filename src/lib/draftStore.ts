// Module-level store: persists across route changes within the same browser session.
// Cleared when the user generates (uploads to real trip) or closes the tab.

export interface DraftFile {
  file: File;
  previewUrl: string; // createObjectURL — stays valid within the session
  width: number;
  height: number;
  takenAt: number | null;
}

let _files: DraftFile[] = [];

export const draftStore = {
  add(entries: { file: File; width: number; height: number; takenAt: number | null }[]) {
    const newEntries = entries.map((e) => ({
      ...e,
      previewUrl: URL.createObjectURL(e.file),
    }));
    _files = [..._files, ...newEntries];
  },
  // Remove by previewUrl (stable identity within session)
  remove(previewUrl: string) {
    const idx = _files.findIndex((f) => f.previewUrl === previewUrl);
    if (idx === -1) return;
    URL.revokeObjectURL(_files[idx].previewUrl);
    _files = _files.filter((_, i) => i !== idx);
  },
  getAll(): DraftFile[] { return _files; },
  getFiles(): File[] { return _files.map((d) => d.file); },
  clear() {
    _files.forEach((d) => URL.revokeObjectURL(d.previewUrl));
    _files = [];
  },
};
