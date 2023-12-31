import React from 'react';
import './App.scss';
import { gpu, renderer } from '../Renderer';
import Transformations from './Transformations';
import { StoreContext, store } from '../state/Store';
import AddObjectMenu from './AddObjectMenu';
import ObjectTree from './ObjectTree';
import SceneNode from '../Drawables/SceneNode';
import LoadFbx from './LoadFbx';
import { SpaceOrientationType } from '../Transformer';
import { ProjectionType } from '../Camera';

const  App = () => {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const [projection, setProjection] = React.useState<ProjectionType | undefined>(renderer?.camera.projection);
  const [selected, setSelected] = React.useState<SceneNode | null>(null);

  const handleSelect = React.useCallback((node: SceneNode | null) => {
    setSelected(node);
  }, [])

  const handleNodeSelect = React.useCallback((node: SceneNode | null) => {
    if (node) {
      renderer?.selectNode(node);
    }

    setSelected(node);
  }, [])

  React.useEffect(() => {
    const element = canvasRef.current;

    if (element) {
      (async () => {
        await renderer?.setCanvas(element);
        renderer?.onSelect(handleSelect)
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
      renderer?.pointerDown(clipX, clipY);  
    }
  }

  const handlePointerMove: React.PointerEventHandler<HTMLCanvasElement> = (event) => {
    const element = canvasRef.current;

    if (element) {
      const rect = element.getBoundingClientRect();

      const clipX = ((event.clientX - rect.left) / element.clientWidth) * 2 - 1;
      const clipY = 1 - ((event.clientY - rect.top) / element.clientHeight) * 2;
      renderer?.pointerMove(clipX, clipY);  
    }
  }

  const handlePointerUp: React.PointerEventHandler<HTMLCanvasElement> = (event) => {
    const element = canvasRef.current;

    if (element) {
      element.releasePointerCapture(event.pointerId);
      const rect = element.getBoundingClientRect();

      const clipX = ((event.clientX - rect.left) / element.clientWidth) * 2 - 1;
      const clipY = 1 - ((event.clientY - rect.top) / element.clientHeight) * 2;
      renderer?.pointerUp(clipX, clipY);
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
          canvas.width = Math.max(1, Math.min(width, gpu?.device.limits.maxTextureDimension2D ?? 1));
          canvas.height = Math.max(1, Math.min(height, gpu?.device.limits.maxTextureDimension2D ?? 1));
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
      renderer?.camera.changePosition(0, event.deltaY * 0.01);
    }
    else {
      renderer?.camera.changeRotation(event.deltaX * 0.2, event.deltaY * 0.2)
    }

    event.stopPropagation();
  }

  const handleProjectionClick = () => {
    switch (renderer?.camera.projection) {
      case 'Perspective':
        renderer.camera.projection = 'Orthographic';
        break;
      case 'Orthographic':
        renderer.camera.projection = 'Perspective';
        break;
    }

    setProjection(renderer?.camera.projection)
  }

  const [spaceSelection, setSpaceSelection] = React.useState<SpaceOrientationType>(renderer?.transformer.spaceOrientation ?? 'Global');

  const handleSpaceSelection: React.ChangeEventHandler<HTMLSelectElement> = (event) => {
    setSpaceSelection(event.target.value as SpaceOrientationType);

    if (renderer) {
      renderer.transformer.spaceOrientation = event.target.value as SpaceOrientationType;
    }
  }

  return (
    <StoreContext.Provider value={store}>
      {
        renderer
          ? (
            <div className="App">
              <div className="sidebar">
                <ObjectTree selected={selected} onSelect={handleNodeSelect} />
                <Transformations node={selected} />
              </div>
              <div className="canvas-wrapper">
                <div className="upper-left">
                  <AddObjectMenu />
                  <LoadFbx />
                </div>
                <select
                  className="orientation-control"
                  onChange={handleSpaceSelection}
                  value={spaceSelection}
                >
                  <option value="Global">Global</option>
                  <option value="Local">Local</option>
                </select>
                <div className="upper-right">
                  <button type="button" className="settings-button" onClick={handleProjectionClick}>
                    {projection}
                  </button>
                </div>
                <canvas
                  ref={canvasRef}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onWheel={handleWheel}
                />
              </div>
            </div>      
          )
          : (
            <div className="no-support">
              Your browser does not support WebGpu. Try the latest version of Chrome.
            </div>
          )
      }
    </StoreContext.Provider>
  );
}

export default App;
