const { execSync } = require('child_process');
try {
  const stdout = execSync('git log -n 5 -p app/page.tsx', { cwd: 'c:\\Users\\VICTUS\\OneDrive\\Desktop\\Projek\\UDDOKAR', encoding: 'utf-8' });
  console.log(stdout);
} catch (e) {
  console.error(e.message);
}
