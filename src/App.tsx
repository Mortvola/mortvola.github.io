import React from 'react';
import './App.css';
import Renderer from './Renderer';

const renderer = new Renderer();

function App() {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  React.useEffect(() => {
        const element = canvasRef.current;

    if (element) {
      (async () => {
        await renderer.initialize(element);
        renderer.start();
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
