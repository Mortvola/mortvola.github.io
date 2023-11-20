import React from 'react';
import './App.scss';
import Renderer, { ProjectionType } from './Renderer';
import Transformations from './Transformations';
import { StoreContext, store } from './state/Store';
import Drawable from './Drawables/Drawable';
import { gpu } from './Gpu';

const renderer = await Renderer.create();

const  App = () => {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const [showMenu, setShowMenu] = React.useState<boolean>(false);
  const [projection, setProjection] = React.useState<ProjectionType>(renderer.projection);
  const [selected, setSelected] = React.useState<Drawable | null>(null);

  const handleSelect = React.useCallback((mesh: Drawable | null) => {
    setSelected(mesh);
  }, [])

  React.useEffect(() => {
        const element = canvasRef.current;

    if (element) {
      (async () => {
        await renderer.setCanvas(element);
        renderer.onSelect(handleSelect)
      })()  
    }
  }, [handleSelect])

  const handlePointerDown: React.PointerEventHandler<HTMLCanvasElement> = (event) => {
    const element = canvasRef.current;

    if (element) {
      element.setPointerCapture(event.pointerId);
      const rect = element.getBoundingClientRect();

      const clipX = ((event.clientX - rect.left) / element.clientWidth) * 2 - 1;
      const clipY = 1 - ((event.clientY - rect.top) / element.clientHeight) * 2;
      renderer.pointerDown(clipX, clipY);  
    }
  }

  const handlePointerMove: React.PointerEventHandler<HTMLCanvasElement> = (event) => {
    const element = canvasRef.current;

    if (element) {
      const rect = element.getBoundingClientRect();

      const clipX = ((event.clientX - rect.left) / element.clientWidth) * 2 - 1;
      const clipY = 1 - ((event.clientY - rect.top) / element.clientHeight) * 2;
      renderer.pointerMove(clipX, clipY);  
    }
  }

  const handlePointerUp: React.PointerEventHandler<HTMLCanvasElement> = (event) => {
    const element = canvasRef.current;

    if (element) {
      element.releasePointerCapture(event.pointerId);
      const rect = element.getBoundingClientRect();

      const clipX = ((event.clientX - rect.left) / element.clientWidth) * 2 - 1;
      const clipY = 1 - ((event.clientY - rect.top) / element.clientHeight) * 2;
      renderer.pointerUp(clipX, clipY);
    }
  }

  React.useEffect(() => {
    const element = canvasRef.current;

    if (element) {
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const dpr = Math.max(devicePixelRatio, 2);

          const width = entry.devicePixelContentBoxSize?.[0].inlineSize ??
            entry.contentBoxSize[0].inlineSize * dpr;
          const height = entry.devicePixelContentBoxSize?.[0].blockSize ??
            entry.contentBoxSize[0].blockSize * dpr;

           const canvas = entry.target as HTMLCanvasElement;
          canvas.width = Math.max(1, Math.min(width, gpu.device?.limits.maxTextureDimension2D ?? 1));
          canvas.height = Math.max(1, Math.min(height, gpu.device?.limits.maxTextureDimension2D ?? 1));
        }
      })

      try {
        resizeObserver.observe(element, { box: 'device-pixel-content-box' });
      }
      catch (error) {
        resizeObserver.observe(element, { box: 'content-box' });
      }

      return () => resizeObserver.disconnect();
    }
  }, []);

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
    setShowMenu((prev) => !prev)
  }

  const handleAddSphereClick = () => {
    renderer.addObject('UVSphere');
    setShowMenu(false);
  }

  const handleAddBoxClick = () => {
    renderer.addObject('Box');
    setShowMenu(false);
  }

  const handleAddTetrahedronClick = () => {
    renderer.addObject('Tetrahedron');
    setShowMenu(false);
  }

  const handleProjectionClick = () => {
    switch (renderer.projection) {
      case 'Perspective':
        renderer.projection = 'Orthographic';
        break;
      case 'Orthographic':
        renderer.projection = 'Perspective';
        break;
    }

    setProjection(renderer.projection)
  }

  return (
    <StoreContext.Provider value={store}>
      <div className="App">
        <Transformations drawable={selected}/>
        <div>
          <div className="add-button">
            <button type="button" onClick={handleAddClick}>+</button>
            <div className={`object-menu ${showMenu ? 'show' : ''}`}>
              <div onClick={handleAddSphereClick}>UV Sphere</div>
              <div onClick={handleAddBoxClick}>Box</div>
              <div onClick={handleAddTetrahedronClick}>Tetrahedon</div>
            </div>
          </div>
          <button type="button" className="settings-button" onClick={handleProjectionClick}>
            {projection}
          </button>
          <canvas
            ref={canvasRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onWheel={handleWheel}
          />
        </div>
      </div>      
    </StoreContext.Provider>
  );
}

export default App;
