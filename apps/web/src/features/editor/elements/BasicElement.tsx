import { useState, type ElementType } from 'react';
import {
  Plus,
  Image,
  Star,
  Heart,
  Search,
  Settings,
  Check,
  X,
  AlertCircle,
  Inbox,
  CheckCircle2,
} from 'lucide-react';
import type { UiNode } from '@jjapgma/ui-spec';
import { FileImage } from '../files/FileAssets';

export function BasicElement({ node }: { node: UiNode }) {
  const [pressed, setPressed] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  const Icon = ({ size = 20 }: { size?: number }) => {
    const icons = {
      plus: Plus,
      star: Star,
      heart: Heart,
      search: Search,
      settings: Settings,
      check: Check,
      x: X,
    };
    const Component = icons[node.props.iconName as keyof typeof icons] ?? Star;
    return <Component size={size} />;
  };

  switch (node.type as string) {
    case 'heading': {
      const Tag = (node.props.titleLevel ?? 'h2') as ElementType;
      return <Tag>{node.props.text}</Tag>;
    }
    case 'text':
    case 'label':
      return <p className="element-text">{node.props.text}</p>;
    case 'link':
      return <a href={node.props.href || '#'}>{node.props.text}</a>;
    case 'icon':
      return (
        <span role="img" aria-label={node.props.text}>
          <Icon size={28} />
        </span>
      );
    case 'image':
      return node.props.attachment ? (
        <FileImage node={node} />
      ) : node.props.src && !imageFailed ? (
        <img src={node.props.src} alt={node.props.text} onError={() => setImageFailed(true)} />
      ) : (
        <div className="element-image-placeholder">
          <Image size={40} />
          <span>{imageFailed ? '이미지를 불러올 수 없습니다.' : node.props.text}</span>
        </div>
      );
    case 'spacer':
      return <div className="element-spacer" />;
    case 'divider':
      return <hr />;
    case 'button':
    case 'iconButton':
    case 'fab':
    case 'toggleButton': {
      const nodeType = node.type as string;
      const variant =
        nodeType === 'fab'
          ? 'fab'
          : nodeType === 'iconButton'
            ? 'icon'
            : node.props.variant ?? 'default';
      const isIconOnly = variant === 'icon' || variant === 'fab';
      const isFab = variant === 'fab';
      return (
        <button
          type="button"
          className={`element-button variant-${variant} ${isFab ? 'element-fab' : ''} ${isIconOnly ? 'element-icon-button' : ''}`}
          disabled={node.props.disabled}
          aria-pressed={pressed}
          onClick={() => setPressed((v) => !v)}
        >
          {node.props.iconName && <Icon size={isFab ? 24 : 16} />}
          {!isIconOnly && <span>{node.props.text}</span>}
        </button>
      );
    }
    case 'dropdownButton':
      return (
        <label>
          {node.props.text}
          <select disabled={node.props.disabled}>
            {(node.props.items ?? '').split('\n').map((option, i) => (
              <option key={i}>{option}</option>
            ))}
          </select>
        </label>
      );
    case 'alert':
      return (
        <div className="element-alert" role="status">
          <AlertCircle size={20} />
          {node.props.text}
        </div>
      );
    case 'progress':
      return (
        <label>
          {node.props.text}
          <progress max={100} value={node.props.value ?? 60} />
        </label>
      );
    case 'spinner':
      return (
        <div role="status" className="element-loading">
          <span className="element-spinner" />
          {node.props.text}
        </div>
      );
    case 'skeleton':
      return (
        <div aria-label={node.props.text} role="status" className="element-skeleton">
          <i />
          <i />
          <i />
        </div>
      );
    case 'emptyState':
    case 'errorState': {
      const nodeType = node.type as string;
      const stateType = nodeType === 'errorState' ? 'error' : node.props.stateType ?? 'empty';
      const StateIcon =
        stateType === 'error' ? AlertCircle : stateType === 'success' ? CheckCircle2 : Inbox;
      return (
        <div className={`element-state state-${stateType}`}>
          <StateIcon size={36} />
          <p>{node.props.text}</p>
        </div>
      );
    }
    default:
      throw new Error(`렌더러가 없는 요소: ${node.type}`);
  }
}
