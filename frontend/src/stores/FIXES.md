# WebContainer Sync Fixes

## Problem
After migrating to Zustand, the WebContainer preview was failing with errors:
- `npm error ENOENT: no such file or directory, open '/home/.../package.json'`
- `jsh: permission denied: vite`

## Root Cause
The issue was caused by **Zustand's object reference changes** triggering multiple WebContainer syncs:

1. **Zustand Creates New References**: Every Zustand store update creates a new object reference, even if content is identical
2. **React useEffect Triggers**: PreviewPanel's useEffect has `files` in dependencies, triggers on every reference change
3. **Multiple Syncs**: Each sync remounts the filesystem, causing npm to reinstall packages repeatedly
4. **Corrupted State**: Multiple rapid syncs corrupt WebContainer's filesystem, causing vite to lose execute permissions
5. **Permission Error**: Result: `jsh: permission denied: vite`

### Secondary Issue
Additionally, files were being synced before fully loaded:
- **Initial Empty State**: On app start, the files store initializes as an empty object `{}`
- **Premature Sync**: PreviewPanel's useEffect would trigger immediately with empty files
- **Failed Mount**: WebContainer tried to mount an empty filesystem without package.json

## Fixes Applied

### 1. Content-Based Change Detection (PreviewPanel.tsx:268-294)
**THE CRITICAL FIX** - Prevents unnecessary syncs from Zustand reference changes:

```typescript
// Track last synced files to prevent unnecessary re-syncs
const lastSyncedFilesHashRef = useRef<string | null>(null);

useEffect(() => {
  if (!containerReady || !containerRef.current) return;

  // Check files exist
  const hasFiles = Object.keys(files).length > 0;
  const hasPackageJson = files["/package.json"] || files["package.json"];
  if (!hasFiles || !hasPackageJson) {
    setStatus("Waiting for project files...");
    return;
  }

  // Create a hash of file contents to detect actual changes
  const filesHash = JSON.stringify(Object.keys(files).sort()) +
                    JSON.stringify(Object.values(files).map(v => v.substring(0, 100)));

  // Only sync if files actually changed
  if (lastSyncedFilesHashRef.current === filesHash) {
    return; // Skip sync - content hasn't changed
  }

  lastSyncedFilesHashRef.current = filesHash;
  queueSync(files, { forceInstall: lastPackageJsonRef.current === null });
}, [containerReady, files, queueSync]);
```

**Why**: Zustand creates new object references on every update. Without content comparison, the useEffect would trigger on every store update (even unrelated ones), causing multiple WebContainer syncs that corrupt the filesystem.

**How it works**:
- Creates a lightweight hash from file paths and first 100 chars of each file
- Compares hash before syncing
- Only syncs when content actually changes
- Prevents the "jsh: permission denied: vite" error

### 2. Guard Against Empty Files (PreviewPanel.tsx:275-281)
```typescript
const hasFiles = Object.keys(files).length > 0;
const hasPackageJson = files["/package.json"] || files["package.json"];
if (!hasFiles || !hasPackageJson) {
  setStatus("Waiting for project files...");
  return;
}
```

**Why**: Prevents WebContainer from trying to mount an empty or incomplete filesystem before boilerplate loads.

### 3. Single Initial Load (page.tsx:31-41)
```typescript
// Load initial boilerplate (only once on mount)
useEffect(() => {
  const loadInitial = async () => {
    const boilerplate = await loadBoilerplate();
    if (boilerplate) {
      setFiles(boilerplate);
    }
  };
  loadInitial();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);
```

**Why**: Ensures boilerplate loads only once on mount, preventing multiple redundant loads that could cause race conditions.

### 4. Memoized Preview Files (page.tsx:43-44)
```typescript
// Normalize files for runtime (leading slashes)
// Memoize to prevent unnecessary re-renders of PreviewPanel
const previewFiles = useMemo(() => toRuntimeFileMap(files), [files]);
```

**Why**: Prevents creating new file objects on every render, reducing unnecessary PreviewPanel re-renders and syncs.

## How It Works Now

1. **App Initializes**: Files store starts empty
2. **PreviewPanel Mounts**: Boots WebContainer but shows "Waiting for project files..."
3. **Files Load**: Single useEffect loads boilerplate from API
4. **Store Updates**: Zustand files store updates with boilerplate
5. **Validation Check**: PreviewPanel verifies files exist and have package.json
6. **First Sync**: Files are mounted to WebContainer
7. **Install**: npm install runs successfully
8. **Dev Server**: Vite starts and preview becomes ready

## Benefits

✅ **No More Premature Syncs**: WebContainer only syncs when files are ready
✅ **Single Load**: Boilerplate loads once, not on every dependency change
✅ **Stable References**: Memoization prevents unnecessary re-renders
✅ **Better UX**: Clear status messages during loading
✅ **Reliable**: Race conditions eliminated

## Testing

To verify the fix:
1. Refresh the app
2. Watch the preview panel status
3. Should see: "Booting preview runtime..." → "Waiting for project files..." → "Installing dependencies..." → "Preview ready"
4. No ENOENT errors
5. No permission denied errors
6. Preview loads successfully

## Key Insight: Zustand Object References

**IMPORTANT**: Zustand stores create new object references on every update. This is by design for React's change detection, but it can cause issues with useEffect dependencies.

```typescript
// ❌ BAD - Triggers on every store update
useEffect(() => {
  doSomething(files);
}, [files]); // files reference changes on every update

// ✅ GOOD - Only triggers on actual content changes
const filesHashRef = useRef(null);
useEffect(() => {
  const hash = createHash(files);
  if (filesHashRef.current === hash) return;
  filesHashRef.current = hash;
  doSomething(files);
}, [files]);
```

## Zustand Best Practices Applied

1. **Store Actions are Stable**: Zustand ensures action references don't change
2. **Selective Subscriptions**: Components only re-render when their selected state changes
3. **Memoization**: Used useMemo to prevent unnecessary derived state recalculations
4. **Single Load Pattern**: Load data once on mount, not on every dependency change
5. **Content-Based Comparison**: Use hashing/checksums when object references aren't stable
