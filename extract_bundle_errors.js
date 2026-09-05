const fs = require('fs');

const lines = fs.readFileSync('eas_logs_decoded.txt', 'utf8').split('\n');
for (const line of lines) {
  if (!line.trim()) continue;
  try {
    const obj = JSON.parse(line);
    if (obj.phase === 'EAGER_BUNDLE' && obj.msg) {
      if (obj.msg.toLowerCase().includes('error') || obj.msg.includes('FAILED')) {
        console.log(obj.msg);
      }
    }
  } catch(e) {}
}
