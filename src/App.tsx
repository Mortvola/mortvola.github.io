import React from 'react';
import './App.scss';
import Renderer from './Renderer';

const renderer = new Renderer();

function App() {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  React.useEffect(() => {
        const element = canvasRef.current;

    if (element) {
      (async () => {
        await renderer.setCanvas(element);
      })()  
    }
  }, [])

  const handlePointerDown: React.PointerEventHandler<HTMLCanvasElement> = (event) => {
    const element = canvasRef.current;

    if (element) {
      element.setPointerCapture(event.pointerId);
      const rect = element.getBoundingClientRect();

      const clipX = ((event.clientX - rect.left) / element.clientWidth) * 2 - 1;
      const clipY = 1 - ((event.clientY - rect.top) / element.clientHeight) * 2;
      renderer.startDrag(clipX, clipY);  
    }
  }

  const handlePointerMove: React.PointerEventHandler<HTMLCanvasElement> = (event) => {
    const element = canvasRef.current;

    if (element) {
      const rect = element.getBoundingClientRect();

      const clipX = ((event.clientX - rect.left) / element.clientWidth) * 2 - 1;
      const clipY = 1 - ((event.clientY - rect.top) / element.clientHeight) * 2;
      renderer.moveDrag(clipX, clipY);  
    }
  }

  const handlePointerUp: React.PointerEventHandler<HTMLCanvasElement> = (event) => {
    const element = canvasRef.current;

    if (element) {
      element.releasePointerCapture(event.pointerId);
      const rect = element.getBoundingClientRect();

      const clipX = ((event.clientX - rect.left) / element.clientWidth) * 2 - 1;
      const clipY = 1 - ((event.clientY - rect.top) / element.clientHeight) * 2;
      renderer.stopDrag(clipX, clipY);
    }
  }

  const getVh = React.useCallback(() => {
    return Math.max(
      document.documentElement.clientHeight || 0,
      window.innerHeight || 0
    );
  }, []);

  const getVw = React.useCallback(() => {
      return Math.max(
        document.documentElement.clientWidth || 0,
        window.innerWidth || 0
      );
  }, []);

  const [clientWidth, setClientWidth] = React.useState<number>(getVw());
  const [clientHeight, setClientHeight] = React.useState<number>(getVh());

  React.useEffect(() => {
    const handleResize = () => {
      setClientWidth(getVw());
      setClientHeight(getVh());
    }

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [getVh, getVw]);

  const handleWheel: React.WheelEventHandler<HTMLCanvasElement> = (event) => {
    if (event.ctrlKey) {
      renderer.changeCameraPos(0, event.deltaY * 0.01);
    }
    else {
      renderer.changeCameraRotation(event.deltaX * 0.1, event.deltaY * 0.1)
    }

    event.stopPropagation();
  }

  const handleAddClick = () => {
    renderer.addObject();
  }

  return (
    <div className="App">
      <button type="button" className="add-button" onClick={handleAddClick}>+</button>
      <canvas
        ref={canvasRef}
        width={clientWidth}
        height={clientHeight}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
      />
    </div>
  );
}

export default App;
