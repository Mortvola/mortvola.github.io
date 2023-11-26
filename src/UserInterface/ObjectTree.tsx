import React from 'react';
import { observer } from 'mobx-react-lite';
import { renderer } from '../Renderer';
import styles from './ObjectTree.module.scss';
import ObjectTreeItem from './ObjectTreeItem';
import SceneNode from '../Drawables/SceneNode';

type PropsType = {
  selected?: SceneNode | null,
  onSelect?: (node: SceneNode | null) => void,
}
const ObjectTree: React.FC<PropsType> = observer(({
  selected,
  onSelect,
}) => {
  const handleClick = (node: SceneNode) => {
    if (onSelect) {
      onSelect(node);
    }
  }

  return (
    <div className={styles.wrapper}>
      {
        renderer?.document.nodes.map((node) => (
          <ObjectTreeItem key={node.uuid} node={node} selected={selected} onSelect={handleClick} />
        ))
      }
    </div>
  )
})

export default ObjectTree;
