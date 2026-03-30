import React from 'react';
import { render } from 'ink';
import { FilePicker } from '../src/index.js';
import path from 'node:path';

const projectRoot = path.resolve(import.meta.dirname, '..');

function App() {
  return (
    <FilePicker
      initialPath={projectRoot}
      showDetails
      maxHeight={12}
      onSelect={(paths) => {
        console.log('\nSelected:', paths.join(', '));
        process.exit(0);
      }}
      onCancel={() => {
        process.exit(0);
      }}
    />
  );
}

render(<App />);
