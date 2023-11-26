import React from 'react';
import SceneNode from '../Drawables/SceneNode';
import styles from './ObjectTree.module.scss';
import { isLight } from '../Drawables/LIght';

type PropsType = {
  node: SceneNode,
  selected?: SceneNode | null,
  onSelect: (node: SceneNode) => void,
}

const ObjectTreeItem: React.FC<PropsType> = ({
  node,
  selected,
  onSelect,
}) => {
  const handleClick = () => {
    onSelect(node);
  }

  return (
    isLight(node)
      ? (
        <div
          className={selected?.uuid === node.uuid ? styles.selected : ''}
          onClick={handleClick}
        >
          Light
        </div>
      )
      : (
        <div
          className={selected?.uuid === node.uuid ? styles.selected : ''}
          onClick={handleClick}
        >
          mesh
        </div>
      )
  )
}

export default ObjectTreeItem;

