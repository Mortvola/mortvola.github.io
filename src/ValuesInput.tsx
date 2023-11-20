import React from 'react';
import { Vec3 } from 'wgpu-matrix';
import { observer } from 'mobx-react-lite';
import ValueInput from './ValueInput';

type PropsType = {
  values: Vec3,
}

const ValuesInput: React.FC<PropsType> = observer(({
  values,
}) => (
  <div className="values">
    <label>
      X:
      <ValueInput values={values} index={0} />
    </label>
    <label>
      Y:
      <ValueInput values={values} index={1} />
    </label>
    <label>
      Z:
      <ValueInput values={values} index={2} />
    </label>
  </div>
))

export default ValuesInput;
