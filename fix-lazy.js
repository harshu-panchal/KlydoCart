const fs = require('fs');
const file = 'frontend/src/App.tsx';
let code = fs.readFileSync(file, 'utf8');

const lazyWrapper = `

// Wrapper for React.lazy to handle chunk loading errors (like when a new version is deployed)
const lazyWithRetry = (componentImport) =>
  lazy(async () => {
    const pageHasAlreadyBeenForceRefreshed = JSON.parse(
      window.sessionStorage.getItem('page-has-been-force-refreshed') || 'false'
    );

    try {
      const component = await componentImport();
      window.sessionStorage.setItem('page-has-been-force-refreshed', 'false');
      return component;
    } catch (error) {
      if (!pageHasAlreadyBeenForceRefreshed) {
        // Assume that the error is due to an outdated chunk, force refresh
        window.sessionStorage.setItem('page-has-been-force-refreshed', 'true');
        return window.location.reload();
      }
      // The page has already been reloaded, so the error must be something else
      throw error;
    }
  });
`;

// Replace all lazy(() => ... ) calls with lazyWithRetry(() => ... )
code = code.replace(/\blazy\(/g, 'lazyWithRetry(');

// Insert lazyWithRetry definition after the imports
const lastImportIndex = code.lastIndexOf('import ');
const insertionIndex = code.indexOf('\n', code.indexOf(';', lastImportIndex)) + 1;
code = code.slice(0, insertionIndex) + lazyWrapper + code.slice(insertionIndex);

fs.writeFileSync(file, code);
