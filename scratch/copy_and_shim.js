const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'gsv internship student portal integration file', 'internship site upgradation');
const destDir = path.join(__dirname, '..', 'frontend', 'public', 'internship');

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

const SHIM_HTML = `
<!-- START GOOGLE SCRIPT RUN SHIM -->
<script>
(function() {
  if (typeof google === 'undefined') {
    function createRunProxy(onSuccess, onFailure) {
      return new Proxy({}, {
        get(target, prop) {
          if (prop === 'withSuccessHandler') {
            return function(newSuccess) {
              return createRunProxy(newSuccess, onFailure);
            };
          }
          if (prop === 'withFailureHandler') {
            return function(newFailure) {
              return createRunProxy(onSuccess, newFailure);
            };
          }
          return function(...args) {
            console.log('[google.script.run] Calling function:', prop, 'with arguments:', args);
            fetch('/api/internship/run', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ functionName: prop, arguments: args })
            })
            .then(res => {
              if (!res.ok) throw new Error('Network response not OK');
              return res.json();
            })
            .then(data => {
              if (data && data.status === 'error') {
                if (onFailure) onFailure(data.message || data.error);
              } else {
                if (onSuccess) {
                  onSuccess(data !== null && data.data !== undefined ? data.data : data);
                }
              }
            })
            .catch(err => {
              if (onFailure) onFailure(err.message || err);
            });
          };
        }
      });
    }

    window.google = {
      script: {
        run: createRunProxy(console.log, console.error)
      }
    };
  }
})();
</script>
<!-- END GOOGLE SCRIPT RUN SHIM -->
`;

const files = [
  { src: 'Index.html', dest: 'index.html' },
  { src: 'AdminDashboard.html', dest: 'admin.html' },
  { src: 'StudentDashboard.html', dest: 'student.html' },
  { src: 'combined.html', dest: 'combined.html' }
];

files.forEach(f => {
  const srcPath = path.join(srcDir, f.src);
  const destPath = path.join(destDir, f.dest);

  if (fs.existsSync(srcPath)) {
    console.log(`Copying and shimming: ${f.src} -> ${f.dest}`);
    let content = fs.readFileSync(srcPath, 'utf8');
    
    // Insert shim immediately after <head>
    const headIndex = content.search(/<head>/i);
    if (headIndex !== -1) {
      const insertAt = headIndex + 6;
      content = content.substring(0, insertAt) + SHIM_HTML + content.substring(insertAt);
    } else {
      // Fallback to inserting at top if no head tag
      content = SHIM_HTML + content;
    }
    
    fs.writeFileSync(destPath, content, 'utf8');
    console.log(`Successfully wrote shimmed file to: ${destPath}`);
  } else {
    console.error(`Source file not found: ${srcPath}`);
  }
});
