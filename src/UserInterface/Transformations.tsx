import React from 'react';
import { observer } from 'mobx-react-lite';
import { runInAction } from 'mobx';
import ValuesInput from './ValuesInput';
import SceneNode from '../Drawables/SceneNode';

type PropsType = {
  node: SceneNode | null,
}

const Transformations: React.FC<PropsType> = observer(({
  node,
}) => {
  const handleChange = (index: number, value: number) => {
    console.log(`change: ${index}, ${value}`)
    
    runInAction(() => {
      switch (index) {
        case 0:
          node?.setFromAngles(value,  node.angles[1], node.angles[2]);
          break;
  
        case 1:
          node?.setFromAngles(node.angles[0], value, node.angles[2]);
          break;
  
        case 2:
          node?.setFromAngles(node.angles[0], node.angles[1], value);
          break;
  
        default:
          break;
      }  
    })
  }

  return (
    node
      ? (
        <div className="transformation">
          <div className="title">
            Location:
          </div>
          <ValuesInput values={node.translate} />
          <div className="title">
            Rotation:
          </div>
          <ValuesInput values={node.angles} degrees={true} onChange={handleChange} />
          <div className="title">
            Scale:
          </div>
          <ValuesInput values={node.scale} />
        </div>
      )
      : (
        <div>
          No item is selected
        </div>
      )
  )
})

export default Transformations;
