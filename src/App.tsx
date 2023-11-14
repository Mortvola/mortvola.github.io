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

  const handleMouseDown: React.MouseEventHandler<HTMLCanvasElement> = (event) => {
    const element = canvasRef.current;

    if (element) {
      const rect = element.getBoundingClientRect();

      const clipX = ((event.clientX - rect.left) / element.clientWidth) * 2 - 1;
      const clipY = 1 - ((event.clientY - rect.top) / element.clientHeight) * 2;
      renderer.startDrag(clipX, clipY);  
    }
  }

  const handleMouseMove: React.MouseEventHandler<HTMLCanvasElement> = (event) => {
    const element = canvasRef.current;

    if (element) {
      const rect = element.getBoundingClientRect();

      const clipX = ((event.clientX - rect.left) / element.clientWidth) * 2 - 1;
      const clipY = 1 - ((event.clientY - rect.top) / element.clientHeight) * 2;
      renderer.moveDrag(clipX, clipY);  
    }
  }

  const handleMouseUp: React.MouseEventHandler<HTMLCanvasElement> = (event) => {
    const element = canvasRef.current;

    if (element) {
      const rect = element.getBoundingClientRect();

      const clipX = ((event.clientX - rect.left) / element.clientWidth) * 2 - 1;
      const clipY = 1 - ((event.clientY - rect.top) / element.clientHeight) * 2;
      renderer.stopDrag(clipX, clipY);
    }
  }

  return (
    <div className="App">
      <canvas
        ref={canvasRef}
        width="800"
        height="600"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      />
    </div>
  );
}

export default App;
