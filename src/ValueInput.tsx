import React from 'react';
import { Vec3 } from 'wgpu-matrix';
import { observer } from 'mobx-react-lite';
import { runInAction } from 'mobx';
import { degToRad, radToDeg } from './Math';

type PropsType = {
  values: Vec3,
  index: number,
  degrees?: boolean,
}

const ValueInput: React.FC<PropsType> = observer(({
  values,
  index,
  degrees = false,
}) => {
  const [edit, setEdit] = React.useState<boolean>(false);
  const [editValue, setEditValue] = React.useState<string>('0');
  
  const handleChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    setEditValue(event.target.value)
    runInAction(() => {
      if (degrees) {
        values[index] = degToRad(parseFloat(event.target.value ?? 0));
      }
      else {
        values[index] = parseFloat(event.target.value ?? 0);
      }
    })
  }

  const handleFocus: React.FocusEventHandler<HTMLInputElement> = () => {
    if (degrees) {
      setEditValue(radToDeg(values[index]).toString())
    }
    else {
      setEditValue(values[index].toString())
    }
    setEdit(true);
  }

  const handleBlur: React.FocusEventHandler<HTMLInputElement> = () => {
    setEdit(false);
  }

  return (
    <>
      {
        edit
          ? <input type="text" value={editValue} onChange={handleChange} onBlur={handleBlur} />
          : <input
            type="text"
            value={degrees ? radToDeg(values[index]) : values[index]}
            onChange={handleChange}
            onFocus={handleFocus}
          />
      }
    </>
  )
})

export default ValueInput;
