import React from 'react';
import './App.css';
import { initialize } from './test';

function App() {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  React.useEffect(() => {
    const element = canvasRef.current;

    if (element) {
      (async () => {
        await initialize(element);
      })()  
    }
  }, [])

  return (
    <div className="App">
      <canvas ref={canvasRef} width="800" height="600" />
    </div>
  );
}

export default App;
