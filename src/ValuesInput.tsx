import React from 'react';
import { Vec3 } from 'wgpu-matrix';
import { observer } from 'mobx-react-lite';
import ValueInput from './ValueInput';

type PropsType = {
  values: Vec3,
  degrees?: boolean,
  onChange?: (index: number, value: number) => void,
}

const ValuesInput: React.FC<PropsType> = observer(({
  values,
  degrees = false,
  onChange,
}) => (
  <div className="values">
    <label>
      X:
      <ValueInput values={values} index={0} degrees={degrees} onChange={onChange} />
    </label>
    <label>
      Y:
      <ValueInput values={values} index={1} degrees={degrees} onChange={onChange} />
    </label>
    <label>
      Z:
      <ValueInput values={values} index={2} degrees={degrees} onChange={onChange} />
    </label>
  </div>
))

export default ValuesInput;
