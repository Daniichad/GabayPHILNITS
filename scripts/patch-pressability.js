/**
 * Ensures Pressability is patched with user click profiling hooks after npm install
 */
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'node_modules', 'react-native', 'Libraries', 'Pressability', 'Pressability.js');

if (fs.existsSync(filePath)) {
  let code = fs.readFileSync(filePath, 'utf8');

  const target1 = 'if (onPress != null && disabled !== true) {\n          onPress(event);';
  const repl1 = 'if (onPress != null && disabled !== true) {\n          if (global.__logUserClick) { try { global.__logUserClick(this._config, event); } catch (_) {} }\n          onPress(event);';

  const target2 = "if (Platform.OS === 'android' && android_disableSound !== true) {\n            SoundManager.playTouchSound();\n          }\n          onPress(event);";
  const repl2 = "if (Platform.OS === 'android' && android_disableSound !== true) {\n            SoundManager.playTouchSound();\n          }\n          if (global.__logUserClick) { try { global.__logUserClick(this._config, event); } catch (_) {} }\n          onPress(event);";

  let changed = false;
  if (code.includes(target1)) {
    code = code.replace(target1, repl1);
    changed = true;
  }
  if (code.includes(target2)) {
    code = code.replace(target2, repl2);
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(filePath, code, 'utf8');
    console.log('[patch-pressability] Pressability.js successfully patched with click profiler hooks.');
  } else {
    console.log('[patch-pressability] Pressability.js already patched or targets not matched.');
  }
} else {
  console.log('[patch-pressability] React Native Pressability.js not found, skipping.');
}
