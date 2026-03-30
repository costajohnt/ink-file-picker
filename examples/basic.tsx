import React from 'react';
import { render } from 'ink';
import { FilePicker } from '../src/index.js';

function App() {
  return (
    <FilePicker
      initialPath={process.cwd()}
      showDetails
      onSelect={(paths) => {
        console.log('Selected:', paths);
        process.exit(0);
      }}
      onCancel={() => {
        console.log('Cancelled');
        process.exit(1);
      }}
    />
  );
}

render(<App />);
