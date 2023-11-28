import React from 'react';
import { renderer } from '../Renderer';

const AddObjectMenu: React.FC = () => {
  const [showMenu, setShowMenu] = React.useState<boolean>(false);

  const handleAddClick = () => {
    setShowMenu((prev) => !prev)
  }

  const handleAddSphereClick = () => {
    renderer?.addObject('UVSphere');
    setShowMenu(false);
  }

  const handleAddBoxClick = () => {
    renderer?.addObject('Box');
    setShowMenu(false);
  }

  const handleAddTetrahedronClick = () => {
    renderer?.addObject('Tetrahedron');
    setShowMenu(false);
  }

  const handleAddCylinderClick = () => {
    renderer?.addObject('Cylinder');
    setShowMenu(false);
  }

  const handleAddConeClick = () => {
    renderer?.addObject('Cone');
    setShowMenu(false);
  }

  const handleAddPlaneClick = () => {
    renderer?.addObject('Plane');
    setShowMenu(false);
  }

  return (
    <div className="add-button">
      <button type="button" onClick={handleAddClick}>+</button>
      <div className={`object-menu ${showMenu ? 'show' : ''}`}>
        <div onClick={handleAddSphereClick}>UV Sphere</div>
        <div onClick={handleAddBoxClick}>Box</div>
        <div onClick={handleAddTetrahedronClick}>Tetrahedon</div>
        <div onClick={handleAddCylinderClick}>Cylinder</div>
        <div onClick={handleAddConeClick}>Cone</div>
        <div onClick={handleAddPlaneClick}>Plane</div>
      </div>
    </div>
  )
}

export default AddObjectMenu;
