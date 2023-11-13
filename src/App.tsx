import React from 'react';
import './App.css';
import Renderer from './Renderer';
import { gpu } from './Gpu';

const renderer = new Renderer();

function App() {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  React.useEffect(() => {
        const element = canvasRef.current;

    if (element) {
      (async () => {
        await gpu.ready;
        await renderer.initialize(element);
        renderer.start();
      })()  
    }
  }, [])

  const handleClick: React.MouseEventHandler<HTMLCanvasElement> = (event) => {
    const element = canvasRef.current;

    if (element) {
      const rect = element.getBoundingClientRect();

      const clipX = ((event.clientX - rect.left) / element.clientWidth) * 2 - 1;
      const clipY = 1 - ((event.clientY - rect.top) / element.clientHeight) * 2;
      renderer.hitTest(clipX, clipY);  
    }
  }

  return (
    <div className="App">
      <canvas ref={canvasRef} width="800" height="600" onClick={handleClick} />
    </div>
  );
}

export default App;
