import React from 'react';
import { observer } from 'mobx-react-lite';
import { runInAction } from 'mobx';
import Drawable from './Drawables/Drawable';
import ValuesInput from './ValuesInput';

type PropsType = {
  drawable: Drawable | null,
}

const Transformations: React.FC<PropsType> = observer(({
  drawable,
}) => {
  const handleChange = (index: number, value: number) => {
    console.log(`change: ${index}, ${value}`)
    
    runInAction(() => {
      switch (index) {
        case 0:
          drawable?.setFromAngles(value, drawable.angles[1], drawable.angles[2]);
          break;
  
        case 1:
          drawable?.setFromAngles(drawable.angles[0], value, drawable.angles[2]);
          break;
  
        case 2:
          drawable?.setFromAngles(drawable.angles[0], drawable.angles[1], value);
          break;
  
        default:
          break;
      }  
    })
  }

  return (
  drawable
    ? (
      <div className="transformation">
        <div className="title">
          Location:
        </div>
        <ValuesInput values={drawable.translate} />
        <div className="title">
          Rotation:
        </div>
        <ValuesInput values={drawable.angles} degrees={true} onChange={handleChange} />
        <div className="title">
          Scale:
        </div>
        <ValuesInput values={drawable.scale} />
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
