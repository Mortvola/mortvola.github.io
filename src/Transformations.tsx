import React from 'react';
import { observer } from 'mobx-react-lite';
import Drawable from './Drawables/Drawable';
import ValuesInput from './ValuesInput';

type PropsType = {
  drawable: Drawable | null,
}

const Transformations: React.FC<PropsType> = observer(({
  drawable,
}) => (
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
        <ValuesInput values={drawable.rotate} degrees={true} />
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
))

export default Transformations;
